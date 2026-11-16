/**
 * API MYSQL CHO TOPFREELANCE (chạy như middleware của Vite dev server)
 * ---------------------------------------------------------------------------
 * Nguyên tắc an toàn (TASK-47):
 *  1. Không tin dữ liệu client: danh tính lấy từ phiên (token), số tiền giải ngân lấy từ hợp đồng
 *     ký quỹ trong DB, mọi số / chuỗi đều được kiểm tra miền giá trị.
 *  2. Mọi thao tác nhiều bảng chạy trong TRANSACTION + khóa hàng (SELECT … FOR UPDATE)
 *     → không thể trừ ví hai lần, không tuyển vượt số lượng khi bấm liên tục.
 *  3. Rút đơn = XÓA thật (proposal + hợp đồng ký quỹ + tin mẫu không còn ai ứng tuyển).
 *  4. Lỗi SQL chỉ ghi log phía server; client chỉ nhận thông báo chung.
 *  5. Body tối đa 16 KB, chỉ nhận application/json, chặn request từ origin lạ.
 *
 * GIỚI HẠN CÒN LẠI (đồ án demo): 2 tài khoản mẫu đăng nhập không cần mật khẩu
 * (POST /api/session). Triển khai thật phải thay bằng đăng nhập mật khẩu (bcrypt) + cookie HttpOnly.
 */
import mysql from 'mysql2/promise';
import crypto from 'node:crypto';
import { CATEGORY_BY_ID, categoryOfSkill } from '../src/features/job-catalog/models/JobCatalog.js';
import { RateLimiter } from '../src/features/ecommerce-extras/models/TokenBucket.js';

const DEMO_ACCOUNTS = { freelancer: 'USR-FL-001', business: 'USR-BIZ-002' };
const MOCK_EMPLOYER = 'USR-SYS-000'; // chủ ảo của 10.000 tin mẫu sinh trong trình duyệt
const MAX_BODY = 16 * 1024;
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const MAX_BUDGET = 10_000_000;

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// ---------------------------------------------------------------------------
// KIỂM TRA DỮ LIỆU ĐẦU VÀO
// ---------------------------------------------------------------------------
function int(v, min, max, name) {
  const n = Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < min || n > max) {
    throw new HttpError(400, `${name} phải là số nguyên từ ${min.toLocaleString()} đến ${max.toLocaleString()}.`);
  }
  return n;
}

function text(v, max, name, { required = false } = {}) {
  if (v == null || v === '') {
    if (required) throw new HttpError(400, `Thiếu ${name}.`);
    return '';
  }
  if (typeof v !== 'string') throw new HttpError(400, `${name} không hợp lệ.`);
  // Bỏ ký tự điều khiển (trừ xuống dòng / tab)
  const s = v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
  if (required && !s) throw new HttpError(400, `Thiếu ${name}.`);
  if (s.length > max) throw new HttpError(400, `${name} tối đa ${max} ký tự.`);
  return s;
}

function jobId(v) {
  if (typeof v !== 'string' || !/^JOB-\d{6,9}$/.test(v)) throw new HttpError(400, 'Mã việc không hợp lệ.');
  return v;
}

