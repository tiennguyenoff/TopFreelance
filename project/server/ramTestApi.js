/**
 * ramTestApi.js — Middleware Vite cho nút "Chạy thật tới OOM" trong Inspector (Lab 7).
 *
 * GET  /api/ramtest/core   — bài thử RAM trên LÕI THẬT (CoreRamStepper.js, trần 1024 MB, dừng an toàn ~88%)
 * POST /api/ramtest/cancel  — hủy mềm bài thử lõi thật (gửi CANCEL qua stdin, tiến trình tự dọn và báo "done")
 * GET /api/ramtest/stream?limit=256
 *   Sinh 1 tiến trình Node THẬT: node --max-old-space-size=<limit> RamLimitProbe.js --out=-
 *   Tiến trình nạp việc làm liên tục vào mảng gốc + AVL + bảng băm tới khi V8 hết bộ nhớ.
 *   Mỗi dòng JSON nó in ra được chuyển ngay về trình duyệt qua Server-Sent Events;
 *   dòng "FATAL ERROR ... heap out of memory" của V8 (stderr) và mã thoát cũng được gửi về.
 *
 * An toàn: chỉ nhận các mức RAM trong danh sách, chỉ 1 tiến trình cùng lúc,
 * chặn yêu cầu từ trang web khác (Origin / Sec-Fetch-Site), tự hủy sau 120 giây
 * hoặc khi trình duyệt đóng kết nối.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROBE = path.resolve(HERE, '../src/features/stress-test/controllers/RamLimitProbe.js');
const ALLOWED = [128, 256, 384, 512, 768, 1024];
const CORE = path.resolve(HERE, '../src/features/stress-test/controllers/CoreRamStepper.js');
const MAX_RUN_MS = 120_000;
const MAX_CORE_RUN_MS = 20 * 60_000; // bài thử lõi thật nạp từng 250.000 việc tới ~88% trần 1024 MB: chạy lâu hơn

let current = null; // tiến trình đang chạy (chỉ 1)

function sameOrigin(req) {
  const site = req.headers['sec-fetch-site'];
  if (site && site !== 'same-origin' && site !== 'none') return false;
  const origin = req.headers.origin;
  if (origin) {
    try {
      if (new URL(origin).host !== req.headers.host) return false;
    } catch {
      return false;
    }
  }
  return true;
}

export function ramTestApiPlugin() {
  return {
    name: 'ram-test-api',
    configureServer(server) {
      server.httpServer?.once('close', () => current?.kill('SIGKILL'));
      server.middlewares.use((req, res, next) => {
        if (!req.url.startsWith('/api/ramtest/')) return next();
        const url = new URL(req.url, 'http://localhost');
        const isCore = req.method === 'GET' && url.pathname === '/api/ramtest/core';
        const isCancel = req.method === 'POST' && url.pathname === '/api/ramtest/cancel';
        if (!isCore && !isCancel && (req.method !== 'GET' || url.pathname !== '/api/ramtest/stream')) {
          res.statusCode = 404;
          return res.end();
        }
        if (!sameOrigin(req)) {
          res.statusCode = 403;
          return res.end('Chỉ chạy được từ chính trang TopFreelance.');
        }
        if (isCancel) {
          // Lệnh hủy mềm: tiến trình tự dừng giữa các khối thao tác, hủy lõi riêng và báo kết quả
          const ok = !!(current && current.stdin && !current.stdin.destroyed);
          if (ok) current.stdin.write('CANCEL\n');
          res.statusCode = ok ? 200 : 409;
          return res.end(ok ? 'cancel sent' : 'no running test');
        }
        // Bài thử lõi thật: luôn trần 1024 MB (ngoại lệ riêng, không đổi trần vận hành 512 MB)
        const limit = isCore ? 1024 : Number(url.searchParams.get('limit'));
        if (!ALLOWED.includes(limit)) {
          res.statusCode = 400;
          return res.end(`Mức RAM phải thuộc ${ALLOWED.join(', ')} MB.`);
        }

        // Một tiến trình mỗi lúc: chạy mức mới thì dừng mức cũ
        if (current) current.kill('SIGKILL');

        res.writeHead(200, {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive'
        });
        const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

        // Lô nhỏ hơn mặc định để biểu đồ trên web cập nhật dày hơn (~40 điểm mỗi lần chạy)
        const step = Math.max(4000, Math.round(limit * 40));
        const args = isCore
          ? [`--max-old-space-size=${limit}`, CORE]
          : [`--max-old-space-size=${limit}`, PROBE, '--out=-', `--step=${step}`, '--max-jobs=20000000'];
        const t0 = Date.now();
        const child = spawn(process.execPath, args, { stdio: [isCore ? 'pipe' : 'ignore', 'pipe', 'pipe'], windowsHide: true });
        current = child;
        send('spawn', { pid: child.pid, limitMB: limit, step, mode: isCore ? 'core' : 'probe', cmd: `node --max-old-space-size=${limit} ${isCore ? 'CoreRamStepper.js' : 'RamLimitProbe.js'}` });

        let buf = '';
        child.stdout.setEncoding('utf8');
        child.stdout.on('data', chunk => {
          buf += chunk;
          let i;
          while ((i = buf.indexOf('\n')) >= 0) {
            const line = buf.slice(0, i).trim();
            buf = buf.slice(i + 1);
            if (!line) continue;
            try {
              const obj = JSON.parse(line);
              send(obj.type || 'step', { ...obj, tMs: Date.now() - t0 });
            } catch { /* bỏ dòng không phải JSON */ }
          }
        });

        // stderr: V8 in "FATAL ERROR: ... JavaScript heap out of memory" khi chạm trần
        let errText = '';
        child.stderr.setEncoding('utf8');
        child.stderr.on('data', chunk => {
          errText += chunk;
          if (errText.length > 8000) errText = errText.slice(-8000);
          for (const line of chunk.split(/\r?\n/)) {
            const l = line.trim();
            if (l) send('stderr', { line: l.slice(0, 300), tMs: Date.now() - t0 });
          }
        });

        const timer = setTimeout(() => child.kill('SIGKILL'), isCore ? MAX_CORE_RUN_MS : MAX_RUN_MS);

        child.on('close', (code, signal) => {
          clearTimeout(timer);
          if (current === child) current = null;
          const oom = /heap out of memory|Reached heap limit|allocation failed/i.test(errText);
          send('exit', { code, signal, oom, tMs: Date.now() - t0 });
          res.end();
        });

        // Trình duyệt đóng tab / bấm Dừng → hủy tiến trình
        // (dùng res 'close': từ Node 16, req 'close' bắn ngay khi đọc xong yêu cầu GET)
        res.on('close', () => {
          if (child.exitCode === null) child.kill('SIGKILL');
        });
      });
    }
  };
}
