<template>
  <div class="p-4 rounded-3xl bg-white border border-platinum-200 shadow-2xs space-y-3 live-ram" data-testid="live-ram-test">
    <div>
      <h3 class="font-bold text-slate-800 text-sm">Thử RAM cực hạn · chạy thật</h3>
      <p class="text-[10.5px] text-slate-500 leading-snug">
        Nạp việc làm liên tục vào mảng gốc + cây AVL + bảng băm (đúng các lớp của Lab 1/4/6) và đo ngay trong lúc chạy.
      </p>
    </div>

    <!-- Chọn chế độ -->
    <div class="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-platinum-50 border border-platinum-200 text-[11px] font-bold">
      <button
        class="py-1.5 rounded-xl transition"
        :class="mode === 'browser' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-800'"
        :disabled="busy"
        @click="mode = 'browser'"
      >Trên trang web này</button>
      <button
        class="py-1.5 rounded-xl transition"
        :class="mode === 'node' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-800'"
        :disabled="busy"
        @click="mode = 'node'"
      >Node.js tới khi sập (OOM)</button>
    </div>

    <!-- ===================== CHẾ ĐỘ 1: TRÌNH DUYỆT ===================== -->
    <template v-if="mode === 'browser'">
      <p class="text-[10.5px] text-slate-600 leading-snug">
        Dữ liệu nằm trong một <b>Web Worker</b> của chính trang này (giao diện không bị chặn). "Giải phóng RAM" hủy worker nên heap của nó được trả ngay. Tự dừng <b>trước</b> khi tổng RAM ước tính của cả trang chạm trần (lô nhỏ dần khi gần trần), để tab không bị trình duyệt đóng.
      </p>
      <div class="flex items-center gap-2 flex-wrap">
        <label class="text-[11px] text-slate-600" title="Tổng RAM ước tính của cả trang (heap cấp phát + phần ngoài heap), không chỉ heap JS">Trần RAM cả trang</label>
        <select v-model.number="capMb" :disabled="b.running" class="text-[11px] border border-platinum-200 rounded-lg px-1.5 py-1 bg-white">
          <option v-for="c in capOptions" :key="c" :value="c">{{ c }} MB</option>
        </select>
        <button
          v-if="!b.running"
          class="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-40"
          :disabled="busy"
          @click="startBrowser"
        >▶ Bắt đầu nạp</button>
        <button v-else class="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-rose-600 text-white hover:bg-rose-500" @click="stopBrowser('Bạn bấm dừng')">■ Dừng</button>
        <button
          class="px-3 py-1.5 rounded-xl text-[11px] font-bold border border-platinum-200 text-slate-700 hover:border-slate-400 disabled:opacity-40"
          :disabled="b.running || !b.jobs"
          title="Hủy Web Worker giữ dữ liệu thử: heap của nó được trả ngay"
          @click="releaseBrowser"
        >Giải phóng RAM</button>
      </div>

      <!-- Ô số liệu sống -->
      <div class="grid grid-cols-2 gap-1.5 font-mono">
        <div class="tile">
          <div class="tile-k">Việc trong RAM</div>
          <div class="tile-v">{{ fmtInt(b.jobs) }}</div>
        </div>
        <div class="tile">
          <div class="tile-k">Tổng RAM cả trang (ước tính)</div>
          <div class="tile-v">{{ b.totalMb.toFixed(0) }} <span class="tile-u">/ {{ capMb }} MB</span></div>
          <div class="bar"><div class="bar-in" :style="{ width: Math.min(100, (b.totalMb / capMb) * 100) + '%', background: b.totalMb / capMb > 0.8 ? '#eb6834' : '#2a78d6' }"></div></div>
          <div class="tile-k">heap dùng {{ b.heapMb.toFixed(0) }}{{ b.estimated ? ' (ước tính)' : '' }} · heap cấp {{ b.allocMb.toFixed(0) }} · ngoài heap ≈ {{ OVERHEAD_MB }} MB</div>
        </div>
        <div class="tile">
          <div class="tile-k">Khung hình / giây</div>
          <div class="tile-v" :class="b.fps < 20 && b.running ? 'text-rose-600' : ''">{{ b.fps }} <span class="tile-u">FPS</span></div>
          <div class="tile-k">khung dài nhất {{ b.worstFrame }} ms</div>
        </div>
        <div class="tile">
          <div class="tile-k">Lô vừa rồi chặn giao diện</div>
          <div class="tile-v">{{ b.blockMs }} <span class="tile-u">ms</span></div>
          <div class="tile-k">AVL {{ b.avlUs }} µs · băm {{ b.hashUs }} µs</div>
        </div>
      </div>

      <p class="text-[10px] text-slate-400 leading-snug">
        Con số này <b>không bằng Task Manager</b>: trình duyệt chỉ cho trang đọc heap JS (dùng / đã cấp). Phần ngoài heap (mã, DOM, three.js, GPU, bộ đệm) cộng bằng hằng số hiệu chuẩn ≈ {{ OVERHEAD_MB }} MB, nên tổng chỉ là ước tính. Giải phóng RAM: bỏ tham chiếu rồi tạo rác ngắn hạn để V8 buộc phải dọn (trình duyệt không cho gọi gc() trực tiếp); hệ điều hành trả RAM cho tiến trình dần, và ~{{ OVERHEAD_MB }} MB còn lại là nền của chính trang này.
      </p>
      <div v-if="b.status" class="text-[10.5px] rounded-xl px-2.5 py-1.5" :class="b.statusTone === 'warn' ? 'bg-amber-50 text-amber-800' : 'bg-platinum-50 text-slate-600'">
        {{ b.status }}
      </div>

      <!-- Biểu đồ heap theo thời gian -->
      <div v-if="b.series.length > 1">
        <div class="text-[11px] font-bold text-slate-700 mb-0.5">Tổng RAM trang ước tính (đậm) và heap JS dùng (nhạt), MB</div>
        <div class="relative" @mouseleave="hov = null">
          <svg :viewBox="`0 0 ${W} ${H}`" class="w-full h-auto block" @mousemove="onMoveB($event)">
            <g v-for="t in heapTicks" :key="'h' + t">
              <line :x1="PL" :x2="W - PR" :y1="yHeap(t)" :y2="yHeap(t)" class="grid" />
              <text :x="PL - 4" :y="yHeap(t) + 3" class="tick" text-anchor="end">{{ t }}</text>
            </g>
            <line :x1="PL" :x2="W - PR" :y1="yHeap(capMb)" :y2="yHeap(capMb)" class="warn" />
            <text :x="W - PR" :y="yHeap(capMb) - 3" class="tick" text-anchor="end">trần {{ capMb }} MB</text>
            <template v-if="b.releaseAt !== null">
              <line :x1="xT(b.releaseAt)" :x2="xT(b.releaseAt)" :y1="PT" :y2="H - PB" class="cross" />
              <text :x="xT(b.releaseAt) + 3" :y="PT + 8" class="tick">giải phóng</text>
            </template>
            <text v-for="t in timeTicks" :key="'t' + t" :x="xT(t)" :y="H - PB + 12" class="tick" text-anchor="middle">{{ t }}s</text>
            <path :d="pathB(s => s.heap, yHeap)" fill="none" stroke="#2a78d6" stroke-opacity="0.45" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" />
            <path :d="pathB(s => s.total, yHeap)" fill="none" stroke="#2a78d6" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
            <template v-if="hov && hov.chart === 'heap'">
              <line :x1="hov.x" :x2="hov.x" :y1="PT" :y2="H - PB" class="cross" />
              <circle :cx="hov.x" :cy="yHeap(hov.s.total)" r="4" fill="#2a78d6" class="ring-stroke" />
            </template>
          </svg>
          <div v-if="hov && hov.chart === 'heap'" class="tip" :style="tipStyle">
            <div class="font-bold text-slate-900">Giây {{ hov.s.t.toFixed(1) }}</div>
            <div>{{ fmtInt(hov.s.jobs) }} việc</div>
            <div>Tổng ước tính {{ hov.s.total.toFixed(0) }} MB</div>
            <div>Heap dùng {{ hov.s.heap.toFixed(0) }} MB</div>
            <div>{{ hov.s.fps }} FPS</div>
          </div>
        </div>

        <div class="text-[11px] font-bold text-slate-700 mt-2 mb-0.5">Độ mượt giao diện (FPS) — 60 là mượt</div>
        <div class="relative" @mouseleave="hov = null">
          <svg :viewBox="`0 0 ${W} ${HS}`" class="w-full h-auto block" @mousemove="onMoveB($event, 'fps')">
            <g v-for="t in [0, 30, 60]" :key="'f' + t">
              <line :x1="PL" :x2="W - PR" :y1="yFps(t)" :y2="yFps(t)" class="grid" />
              <text :x="PL - 4" :y="yFps(t) + 3" class="tick" text-anchor="end">{{ t }}</text>
            </g>
            <text v-for="t in timeTicks" :key="'ft' + t" :x="xT(t)" :y="HS - 2" class="tick" text-anchor="middle">{{ t }}s</text>
            <path :d="pathB(s => s.fps, yFps)" fill="none" stroke="#eb6834" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
            <template v-if="hov && hov.chart === 'fps'">
              <line :x1="hov.x" :x2="hov.x" :y1="PT" :y2="HS - PB" class="cross" />
              <circle :cx="hov.x" :cy="yFps(hov.s.fps)" r="4" fill="#eb6834" class="ring-stroke" />
            </template>
          </svg>
          <div v-if="hov && hov.chart === 'fps'" class="tip" :style="tipStyle">
            <div class="font-bold text-slate-900">Giây {{ hov.s.t.toFixed(1) }}</div>
            <div>{{ hov.s.fps }} FPS · khung dài nhất {{ hov.s.worst }} ms</div>
            <div>{{ fmtInt(hov.s.jobs) }} việc</div>
          </div>
        </div>
      </div>
    </template>

    <!-- ===================== CHẾ ĐỘ 2: NODE.JS TỚI OOM ===================== -->
    <template v-else>
      <p class="text-[10.5px] text-slate-600 leading-snug">
        Máy chủ dev khởi chạy một tiến trình <code>node --max-old-space-size=N</code> thật, nạp dữ liệu không ngừng cho tới khi V8 báo
        <b>hết bộ nhớ và tiến trình chết</b>. Từng lô được truyền về đây theo thời gian thực.
      </p>
      <div class="flex items-center gap-2 flex-wrap">
        <label class="text-[11px] text-slate-600">Giới hạn RAM</label>
        <select v-model.number="nodeLimit" :disabled="n.running" class="text-[11px] border border-platinum-200 rounded-lg px-1.5 py-1 bg-white">
          <option v-for="c in NODE_LIMITS" :key="c" :value="c">{{ c }} MB</option>
        </select>
        <button
          v-if="!n.running"
          class="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-40"
          :disabled="busy"
          @click="startNode"
        >▶ Chạy tới khi sập</button>
        <button v-else class="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-rose-600 text-white hover:bg-rose-500" @click="stopNode">■ Dừng</button>
        <button
          v-if="n.runs.length && !n.running"
          class="text-[10.5px] font-bold text-slate-500 hover:text-slate-800"
          @click="n.runs = []; n.log = []"
        >Xóa kết quả</button>
      </div>

      <div v-if="nCur" class="grid grid-cols-2 gap-1.5 font-mono">
        <div class="tile">
          <div class="tile-k">Việc đang giữ</div>
          <div class="tile-v">{{ fmtInt(nLast?.jobs) }}</div>
        </div>
        <div class="tile">
          <div class="tile-k">Vùng heap bị giới hạn</div>
          <div class="tile-v">{{ nLast?.oldMB ?? 0 }} <span class="tile-u">/ {{ nCur.limitMB }} MB</span></div>
          <div class="bar"><div class="bar-in" :style="{ width: Math.min(100, nLast?.pctLimit || 0) + '%', background: (nLast?.pctLimit || 0) > 80 ? '#eb6834' : '#2a78d6' }"></div></div>
        </div>
        <div class="tile">
          <div class="tile-k">Thời gian dành cho GC</div>
          <div class="tile-v" :class="(nLast?.gcShare || 0) > 50 ? 'text-rose-600' : ''">{{ nLast?.gcShare ?? 0 }} <span class="tile-u">%</span></div>
        </div>
        <div class="tile">
          <div class="tile-k">Trạng thái</div>
          <div class="tile-v text-[12px]" :class="nCur.status === 'oom' ? 'text-rose-600' : nCur.status === 'running' ? 'text-emerald-700' : ''">{{ STATUS_TEXT[nCur.status] }}</div>
          <div class="tile-k">{{ (nCur.tMs / 1000).toFixed(1) }} s · nạp {{ nLast?.perJobUs ?? '—' }} µs/việc</div>
        </div>
      </div>

      <div v-if="n.runs.length">
        <div class="text-[11px] font-bold text-slate-700 mb-0.5">Bộ nhớ đã dùng (% giới hạn) khi số việc tăng</div>
        <div class="flex flex-wrap gap-x-3 gap-y-1 mb-1" role="list" aria-label="Chú giải">
          <span v-for="(r, i) in n.runs" :key="'lg' + i" role="listitem" class="flex items-center gap-1 text-[10.5px] text-slate-600">
            <span class="inline-block w-3 h-[2px] rounded" :style="{ background: COLORS[i % COLORS.length] }"></span>{{ r.limitMB }} MB
          </span>
          <span class="flex items-center gap-1 text-[10.5px] text-slate-500"><span class="font-black">✕</span> hết bộ nhớ</span>
        </div>
        <div class="relative" @mouseleave="hov = null">
          <svg :viewBox="`0 0 ${W} ${H}`" class="w-full h-auto block" @mousemove="onMoveN($event)">
            <g v-for="t in [0, 25, 50, 75, 100]" :key="'ng' + t">
              <line :x1="PL" :x2="W - PR" :y1="yPct(t)" :y2="yPct(t)" class="grid" />
              <text :x="PL - 4" :y="yPct(t) + 3" class="tick" text-anchor="end">{{ t }}%</text>
            </g>
            <text v-for="t in nXTicks" :key="'nx' + t" :x="xJ(t)" :y="H - PB + 12" class="tick" text-anchor="middle">{{ fmtK(t) }}</text>
            <text :x="(PL + W - PR) / 2" :y="H - 2" class="axis" text-anchor="middle">số việc đang giữ trong RAM</text>
            <g v-for="(r, i) in n.runs" :key="'nl' + i">
              <path :d="pathN(r)" fill="none" :stroke="COLORS[i % COLORS.length]" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
              <g v-if="r.status === 'oom' && r.steps.length" :transform="`translate(${xJ(r.steps[r.steps.length - 1].jobs)},${yPct(r.steps[r.steps.length - 1].pctLimit)})`">
                <circle r="6" class="ring" />
                <path d="M-4,-4L4,4M4,-4L-4,4" :stroke="COLORS[i % COLORS.length]" stroke-width="2.2" stroke-linecap="round" />
              </g>
            </g>
            <template v-if="hov && hov.chart === 'node'">
              <line :x1="hov.x" :x2="hov.x" :y1="PT" :y2="H - PB" class="cross" />
              <circle :cx="hov.x" :cy="hov.y" r="4" :fill="COLORS[hov.i % COLORS.length]" class="ring-stroke" />
            </template>
          </svg>
          <div v-if="hov && hov.chart === 'node'" class="tip" :style="tipStyle">
            <div class="font-bold text-slate-900">Giới hạn {{ n.runs[hov.i].limitMB }} MB</div>
            <div>{{ fmtInt(hov.s.jobs) }} việc</div>
            <div>Đã dùng {{ hov.s.oldMB }} MB ({{ hov.s.pctLimit }}%)</div>
            <div>GC chiếm {{ hov.s.gcShare }}% thời gian lô</div>
          </div>
        </div>
      </div>

      <!-- Nhật ký tiến trình (stdout/stderr thật) -->
      <div v-if="n.log.length" class="rounded-xl bg-slate-900 text-slate-200 font-mono text-[10px] leading-snug p-2 max-h-36 overflow-y-auto" ref="logEl">
        <div v-for="(l, k) in n.log" :key="k" :class="l.tone === 'err' ? 'text-rose-300' : l.tone === 'ok' ? 'text-emerald-300' : ''">{{ l.text }}</div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, nextTick, onBeforeUnmount } from 'vue';

