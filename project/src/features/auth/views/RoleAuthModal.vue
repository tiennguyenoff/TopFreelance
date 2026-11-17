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
            <div class="mt-3" @click.stop>
              <div v-if="authStore.state.loggedIn.business" class="flex items-center justify-between gap-2 text-[11px] font-mono">
                <span class="text-emerald-700 font-bold">● Đã đăng nhập</span>
                <button @click="doLogout('business')" class="px-3 py-1.5 rounded-lg bg-platinum-100 hover:bg-platinum-200 text-slate-700 font-bold">Đăng xuất</button>
              </div>
              <form v-else @submit.prevent="doLogin('business')" class="flex items-center gap-2">
                <input v-model="passwords.business" type="password" autocomplete="current-password" placeholder="Mật khẩu" maxlength="200"
                  class="flex-1 min-w-0 px-3 py-2 rounded-lg border border-platinum-300 text-xs font-mono focus:outline-none focus:border-slate-500" />
                <button type="submit" :disabled="busy === 'business' || !passwords.business"
                  class="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-bold">
                  {{ busy === 'business' ? '...' : 'Đăng nhập' }}
                </button>
              </form>
              <p v-if="errors.business" class="text-[11px] text-rose-600 mt-1">{{ errors.business }}</p>
            </div>
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
            <div class="mt-3" @click.stop>
              <div v-if="authStore.state.loggedIn.freelancer" class="flex items-center justify-between gap-2 text-[11px] font-mono">
                <span class="text-emerald-700 font-bold">● Đã đăng nhập</span>
                <button @click="doLogout('freelancer')" class="px-3 py-1.5 rounded-lg bg-platinum-100 hover:bg-platinum-200 text-slate-700 font-bold">Đăng xuất</button>
              </div>
              <form v-else @submit.prevent="doLogin('freelancer')" class="flex items-center gap-2">
                <input v-model="passwords.freelancer" type="password" autocomplete="current-password" placeholder="Mật khẩu" maxlength="200"
                  class="flex-1 min-w-0 px-3 py-2 rounded-lg border border-platinum-300 text-xs font-mono focus:outline-none focus:border-slate-500" />
                <button type="submit" :disabled="busy === 'freelancer' || !passwords.freelancer"
                  class="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-bold">
                  {{ busy === 'freelancer' ? '...' : 'Đăng nhập' }}
                </button>
              </form>
              <p v-if="errors.freelancer" class="text-[11px] text-rose-600 mt-1">{{ errors.freelancer }}</p>
            </div>
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
import { reactive, ref } from 'vue';
import { authStore } from '../controllers/AuthStore.js';
import { login, logout } from '../../../shared/api.js';

const emit = defineEmits(['roleChanged', 'sessionChanged']);

const passwords = reactive({ freelancer: '', business: '' });
const errors = reactive({ freelancer: '', business: '' });
const busy = ref('');

async function doLogin(role) {
  busy.value = role;
  errors[role] = '';
  const r = await login(authStore.state.users[role].email, passwords[role]);
  busy.value = '';
  passwords[role] = ''; // không giữ mật khẩu trong bộ nhớ trang
  if (!r.ok) {
    errors[role] = r.offline ? 'Chưa kết nối được máy chủ.' : r.error;
    return;
  }
  authStore.setSession(role, r.user);
  emit('sessionChanged', role);
}

async function doLogout(role) {
  await logout(role);
  authStore.setSession(role, null);
  emit('sessionChanged', role);
}

function selectRole(role) {
  authStore.switchRole(role);
  emit('roleChanged', role);
}
</script>
