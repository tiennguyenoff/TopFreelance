<template>
  <div class="h-full w-full font-sans @container">
    <div class="h-full w-full flex flex-col bg-white/95 backdrop-blur-xl border-l border-platinum-300 overflow-hidden text-xs">
      <!-- HUD Header -->
      <div class="px-4 py-3 bg-gradient-to-r from-champagne-100/70 via-white to-ice-100/60 border-b border-platinum-200 flex items-center justify-between gap-2 shrink-0">
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="shrink-0 w-8 h-8 rounded-xl bg-champagne-200/80 border border-champagne-300 flex items-center justify-center text-base shadow-2xs">
            🎨
          </div>
          <div class="min-w-0">
            <div class="font-extrabold text-slate-900 leading-tight text-sm flex items-center gap-2 min-w-0">
              <span class="truncate">Live Inspector Canvas</span>
              <span class="px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold border border-emerald-300">
                Action-Driven
              </span>
            </div>
            <div class="text-[10px] text-slate-500 font-mono truncate">
              Mọi thao tác trên web ➔ vẽ cấu trúc dữ liệu thật lên canvas
            </div>
          </div>
        </div>

        <div class="flex items-center gap-1.5 shrink-0">
          <button
            @click="clearData"
            title="Làm mới trạng thái về Standby"
            class="px-2.5 py-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-platinum-100 text-xs font-mono transition-colors"
          >
            ↺ Standby
          </button>
          <button
            @click="$emit('close')"
            title="Đóng Inspector (trả lại toàn màn hình)"
            class="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-platinum-100 flex items-center justify-center text-sm transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- Tab Switcher -->
      <div class="px-3 pt-2 pb-1 border-b border-platinum-100 flex gap-2 bg-platinum-50/70 shrink-0">
        <button
          @click="activeTab = 'simulator'"
          :class="[
            'flex-1 py-2 text-center rounded-xl font-bold transition-all text-xs flex items-center justify-center gap-1.5',
            activeTab === 'simulator'
              ? 'bg-white text-champagne-800 shadow-xs border border-platinum-200'
              : 'text-slate-500 hover:text-slate-800'
          ]"
        >
          <span class="truncate">🎬 Mô Phỏng Canvas</span>
          <span v-if="hasData" class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
        </button>
        <button
          @click="activeTab = 'telemetry'"
          :class="[
            'flex-1 py-2 text-center rounded-xl font-bold transition-all text-xs flex items-center justify-center gap-1.5',
            activeTab === 'telemetry'
              ? 'bg-white text-ice-800 shadow-xs border border-platinum-200'
              : 'text-slate-500 hover:text-slate-800'
          ]"
        >
          <span class="truncate">📊 RAM / CPU / Stress Test</span>
        </button>
      </div>

      <!-- HUD Content Body -->
      <div class="p-3 @lg:p-4 overflow-y-auto flex-1 min-h-0 space-y-4">
        
        <!-- ============================================================== -->
        <!-- TAB 1: SÂN KHẤU MÔ PHỎNG CANVAS THỜI GIAN THỰC                  -->
        <!-- ============================================================== -->
        <div v-if="activeTab === 'simulator'" class="space-y-3">
          <!-- Live Canvas Component (High-DPI Retina, 60 FPS) -->
          <LiveCanvasVisualizer @open-telemetry="activeTab = 'telemetry'" />
        </div>

        <!-- ============================================================== -->
        <!-- TAB 2: ĐO LƯỜNG TÀI NGUYÊN TELEMETRY                           -->
        <!-- ============================================================== -->
        <div v-else class="space-y-4">
          
          <!-- RAM Heap Meter -->
          <div class="p-4 rounded-3xl bg-white border border-platinum-200 space-y-2.5 shadow-2xs">
            <div class="flex justify-between items-center font-bold">
              <span class="text-slate-700">Bộ Nhớ RAM Heap V8</span>
              <span class="font-mono text-emerald-600 text-sm font-black">{{ liveTelemetry.heapMb }} MB</span>
            </div>
            <div class="w-full bg-platinum-100 rounded-full h-2.5 overflow-hidden">
              <div
                class="bg-gradient-to-r from-emerald-500 to-ice-500 h-full rounded-full transition-all duration-300"
                :style="{ width: `${Math.min(100, (liveTelemetry.heapMb / 1024) * 100)}%` }"
              ></div>
            </div>
            <div class="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>0 MB</span>
              <span class="text-emerald-700 font-bold">Chiếm ~{{ heapPercent }}% ngân sách khống chế (1024 MB)</span>
              <span>1024 MB</span>
            </div>
          </div>

          <!-- Latency & Throughput -->
          <div class="p-4 rounded-3xl bg-white border border-platinum-200 space-y-2 font-mono text-xs shadow-2xs">
            <div class="flex justify-between">
              <span class="text-slate-500">Độ Trễ Thao Tác Gần Nhất:</span>
              <strong class="text-amber-600 font-bold">{{ liveTelemetry.durationFormatted }}</strong>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">Thông lượng kiểm thử tải:</span>
              <strong class="text-slate-800">{{ liveTelemetry.throughputOps ? liveTelemetry.throughputOps.toLocaleString() + ' ops/s' : '—' }}</strong>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">Bảo Toàn 7 Bất Biến Dữ Liệu:</span>
              <strong v-if="invariantErrors === null" class="text-slate-400 font-bold">Chưa chạy kiểm thử</strong>
              <strong v-else-if="invariantErrors === 0" class="text-emerald-600 font-bold">✓ 0 vi phạm</strong>
              <strong v-else class="text-rose-600 font-bold">✗ {{ invariantErrors }} vi phạm</strong>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">Nguyên Lý Kiến Trúc:</span>
              <span class="text-champagne-800 font-bold">Single Source of Truth (100k Jobs)</span>
            </div>
          </div>

          <!-- Nguồn đo RAM: nói rõ đo thật hay không -->
          <div class="text-[10px] font-mono text-slate-500 px-1" data-testid="ram-source">RAM: {{ ramSourceLabel }}</div>

          <!-- Trigger button -->
          <button
            @click="triggerStressTest"
            :disabled="isTesting || isCleaning"
            class="w-full py-3.5 rounded-2xl text-xs font-bold text-slate-900 bg-gradient-to-r from-champagne-400 via-champagne-300 to-ice-300 hover:shadow-md transition-all active:scale-95 disabled:opacity-50 shadow-sm"
            data-testid="stress-run"
          >
            {{ isTesting ? 'Đang chạy 100.000 thao tác trên lõi thật (bản riêng)...' : '⚡ Khởi Chạy Stress Test 100.000 Tác Vụ trên lõi thật' }}
          </button>

          <!-- 7 bất biến, mỗi cái báo riêng -->
          <div v-if="stressResult" class="p-3 rounded-2xl bg-white border border-platinum-200 space-y-1.5 text-[11px] font-mono shadow-2xs" data-testid="stress-invariants">
            <div class="font-bold text-slate-700">
              Lô {{ stressResult.batchId }} · {{ stressResult.jobCount.toLocaleString() }} việc · {{ stressResult.totalActions.toLocaleString() }} thao tác
              <span v-if="stressResult.cancelled" class="text-amber-600">(đã hủy giữa chừng)</span>
            </div>
            <div v-for="inv in stressResult.invariants" :key="inv.id" class="flex gap-1.5 items-start">
              <span :class="inv.ok ? 'text-emerald-600' : 'text-rose-600'" class="font-bold shrink-0">{{ inv.ok ? '✓' : '✗' }}</span>
              <span class="text-slate-700">{{ inv.label }} <span class="text-slate-400">— {{ inv.violations }} vi phạm · {{ inv.detail }}</span></span>
            </div>
            <div class="text-slate-400 pt-1">Dữ liệu sinh ra mang mã lô và không bao giờ ghi vào CSDL; chạy trên bản lõi riêng, lõi đang dùng không bị chạm.</div>
          </div>

          <!-- Dọn dữ liệu kiểm thử -->
          <div v-if="stressResult || cleanupResult" class="space-y-2">
            <button
              @click="requestCleanup"
              :disabled="isTesting || isCleaning || !stressResult"
              class="w-full py-2.5 rounded-2xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 transition-all active:scale-95 disabled:opacity-40"
              data-testid="stress-cleanup"
            >{{ isTesting ? 'Đang chạy — chưa dọn được' : '🧹 Dọn dữ liệu kiểm thử' }}</button>
            <div v-if="confirmingCleanup" class="p-3 rounded-2xl border border-amber-300 bg-amber-50 text-[11px] text-amber-900 space-y-2" role="alertdialog">
              <div>Hủy bản lõi kiểm thử cùng mọi bộ nhớ đệm, bộ đếm và số liệu đã hiển thị, rồi chụp lại lõi đang dùng để so với lúc trước khi chạy. Dữ liệu thật (việc, hồ sơ, ví, ký quỹ) không bị xóa. Tiếp tục?</div>
              <div class="flex gap-2">
                <button class="px-3 py-1.5 rounded-xl bg-slate-900 text-white font-bold" data-testid="cleanup-confirm" @click="doCleanup">Dọn ngay</button>
                <button class="px-3 py-1.5 rounded-xl border border-slate-300 font-bold" @click="confirmingCleanup = false">Hủy</button>
              </div>
            </div>
            <div v-if="cleanupResult" class="p-3 rounded-2xl border text-[11px] font-mono" :class="cleanupResult.match ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-rose-300 bg-rose-50 text-rose-800'" data-testid="cleanup-result">
              <div class="font-bold">{{ cleanupResult.match ? '✓ Đã dọn: lõi đang dùng ' + cleanupResult.summary + ' so với trước khi chạy' : '✗ Sau dọn ' + cleanupResult.summary }}</div>
              <ul v-if="!cleanupResult.match" class="list-disc pl-4 mt-1"><li v-for="(df, i) in cleanupResult.diffs.slice(0, 8)" :key="i">{{ df }}</li></ul>
              <div v-if="cleanupResult.match" class="opacity-80">Còn {{ cleanupResult.jobCount.toLocaleString() }} việc trong lõi đang dùng.</div>
            </div>
          </div>

          <!-- Thử RAM cực hạn CHẠY THẬT: trên trang này hoặc tiến trình Node tới OOM -->
          <LiveRamTest @heap="mb => (liveTelemetry.heapMb = mb)" />

          <!-- Thử RAM trên LÕI THẬT bằng Node (đo thật process.memoryUsage, trần 1024 MB) -->
          <CoreRamPanel />

          <!-- Kết quả đo đã lưu (npm run test:ram, 4 mức RAM) -->
          <RamLimitChart />
        </div>

      </div>

      <!-- HUD Footer -->
      <div class="px-4 py-2.5 bg-platinum-50 border-t border-platinum-200 text-[10.5px] text-slate-500 flex flex-wrap gap-x-3 justify-between items-center font-mono shrink-0">
        <span>Ràng buộc: 1 Core CPU • &le; 1GB RAM</span>
        <span class="text-champagne-800 font-bold">Canvas Tự Động Vẽ Theo Thao Tác Thật</span>
      </div>

    </div>

  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import LiveCanvasVisualizer from './LiveCanvasVisualizer.vue';