import { createTestData, generateAndIndexBatch } from '../controllers/RamTestController.js';

const emit = defineEmits(['heap']);

// Bảng màu phân loại cố định giống RamLimitChart (thứ tự không đổi)
const COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100'];
const W = 320, H = 160, HS = 90;
const PL = 30, PR = 8, PT = 8, PB = 22;
const BATCH = 25000;
const MIN_BATCH = 1000;
// Hiệu chuẩn: phần RAM của trang NẰM NGOÀI heap JS (mã, DOM, three.js, GPU, bộ đệm). Trang chỉ đọc được heap JS,
// nên tổng ước tính = heap cấp phát + hằng số này. Số liệu đo xem HISTORY.md phiên #56.
const OVERHEAD_MB = 220;
const SAFETY = 0.97;   // dừng khi tổng ước tính dự kiến sau lô kế ≥ 97% trần
const GC_SLACK = 1.35; // heap cấp phát tăng nhanh hơn heap dùng vì chưa kịp dọn
const SAMPLES = 2000;
const NODE_LIMITS = [128, 256, 384, 512, 768, 1024];
const STATUS_TEXT = { running: 'Đang nạp…', oom: '✕ Sập: hết bộ nhớ', stopped: 'Đã dừng', done: 'Hoàn tất', error: 'Lỗi' };

