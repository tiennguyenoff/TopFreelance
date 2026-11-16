<template>
  <div class="w-full flex flex-col space-y-12 pb-24 relative overflow-x-hidden">
    
    <!-- ===================================================================== -->
    <!-- 1. TOP HEADER: ENTERPRISE JOB POSTING & ESCROW ASSURANCE             -->
    <!-- ===================================================================== -->
    <div class="reveal-init reveal-from-down p-6 @2xl:p-8 rounded-3xl bg-white border border-platinum-200/90 shadow-xs flex flex-col @3xl:flex-row @3xl:items-center justify-between gap-6">
      <div>
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-champagne-100/80 border border-champagne-300/60 text-champagne-800 text-xs font-mono font-semibold mb-2">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span>DÀNH CHO NHÀ TUYỂN DỤNG</span>
          <span>•</span>
          <span title="Escrow: tiền thù lao được giữ trước, chỉ trả khi nghiệm thu">KÝ QUỸ 100% THÙ LAO</span>
        </div>
        <h1 class="text-2xl @2xl:text-4xl font-black text-slate-900 tracking-tight">
          Đăng Tin Tuyển Dụng
        </h1>
        <p class="text-xs @2xl:text-sm text-slate-500 mt-1.5 max-w-2xl leading-relaxed">
          Tin của bạn xuất hiện trên sàn ngay sau khi đăng. Thù lao được ký quỹ trước để freelancer yên tâm nhận việc.
        </p>
      </div>

      <!-- Quick Action: Switch to Marketplace & MySQL Live Status -->
      <div class="flex flex-wrap items-center gap-3">
        <button
          @click="$emit('viewMarketplace')"
          class="px-5 py-2.5 rounded-2xl text-xs font-bold font-mono bg-platinum-100 hover:bg-platinum-200 text-slate-700 transition-all active:scale-95 shadow-xs flex items-center gap-2"
        >
          <span>Xem sàn việc làm</span>
          <span>&rarr;</span>
        </button>
      </div>
    </div>

    <!-- ===================================================================== -->
    <!-- 2. TWO-COLUMN WORKFLOW: FORM INPUT (65%) & LIVE PREVIEW (35%)         -->
    <!-- ===================================================================== -->
    <div class="grid grid-cols-1 @5xl:grid-cols-12 gap-8 items-start">
      
      <!-- LEFT COLUMN: ENTERPRISE POSTING FORM (7 COLS / 60-65%) -->
      <div class="@5xl:col-span-7 space-y-6">
        
        <div class="reveal-init reveal-from-left p-6 @2xl:p-8 rounded-3xl bg-white border border-platinum-200/90 shadow-xs space-y-6">
          
          <div class="border-b border-platinum-100 pb-4">
            <h2 class="text-lg font-black text-slate-900 flex items-center gap-2">
              <span class="w-6 h-6 rounded-lg bg-champagne-400 text-slate-900 font-mono text-xs flex items-center justify-center font-bold">1</span>
              <span>Thông Tin Chi Tiết Dự Án</span>
            </h2>
            <p class="text-xs text-slate-500 mt-1">
              Chọn đúng lĩnh vực và kỹ năng để tin của bạn đến đúng ứng viên.
            </p>
          </div>

          <form @submit.prevent="openEscrowModal" class="space-y-5">
            
            <!-- Project Title -->
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1 font-mono">
                Tiêu Đề Dự Án <span class="text-rose-500">*</span>
              </label>
              <input
                v-model="form.title"
                required
                type="text"
                placeholder="Ví dụ: Xây dựng Dashboard Quản Trị Hệ Thống với Vue 3 & Three.js..."
                class="w-full px-4 py-3 bg-platinum-50/80 border border-platinum-300 rounded-2xl text-xs @2xl:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-champagne-400 focus:bg-white transition-all font-sans"
              />

              <!-- Fast Title Templates Pills -->
              <div class="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                <span class="text-slate-400 font-mono">Mẫu gợi ý:</span>
                <button
                  type="button"
                  v-for="tpl in titleTemplates"
                  :key="tpl.text"
                  @click="applyTemplate(tpl)"
                  class="px-2 py-0.5 rounded-lg bg-platinum-100/70 hover:bg-champagne-100 text-slate-600 hover:text-champagne-800 font-sans text-[11px] transition-colors"
                >
                  {{ tpl.label }}
                </button>
              </div>
            </div>

            <!-- Lĩnh vực & Kỹ năng -->
            <div class="grid grid-cols-1 @2xl:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1 font-mono">
                  Lĩnh Vực <span class="text-rose-500">*</span>
                </label>
                <select
                  v-model="form.category"
                  @change="onCategoryChange"
                  data-testid="post-category"
                  class="w-full px-3.5 py-3 bg-platinum-50/80 border border-platinum-300 rounded-2xl text-xs text-slate-800 focus:outline-none focus:border-champagne-400 focus:bg-white"
                >
                  <option v-for="cat in CATEGORIES" :key="cat.id" :value="cat.id">{{ cat.icon }} {{ cat.label }}</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1 font-mono">
                  Kỹ Năng Yêu Cầu <span class="text-rose-500">*</span>
                </label>
                <select
                  v-model="form.skillTag"
                  title="Kỹ năng là khóa tra cứu trong bảng băm (Horner) — ứng viên lọc theo kỹ năng sẽ thấy tin của bạn ngay"
                  class="w-full px-3.5 py-3 bg-platinum-50/80 border border-platinum-300 rounded-2xl text-xs text-slate-800 focus:outline-none focus:border-champagne-400 focus:bg-white"
                >
                  <option v-for="sk in availableSkills" :key="sk" :value="sk">{{ skillLabel(sk) }}</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 @2xl:grid-cols-2 gap-4">
              <div class="@2xl:col-span-2">
                <label class="block text-xs font-bold text-slate-700 mb-1 font-mono">
                  Loại Hợp Đồng
                </label>
                <div class="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    @click="form.pricingType = 'fixed'"
                    :class="[
                      'py-2.5 rounded-xl text-xs font-bold font-mono transition-all border',
                      form.pricingType === 'fixed'
                        ? 'bg-champagne-100 border-champagne-400 text-champagne-900 shadow-2xs'
                        : 'bg-platinum-50 border-platinum-200 text-slate-500 hover:bg-platinum-100'
                    ]"
                  >
                    Trọn gói
                  </button>
                  <button
                    type="button"
                    @click="form.pricingType = 'hourly'"
                    :class="[
                      'py-2.5 rounded-xl text-xs font-bold font-mono transition-all border',
                      form.pricingType === 'hourly'
                        ? 'bg-champagne-100 border-champagne-400 text-champagne-900 shadow-2xs'
                        : 'bg-platinum-50 border-platinum-200 text-slate-500 hover:bg-platinum-100'
                    ]"
                  >
                    Theo Giờ
                  </button>
                </div>
              </div>
            </div>

            <!-- Budget & Slots -->
            <div class="grid grid-cols-1 @2xl:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1 font-mono">
                  Ngân Sách ($) <span class="text-rose-500">*</span>
                </label>
                <div class="relative">
                  <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 font-mono text-xs">$</span>
                  <input
                    v-model.number="form.budget"
                    required
                    type="number"
                    min="100"
                    max="50000"
                    step="50"
                    class="w-full pl-8 pr-4 py-3 bg-platinum-50/80 border border-platinum-300 rounded-2xl text-xs @2xl:text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-champagne-400 focus:bg-white"
                  />
                </div>
                <div class="mt-1.5 flex items-center gap-1.5">
                  <button
                    type="button"
                    v-for="amt in [1200, 2500, 4800, 8500]"
                    :key="amt"
                    @click="form.budget = amt"
                    class="px-2 py-0.5 rounded-md bg-platinum-100 hover:bg-champagne-100 text-[10px] font-mono text-slate-600 transition-colors"
                  >
                    ${{ amt.toLocaleString() }}
                  </button>
                </div>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1 font-mono">
                  Số Người Cần Tuyển <span class="text-rose-500">*</span>
                </label>
                <input
                  v-model.number="form.slots"
                  required
                  type="number"
                  min="1"
                  max="10"
                  class="w-full px-4 py-3 bg-platinum-50/80 border border-platinum-300 rounded-2xl text-xs @2xl:text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-champagne-400 focus:bg-white"
                />
                <p class="text-[10px] text-slate-400 font-mono mt-1">
                  Mỗi vị trí: ~${{ Math.floor((form.budget || 0) / (form.slots || 1)).toLocaleString() }}
                </p>
              </div>
            </div>

            <!-- Deadline Days -->
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1 font-mono">
                Hạn Chót Bàn Giao Dự Án (Ngày) <span class="text-rose-500">*</span>
              </label>
              <div class="flex items-center gap-3">
                <input
                  v-model.number="form.deadlineDays"
                  required
                  type="range"
                  min="3"
                  max="60"
                  step="1"
                  class="flex-1 accent-champagne-500 cursor-pointer"
                />
                <span class="w-20 px-3 py-2 rounded-xl bg-platinum-100 border border-platinum-300 text-center font-mono font-bold text-xs text-slate-800">
                  {{ form.deadlineDays }} Ngày
                </span>
              </div>
            </div>

            <!-- Job Description -->
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1 font-mono">
                Mô Tả Yêu Cầu & Tiêu Chuẩn Bàn Giao
              </label>
              <textarea
                v-model="form.description"
                rows="4"
                placeholder="Nêu rõ phạm vi công việc, công nghệ cần dùng, yêu cầu về source code, kiểm thử và deadline cam kết..."
                class="w-full px-4 py-3 bg-platinum-50/80 border border-platinum-300 rounded-2xl text-xs @2xl:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-champagne-400 focus:bg-white transition-all font-sans leading-relaxed"
              ></textarea>
            </div>

            <!-- Số dư ví doanh nghiệp: ký quỹ sẽ bị trừ khỏi ví khi đăng tin -->
            <div :class="[
              'p-3.5 rounded-2xl border text-xs font-mono flex flex-wrap items-center justify-between gap-2',
              insufficient ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
            ]">
              <span>💼 Số dư ví {{ businessUser.name }}: <strong>${{ walletBalance.toLocaleString() }}</strong></span>
              <span v-if="!insufficient">Sau khi ký quỹ còn: <strong>${{ (walletBalance - (form.budget || 0)).toLocaleString() }}</strong></span>
              <span v-else>⚠ Không đủ số dư để ký quỹ ${{ (form.budget || 0).toLocaleString() }}</span>
            </div>

            <!-- Submit Button -->
            <div class="pt-2">
              <button
                type="submit"
                :disabled="insufficient"
                :class="insufficient ? 'opacity-50 cursor-not-allowed' : ''"
                class="w-full py-4 rounded-2xl text-sm font-black text-slate-900 bg-gradient-to-r from-champagne-400 via-champagne-300 to-amber-300 hover:brightness-105 active:scale-95 shadow-md transition-all flex items-center justify-center gap-2 font-mono"
              >
                <span>🛡 Đăng tin & ký quỹ ${{ (form.budget || 0).toLocaleString() }}</span>
                <span>&rarr;</span>
              </button>
            </div>

          </form>

        </div>

      </div>

      <!-- RIGHT COLUMN: LIVE PREVIEW & DSA INGESTION PIPELINE (5 COLS / 35-40%) -->
      <div class="@5xl:col-span-5 space-y-6">
        
        <!-- Live Job Card Preview -->
        <div class="reveal-init reveal-from-right p-6 rounded-3xl bg-white border border-platinum-200/90 shadow-xs space-y-4">
          <div class="flex items-center justify-between text-xs font-mono border-b border-platinum-100 pb-2.5">
            <span class="font-bold text-champagne-800 flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-champagne-500 animate-ping"></span>
              <span>XEM TRƯỚC</span>
            </span>
            <span class="text-slate-400">Tin sẽ hiển thị như thế này</span>
          </div>

          <!-- The Rendered Card as it will appear in Marketplace -->
          <div class="p-5 rounded-2xl bg-gradient-to-br from-[#FAF8F5] to-white border border-champagne-300/70 shadow-sm space-y-4">
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 rounded-md bg-champagne-100 text-champagne-800 text-[10px] font-bold border border-champagne-200">
                  {{ CATEGORY_BY_ID[form.category]?.icon }} {{ skillLabel(form.skillTag) }}
                </span>
              </div>
              <div class="text-right">
                <div class="text-xl font-black text-slate-900 font-mono">
                  ${{ (form.budget || 2500).toLocaleString() }}
                </div>
                <div class="text-[10px] text-emerald-600 font-mono font-medium">
                  🛡 Ký quỹ: ${{ (form.budget || 2500).toLocaleString() }}
                </div>
              </div>
            </div>

            <h3 class="text-sm font-bold text-slate-900 leading-snug">
              {{ form.title || 'Tiêu đề dự án của bạn sẽ hiển thị tại đây...' }}
            </h3>

            <div class="flex items-center gap-2 text-[11px] text-slate-500 font-medium font-mono">
              <span class="text-amber-500 font-bold">★ 5.0 (Doanh nghiệp)</span>
              <span>•</span>
              <span>{{ form.deadlineDays }} ngày</span>
              <span>•</span>
              <span>Tuyển 0/{{ form.slots }} người</span>
            </div>

            <div class="pt-3 border-t border-platinum-100 flex items-center justify-between text-[11px] font-mono">
              <span class="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Đang tuyển dụng
              </span>
              <span class="text-champagne-700 font-bold">
                Nộp Hồ Sơ &rarr;
              </span>
            </div>
          </div>
        </div>

        <!-- Escrow Security Assurance Card -->
        <div class="reveal-init reveal-from-right delay-75 p-6 rounded-3xl bg-gradient-to-br from-champagne-50/90 to-white border border-champagne-300/80 shadow-xs space-y-3.5">
          <div class="flex items-center gap-2 text-champagne-900 font-black text-sm">
            <span>🛡 Ký quỹ hoạt động thế nào?</span>
          </div>
          <ul class="text-xs text-slate-600 space-y-2 leading-relaxed">
            <li class="flex items-start gap-2">
              <span class="text-emerald-500 font-bold">✓</span>
              <span><strong>Giữ tiền trước:</strong> ${{ (form.budget || 0).toLocaleString() }} được trừ khỏi ví và giữ riêng cho tin này, freelancer biết chắc sẽ được trả.</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="text-emerald-500 font-bold">✓</span>
              <span title="Hàng đợi FIFO: ai được nhận trước thì được thanh toán trước"><strong>Thanh toán công bằng:</strong> bạn duyệt đơn theo thứ tự đến trước — trả trước.</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="text-emerald-500 font-bold">✓</span>
              <span><strong>Hoàn tiền phần dư:</strong> phần ký quỹ chưa dùng vẫn nằm trong tin, bạn theo dõi được ở trang Ví & Thanh Toán.</span>
            </li>
          </ul>
        </div>

        <p class="text-[11px] text-slate-400 px-2 cursor-help" title="Khi đăng: tạo bản ghi JobPost O(1) → băm kỹ năng vào bảng băm Horner O(1) → chèn mã việc vào cây AVL O(log n). Bấm &quot;Xem thuật toán&quot; ở thanh điều hướng để xem chi tiết.">ⓘ Tin hiển thị cho ứng viên ngay khi đăng — di chuột để xem cách hệ thống xử lý.</p>

      </div>

    </div>

    <!-- ===================================================================== -->
    <!-- 3. MY POSTED JOBS STREAM (FULL-WIDTH HISTORY STREAM)                  -->
    <!-- ===================================================================== -->
    <div class="reveal-init reveal-from-up delay-100 p-6 @2xl:p-8 rounded-3xl bg-white border border-platinum-200/90 shadow-xs space-y-6">
      
      <div class="flex flex-col @2xl:flex-row @2xl:items-center justify-between gap-3 border-b border-platinum-100 pb-4">
        <div>
          <h2 class="text-lg font-black text-slate-900 tracking-tight">
            Tin Bạn Đã Đăng
          </h2>
          <p class="text-xs text-slate-500 mt-0.5">
            Các tin tuyển dụng của doanh nghiệp bạn.
          </p>
        </div>
        <div class="font-mono text-xs text-slate-500">
          Tổng số bài vừa đăng: <strong class="text-champagne-800 font-bold">{{ myJobsList.length }}</strong>
        </div>
      </div>

      <!-- Empty state when no jobs posted yet -->
      <div
        v-if="myJobsList.length === 0"
        class="py-12 text-center text-slate-400 space-y-2 font-sans"
      >
        <div class="text-3xl">📝</div>
        <p class="text-xs">Chưa có dự án nào được đăng trong phiên này. Hãy điền form bên trên để đăng bài đầu tiên!</p>
      </div>

      <!-- Cards Grid of Posted Jobs -->
      <div
        v-else
        class="grid grid-cols-1 @3xl:grid-cols-2 @5xl:grid-cols-3 gap-4"
      >
        <div
          v-for="job in myJobsList"
          :key="job.id"
          class="p-5 rounded-2xl bg-[#FAF8F5] border border-platinum-200 hover:border-champagne-300 transition-all flex flex-col justify-between space-y-3"
        >
          <div>
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-1.5">
                <span class="px-2 py-0.5 rounded-md bg-white border border-platinum-200 text-slate-600 font-mono text-[10px] font-bold">
                  {{ job.id }}
                </span>
                <span v-if="job.isFromMySQL" title="Đã lưu vào cơ sở dữ liệu" class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ✓ Đã lưu
                </span>
              </div>
              <span class="text-sm font-black text-slate-900 font-mono">
                ${{ job.budget.toLocaleString() }}
              </span>
            </div>

            <h4 class="text-xs font-bold text-slate-800 mt-2 line-clamp-2">
              {{ job.title }}
            </h4>

            <div class="mt-2 flex items-center gap-2 text-[10px] text-slate-500 font-mono">
              <span class="text-champagne-700 font-bold">{{ CATEGORY_BY_ID[job.category]?.icon }} {{ skillLabel(job.skillTag) }}</span>
              <span>•</span>
              <span>Tuyển: {{ job.hiredCount }}/{{ job.slots }}</span>
              <span>•</span>
              <span>Hạn: {{ job.deadlineDays }} ngày</span>
            </div>
          </div>

          <div class="pt-2 border-t border-platinum-200/60 flex items-center justify-between text-[10.5px] font-mono">
            <span class="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 font-bold">
              ✓ Đã Khóa Ký Quỹ
            </span>
            <button
              @click="$emit('viewMarketplace')"
              class="text-champagne-700 hover:underline font-bold"
            >
              Xem Trên Sàn &rarr;
            </button>
          </div>
        </div>
      </div>

    </div>

    <!-- ===================================================================== -->
    <!-- 4. MODAL: ESCROW DEPOSIT CONFIRMATION MODAL                            -->
    <!-- ===================================================================== -->
    <div
      v-if="isModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div class="w-full max-w-lg rounded-3xl bg-white border border-platinum-300 shadow-2xl p-6 @2xl:p-8 space-y-6 relative transform transition-all">
        
        <div class="text-center space-y-2">
          <div class="w-14 h-14 rounded-2xl bg-champagne-100 text-champagne-800 mx-auto flex items-center justify-center text-2xl shadow-xs font-mono font-bold">
            🛡
          </div>
          <h3 class="text-xl font-black text-slate-900 tracking-tight">
            Xác Nhận Đăng Tin & Ký Quỹ
          </h3>
          <p class="text-xs text-slate-500">
            Tin sẽ hiển thị công khai trên sàn và thù lao được giữ trước.
          </p>
        </div>

        <div class="p-4 rounded-2xl bg-platinum-50 border border-platinum-200 space-y-2.5 text-xs font-mono">
          <div class="flex items-center justify-between text-slate-600">
            <span>Tiêu đề dự án:</span>
            <strong class="text-slate-900 truncate max-w-[200px]">{{ form.title }}</strong>
          </div>
          <div class="flex items-center justify-between text-slate-600">
            <span>Kỹ năng yêu cầu:</span>
            <strong class="text-champagne-800">{{ categoryLabel(form.category) }} · {{ skillLabel(form.skillTag) }}</strong>
          </div>
          <div class="flex items-center justify-between text-slate-600">
            <span>Số tiền ký quỹ:</span>
            <strong class="text-emerald-700 text-sm font-black">${{ (form.budget || 0).toLocaleString() }} USD</strong>
          </div>
          <div class="flex items-center justify-between text-slate-600">
            <span>Ví doanh nghiệp trước → sau:</span>
            <strong class="text-slate-900">${{ walletBalance.toLocaleString() }} → ${{ (walletBalance - (form.budget || 0)).toLocaleString() }}</strong>
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 pt-2">
          <button
            @click="isModalOpen = false"
            class="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-platinum-100 transition-colors"
          >
            Chỉnh Sửa Lại
          </button>
          <button
            @click="confirmAndPublish"
            :disabled="insufficient"
            :class="insufficient ? 'opacity-50 cursor-not-allowed' : ''"
            class="px-6 py-2.5 rounded-xl text-xs font-bold text-slate-900 bg-gradient-to-r from-champagne-400 to-champagne-300 hover:brightness-105 shadow-md active:scale-95 transition-all font-mono"
          >
            Đồng Ý & Đăng Bài Ngay
          </button>
        </div>

      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import confetti from 'canvas-confetti';
