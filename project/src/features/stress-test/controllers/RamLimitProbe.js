/**
 * RamLimitProbe.js — Tiến trình đo RAM cực hạn (chạy 1 lần cho 1 mức --max-old-space-size).
 *
 * Nạp dần việc làm theo từng lô vào CHÍNH các cấu trúc của dự án:
 *   - Mảng gốc jobs (Single Source of Truth, Lab 1)
 *   - Cây AVL theo mã việc (Lab 4)
 *   - Bảng băm Horner theo kỹ năng (Lab 6)
 * Sau mỗi lô ghi 1 dòng JSON: heap đang dùng, % giới hạn, thời gian nạp, số lần & thời gian GC,
 * độ trễ tra cứu AVL / bảng băm. Chạy tới khi V8 hết bộ nhớ (OOM) hoặc đạt --max-jobs.
 *
 * Kết quả ghi bằng appendFileSync (đồng bộ) nên dòng cuối trước khi OOM vẫn còn trong file.
 *
 * Cách dùng (thường do RamSweep.js gọi):
 *   node --max-old-space-size=256 RamLimitProbe.js --out=<file.jsonl> --step=64000 --max-jobs=8000000
 */
import fs from 'node:fs';
import v8 from 'node:v8';
import { PerformanceObserver, performance, constants as perfConst } from 'node:perf_hooks';
import { JobFactory, SKILL_TAGS } from '../../job-catalog/models/JobFactory.js';
import { AVLTree } from '../../job-index/models/AVLTree.js';
import { SkillHashTable } from '../../skill-search/models/SkillHashTable.js';

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v];
}));
const OUT = args.out;
// Ngân sách đặt bằng cờ --max-old-space-size (vùng "già" — nơi dữ liệu sống lâu nằm lại).
// heap_size_limit của V8 lớn hơn vì cộng thêm vùng "trẻ" (young generation) dùng cho đối tượng tạm.
const flag = process.execArgv.find(a => a.startsWith('--max-old-space-size='));
const V8_LIMIT_MB = v8.getHeapStatistics().heap_size_limit / 1048576;
const LIMIT_MB = flag ? Number(flag.split('=')[1]) : V8_LIMIT_MB;
const STEP = Math.max(1000, Number(args.step) || Math.round(LIMIT_MB * 150));
const MAX_JOBS = Number(args['max-jobs']) || 8_000_000;
const SAMPLES = 2000;

if (!OUT) {
  console.error('Thiếu --out=<file.jsonl>');
  process.exit(2);
}

// ---- Theo dõi GC: MINOR = Scavenge (dọn vùng trẻ), MAJOR = Mark-Compact (dọn toàn bộ heap) ----
let gcCount = 0, gcMajor = 0, gcMs = 0;
const obs = new PerformanceObserver(list => {
  for (const e of list.getEntries()) {
    gcCount++;
    gcMs += e.duration;
    const kind = e.detail ? e.detail.kind : e.kind;
    if (kind === perfConst.NODE_PERFORMANCE_GC_MAJOR) gcMajor++;
  }
});
obs.observe({ entryTypes: ['gc'] });

const flush = () => new Promise(r => setImmediate(r)); // cho PerformanceObserver kịp nhận sự kiện GC

// --out=- : ghi ra stdout (Inspector trên web đọc trực tiếp qua SSE). writeSync đồng bộ nên
// dòng cuối trước khi V8 chết vì OOM vẫn tới được trình duyệt.
function emit(obj) {
  const line = JSON.stringify(obj) + '\n';
  if (OUT === '-') fs.writeSync(1, line);
  else fs.appendFileSync(OUT, line);
}

// PRNG xác định để các lần đo lặp lại được
let s = 987654321;
const rand = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

const jobs = [];
const avl = new AVLTree();
const hash = new SkillHashTable(31, 0.75);

// Bộ nhớ đang dùng ở mọi vùng trừ vùng trẻ = phần bị giới hạn bởi --max-old-space-size
function oldSpaceMB() {
  let used = 0;
  for (const sp of v8.getHeapSpaceStatistics()) {
    if (sp.space_name !== 'new_space') used += sp.space_used_size;
  }
  return used / 1048576;
}

emit({ type: 'start', limitMB: Math.round(LIMIT_MB), v8LimitMB: Math.round(V8_LIMIT_MB), step: STEP, node: process.version, pid: process.pid });

let batch = 0;
while (jobs.length < MAX_JOBS) {
  const gc0 = { count: gcCount, major: gcMajor, ms: gcMs };
  const t0 = performance.now();

  const chunk = JobFactory.generateJobs(STEP, 42 + batch, jobs.length);
  for (let i = 0; i < chunk.length; i++) {
    const job = chunk[i];
    jobs.push(job);                         // mảng gốc giữ đối tượng duy nhất
    avl.insert(jobs.length, job);           // cây AVL chỉ giữ con trỏ
    hash.insert(job);                       // bảng băm chỉ giữ con trỏ
  }
  const insertMs = performance.now() - t0;

  // Độ trễ tra cứu trung bình trên dữ liệu hiện có
  let t1 = performance.now();
  let hit = 0;
  for (let k = 0; k < SAMPLES; k++) {
    if (avl.search(1 + Math.floor(rand() * jobs.length)).found) hit++;
  }
  const avlUs = ((performance.now() - t1) * 1000) / SAMPLES;
  t1 = performance.now();
  for (let k = 0; k < SAMPLES; k++) hash.search(SKILL_TAGS[Math.floor(rand() * SKILL_TAGS.length)]);
  const hashUs = ((performance.now() - t1) * 1000) / SAMPLES;

  await flush();
  const stepMs = performance.now() - t0;
  const mem = process.memoryUsage();
  const heapMB = mem.heapUsed / 1048576;
  const oldMB = oldSpaceMB();
  const stepGcMs = gcMs - gc0.ms;

  emit({
    type: 'step',
    batch,
    jobs: jobs.length,
    heapMB: +heapMB.toFixed(1),
    oldMB: +oldMB.toFixed(1),
    rssMB: +(mem.rss / 1048576).toFixed(1),
    pctLimit: +((oldMB / LIMIT_MB) * 100).toFixed(1),
    bytesPerJob: Math.round(mem.heapUsed / jobs.length),
    insertMs: +insertMs.toFixed(1),
    stepMs: +stepMs.toFixed(1),
    perJobUs: +((insertMs * 1000) / STEP).toFixed(3),
    avlUs: +avlUs.toFixed(3),
    avlHeight: avl.height,
    hashUs: +hashUs.toFixed(3),
    gcCount: gcCount - gc0.count,
    gcMajor: gcMajor - gc0.major,
    gcMs: +stepGcMs.toFixed(1),
    gcShare: +((stepGcMs / stepMs) * 100).toFixed(1),
    lookupsOk: hit === SAMPLES
  });
  batch++;
}

emit({ type: 'done', jobs: jobs.length, reason: 'max-jobs' });
obs.disconnect();
