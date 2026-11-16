/**
 * CoreRamStepper.js — Thử RAM trên LÕI THẬT, chạy bằng Node (đo thật process.memoryUsage) tới trần 1024 MB.
 *
 * Quy trình (một tiến trình Node, một bản lõi riêng/sandbox):
 *   bậc 0: dựng lõi 250.000 việc  → chạy một đợt thao tác cố định → đo RAM + thời gian
 *   bậc k: nạp thêm 250.000 việc (≈ +100 MB, đo thực tế ~410 byte/việc) → chạy lại đợt thao tác → đo
 *   Dừng AN TOÀN khi vùng "già" (old space) chạm ~88% trần, hoặc khi nhận lệnh hủy (stdin "CANCEL" / SIGINT / SIGTERM).
 *   Cuối cùng hủy toàn bộ lõi riêng và đo lại RAM sau dọn.
 *
 * Trần 1024 MB CHỈ dùng cho bài thử riêng này (cờ --max-old-space-size=1024 của npm run test:ram:core).
 * Vận hành thường ngày và `npm run test:stress` vẫn giữ 512 MB.
 *
 * Mỗi dòng ra là một JSON (--out=- mặc định): start | step | done  (cùng khuôn với RamLimitProbe để giao diện đọc chung).
 *
 *   node --max-old-space-size=1024 CoreRamStepper.js [--stop-pct=88] [--step-jobs=250000] [--ops=20000] [--max-steps=40] [--seed=20260515]
 */
import v8 from 'node:v8';
import vm from 'node:vm';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { StressSandbox, DEFAULT_SEED } from './StressSandbox.js';
import { checkInvariants, totalViolations } from './CoreInvariants.js';

const oldSpaceMB = () => {
  let used = 0;
  for (const sp of v8.getHeapSpaceStatistics()) if (sp.space_name !== 'new_space') used += sp.space_used_size;
  return used / 1048576;
};
const tick = () => new Promise((r) => setImmediate(r));

/**
 * @param {Object} o
 * @param {number} [o.limitMB]       trần old-space (mặc định đọc từ cờ --max-old-space-size)
 * @param {number} [o.stopPct=88]    dừng khi old-space ≥ % trần
 * @param {number} [o.stepJobs=250000]
 * @param {number} [o.opsPerStep=20000]
 * @param {number} [o.maxSteps=40]
 * @param {number} [o.seed]
 * @param {(ev:Object)=>void} o.emit
 * @param {()=>boolean} [o.shouldCancel]
 */
