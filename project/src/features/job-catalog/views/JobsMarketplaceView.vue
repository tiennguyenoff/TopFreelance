<template>
  <div class="w-full flex flex-col space-y-8 pb-20 relative overflow-x-hidden">
    
    <!-- ===================================================================== -->
    <!-- 1. TOP MARKETPLACE HEADER & REAL-TIME DSA METRICS                     -->
    <!-- ===================================================================== -->
    <div class="reveal-init reveal-from-down p-6 @2xl:p-8 rounded-3xl bg-white border border-platinum-200/90 shadow-xs flex flex-col @3xl:flex-row @3xl:items-center justify-between gap-6">
      <div>
        <div
          class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-champagne-100/80 border border-champagne-300/60 text-champagne-800 text-xs font-semibold mb-2"
          title="Toàn bộ tin được lập chỉ mục trong bộ nhớ: bảng băm Horner O(1) cho kỹ năng, cây AVL O(log n) cho mã việc."
        >
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span>{{ props.jobs.length.toLocaleString() }} việc đang tuyển · {{ CATEGORIES.length }} lĩnh vực</span>
        </div>
        <h1 class="text-2xl @2xl:text-4xl font-black text-slate-900 tracking-tight">
          Tìm Việc Freelance
        </h1>
        <p class="text-xs @2xl:text-sm text-slate-500 mt-1.5 max-w-2xl leading-relaxed">
          Lọc theo lĩnh vực, kỹ năng, ngân sách và độ uy tín của nhà tuyển dụng. Thù lao được ký quỹ trước, bảo đảm quyền lợi cho cả hai bên.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <div v-if="!isFreelancer" class="px-4 py-2.5 rounded-2xl text-[11px] font-mono font-semibold bg-champagne-50 border border-champagne-200 text-champagne-800 max-w-xs leading-snug">
          🏢 Bạn đang ở vai trò <strong>Doanh nghiệp</strong>: xem sàn và tra cứu được, nhưng chỉ Freelancer mới nộp hồ sơ ứng tuyển.
        </div>
      </div>
    </div>

    <!-- ===================================================================== -->
    <!-- 2. ADVANCED SEARCH & MULTI-CRITERIA FILTER SUITE                      -->
    <!-- ===================================================================== -->
    <div class="reveal-init reveal-from-up delay-75 p-6 rounded-3xl bg-white border border-platinum-200/90 shadow-xs space-y-5">
      
      <!-- Row 1: Dual Search Inputs (Horner Hash Skill & AVL Tree JobID) -->
      <div class="grid grid-cols-1 @5xl:grid-cols-12 gap-3.5">
        
        <!-- Search 1: Keyword / Skill Hash Search O(1) -->
        <div class="@5xl:col-span-7 relative min-w-0">
          <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            🔍
          </div>
          <input
            v-model="searchKeyword"
            @input="onSearchKeywordInput"
            @focus="suggestOpen = true"
            @blur="onKeywordBlur"
            @keydown.down.prevent="moveSuggest(1)"
            @keydown.up.prevent="moveSuggest(-1)"
            @keydown.enter.prevent="onKeywordEnter"
            @keydown.esc="suggestOpen = false"
            type="text"
            autocomplete="off"
            placeholder="Tìm theo từ khóa trong tiêu đề, kỹ năng hoặc mã việc..."
            class="w-full pl-10 pr-28 py-3 bg-platinum-50/80 border border-platinum-300 rounded-2xl text-xs @2xl:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-champagne-400 focus:bg-white font-mono transition-all"
          />
          <span
            v-if="searchKeyword.trim()"
            class="absolute top-0 bottom-0 right-3 flex items-center text-[10px] text-champagne-700 bg-champagne-100/80 px-2 py-0.5 my-auto h-fit rounded-lg border border-champagne-300/60 hidden @2xl:inline-flex"
            :title="lastSearchHit ? 'Kết quả lấy từ bộ nhớ đệm LRU — O(1)' : 'Quét tuyến tính toàn bộ danh sách — O(n)'"
          >
            {{ filteredJobs.length.toLocaleString() }} kết quả
          </span>

          <!-- Gợi ý tự động bằng Trie (cây tiền tố) -->
          <div
            v-if="showSuggest"
            class="absolute left-0 right-0 top-full mt-1.5 z-30 bg-white border border-champagne-300/70 rounded-2xl shadow-lg overflow-hidden"
          >
            <div class="flex items-center justify-between gap-2 px-3.5 py-2 bg-champagne-50/80 border-b border-champagne-200/70 text-[10px] font-mono text-champagne-800">
              <span class="truncate min-w-0">Gợi ý cho "<strong>{{ suggestPrefix }}</strong>"</span>
              <button
                type="button"
                @mousedown.prevent="inspectTrie"
                :title="`Gợi ý bằng cây tiền tố Trie — O(L), mất ${suggestTrace?.latency || ''}`"
                class="shrink-0 px-2 py-0.5 rounded-lg bg-white border border-champagne-300 hover:bg-champagne-100 font-bold"
              >Cách hoạt động</button>
            </div>
            <ul class="max-h-64 overflow-y-auto py-1">
              <li v-for="(sg, i) in suggestions" :key="sg.word">
                <button
                  type="button"
                  @mousedown.prevent="applySuggestion(sg.word)"
                  @mouseenter="suggestIndex = i"
                  :class="[
                    'w-full flex items-center justify-between gap-3 px-3.5 py-2 text-left text-xs font-mono transition-colors',
                    suggestIndex === i ? 'bg-champagne-100/80 text-slate-900' : 'text-slate-700 hover:bg-platinum-50'
                  ]"
                >
                  <span class="truncate min-w-0"><strong class="text-champagne-700">{{ sg.word.slice(0, suggestPrefix.length) }}</strong>{{ sg.word.slice(suggestPrefix.length) }}</span>
                  <span class="shrink-0 text-[10px] text-slate-400">{{ sg.count.toLocaleString() }} việc</span>
                </button>
              </li>
            </ul>
          </div>
        </div>

        <!-- Search 2: Direct JobID Binary Search / AVL O(log n) -->
        <div class="@5xl:col-span-5 relative flex items-center gap-2 min-w-0">
          <input
            v-model="searchJobId"
            @keyup.enter="onLookupJobId"
            type="text"
            placeholder="Nhập mã việc, ví dụ JOB-042850"
            class="flex-1 min-w-0 px-4 py-3 bg-platinum-50/80 border border-platinum-300 rounded-2xl text-xs @2xl:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-ice-400 focus:bg-white font-mono uppercase transition-all"
          />
          <button
            @click="onLookupJobId"
            class="px-4 py-3 rounded-2xl bg-ice-500 hover:bg-ice-600 text-white font-bold text-xs transition-all active:scale-95 shadow-xs whitespace-nowrap font-mono flex items-center gap-1.5"
            title="Tra cứu trên cây AVL — O(log n)"
          >
            <span>Tìm mã</span>
          </button>
        </div>

      </div>

      <!-- Row 2: Range Filters & MergeSort Selector -->
      <div class="pt-4 border-t border-platinum-100 grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-4 items-center text-xs">
        
        <!-- Budget Range Filter -->
        <div class="flex items-center gap-2 bg-platinum-50/70 p-1.5 rounded-xl border border-platinum-200">
          <span class="text-slate-500 font-mono text-[11px] pl-2 whitespace-nowrap">Ngân sách $:</span>
          <input
            v-model.number="minBudget"
            type="number"
            placeholder="Min"
            class="flex-1 min-w-0 w-full max-w-[110px] px-2 py-1 bg-white border border-platinum-200 rounded-lg text-xs font-mono focus:outline-none focus:border-champagne-400"
          />
          <span class="text-slate-400">-</span>
          <input
            v-model.number="maxBudget"
            type="number"
            placeholder="Max"
            class="flex-1 min-w-0 w-full max-w-[110px] px-2 py-1 bg-white border border-platinum-200 rounded-lg text-xs font-mono focus:outline-none focus:border-champagne-400"
          />
        </div>

        <!-- Client Rating Filter -->
        <div class="flex items-center gap-2 bg-platinum-50/70 p-1.5 rounded-xl border border-platinum-200">
          <span class="text-slate-500 font-mono text-[11px] pl-2 whitespace-nowrap">Đánh giá nhà tuyển dụng:</span>
          <select
            v-model="minRating"
            class="flex-1 min-w-0 bg-white border border-platinum-200 rounded-lg px-2 py-1 text-xs font-medium focus:outline-none focus:border-champagne-400"
          >
            <option :value="0">Tất cả đánh giá</option>
            <option :value="4.5">★ 4.5 trở lên</option>
            <option :value="4.8">★ 4.8 xuất sắc</option>
            <option :value="5.0">★ 5.0 tuyệt đối</option>
          </select>
        </div>

        <!-- Sorting Algorithm: MergeSort Multi-Key -->
        <div class="@2xl:col-span-2 flex items-center gap-2 bg-platinum-50/70 p-1.5 rounded-xl border border-platinum-200">
          <span class="text-slate-500 font-mono text-[11px] pl-2 whitespace-nowrap">Sắp xếp:</span>
          <select
            v-model="selectedSort"
            @change="onSortChange"
            title="Sắp xếp bằng MergeSort (ổn định, O(n log n)); 'Uy tín' dùng điểm trung bình Bayes"
            class="flex-1 min-w-0 bg-white border border-platinum-200 rounded-lg px-3 py-1 text-xs font-bold text-slate-700 focus:outline-none focus:border-champagne-400"
          >
            <option value="default">Mặc định</option>
            <option value="budget_desc">Ngân sách cao nhất</option>
            <option value="budget_asc">Ngân sách thấp nhất</option>
            <option value="rating_desc">Nhà tuyển dụng được đánh giá cao</option>
            <option value="bayes_desc">Uy tín (tính cả số lượt đánh giá)</option>
            <option value="deadline_asc">Sắp hết hạn nộp</option>
          </select>
        </div>

      </div>

      <!-- Row 3: Lĩnh vực -->
      <div class="flex flex-wrap items-center gap-1.5 pt-2" data-testid="category-filter">
        <span class="text-slate-400 font-mono text-[11px] mr-1">Lĩnh vực:</span>
        <button
          @click="selectCategory('')"
          :class="['px-2.5 py-1 rounded-xl text-xs transition-all', !activeCategory ? 'bg-slate-900 text-white font-bold' : 'bg-platinum-100/80 hover:bg-champagne-100 text-slate-600']"
        >Tất cả</button>
        <button
          v-for="cat in CATEGORIES"
          :key="cat.id"
          @click="selectCategory(cat.id)"
          :title="`${(categoryCounts[cat.id] || 0).toLocaleString()} việc · lọc bằng cách tra bảng băm cho từng kỹ năng trong lĩnh vực`"
          :class="[
            'px-2.5 py-1 rounded-xl text-xs transition-all flex items-center gap-1',
            activeCategory === cat.id
              ? 'bg-slate-900 text-white font-bold shadow-xs'
              : 'bg-platinum-100/80 hover:bg-champagne-100 text-slate-600 hover:text-champagne-800'
          ]"
        >
          <span>{{ cat.icon }}</span><span>{{ cat.label }}</span>
          <span class="text-[10px] opacity-60">{{ (categoryCounts[cat.id] || 0).toLocaleString() }}</span>
        </button>
      </div>

      <!-- Row 4: Kỹ năng -->
      <div class="flex flex-wrap items-center gap-1.5">
        <span class="text-slate-400 font-mono text-[11px] mr-1">{{ activeCategory ? 'Kỹ năng:' : 'Kỹ năng phổ biến:' }}</span>
        <button
          v-for="skill in popularSkills"
          :key="skill"
          @click="selectSkillTag(skill)"
          title="Tra cứu bảng băm theo kỹ năng — O(1)"
          :class="[
            'px-2.5 py-1 rounded-xl text-xs font-mono transition-all',
            activeSkillTag === skill
              ? 'bg-champagne-400 text-slate-900 font-bold shadow-xs'
              : 'bg-platinum-100/80 hover:bg-champagne-100 text-slate-600 hover:text-champagne-800'
          ]"
        >
          {{ skillLabel(skill) }}
        </button>
        <button
          v-if="activeCategory || activeSkillTag || minBudget || maxBudget || minRating > 0 || searchKeyword"
          @click="resetAllFilters"
          class="text-rose-500 hover:text-rose-600 font-medium text-xs ml-2 transition-colors flex items-center gap-1"
        >
          ✕ Xóa tất cả bộ lọc
        </button>
      </div>

    </div>

    <!-- ===================================================================== -->
    <!-- 2b. VIỆC BẠN VỪA XEM (LRU Cache O(1))                                  -->
    <!-- ===================================================================== -->
    <div v-if="recentJobs.length" class="p-5 rounded-3xl bg-white border border-platinum-200/90 shadow-xs space-y-3 min-w-0">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="min-w-0">
          <h3 class="text-sm font-black text-slate-900">👀 Việc bạn vừa xem</h3>
          <p class="text-[11px] text-slate-400">Lưu {{ recentCapacity }} việc gần nhất, mới nhất bên trái</p>
        </div>
        <button
          type="button"
          @click="inspectRecent"
          :title="`Bộ nhớ đệm LRU ${recentJobs.length}/${recentCapacity}: đầy thì việc xem lâu nhất bị đẩy ra — get/put O(1)`"
          class="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-ice-50 border border-ice-200 text-ice-700 hover:bg-ice-100 transition-colors"
        >Cách hoạt động</button>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="(job, i) in recentJobs"
          :key="job.id"
          type="button"
          @click="openJobDetails(job)"
          class="max-w-full @2xl:max-w-[260px] min-w-0 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-platinum-50 border border-platinum-200 hover:border-champagne-300 hover:bg-champagne-50 text-left transition-colors"
          :title="job.title"
        >
          <span class="shrink-0 w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center" :class="i === 0 ? 'bg-champagne-400 text-slate-900' : 'bg-platinum-200 text-slate-500'">{{ i + 1 }}</span>
          <span class="truncate min-w-0 text-[11px] font-semibold text-slate-700">{{ job.title }}</span>
          <span class="shrink-0 text-[10px] font-mono text-emerald-600">${{ job.budget.toLocaleString() }}</span>
        </button>
      </div>
    </div>

    <!-- ===================================================================== -->
    <!-- 2c. TOP 10 VIỆC NGÂN SÁCH CAO NHẤT (Min-Heap Top-K)                    -->
    <!-- ===================================================================== -->
    <div v-if="topJobs.length" class="p-5 rounded-3xl bg-gradient-to-br from-amber-50/80 via-white to-white border border-amber-200/70 shadow-xs space-y-3 min-w-0">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="min-w-0">
          <h3 class="text-sm font-black text-slate-900">🔥 Top 10 việc ngân sách cao nhất</h3>
          <p class="text-[11px] text-slate-500">Cập nhật ngay khi có tin mới</p>
        </div>
        <button
          type="button"
          @click="inspectTopK"
          :title="`Min-Heap K = 10 trên ${topTrace?.n?.toLocaleString() || 0} việc — O(n log k) ${topTrace?.heapLatency || ''}; sắp xếp toàn bộ O(n log n) ${topTrace?.sortLatency || ''}`"
          class="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-amber-100/80 border border-amber-300/80 text-amber-900 hover:bg-amber-200 transition-colors"
        >Cách hoạt động</button>
      </div>
      <div class="grid grid-cols-[repeat(auto-fill,minmax(min(100%,180px),1fr))] gap-2">
        <button
          v-for="(job, i) in topJobs"
          :key="job.id"
          type="button"
          @click="openJobDetails(job)"
          class="min-w-0 flex items-start gap-2 p-2.5 rounded-2xl bg-white border border-amber-100 hover:border-amber-300 hover:shadow-sm text-left transition-all"
          :title="job.title"
        >
          <span class="shrink-0 w-6 h-6 rounded-lg text-[11px] font-black flex items-center justify-center" :class="i < 3 ? 'bg-amber-400 text-amber-950' : 'bg-amber-100 text-amber-800'">{{ i + 1 }}</span>
          <span class="min-w-0 flex-1">
            <span class="block text-xs font-black text-emerald-600 font-mono">${{ job.budget.toLocaleString() }}</span>
            <span class="block truncate text-[11px] text-slate-600">{{ job.title }}</span>
            <span class="block truncate text-[10px] text-slate-400">{{ categoryIcon(job) }} {{ skillLabel(job.skillTag) }}</span>
          </span>
        </button>
      </div>
    </div>

    <!-- ===================================================================== -->
    <!-- 3. JOBS FEED & VIRTUAL PAGINATION                                     -->
    <!-- ===================================================================== -->
    <div class="space-y-4">
      
      <!-- Stats Summary & Pagination Controls -->
      <div class="flex flex-col @2xl:flex-row @2xl:items-center justify-between gap-3 px-2 text-xs text-slate-500 font-mono">
        <div>
          Hiển thị <strong class="text-slate-900 font-bold">{{ paginatedJobs.length }}</strong> / 
          <span class="text-champagne-700 font-bold">{{ filteredJobs.length.toLocaleString() }}</span> việc phù hợp
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <!-- Items Per Page -->
          <div class="flex items-center gap-1 mr-2">
            <span>Hiển thị:</span>
            <select
              v-model.number="pageSize"
              class="bg-white border border-platinum-200 rounded-lg px-2 py-0.5 text-xs text-slate-700 focus:outline-none"
            >
              <option :value="12">12 bài</option>
              <option :value="24">24 bài</option>
              <option :value="36">36 bài</option>
            </select>
          </div>

          <!-- Pagination Buttons -->
          <button
            @click="currentPage = Math.max(1, currentPage - 1)"
            :disabled="currentPage === 1"
            class="px-3 py-1 rounded-xl bg-white border border-platinum-200 text-slate-700 disabled:opacity-30 hover:border-champagne-400 transition-all shadow-xs"
          >
            ◀ Trang trước
          </button>
          <span class="font-bold text-slate-800 px-1">
            {{ currentPage }} / {{ totalPages }}
          </span>
          <button
            @click="currentPage = Math.min(totalPages, currentPage + 1)"
            :disabled="currentPage >= totalPages"
            class="px-3 py-1 rounded-xl bg-white border border-platinum-200 text-slate-700 disabled:opacity-30 hover:border-champagne-400 transition-all shadow-xs"
          >
            Trang sau ▶
          </button>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-if="paginatedJobs.length === 0"
        class="p-16 text-center rounded-3xl bg-white border border-platinum-200/80 space-y-4"
      >
        <div class="text-4xl">🔍</div>
        <h3 class="text-lg font-bold text-slate-800">Không tìm thấy dự án phù hợp</h3>
        <p class="text-xs text-slate-500 max-w-md mx-auto">
          Không có bài đăng nào khớp với từ khóa hoặc dải ngân sách này. Hãy thử xóa bớt bộ lọc hoặc chọn từ khóa khác.
        </p>
        <button
          @click="resetAllFilters"
          class="px-5 py-2.5 rounded-2xl bg-champagne-400 text-slate-900 font-bold text-xs hover:bg-champagne-300 transition-all shadow-xs"
        >
          Đặt Lại Bộ Lọc
        </button>
      </div>

      <!-- Job Cards Grid (3 Columns Full Width) -->
      <div
        v-else
        class="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-6"
      >
        <div
          v-for="(job, idx) in paginatedJobs"
          :key="job.id"
          :class="[
            'reveal-init p-6 @2xl:p-7 rounded-3xl bg-white border border-platinum-200/90 hover:border-champagne-400 hover:shadow-xl transition-all duration-300 flex flex-col justify-between space-y-5 group transform hover:-translate-y-1',
            idx % 3 === 0 ? 'reveal-from-left' : idx % 3 === 1 ? 'reveal-from-up' : 'reveal-from-right',
            getCardDelayClass(idx)
          ]"
        >
          <!-- Card Header: IDs & Budget -->
          <div>
            <div class="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
              <div class="flex flex-wrap items-center gap-1.5 min-w-0">
                <span class="px-2.5 py-1 rounded-lg bg-platinum-100 text-slate-600 font-mono text-[11px] font-bold border border-platinum-200">
                  {{ job.id }}
                </span>
                <span
                  class="px-2.5 py-1 rounded-lg bg-champagne-100 text-champagne-800 text-[11px] font-bold border border-champagne-200"
                  :title="categoryLabel(job.category)"
                >
                  {{ categoryIcon(job) }} {{ skillLabel(job.skillTag) }}
                </span>
                <span
                  v-if="job.isFromMySQL"
                  class="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-300 flex items-center gap-1 shadow-2xs whitespace-nowrap"
                  title="Tin mới đăng, đã lưu vào cơ sở dữ liệu MySQL"
                >
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Mới
                </span>
              </div>
              <div class="text-right ml-auto shrink-0">
                <div class="text-xl @2xl:text-2xl font-black text-slate-900 font-mono whitespace-nowrap">
                  ${{ job.budget.toLocaleString() }}
                </div>
                <div class="text-[10px] text-emerald-600 font-mono font-medium flex items-center justify-end gap-1 whitespace-nowrap">
                  <span>🛡 Ký quỹ:</span>
                  <strong>${{ job.escrowBalance.toLocaleString() }}</strong>
                </div>
              </div>
            </div>

            <!-- Card Job Title -->
            <h3
              @click="openJobDetails(job)"
              class="text-base font-bold text-slate-900 mt-3.5 group-hover:text-champagne-700 transition-colors leading-snug cursor-pointer"
            >
              {{ job.title }}
            </h3>

            <!-- Card Metadata -->
            <div class="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 font-medium">
              <span class="text-amber-500 font-bold flex items-center gap-1">
                ★ {{ job.clientRating.toFixed(1) }}
                <span class="text-slate-400 font-normal font-mono">({{ job.clientReviews || 0 }})</span>
              </span>
              <span class="text-slate-300">•</span>
              <span>Hạn nộp: <strong class="text-slate-700 font-mono">{{ job.deadlineDays }} ngày</strong></span>
              <span class="text-slate-300">•</span>
              <span>Tuyển: <strong class="text-slate-800 font-mono">{{ job.hiredCount }}/{{ job.slots }}</strong></span>
            </div>
          </div>

          <!-- Card Actions: Details & Apply Bidding -->
          <div class="pt-4 border-t border-platinum-100 flex flex-wrap items-center justify-between gap-2.5">
            <!-- Details Button -->
            <button
              @click="openJobDetails(job)"
              class="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-platinum-50 hover:bg-platinum-100 border border-platinum-200 transition-all font-mono whitespace-nowrap"
            >
              Xem chi tiết
            </button>

            <!-- Apply Proposal Button (chỉ Freelancer) -->
            <span
              v-if="!isFreelancer"
              class="px-3 py-2 rounded-xl text-[11px] font-mono font-semibold text-slate-500 bg-platinum-50 border border-platinum-200 whitespace-nowrap"
              title="Doanh nghiệp không thể ứng tuyển. Đổi sang vai trò Freelancer để nộp hồ sơ."
            >
              {{ job.isAvailable ? `Còn ${job.slots - job.hiredCount} vị trí` : 'Đã đủ người' }}
            </span>
            <button
              v-else
              @click="openApplyModal(job)"
              :disabled="!job.isAvailable || appliedJobIds.has(job.id)"
              :class="[
                'px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 font-mono whitespace-nowrap',
                appliedJobIds.has(job.id)
                  ? 'bg-ice-100 text-ice-800 border border-ice-300'
                  : job.isAvailable
                  ? 'bg-gradient-to-r from-champagne-400 to-champagne-300 text-slate-900 hover:shadow-md hover:brightness-105 active:scale-95'
                  : 'bg-platinum-100 text-slate-400 border border-platinum-200 cursor-not-allowed'
              ]"
            >
              <span>{{ appliedJobIds.has(job.id) ? '✓ Đã Ứng Tuyển' : 'Nộp Hồ Sơ' }}</span>
              <span v-if="!appliedJobIds.has(job.id) && job.isAvailable">&rarr;</span>
            </button>
          </div>

        </div>
      </div>

    </div>

    <!-- ===================================================================== -->
    <!-- 4. MODAL 1: BIDDING PROPOSAL MODAL (LAB 2 DOUBLY LINKED LIST)        -->
    <!-- ===================================================================== -->
    <div
      v-if="isApplyModalOpen && selectedJobForApply"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div class="w-full max-w-lg rounded-3xl bg-white border border-platinum-300 shadow-2xl p-6 @2xl:p-8 space-y-6 relative transform transition-all">
        
        <!-- Modal Header -->
        <div class="flex items-start justify-between gap-4">
          <div>
            <div class="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-champagne-100 text-champagne-800 text-[11px] font-mono font-bold mb-1">
              NỘP HỒ SƠ ỨNG TUYỂN
            </div>
            <h2 class="text-xl font-black text-slate-900">
              Ứng tuyển: {{ selectedJobForApply.title }}
            </h2>
            <p class="text-xs text-slate-500 mt-1">
              {{ categoryIcon(selectedJobForApply) }} {{ skillLabel(selectedJobForApply.skillTag) }} · Mã {{ selectedJobForApply.id }}
            </p>
          </div>
          <button
            @click="isApplyModalOpen = false"
            class="w-8 h-8 rounded-full bg-platinum-100 hover:bg-platinum-200 text-slate-500 hover:text-slate-800 flex items-center justify-center text-sm font-bold transition-colors"
          >
            ✕
          </button>
        </div>

        <!-- Bidding Inputs Form -->
        <div class="space-y-4">
          
          <!-- Freelancer ID -->
          <div>
            <label class="block text-xs font-mono font-bold text-slate-700 mb-1">
              Người ứng tuyển:
            </label>
            <input
              :value="`${authStore.state.users.freelancer.id} — ${authStore.state.users.freelancer.name}`"
              type="text"
              readonly
              class="w-full px-3.5 py-2.5 rounded-xl bg-platinum-100 border border-platinum-300 text-xs font-mono text-slate-600 cursor-not-allowed"
            />
          </div>

          <!-- Proposal Bid Amount -->
          <div>
            <label class="block text-xs font-mono font-bold text-slate-700 mb-1">
              Mức Thù Lao Đề Xuất ($):
            </label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 font-mono text-xs">$</span>
              <input
                v-model.number="bidAmount"
                type="number"
                class="w-full pl-8 pr-4 py-2.5 rounded-xl bg-platinum-50 border border-platinum-300 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-champagne-400"
              />
            </div>
            <p class="text-[10px] text-slate-400 font-mono mt-1">
              Ngân sách niêm yết: ${{ selectedJobForApply.budget.toLocaleString() }} cho {{ selectedJobForApply.slots }} vị trí
              → tối đa ${{ maxBid.toLocaleString() }} / người.
            </p>
            <p v-if="bidError" class="text-[11px] text-rose-600 font-semibold mt-1">{{ bidError }}</p>
          </div>

          <!-- Proposal Cover Letter -->
          <div>
            <label class="block text-xs font-mono font-bold text-slate-700 mb-1">
              Thư Ngỏ & Cam Kết Tiến Độ:
            </label>
            <textarea
              v-model="bidProposalText"
              rows="3"
              placeholder="Tôi có 5 năm kinh nghiệm và cam kết bàn giao sản phẩm đúng tiến độ..."
              class="w-full px-3.5 py-2.5 rounded-xl bg-platinum-50 border border-platinum-300 text-xs text-slate-800 focus:outline-none focus:border-champagne-400"
            ></textarea>
          </div>

          <!-- Chống spam (Token Bucket) — chi tiết khi hover -->
          <div class="flex items-center justify-between gap-2 text-[11px] text-slate-500" data-testid="token-bucket-bar">
            <span
              :title="`Chống spam bằng Token Bucket: tối đa ${tokenInfo.capacity} hồ sơ liên tiếp, nạp lại ${tokenInfo.refillPerSec} token/giây. Mỗi lần nộp lấy 1 token — O(1).`"
            >Bạn còn nộp được <strong class="text-slate-800">{{ Math.floor(tokenInfo.tokens) }}/{{ tokenInfo.capacity }}</strong> hồ sơ liên tiếp</span>
            <button
              @click="inspectTokenBucket"
              class="px-2 py-0.5 rounded-md bg-platinum-100 hover:bg-platinum-200 text-[10px] text-slate-600 transition-colors"
            >Cách hoạt động</button>
          </div>
          <p v-if="rateError" class="text-[11px] text-rose-600 font-semibold">{{ rateError }}</p>

        </div>

        <!-- Modal Footer Actions -->
        <div class="flex items-center justify-end gap-3 pt-3 border-t border-platinum-100">
          <button
            @click="isApplyModalOpen = false"
            class="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-platinum-100 transition-colors"
          >
            Hủy Bỏ
          </button>
          <button
            @click="submitApplyProposal"
            :disabled="!!bidError"
            :class="bidError ? 'opacity-50 cursor-not-allowed' : ''"
            class="px-6 py-2.5 rounded-xl text-xs font-bold text-slate-900 bg-gradient-to-r from-champagne-400 to-champagne-300 hover:brightness-105 shadow-md active:scale-95 transition-all font-mono"
          >
            Gửi hồ sơ ứng tuyển
          </button>
        </div>

      </div>
    </div>

    <!-- ===================================================================== -->
    <!-- 5. MODAL 2: JOB DETAILS & DSLK INSPECTOR MODAL                        -->
    <!-- ===================================================================== -->
    <div
      v-if="isDetailsModalOpen && selectedJobForDetails"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div class="w-full max-w-2xl rounded-3xl bg-white border border-platinum-300 shadow-2xl p-6 @2xl:p-8 space-y-6 relative transform transition-all max-h-[90vh] overflow-y-auto">
        
        <!-- Header -->
        <div class="flex items-start justify-between gap-4">
          <div>
            <div class="flex items-center gap-2 mb-1.5">
              <span class="px-2.5 py-0.5 rounded-md bg-platinum-100 text-slate-600 font-mono text-xs font-bold">
                {{ selectedJobForDetails.id }}
              </span>
              <span class="px-2.5 py-0.5 rounded-md bg-champagne-100 text-champagne-800 text-xs font-bold">
                {{ categoryIcon(selectedJobForDetails) }} {{ categoryLabel(selectedJobForDetails.category) }} · {{ skillLabel(selectedJobForDetails.skillTag) }}
              </span>
            </div>
            <h2 class="text-xl @2xl:text-2xl font-black text-slate-900">
              {{ selectedJobForDetails.title }}
            </h2>
          </div>
          <button
            @click="isDetailsModalOpen = false"
            class="w-8 h-8 rounded-full bg-platinum-100 hover:bg-platinum-200 text-slate-500 hover:text-slate-800 flex items-center justify-center text-sm font-bold transition-colors"
          >
            ✕
          </button>
        </div>

        <!-- Job Specs Grid -->
        <div class="grid grid-cols-2 @2xl:grid-cols-4 gap-3 text-xs font-mono">
          <div class="p-3 rounded-2xl bg-platinum-50 border border-platinum-200">
            <span class="text-slate-400 text-[10px] block">Ngân Sách</span>
            <strong class="text-slate-900 text-sm font-black">${{ selectedJobForDetails.budget.toLocaleString() }}</strong>
          </div>
          <div class="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
            <span class="text-emerald-600 text-[10px] block" title="Tiền nhà tuyển dụng đã nạp trước (Escrow), chỉ giải ngân khi nghiệm thu">Đã ký quỹ</span>
            <strong class="text-emerald-800 text-sm font-black">${{ selectedJobForDetails.escrowBalance.toLocaleString() }}</strong>
          </div>
          <div class="p-3 rounded-2xl bg-platinum-50 border border-platinum-200">
            <span class="text-slate-400 text-[10px] block">Hạn Chót</span>
            <strong class="text-slate-900 text-sm font-black">{{ selectedJobForDetails.deadlineDays }} Ngày</strong>
          </div>
          <div class="p-3 rounded-2xl bg-platinum-50 border border-platinum-200">
            <span class="text-slate-400 text-[10px] block">Đã tuyển</span>
            <strong class="text-slate-900 text-sm font-black">{{ selectedJobForDetails.hiredCount }} / {{ selectedJobForDetails.slots }}</strong>
          </div>
        </div>

        <!-- Description -->
        <div class="space-y-2 text-xs text-slate-600 leading-relaxed">
          <h4 class="font-bold text-slate-900 font-mono uppercase tracking-wider text-[11px]">
            Mô Tả Yêu Cầu Dự Án:
          </h4>
          <p>
            Nhà tuyển dụng cần người có kinh nghiệm về <strong>{{ skillLabel(selectedJobForDetails.skillTag) }}</strong> ({{ categoryLabel(selectedJobForDetails.category) }}). Thù lao đã được ký quỹ trước và được thanh toán theo thứ tự ngay khi công việc được nghiệm thu.
          </p>
        </div>

        <!-- Việc tương tự (Jaccard, Lab 8) -->
        <div v-if="similarJobs.length" class="space-y-2" data-testid="similar-jobs">
          <div class="flex items-center justify-between gap-2">
            <h4 class="font-bold text-slate-900 font-mono uppercase tracking-wider text-[11px]">🧩 Việc tương tự</h4>
            <button
              @click="inspectSimilar"
              :title="`Độ tương đồng Jaccard, so trên ${similarTrace ? similarTrace.m.toLocaleString() : 0} việc cùng kỹ năng`"
              class="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-champagne-50 hover:bg-champagne-100 text-champagne-800 border border-champagne-200 transition-colors"
            >Cách hoạt động</button>
          </div>
          <div class="grid gap-1.5">
            <button
              v-for="(sj, i) in similarJobs"
              :key="sj.id"
              @click="openJobDetails(sj)"
              class="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-platinum-50 hover:bg-champagne-50 border border-platinum-200 text-left transition-colors"
            >
              <span class="min-w-0 truncate text-xs text-slate-700"><strong class="font-mono text-slate-400">{{ sj.id }}</strong> {{ sj.title }}</span>
              <span class="shrink-0 text-[10px] font-mono text-slate-500">
                ${{ sj.budget.toLocaleString() }} ·
                <strong class="text-champagne-700" :title="`Hệ số Jaccard J = ${similarScores[i] ? similarScores[i].score.toFixed(2) : ''}`">{{ similarScores[i] ? Math.round(similarScores[i].score * 100) : 0 }}% giống</strong>
              </span>
            </button>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-platinum-100">
          <!-- Button to trigger AVL visual inspection -->
          <button
            @click="triggerAVLInspection(selectedJobForDetails.id)"
            title="Xem việc này được tìm thấy thế nào trên cây AVL — O(log n)"
            class="px-4 py-2 rounded-xl text-xs font-bold bg-ice-50 hover:bg-ice-100 text-ice-800 border border-ice-200 transition-all flex items-center gap-1.5"
          >
            <span>Cách hệ thống tìm việc này</span>
          </button>

          <button
            @click="isDetailsModalOpen = false"
            class="px-5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-platinum-100 hover:bg-platinum-200 transition-colors"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { DSAActionBridge } from '../../dsa-inspector/controllers/DSAActionBridge.js';
