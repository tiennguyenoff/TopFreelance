/**
 * RamSweep.js — Kiểm thử RAM cực hạn (npm run test:ram).
 *
 * Chạy RamLimitProbe.js lần lượt (tuần tự, 1 CPU core) với nhiều mức --max-old-space-size,
 * mỗi lần nạp dần việc làm vào mảng gốc + Cây AVL + Bảng băm cho tới khi V8 hết bộ nhớ.
 * Thu lại: đường cong heap, thời gian GC, độ trễ tra cứu, điểm bắt đầu "nghẽn GC" và điểm OOM,
 * cùng vài dòng nhật ký GC cuối cùng V8 in ra trước khi sập.
 *
 * Kết quả: project/public/ram-sweep.json (web đọc để vẽ biểu đồ) + bảng tóm tắt trên terminal.
 *
 * Tùy chọn:  --limits=128,256,512,1024   --timeout=300   --max-jobs=8000000
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROBE = path.join(HERE, 'RamLimitProbe.js');
const OUT_JSON = path.resolve(HERE, '../../../../public/ram-sweep.json');

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v];
}));
const LIMITS = (args.limits || '128,256,512,1024').split(',').map(Number).filter(n => n >= 32);
const TIMEOUT_S = Number(args.timeout) || 300;
const MAX_JOBS = Number(args['max-jobs']) || 8_000_000;

const fmtInt = n => Number(n).toLocaleString('vi-VN');

function runProbe(limitMB) {
  return new Promise(resolve => {
    const tmp = path.join(os.tmpdir(), `tf-ram-${limitMB}-${process.pid}.jsonl`);
    try { fs.unlinkSync(tmp); } catch { /* chưa có file */ }
    const t0 = Date.now();
    const child = spawn(process.execPath, [
      `--max-old-space-size=${limitMB}`, PROBE, `--out=${tmp}`, `--max-jobs=${MAX_JOBS}`
    ], { stdio: ['ignore', 'ignore', 'pipe'] });

    let stderr = '';
    child.stderr.on('data', d => { stderr += d; if (stderr.length > 200_000) stderr = stderr.slice(-100_000); });
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill(); }, TIMEOUT_S * 1000);

    // Tiến độ trực tiếp trên terminal
    const tick = setInterval(() => {
      const last = readLines(tmp).filter(l => l.type === 'step').pop();
      if (last) process.stdout.write(`\r   ${limitMB} MB → ${fmtInt(last.jobs)} việc, vùng già ${last.oldMB} MB (${last.pctLimit}%), GC ${last.gcShare}%      `);
    }, 1000);

    child.on('exit', (code, signal) => {
      clearTimeout(timer); clearInterval(tick);
      process.stdout.write('\r' + ' '.repeat(90) + '\r');
      const lines = readLines(tmp);
      try { fs.unlinkSync(tmp); } catch { /* bỏ qua */ }
      const oom = /heap out of memory|Reached heap limit|Ineffective mark-compacts/i.test(stderr);
      const status = timedOut ? 'timeout' : (lines.some(l => l.type === 'done') ? 'done' : (oom ? 'oom' : 'crash'));
      resolve({ limitMB, status, exitCode: code, signal, wallMs: Date.now() - t0, lines, lastGcs: parseLastGcs(stderr), fatal: parseFatal(stderr) });
    });
  });
}

function readLines(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map(l => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean);
}

// "[1234:000001]   5021 ms: Mark-Compact 160.2 (171.0) -> 158.9 (171.2) MB, pooled: 0 MB, 120.30 / 0.00 ms ..."
function parseLastGcs(stderr) {
  const out = [];
  const re = /(\d+) ms: (Scavenge|Mark-Compact|Mark-Sweep|Mark-Compact \(reduce\))[^\d]*([\d.]+) \(([\d.]+)\) -> ([\d.]+) \(([\d.]+)\) MB[^\d]*(?:[^,]*,\s*)*?([\d.]+) \/ [\d.]+ ms/g;
  let m;
  while ((m = re.exec(stderr))) {
    out.push({ atMs: +m[1], kind: m[2], beforeMB: +m[3], afterMB: +m[5], pauseMs: +m[7] });
  }
  return out.slice(-6);
}

function parseFatal(stderr) {
  const m = stderr.match(/FATAL ERROR:[^\n]*/);
  return m ? m[0].trim() : null;
}