import { authStore } from '../../auth/controllers/AuthStore.js';
import { CATEGORIES, CATEGORY_BY_ID, skillLabel, categoryLabel } from '../models/JobCatalog.js';

const props = defineProps({
  postedJobs: {
    type: Array,
    default: () => []
  },
  totalMarketJobs: {
    type: Number,
    default: 100000
  }
});

const emit = defineEmits(['createJob', 'viewMarketplace']);

// Form State
const form = ref({
  title: '',
  category: 'it',
  skillTag: 'react',
  pricingType: 'fixed',
  budget: 2500,
  slots: 2,
  deadlineDays: 14,
  description: ''
});

const isModalOpen = ref(false);
const businessUser = computed(() => authStore.state.users.business);
const walletBalance = computed(() => Number(businessUser.value.walletBalance) || 0);
const insufficient = computed(() => (Number(form.value.budget) || 0) > walletBalance.value);
const myJobsList = ref([...props.postedJobs]);

// Synchronize session stream with parent store
watch(
  () => props.postedJobs,
  (newJobs) => {
    if (Array.isArray(newJobs) && newJobs.length > 0) {
      myJobsList.value = [...newJobs];
    } else {
      myJobsList.value = [];
    }
  },
  { immediate: true, deep: true }
);

const availableSkills = computed(() => CATEGORY_BY_ID[form.value.category]?.skills || []);
function onCategoryChange() {
  const skills = availableSkills.value;
  if (!skills.includes(form.value.skillTag)) form.value.skillTag = skills[0] || '';
}

