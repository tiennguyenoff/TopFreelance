/**
 * XÁC THỰC THẬT: mật khẩu scrypt, JWT truy cập 15 phút + refresh token xoay vòng.
 * ---------------------------------------------------------------------------
 *  - Access token = JWT HS256 (jose) trong cookie HttpOnly; JS của trang KHÔNG đọc được → XSS không lấy được token.
 *  - Refresh token = 256 bit ngẫu nhiên; DB chỉ lưu SHA-256 của nó. Mỗi lần refresh thì token cũ bị thu hồi
 *    và cấp token mới cùng "họ" (family). Dùng lại token đã thu hồi = bị đánh cắp → thu hồi CẢ họ.
 *  - Demo có 2 vai trò đăng nhập song song trong một trình duyệt → mỗi vai trò có bộ cookie riêng
 *    (tf_at_<role>, tf_rt_<role>) và client báo vai trò đang dùng bằng header X-Role.
 *  - Khóa tài khoản: 5 lần sai liên tiếp → khóa 15 phút; mọi lỗi đăng nhập trả cùng một thông báo chung.
 */
import crypto from 'node:crypto';
import { promisify } from 'node:util';
import express from 'express';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { SignJWT, jwtVerify } from 'jose';
import { HttpError, send } from './routes.js';

const scrypt = promisify(crypto.scrypt);
const ROLES = ['freelancer', 'business'];
const ACCESS_TTL_S = 15 * 60;
const REFRESH_TTL_S = 7 * 24 * 60 * 60;
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000;
const GENERIC_LOGIN_ERROR = 'Sai email hoặc mật khẩu.';
const DEMO_ACCOUNTS = [
  { id: 'USR-FL-001', passwordKey: 'DEMO_FREELANCER_PASSWORD' },
  { id: 'USR-BIZ-002', passwordKey: 'DEMO_BUSINESS_PASSWORD' }
];

// ---------------------------------------------------------------------------
// Mật khẩu: scrypt (có sẵn trong node:crypto, không cần thư viện native)
// ---------------------------------------------------------------------------
export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, 32);
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
}

export async function verifyPassword(password, stored) {
  const [alg, saltHex, keyHex] = String(stored).split('$');
  if (alg !== 'scrypt' || !saltHex || !keyHex) return false;
  const expected = Buffer.from(keyHex, 'hex');
  const actual = await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

// ---------------------------------------------------------------------------
// Migration + seed mật khẩu demo từ .env
// ---------------------------------------------------------------------------
export async function ensureAuthSchema(pool, dbName, env) {
  const [cols] = await pool.query(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME IN ('failed_logins','locked_until')",
    [dbName]
  );
  const have = new Set(cols.map((c) => c.COLUMN_NAME));
  if (!have.has('failed_logins')) await pool.query('ALTER TABLE users ADD COLUMN failed_logins INT UNSIGNED NOT NULL DEFAULT 0');
  if (!have.has('locked_until')) await pool.query('ALTER TABLE users ADD COLUMN locked_until DATETIME NULL DEFAULT NULL');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      family_id CHAR(32) NOT NULL,
      token_hash CHAR(64) NOT NULL UNIQUE,
      expires_at DATETIME NOT NULL,
      revoked_at DATETIME NULL DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_rt_family (family_id),
      INDEX idx_rt_user (user_id),
      CONSTRAINT fk_rt_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await pool.query('DELETE FROM refresh_tokens WHERE expires_at < NOW() - INTERVAL 1 DAY'); // dọn rác

  // Seed: mật khẩu demo đọc từ .env (không commit). Hash cũ trong schema.sql chỉ là chuỗi giữ chỗ.
  for (const acc of DEMO_ACCOUNTS) {
    const pw = env[acc.passwordKey];
    if (!pw) continue;
    const [[u]] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [acc.id]);
    if (!u) continue;
    if (!(await verifyPassword(pw, u.password_hash))) {
      await pool.query('UPDATE users SET password_hash = ?, failed_logins = 0, locked_until = NULL WHERE id = ?', [await hashPassword(pw), acc.id]);
    }
  }
}