const mode = ref('browser');
const fmtInt = v => (v == null ? '—' : Number(v).toLocaleString('vi-VN'));
const fmtK = v => (v >= 1e6 ? (v / 1e6).toFixed(1).replace('.', ',') + 'tr' : v >= 1e3 ? Math.round(v / 1e3) + 'k' : String(v));

function niceTicks(max, count) {
  if (!max) return [0];
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw);
  const out = [];
  for (let v = 0; v <= max + 1e-9; v += step) out.push(+v.toFixed(6));
  return out;
}

// =====================================================================
// CHẾ ĐỘ 1 — NẠP THẬT TRÊN LUỒNG CHÍNH CỦA TRANG
// =====================================================================
const mem = () => (typeof performance !== 'undefined' && performance.memory) || null;
const heapLimitMb = mem() ? mem().jsHeapSizeLimit / 1048576 : 2048;
// Chỉ cho các trần thấp hơn hẳn trần của trình duyệt để tab không bị đóng vì hết bộ nhớ
const capOptions = [256, 512, 1024, 2048].filter(c => c <= heapLimitMb * 0.6);
const capMb = ref(capOptions.includes(512) ? 512 : capOptions[capOptions.length - 1] || 256);

// Dữ liệu thử nằm trong WEB WORKER riêng (mảng gốc + AVL + bảng băm). Trang chính chỉ giữ con số đo.
// "Giải phóng RAM" = worker.terminate() → hủy cả heap của worker ngay, trang chính luôn ở mức nền.
let worker = null;
let wSeq = 0;
const wPending = new Map();
let wJobs = 0;       // số việc worker đang giữ
let wUsed = 0, wTotal = 0, wBaseUsed = 0; // heap worker (MB)
function spawnWorker() {
  worker = new Worker(new URL('../controllers/ramWorker.js', import.meta.url), { type: 'module' });
  worker.onmessage = (e) => { const r = wPending.get(e.data.id); if (r) { wPending.delete(e.data.id); r(e.data); } };
  worker.onerror = (e) => { b.status = 'Lỗi worker: ' + (e.message || ''); b.statusTone = 'warn'; };
}
function wCall(msg) {
  return new Promise((resolve) => { const id = ++wSeq; wPending.set(id, resolve); worker.postMessage({ ...msg, id }); });
}
function killWorker() {
  if (worker) worker.terminate();
  worker = null;
  wPending.clear();
}

