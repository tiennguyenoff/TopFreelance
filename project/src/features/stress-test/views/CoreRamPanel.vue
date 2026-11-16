<template>
  <div class="p-4 rounded-3xl bg-white border border-platinum-200 shadow-2xs space-y-3" data-testid="core-ram-panel">
    <div>
      <h3 class="font-bold text-slate-800 text-sm">Thử RAM trên lõi thật · trần 1024 MB (Node)</h3>
      <p class="text-[10.5px] text-slate-500 leading-snug">
        Nạp từng đợt 250.000 việc vào bản lõi riêng (AVL + bảng băm + mảng ngân sách + Queue + Stack) và chạy một đợt thao tác sau mỗi bậc.
        Con số đo <b>thật tại Node</b> (process.memoryUsage), không phải ước tính của trình duyệt. Dừng an toàn ở ~88% trần, hủy được bất kỳ lúc nào.
        Trần 1024 MB chỉ dùng cho bài thử này; vận hành thường ngày và <code>npm run test:stress</code> vẫn giữ 512 MB.
      </p>
    </div>

    <div class="flex items-center gap-2 flex-wrap">
      <button v-if="!running" class="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-slate-900 text-white hover:bg-slate-700" data-testid="core-ram-start" @click="start">▶ Chạy thử RAM lõi thật</button>
      <button v-else class="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-rose-600 text-white hover:bg-rose-500" data-testid="core-ram-cancel" @click="cancel">■ Hủy (dừng an toàn)</button>
      <span class="text-[10.5px] text-slate-500">{{ status }}</span>
    </div>

    <div v-if="steps.length" class="font-mono text-[10.5px] space-y-1">
      <div class="text-slate-500">Nguồn: <b>đo thật tại Node</b> · trần {{ limitMb }} MB · dừng ở {{ stopAtMb }} MB</div>
      <div class="w-full bg-platinum-100 rounded-full h-2.5 overflow-hidden">
        <div class="h-full rounded-full" :style="{ width: Math.min(100, last.pctLimit) + '%', background: last.pctLimit > 80 ? '#eb6834' : '#2a78d6' }"></div>
      </div>
      <table class="w-full text-left">
        <thead class="text-slate-400"><tr><th>Bậc</th><th>Việc</th><th>Old-space</th><th>RSS</th><th>Nạp</th><th>Thao tác/s</th></tr></thead>
        <tbody>
          <tr v-for="s in steps.slice(-8)" :key="s.step">
            <td>{{ s.step }}</td><td>{{ s.jobs.toLocaleString() }}</td><td>{{ s.oldMB }} MB ({{ s.pctLimit }}%)</td><td>{{ s.rssMB }}</td><td>{{ s.loadMs }} ms</td><td>{{ s.opsPerSec.toLocaleString() }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="done" class="text-[11px] rounded-xl px-3 py-2" :class="done.violations ? 'bg-rose-50 text-rose-800' : 'bg-emerald-50 text-emerald-800'" data-testid="core-ram-done">
      <b>{{ reasonText }}</b> — {{ done.jobs.toLocaleString() }} việc, đỉnh {{ done.peakOldMB }} MB = {{ done.pctLimit }}% trần {{ done.limitMB }} MB.
      Sau dọn: {{ done.afterCleanOldMB }} MB (nền {{ done.baseMB }} MB). Vi phạm bất biến: {{ done.violations }}. Nguồn: đo thật tại Node.
    </div>
    <div v-if="error" class="text-[11px] text-rose-700">{{ error }}</div>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount } from 'vue';

const running = ref(false);
const steps = ref([]);
const done = ref(null);
const error = ref('');
const status = ref('');
const limitMb = ref(1024);
const stopAtMb = ref(901);
let es = null;

const last = computed(() => steps.value[steps.value.length - 1] || { pctLimit: 0 });
const reasonText = computed(() => ({
  'safe-stop': 'Dừng an toàn ở ngưỡng',
  cancelled: 'Đã hủy theo yêu cầu',
  invariant: 'Dừng vì có vi phạm bất biến',
  'max-steps': 'Hết số bậc tối đa'
}[done.value && done.value.reason] || 'Kết thúc'));

function close() { if (es) { es.close(); es = null; } }

function start() {
  if (running.value) return;
  steps.value = []; done.value = null; error.value = '';
  running.value = true;
  status.value = 'Đang khởi động tiến trình Node...';
  es = new EventSource('/api/ramtest/core');
  es.addEventListener('start', (e) => { const o = JSON.parse(e.data); limitMb.value = o.limitMB; stopAtMb.value = o.stopAtMB; status.value = 'Đang nạp từng bậc...'; });
  es.addEventListener('step', (e) => { steps.value.push(JSON.parse(e.data)); });
  es.addEventListener('done', (e) => { done.value = JSON.parse(e.data); status.value = 'Xong.'; });
  es.addEventListener('stderr', (e) => { const o = JSON.parse(e.data); if (/out of memory/i.test(o.line)) error.value = 'Node báo hết bộ nhớ: ' + o.line; });
  es.addEventListener('exit', () => { running.value = false; close(); });
  es.onerror = () => {
    if (running.value) {
      running.value = false;
      status.value = '';
      if (!done.value) error.value = 'Mất kết nối tới máy chủ (chỉ chạy được khi mở trang bằng npm run dev).';
    }
    close();
  };
}

async function cancel() {
  status.value = 'Đã gửi lệnh hủy, đợi tiến trình dừng an toàn...';
  try { await fetch('/api/ramtest/cancel', { method: 'POST' }); } catch { /* bỏ qua */ }
}

onBeforeUnmount(close);
</script>
