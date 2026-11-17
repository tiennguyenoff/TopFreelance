/**
 * EXPRESS APP FACTORY — dùng chung cho dev (Vite plugin) và chạy thật (server/index.js).
 * createApp(env) trả { app, ready, close } để cả hai nơi cùng một cấu hình, không lệch hành vi.
 *
 * Thứ tự middleware của /api (mỗi lớp chặn một loại tấn công):
 *   helmet (header an toàn) → rate limit chung → Origin check (CSRF) → bắt buộc JSON (415)
 *   → express.json 16 KB (413) → đọc cookie + JWT (req.user) → route → 404 → xử lý lỗi tập trung.
 */
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mysql from 'mysql2/promise';
import { existsSync } from 'node:fs';
import { buildRoutes, ensureSchema, HttpError, send, checkOrigin } from './routes.js';
import { createAuth, ensureAuthSchema } from './auth.js';

const MAX_BODY = '16kb';

export function createApp(env, { distDir = null } = {}) {
  const dbName = env.DB_NAME || 'topfreelance_db';
  const pool = mysql.createPool({
    host: env.DB_HOST || '127.0.0.1',
    port: Number(env.DB_PORT) || 3306,
    user: env.DB_USER || 'root',
    password: env.DB_PASSWORD || '',
    database: dbName,
    connectionLimit: 4, // máy 1 CPU: 4 kết nối là đủ, tránh mở kết nối mới mỗi request
    waitForConnections: true,
    decimalNumbers: false
  });
  const auth = createAuth(pool, env); // ném lỗi nếu thiếu JWT_SECRET → server không khởi động
  const routes = buildRoutes(pool, dbName);

  let schemaReady = null;
  const ready = () => {
    if (!schemaReady) {
      schemaReady = ensureSchema(pool, dbName)
        .then(() => ensureAuthSchema(pool, dbName, env))
        .catch((e) => {
          schemaReady = null; // MySQL chưa bật → lần sau thử lại
          throw e;
        });
    }
    return schemaReady;
  };

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1); // sau ngrok / reverse proxy: req.secure, req.ip đúng

  // CSP: trang dùng Tailwind CDN (cần eval + style inline), Google Fonts, Web Worker blob cho bài test RAM.
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://cdn.tailwindcss.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"],
        workerSrc: ["'self'", 'blob:'],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"]
      }
    },
    crossOriginEmbedderPolicy: false
  }));

  const api = express.Router();
  api.use(rateLimit({
    windowMs: 60_000, limit: 600, standardHeaders: 'draft-7', legacyHeaders: false,
    handler: (req, res) => send(res, 429, { success: false, error: 'Quá nhiều yêu cầu, hãy chậm lại.' })
  }));
  api.use((req, res, next) => {
    try {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        checkOrigin(req);
        // Form HTML / text/plain từ trang khác không gửi được application/json mà không qua preflight CORS
        if (!req.is('application/json')) throw new HttpError(415, 'Chỉ nhận JSON.');
      }
      next();
    } catch (e) { next(e); }
  });
  api.use(express.json({ limit: MAX_BODY, strict: true }));
  api.use(auth.authenticate);
  api.use((req, res, next) => ready().then(() => next(), next));

  api.use('/auth', auth.router);

  for (const [key, handler] of Object.entries(routes)) {
    const [method, path] = key.split(' ');
    api[method.toLowerCase()](path.replace(/^\/api/, ''), async (req, res, next) => {
      try {
        const url = new URL(req.originalUrl, 'http://localhost');
        send(res, 200, { success: true, data: await handler(req, url) });
      } catch (e) { next(e); }
    });
  }
  api.use((req, res, next) => next(new HttpError(404, 'Không có API này.')));

  // eslint-disable-next-line no-unused-vars
  api.use((err, req, res, next) => {
    if (err instanceof HttpError) return send(res, err.status, { success: false, error: err.message });
    if (err.type === 'entity.too.large') return send(res, 413, { success: false, error: 'Dữ liệu gửi lên quá lớn.' });
    if (err.type === 'entity.parse.failed' || err.type === 'encoding.unsupported') {
      return send(res, 400, { success: false, error: 'JSON không hợp lệ.' });
    }
    // Chi tiết lỗi SQL chỉ nằm trong log server, không lộ cấu trúc DB cho client
    console.error(`[API] ${req.method} ${req.path}:`, err.code || '', err.message);
    const down = err.code === 'ECONNREFUSED';
    send(res, down ? 503 : 500, { success: false, error: down ? 'Chưa kết nối được MySQL.' : 'Lỗi máy chủ, vui lòng thử lại.' });
  });

  app.use('/api', api);

  // Chạy thật: Express phục vụ luôn bản build (cùng origin → cookie SameSite=Strict hoạt động)
  if (distDir && existsSync(distDir)) {
    app.use('/assets', express.static(`${distDir}/assets`, { immutable: true, maxAge: '1y', index: false }));
    app.use(express.static(distDir, { maxAge: 0, index: 'index.html' }));
  }

  return { app, ready, close: () => pool.end().catch(() => {}) };
}