const b = reactive({
  running: false, jobs: 0, heapMb: 0, allocMb: 0, totalMb: 0, fps: 60, worstFrame: 0, blockMs: 0, avlUs: '—', hashUs: '—',
  status: '', statusTone: '', series: [], releaseAt: null, estimated: false
});
const busy = computed(() => b.running || n.running);

let t0 = 0;
let baseHeap = 0;
let bytesPerJobEst = 900; // dùng khi trình duyệt làm tròn số đo heap
let staleCount = 0;
let lastRaw = 0;

function readHeap(jobs) {
  const m = mem();
  if (!m) { b.estimated = true; return baseHeap + (jobs * bytesPerJobEst) / 1048576; }
  const raw = m.usedJSHeapSize / 1048576;
  // Chrome ở chế độ thường làm tròn và giữ nguyên số đo rất lâu → phát hiện để chuyển sang ước tính
  if (b.running && Math.abs(raw - lastRaw) < 0.01) staleCount++; else staleCount = 0;
  lastRaw = raw;
  if (staleCount >= 3) b.estimated = true;
  return b.estimated ? baseHeap + (jobs * bytesPerJobEst) / 1048576 : raw;
}

// ---- Đo FPS thật bằng requestAnimationFrame ----
let rafId = 0, frames = 0, winStart = 0, lastFrame = 0, worst = 0, fpsUntil = 0;
function rafLoop(ts) {
  if (lastFrame) worst = Math.max(worst, ts - lastFrame);
  lastFrame = ts;
  frames++;
  if (ts - winStart >= 500) {
    b.fps = Math.round((frames * 1000) / (ts - winStart));
    b.worstFrame = Math.round(worst);
    frames = 0; worst = 0; winStart = ts;
  }
  if (b.running || performance.now() < fpsUntil) rafId = requestAnimationFrame(rafLoop);
  else rafId = 0;
}
function startFps(extraMs = 0) {
  fpsUntil = performance.now() + extraMs;
  if (!rafId) {
    frames = 0; worst = 0; lastFrame = 0; winStart = performance.now();
    rafId = requestAnimationFrame(rafLoop);
  }
}