const titleTemplates = [
  { label: 'Website bán hàng', text: 'Xây dựng website bán hàng có giỏ hàng và thanh toán online', category: 'it', skill: 'react', budget: 2200 },
  { label: 'Logo thương hiệu', text: 'Thiết kế logo và bộ nhận diện thương hiệu cho quán cà phê', category: 'design', skill: 'branding', budget: 800 },
  { label: 'Chạy quảng cáo', text: 'Chạy quảng cáo Facebook cho cửa hàng thời trang trong 1 tháng', category: 'marketing', skill: 'facebook-ads', budget: 1200 },
  { label: 'Dịch tài liệu', text: 'Dịch hồ sơ công ty từ tiếng Việt sang tiếng Anh (20 trang)', category: 'writing', skill: 'translation-en', budget: 400 },
  { label: 'Dựng video', text: 'Dựng video giới thiệu sản phẩm dài 60 giây', category: 'video', skill: 'video-editing', budget: 600 }
];

let scrollObserver = null;

function applyTemplate(tpl) {
  form.value.title = tpl.text;
  if (CATEGORY_BY_ID[tpl.category]) form.value.category = tpl.category;
  form.value.skillTag = tpl.skill;
  form.value.budget = tpl.budget;
}

function openEscrowModal() {
  if (!form.value.title.trim() || insufficient.value) return;
  onCategoryChange(); // bảo đảm kỹ năng thuộc lĩnh vực đã chọn
  isModalOpen.value = true;
}

