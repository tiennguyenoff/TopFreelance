<template>
  <div class="w-full flex flex-col space-y-10 pb-24 relative overflow-x-hidden font-sans">

    <!-- ===================================================================== -->
    <!-- 1. HEADER (nội dung đổi theo vai trò)                                  -->
    <!-- ===================================================================== -->
    <div class="p-6 @2xl:p-8 rounded-3xl bg-white/90 backdrop-blur-md border border-platinum-200/90 shadow-xs flex flex-col @3xl:flex-row @3xl:items-center justify-between gap-6">
      <div class="min-w-0">
        <h1 class="text-2xl @2xl:text-4xl font-black text-slate-900 tracking-tight">
          {{ isBiz ? 'Ví & Thanh Toán' : 'Đơn Ứng Tuyển & Thu Nhập' }}
        </h1>
        <p class="text-xs @2xl:text-sm text-slate-500 mt-1.5 max-w-3xl leading-relaxed">
          <template v-if="isBiz">
            Khi đăng tin, ngân sách được <strong>giữ an toàn</strong> (ký quỹ) cho tới khi bạn duyệt thanh toán cho freelancer.
            Đơn nộp trước được xử lý trước.
          </template>
          <template v-else>
            Theo dõi các đơn bạn đã nộp. Bạn có thể <strong>rút bất kỳ đơn nào</strong> khi nhà tuyển dụng chưa duyệt thanh toán.
          </template>
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <div
          @click="authStore.openAuthModal()"
          class="cursor-pointer px-4 py-2.5 rounded-2xl bg-platinum-50 hover:bg-white border border-platinum-200 hover:border-champagne-300 transition-all flex items-center gap-2.5 shadow-2xs group"
          title="Bấm để chuyển đổi vai trò"
        >
          <span class="text-xl group-hover:scale-110 transition-transform">{{ authStore.currentUser.avatar }}</span>
          <div class="text-left leading-tight">
            <div class="text-xs font-black text-slate-900">{{ authStore.currentUser.name }}</div>
            <div :class="['text-[10px] font-bold', isBiz ? 'text-champagne-700' : 'text-ice-700']">
              {{ isBiz ? 'Nhà tuyển dụng' : 'Freelancer' }} ⇄
            </div>
          </div>
        </div>

        <button
          v-if="isBiz"
          @click="$emit('postJob')"
          class="px-5 py-2.5 rounded-2xl text-xs font-bold bg-gradient-to-r from-champagne-400 to-champagne-300 text-slate-900 hover:brightness-105 transition-all active:scale-95 shadow-xs whitespace-nowrap"
        >
          + Đăng Tin Mới
        </button>
        <button
          @click="$emit('viewMarketplace')"
          class="px-5 py-2.5 rounded-2xl text-xs font-bold bg-white hover:bg-platinum-100 border border-platinum-200 text-slate-700 transition-all active:scale-95 shadow-xs flex items-center gap-1.5 whitespace-nowrap"
        >
          <span>Tìm Việc</span>
          <span>&rarr;</span>
        </button>
      </div>
    </div>

    <!-- ===================================================================== -->
    <!-- 2. BỐN THẺ TÀI CHÍNH                                                    -->
    <!-- ===================================================================== -->
    <div class="grid grid-cols-1 @2xl:grid-cols-2 @5xl:grid-cols-4 gap-5">
      <div class="p-6 rounded-3xl bg-white/95 border border-platinum-200/90 shadow-xs space-y-3 min-w-0">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-bold text-slate-500 uppercase truncate">{{ isBiz ? 'Số dư khả dụng' : 'Thu nhập đã nhận' }}</span>
          <span class="shrink-0 w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm">💵</span>
        </div>
        <div class="text-2xl @2xl:text-3xl font-black text-emerald-700 font-mono tracking-tight break-all">
          ${{ fmt(authStore.currentUser.walletBalance) }}
        </div>
        <p class="text-[11px] text-slate-500 leading-snug">
          {{ isBiz ? 'Dùng để ký quỹ cho tin tuyển dụng mới.' : 'Tăng mỗi khi nhà tuyển dụng duyệt thanh toán cho bạn.' }}
        </p>
      </div>

      <div class="p-6 rounded-3xl bg-white/95 border border-platinum-200/90 shadow-xs space-y-3 min-w-0">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-bold text-slate-500 uppercase truncate">{{ isBiz ? 'Đang ký quỹ' : 'Đang chờ thanh toán' }}</span>
          <span class="shrink-0 w-8 h-8 rounded-xl bg-champagne-100 text-champagne-800 flex items-center justify-center font-bold text-sm">🛡</span>
        </div>
        <div class="text-2xl @2xl:text-3xl font-black text-champagne-700 font-mono tracking-tight break-all">
          ${{ fmt(isBiz ? escrowLockedBiz : pendingForMe) }}
        </div>
        <p class="text-[11px] text-slate-500 leading-snug">
          <template v-if="isBiz">Tiền đã giữ cho {{ postedJobs.length }} tin bạn đăng, chưa thanh toán.</template>
          <template v-else>Tổng mức giá các đơn đang chờ duyệt.</template>
        </p>
      </div>

      <div class="p-6 rounded-3xl bg-white/95 border border-platinum-200/90 shadow-xs space-y-3 min-w-0">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-bold text-slate-500 uppercase truncate">{{ isBiz ? 'Tin đã đăng' : 'Đơn đã nộp' }}</span>
          <span class="shrink-0 w-8 h-8 rounded-xl bg-ice-50 text-ice-700 flex items-center justify-center font-bold text-sm">{{ isBiz ? '📢' : '📄' }}</span>
        </div>
        <div class="text-2xl @2xl:text-3xl font-black text-ice-700 font-mono tracking-tight">
          {{ isBiz ? postedJobs.length : appliedJobsList.length }}
        </div>
        <p class="text-[11px] text-slate-500 leading-snug">
          {{ isBiz ? 'Tin tuyển dụng do tài khoản này đăng.' : `${paidCount} đơn đã được thanh toán.` }}
        </p>
      </div>

      <div class="p-6 rounded-3xl bg-white/95 border border-platinum-200/90 shadow-xs space-y-3 min-w-0">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-bold text-slate-500 uppercase truncate">{{ isBiz ? 'Đơn chờ duyệt' : 'Thứ tự xét duyệt' }}</span>
          <span class="shrink-0 w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-sm">⚖</span>
        </div>
        <div class="text-2xl @2xl:text-3xl font-black text-slate-900 font-mono">{{ payoutQueue.length }}</div>
        <p class="text-[11px] text-slate-500 leading-snug" title="Hàng đợi FIFO (Lab 3): enqueue ở cuối, dequeue ở đầu — O(1)">
          Ai nộp trước được duyệt thanh toán trước.
        </p>
      </div>
    </div>

    <!-- ===================================================================== -->
    <!-- 3. HAI CỘT                                                             -->
    <!-- ===================================================================== -->
    <div class="grid grid-cols-1 @5xl:grid-cols-12 gap-8 items-start">

      <!-- CỘT TRÁI -->
      <div class="@5xl:col-span-7 space-y-6 min-w-0">

        <!-- ===== FREELANCER: đơn đã nộp ===== -->
        <div v-if="!isBiz" class="p-6 @2xl:p-8 rounded-3xl bg-white/95 border border-platinum-200/90 shadow-xs space-y-6">
          <div class="border-b border-platinum-100 pb-4">
            <h2 class="text-lg font-black text-slate-900 tracking-tight">Đơn Ứng Tuyển Của Bạn</h2>
            <p class="text-xs text-slate-500 mt-1">Rút đơn sẽ xóa hồ sơ khỏi danh sách của nhà tuyển dụng và trả lại chỗ trống cho người khác.</p>
            <p v-if="appliedJobsList.length > 1" class="text-[11px] text-slate-400 mt-1">Xếp theo thứ tự nộp: đơn cũ nhất ở trên cùng.</p>
          </div>

          <div v-if="appliedJobsList.length === 0" class="py-14 text-center space-y-3">
            <div class="w-14 h-14 rounded-2xl bg-platinum-100 text-slate-400 mx-auto flex items-center justify-center text-2xl">📭</div>
            <h3 class="text-sm font-bold text-slate-700">Bạn chưa nộp đơn nào</h3>
            <p class="text-xs text-slate-400 max-w-sm mx-auto">Tìm một công việc phù hợp và gửi hồ sơ của bạn.</p>
            <button
              @click="$emit('viewMarketplace')"
              class="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-900 bg-gradient-to-r from-champagne-400 to-champagne-300 hover:brightness-105 transition-all"
            >
              Xem Việc Làm &rarr;
            </button>
          </div>

          <div v-else class="space-y-4">
            <div
              v-for="job in appliedJobsList"
              :key="job.id"
              class="p-5 rounded-2xl bg-[#FAF8F5] border border-platinum-200 hover:border-ice-300 transition-all"
              title="Mỗi đơn là một nút của danh sách liên kết đôi (Lab 2): rút đơn ở giữa chỉ nối lại prev/next — O(1)"
            >
              <div class="flex flex-col @2xl:flex-row @2xl:items-center justify-between gap-3">
                <div class="space-y-1.5 min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <span
                      v-if="paidJobIds.has(job.id)"
                      class="text-[10.5px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 font-bold"
                    >✓ Đã thanh toán</span>
                    <span v-else class="text-[10.5px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 font-bold">⏳ Chờ duyệt</span>
                    <span class="text-sm font-bold text-slate-900">{{ job.title }}</span>
                  </div>
                  <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                    <span class="text-champagne-700 font-bold">{{ categoryIcon(job) }} {{ skillLabel(job.skillTag) }}</span>
                    <span v-if="bidOf(job) != null">Giá bạn đề xuất: <strong class="text-slate-700">${{ fmt(bidOf(job)) }}</strong></span>
                    <span>Ngân sách: ${{ fmt(job.budget) }}</span>
                    <span>Thời hạn: {{ job.deadlineDays }} ngày</span>
                  </div>
                </div>
                <template v-if="!paidJobIds.has(job.id)">
                  <div v-if="confirmId === job.id" class="flex items-center gap-2 self-start @2xl:self-auto">
                    <span class="text-[11px] text-slate-500">Rút đơn này?</span>
                    <button
                      @click="confirmWithdraw(job)"
                      class="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-all active:scale-95"
                    >Rút</button>
                    <button
                      @click="confirmId = null"
                      class="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 bg-white border border-platinum-200 hover:bg-platinum-50"
                    >Giữ lại</button>
                  </div>
                  <button
                    v-else
                    @click="confirmId = job.id"
                    class="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all active:scale-95 self-start @2xl:self-auto whitespace-nowrap"
                  >
                    ✕ Rút đơn
                  </button>
                </template>
              </div>
            </div>
          </div>
        </div>

        <!-- ===== DOANH NGHIỆP: các tin đã đăng ===== -->
        <div v-else class="p-6 @2xl:p-8 rounded-3xl bg-white/95 border border-platinum-200/90 shadow-xs space-y-6">
          <div class="border-b border-platinum-100 pb-4">
            <h2 class="text-lg font-black text-slate-900 tracking-tight">Tin Tuyển Dụng Của Bạn</h2>
            <p class="text-xs text-slate-500 mt-1">Số tiền ký quỹ của mỗi tin giảm dần khi bạn duyệt thanh toán.</p>
          </div>

          <div v-if="postedJobs.length === 0" class="py-14 text-center space-y-3">
            <div class="w-14 h-14 rounded-2xl bg-platinum-100 text-slate-400 mx-auto flex items-center justify-center text-2xl">📢</div>
            <h3 class="text-sm font-bold text-slate-700">Bạn chưa đăng tin nào</h3>
            <p class="text-xs text-slate-400 max-w-sm mx-auto">Đăng tin đầu tiên để nhận hồ sơ từ freelancer.</p>
            <button
              @click="$emit('postJob')"
              class="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-900 bg-gradient-to-r from-champagne-400 to-champagne-300 hover:brightness-105 transition-all"
            >
              Đăng Tin Ngay &rarr;
            </button>
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="job in postedJobs"
              :key="job.id"
              class="p-4 rounded-2xl bg-[#FAF8F5] border border-platinum-200 flex flex-col @2xl:flex-row @2xl:items-center justify-between gap-3"
            >
              <div class="min-w-0 space-y-1">
                <div class="text-sm font-bold text-slate-900">{{ job.title }}</div>
                <div class="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
                  <span class="text-champagne-700 font-bold">{{ categoryIcon(job) }} {{ skillLabel(job.skillTag) }}</span>
                  <span>Đã nhận: <strong>{{ job.hiredCount }}/{{ job.slots }}</strong> người</span>
                  <span>Ngân sách: ${{ fmt(job.budget) }}</span>
                </div>
              </div>
              <div class="text-left @2xl:text-right shrink-0">
                <div class="text-sm font-black text-champagne-700 font-mono">${{ fmt(job.escrowBalance) }}</div>
                <div class="text-[10px] text-slate-400">còn ký quỹ</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- CỘT PHẢI: đơn chờ thanh toán -->
      <div class="@5xl:col-span-5 space-y-6 min-w-0">
        <div class="p-6 @2xl:p-7 rounded-3xl bg-white/95 border border-platinum-200/90 shadow-xs space-y-5">
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-platinum-100 pb-3">
            <div class="min-w-0">
              <h3 class="text-base font-black text-slate-900 tracking-tight">{{ isBiz ? 'Đơn Chờ Thanh Toán' : 'Lượt Xét Duyệt' }}</h3>
              <p class="text-[11px] text-slate-500 mt-0.5" title="Hàng đợi FIFO (Lab 3): vào ở cuối, ra ở đầu">Xử lý theo thứ tự nộp đơn.</p>
            </div>
            <span class="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 whitespace-nowrap">
              {{ payoutQueue.length }} đơn
            </span>
          </div>

          <div v-if="payoutQueue.length > 0">
            <button
              v-if="isBiz"
              @click="releaseFirstPayout"
              class="w-full py-3.5 rounded-2xl text-xs @2xl:text-sm font-black text-slate-900 bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-300 hover:brightness-105 active:scale-95 shadow-md transition-all flex items-center justify-center gap-2"
              title="Dequeue vé đầu hàng đợi O(1) → trừ ký quỹ của tin → cộng ví freelancer"
            >
              ✓ Duyệt & Thanh Toán Đơn Đầu Tiên
            </button>
            <div v-else class="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 leading-snug">
              ⏳ Nhà tuyển dụng sẽ duyệt đơn của bạn theo thứ tự nộp. Tiền được chuyển vào ví ngay khi duyệt.
            </div>
            <p v-if="isBiz" class="text-[10.5px] text-slate-400 text-center mt-2">
              Tài khoản demo này duyệt thay chủ của các tin mẫu trên sàn.
            </p>
          </div>

          <div v-if="payoutQueue.length === 0" class="p-8 text-center rounded-2xl bg-[#FAF8F5] border border-platinum-200 space-y-2 text-xs text-slate-400">
            <div class="text-2xl">⏳</div>
            <p>Chưa có đơn nào chờ thanh toán.</p>
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="(ticket, qIdx) in payoutQueue"
              :key="ticket.id || ticket.ticketId"
              :class="[
                'p-4 rounded-2xl border transition-all flex items-center justify-between gap-3',
                qIdx === 0 ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-400/20' : 'bg-[#FAF8F5] border-platinum-200'
              ]"
            >
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <span :class="['text-[10px] px-2 py-0.5 rounded-md font-bold', qIdx === 0 ? 'bg-emerald-600 text-white' : 'bg-platinum-200 text-slate-700']">
                    {{ qIdx === 0 ? 'Tiếp theo' : `Thứ ${qIdx + 1}` }}
                  </span>
                  <span class="text-xs font-semibold text-slate-800 truncate">{{ ticket.jobTitle || ticket.job?.title || 'Dự án' }}</span>
                </div>
                <div class="text-[11px] text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                  <span>{{ freelancerName(ticket.freelancerId) }}</span>
                  <button
                    v-if="isBiz && ticket.freelancerId"
                    @click="$emit('viewProfile', ticket.freelancerId)"
                    class="text-ice-700 font-bold hover:underline"
                  >Xem hồ sơ</button>
                </div>
              </div>
              <div class="text-right shrink-0">
                <div class="text-sm font-black text-emerald-700 font-mono">${{ fmt(ticket.amount) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { authStore } from '../../auth/controllers/AuthStore.js';
import { skillLabel, CATEGORY_BY_ID } from '../../job-catalog/models/JobCatalog.js';
import confetti from 'canvas-confetti';

const props = defineProps({
  appliedJobsList: { type: Array, default: () => [] },
  paidJobIds: { type: Set, default: () => new Set() },
  postedJobs: { type: Array, default: () => [] },
  payoutQueue: { type: Array, default: () => [] },
  jobsVersion: { type: Number, default: 0 }
});

const emit = defineEmits(['withdrawProposal', 'releasePayout', 'viewMarketplace', 'postJob', 'viewProfile']);

const isBiz = computed(() => authStore.state.currentRole === 'business');
const confirmId = ref(null);

const fmt = (n) => (Number(n) || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
const categoryIcon = (job) => CATEGORY_BY_ID[job.category]?.icon || '💼';

function freelancerName(id) {
  const u = Object.values(authStore.state.users).find(x => x.id === id);
  return u ? u.name : (id || 'Freelancer');
}

// Mức giá đề xuất = số tiền trên vé chờ thanh toán của đơn
const bidByJob = computed(() => {
  const m = new Map();
  for (const t of props.payoutQueue) m.set(t.jobId, t.amount);
  return m;
});
const bidOf = (job) => bidByJob.value.get(job.id) ?? null;

const paidCount = computed(() => props.appliedJobsList.filter(j => props.paidJobIds.has(j.id)).length);

const escrowLockedBiz = computed(() => {
  props.jobsVersion;
  return props.postedJobs.reduce((acc, j) => acc + (Number(j.escrowBalance) || 0), 0);
});

const pendingForMe = computed(() => {
  const me = authStore.state.users.freelancer.id;
  return props.payoutQueue
    .filter(t => !t.freelancerId || t.freelancerId === me)
    .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
});

function confirmWithdraw(job) {
  confirmId.value = null;
  emit('withdrawProposal', job);
}

function releaseFirstPayout() {
  if (props.payoutQueue.length === 0 || !isBiz.value) return;
  emit('releasePayout');
  try {
    confetti({ particleCount: 90, spread: 60, origin: { y: 0.7 } });
  } catch (e) {
    // confetti là tùy chọn
  }
}
</script>