function pushSample() {
  const jobs = wJobs;
  // Tổng ước tính = heap trang chính (nền) + heap worker (dữ liệu) + phần ngoài heap
  const m = mem();
  const pageAlloc = m ? m.totalJSHeapSize / 1048576 : 80;
  const pageUsed = m ? m.usedJSHeapSize / 1048576 : 80;
  if (worker && wUsed != null && !b.estimated) {
    b.heapMb = pageUsed + wUsed;
    b.allocMb = pageAlloc + Math.max(wUsed, wTotal);
  } else {
    b.heapMb = pageUsed + (jobs * bytesPerJobEst) / 1048576;
    b.allocMb = b.heapMb * 1.1;
  }
  b.totalMb = b.allocMb + OVERHEAD_MB;
  b.series.push({ t: (performance.now() - t0) / 1000, heap: b.heapMb, total: b.totalMb, jobs, fps: b.fps, worst: b.worstFrame });
  if (b.series.length > 400) b.series.splice(0, b.series.length - 400);
  emit('heap', +b.totalMb.toFixed(1));
}

const yieldFrame = () => new Promise(r => setTimeout(r, 30));

async function startBrowser() {
  if (busy.value) return;
  killWorker();
  spawnWorker();
  clearInterval(releaseTimer);
  wJobs = 0; wUsed = 0; wTotal = 0;
  b.running = true; b.series = []; b.releaseAt = null; b.estimated = false; b.jobs = 0;
  b.status = 'Đang nạp trong Web Worker riêng: giao diện vẫn mượt vì luồng chính không bị chặn.';
  b.statusTone = 'warn';
  staleCount = 0; lastRaw = 0;
  t0 = performance.now();
  baseHeap = 0;
  const w0 = await wCall({ type: 'mem' });
  wBaseUsed = w0.usedMB ?? 0; wUsed = w0.usedMB; wTotal = w0.totalMB;
  // Chrome KHÔNG có performance.memory trong Worker → hiệu chuẩn byte/việc bằng một mẫu nhỏ trên luồng chính (rồi bỏ ngay)
  if (w0.usedMB == null) { b.estimated = true; bytesPerJobEst = calibrateBytesPerJob(); }
  startFps();
  pushSample();
  let batch = 0;
  while (b.running) {
    // Dừng TRƯỚC trần: chọn cỡ lô sao cho tổng ước tính SAU lô vẫn dưới trần; gần trần thì lô nhỏ dần
    const room = capMb.value * SAFETY - b.totalMb;
    const perJobMb = (bytesPerJobEst * GC_SLACK) / 1048576;
    const fit = Math.floor(room / perJobMb);
    if (fit < MIN_BATCH) {
      stopBrowser(`Dừng trước trần ${capMb.value} MB: tổng RAM trang ước tính ${b.totalMb.toFixed(0)} MB (heap dùng ${b.heapMb.toFixed(0)} + ngoài heap ≈ ${OVERHEAD_MB}), ${fmtInt(b.jobs)} việc. Bấm "Giải phóng RAM" để hủy worker và trả RAM.`);
      break;
    }
    const size = Math.min(BATCH, Math.max(MIN_BATCH, Math.floor(fit / 2)));
    const tA = performance.now();
    const r = await wCall({ type: 'batch', size, seed: 7 + batch, samples: SAMPLES });
    if (!b.running) break; // đã bị dừng/giải phóng trong lúc worker nạp
    b.avlUs = r.avlUs.toFixed(2);
    b.hashUs = r.hashUs.toFixed(2);
    b.blockMs = Math.round(performance.now() - tA); // thời gian lô, KHÔNG còn chặn luồng giao diện
    wJobs = r.jobs; wUsed = r.usedMB; wTotal = r.totalMB;
    b.jobs = r.jobs;
    batch++;

    if (r.usedMB != null && b.jobs) bytesPerJobEst = Math.max(200, ((r.usedMB - wBaseUsed) * 1048576) / b.jobs);
    pushSample();
    await yieldFrame(); // nhả 1 khung hình để trình duyệt vẽ lại và đo FPS
  }
}