function confirmAndPublish() {
  isModalOpen.value = false;
  if (insufficient.value || authStore.state.currentRole !== 'business') return;

  const payload = {
    title: form.value.title.trim(),
    skillTag: form.value.skillTag,
    category: form.value.category,
    budget: form.value.budget,
    slots: form.value.slots,
    deadlineDays: form.value.deadlineDays,
    description: form.value.description
  };

  // Job thật (mã do mảng gốc cấp) được App thêm vào postedJobs -> watch đồng bộ danh sách
  try {
    emit('createJob', payload);
  } catch (err) {
    console.error('[createJob emit error]', err);
  }

  // Confetti celebration
  try {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
  } catch (e) {
    // optional confetti fallback
  }

  // Reset form
  form.value.title = '';
  form.value.budget = 2500;
  form.value.slots = 2;
  form.value.deadlineDays = 14;
  form.value.description = '';
}

// Continuous Re-triggering Scroll Observer
onMounted(() => {
  if ('IntersectionObserver' in window) {
    scrollObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal-visible');
        } else {
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
    document.querySelectorAll('.reveal-init').forEach(el => el.classList.add('reveal-visible'));
  }
});

onUnmounted(() => {
  if (scrollObserver) {
    scrollObserver.disconnect();
    scrollObserver = null;
  }
});
</script>