import { MarketplaceEngine } from '../../marketplace-hub/controllers/MarketplaceEngine.js';
import { authStore } from '../../auth/controllers/AuthStore.js';
import { CATEGORIES, CATEGORY_BY_ID, skillLabel, categoryLabel } from '../models/JobCatalog.js';

const props = defineProps({
  jobs: {
    type: Array,
    default: () => []
  },
  jobsVersion: {
    type: Number,
    default: 0
  },
  initialSkill: {
    type: String,
    default: ''
  },
  appliedJobIds: {
    type: Object, // Set
    default: () => new Set()
  }
});

const emit = defineEmits(['applyJob', 'openInspector']);

// State
const searchKeyword = ref('');
const searchJobId = ref('');
const lookedUpJob = ref(null); // kết quả tra cứu AVL
const lookupActive = ref(false); // true = đang lọc theo mã việc
const activeSkillTag = ref('');
const activeCategory = ref('');
const minBudget = ref(null);
const maxBudget = ref(null);
const minRating = ref(0);
const selectedSort = ref('default');
const sortAlgo = ref('mergesort');

const currentPage = ref(1);
const pageSize = ref(12);

// Popular skill tags
const DEFAULT_SKILLS = ['react', 'python', 'figma', 'seo', 'copywriting', 'video-editing', 'accounting', 'english-tutor', 'data-entry', 'autocad'];
const popularSkills = computed(() => CATEGORY_BY_ID[activeCategory.value]?.skills || DEFAULT_SKILLS);
const categoryIcon = (job) => CATEGORY_BY_ID[job?.category]?.icon || '💼';
// Số việc mỗi lĩnh vực (đếm 1 lượt O(n) khi danh sách thay đổi)
const categoryCounts = computed(() => {
  void props.jobsVersion;
  const c = {};
  for (const j of props.jobs) c[j.category] = (c[j.category] || 0) + 1;
  return c;
});