function stopBrowser(reason) {
  if (!b.running) return;
  b.running = false;
  b.status = reason;
  b.statusTone = '';
  startFps(1500);
}

function releaseBrowser() {
  if (b.running || !worker) return;
  const n0 = wJobs;
  // Hủy worker: cả heap của nó (mảng, cây AVL, bảng băm) bị trả ngay, không cấp phát thêm gì → không thể vượt trần khi giải phóng
  killWorker();
  wJobs = 0; wUsed = 0; wTotal = 0;
  b.jobs = 0;
  b.estimated = false;
  b.releaseAt = (performance.now() - t0) / 1000;
  b.status = `Đã hủy worker giữ ${fmtInt(n0)} việc: heap của nó được trả ngay, trang chính chỉ còn mức nền (~${OVERHEAD_MB} MB ngoài heap).`;
  startFps(3000);
  clearInterval(releaseTimer);
  let ticks = 0;
  releaseTimer = setInterval(() => {
    pushSample();
    if (++ticks >= 10 || b.running) clearInterval(releaseTimer);
  }, 500);
  pushSample();
}
let releaseTimer = 0;

// Nạp thử CAL_JOBS việc trên luồng chính, đo chênh lệch heap dùng, rồi bỏ tham chiếu (~vài chục MB rác, GC thu sau)
const CAL_JOBS = 150000;
function calibrateBytesPerJob() {
  const m = mem();
  if (!m) return 190;
  const before = m.usedJSHeapSize;
  let d = createTestData();
  generateAndIndexBatch(d, CAL_JOBS, 99, 0);
  const delta = mem().usedJSHeapSize - before;
  d = null;
  return delta > CAL_JOBS * 50 ? delta / CAL_JOBS : 190;
}