function summarize(run) {
  const steps = run.lines.filter(l => l.type === 'step');
  const start = run.lines.find(l => l.type === 'start') || {};
  const last = steps[steps.length - 1];
  const base = steps.slice(0, 3);
  const basePerJob = base.length ? base.reduce((s, x) => s + x.perJobUs, 0) / base.length : null;
  const firstWith = pred => (steps.find(pred) || {}).jobs ?? null;
  return {
    limitMB: run.limitMB,
    v8LimitMB: start.v8LimitMB ?? null,
    status: run.status,
    wallMs: run.wallMs,
    stepSize: start.step ?? null,
    maxJobsAlive: last ? last.jobs : 0,
    oomBeforeJobs: run.status === 'oom' && last ? last.jobs + (start.step || 0) : null,
    peakOldMB: steps.reduce((m, x) => Math.max(m, x.oldMB), 0),
    bytesPerJob: last ? last.bytesPerJob : null,
    warn80AtJobs: firstWith(x => x.pctLimit >= 80),
    gcThrashAtJobs: firstWith(x => x.gcShare >= 50 && x.pctLimit >= 70), // GC chiếm >= nửa thời gian khi đã gần trần
    slowdownX: basePerJob && last ? +(last.perJobUs / basePerJob).toFixed(1) : null,
    lookupsAlwaysOk: steps.every(x => x.lookupsOk),
    maxAvlHeight: last ? last.avlHeight : null,
    fatal: run.fatal,
    lastGcs: run.lastGcs,
    steps
  };
}

console.log('\n========================================================================');
console.log('   KIỂM THỬ RAM CỰC HẠN — nạp việc làm tới khi V8 hết bộ nhớ');
console.log(`   Mức giới hạn: ${LIMITS.join(' / ')} MB · Node ${process.version} · ${os.cpus()[0]?.model?.trim() || ''}`);
console.log('========================================================================\n');

const runs = [];
for (const limit of LIMITS) {
  console.log(`▶ --max-old-space-size=${limit}`);
  const run = summarize(await runProbe(limit));
  runs.push(run);
  const tag = { oom: '💥 HẾT BỘ NHỚ (OOM)', done: '✓ Đạt trần số việc', timeout: '⏱ Quá thời gian (nghẽn GC)', crash: '✗ Dừng bất thường' }[run.status];
  console.log(`   ${tag} sau ${(run.wallMs / 1000).toFixed(1)} s`);
  console.log(`   Sống tối đa: ${fmtInt(run.maxJobsAlive)} việc · vùng già cao nhất ${run.peakOldMB} MB · ~${run.bytesPerJob} byte/việc`);
  if (run.warn80AtJobs) console.log(`   Chạm 80% ngân sách tại ${fmtInt(run.warn80AtJobs)} việc`);
  if (run.gcThrashAtJobs) console.log(`   GC chiếm ≥50% thời gian từ ${fmtInt(run.gcThrashAtJobs)} việc`);
  if (run.slowdownX) console.log(`   Nạp chậm đi ×${run.slowdownX} so với lúc đầu · cây AVL cao ${run.maxAvlHeight} · tra cứu luôn đúng: ${run.lookupsAlwaysOk ? 'có' : 'KHÔNG'}`);
  if (run.fatal) console.log(`   V8: ${run.fatal}`);
  console.log('');
}

const report = {
  generatedAt: new Date().toISOString(),
  node: process.version,
  cpu: os.cpus()[0]?.model?.trim() || null,
  totalMemGB: +(os.totalmem() / 1073741824).toFixed(1),
  structures: ['Mảng gốc JobPost', 'Cây AVL theo mã việc', 'Bảng băm Horner theo kỹ năng'],
  runs
};
fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 1));

console.log('Giới hạn | Trạng thái | Việc tối đa | Byte/việc | 80% tại   | Nghẽn GC tại');
console.log('---------+------------+-------------+-----------+-----------+-------------');
for (const r of runs) {
  console.log(`${String(r.limitMB + ' MB').padEnd(8)} | ${r.status.padEnd(10)} | ${fmtInt(r.maxJobsAlive).padStart(11)} | ${String(r.bytesPerJob).padStart(9)} | ${(r.warn80AtJobs ? fmtInt(r.warn80AtJobs) : '—').padStart(9)} | ${r.gcThrashAtJobs ? fmtInt(r.gcThrashAtJobs) : '—'}`);
}
console.log(`\nĐã ghi ${path.relative(process.cwd(), OUT_JSON)} — mở web, Inspector › RAM / CPU để xem biểu đồ.\n`);
