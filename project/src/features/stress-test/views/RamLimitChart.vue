<template>
  <div class="p-4 rounded-3xl bg-white border border-platinum-200 shadow-2xs space-y-3 ram-viz" data-testid="ram-limit-chart">
    <div class="flex items-start justify-between gap-2">
      <div>
        <h3 class="font-bold text-slate-800 text-sm">Kết quả đo đã lưu · 4 mức RAM</h3>
        <p class="text-[10.5px] text-slate-500 leading-snug">
          Nạp việc làm liên tục vào mảng gốc + cây AVL + bảng băm cho tới khi Node.js hết bộ nhớ, ở từng mức giới hạn RAM.
        </p>
      </div>
      <button
        class="text-[10px] font-bold text-ice-700 hover:text-ice-900 shrink-0"
        title="Tải lại kết quả mới nhất từ public/ram-sweep.json"
        @click="load"
      >↻ Tải lại</button>
    </div>

    <!-- Chưa có dữ liệu -->
    <div v-if="state === 'loading'" class="text-xs text-slate-400">Đang tải kết quả…</div>
    <div v-else-if="state === 'missing'" class="text-xs text-slate-600 bg-platinum-50 rounded-2xl p-3 space-y-1">
      <p>Chưa có kết quả đo. Chạy lệnh sau ở thư mục gốc rồi bấm “Tải lại”:</p>
      <code class="block font-mono text-[11px] bg-white border border-platinum-200 rounded-lg px-2 py-1">npm run test:ram</code>
    </div>

    <template v-else>
      <!-- Biểu đồ 1: % ngân sách RAM theo số việc -->
      <div>
        <div class="text-[11px] font-bold text-slate-700 mb-1">Bộ nhớ đã dùng (% giới hạn) khi số việc tăng</div>
        <div class="flex flex-wrap gap-x-3 gap-y-1 mb-1" role="list" aria-label="Chú giải">
          <button
            v-for="(r, i) in runs"
            :key="r.limitMB"
            role="listitem"
            class="flex items-center gap-1 text-[10.5px] text-slate-600"
            :class="selected === i ? 'font-bold text-slate-900' : ''"
            :title="`Xem chi tiết mức ${r.limitMB} MB`"
            @click="selected = i"
          >
            <span class="inline-block w-3 h-[2px] rounded" :style="{ background: COLORS[i] }"></span>
            {{ r.limitMB }} MB
          </button>
          <span class="flex items-center gap-1 text-[10.5px] text-slate-500"><span class="font-black">✕</span> hết bộ nhớ</span>
        </div>
        <div class="relative" @mouseleave="hover = null">
          <svg :viewBox="`0 0 ${W} ${H}`" class="w-full h-auto block" @mousemove="onMove($event, 'main')">
            <!-- lưới ngang -->
            <g v-for="t in [0, 25, 50, 75, 100]" :key="'g' + t">
              <line :x1="PL" :x2="W - PR" :y1="yPct(t)" :y2="yPct(t)" class="grid" />
              <text :x="PL - 4" :y="yPct(t) + 3" class="tick" text-anchor="end">{{ t }}%</text>
            </g>
            <!-- vạch cảnh báo 80% -->
            <line :x1="PL" :x2="W - PR" :y1="yPct(80)" :y2="yPct(80)" class="warn" />
            <text :x="PL + 3" :y="yPct(80) - 3" class="tick" text-anchor="start">mốc 80%</text>
            <!-- trục x -->
            <text v-for="t in xTicks" :key="'x' + t" :x="xJobs(t)" :y="H - PB + 12" class="tick" text-anchor="middle">{{ fmtM(t) }}</text>
            <text :x="(PL + W - PR) / 2" :y="H - 2" class="axis" text-anchor="middle">số việc đang giữ trong RAM</text>
            <!-- đường -->
            <g v-for="(r, i) in runs" :key="'l' + r.limitMB" :opacity="selected === null || selected === i ? 1 : 0.35">
              <path :d="linePath(r.steps, s => s.pctLimit)" fill="none" :stroke="COLORS[i]" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
              <template v-if="r.steps.length">
                <g v-if="r.status === 'oom'" :transform="`translate(${xJobs(last(r).jobs)},${yPct(last(r).pctLimit)})`">
                  <circle r="6" class="ring" />
                  <path d="M-4,-4L4,4M4,-4L-4,4" :stroke="COLORS[i]" stroke-width="2.2" stroke-linecap="round" />
                </g>
              </template>
            </g>
            <!-- crosshair -->
            <template v-if="hover && hover.chart === 'main'">
              <line :x1="hover.x" :x2="hover.x" :y1="PT" :y2="H - PB" class="cross" />
              <circle :cx="hover.x" :cy="hover.y" r="4" :fill="COLORS[hover.i]" class="ring-stroke" />
            </template>
          </svg>
          <div v-if="hover && hover.chart === 'main'" class="tip" :style="tipStyle">
            <div class="font-bold text-slate-900">Giới hạn {{ runs[hover.i].limitMB }} MB</div>
            <div>{{ fmtInt(hover.s.jobs) }} việc</div>
            <div>Đã dùng {{ hover.s.oldMB }} MB ({{ hover.s.pctLimit }}%)</div>
            <div>GC chiếm {{ hover.s.gcShare }}% thời gian lô này</div>
          </div>
        </div>
      </div>

      <!-- Chi tiết mức đang chọn: 2 biểu đồ nhỏ, mỗi biểu đồ 1 trục -->
      <div v-if="cur" class="space-y-2">
        <div class="flex items-center gap-1.5 flex-wrap">
          <span class="text-[11px] font-bold text-slate-700">Chi tiết mức</span>
          <button
            v-for="(r, i) in runs"
            :key="'s' + r.limitMB"
            class="px-2 py-0.5 rounded-full text-[10.5px] border"
            :class="selected === i ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-platinum-200 hover:border-slate-400'"
            @click="selected = i"
          >{{ r.limitMB }} MB</button>
        </div>

        <div>
          <div class="text-[10.5px] text-slate-600 mb-0.5" title="Thời gian trung bình để nạp 1 việc vào cả mảng, cây AVL và bảng băm">
            Thời gian nạp mỗi việc (µs) — càng gần trần càng chậm
          </div>
          <div class="relative" @mouseleave="hover = null">
            <svg :viewBox="`0 0 ${W} ${HS}`" class="w-full h-auto block" @mousemove="onMove($event, 'speed')">
              <g v-for="t in speedTicks" :key="'sg' + t">
                <line :x1="PL" :x2="W - PR" :y1="ySpeed(t)" :y2="ySpeed(t)" class="grid" />
                <text :x="PL - 4" :y="ySpeed(t) + 3" class="tick" text-anchor="end">{{ t }}</text>
              </g>
              <text v-for="t in curXTicks" :key="'sx' + t" :x="xCur(t)" :y="HS - 2" class="tick" text-anchor="middle">{{ fmtM(t) }}</text>
              <path :d="curPath(s => s.perJobUs, ySpeed)" fill="none" :stroke="COLORS[selected]" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
              <template v-if="hover && hover.chart === 'speed'">
                <line :x1="hover.x" :x2="hover.x" :y1="PT" :y2="HS - PB" class="cross" />
                <circle :cx="hover.x" :cy="hover.y" r="4" :fill="COLORS[selected]" class="ring-stroke" />
              </template>
            </svg>
            <div v-if="hover && hover.chart === 'speed'" class="tip" :style="tipStyle">
              <div class="font-bold text-slate-900">{{ fmtInt(hover.s.jobs) }} việc</div>
              <div>Nạp {{ hover.s.perJobUs }} µs/việc</div>
              <div>Tra mã việc (AVL) {{ hover.s.avlUs }} µs · cây cao {{ hover.s.avlHeight }}</div>
            </div>
          </div>
        </div>

        <div>
          <div class="text-[10.5px] text-slate-600 mb-0.5" title="Phần trăm thời gian của mỗi lô mà V8 dành cho thu gom rác (Garbage Collection)">
            Phần thời gian dành cho dọn rác bộ nhớ (GC, %)
          </div>
          <div class="relative" @mouseleave="hover = null">
            <svg :viewBox="`0 0 ${W} ${HS}`" class="w-full h-auto block" @mousemove="onMove($event, 'gc')">
              <g v-for="t in [0, 50, 100]" :key="'gg' + t">
                <line :x1="PL" :x2="W - PR" :y1="yGc(t)" :y2="yGc(t)" class="grid" />
                <text :x="PL - 4" :y="yGc(t) + 3" class="tick" text-anchor="end">{{ t }}%</text>
              </g>
              <text v-for="t in curXTicks" :key="'gx' + t" :x="xCur(t)" :y="HS - 2" class="tick" text-anchor="middle">{{ fmtM(t) }}</text>
              <rect
                v-for="(s, k) in cur.steps"
                :key="'b' + k"
                :x="xCur(s.jobs) - barW / 2"
                :y="yGc(Math.min(100, s.gcShare))"
                :width="barW"
                :height="Math.max(0, yGc(0) - yGc(Math.min(100, s.gcShare)))"
                rx="1.5"
                :fill="COLORS[selected]"
                :opacity="hover && hover.chart === 'gc' && hover.k !== k ? 0.45 : 1"
              />
            </svg>
            <div v-if="hover && hover.chart === 'gc'" class="tip" :style="tipStyle">
              <div class="font-bold text-slate-900">{{ fmtInt(hover.s.jobs) }} việc</div>
              <div>GC chiếm {{ hover.s.gcShare }}% ({{ hover.s.gcMs }} ms)</div>
              <div>{{ hover.s.gcCount }} lần dọn, {{ hover.s.gcMajor }} lần dọn toàn bộ</div>
            </div>
          </div>
        </div>

        <!-- Lời kết của mức đang chọn -->
        <div class="text-[10.5px] text-slate-600 bg-platinum-50 rounded-2xl p-2.5 space-y-1 leading-snug">
          <div v-if="cur.status === 'oom'">
            <strong class="text-slate-900">✕ Hết bộ nhớ</strong> sau {{ (cur.wallMs / 1000).toFixed(1) }} s:
            giữ được tối đa <strong class="text-slate-900">{{ fmtInt(cur.maxJobsAlive) }}</strong> việc,
            sập khi nạp tới khoảng {{ fmtInt(cur.oomBeforeJobs) }}.
          </div>
          <div v-else-if="cur.status === 'done'">✓ Nạp đủ {{ fmtInt(cur.maxJobsAlive) }} việc mà chưa hết bộ nhớ.</div>
          <div v-else-if="cur.status === 'timeout'">⏱ Dừng vì quá thời gian (GC quá tải) ở {{ fmtInt(cur.maxJobsAlive) }} việc.</div>
          <div v-else>Dừng bất thường ở {{ fmtInt(cur.maxJobsAlive) }} việc.</div>
          <div>
            Mỗi việc tốn ~{{ cur.bytesPerJob }} byte (đối tượng gốc + con trỏ trong cây và bảng băm).
            Cuối đợt nạp chậm hơn lúc đầu <strong class="text-slate-900">×{{ cur.slowdownX }}</strong>;
            tra cứu {{ cur.lookupsAlwaysOk ? 'luôn đúng' : 'CÓ LỖI' }} tới phút cuối.
          </div>
          <div v-if="cur.fatal" class="font-mono text-[10px] text-slate-500 break-words" title="Dòng lỗi V8 in ra trước khi tiến trình bị kết thúc">
            {{ cur.fatal }}
          </div>
          <details v-if="cur.lastGcs && cur.lastGcs.length">
            <summary class="cursor-pointer text-slate-500">Các lần dọn rác cuối trước khi sập</summary>
            <table class="w-full font-mono text-[10px] mt-1">
              <tr v-for="(g, k) in cur.lastGcs" :key="'lg' + k">
                <td class="pr-1 text-slate-500">{{ (g.atMs / 1000).toFixed(1) }}s</td>
                <td class="pr-1">{{ g.kind === 'Scavenge' ? 'dọn nhanh' : 'dọn toàn bộ' }}</td>
                <td class="pr-1 text-right">{{ g.beforeMB }}→{{ g.afterMB }} MB</td>
                <td class="text-right">dừng {{ g.pauseMs }} ms</td>
              </tr>
            </table>
          </details>
        </div>
      </div>

      <!-- Bảng tóm tắt (bản dạng bảng của biểu đồ) -->
      <div class="overflow-x-auto">
        <table class="w-full text-[10.5px] font-mono">
          <thead>
            <tr class="text-slate-500 text-left">
              <th class="font-normal pr-1">Giới hạn</th>
              <th class="font-normal pr-1 text-right" title="Số việc lớn nhất còn sống trước khi hết bộ nhớ">Việc tối đa</th>
              <th class="font-normal pr-1 text-right">Byte/việc</th>
              <th class="font-normal pr-1 text-right" title="Số việc khi bộ nhớ chạm 80% giới hạn">80% tại</th>
              <th class="font-normal text-right" title="Số việc khi GC bắt đầu chiếm ≥ 50% thời gian (đã gần trần)">Nghẽn GC tại</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(r, i) in runs"
              :key="'t' + r.limitMB"
              class="cursor-pointer"
              :class="selected === i ? 'text-slate-900 font-bold' : 'text-slate-700'"
              @click="selected = i"
            >
              <td class="pr-1 whitespace-nowrap">
                <span class="inline-block w-2 h-2 rounded-full mr-1 align-middle" :style="{ background: COLORS[i] }"></span>{{ r.limitMB }} MB
              </td>
              <td class="pr-1 text-right">{{ fmtInt(r.maxJobsAlive) }}</td>
              <td class="pr-1 text-right">{{ r.bytesPerJob ?? '—' }}</td>
              <td class="pr-1 text-right">{{ r.warn80AtJobs ? fmtInt(r.warn80AtJobs) : '—' }}</td>
              <td class="text-right">{{ r.gcThrashAtJobs ? fmtInt(r.gcThrashAtJobs) : '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="text-[10px] text-slate-400 leading-snug">
        Đo lúc {{ when }} · Node {{ data.node }} · {{ data.cpu }}. Giới hạn là cờ <code>--max-old-space-size</code>; mỗi mức chạy một tiến trình riêng, lần lượt từng mức.
      </p>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';

// Bảng màu phân loại cố định (thứ tự không đổi theo dữ liệu): xanh dương, cam, xanh ngọc, vàng
const COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100'];

const W = 320, H = 170, HS = 92;
const PL = 30, PR = 8, PT = 8, PB = 22;

const state = ref('loading');
const data = ref(null);
const selected = ref(0);
const hover = ref(null);

async function load() {
  state.value = 'loading';
  try {
    const res = await fetch('/ram-sweep.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(String(res.status));
    const json = await res.json();
    if (!json || !Array.isArray(json.runs) || !json.runs.length) throw new Error('empty');
    data.value = json;
    selected.value = Math.min(selected.value, json.runs.length - 1);
    state.value = 'ready';
  } catch {
    state.value = 'missing';
  }
}
onMounted(load);

const runs = computed(() => (data.value ? data.value.runs.slice(0, COLORS.length) : []));
const cur = computed(() => runs.value[selected.value] || null);
const last = r => r.steps[r.steps.length - 1];

const when = computed(() => (data.value ? new Date(data.value.generatedAt).toLocaleString('vi-VN') : ''));

const fmtInt = n => (n == null ? '—' : Number(n).toLocaleString('vi-VN'));
const fmtM = n => (n >= 1e6 ? (n / 1e6).toFixed(n % 1e6 ? 1 : 0).replace('.', ',') + 'tr' : n >= 1e3 ? Math.round(n / 1e3) + 'k' : String(n));

function niceTicks(max, count) {
  if (!max) return [0];
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw);
  const out = [];
  for (let v = 0; v <= max + 1e-9; v += step) out.push(+v.toFixed(6));
  return out;
}

// ---- Biểu đồ chính ----
const maxJobs = computed(() => Math.max(1, ...runs.value.flatMap(r => r.steps.map(s => s.jobs))));
const xTicks = computed(() => niceTicks(maxJobs.value, 4));
const xJobs = j => PL + (j / maxJobs.value) * (W - PL - PR);
const yPct = p => PT + (1 - Math.min(p, 105) / 100) * (H - PT - PB);

function linePath(steps, f) {
  return steps.map((s, k) => `${k ? 'L' : 'M'}${xJobs(s.jobs).toFixed(1)},${yPct(f(s)).toFixed(1)}`).join('');
}

// ---- Biểu đồ chi tiết ----
const curMax = computed(() => (cur.value && cur.value.steps.length ? last(cur.value).jobs : 1));
const curXTicks = computed(() => niceTicks(curMax.value, 3));
const xCur = j => PL + (j / curMax.value) * (W - PL - PR);
const speedMax = computed(() => {
  const m = cur.value ? Math.max(...cur.value.steps.map(s => s.perJobUs)) : 1;
  const t = niceTicks(m, 3);
  return t[t.length - 1] < m ? t[t.length - 1] + (t[1] || 1) : t[t.length - 1] || 1;
});
const speedTicks = computed(() => niceTicks(speedMax.value, 3));
const ySpeed = v => PT + (1 - v / speedMax.value) * (HS - PT - PB + 10);
const yGc = v => PT + (1 - v / 100) * (HS - PT - PB + 10);
const barW = computed(() => {
  const n = cur.value ? cur.value.steps.length : 1;
  return Math.max(2, Math.min(10, (W - PL - PR) / n - 2));
});

function curPath(f, y) {
  if (!cur.value) return '';
  return cur.value.steps.map((s, k) => `${k ? 'L' : 'M'}${xCur(s.jobs).toFixed(1)},${y(f(s)).toFixed(1)}`).join('');
}

// ---- Lớp hover: chọn điểm gần con trỏ nhất ----
function onMove(ev, chart) {
  const svg = ev.currentTarget;
  const rect = svg.getBoundingClientRect();
  const vbH = chart === 'main' ? H : HS;
  const px = ((ev.clientX - rect.left) / rect.width) * W;
  const py = ((ev.clientY - rect.top) / rect.height) * vbH;
  const relX = ev.clientX - rect.left, relY = ev.clientY - rect.top;
  let best = null;
  if (chart === 'main') {
    runs.value.forEach((r, i) => {
      r.steps.forEach(s => {
        const x = xJobs(s.jobs), y = yPct(s.pctLimit);
        const d = (x - px) ** 2 + ((y - py) * 0.6) ** 2;
        if (!best || d < best.d) best = { d, x, y, i, s };
      });
    });
  } else if (cur.value) {
    cur.value.steps.forEach((s, k) => {
      const x = xCur(s.jobs);
      const d = Math.abs(x - px);
      if (!best || d < best.d) best = { d, x, y: chart === 'speed' ? ySpeed(s.perJobUs) : yGc(Math.min(100, s.gcShare)), s, k };
    });
  }
  hover.value = best ? { ...best, chart, relX, relY, w: rect.width } : null;
}

const tipStyle = computed(() => {
  if (!hover.value) return {};
  const left = hover.value.relX > hover.value.w / 2 ? hover.value.relX - 150 : hover.value.relX + 12;
  return { left: `${Math.max(0, left)}px`, top: `${Math.max(0, hover.value.relY - 10)}px` };
});
</script>

<style scoped>
.ram-viz .grid { stroke: #e7e5e0; stroke-width: 1; }
.ram-viz .warn { stroke: #94a3b8; stroke-width: 1; stroke-dasharray: 3 3; }
.ram-viz .cross { stroke: #94a3b8; stroke-width: 1; }
.ram-viz .tick { font-size: 8.5px; fill: #64748b; font-family: ui-monospace, monospace; }
.ram-viz .axis { font-size: 8.5px; fill: #64748b; }
.ram-viz .ring { fill: #ffffff; }
.ram-viz .ring-stroke { stroke: #ffffff; stroke-width: 2; }
.ram-viz .tip {
  position: absolute;
  z-index: 10;
  width: 146px;
  pointer-events: none;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 6px 8px;
  font-size: 10.5px;
  line-height: 1.35;
  color: #475569;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.08);
}
</style>