// Modals
const isApplyModalOpen = ref(false);
const selectedJobForApply = ref(null);
const bidAmount = ref(2500);
const isFreelancer = computed(() => authStore.state.currentRole === 'freelancer');
// Mức thầu tối đa = phần ký quỹ của 1 vị trí, để vé giải ngân không vượt số dư Escrow của job
const maxBid = computed(() => {
  const j = selectedJobForApply.value;
  return j ? Math.floor(j.budget / Math.max(1, j.slots)) : 0;
});
const bidError = computed(() => {
  const v = Number(bidAmount.value);
  if (!v || v <= 0) return 'Mức thù lao phải lớn hơn 0.';
  if (v > maxBid.value) return `Mức thù lao không được vượt $${maxBid.value.toLocaleString()} (ngân sách / số vị trí).`;
  return '';
});
const bidProposalText = ref('Tôi cam kết hoàn thành dự án đạt chuẩn kỹ thuật cao nhất và bảo đảm đúng tiến độ thỏa thuận.');

const isDetailsModalOpen = ref(false);
const selectedJobForDetails = ref(null);

let scrollObserver = null;

// =========================================================================
// PIPELINE TRUY VẤN TRÊN CẤU TRÚC DỮ LIỆU THẬT
//   Nguồn chính: AVL (mã việc) | Bảng băm (kỹ năng) | Binary Search (ngân sách) | Mảng gốc
//   -> Tìm tuyến tính theo từ khóa -> lọc uy tín -> MergeSort/QuickSort
// Vết (trace) của lần chạy gần nhất được giữ lại để gửi sang Live Inspector.
// =========================================================================
const lastTraces = { linear: null, hash: null, lru: null, recent: null, category: null };
const lastSearchHit = ref(false);
let lastPreSortList = [];