function skillTag(v) {
  const s = text(v, 30, 'Kỹ năng', { required: true }).toLowerCase();
  if (!/^[a-z0-9][a-z0-9.+#-]{0,29}$/.test(s)) throw new HttpError(400, 'Kỹ năng chỉ gồm chữ thường, số và dấu gạch ngang.');
  return s;
}

function category(v, skill) {
  if (v == null || v === '') return categoryOfSkill(skill);
  if (!CATEGORY_BY_ID[v] && v !== 'other') throw new HttpError(400, 'Lĩnh vực không hợp lệ.');
  return v;
}

function httpUrl(v) {
  const s = text(v, 300, 'Đường dẫn');
  if (!s) return '';
  let u;
  try { u = new URL(s); } catch { throw new HttpError(400, 'Đường dẫn portfolio không hợp lệ.'); }
  // Chặn javascript:, data:… — tránh XSS khi nhà tuyển dụng bấm vào liên kết
  if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new HttpError(400, 'Đường dẫn phải bắt đầu bằng http:// hoặc https://');
  return u.toString();
}

const money = (v) => Math.round(Number(v) * 100) / 100;

// ---------------------------------------------------------------------------
// HTTP HELPERS
// ---------------------------------------------------------------------------
function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const type = String(req.headers['content-type'] || '');
    // Form HTML / text/plain từ trang khác không gửi được application/json mà không qua preflight CORS
    if (!type.startsWith('application/json')) return reject(new HttpError(415, 'Chỉ nhận JSON.'));
    const tooBig = () => new HttpError(413, 'Dữ liệu gửi lên quá lớn.');
    if (Number(req.headers['content-length']) > MAX_BODY) {
      req.resume(); // bỏ qua phần thân còn lại để vẫn trả được mã 413
      return reject(tooBig());
    }
    let size = 0;
    let overflow = false;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) overflow = true; // không giữ thêm dữ liệu trong RAM
      else chunks.push(c);
    });
    req.on('end', () => {
      if (overflow) return reject(tooBig());
      try {
        const v = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
        if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('not object');
        resolve(v);
      } catch {
        reject(new HttpError(400, 'JSON không hợp lệ.'));
      }
    });
    req.on('error', reject);
  });
}

/** Chặn request ghi dữ liệu đến từ một trang web khác (CSRF). */
function checkOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return; // curl / cùng origin không gửi Origin cho GET
  let host;
  try { host = new URL(origin).host; } catch { throw new HttpError(403, 'Origin không hợp lệ.'); }
  if (host !== req.headers.host) throw new HttpError(403, 'Không cho phép gọi API từ trang khác.');
}

// ---------------------------------------------------------------------------
// PHIÊN ĐĂNG NHẬP (token ngẫu nhiên 192 bit, lưu trong RAM server)
// ---------------------------------------------------------------------------
const sessions = new Map();

function createSession(userId, role) {
  const nowMs = Date.now();
  for (const [t, s] of sessions) if (s.exp < nowMs) sessions.delete(t); // dọn phiên hết hạn
  const token = crypto.randomBytes(24).toString('base64url');
  sessions.set(token, { userId, role, exp: nowMs + SESSION_TTL_MS });
  return token;
}

function requireUser(req, role) {
  const m = /^Bearer ([A-Za-z0-9_-]{20,64})$/.exec(String(req.headers.authorization || ''));
  const s = m && sessions.get(m[1]);
  if (!s || s.exp < Date.now()) throw new HttpError(401, 'Phiên đăng nhập đã hết hạn, hãy tải lại trang.');
  if (role && s.role !== role) {
    throw new HttpError(403, role === 'business' ? 'Chỉ tài khoản Doanh nghiệp được làm thao tác này.' : 'Chỉ tài khoản Freelancer được làm thao tác này.');
  }
  return s;
}

// Token Bucket (Lab 8) phía server: tối đa 5 hồ sơ / 10 giây mỗi tài khoản — chặn spam bằng script
const applyLimiter = new RateLimiter(5, 0.5);

// ---------------------------------------------------------------------------
// MIGRATION NHẸ: bảng hồ sơ năng lực, cột lĩnh vực, dọn dữ liệu rút đơn cũ
// ---------------------------------------------------------------------------
async function ensureSchema(pool, dbName) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS freelancer_profiles (
      user_id VARCHAR(36) NOT NULL PRIMARY KEY,
      hourly_rate INT UNSIGNED NOT NULL DEFAULT 0,
      location VARCHAR(100) DEFAULT NULL,
      skills TEXT DEFAULT NULL,
      portfolio TEXT DEFAULT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_profile_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  const [cols] = await pool.query(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'jobs' AND COLUMN_NAME = 'category'",
    [dbName]
  );
  if (cols.length === 0) {
    await pool.query("ALTER TABLE jobs ADD COLUMN category VARCHAR(30) NOT NULL DEFAULT 'it' AFTER skill_tag, ADD INDEX idx_jobs_category (category)");
  }

  // Dữ liệu cũ: các đơn đã rút trước đây chỉ bị đổi trạng thái WITHDRAWN → xóa hẳn,
  // kèm tin mẫu (USR-SYS-000) không còn đơn / hợp đồng nào tham chiếu.
  await pool.query("DELETE FROM proposals WHERE status = 'WITHDRAWN'");
  await pool.query(
    `DELETE j FROM jobs j
     LEFT JOIN proposals p ON p.job_id = j.id
     LEFT JOIN escrow_contracts e ON e.job_id = j.id
     WHERE j.employer_id = ? AND p.id IS NULL AND e.id IS NULL`,
    [MOCK_EMPLOYER]
  );
}