export async function runCoreRamStepper({ limitMB, stopPct = 88, stepJobs = 250000, opsPerStep = 20000, maxSteps = 40, seed = DEFAULT_SEED, emit, shouldCancel = () => false }) {
  const flag = process.execArgv.find((a) => a.startsWith('--max-old-space-size='));
  const LIMIT = limitMB || (flag ? Number(flag.split('=')[1]) : v8.getHeapStatistics().heap_size_limit / 1048576);
  const stopAtMB = (LIMIT * stopPct) / 100;
  const t00 = performance.now();
  const baseMB = oldSpaceMB();
  emit({ type: 'start', mode: 'core', source: 'node', limitMB: Math.round(LIMIT), stopPct, stopAtMB: Math.round(stopAtMB), stepJobs, opsPerStep, seed, node: process.version, pid: process.pid, baseMB: +baseMB.toFixed(1) });

  const sb = new StressSandbox({ seed, jobCount: stepJobs });
  let reason = 'max-steps';
  let lastOld = baseMB;
  let totalOps = 0;
  let step = 0;
  let violations = 0;
  try {
    for (step = 0; step < maxSteps; step++) {
      const t0 = performance.now();
      let loadMs = 0;
      if (step === 0) {
        sb.build();
        loadMs = sb.buildMs;
      } else {
        const e = sb.engine;
        const before = e.jobs.length;
        e.appendJobs(stepJobs, seed + step, e.maxKey);
        let dep = 0;
        for (let i = before; i < e.jobs.length; i++) dep += e.jobs[i].budget;
        e.ledger.depositedTotal += dep;
        sb.tagBatch();
        loadMs = performance.now() - t0;
      }
      // Đợt thao tác cố định, chia khối để còn nhận được lệnh hủy giữa chừng
      const tOps = performance.now();
      let done = 0;
      let cancelled = false;
      while (done < opsPerStep) {
        const n = Math.min(5000, opsPerStep - done);
        sb.runOps({ ops: n, timed: false, salt: step * 131 + (done / 5000), chunk: n });
        done += n;
        await tick();
        if (shouldCancel()) { cancelled = true; break; }
      }
      totalOps += done;
      const opsMs = performance.now() - tOps;
      const e = sb.engine;
      const mem = process.memoryUsage();
      const oldMB = oldSpaceMB();
      lastOld = oldMB;
      const inv = checkInvariants(e);
      const v = totalViolations(inv);
      violations += v;
      emit({
        type: 'step', step, jobs: e.jobs.length, ops: done, totalOps,
        heapMB: +(mem.heapUsed / 1048576).toFixed(1), oldMB: +oldMB.toFixed(1), rssMB: +(mem.rss / 1048576).toFixed(1),
        pctLimit: +((oldMB / LIMIT) * 100).toFixed(1),
        bytesPerJob: Math.round(mem.heapUsed / e.jobs.length),
        loadMs: +loadMs.toFixed(0), opsMs: +opsMs.toFixed(0), stepMs: +(performance.now() - t0).toFixed(0),
        opsPerSec: opsMs > 0 ? Math.round(done / (opsMs / 1000)) : 0,
        avlHeight: e.avl.height,
        queue: e.store.escrowQueue.queue.size, violations: v
      });
      if (cancelled) { reason = 'cancelled'; break; }
      if (v > 0) { reason = 'invariant'; break; }
      // Bậc kế tiếp cần thêm ~ (oldMB - base)/(step+1) MB: dừng nếu dự kiến vượt ngưỡng an toàn
      const perStep = (oldMB - baseMB) / (step + 1);
      if (oldMB >= stopAtMB || oldMB + perStep > stopAtMB) { reason = 'safe-stop'; break; }
      if (shouldCancel()) { reason = 'cancelled'; break; }
    }
  } finally {
    const jobsAtEnd = sb.engine ? sb.engine.jobs.length : 0;
    const peakOld = lastOld;
    sb.destroy();
    // Ép V8 dọn rác để số "sau dọn" là số thật (không cần cờ --expose-gc ở dòng lệnh)
    try { v8.setFlagsFromString('--expose-gc'); vm.runInNewContext('gc')(); } catch { /* không ép được: số sau dọn có thể còn cao */ }
    await tick();
    const after = oldSpaceMB();
    emit({
      type: 'done', reason, jobs: jobsAtEnd, steps: step + 1, totalOps, violations,
      limitMB: Math.round(LIMIT), peakOldMB: +peakOld.toFixed(1), pctLimit: +((peakOld / LIMIT) * 100).toFixed(1),
      afterCleanOldMB: +after.toFixed(1), baseMB: +baseMB.toFixed(1), totalMs: +(performance.now() - t00).toFixed(0), source: 'node'
    });
  }
}

// ---- Chạy trực tiếp từ dòng lệnh ----
const isMain = typeof process !== 'undefined' && process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const fs = await import('node:fs');
  const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v]; }));
  const human = args.human === '1';
  let cancel = false;
  process.on('SIGINT', () => { cancel = true; });
  process.on('SIGTERM', () => { cancel = true; });
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (d) => { if (/CANCEL/i.test(d)) cancel = true; });
  process.stdin.on('error', () => {});
  process.stdin.unref?.();
  const emit = (o) => {
    if (human) {
      if (o.type === 'start') console.log(`Trần old-space ${o.limitMB} MB · dừng an toàn ở ${o.stopAtMB} MB (${o.stopPct}%) · mỗi bậc +${o.stepJobs} việc, ${o.opsPerStep} thao tác · nền ${o.baseMB} MB`);
      else if (o.type === 'step') console.log(`bậc ${String(o.step).padStart(2)}: ${String(o.jobs).padStart(8)} việc | old ${String(o.oldMB).padStart(6)} MB (${o.pctLimit}%) | heap ${o.heapMB} MB | rss ${o.rssMB} MB | nạp ${o.loadMs} ms | ${o.opsPerSec} thao tác/s | AVL cao ${o.avlHeight} | vi phạm ${o.violations}`);
      else console.log(`XONG (${o.reason}): ${o.jobs} việc, đỉnh old-space ${o.peakOldMB} MB = ${o.pctLimit}% trần ${o.limitMB} MB; sau dọn ${o.afterCleanOldMB} MB (nền ${o.baseMB} MB); vi phạm ${o.violations}; ${o.totalMs} ms`);
    } else fs.writeSync(1, JSON.stringify(o) + '\n');
  };
  await runCoreRamStepper({
    stopPct: Number(args['stop-pct']) || 88,
    stepJobs: Number(args['step-jobs']) || 250000,
    opsPerStep: Number(args.ops) || 20000,
    maxSteps: Number(args['max-steps']) || 40,
    seed: Number(args.seed) || DEFAULT_SEED,
    emit,
    shouldCancel: () => cancel
  });
  process.exit(0);
}