const hasBudget = computed(() => (Number(minBudget.value) > 0) || (Number(maxBudget.value) > 0));

const filteredJobs = computed(() => {
  // phụ thuộc: số lượng việc & phiên bản chỉ mục (đăng việc mới làm thay đổi AVL/băm/mảng ngân sách)
  void props.jobsVersion;
  void props.jobs.length;

  let list;
  if (lookupActive.value) {
    list = lookedUpJob.value ? [lookedUpJob.value] : [];
  } else if (activeSkillTag.value) {
    const { matches, trace } = MarketplaceEngine.searchSkill(activeSkillTag.value);
    lastTraces.hash = trace;
    list = matches;
    if (hasBudget.value) {
      const lo = Number(minBudget.value) > 0 ? Number(minBudget.value) : 0;
      const hi = Number(maxBudget.value) > 0 ? Number(maxBudget.value) : Infinity;
      list = list.filter(j => j.budget >= lo && j.budget <= hi);
    }
  } else if (activeCategory.value) {
    const { matches, trace } = MarketplaceEngine.searchCategory(activeCategory.value);
    lastTraces.category = trace;
    list = matches;
    if (hasBudget.value) {
      const lo = Number(minBudget.value) > 0 ? Number(minBudget.value) : 0;
      const hi = Number(maxBudget.value) > 0 ? Number(maxBudget.value) : Infinity;
      list = list.filter(j => j.budget >= lo && j.budget <= hi);
    }
  } else if (hasBudget.value) {
    list = MarketplaceEngine.budgetRange(minBudget.value, maxBudget.value).matches;
  } else {
    list = props.jobs;
  }

  if (searchKeyword.value.trim()) {
    // Cache LRU theo (tập nguồn + từ khóa): gõ lại từ khóa cũ thì trả kết quả ngay O(1)
    let scope = 'all';
    if (lookupActive.value) scope = `id:${lookedUpJob.value?.id || '-'}`;
    else if (activeSkillTag.value) scope = `skill:${activeSkillTag.value}`;
    else if (activeCategory.value) scope = `cat:${activeCategory.value}`;
    if (hasBudget.value) scope += `:b${Number(minBudget.value) || 0}-${Number(maxBudget.value) || 0}`;
    scope += `:v${props.jobsVersion}`;
    const res = MarketplaceEngine.cachedSearch(list, searchKeyword.value, scope);
    lastTraces.linear = res.linearTrace;
    lastTraces.lru = res.trace;
    lastSearchHit.value = res.hit;
    list = res.matches;
  }

  if (minRating.value > 0) {
    list = list.filter(j => (j.clientRating || 0) >= minRating.value);
  }

  lastPreSortList = list;
  if (selectedSort.value && selectedSort.value !== 'default') {
    list = MarketplaceEngine.sortList(list, selectedSort.value, sortAlgo.value).sorted;
  }

  return list;
});

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(filteredJobs.value.length / pageSize.value));
});

