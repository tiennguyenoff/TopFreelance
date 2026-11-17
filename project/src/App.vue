<template>
  <div class="h-screen flex flex-col overflow-hidden bg-[linear-gradient(135deg,#F7EEDD_0%,#F4EFE6_38%,#E6F0F7_72%,#D3E7F6_100%)] text-slate-800 font-sans selection:bg-champagne-300 selection:text-slate-900 relative">

    <!-- Top Glassmorphism Navigation Bar -->
    <LandingNavbar
      :current-tab="activeTab"
      :hud-open="hudOpen"
      @change-tab="onNavigateTab"
      @toggle-hud="toggleHud"
    />

    <!-- ===================================================================== -->
    <!-- VÙNG LÀM VIỆC CHIA ĐÔI: [Giao diện người dùng] | [Live Inspector Canvas] -->
    <!-- ===================================================================== -->
    <div
      ref="splitRef"
      :class="['flex-1 min-h-0 flex', isNarrow ? 'flex-col' : 'flex-row', dragging ? 'select-none' : '']"
    >
      <!-- Giao diện người dùng (mặc định 60% khi mở Inspector) -->
      <main
        ref="mainRef"
        class="@container min-w-0 min-h-0 overflow-y-auto overflow-x-hidden"
        :style="mainStyle"
      >
        <div :class="[
          'w-full transition-[padding]',
          activeTab === 'home' ? 'p-0' : 'max-w-[1920px] mx-auto px-4 @2xl:px-8 @5xl:px-12 @7xl:px-16 py-6'
        ]">

          <!-- TRANG 1: TRANG CHỦ -->
          <LandingPageView
            v-if="activeTab === 'home'"
            :overview="marketplaceOverview"
            @change-tab="onNavigateTab"
            @search-tag="onQuickTagSearch"
          />

          <!-- TRANG 2: SÀN VIỆC LÀM -->
          <JobsMarketplaceView
            v-else-if="activeTab === 'jobs'"
            :jobs="allJobs"
            :jobs-version="jobsVersion"
            :initial-skill="initialSkill"
            :applied-job-ids="appliedJobIds"
            @apply-job="onApplyProposal"
            @open-inspector="openHud"
          />

          <!-- TRANG 3: ĐĂNG DỰ ÁN MỚI (CHỈ DOANH NGHIỆP) -->
          <PostJobView
            v-else-if="activeTab === 'post-job' && authStore.isBusiness"
            :posted-jobs="myPostedJobs"
            :total-market-jobs="allJobs.length"
            @create-job="onCreateNewJob"
            @view-marketplace="onNavigateTab('jobs')"
          />

          <!-- TRANG 4: HỒ SƠ / VÍ (NỘI DUNG THEO VAI TRÒ) -->
          <WalletEscrowView
            v-else-if="activeTab === 'wallet'"
            :applied-jobs-list="appliedJobsList"
            :paid-job-ids="paidJobIds"
            :posted-jobs="myPostedJobs"
            :payout-queue="payoutQueue"
            :jobs-version="jobsVersion"
            @withdraw-proposal="onWithdrawProposal"
            @release-payout="releasePayout"
            @view-marketplace="onNavigateTab('jobs')"
            @post-job="onNavigateTab('post-job')"
            @view-profile="openProfileModal"
          />

          <!-- TRANG 5: HỒ SƠ NĂNG LỰC (FREELANCER) -->
          <ProfileView
            v-else-if="activeTab === 'profile' && authStore.isFreelancer"
            :user-id="authStore.state.users.freelancer.id"
            :editable="true"
            @notify="(t, k) => notify(t, k)"
          />
        </div>
      </main>

      <!-- Đường phân chia kéo được (pointer drag + phím mũi tên, nhấp đúp = về 60/40) -->
      <div
        v-if="hudOpen"
        role="separator"
        tabindex="0"
        :aria-orientation="isNarrow ? 'horizontal' : 'vertical'"
        :aria-valuenow="Math.round(splitRatio * 100)"
        aria-valuemin="25"
        aria-valuemax="75"
        :title="`Kéo để chia lại màn hình (${Math.round(splitRatio * 100)}% / ${100 - Math.round(splitRatio * 100)}%) — nhấp đúp để về 60/40`"
        :class="[
          'group relative shrink-0 z-30 flex items-center justify-center bg-platinum-200/70 hover:bg-champagne-300/80 focus:outline-none focus-visible:bg-champagne-400 transition-colors',
          isNarrow ? 'h-2.5 w-full cursor-row-resize' : 'w-2.5 h-full cursor-col-resize',
          dragging ? '!bg-champagne-400' : ''
        ]"
        @pointerdown="startDrag"
        @dblclick="resetSplit"
        @keydown="onDividerKey"
      >
        <span :class="[
          'rounded-full bg-slate-400/70 group-hover:bg-slate-700/70',
          isNarrow ? 'w-10 h-1' : 'h-10 w-1'
        ]"></span>
        <span
          v-if="dragging"
          class="absolute px-2 py-1 rounded-lg bg-slate-900 text-white text-[10px] font-mono whitespace-nowrap shadow-lg pointer-events-none"
        >
          {{ Math.round(splitRatio * 100) }}% | {{ 100 - Math.round(splitRatio * 100) }}%
        </span>
      </div>

      <!-- Live Inspector Canvas (mặc định 40%) -->
      <aside
        v-if="hudOpen"
        class="flex-1 min-w-0 min-h-0"
        :class="dragging ? 'pointer-events-none' : ''"
      >
        <LiveInspectorHUD ref="hudRef" @close="hudOpen = false" />
      </aside>
    </div>

    <!-- Nút mở nhanh Inspector khi đang đóng (nhỏ gọn, không che giao diện) -->
    <button
      v-if="!hudOpen"
      @click="openHud"
      class="fixed bottom-4 right-4 z-40 flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/95 backdrop-blur-md border border-platinum-300 hover:border-champagne-400 shadow-lg text-xs font-mono font-bold text-slate-800 transition-all active:scale-95"
      title="Mở DSA Canvas Inspector: xem cấu trúc dữ liệu & giải thuật chạy phía sau mỗi thao tác (chia đôi màn hình 60/40)"
    >
      <span class="relative flex h-2.5 w-2.5">
        <span :class="['absolute inline-flex h-full w-full rounded-full opacity-75', unseenAction ? 'bg-emerald-400 animate-ping' : 'bg-ice-400']"></span>
        <span :class="['relative inline-flex rounded-full h-2.5 w-2.5', unseenAction ? 'bg-emerald-500' : 'bg-ice-500']"></span>
      </span>
      <span>Xem thuật toán</span>
      <span v-if="unseenAction" class="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] border border-emerald-300">thao tác mới</span>
    </button>

    <!-- Thông báo ngắn (lỗi số dư, sai vai trò...) -->
    <transition name="fade">
      <div
        v-if="toast"
        class="fixed top-20 left-1/2 -translate-x-1/2 z-[60] max-w-md px-4 py-2.5 rounded-2xl text-xs font-semibold shadow-xl border"
        :class="toast.type === 'error' ? 'bg-rose-50 border-rose-300 text-rose-800' : 'bg-emerald-50 border-emerald-300 text-emerald-800'"
      >
        {{ toast.text }}
      </div>
    </transition>

    <!-- Nhà tuyển dụng xem hồ sơ năng lực của freelancer -->
    <div
      v-if="profileModalUserId"
      class="fixed inset-0 z-[55] bg-slate-900/40 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto"
      @click.self="profileModalUserId = null"
    >
      <div class="w-full max-w-3xl my-8 relative">
        <button
          @click="profileModalUserId = null"
          class="absolute -top-3 -right-3 z-10 w-9 h-9 rounded-full bg-white border border-platinum-300 shadow-md text-slate-600 hover:text-slate-900 font-bold"
          aria-label="Đóng"
        >✕</button>
        <ProfileView :user-id="profileModalUserId" :editable="false" />
      </div>
    </div>

    <!-- Role Authentication & Switcher Modal (Freelancer & Business) -->
    <RoleAuthModal @sessionChanged="refreshWallets" />

  </div>