// ---------------------------------------------------------------------------
// Router + middleware
// ---------------------------------------------------------------------------
const cookieName = (kind, role) => `tf_${kind}_${role}`;
const roleOf = (req) => {
  const r = String(req.get('x-role') || '');
  return ROLES.includes(r) ? r : null;
};

export function createAuth(pool, env) {
  const secret = env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('Thiếu JWT_SECRET (>= 32 ký tự) trong .env — server từ chối khởi động. Tạo bằng: node -e "console.log(require(\'node:crypto\').randomBytes(48).toString(\'base64url\'))"');
  }
  const key = new TextEncoder().encode(secret);
  const dummyHash = hashPassword('dummy-password-for-timing'); // promise; chống dò email qua thời gian phản hồi

  const cookieOpts = (req, path, maxAgeS) => ({
    httpOnly: true, sameSite: 'strict', secure: req.secure, path, maxAge: maxAgeS * 1000
  });

  async function signAccess(user) {
    return new SignJWT({ role: user.role })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(user.id)
      .setIssuedAt()
      .setExpirationTime(`${ACCESS_TTL_S}s`)
      .sign(key);
  }

  async function issueTokens(req, res, user, familyId, conn = pool) {
    const refresh = crypto.randomBytes(32).toString('base64url');
    await conn.query(
      'INSERT INTO refresh_tokens (user_id, family_id, token_hash, expires_at) VALUES (?, ?, ?, NOW() + INTERVAL ? SECOND)',
      [user.id, familyId, sha256(refresh), REFRESH_TTL_S]
    );
    res.cookie(cookieName('at', user.role), await signAccess(user), cookieOpts(req, '/', ACCESS_TTL_S));
    res.cookie(cookieName('rt', user.role), refresh, cookieOpts(req, '/api/auth', REFRESH_TTL_S));
  }

  const clearCookies = (res, role) => {
    res.clearCookie(cookieName('at', role), { path: '/' });
    res.clearCookie(cookieName('rt', role), { path: '/api/auth' });
  };

  const publicUser = (u) => ({
    id: u.id, full_name: u.full_name, title: u.title, role: u.role, rating: u.rating, bio: u.bio,
    wallet_balance: Math.round(Number(u.wallet_balance) * 100) / 100
  });
  const USER_COLS = 'id, full_name, title, role, rating, wallet_balance, bio';

  /** Gắn req.user nếu cookie access token của vai trò (X-Role) còn hợp lệ. Thiếu/sai → để requireUser trả 401. */
  async function authenticate(req, res, next) {
    const role = roleOf(req);
    const token = role && req.cookies?.[cookieName('at', role)];
    if (token) {
      try {
        const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] });
        if (payload.role === role && typeof payload.sub === 'string') req.user = { userId: payload.sub, role };
      } catch { /* token giả / hết hạn → coi như chưa đăng nhập */ }
    }
    next();
  }

  const router = express.Router();

  // Giới hạn theo cặp (IP + email), chỉ đếm lần thất bại
  const loginLimiter = rateLimit({
    windowMs: LOCK_MS, limit: 10, skipSuccessfulRequests: true, standardHeaders: 'draft-7', legacyHeaders: false,
    keyGenerator: (req) => `${req.ip}|${String(req.body?.email ?? '').toLowerCase().slice(0, 100)}`,
    validate: { keyGeneratorIpFallback: false },
    handler: (req, res) => send(res, 429, { success: false, error: 'Thử quá nhiều lần, hãy đợi ít phút rồi đăng nhập lại.' })
  });

  router.post('/login', loginLimiter, async (req, res, next) => {
    try {
      const { email, password } = req.body ?? {};
      if (typeof email !== 'string' || typeof password !== 'string' || !email || !password || email.length > 191 || password.length > 200) {
        throw new HttpError(400, 'Vui lòng nhập email và mật khẩu.');
      }
      const [[u]] = await pool.query(
        `SELECT ${USER_COLS}, password_hash, failed_logins, locked_until FROM users WHERE email = ? AND role IN ('freelancer','business')`,
        [email]
      );
      const locked = !!(u && u.locked_until && new Date(u.locked_until).getTime() > Date.now());
      // Luôn chạy scrypt một lần (băm giả khi không có user / đang khóa) → thời gian phản hồi đồng đều
      const ok = await verifyPassword(password, u && !locked ? u.password_hash : await dummyHash);
      if (!u || locked || !ok) {
        if (u && !locked) {
          const fails = u.failed_logins + 1;
          await pool.query(
            'UPDATE users SET failed_logins = ?, locked_until = ? WHERE id = ?',
            [fails >= MAX_FAILS ? 0 : fails, fails >= MAX_FAILS ? new Date(Date.now() + LOCK_MS) : null, u.id]
          );
        }
        throw new HttpError(401, GENERIC_LOGIN_ERROR);
      }
      await pool.query('UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = ?', [u.id]);
      await issueTokens(req, res, u, crypto.randomBytes(16).toString('hex'));
      send(res, 200, { success: true, data: { user: publicUser(u) } });
    } catch (e) { next(e); }
  });

  /** Xoay vòng refresh token trong một transaction; trả user hoặc null. */
  async function rotate(req, res, role, token) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [[row]] = await conn.query(
        'SELECT id, user_id, family_id, revoked_at, expires_at < NOW() AS expired FROM refresh_tokens WHERE token_hash = ? FOR UPDATE',
        [sha256(token)]
      );
      if (!row) { await conn.rollback(); return null; }
      if (row.revoked_at) {
        // Token đã dùng rồi mà có người mang lại → nghi bị đánh cắp: thu hồi cả họ
        await conn.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE family_id = ? AND revoked_at IS NULL', [row.family_id]);
        await conn.commit();
        return null;
      }
      if (row.expired) { await conn.rollback(); return null; }
      const [[u]] = await conn.query(`SELECT ${USER_COLS} FROM users WHERE id = ? AND role = ?`, [row.user_id, role]);
      if (!u) { await conn.rollback(); return null; }
      await conn.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ?', [row.id]);
      await issueTokens(req, res, u, row.family_id, conn);
      await conn.commit();
      return u;
    } catch (e) {
      await conn.rollback().catch(() => {});
      throw e;
    } finally {
      conn.release();
    }
  }

  router.post('/refresh', async (req, res, next) => {
    try {
      const role = roleOf(req);
      const token = role && req.cookies?.[cookieName('rt', role)];
      if (typeof token !== 'string' || !token || token.length > 100) throw new HttpError(401, 'Phiên đăng nhập đã hết hạn.');
      const user = await rotate(req, res, role, token);
      if (!user) {
        clearCookies(res, role);
        throw new HttpError(401, 'Phiên đăng nhập đã hết hạn.');
      }
      send(res, 200, { success: true, data: { user: publicUser(user) } });
    } catch (e) { next(e); }
  });

  router.post('/logout', async (req, res, next) => {
    try {
      const role = roleOf(req);
      if (!role) throw new HttpError(400, 'Thiếu vai trò.');
      const token = req.cookies?.[cookieName('rt', role)];
      if (typeof token === 'string' && token.length <= 100) {
        const [[row]] = await pool.query('SELECT family_id FROM refresh_tokens WHERE token_hash = ?', [sha256(token)]);
        if (row) await pool.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE family_id = ? AND revoked_at IS NULL', [row.family_id]);
      }
      clearCookies(res, role);
      send(res, 200, { success: true, data: { loggedOut: true } });
    } catch (e) { next(e); }
  });

  router.get('/me', async (req, res, next) => {
    try {
      if (!req.user) throw new HttpError(401, 'Chưa đăng nhập.');
      const [[u]] = await pool.query(`SELECT ${USER_COLS} FROM users WHERE id = ? AND role = ?`, [req.user.userId, req.user.role]);
      if (!u) throw new HttpError(401, 'Chưa đăng nhập.');
      send(res, 200, { success: true, data: { user: publicUser(u) } });
    } catch (e) { next(e); }
  });

  return { router, authenticate: [cookieParser(), authenticate] };
}
