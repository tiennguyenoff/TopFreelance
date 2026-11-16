<template>
  <div
    v-if="authStore.state.isAuthModalOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-sans"
  >
    <div class="w-full max-w-lg rounded-3xl bg-white border border-platinum-300 shadow-2xl p-6 sm:p-8 space-y-6 relative transform transition-all">
      
      <!-- Modal Header -->
      <div class="flex items-start justify-between gap-4">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-champagne-100 text-champagne-800 text-xs font-mono font-bold mb-1.5">
            XÁC THỰC DANH TÍNH & PHÂN QUYỀN RBAC
          </div>
          <h2 class="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Chọn Tài Khoản Trải Nghiệm
          </h2>
          <p class="text-xs text-slate-500 mt-1">
            Hệ thống cấp phát 2 tài khoản đại diện cho 2 đối tượng người dùng chính trên sàn.
          </p>
        </div>
        <button
          @click="authStore.closeAuthModal()"
          class="w-8 h-8 rounded-full bg-platinum-100 hover:bg-platinum-200 text-slate-500 hover:text-slate-800 flex items-center justify-center text-sm font-bold transition-colors"
        >
          ✕
        </button>
      </div>

      <!-- Account Role Cards Selection -->
      <div class="space-y-3.5">
        
        <!-- Option 1: Business Account -->
        <div
          @click="selectRole('business')"
          :class="[
            'p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-4 relative',
            authStore.isBusiness
              ? 'border-champagne-400 bg-champagne-50/70 shadow-sm'
              : 'border-platinum-200 hover:border-champagne-300 bg-white hover:bg-platinum-50/50'
          ]"
        >
          <div class="w-12 h-12 rounded-2xl bg-champagne-100 border border-champagne-300/80 flex items-center justify-center text-2xl shadow-2xs shrink-0">
            🏢
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-2">
              <h3 class="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <span>Sarah Jenkins</span>
                <span class="text-[10px] font-mono font-bold px-2 py-0.2 rounded-full bg-champagne-200 text-champagne-900">
                  DOANH NGHIỆP
                </span>
              </h3>
              <span v-if="authStore.isBusiness" class="text-champagne-600 font-bold text-xs">
                ✓ Đang chọn
              </span>
            </div>
            <p class="text-xs text-slate-500 font-mono mt-0.5">
              sarah.enterprise@techcorp.global
            </p>
            <div class="mt-2 text-[11px] text-slate-600 flex flex-wrap items-center gap-3 font-mono">
              <span>Ngân sách: <strong class="text-emerald-700 font-black">${{ Number(authStore.state.users.business.walletBalance).toLocaleString('en-US') }} USD</strong></span>
              <span>•</span>
              <span>Ký quỹ: <strong>trừ ngay khi đăng tin</strong></span>
            </div>
            <p class="text-[11px] text-slate-500 mt-1 leading-snug">
              Quyền hạn: Đăng tin tuyển dụng, nạp tiền ký quỹ Escrow vào RAM, giải ngân hợp đồng.
            </p>
          </div>
        </div>

        <!-- Option 2: Freelancer Account -->
        <div
          @click="selectRole('freelancer')"
          :class="[
            'p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-4 relative',
            authStore.isFreelancer
              ? 'border-ice-400 bg-ice-50/70 shadow-sm'
              : 'border-platinum-200 hover:border-ice-300 bg-white hover:bg-platinum-50/50'
          ]"
        >
          <div class="w-12 h-12 rounded-2xl bg-ice-100 border border-ice-300/80 flex items-center justify-center text-2xl shadow-2xs shrink-0">
            👨‍💻
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-2">
              <h3 class="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <span>Alex Vance</span>
                <span class="text-[10px] font-mono font-bold px-2 py-0.2 rounded-full bg-ice-200 text-ice-900">
                  FREELANCER
                </span>
              </h3>
              <span v-if="authStore.isFreelancer" class="text-ice-600 font-bold text-xs">
                ✓ Đang chọn
              </span>
            </div>
            <p class="text-xs text-slate-500 font-mono mt-0.5">
              alex.freelancer@topfreelance.io
            </p>
            <div class="mt-2 text-[11px] text-slate-600 flex flex-wrap items-center gap-3 font-mono">
              <span>Ví thù lao: <strong class="text-emerald-700 font-black">${{ Number(authStore.state.users.freelancer.walletBalance).toLocaleString('en-US') }} USD</strong></span>
              <span>•</span>
              <span>Đánh giá: <strong>★ 4.95</strong></span>
            </div>
            <p class="text-[11px] text-slate-500 mt-1 leading-snug">
              Quyền hạn: Tìm việc, nộp và rút hồ sơ ứng tuyển, xây dựng hồ sơ năng lực, nhận thanh toán.
            </p>
          </div>
        </div>

      </div>

      <!-- Footer Info -->
      <div class="pt-3 border-t border-platinum-100 flex items-center justify-between text-xs font-mono">
        <span class="text-slate-400 text-[11px]">
          Dữ liệu lưu trữ bền vững tại MySQL 8.0
        </span>
        <button
          @click="authStore.closeAuthModal()"
          class="px-5 py-2.5 rounded-xl font-bold bg-slate-900 hover:bg-slate-800 text-white transition-all shadow-xs"
        >
          Xác Nhận & Đóng
        </button>
      </div>

    </div>
  </div>
</template>

<script setup>
import { authStore } from '../controllers/AuthStore.js';

const emit = defineEmits(['roleChanged']);

function selectRole(role) {
  authStore.switchRole(role);
  emit('roleChanged', role);
}
</script>