</template>

<script setup>
import { ref, shallowRef, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import LandingNavbar from './features/landing/views/LandingNavbar.vue';
import LandingPageView from './features/landing/views/LandingPageView.vue';
import JobsMarketplaceView from './features/job-catalog/views/JobsMarketplaceView.vue';
import PostJobView from './features/job-catalog/views/PostJobView.vue';
import WalletEscrowView from './features/escrow-payout/views/WalletEscrowView.vue';
import ProfileView from './features/proposals/views/ProfileView.vue';
import LiveInspectorHUD from './features/dsa-inspector/views/LiveInspectorHUD.vue';
import RoleAuthModal from './features/auth/views/RoleAuthModal.vue';
import { authStore } from './features/auth/controllers/AuthStore.js';
import { apiGet, apiPost, fetchMe } from './shared/api.js';
import { JobStatsController } from './features/job-catalog/controllers/JobStatsController.js';
import { escrowQueueController } from './features/escrow-payout/controllers/EscrowQueueController.js';
import { undoController } from './features/undo-history/controllers/UndoController.js';
import { DSAActionBridge } from './features/dsa-inspector/controllers/DSAActionBridge.js';
import { MarketplaceEngine } from './features/marketplace-hub/controllers/MarketplaceEngine.js';

const activeTab = ref('home');
const hudRef = ref(null);
const mainRef = ref(null);
const splitRef = ref(null);

// ---------------------------------------------------------------------------
// MÀN HÌNH CHIA ĐÔI: giao diện người dùng | Live Inspector Canvas
// ---------------------------------------------------------------------------
const hudOpen = ref(false);
const DEFAULT_RATIO = 0.6;
const MIN_RATIO = 0.25;
const MAX_RATIO = 0.75;
const savedRatio = Number(localStorage.getItem('tf.splitRatio'));
const splitRatio = ref(savedRatio >= MIN_RATIO && savedRatio <= MAX_RATIO ? savedRatio : DEFAULT_RATIO);
const dragging = ref(false);
const isNarrow = ref(window.innerWidth < 768);
const unseenAction = ref(false);

const mainStyle = computed(() => {
  if (!hudOpen.value) return { flex: '1 1 auto' };
  // Trừ nửa bề rộng thanh chia (10px) để hai phần cộng lại đúng 100%
  return { flex: `0 0 calc(${(splitRatio.value * 100).toFixed(2)}% - 5px)` };
});

function clampRatio(r) {
  return Math.min(MAX_RATIO, Math.max(MIN_RATIO, r));
}

function startDrag(e) {
  e.preventDefault();
  dragging.value = true;
  const el = e.currentTarget;
  el.setPointerCapture?.(e.pointerId);
  const box = splitRef.value.getBoundingClientRect();
  const onMove = (ev) => {
    const r = isNarrow.value
      ? (ev.clientY - box.top) / box.height
      : (ev.clientX - box.left) / box.width;
    splitRatio.value = clampRatio(r);
  };
  const onUp = () => {
    dragging.value = false;
    el.removeEventListener('pointermove', onMove);
    el.removeEventListener('pointerup', onUp);
    el.removeEventListener('pointercancel', onUp);
    localStorage.setItem('tf.splitRatio', String(splitRatio.value));
  };
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onUp);
}

