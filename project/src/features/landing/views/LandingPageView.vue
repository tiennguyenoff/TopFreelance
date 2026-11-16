<template>
  <div class="w-full flex flex-col space-y-16 @2xl:space-y-24 pb-24 relative overflow-x-hidden">
    
    <!-- ===================================================================== -->
    <!-- 1. FULL-WIDTH EXPANSIVE HERO SECTION (EDGE-TO-EDGE FLUID CANVAS)      -->
    <!-- ===================================================================== -->
    <section class="relative min-h-[92vh] w-full flex items-center justify-center pt-20 pb-24 overflow-hidden bg-gradient-to-b from-champagne-100/70 via-champagne-50/40 to-[#FAF8F5] border-b border-platinum-200/70">
      
      <!-- 3D Three.js Interactive Canvas (100% Full Viewport Width) -->
      <ThreeHeroCanvas />

      <!-- Hero Ambient Gradient Orbs (Depth & Glow) -->
      <div class="absolute top-1/4 left-1/4 -translate-x-1/2 w-[550px] h-[550px] bg-champagne-300/25 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
      <div class="absolute bottom-12 right-1/4 w-[450px] h-[450px] bg-ice-300/25 rounded-full blur-3xl pointer-events-none"></div>

      <!-- Foreground Centered Content Container -->
      <div class="relative z-10 w-full max-w-6xl mx-auto px-6 @2xl:px-8 text-center flex flex-col items-center space-y-8">
        
        <!-- Live System Badge (Slide Down) -->
        <div class="reveal-init reveal-from-down inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-champagne-300 shadow-xs text-xs font-mono text-slate-800 transform hover:scale-105 transition-transform duration-300">
          <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
          <span class="font-extrabold text-champagne-800">100.000 IN-MEMORY NODES</span>
          <span class="text-slate-300">•</span>
          <span class="text-slate-600 font-medium">RAM &le; 180MB • 1 Core CPU</span>
        </div>

        <!-- Main Headline (Hero Typography with multi-tone gradient) -->
        <h1 class="reveal-init reveal-from-up text-3xl @2xl:text-5xl @5xl:text-7xl font-black text-slate-900 tracking-tight leading-[1.12]">
          Thị Trường Freelancer Toàn Cầu
          <span class="block bg-gradient-to-r from-champagne-600 via-champagne-500 to-ice-500 bg-clip-text text-transparent mt-2">
            Tìm Việc Đúng Người, Đúng Ngay
          </span>
        </h1>

        <!-- Slogan Subtitle -->
        <p class="reveal-init reveal-from-up text-sm @2xl:text-lg text-slate-600 max-w-3xl leading-relaxed">
          Nền tảng kết nối doanh nghiệp và nhân sự tự do cao cấp. Quản trị 100.000 dự án trực tiếp trong RAM, đảm bảo an toàn tuyệt đối với hợp đồng ký quỹ Escrow và cấu trúc dữ liệu tối ưu.
        </p>

        <!-- Quick Search Bar (Expanding & Glassmorphic) -->
        <div class="reveal-init reveal-scale-in w-full max-w-2xl bg-white/95 backdrop-blur-md p-2 rounded-2xl border border-platinum-300 shadow-md flex items-center gap-3 focus-within:border-champagne-400 focus-within:shadow-lg transition-all duration-300">
          <div class="pl-3 text-slate-400 text-lg">
            🔍
          </div>
          <input
            v-model="heroSearch"
            @keyup.enter="onSearchSubmit"
            type="text"
            placeholder="Tìm dự án theo kỹ năng (react, python, figma, ai-agent, aws)..."
            class="flex-1 bg-transparent border-none text-xs @2xl:text-sm text-slate-800 placeholder-slate-400 focus:outline-none font-mono"
          />
          <button
            @click="onSearchSubmit"
            class="px-6 py-3 rounded-xl text-xs @2xl:text-sm font-bold text-slate-900 bg-gradient-to-r from-champagne-400 to-champagne-300 hover:from-champagne-300 hover:to-champagne-200 transition-all shadow-xs active:scale-95 whitespace-nowrap"
          >
            Tìm Việc Ngay
          </button>
        </div>

        <!-- Popular Tags Pill -->
        <div class="reveal-init reveal-from-up flex flex-wrap items-center justify-center gap-2 text-xs">
          <span class="text-slate-400 font-medium mr-1 text-xs">Kỹ năng thịnh hành:</span>
          <button
            v-for="tag in popularTags"
            :key="tag"
            @click="$emit('searchTag', tag)"
            class="px-3 py-1 rounded-xl bg-white/90 hover:bg-champagne-100/90 border border-platinum-200 text-slate-600 hover:text-champagne-800 font-mono text-xs transition-all shadow-2xs hover:scale-105 active:scale-95"
          >
            {{ skillLabel(tag) }}
          </button>
        </div>

        <!-- Hero Action Buttons -->
        <div class="reveal-init reveal-from-up pt-2 flex flex-col @2xl:flex-row items-center gap-3.5">
          <button
            @click="$emit('changeTab', 'jobs')"
            class="w-full @2xl:w-auto px-8 py-3.5 rounded-2xl text-sm font-bold text-slate-900 bg-gradient-to-r from-champagne-400 via-champagne-300 to-ice-300 hover:shadow-lg transition-all active:scale-95 shadow-md"
          >
            Khám Phá Sàn Dự Án
          </button>
          <button
            @click="$emit('changeTab', 'post-job')"
            class="w-full @2xl:w-auto px-8 py-3.5 rounded-2xl text-sm font-bold text-slate-700 bg-white hover:bg-platinum-50 border border-platinum-300 hover:border-champagne-300 transition-all shadow-xs"
          >
            Doanh Nghiệp Đăng Việc
          </button>
        </div>

      </div>
    </section>

    <!-- ===================================================================== -->
    <!-- 2. FULL-WIDTH REAL-TIME MARKETPLACE METRICS (4 EXPANSIVE CARDS)       -->
    <!-- ===================================================================== -->
    <section class="w-full max-w-[1720px] mx-auto px-6 @2xl:px-10 @5xl:px-16">
      <div class="grid grid-cols-1 @2xl:grid-cols-2 @5xl:grid-cols-4 gap-6">
        
        <div class="reveal-init reveal-from-left delay-100 p-6 @2xl:p-7 rounded-3xl bg-white border border-platinum-200/90 shadow-xs hover:border-champagne-300 hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
          <div class="text-xs font-mono text-slate-500 uppercase tracking-wider font-semibold">
            Kho Dự Án Trong RAM
          </div>
          <div class="text-3xl @2xl:text-4xl font-black text-slate-900 mt-2 font-mono">
            {{ (overview.totalJobs || 100000).toLocaleString() }}
          </div>
          <p class="text-xs text-slate-500 mt-1.5 leading-relaxed">
            Single Source of Truth, không rò rỉ RAM Heap
          </p>
        </div>

        <div class="reveal-init reveal-from-up delay-200 p-6 @2xl:p-7 rounded-3xl bg-white border border-platinum-200/90 shadow-xs hover:border-champagne-300 hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
          <div class="text-xs font-mono text-slate-500 uppercase tracking-wider font-semibold">
            Tổng Tiền Ký Quỹ Escrow
          </div>
          <div class="text-3xl @2xl:text-4xl font-black text-champagne-600 mt-2 font-mono">
            {{ overview.totalEscrowFormatted || '$5.26M' }}
          </div>
          <p class="text-xs text-slate-500 mt-1.5 leading-relaxed">
            Thù lao được giữ trước, trả theo thứ tự hoàn thành
          </p>
        </div>

        <div class="reveal-init reveal-from-up delay-300 p-6 @2xl:p-7 rounded-3xl bg-white border border-platinum-200/90 shadow-xs hover:border-champagne-300 hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
          <div class="text-xs font-mono text-slate-500 uppercase tracking-wider font-semibold">
            Tốc Độ Tìm Kiếm
          </div>
          <div class="text-3xl @2xl:text-4xl font-black text-ice-600 mt-2 font-mono">
            &le; 1.85 &micro;s
          </div>
          <p class="text-xs text-slate-500 mt-1.5 leading-relaxed cursor-help" title="Tra theo kỹ năng bằng bảng băm Horner O(1), tra theo mã việc bằng cây AVL O(log n)">
            Kết quả hiện ra gần như tức thì, kể cả với hàng vạn tin
          </p>
        </div>

        <div class="reveal-init reveal-from-right delay-400 p-6 @2xl:p-7 rounded-3xl bg-white border border-platinum-200/90 shadow-xs hover:border-champagne-300 hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
          <div class="text-xs font-mono text-slate-500 uppercase tracking-wider font-semibold">
            Tính Bất Biến Dữ Liệu
          </div>
          <div class="text-3xl @2xl:text-4xl font-black text-emerald-600 mt-2 font-mono">
            100% Khớp
          </div>
          <p class="text-xs text-slate-500 mt-1.5 leading-relaxed">
            0 Tuyển vượt slot • 0 Thất thoát số dư ví
          </p>
        </div>

      </div>
    </section>

    <!-- ===================================================================== -->
    <!-- 3. FULL-WIDTH TOP TRENDING CATEGORIES                                 -->
    <!-- ===================================================================== -->
    <section class="w-full max-w-[1720px] mx-auto px-6 @2xl:px-10 @5xl:px-16 space-y-8">
      <div class="reveal-init reveal-from-left delay-75 flex flex-col @2xl:flex-row @2xl:items-end justify-between gap-4">
        <div>
          <span class="text-xs font-mono font-bold text-champagne-700 uppercase tracking-widest">
            Khám Phá Cơ Hội Đỉnh Cao
          </span>
          <h2 class="text-2xl @2xl:text-4xl font-black text-slate-900 tracking-tight mt-1">
            Danh Mục Ngành Nghề Thịnh Hành
          </h2>
        </div>
        <button
          @click="$emit('changeTab', 'jobs')"
          class="text-xs @2xl:text-sm font-bold text-slate-700 hover:text-champagne-700 flex items-center gap-1.5 transition-colors"
        >
          <span>Xem tất cả lĩnh vực</span>
          <span>&rarr;</span>
        </button>
      </div>

      <div class="grid grid-cols-1 @2xl:grid-cols-2 @5xl:grid-cols-3 gap-6">
        <div
          v-for="(cat, idx) in overview.topCategories || []"
          :key="cat.key"
          @click="$emit('searchTag', cat.key)"
          :class="[
            'reveal-init group p-6 @2xl:p-7 rounded-3xl bg-white border border-platinum-200 hover:border-champagne-400 hover:shadow-xl transition-all duration-300 cursor-pointer flex items-center justify-between transform hover:-translate-y-1.5',
            idx % 3 === 0 ? 'reveal-from-left' : idx % 3 === 1 ? 'reveal-from-up' : 'reveal-from-right',
            getCategoryDelayClass(idx)
          ]"
        >
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 rounded-2xl bg-champagne-50 border border-champagne-200/70 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300 shadow-2xs">
              {{ cat.icon || getCategoryEmoji(cat.key) }}
            </div>
            <div>
              <h3 class="font-extrabold text-slate-800 text-base group-hover:text-champagne-700 transition-colors">
                {{ cat.name }}
              </h3>
              <p class="text-xs text-slate-500 font-mono mt-1">
                {{ cat.count.toLocaleString() }} bài đăng sẵn sàng
              </p>
            </div>
          </div>
          <span class="text-slate-300 group-hover:text-champagne-600 group-hover:translate-x-1.5 transition-all text-lg font-bold">
            &rarr;
          </span>
        </div>
      </div>
    </section>

    <!-- ===================================================================== -->
    <!-- 4. FULL-WIDTH 3-STEP ESCROW WORKFLOW                                  -->
    <!-- ===================================================================== -->
    <section class="w-full max-w-[1720px] mx-auto px-6 @2xl:px-10 @5xl:px-16">
      <div class="p-8 @2xl:p-14 rounded-3xl @2xl:rounded-[40px] bg-gradient-to-br from-champagne-50/80 via-white to-ice-50/50 border border-platinum-200/90 shadow-xs space-y-12">
        
        <div class="reveal-init reveal-from-down delay-75 text-center max-w-2xl mx-auto space-y-2.5">
          <span class="text-xs font-mono font-bold text-champagne-700 uppercase tracking-widest">
            Minh Bạch & Tự Động Hóa
          </span>
          <h2 class="text-2xl @2xl:text-4xl font-black text-slate-900 tracking-tight">
            Quy Trình Giao Dịch 3 Bước
          </h2>
          <p class="text-xs @2xl:text-sm text-slate-600 leading-relaxed">
            Hợp đồng ký quỹ Escrow bảo vệ tối đa quyền lợi của Doanh nghiệp và Freelancer với cơ chế thanh toán công bằng: ai xong trước được trả trước.
          </p>
        </div>

        <div class="grid grid-cols-1 @3xl:grid-cols-3 gap-6">
          
          <div class="reveal-init reveal-from-left delay-150 p-7 rounded-3xl bg-white border border-platinum-200/80 shadow-xs space-y-4 transform hover:-translate-y-1.5 transition-all duration-300">
            <div class="w-12 h-12 rounded-2xl bg-champagne-100 text-champagne-800 font-mono font-extrabold flex items-center justify-center text-lg shadow-2xs">
              01
            </div>
            <h3 class="font-extrabold text-slate-900 text-lg">
              Đăng Việc & Ký Quỹ Escrow
            </h3>
            <p class="text-xs text-slate-600 leading-relaxed">
              Doanh nghiệp tạo tin tuyển dụng và nạp tiền ký quỹ vào hệ thống. Số tiền được giữ riêng cho dự án, cam kết thanh toán 100%.
            </p>
          </div>

          <div class="reveal-init reveal-scale-in delay-300 p-7 rounded-3xl bg-white border border-platinum-200/80 shadow-xs space-y-4 transform hover:-translate-y-1.5 transition-all duration-300">
            <div class="w-12 h-12 rounded-2xl bg-ice-100 text-ice-800 font-mono font-extrabold flex items-center justify-center text-lg shadow-2xs">
              02
            </div>
            <h3 class="font-extrabold text-slate-900 text-lg">
              Tìm Việc & Nộp Hồ Sơ
            </h3>
            <p class="text-xs text-slate-600 leading-relaxed">
              Freelancer lọc việc theo lĩnh vực, kỹ năng, ngân sách rồi gửi hồ sơ kèm báo giá. Có thể rút bất kỳ đơn nào trước khi được duyệt.
            </p>
          </div>

          <div class="reveal-init reveal-from-right delay-450 p-7 rounded-3xl bg-white border border-platinum-200/80 shadow-xs space-y-4 transform hover:-translate-y-1.5 transition-all duration-300">
            <div class="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 font-mono font-extrabold flex items-center justify-center text-lg shadow-2xs">
              03
            </div>
            <h3 class="font-extrabold text-slate-900 text-lg">
              Nghiệm Thu & Thanh Toán
            </h3>
            <p class="text-xs text-slate-600 leading-relaxed">
              Dự án hoàn thành được xếp hàng thanh toán theo nguyên tắc công bằng: ai xong trước nhận tiền trước.
            </p>
          </div>

        </div>

      </div>
    </section>

  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import ThreeHeroCanvas from './ThreeHeroCanvas.vue';