// ---- Biểu đồ trình duyệt ----
const tMax = computed(() => Math.max(1, ...b.series.map(s => s.t)));
const timeTicks = computed(() => niceTicks(tMax.value, 4).filter(t => t <= tMax.value));
const heapMax = computed(() => {
  const m = Math.max(capMb.value, ...b.series.map(s => s.total));
  const t = niceTicks(m, 4);
  return t[t.length - 1] < m ? t[t.length - 1] + (t[1] || 1) : t[t.length - 1];
});
const heapTicks = computed(() => niceTicks(heapMax.value, 4));
const xT = t => PL + (t / tMax.value) * (W - PL - PR);
const yHeap = v => PT + (1 - v / heapMax.value) * (H - PT - PB);
const yFps = v => PT + (1 - Math.min(v, 66) / 66) * (HS - PT - PB + 10);
const pathB = (f, y) => b.series.map((s, k) => `${k ? 'L' : 'M'}${xT(s.t).toFixed(1)},${y(f(s)).toFixed(1)}`).join('');

// =====================================================================
// CHẾ ĐỘ 2 — TIẾN TRÌNH NODE THẬT TỚI OOM (SSE từ máy chủ dev)
// =====================================================================
const nodeLimit = ref(256);
const n = reactive({ running: false, runs: [], log: [] });
const logEl = ref(null);
let es = null;

const nCur = computed(() => n.runs[n.runs.length - 1] || null);
const nLast = computed(() => (nCur.value && nCur.value.steps.length ? nCur.value.steps[nCur.value.steps.length - 1] : null));

function log(text, tone = '') {
  n.log.push({ text, tone });
  if (n.log.length > 80) n.log.splice(0, n.log.length - 80);
  nextTick(() => { if (logEl.value) logEl.value.scrollTop = logEl.value.scrollHeight; });
}

function startNode() {
  if (busy.value) return;
  if (n.runs.length >= COLORS.length) n.runs.shift();
  const run = reactive({ limitMB: nodeLimit.value, steps: [], status: 'running', tMs: 0 });
  n.runs.push(run);
  n.running = true;
  log(`$ node --max-old-space-size=${run.limitMB} RamLimitProbe.js`);
  es = new EventSource(`/api/ramtest/stream?limit=${run.limitMB}`);
  es.addEventListener('spawn', e => {
    const d = JSON.parse(e.data);
    log(`Tiến trình PID ${d.pid} đã khởi chạy · mỗi lô ${fmtInt(d.step)} việc`);
  });
  es.addEventListener('start', e => {
    const d = JSON.parse(e.data);
    log(`Node ${d.node} · giới hạn vùng già ${d.limitMB} MB (heap V8 tổng ${d.v8LimitMB} MB)`);
  });
  es.addEventListener('step', e => {
    const d = JSON.parse(e.data);
    run.steps.push(d);
    run.tMs = d.tMs;
    if (d.batch % 5 === 0 || d.pctLimit > 85) {
      log(`lô ${d.batch}: ${fmtInt(d.jobs)} việc · ${d.oldMB}/${run.limitMB} MB (${d.pctLimit}%) · GC ${d.gcShare}%`, d.pctLimit > 85 ? 'err' : '');
    }
  });
  es.addEventListener('stderr', e => {
    const d = JSON.parse(e.data);
    log(d.line, 'err');
  });
  es.addEventListener('exit', e => {
    const d = JSON.parse(e.data);
    run.tMs = d.tMs;
    run.status = d.oom ? 'oom' : run.status === 'stopped' ? 'stopped' : d.code === 0 ? 'done' : 'error';
    const lastStep = run.steps[run.steps.length - 1];
    if (d.oom) log(`✕ Tiến trình chết vì hết bộ nhớ sau ${(d.tMs / 1000).toFixed(1)} s · giữ được tối đa ${fmtInt(lastStep?.jobs)} việc`, 'err');
    else log(`Tiến trình kết thúc (mã ${d.code ?? d.signal})`, d.code === 0 ? 'ok' : '');
    closeEs();
  });
  es.onerror = () => {
    if (!n.running) return;
    if (run.status === 'running') {
      run.status = 'error';
      log('Mất kết nối tới máy chủ dev (cần chạy bằng npm run dev).', 'err');
    }
    closeEs();
  };
}