function resetSplit() {
  splitRatio.value = DEFAULT_RATIO;
  localStorage.setItem('tf.splitRatio', String(DEFAULT_RATIO));
}

function onDividerKey(e) {
  const back = isNarrow.value ? 'ArrowUp' : 'ArrowLeft';
  const fwd = isNarrow.value ? 'ArrowDown' : 'ArrowRight';
  if (e.key === back || e.key === fwd) {
    e.preventDefault();
    splitRatio.value = clampRatio(splitRatio.value + (e.key === fwd ? 0.02 : -0.02));
    localStorage.setItem('tf.splitRatio', String(splitRatio.value));
  } else if (e.key === 'Home' || e.key === 'Enter') {
    resetSplit();
  }
}

function onResize() {
  isNarrow.value = window.innerWidth < 768;
}

function openHud() {
  hudOpen.value = true;
  unseenAction.value = false;
  nextTick(() => hudRef.value?.showSimulator?.());
}

function toggleHud() {
  if (hudOpen.value) hudOpen.value = false;
  else openHud();
}

// Thao tác mới khi Inspector đang đóng -> nút mở nhanh nhấp nháy, không tự bật chia màn hình
watch(() => DSAActionBridge.state.activeAction, (a) => {
  if (a && !hudOpen.value) unseenAction.value = true;
});