const paginatedJobs = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredJobs.value.slice(start, start + pageSize.value);
});

// Watch for filter changes to reset to page 1 and re-observe DOM
watch([searchKeyword, activeSkillTag, activeCategory, minBudget, maxBudget, minRating, selectedSort, sortAlgo, pageSize, lookupActive], () => {
  currentPage.value = 1;
  refreshScrollObserver();
});

watch(currentPage, () => {
  refreshScrollObserver();
});

// =========================================================================
// ACTION HANDLERS -> LIVE INSPECTOR (vết thật từ lần chạy pipeline)
// =========================================================================
async function flushPipeline() {
  await nextTick();
  void filteredJobs.value; // bảo đảm computed đã chạy với giá trị mới
}

let keywordTimer = null;
function onSearchKeywordInput() {
  suggestOpen.value = true;
  suggestIndex.value = -1;
  clearTimeout(keywordTimer);
  keywordTimer = setTimeout(async () => {
    if (!searchKeyword.value.trim()) return;
    await flushPipeline();
    emit('openInspector');
    // Cache hit → xem LRU kéo nút lên đầu; cache miss → xem lượt quét tuyến tính thật
    if (lastSearchHit.value && lastTraces.lru) DSAActionBridge.dispatchLRU(lastTraces.lru);
    else if (lastTraces.linear) DSAActionBridge.dispatchLinearSearch(lastTraces.linear);
  }, 450);
}