import RamLimitChart from '../../stress-test/views/RamLimitChart.vue';
import LiveRamTest from '../../stress-test/views/LiveRamTest.vue';
import { DSAActionBridge } from '../controllers/DSAActionBridge.js';
import CoreRamPanel from '../../stress-test/views/CoreRamPanel.vue';
import { StressTestEngine } from '../../stress-test/controllers/StressTestEngine.js';
import { StressSession, readHeap } from '../../stress-test/controllers/StressSandbox.js';
import { MarketplaceEngine } from '../../marketplace-hub/controllers/MarketplaceEngine.js';
import { authStore } from '../../auth/controllers/AuthStore.js';

defineEmits(['close']);
const activeTab = ref('simulator');

function readHeapMb() {
  const m = typeof performance !== 'undefined' && performance.memory;
  return m ? Number((m.usedJSHeapSize / 1048576).toFixed(1)) : null;
}

// Phiên kiểm thử: bảo vệ lõi đang dùng (chụp trước/sau), ví thật đưa vào snapshot
const session = new StressSession({
  realEngine: MarketplaceEngine,
  walletsProvider: () => Object.values(authStore.state.users).map((u) => ({ id: u.id, balance: u.walletBalance }))
});
const stressResult = ref(null);
const cleanupResult = ref(null);
const confirmingCleanup = ref(false);
const isCleaning = ref(false);
const ramSourceLabel = ref(readHeap().label);