// ---------------------------------------------------------------------------
// DỮ LIỆU
// ---------------------------------------------------------------------------
// Mảng gốc (Single Source of Truth) do MarketplaceEngine sở hữu.
const allJobs = shallowRef([]);
const jobsVersion = ref(0);

const appliedJobIds = ref(new Set());
const paidJobIds = ref(new Set()); // job đã được doanh nghiệp duyệt giải ngân cho freelancer
const payoutQueue = ref([]); // ảnh chụp hàng đợi FIFO (đầu trước)
const myPostedJobs = ref([]); // tin do tài khoản doanh nghiệp hiện tại đăng (lọc theo employer_id)

const marketplaceOverview = computed(() => JobStatsController.getMarketplaceOverview(allJobs.value));

const appliedJobsList = computed(() => {
  jobsVersion.value;
  // Giữ đúng THỨ TỰ NỘP (Set giữ thứ tự chèn) — trùng thứ tự các nút trong DSLK đôi ở Inspector,
  // nên "thẻ thứ 2 trên màn hình" cũng là "nút thứ 2 tính từ head". Tra từng việc qua AVL O(log n)
  // thay vì lọc cả mảng 10.000 việc O(n).
  const out = [];
  for (const id of appliedJobIds.value) {
    const job = MarketplaceEngine.findById(id) || allJobs.value.find(j => j.id === id);
    if (job) out.push(job);
  }
  return out;
});

function syncQueues() {
  payoutQueue.value = escrowQueueController.getPendingTickets();
}

const toast = ref(null);
let toastTimer = null;
function notify(text, type = 'error') {
  toast.value = { text, type };
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.value = null; }, 3200);
}

// ---------------------------------------------------------------------------
// ĐIỀU HƯỚNG + PHÂN QUYỀN THEO VAI TRÒ
// ---------------------------------------------------------------------------
const TABS_BY_ROLE = {
  business: ['home', 'jobs', 'post-job', 'wallet'],
  freelancer: ['home', 'jobs', 'wallet', 'profile']
};

// Nhà tuyển dụng mở hồ sơ năng lực của ứng viên
const profileModalUserId = ref(null);
function openProfileModal(userId) {
  profileModalUserId.value = userId;
}

function scrollMainTop() {
  mainRef.value?.scrollTo({ top: 0, behavior: 'smooth' });
}

function onNavigateTab(tab) {
  const allowed = TABS_BY_ROLE[authStore.state.currentRole] || TABS_BY_ROLE.freelancer;
  if (!allowed.includes(tab)) {
    notify(tab === 'post-job'
      ? 'Chỉ tài khoản Doanh nghiệp mới đăng tin tuyển dụng. Hãy đổi vai trò.'
      : 'Vai trò hiện tại không truy cập được trang này.');
    return;
  }
  activeTab.value = tab;
  scrollMainTop();
}