// -------------------------------------------------------------------------
// GỢI Ý TỰ ĐỘNG — Trie (cây tiền tố) trên từ cuối cùng đang gõ
// -------------------------------------------------------------------------
const suggestOpen = ref(false);
const suggestIndex = ref(-1);
const suggestPrefix = computed(() => {
  const parts = searchKeyword.value.toLowerCase().trimStart().split(/\s+/);
  return parts[parts.length - 1] || '';
});
const suggestResult = computed(() => {
  void props.jobsVersion;
  const p = suggestPrefix.value;
  if (!p) return null;
  return MarketplaceEngine.suggest(p, 8);
});
const suggestions = computed(() => suggestResult.value?.suggestions || []);
const suggestTrace = computed(() => suggestResult.value?.trace || null);
const showSuggest = computed(() =>
  suggestOpen.value && suggestions.value.length > 0 &&
  !(suggestions.value.length === 1 && suggestions.value[0].word === suggestPrefix.value)
);

function moveSuggest(d) {
  if (!showSuggest.value) return;
  const n = suggestions.value.length;
  suggestIndex.value = (suggestIndex.value + d + n) % n;
}

function applySuggestion(word) {
  const parts = searchKeyword.value.trimStart().split(/\s+/);
  parts[parts.length - 1] = word;
  const trace = suggestTrace.value;
  searchKeyword.value = parts.join(' ');
  suggestOpen.value = false;
  suggestIndex.value = -1;
  clearTimeout(keywordTimer);
  if (trace) {
    emit('openInspector');
    DSAActionBridge.dispatchTrieSuggest(trace);
  }
}