const liveTelemetry = ref({
  heapMb: readHeapMb() ?? 0,
  durationFormatted: '—',
  throughputOps: 0
});
const invariantErrors = ref(null); // null = chưa chạy kiểm thử tải
const isTesting = ref(false);

const heapPercent = computed(() => ((liveTelemetry.value.heapMb / 1024) * 100).toFixed(1));

// Độ trễ & RAM cập nhật theo mỗi thao tác thật được gửi sang Live Inspector
watch(() => DSAActionBridge.state.activeAction, (act) => {
  if (!act) return;
  const lat = act.data && act.data.latency;
  if (lat) liveTelemetry.value.durationFormatted = lat;
  const heap = readHeapMb();
  if (heap !== null) liveTelemetry.value.heapMb = heap;
});

const hasData = computed(() => !!DSAActionBridge.state.activeAction);

function clearData() {
  DSAActionBridge.clearAction();
}

function triggerStressTest() {
  if (isTesting.value || isCleaning.value) return;
  isTesting.value = true;
  cleanupResult.value = null;
  confirmingCleanup.value = false;
  activeTab.value = 'simulator'; // Switch to canvas to view high-speed stress simulation

  // setTimeout để nút kịp chuyển sang "đang chạy" trước khi luồng chính bận
  setTimeout(() => {
    try {
      // 100.000 việc + 100.000 thao tác (cùng quy mô lệnh CLI). keepAlive: giữ bản lõi riêng để dọn bằng nút.
      const res = StressTestEngine.run({ jobCount: 100000, actionCount: 100000, session, keepAlive: true });
      stressResult.value = res;
      ramSourceLabel.value = res.ramLabel;
      liveTelemetry.value.durationFormatted = res.durationFormatted;
      liveTelemetry.value.throughputOps = res.throughputOps;
      if (res.peakRamMb) liveTelemetry.value.heapMb = res.peakRamMb;
      invariantErrors.value = res.invariantErrors;

      // Canvas vẽ theo SỐ THẬT của lõi (từng loại thao tác, AVL, hàng đợi, bảng băm)
      DSAActionBridge.dispatchStressTest({
        totalActions: res.totalActions,
        durationMs: res.durationMs,
        throughput: res.throughputOps,
        errors: res.invariantErrors,
        breakdown: res.breakdown,
        byOp: res.byOp,
        core: res.core,
        invariants: res.invariants,
        ramLabel: res.ramLabel,
        latency: res.durationFormatted
      });
    } finally {
      isTesting.value = false;
    }
  }, 100);
}

function requestCleanup() {
  if (isTesting.value || isCleaning.value) return; // khóa khi đang chạy
  confirmingCleanup.value = true;
}

function doCleanup() {
  if (isTesting.value) return;
  isCleaning.value = true;
  confirmingCleanup.value = false;
  try {
    const r = session.cleanup();
    cleanupResult.value = r;
    if (r.ok) {
      // Xóa số liệu hiển thị của lần chạy: kết quả, telemetry, hình vẽ
      stressResult.value = null;
      invariantErrors.value = null;
      liveTelemetry.value.durationFormatted = '—';
      liveTelemetry.value.throughputOps = 0;
      const h = readHeap();
      liveTelemetry.value.heapMb = h.mb === null ? 0 : Number(h.mb.toFixed(1));
      ramSourceLabel.value = h.label;
      DSAActionBridge.clearAction();
    }
  } finally {
    isCleaning.value = false;
  }
}

function showSimulator() {
  activeTab.value = 'simulator';
}

defineExpose({ showSimulator });
</script>