// Đổi vai trò -> nếu trang đang mở không còn được phép thì chuyển về Sàn việc
watch(() => authStore.state.currentRole, (role) => {
  const allowed = TABS_BY_ROLE[role] || TABS_BY_ROLE.freelancer;
  if (!allowed.includes(activeTab.value)) {
    activeTab.value = 'jobs';
    scrollMainTop();
  }
});

const initialSkill = ref('');
function onQuickTagSearch(tag) {
  initialSkill.value = tag;
  activeTab.value = 'jobs';
  scrollMainTop();
}

// ---------------------------------------------------------------------------
// ĐỒNG BỘ MYSQL: server là nguồn sự thật cho tiền & hồ sơ. Giao diện cập nhật ngay (lạc quan),
// nếu server từ chối thì hoàn lại thay đổi trong RAM và báo lỗi cho người dùng.
// offline (không có MySQL) → vẫn chạy bằng dữ liệu trong RAM.
// ---------------------------------------------------------------------------
function serverRejected(r) {
  return !r.ok && !r.offline;
}

// ---------------------------------------------------------------------------
// ĐĂNG VIỆC (Doanh nghiệp): trừ ví = ngân sách, khóa vào Escrow của job
// ---------------------------------------------------------------------------
async function onCreateNewJob(payload) {
  if (!authStore.isBusiness) return notify('Chỉ Doanh nghiệp mới đăng tin tuyển dụng.');
  const biz = authStore.state.users.business;
  const budget = Number(payload.budget) || 0;
  if (budget <= 0) return notify('Ngân sách phải lớn hơn 0.');
  if (budget > biz.walletBalance) return notify(`Số dư ví ($${biz.walletBalance.toLocaleString()}) không đủ để ký quỹ $${budget.toLocaleString()}.`);

  const { job, trace } = MarketplaceEngine.postJob(payload);
  job.employer_id = biz.id;
  biz.walletBalance -= budget; // tiền rời ví doanh nghiệp, nằm trong job.escrowBalance
  myPostedJobs.value.unshift(job);
  jobsVersion.value++;
  DSAActionBridge.dispatchJobPost(trace);

  const r = await apiPost('/api/jobs', {
    id: job.id,
    title: job.title,
    skillTag: job.skillTag,
    category: job.category,
    budget: job.budget,
    slots: job.slots,
    deadlineDays: job.deadlineDays,
    description: payload.description || ''
  }, 'business');
  if (r.ok && r.data?.walletBalance != null) biz.walletBalance = Number(r.data.walletBalance);
  if (serverRejected(r)) {
    // Hoàn lại: gỡ tin khỏi danh sách của tôi, trả tiền về ví
    biz.walletBalance += budget;
    job.status = 'CANCELLED';
    myPostedJobs.value = myPostedJobs.value.filter(j => j !== job);
    jobsVersion.value++;
    notify(`Không lưu được tin: ${r.error}`);
  }
}

// ---------------------------------------------------------------------------
// NỘP HỒ SƠ (Freelancer): AVL tìm job -> hire -> DSLK insertHead -> Enqueue
// ---------------------------------------------------------------------------
async function onApplyProposal({ job, bid, proposalText }) {
  if (!authStore.isFreelancer) return notify('Chỉ Freelancer mới nộp hồ sơ ứng tuyển.');
  if (appliedJobIds.value.has(job.id)) return notify('Bạn đã ứng tuyển việc này rồi.');
  const fl = authStore.state.users.freelancer;
  const maxBid = Math.floor(job.budget / Math.max(1, job.slots));
  const amount = Math.min(Number(bid) || maxBid, maxBid);
  const { res, trace } = MarketplaceEngine.applyProposal({ job, freelancerId: fl.id, bid: amount, proposalText });
  if (!res.success) return notify(res.message || 'Không thể nộp hồ sơ (việc đã đủ người?).');

  appliedJobIds.value.add(job.id);
  appliedJobIds.value = new Set(appliedJobIds.value);
  syncQueues();
  DSAActionBridge.dispatchApply(trace);

  const r = await apiPost('/api/proposals', {
    jobId: job.id,
    bidAmount: amount,
    coverLetter: proposalText || '',
    ticketId: res.payoutTicket?.id,
    // Tin mẫu chưa có trong DB: server tạo kèm sau khi kiểm tra từng trường
    job: { title: job.title, skillTag: job.skillTag, category: job.category, budget: job.budget, slots: job.slots, deadlineDays: job.deadlineDays }
  }, 'freelancer');
  if (serverRejected(r)) {
    rollbackApply(job);
    notify(`Chưa nộp được hồ sơ: ${r.error}`);
  } else {
    notify(`Đã gửi hồ sơ cho "${job.title}". Bạn có thể rút đơn bất cứ lúc nào trước khi được duyệt.`, 'ok');
  }
}