function onKeywordEnter() {
  if (showSuggest.value && suggestIndex.value >= 0) {
    applySuggestion(suggestions.value[suggestIndex.value].word);
  } else {
    suggestOpen.value = false;
  }
}

function onKeywordBlur() {
  setTimeout(() => { suggestOpen.value = false; }, 120);
}

function inspectTrie() {
  if (!suggestTrace.value) return;
  emit('openInspector');
  DSAActionBridge.dispatchTrieSuggest(suggestTrace.value);
}

// -------------------------------------------------------------------------
// TOP 10 NGÂN SÁCH — Min-Heap Top-K (tính lại khi có tin mới)
// -------------------------------------------------------------------------
const topResult = computed(() => {
  void props.jobsVersion;
  void props.jobs.length;
  if (!MarketplaceEngine.jobs || !MarketplaceEngine.jobs.length) return null;
  return MarketplaceEngine.topK(10);
});
const topJobs = computed(() => topResult.value?.top || []);
const topTrace = computed(() => topResult.value?.trace || null);

function inspectTopK() {
  if (!topTrace.value) return;
  emit('openInspector');
  DSAActionBridge.dispatchTopK(topTrace.value);
}

// -------------------------------------------------------------------------
// VIỆC BẠN VỪA XEM — LRU Cache dung lượng 8
// -------------------------------------------------------------------------
const recentJobs = ref(MarketplaceEngine.recentlyViewed());
const recentCapacity = MarketplaceEngine.recentViews.capacity;

function inspectRecent() {
  const t = lastTraces.recent || lastTraces.lru;
  if (!t) return;
  emit('openInspector');
  DSAActionBridge.dispatchLRU(t);
}

let budgetTimer = null;
watch([minBudget, maxBudget], () => {
  clearTimeout(budgetTimer);
  budgetTimer = setTimeout(() => {
    if (!hasBudget.value) return;
    // Binary Search 2 biên trên mảng ngân sách đã sắp xếp
    const { trace } = MarketplaceEngine.budgetRange(minBudget.value, maxBudget.value);
    emit('openInspector');
    DSAActionBridge.dispatchBinarySearch(trace);
  }, 600);
});

function onLookupJobId() {
  const target = searchJobId.value.trim();
  if (!target) {
    lookupActive.value = false;
    lookedUpJob.value = null;
    return;
  }
  const { job, trace } = MarketplaceEngine.lookupById(target);
  lookedUpJob.value = job || null;
  lookupActive.value = true;
  emit('openInspector');
  DSAActionBridge.dispatchAVLSearch(trace);
}

watch(searchJobId, (v) => {
  if (!v.trim()) {
    lookupActive.value = false;
    lookedUpJob.value = null;
  }
});