function closeEs() {
  if (es) { es.close(); es = null; }
  n.running = false;
}

function stopNode() {
  if (nCur.value) nCur.value.status = 'stopped';
  log('Bạn bấm dừng → máy chủ hủy tiến trình.');
  closeEs(); // đóng SSE → máy chủ kill tiến trình con
}

// ---- Biểu đồ Node ----
const nMaxJobs = computed(() => Math.max(1, ...n.runs.flatMap(r => r.steps.map(s => s.jobs))));
const nXTicks = computed(() => niceTicks(nMaxJobs.value, 4).filter(t => t <= nMaxJobs.value));
const xJ = j => PL + (j / nMaxJobs.value) * (W - PL - PR);
const yPct = p => PT + (1 - Math.min(p, 105) / 105) * (H - PT - PB);
const pathN = r => r.steps.map((s, k) => `${k ? 'L' : 'M'}${xJ(s.jobs).toFixed(1)},${yPct(s.pctLimit).toFixed(1)}`).join('');

// ---- Lớp hover ----
const hov = ref(null);
function locate(ev, vbH) {
  const rect = ev.currentTarget.getBoundingClientRect();
  return {
    px: ((ev.clientX - rect.left) / rect.width) * W,
    py: ((ev.clientY - rect.top) / rect.height) * vbH,
    relX: ev.clientX - rect.left, relY: ev.clientY - rect.top, w: rect.width
  };
}
function onMoveB(ev, chart = 'heap') {
  const p = locate(ev, chart === 'heap' ? H : HS);
  let best = null;
  for (const s of b.series) {
    const d = Math.abs(xT(s.t) - p.px);
    if (!best || d < best.d) best = { d, s, x: xT(s.t) };
  }
  hov.value = best ? { ...best, ...p, chart } : null;
}
function onMoveN(ev) {
  const p = locate(ev, H);
  let best = null;
  n.runs.forEach((r, i) => r.steps.forEach(s => {
    const x = xJ(s.jobs), y = yPct(s.pctLimit);
    const d = (x - p.px) ** 2 + ((y - p.py) * 0.6) ** 2;
    if (!best || d < best.d) best = { d, s, x, y, i };
  }));
  hov.value = best ? { ...best, ...p, chart: 'node' } : null;
}
const tipStyle = computed(() => {
  if (!hov.value) return {};
  const left = hov.value.relX > hov.value.w / 2 ? hov.value.relX - 150 : hov.value.relX + 12;
  return { left: `${Math.max(0, left)}px`, top: `${Math.max(0, hov.value.relY - 10)}px` };
});

onBeforeUnmount(() => {
  b.running = false;
  closeEs();
  if (rafId) cancelAnimationFrame(rafId);
  clearInterval(releaseTimer);
  killWorker();
});
</script>

<style scoped>
.live-ram .tile { background: #f8f8f6; border: 1px solid #ecebe7; border-radius: 12px; padding: 6px 8px; }
.live-ram .tile-k { font-size: 9.5px; color: #64748b; font-family: ui-sans-serif, system-ui, sans-serif; }
.live-ram .tile-v { font-size: 15px; font-weight: 800; color: #0f172a; line-height: 1.2; }
.live-ram .tile-u { font-size: 10px; font-weight: 600; color: #64748b; }
.live-ram .bar { height: 4px; border-radius: 4px; background: #e7e5e0; margin-top: 3px; overflow: hidden; }
.live-ram .bar-in { height: 100%; border-radius: 4px; transition: width 0.2s; }
.live-ram .grid { stroke: #e7e5e0; stroke-width: 1; }
.live-ram .warn { stroke: #94a3b8; stroke-width: 1; stroke-dasharray: 3 3; }
.live-ram .cross { stroke: #94a3b8; stroke-width: 1; }
.live-ram .tick { font-size: 8.5px; fill: #64748b; font-family: ui-monospace, monospace; }
.live-ram .axis { font-size: 8.5px; fill: #64748b; }
.live-ram .ring { fill: #ffffff; }
.live-ram .ring-stroke { stroke: #ffffff; stroke-width: 2; }
.live-ram .tip {
  position: absolute; z-index: 10; width: 146px; pointer-events: none; background: #ffffff;
  border: 1px solid #e2e8f0; border-radius: 10px; padding: 6px 8px; font-size: 10.5px; line-height: 1.35;
  color: #475569; box-shadow: 0 4px 14px rgba(15, 23, 42, 0.08);
}
</style>