function rollbackApply(job) {
  const { remaining } = MarketplaceEngine.withdrawProposal(job);
  if (remaining === 0) {
    appliedJobIds.value.delete(job.id);
    appliedJobIds.value = new Set(appliedJobIds.value);
  }
  syncQueues();
}

// ---------------------------------------------------------------------------
// RÚT HỒ SƠ (Freelancer, bất kỳ đơn nào đang chờ): hủy vé -> duyệt DSLK đôi -> removeNode
// Server XÓA hẳn đơn + hợp đồng ký quỹ tương ứng.
// ---------------------------------------------------------------------------
async function onWithdrawProposal(job) {
  if (!authStore.isFreelancer) return notify('Chỉ Freelancer mới rút hồ sơ của mình.');
  if (paidJobIds.value.has(job.id)) return notify('Hồ sơ đã được thanh toán, không thể rút.');
  const r = await apiPost('/api/proposals/withdraw', { jobId: job.id }, 'freelancer');
  if (serverRejected(r) && r.status !== 404) return notify(`Chưa rút được đơn: ${r.error}`);

  const { remaining, trace } = MarketplaceEngine.withdrawProposal(job);
  if (remaining === 0) {
    appliedJobIds.value.delete(job.id);
    appliedJobIds.value = new Set(appliedJobIds.value);
  }
  syncQueues();
  jobsVersion.value++;
  DSAActionBridge.dispatchWithdrawProposal(trace);
  notify(`Đã rút đơn ứng tuyển "${job.title}".`, 'ok');
}

// ---------------------------------------------------------------------------
// GIẢI NGÂN (Doanh nghiệp duyệt): Dequeue vé đầu FIFO -> trừ Escrow của job -> CỘNG ví Freelancer
// Số tiền do server lấy từ hợp đồng ký quỹ trong DB (client không gửi số tiền).
// ---------------------------------------------------------------------------
async function releasePayout() {
  if (!authStore.isBusiness) return notify('Chỉ Doanh nghiệp mới duyệt thanh toán.');
  const fl = authStore.state.users.freelancer;
  const head = escrowQueueController.getPendingTickets()[0];
  if (!head) return;

  const r = await apiPost('/api/escrow/payout', { jobId: head.jobId, freelancerId: head.freelancerId || fl.id }, 'business');
  if (serverRejected(r)) return notify(`Chưa thanh toán được: ${r.error}`);

  const biz = authStore.state.users.business;
  // Server đã trừ ví thật: lấy số dư trước-khi-trả từ server để bước trừ cục bộ khớp và không bị chặn sai
  if (r.ok && r.data && r.data.source === 'wallet' && r.data.businessBalance != null) {
    biz.walletBalance = Number(r.data.businessBalance) + Number(r.data.amount || 0);
  }
  const { res, trace } = MarketplaceEngine.processPayout(fl, biz);
  if (!res.success) {
    if (res.reason === 'INSUFFICIENT_FUNDS') notify('Số dư ví không đủ để thanh toán đơn này.');
    return;
  }
  undoController.removeActionByJobId(res.ticket.jobId);
  paidJobIds.value.add(res.ticket.jobId);
  paidJobIds.value = new Set(paidJobIds.value);
  syncQueues();
  jobsVersion.value++;
  DSAActionBridge.dispatchQueuePayout(trace);
  if (r.ok) await refreshWallets();
  const amt = `$${res.ticket.amount.toLocaleString()}`;
  const fromWallet = r.ok ? !!(r.data && r.data.source === 'wallet') : trace.source === 'wallet';
  notify(fromWallet
    ? `Đã trả ${amt} cho ${fl.name} (việc ${res.ticket.jobId}). Ví của bạn bị trừ ${amt}, còn $${Number(biz.walletBalance).toLocaleString()}.`
    : `Đã giải ngân ${amt} từ ký quỹ việc ${res.ticket.jobId} cho ${fl.name} (tiền đã trừ khỏi ví lúc đăng tin).`, 'ok');
}