async function selectSkillTag(skill) {
  if (activeSkillTag.value === skill) {
    activeSkillTag.value = '';
    return;
  }
  activeSkillTag.value = skill;
  await flushPipeline();
  if (lastTraces.hash) {
    emit('openInspector');
    DSAActionBridge.dispatchHashSearch(lastTraces.hash);
  }
}

function selectCategory(id) {
  activeCategory.value = activeCategory.value === id ? '' : id;
  activeSkillTag.value = '';
}

async function onSortChange() {
  if (selectedSort.value === 'default') return;
  await flushPipeline();
  if (selectedSort.value === 'bayes_desc') {
    const { trace } = MarketplaceEngine.bayesTrace(lastPreSortList);
    emit('openInspector');
    DSAActionBridge.dispatchBayes(trace);
    return;
  }
  const { trace } = MarketplaceEngine.traceSort(lastPreSortList, selectedSort.value, sortAlgo.value);
  emit('openInspector');
  DSAActionBridge.dispatchSort(trace);
}

function resetAllFilters() {
  searchKeyword.value = '';
  searchJobId.value = '';
  lookupActive.value = false;
  lookedUpJob.value = null;
  activeSkillTag.value = '';
  activeCategory.value = '';
  minBudget.value = null;
  maxBudget.value = null;
  minRating.value = 0;
  selectedSort.value = 'default';
  currentPage.value = 1;
}

watch(() => authStore.state.currentRole, () => { isApplyModalOpen.value = false; });

// initialSkill: "react" (kỹ năng) hoặc "cat:design" (lĩnh vực) — gửi từ trang chủ
function applyInitial(s) {
  if (!s) return;
  if (s.startsWith('cat:')) {
    const id = s.slice(4);
    if (CATEGORY_BY_ID[id]) { activeCategory.value = id; activeSkillTag.value = ''; }
  } else if (activeSkillTag.value !== s) {
    selectSkillTag(s);
  }
}
watch(() => props.initialSkill, applyInitial);

// Modal Handlers
// Token Bucket: 5 hồ sơ / 10 giây cho mỗi freelancer
const tokenInfo = ref({ tokens: 5, capacity: 5, refillPerSec: 0.5 });
const rateError = ref('');
let lastTokenTrace = null;
let tokenTimer = null;
function refreshTokens() {
  tokenInfo.value = MarketplaceEngine.tokenStatus(authStore.state.users.freelancer.id);
  if (rateError.value && tokenInfo.value.tokens >= 1) rateError.value = '';
}
watch(isApplyModalOpen, (open) => {
  clearInterval(tokenTimer);
  tokenTimer = null;
  if (open) {
    refreshTokens();
    tokenTimer = setInterval(refreshTokens, 250);
  }
});
onUnmounted(() => clearInterval(tokenTimer));

function inspectTokenBucket() {
  const st = MarketplaceEngine.tokenStatus(authStore.state.users.freelancer.id);
  const trace = lastTokenTrace || {
    user: authStore.state.users.freelancer.id, allowed: true, tokensBefore: st.tokens, refilled: 0, elapsedMs: 0,
    tokensAfterRefill: st.tokens, tokensAfter: st.tokens, waitMs: 0, capacity: st.capacity, refillPerSec: st.refillPerSec,
    stats: { allowed: 0, rejected: 0, capacity: st.capacity, refillPerSec: st.refillPerSec }, latency: '—', peek: true
  };
  emit('openInspector');
  DSAActionBridge.dispatchTokenBucket(trace);
}

function openApplyModal(job) {
  if (!isFreelancer.value) return;
  selectedJobForApply.value = job;
  bidAmount.value = Math.floor(job.budget / Math.max(1, job.slots));
  rateError.value = '';
  isApplyModalOpen.value = true;
}

function submitApplyProposal() {
  if (!selectedJobForApply.value || bidError.value || !isFreelancer.value) return;

  const gate = MarketplaceEngine.tryApply(authStore.state.users.freelancer.id);
  lastTokenTrace = gate.trace;
  refreshTokens();
  if (!gate.allowed) {
    emit('openInspector');
    DSAActionBridge.dispatchTokenBucket(gate.trace);
    rateError.value = `⛔ Hết token — bạn nộp quá nhanh. Thử lại sau ${(gate.waitMs / 1000).toFixed(1)} giây.`;
    return;
  }

  emit('applyJob', {
    job: selectedJobForApply.value,
    freelancerId: authStore.state.users.freelancer.id,
    bid: bidAmount.value,
    proposalText: bidProposalText.value
  });

  isApplyModalOpen.value = false;
}

const similarJobs = ref([]);
const similarScores = ref([]);
const similarTrace = ref(null);

function inspectSimilar() {
  if (!similarTrace.value) return;
  isDetailsModalOpen.value = false;
  emit('openInspector');
  DSAActionBridge.dispatchJaccard(similarTrace.value);
}

function openJobDetails(job) {
  selectedJobForDetails.value = job;
  isDetailsModalOpen.value = true;
  const sim = MarketplaceEngine.similar(job, 5);
  similarJobs.value = sim ? sim.similar : [];
  similarScores.value = sim ? sim.scores : [];
  similarTrace.value = sim ? sim.trace : null;
  const res = MarketplaceEngine.viewJob(job);
  if (res) {
    lastTraces.recent = res.trace;
    recentJobs.value = MarketplaceEngine.recentlyViewed();
    // Không tự mở Inspector (đang xem modal); nếu Inspector đang mở thì cảnh LRU hiện ngay
    DSAActionBridge.dispatchLRU(res.trace);
  }
}

function triggerAVLInspection(jobId) {
  const { trace } = MarketplaceEngine.lookupById(jobId);
  isDetailsModalOpen.value = false;
  emit('openInspector');
  DSAActionBridge.dispatchAVLSearch(trace);
}

// Helpers for delay classes
function getCardDelayClass(idx) {
  const delays = ['delay-75', 'delay-150', 'delay-225', 'delay-300', 'delay-375', 'delay-450'];
  return delays[idx % delays.length];
}

// =========================================================================
// CONTINUOUS RE-TRIGGERING SCROLL OBSERVER (CUỘN LÊN / CUỘN XUỐNG ĐỀU TÁI KÍCH HOẠT)
// =========================================================================
function refreshScrollObserver() {
  setTimeout(() => {
    if (!scrollObserver) return;
    const elements = document.querySelectorAll('.reveal-init');
    elements.forEach(el => scrollObserver.observe(el));
  }, 100);
}

onMounted(() => {
  applyInitial(props.initialSkill);
  if ('IntersectionObserver' in window) {
    scrollObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal-visible');
        } else {
          // Re-triggering: gỡ bỏ class khi cuộn ra ngoài khung nhìn
          entry.target.classList.remove('reveal-visible');
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -20px 0px'
    });

    refreshScrollObserver();
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