/** Chạy fn trong transaction; tự rollback khi lỗi. */
async function tx(pool, fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const out = await fn(conn);
    await conn.commit();
    return out;
  } catch (e) {
    await conn.rollback().catch(() => {});
    throw e;
  } finally {
    conn.release();
  }
}

function parseList(json) {
  try {
    const v = JSON.parse(json || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// CÁC ENDPOINT
// ---------------------------------------------------------------------------
function buildRoutes(pool, dbName) {
  return {
    'GET /api/mysql/status': async () => {
      const [[u]] = await pool.query('SELECT COUNT(*) AS c FROM users');
      const [[j]] = await pool.query('SELECT COUNT(*) AS c FROM jobs');
      const [[p]] = await pool.query('SELECT COUNT(*) AS c FROM proposals');
      const [[e]] = await pool.query('SELECT COUNT(*) AS c FROM escrow_contracts');
      return { connected: true, database: dbName, userCount: u.c, jobCount: j.c, proposalCount: p.c, escrowCount: e.c };
    },

    /** Đăng nhập tài khoản mẫu theo vai trò → token phiên + thông tin ví của CHÍNH người đó. */
    'POST /api/session': async (req) => {
      const body = await readJson(req);
      const userId = DEMO_ACCOUNTS[body.role];
      if (!userId) throw new HttpError(400, 'Vai trò không hợp lệ.');
      const [[u]] = await pool.query(
        'SELECT id, full_name, title, role, rating, wallet_balance, bio FROM users WHERE id = ? AND role = ?',
        [userId, body.role]
      );
      if (!u) throw new HttpError(404, 'Không tìm thấy tài khoản mẫu.');
      return { token: createSession(u.id, u.role), user: { ...u, wallet_balance: money(u.wallet_balance) } };
    },

    /** Danh sách công khai — KHÔNG trả email, mật khẩu băm hay số dư ví. */
    'GET /api/users': async () => {
      const [rows] = await pool.query("SELECT id, full_name, title, role, rating FROM users WHERE role <> 'admin'");
      return rows;
    },

    'GET /api/jobs': async () => {
      const [rows] = await pool.query(
        `SELECT id, employer_id, title, skill_tag, category, budget, escrow_balance, slots, hired_count,
                deadline_days, client_rating, status, description, created_at
         FROM jobs ORDER BY created_at DESC`
      );
      return rows;
    },

    /** Doanh nghiệp đăng việc: khóa toàn bộ ngân sách vào ký quỹ (trừ ví trong cùng transaction). */
    'POST /api/jobs': async (req) => {
      const me = requireUser(req, 'business');
      const b = await readJson(req);
      const id = jobId(b.id);
      const title = text(b.title, 200, 'Tiêu đề', { required: true });
      const skill = skillTag(b.skillTag);
      const cat = category(b.category, skill);
      const budget = int(b.budget, 1, MAX_BUDGET, 'Ngân sách');
      const slots = int(b.slots ?? 1, 1, 50, 'Số người cần tuyển');
      const deadline = int(b.deadlineDays ?? 14, 1, 365, 'Hạn chót (ngày)');
      const description = text(b.description, 5000, 'Mô tả');

      return tx(pool, async (c) => {
        const [[dup]] = await c.query('SELECT id FROM jobs WHERE id = ?', [id]);
        if (dup) throw new HttpError(409, 'Mã việc đã tồn tại.');
        const [[u]] = await c.query('SELECT wallet_balance FROM users WHERE id = ? FOR UPDATE', [me.userId]);
        if (!u || Number(u.wallet_balance) < budget) throw new HttpError(400, 'Số dư ví không đủ để ký quỹ.');
        await c.query('UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ?', [budget, me.userId]);
        await c.query(
          `INSERT INTO jobs (id, employer_id, title, skill_tag, category, budget, escrow_balance, slots, hired_count, deadline_days, client_rating, status, description)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 5.0, 'OPEN', ?)`,
          [id, me.userId, title, skill, cat, budget, budget, slots, deadline, description]
        );
        await c.query(
          "INSERT INTO escrow_contracts (id, job_id, employer_id, amount, status) VALUES (?, ?, ?, ?, 'LOCKED')",
          [`ESC-${id}`, id, me.userId, budget]
        );
        return { jobId: id, walletBalance: money(Number(u.wallet_balance) - budget) };
      });
    },

    /**
     * Hồ sơ ứng tuyển theo quyền: Freelancer chỉ thấy đơn của mình;
     * Doanh nghiệp thấy đơn vào việc của mình + việc mẫu của sàn (để duyệt giải ngân trong demo).
     */
    'GET /api/proposals': async (req) => {
      const me = requireUser(req);
      const where = me.role === 'freelancer' ? 'p.freelancer_id = ?' : '(j.employer_id = ? OR j.employer_id = ?)';
      const args = me.role === 'freelancer' ? [me.userId] : [me.userId, MOCK_EMPLOYER];
      const [rows] = await pool.query(
        `SELECT p.id, p.job_id, p.freelancer_id, p.bid_amount, p.cover_letter, p.status, p.created_at,
                j.title AS job_title, j.budget AS job_budget, j.skill_tag, j.deadline_days, j.slots, j.hired_count,
                u.full_name AS freelancer_name, u.title AS freelancer_title, u.rating AS freelancer_rating
         FROM proposals p
         JOIN jobs j ON p.job_id = j.id
         JOIN users u ON p.freelancer_id = u.id
         WHERE ${where}
         ORDER BY p.created_at ASC`,
        args
      );
      return rows;
    },

    /** Freelancer nộp hồ sơ. Tin mẫu chưa có trong DB được tạo kèm (chủ ảo USR-SYS-000). */
    'POST /api/proposals': async (req) => {
      const me = requireUser(req, 'freelancer');
      const gate = applyLimiter.tryConsume(me.userId);
      if (!gate.allowed) throw new HttpError(429, `Bạn nộp quá nhanh, thử lại sau ${Math.ceil(gate.waitMs / 1000)} giây.`);
      const b = await readJson(req);
      const id = jobId(b.jobId);
      const cover = text(b.coverLetter, 2000, 'Thư giới thiệu');
      const ticket = typeof b.ticketId === 'string' && /^[A-Za-z0-9-]{1,32}$/.test(b.ticketId) ? b.ticketId : null;

      return tx(pool, async (c) => {
        let [[job]] = await c.query('SELECT * FROM jobs WHERE id = ? FOR UPDATE', [id]);
        if (!job) {
          // Tin mẫu sinh trong trình duyệt: chỉ chấp nhận mã nằm trong dải tin mẫu và thông tin hợp lệ
          if (Number(id.slice(4)) > 100000) throw new HttpError(404, 'Không tìm thấy việc làm.');
          const snap = b.job || {};
          const skill = skillTag(snap.skillTag);
          const jBudget = int(snap.budget, 1, MAX_BUDGET, 'Ngân sách việc');
          const jSlots = int(snap.slots ?? 1, 1, 50, 'Số người cần tuyển');
          await c.query(
            `INSERT IGNORE INTO users (id, email, password_hash, full_name, title, role, rating, wallet_balance, bio)
             VALUES (?, 'mock-employers@topfreelance.local', '!', 'Nhà tuyển dụng mẫu', 'Bộ dữ liệu tin mẫu', 'admin', 5.00, 0, 'Chủ ảo của các tin tuyển dụng sinh ngẫu nhiên')`,
            [MOCK_EMPLOYER]
          );
          await c.query(
            `INSERT INTO jobs (id, employer_id, title, skill_tag, category, budget, escrow_balance, slots, hired_count, deadline_days, client_rating, status, description)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 5.0, 'OPEN', 'Tin mẫu trên sàn')`,
            [id, MOCK_EMPLOYER, text(snap.title, 200, 'Tiêu đề việc', { required: true }), skill, category(snap.category, skill),
             jBudget, jBudget, jSlots, int(snap.deadlineDays ?? 14, 1, 365, 'Hạn chót')]
          );
          [[job]] = await c.query('SELECT * FROM jobs WHERE id = ? FOR UPDATE', [id]);
        }
        if (job.employer_id === me.userId) throw new HttpError(403, 'Không thể ứng tuyển việc do chính mình đăng.');
        if (job.status !== 'OPEN' || job.hired_count >= job.slots) throw new HttpError(409, 'Việc này đã đủ người.');

        const [[dup]] = await c.query(
          "SELECT id FROM proposals WHERE job_id = ? AND freelancer_id = ? AND status IN ('PENDING','ACCEPTED')",
          [id, me.userId]
        );
        if (dup) throw new HttpError(409, 'Bạn đã ứng tuyển việc này rồi.');

        const maxBid = Math.floor(Number(job.budget) / job.slots);
        const bid = int(b.bidAmount, 1, Math.max(1, maxBid), 'Mức giá đề xuất');
        const proposalId = `PRP-${crypto.randomBytes(8).toString('hex')}`;

        await c.query(
          "INSERT INTO proposals (id, job_id, freelancer_id, bid_amount, cover_letter, status) VALUES (?, ?, ?, ?, ?, 'PENDING')",
          [proposalId, id, me.userId, bid, cover]
        );
        await c.query(
          "UPDATE jobs SET hired_count = hired_count + 1, status = IF(hired_count >= slots, 'FILLED', status) WHERE id = ?",
          [id]
        );
        await c.query(
          `INSERT INTO escrow_contracts (id, job_id, employer_id, freelancer_id, amount, status, payout_ticket_id)
           VALUES (?, ?, ?, ?, ?, 'LOCKED', ?)`,
          [`ESC-${proposalId}`, id, job.employer_id, me.userId, bid, ticket]
        );
        return { proposalId, bidAmount: bid };
      });
    },

    /** Freelancer rút BẤT KỲ đơn nào còn chờ duyệt: xóa hẳn đơn + hợp đồng ký quỹ của đơn. */
    'POST /api/proposals/withdraw': async (req) => {
      const me = requireUser(req, 'freelancer');
      const b = await readJson(req);
      const id = jobId(b.jobId);

      return tx(pool, async (c) => {
        const [[job]] = await c.query('SELECT id, employer_id FROM jobs WHERE id = ? FOR UPDATE', [id]);
        if (!job) throw new HttpError(404, 'Không tìm thấy việc làm.');
        const [[p]] = await c.query(
          "SELECT id FROM proposals WHERE job_id = ? AND freelancer_id = ? AND status = 'PENDING' ORDER BY created_at DESC LIMIT 1 FOR UPDATE",
          [id, me.userId]
        );
        if (!p) throw new HttpError(404, 'Không có đơn đang chờ để rút (đơn đã được thanh toán thì không rút được).');

        // Hợp đồng ký quỹ của đơn: id mới = ESC-<proposalId>; dữ liệu cũ bị cắt 36 ký tự
        const [esc] = await c.query(
          "DELETE FROM escrow_contracts WHERE status = 'LOCKED' AND job_id = ? AND freelancer_id = ? AND (id = ? OR id = ?)",
          [id, me.userId, `ESC-${p.id}`, `ESC-${p.id}`.slice(0, 36)]
        );
        await c.query('DELETE FROM proposals WHERE id = ?', [p.id]);
        await c.query(
          "UPDATE jobs SET hired_count = GREATEST(0, hired_count - 1), status = IF(status = 'FILLED', 'OPEN', status) WHERE id = ?",
          [id]
        );

        let mockJobDeleted = false;
        if (job.employer_id === MOCK_EMPLOYER) {
          const [[left]] = await c.query(
            'SELECT (SELECT COUNT(*) FROM proposals WHERE job_id = ?) + (SELECT COUNT(*) FROM escrow_contracts WHERE job_id = ?) AS n',
            [id, id]
          );
          if (Number(left.n) === 0) {
            await c.query('DELETE FROM jobs WHERE id = ?', [id]);
            mockJobDeleted = true;
          }
        }
        return { deleted: { proposal: p.id, escrowContracts: esc.affectedRows, mockJob: mockJobDeleted } };
      });
    },

    /**
     * Doanh nghiệp duyệt giải ngân cho 1 đơn: số tiền = hợp đồng ký quỹ trong DB (không lấy từ client),
     * trừ ký quỹ của việc, cộng ví freelancer, đơn → ACCEPTED. Chỉ chủ việc (hoặc việc mẫu) mới được duyệt.
     */
    'POST /api/escrow/payout': async (req) => {
      const me = requireUser(req, 'business');
      const b = await readJson(req);
      const id = jobId(b.jobId);
      const flId = text(b.freelancerId, 36, 'Mã freelancer', { required: true });

      return tx(pool, async (c) => {
        const [[job]] = await c.query('SELECT id, employer_id, escrow_balance FROM jobs WHERE id = ? FOR UPDATE', [id]);
        if (!job) throw new HttpError(404, 'Không tìm thấy việc làm.');
        if (job.employer_id !== me.userId && job.employer_id !== MOCK_EMPLOYER) {
          throw new HttpError(403, 'Bạn không phải chủ của việc này.');
        }
        const [[esc]] = await c.query(
          "SELECT id, amount FROM escrow_contracts WHERE job_id = ? AND freelancer_id = ? AND status = 'LOCKED' ORDER BY created_at ASC LIMIT 1 FOR UPDATE",
          [id, flId]
        );
        if (!esc) throw new HttpError(404, 'Không có hợp đồng ký quỹ nào đang chờ giải ngân.');
        const amount = Number(esc.amount);
        if (Number(job.escrow_balance) < amount) throw new HttpError(409, 'Số dư ký quỹ của việc không đủ.');

        await c.query("UPDATE escrow_contracts SET status = 'DISBURSED', disbursed_at = NOW() WHERE id = ?", [esc.id]);
        await c.query(
          "UPDATE proposals SET status = 'ACCEPTED' WHERE job_id = ? AND freelancer_id = ? AND status = 'PENDING' ORDER BY created_at ASC LIMIT 1",
          [id, flId]
        );
        // Việc mẫu (chủ ảo USR-SYS-000) chưa ai nạp ký quỹ → nhà tuyển dụng đang duyệt trả tiền TỪ VÍ của mình.
        // Việc của chính mình: tiền đã bị trừ khỏi ví lúc đăng tin (nằm trong ký quỹ) → giải ngân từ ký quỹ.
        let chargedFromWallet = 0;
        if (job.employer_id === MOCK_EMPLOYER) {
          const [deb] = await c.query(
            "UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ? AND role = 'business' AND wallet_balance >= ?",
            [amount, me.userId, amount]
          );
          if (deb.affectedRows !== 1) throw new HttpError(409, 'Số dư ví của bạn không đủ để thanh toán.');
          chargedFromWallet = amount;
        }
        await c.query('UPDATE jobs SET escrow_balance = escrow_balance - ? WHERE id = ?', [amount, id]);
        const [upd] = await c.query("UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ? AND role = 'freelancer'", [amount, flId]);
        if (upd.affectedRows !== 1) throw new HttpError(400, 'Tài khoản nhận tiền không hợp lệ.');
        const [[bz]] = await c.query('SELECT wallet_balance FROM users WHERE id = ?', [me.userId]);
        return {
          amount: money(amount),
          escrowRemaining: money(Number(job.escrow_balance) - amount),
          source: chargedFromWallet ? 'wallet' : 'escrow',
          chargedFromWallet: money(chargedFromWallet),
          businessBalance: money(Number(bz.wallet_balance))
        };
      });
    },

    /** Hồ sơ năng lực công khai của freelancer (nhà tuyển dụng xem khi nhận đơn). */
    'GET /api/profile': async (req, url) => {
      const userId = text(url.searchParams.get('userId'), 36, 'Mã người dùng', { required: true });
      const [[u]] = await pool.query(
        `SELECT u.id, u.full_name, u.title, u.rating, u.bio, f.hourly_rate, f.location, f.skills, f.portfolio, f.updated_at
         FROM users u LEFT JOIN freelancer_profiles f ON f.user_id = u.id
         WHERE u.id = ? AND u.role = 'freelancer'`,
        [userId]
      );
      if (!u) throw new HttpError(404, 'Không tìm thấy hồ sơ.');
      return { ...u, hourly_rate: Number(u.hourly_rate) || 0, skills: parseList(u.skills), portfolio: parseList(u.portfolio) };
    },

    /** Freelancer lưu hồ sơ của CHÍNH mình (id lấy từ phiên, không lấy từ body). */
    'POST /api/profile': async (req) => {
      const me = requireUser(req, 'freelancer');
      const b = await readJson(req);
      const title = text(b.title, 150, 'Chức danh', { required: true });
      const bio = text(b.bio, 2000, 'Giới thiệu');
      const location = text(b.location, 100, 'Địa điểm');
      const hourly = int(b.hourlyRate ?? 0, 0, 1000, 'Giá theo giờ');
      if (!Array.isArray(b.skills) || b.skills.length > 15) throw new HttpError(400, 'Tối đa 15 kỹ năng.');
      const skills = [...new Set(b.skills.map(s => text(s, 30, 'Kỹ năng', { required: true })))];
      if (!Array.isArray(b.portfolio) || b.portfolio.length > 10) throw new HttpError(400, 'Tối đa 10 dự án tiêu biểu.');
      const portfolio = b.portfolio.map(p => ({
        title: text(p?.title, 120, 'Tên dự án', { required: true }),
        url: httpUrl(p?.url),
        description: text(p?.description, 500, 'Mô tả dự án')
      }));

      await tx(pool, async (c) => {
        await c.query('UPDATE users SET title = ?, bio = ? WHERE id = ?', [title, bio, me.userId]);
        await c.query(
          `INSERT INTO freelancer_profiles (user_id, hourly_rate, location, skills, portfolio) VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE hourly_rate = VALUES(hourly_rate), location = VALUES(location), skills = VALUES(skills), portfolio = VALUES(portfolio)`,
          [me.userId, hourly, location, JSON.stringify(skills), JSON.stringify(portfolio)]
        );
      });
      return { saved: true };
    }
  };
}

/**
 * Plugin Vite: gắn API vào dev server.
 * @param {Record<string,string>} env  biến môi trường (đọc từ project/.env qua loadEnv)
 */
export function mysqlApiPlugin(env) {
  const dbName = env.DB_NAME || 'topfreelance_db';
  let pool = null;
  let ready = null;
  let routes = null;

  function init() {
    if (!ready) {
      pool = mysql.createPool({
        host: env.DB_HOST || '127.0.0.1',
        port: Number(env.DB_PORT) || 3306,
        user: env.DB_USER || 'root',
        password: env.DB_PASSWORD || '',
        database: dbName,
        connectionLimit: 4, // máy 1 CPU: 4 kết nối là đủ, tránh mở kết nối mới mỗi request
        waitForConnections: true,
        decimalNumbers: false
      });
      routes = buildRoutes(pool, dbName);
      ready = ensureSchema(pool, dbName).catch((e) => {
        ready = null; // MySQL chưa bật → lần sau thử lại
        throw e;
      });
    }
    return ready;
  }

  return {
    name: 'mysql-api-plugin',
    configureServer(server) {
      server.httpServer?.once('close', () => pool?.end().catch(() => {}));
      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith('/api/')) return next();
        const url = new URL(req.url, 'http://localhost');
        try {
          if (req.method !== 'GET') checkOrigin(req);
          await init();
          const handler = routes[`${req.method} ${url.pathname}`];
          if (!handler) throw new HttpError(404, 'Không có API này.');
          const data = await handler(req, url);
          send(res, 200, { success: true, data });
        } catch (err) {
          if (err instanceof HttpError) {
            send(res, err.status, { success: false, error: err.message });
          } else {
            // Chi tiết lỗi SQL chỉ nằm trong log server, không lộ cấu trúc DB cho client
            console.error(`[MySQL API] ${req.method} ${url.pathname}:`, err.code || '', err.message);
            send(res, err.code === 'ECONNREFUSED' ? 503 : 500, {
              success: false,
              error: err.code === 'ECONNREFUSED' ? 'Chưa kết nối được MySQL.' : 'Lỗi máy chủ, vui lòng thử lại.'
            });
          }
        }
      });
    }
  };
}