/** Số dư ví lấy từ phiên đăng nhập của từng tài khoản (API công khai không lộ số dư). */
async function refreshWallets() {
  for (const role of ['freelancer', 'business']) {
    const u = await fetchMe(role); // null nếu chưa đăng nhập (mật khẩu) hoặc server offline
    authStore.setSession(role, u);
  }
}

onMounted(async () => {
  window.addEventListener('resize', onResize);

  // 1. Lấy bài đăng thật từ MySQL (nếu server đang chạy) để đứng đầu mảng gốc
  const jobsRes = await apiGet('/api/jobs');
  const seed = Array.isArray(jobsRes.data) ? jobsRes.data.map(row => ({
    id: row.id,
    title: row.title,
    skillTag: row.skill_tag,
    category: row.category,
    budget: Number(row.budget) || 2500,
    slots: Number(row.slots) || 1,
    hiredCount: Number(row.hired_count) || 0,
    deadlineDays: Number(row.deadline_days) || 14,
    clientRating: Number(row.client_rating) || 5.0,
    clientReviews: Number(row.client_reviews) || 0,
    escrowBalance: Number(row.escrow_balance) || Number(row.budget) || 2500,
    status: row.status || 'OPEN',
    employer_id: row.employer_id
  })) : [];

  // 2. Sinh 10.000 việc 1 lần duy nhất + nạp con trỏ vào AVL, bảng băm, mảng ngân sách
  allJobs.value = MarketplaceEngine.init(10000, seed);
  const bizId = authStore.state.users.business.id;
  myPostedJobs.value = allJobs.value.filter(j => j.employer_id === bizId);
  jobsVersion.value++;

  // 3. Đăng nhập 2 tài khoản mẫu → số dư ví thật
  await refreshWallets();

  // 4. Khôi phục hồ sơ của Freelancer: PENDING -> DSLK + hàng đợi (cũ nhất trước để giữ FIFO); ACCEPTED -> đã thanh toán
  const propRes = await apiGet('/api/proposals', 'freelancer');
  if (Array.isArray(propRes.data)) {
    const ordered = [...propRes.data].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    for (const p of ordered) {
      if (p.status === 'ACCEPTED') {
        appliedJobIds.value.add(p.job_id);
        paidJobIds.value.add(p.job_id);
      } else if (p.status === 'PENDING') {
        appliedJobIds.value.add(p.job_id);
        MarketplaceEngine.restoreProposal({
          jobId: p.job_id,
          freelancerId: p.freelancer_id,
          bidAmount: Number(p.bid_amount),
          jobTitle: p.job_title
        });
      }
    }
    appliedJobIds.value = new Set(appliedJobIds.value);
    paidJobIds.value = new Set(paidJobIds.value);
  }
  syncQueues();
});

onUnmounted(() => {
  window.removeEventListener('resize', onResize);
});
</script>

<style>
.fade-enter-active, .fade-leave-active { transition: opacity .25s, transform .25s; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translate(-50%, -6px); }
</style>
