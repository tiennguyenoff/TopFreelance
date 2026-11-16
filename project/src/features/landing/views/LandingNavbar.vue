<template>
  <header class="sticky top-0 z-50 w-full backdrop-blur-md bg-champagne-50/90 border-b border-platinum-200/90 transition-all">
    <div class="w-full max-w-[1920px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 h-16 flex items-center justify-between">
      
      <!-- Logo Brand -->
      <div 
        @click="$emit('changeTab', 'home')"
        class="flex items-center gap-3 cursor-pointer group"
      >
        <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-champagne-400 via-champagne-300 to-ice-400 p-[1.5px] shadow-sm group-hover:scale-105 transition-transform">
          <div class="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
            <span class="text-lg font-black text-champagne-600 font-mono tracking-tighter">TF</span>
          </div>
        </div>
        <div>
          <div class="flex items-center gap-2">
            <span class="font-extrabold text-slate-900 tracking-tight text-base sm:text-lg">
              TopFreelance
            </span>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-champagne-200/60 text-champagne-700 font-mono border border-champagne-300/40">
              BETA
            </span>
          </div>
          <p class="text-[10px] text-slate-500 hidden sm:block">
            Sàn việc làm tự do
          </p>
        </div>
      </div>

      <!-- Navigation Links with Animated Orange Beam Ring -->
      <nav class="hidden md:flex items-center gap-1.5 text-sm">
        <template v-for="tab in navTabs" :key="tab.id + authStore.state.currentRole">
          <!-- 1. ACTIVE TAB WITH CONTINUOUS TRAVELING ORANGE BEAM RING -->
          <div
            v-if="currentTab === tab.id"
            @click="$emit('changeTab', tab.id)"
            class="relative p-[1.5px] rounded-2xl overflow-hidden shadow-sm cursor-pointer select-none group"
            title="Đang xem mục này"
          >
            <!-- Spinning Continuous Orange Neon Laser Beam -->
            <div class="absolute -inset-[250%] animate-beam bg-[conic-gradient(from_0deg,transparent_0_240deg,#ea580c_290deg,#f97316_320deg,#fdba74_345deg,#f97316_360deg)] pointer-events-none"></div>

            <!-- Inner Bolder Content -->
            <div class="relative z-10 px-4 py-2 rounded-[14px] bg-white text-slate-950 font-black tracking-tight text-xs sm:text-sm flex items-center gap-1.5 shadow-2xs">
              <span class="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
              <span>{{ tab.label }}</span>
              <span
                v-if="tab.badge"
                class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-orange-100 text-orange-800 border border-orange-300 font-extrabold"
              >
                {{ tab.badge }}
              </span>
            </div>
          </div>

          <!-- 2. INACTIVE TAB -->
          <button
            v-else
            @click="$emit('changeTab', tab.id)"
            class="px-4 py-2 rounded-2xl text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-white/80 transition-all flex items-center gap-1.5 border border-transparent"
          >
            <span>{{ tab.label }}</span>
            <span
              v-if="tab.badge"
              class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-ice-100 text-ice-600 border border-ice-200"
            >
              {{ tab.badge }}
            </span>
          </button>
        </template>
      </nav>

      <!-- Action Buttons -->
      <div class="flex items-center gap-2.5">
        <!-- User Profile & Role Switcher Badge -->
        <div
          @click="authStore.openAuthModal()"
          class="cursor-pointer flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white border border-platinum-200 hover:border-champagne-400 shadow-2xs hover:shadow-xs transition-all active:scale-95 text-xs font-mono"
          title="Nhấn để chuyển đổi giữa Doanh nghiệp và Freelancer"
        >
          <span class="text-base">{{ authStore.currentUser.avatar }}</span>
          <div class="hidden lg:flex flex-col text-left leading-tight">
            <span class="font-bold text-slate-800 text-[11px] truncate max-w-[100px]">
              {{ authStore.currentUser.name }}
            </span>
            <span :class="[
              'text-[9px] font-black uppercase',
              authStore.isBusiness ? 'text-champagne-700' : 'text-ice-700'
            ]">
              {{ authStore.isBusiness ? 'DOANH NGHIỆP' : 'FREELANCER' }}
            </span>
          </div>
          <span class="hidden xl:inline font-bold text-emerald-700 text-[11px] border-l border-platinum-200 pl-2" title="Số dư ví">
            ${{ Number(authStore.currentUser.walletBalance || 0).toLocaleString('en-US') }}
          </span>
          <span class="text-[10px] text-slate-400 font-sans">⇄</span>
        </div>

        <!-- Live Inspector HUD trigger button -->
        <button
          @click="$emit('toggleHud')"
          :class="[
            'hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold border shadow-xs transition-all whitespace-nowrap',
            hudOpen
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white border-platinum-300 text-slate-700 hover:border-champagne-400 hover:text-champagne-700'
          ]"
          :title="hudOpen ? 'Đóng khung DSA Canvas Inspector' : 'Mở DSA Canvas Inspector: xem cấu trúc dữ liệu & giải thuật chạy phía sau mỗi thao tác (chia đôi màn hình)'"
        >
          <span :class="['w-2 h-2 rounded-full animate-pulse', hudOpen ? 'bg-emerald-400' : 'bg-ice-400']"></span>
          <span>{{ hudOpen ? 'Đóng thuật toán' : 'Xem thuật toán' }}</span>
        </button>

        <!-- CTA Post a job -->
        <button
          v-if="authStore.isBusiness"
          @click="$emit('changeTab', 'post-job')"
          class="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-900 bg-gradient-to-r from-champagne-400 to-champagne-300 hover:from-champagne-300 hover:to-champagne-200 shadow-sm hover:shadow transition-all active:scale-95 whitespace-nowrap"
        >
          Đăng Dự Án Ngay
        </button>
        <button
          v-else
          @click="$emit('changeTab', 'jobs')"
          class="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-900 bg-gradient-to-r from-ice-300 to-ice-200 hover:from-ice-200 hover:to-ice-100 shadow-sm hover:shadow transition-all active:scale-95 whitespace-nowrap"
        >
          Tìm Việc Ngay
        </button>
      </div>

    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue';
import { authStore } from '../../auth/controllers/AuthStore.js';

// Menu thay đổi theo vai trò: chỉ Doanh nghiệp mới có mục Đăng Tuyển Dụng
const navTabs = computed(() => authStore.state.currentRole === 'business'
  ? [
      { id: 'home', label: 'Trang Chủ' },
      { id: 'jobs', label: 'Việc Làm' },
      { id: 'post-job', label: 'Đăng Tuyển Dụng' },
      { id: 'wallet', label: 'Ví & Thanh Toán' }
    ]
  : [
      { id: 'home', label: 'Trang Chủ' },
      { id: 'jobs', label: 'Tìm Việc' },
      { id: 'wallet', label: 'Đơn Ứng Tuyển' },
      { id: 'profile', label: 'Hồ Sơ Của Tôi' }
    ]);

defineProps({
  currentTab: {
    type: String,
    default: 'home'
  },
  hudOpen: {
    type: Boolean,
    default: false
  }
});

defineEmits(['changeTab', 'toggleHud']);
</script>