const props = defineProps({
  overview: {
    type: Object,
    default: () => ({})
  }
});

import { skillLabel } from '../../job-catalog/models/JobCatalog.js';
const emit = defineEmits(['changeTab', 'searchTag']);

const heroSearch = ref('');
const popularTags = ['react', 'figma', 'seo', 'translation-en', 'video-editing', 'accounting'];

let scrollObserver = null;

function getCategoryDelayClass(idx) {
  const delays = ['delay-75', 'delay-150', 'delay-225', 'delay-300', 'delay-375', 'delay-450'];
  return delays[idx % delays.length];
}

onMounted(() => {
  // Intersection Observer for multidirectional scroll animations (Continuous Re-triggering Wave)
  if ('IntersectionObserver' in window) {
    scrollObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal-visible');
        } else {
          // Tự động gỡ bỏ class khi cuộn ra khỏi tầm mắt để tái kích hoạt animation khi cuộn ngược lại
          entry.target.classList.remove('reveal-visible');
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -20px 0px'
    });

    const elements = document.querySelectorAll('.reveal-init');
    elements.forEach(el => scrollObserver.observe(el));
  } else {
    // Fallback if observer is unsupported
    document.querySelectorAll('.reveal-init').forEach(el => el.classList.add('reveal-visible'));
  }
});

onUnmounted(() => {
  if (scrollObserver) {
    scrollObserver.disconnect();
    scrollObserver = null;
  }
});

function onSearchSubmit() {
  if (heroSearch.value.trim()) {
    emit('searchTag', heroSearch.value.trim());
  } else {
    emit('changeTab', 'jobs');
  }
}

function getCategoryEmoji(key) {
  const map = {
    'ai-agent': '🤖',
    'react': '⚛️',
    'python': '🐍',
    'ui-ux': '🎨',
    'aws': '☁️',
    'solidity': '🔗'
  };
  return map[key] || '💼';
}
</script>
