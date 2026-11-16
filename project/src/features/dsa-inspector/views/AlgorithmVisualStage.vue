<template>
  <div class="w-full rounded-2xl bg-slate-950/95 border border-platinum-700/60 p-4 relative overflow-hidden shadow-inner text-white select-none">
    
    <!-- Top Stage Header -->
    <div class="flex items-center justify-between pb-2 mb-3 border-b border-white/10 text-[11px] font-mono">
      <div class="flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
        <span class="font-bold text-champagne-300 uppercase tracking-wider">
          Sân Khấu Hoạt Họa Trực Quan (Animated Algorithm Stage)
        </span>
      </div>
      <div class="flex items-center gap-2 text-slate-400 text-[10px]">
        <span>Cảnh:</span>
        <span class="px-2 py-0.5 rounded bg-white/10 text-white font-bold">
          Khung {{ frame }} / 4
        </span>
      </div>
    </div>

    <!-- ===================================================================== -->
    <!-- 1. STAGE: LINKED LIST INSERTION & TRAVERSAL (DANH SÁCH LIÊN KẾT)      -->
    <!-- ===================================================================== -->
    <div v-if="scenario === 'linked_list'" class="min-h-[220px] flex flex-col justify-between relative py-2">
      
      <!-- Top Zone: Dropping Node -->
      <div class="h-16 relative flex items-center justify-end pr-12">
        <transition name="bounce-drop">
          <div
            v-if="frame === 1"
            class="px-3.5 py-2 rounded-2xl bg-gradient-to-r from-champagne-400 to-amber-300 text-slate-900 font-bold font-mono text-xs shadow-lg shadow-champagne-500/30 ring-4 ring-champagne-300/30 flex items-center gap-2 animate-bounce"
          >
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-ping"></span>
            <span>Node Mới: P04 ($2,500)</span>
            <span class="text-[10px] bg-black/20 px-1.5 py-0.5 rounded font-mono">next: null</span>
          </div>
        </transition>
        <span v-if="frame === 1" class="text-[10px] text-champagne-300/70 font-mono absolute top-1 right-12">
          ▼ Rơi xuống kế bên DSLK
        </span>
      </div>

      <!-- Center Zone: Existing Linked List Nodes & Laser Scan Beam -->
      <div class="flex items-center gap-2 overflow-x-auto py-4 px-2 relative">
        
        <!-- HEAD Pointer Indicator -->
        <div class="flex flex-col items-center mr-1">
          <span class="text-[9px] font-mono text-ice-400 font-bold">HEAD</span>
          <span class="text-ice-400 font-bold text-xs">▼</span>
        </div>

        <!-- Node 1: P01 -->
        <div :class="[
          'px-3.5 py-2.5 rounded-2xl border font-mono text-xs transition-all duration-500 flex items-center gap-2',
          frame >= 2
            ? 'bg-emerald-950/80 border-emerald-400 text-emerald-200 shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-400/40 scale-105'
            : 'bg-white/5 border-white/20 text-slate-300'
        ]">
          <div class="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-[10px] font-bold">
            01
          </div>
          <div>
            <div class="font-bold">Node P01</div>
            <div class="text-[9px] text-slate-400">$1,200</div>
          </div>
        </div>

        <!-- Arrow 1 -> 2 -->
        <div :class="[
          'flex items-center transition-colors duration-500',
          frame >= 2 ? 'text-emerald-400' : 'text-slate-600'
        ]">
          <span class="font-mono text-xs font-bold">──➔</span>
        </div>

        <!-- Node 2: P02 -->
        <div :class="[
          'px-3.5 py-2.5 rounded-2xl border font-mono text-xs transition-all duration-500 flex items-center gap-2',
          frame >= 2
            ? 'bg-emerald-950/80 border-emerald-400 text-emerald-200 shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-400/40 scale-105'
            : 'bg-white/5 border-white/20 text-slate-300'
        ]">
          <div class="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-[10px] font-bold">
            02
          </div>
          <div>
            <div class="font-bold">Node P02</div>
            <div class="text-[9px] text-slate-400">$1,800</div>
          </div>
        </div>

        <!-- Arrow 2 -> 3 -->
        <div :class="[
          'flex items-center transition-colors duration-500',
          frame >= 2 ? 'text-emerald-400' : 'text-slate-600'
        ]">
          <span class="font-mono text-xs font-bold">──➔</span>
        </div>

        <!-- Node 3: P03 (TAIL) -->
        <div :class="[
          'px-3.5 py-2.5 rounded-2xl border font-mono text-xs transition-all duration-500 flex items-center gap-2',
          frame >= 2
            ? 'bg-amber-950/80 border-amber-400 text-amber-200 shadow-lg shadow-amber-500/30 ring-4 ring-amber-400/40 scale-105'
            : 'bg-white/5 border-white/20 text-slate-300'
        ]">
          <div class="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px] font-bold">
            03
          </div>
          <div>
            <div class="font-bold flex items-center gap-1">
              <span>Node P03</span>
              <span class="text-[9px] px-1 rounded bg-amber-400/20 text-amber-300 font-bold">TAIL</span>
            </div>
            <div class="text-[9px] text-slate-400">$2,100</div>
          </div>
        </div>

        <!-- Arrow to New Node (Wiring on Frame 3 & 4) -->
        <div v-if="frame >= 3" class="flex items-center text-champagne-400 animate-pulse">
          <span class="font-mono text-xs font-bold">══➔</span>
        </div>

        <!-- Attached New Node (Frame 3 & 4) -->
        <div
          v-if="frame >= 3"
          class="px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-champagne-400 to-amber-300 text-slate-900 border-2 border-white shadow-xl shadow-champagne-500/40 ring-4 ring-champagne-400/30 flex items-center gap-2 transform transition-all duration-500 scale-105"
        >
          <div class="w-5 h-5 rounded-full bg-slate-900 text-champagne-300 flex items-center justify-center text-[10px] font-bold">
            04
          </div>
          <div>
            <div class="font-extrabold font-mono text-xs flex items-center gap-1">
              <span>P04 (MỚI)</span>
              <span class="text-[9px] px-1 rounded bg-black/20 text-slate-900 font-bold">NEW TAIL</span>
            </div>
            <div class="text-[9px] text-slate-800 font-bold font-mono">$2,500</div>
          </div>
        </div>

        <!-- Pointer to NULL (Frame 4) -->
        <div v-if="frame >= 4" class="flex items-center gap-1 text-emerald-400 animate-fade-in">
          <span class="font-mono text-xs font-bold">──➔</span>
          <span class="px-2 py-1 rounded-lg bg-white/10 text-slate-400 text-[10px] font-mono font-bold border border-white/10">
            null
          </span>
        </div>
      </div>

      <!-- Bottom Status Bar -->
      <div class="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-[11px] font-mono">
        <div class="flex items-center gap-2">
          <span v-if="frame === 1" class="text-champagne-300 font-bold">
            ★ Cấp phát ProposalNode mới trong RAM, rơi xuống kế bên DSLK...
          </span>
          <span v-else-if="frame === 2" class="text-ice-300 font-bold flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-ice-400 animate-ping"></span>
            Tia sáng laser đang quét duyệt qua từng node từ Head ➔ Tail P03...
          </span>
          <span v-else-if="frame === 3" class="text-amber-300 font-bold">
            ⚡ Gán con trỏ P03.next = newNode (P04 móc vào đuôi danh sách)...
          </span>
          <span v-else class="text-emerald-400 font-bold">
            ✓ Nối newNode.next = null! Hoàn tất nộp đơn an toàn vào RAM (4 Nodes).
          </span>
        </div>
        <span class="text-slate-400 text-[10px]">Độ phức tạp O(n) tìm đuôi / O(1) chèn đầu</span>
      </div>

    </div>

    <!-- ===================================================================== -->
    <!-- 2. STAGE: HASH TABLE HORNER & DIRECT BUCKET JUMP (BẢNG BĂM)           -->
    <!-- ===================================================================== -->
    <div v-else-if="scenario === 'hash'" class="min-h-[220px] flex flex-col justify-between relative py-2">
      
      <!-- Top: Key characters dropping -->
      <div class="flex items-center justify-between px-3 py-2 bg-white/5 rounded-xl border border-white/10">
        <div class="flex items-center gap-2">
          <span class="text-slate-400 font-mono text-xs">Từ khóa:</span>
          <span class="text-base font-black text-champagne-300 font-mono">"react"</span>
        </div>
        <div class="flex items-center gap-1 font-mono text-[10px]">
          <span
            v-for="(c, idx) in ['r', 'e', 'a', 'c', 't']"
            :key="idx"
            :class="[
              'px-2 py-1 rounded-lg border transition-all duration-300',
              frame >= 1
                ? 'bg-champagne-400/20 border-champagne-400 text-champagne-300 font-bold scale-105'
                : 'bg-white/5 border-white/10 text-slate-500'
            ]"
          >
            {{ c }} ({{ c.charCodeAt(0) }})
          </span>
        </div>
      </div>

      <!-- Center: Horner Funnel & Laser Direct Jump to Bucket -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-center my-3">
        
        <!-- Left Machine: Horner Funnel -->
        <div class="p-3.5 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-amber-400/30 space-y-2 relative">
          <div class="flex justify-between items-center text-[10px] font-mono text-amber-300 font-bold">
            <span>⚙ CỖ MÁY BĂM ĐA THỨC HORNER (CƠ SỐ 31)</span>
            <span v-if="frame >= 2" class="animate-spin text-base">⚙</span>
          </div>
          <div class="p-2 rounded-xl bg-black/40 font-mono text-[11px] text-slate-300 space-y-1">
            <div class="text-[9px] text-slate-500">Công thức băm đa thức tích lũy:</div>
            <div class="text-amber-300 font-bold">h = (h × 31 + charCode) % 133,337</div>
            <div v-if="frame >= 2" class="text-emerald-400 font-extrabold text-xs">
              ⇒ Chỉ số Ô Băm (Bucket Index): #4,210
            </div>
          </div>
        </div>

        <!-- Right Machine: Memory Bucket Strip -->
        <div class="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2">
          <div class="text-[10px] font-mono text-slate-400 flex justify-between">
            <span>MẢNG BỘ NHỚ RAM (133.337 BUCKETS)</span>
            <span class="text-ice-400 font-bold">O(1) Direct Lookup</span>
          </div>
          
          <div class="flex items-center gap-1.5 font-mono text-[10px] py-1 overflow-x-auto">
            <span class="px-2 py-1 rounded bg-white/5 text-slate-600">#4208</span>
            <span class="px-2 py-1 rounded bg-white/5 text-slate-600">#4209</span>
            
            <!-- Target Bucket #4210 -->
            <div :class="[
              'px-3 py-1.5 rounded-xl border font-bold transition-all duration-500 whitespace-nowrap',
              frame >= 3
                ? 'bg-ice-500 text-white border-ice-300 ring-4 ring-ice-400/40 shadow-lg shadow-ice-500/50 scale-110 animate-pulse'
                : 'bg-white/10 border-white/20 text-slate-400'
            ]">
              🎯 BUCKET #4,210
            </div>

            <span class="px-2 py-1 rounded bg-white/5 text-slate-600">#4211</span>
            <span class="px-2 py-1 rounded bg-white/5 text-slate-600">#4212</span>
          </div>

          <!-- Chaining Node (Frame 4) -->
          <div v-if="frame >= 4" class="pt-1 flex items-center gap-2 text-[10px] font-mono animate-fade-in">
            <span class="text-ice-400 font-bold">└─➔ Chaining:</span>
            <span class="px-2 py-0.5 rounded-lg bg-emerald-950 border border-emerald-400 text-emerald-300 font-bold">
              [Node: "react" | 6.250 Jobs] ──➔ null
            </span>
          </div>
        </div>

      </div>

      <!-- Bottom Status Bar -->
      <div class="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-[11px] font-mono">
        <div class="flex items-center gap-2">
          <span v-if="frame === 1" class="text-champagne-300 font-bold">
            ★ Phân rã từ khóa "react" thành 5 mã ASCII đưa vào phễu băm...
          </span>
          <span v-else-if="frame === 2" class="text-amber-300 font-bold">
            ⚙ Tính toán đa thức Horner cơ số 31 mod 133,337 ra chỉ số #4,210...
          </span>
          <span v-else-if="frame === 3" class="text-ice-300 font-bold flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-ice-400 animate-ping"></span>
            Tia laser bắn thẳng trúng ô Bucket #4,210 trong O(1) chỉ sau 1.20 µs!
          </span>
          <span v-else class="text-emerald-400 font-bold">
            ✓ Trả về 6.250 bài đăng việc làm khớp 100%! RAM phát sinh: 0 bytes.
          </span>
        </div>
        <span class="text-emerald-400 text-[10px] font-bold">Độ trễ: 1.20 µs (O(1))</span>
      </div>

    </div>

    <!-- ===================================================================== -->
    <!-- 3. STAGE: AVL TREE BINARY SEARCH & ROTATION (CÂY CÂN BẰNG AVL)        -->
    <!-- ===================================================================== -->
    <div v-else-if="scenario === 'avl'" class="min-h-[220px] flex flex-col justify-between relative py-2">
      
      <!-- Top Target Badge -->
      <div class="flex items-center justify-between px-3 py-2 bg-white/5 rounded-xl border border-white/10 font-mono text-xs">
        <span class="text-slate-400">Khóa cần tìm kiếm:</span>
        <span class="text-champagne-300 font-black text-sm">"JOB-042850"</span>
        <span class="text-[10px] text-ice-400">Độ phức tạp O(log n)</span>
      </div>

      <!-- Center: SVG Binary Tree Structure -->
      <div class="py-2 flex justify-center">
        <div class="w-full max-w-[460px] flex flex-col items-center space-y-3 font-mono text-[10px]">
          
          <!-- Level 1: ROOT -->
          <div :class="[
            'px-4 py-1.5 rounded-2xl border transition-all duration-500 font-bold flex items-center gap-2',
            frame >= 1
              ? 'bg-amber-950 border-amber-400 text-amber-200 ring-4 ring-amber-400/30 scale-105'
              : 'bg-white/10 border-white/20 text-slate-400'
          ]">
            <span class="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>Root: JOB-050000</span>
          </div>

          <!-- Branch Lines & Partition Indicator -->
          <div class="w-full flex justify-between items-center px-12 text-[9px] text-slate-500 font-bold">
            <span :class="frame >= 1 ? 'text-emerald-400 font-bold animate-pulse' : ''">
              ◀ 42,850 &lt; 50,000 (Rẽ Trái)
            </span>
            <span :class="frame >= 1 ? 'text-rose-400 line-through opacity-40' : ''">
              ✕ Loại bỏ 50.000 bài bên phải ▶
            </span>
          </div>

          <!-- Level 2: Children -->
          <div class="w-full flex justify-between px-8">
            <!-- Left Child: 25k (Active branch) -->
            <div :class="[
              'px-3 py-1.5 rounded-xl border transition-all duration-500 font-bold',
              frame >= 2
                ? 'bg-ice-950 border-ice-400 text-ice-200 ring-4 ring-ice-400/30 scale-105'
                : 'bg-white/5 border-white/10 text-slate-500'
            ]">
              Node: JOB-025000
            </div>

            <!-- Right Child: 75k (Pruned branch) -->
            <div :class="[
              'px-3 py-1.5 rounded-xl border border-white/5 text-slate-600 bg-black/40',
              frame >= 1 ? 'opacity-30 line-through' : ''
            ]">
              Node: JOB-075000 (Bỏ qua)
            </div>
          </div>

          <!-- Level 3: Target Grandchild (Frame 3 & 4) -->
          <div class="flex justify-center pt-1">
            <div :class="[
              'px-4 py-2 rounded-2xl border-2 transition-all duration-500 font-bold flex items-center gap-2',
              frame >= 4
                ? 'bg-emerald-500 text-slate-900 border-white shadow-xl shadow-emerald-500/50 ring-4 ring-emerald-300/40 scale-110 animate-bounce'
                : frame >= 3
                ? 'bg-ice-900/80 border-ice-400 text-ice-200'
                : 'opacity-0'
            ]">
              <span>🎯 ĐÍCH ĐẾN: JOB-042850</span>
              <span class="text-[9px] bg-black/20 px-1.5 py-0.5 rounded">16 So Sánh</span>
            </div>
          </div>

        </div>
      </div>

      <!-- Bottom Status Bar -->
      <div class="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-[11px] font-mono">
        <div class="flex items-center gap-2">
          <span v-if="frame === 1" class="text-amber-300 font-bold">
            ★ So sánh tại Root: 42,850 &lt; 50,000 ➔ Rẽ TRÁI, loại bỏ 50.000 bài bên phải!
          </span>
          <span v-else-if="frame === 2" class="text-ice-300 font-bold">
            ⚡ So sánh tại Node JOB-025000: 42,850 &gt; 25,000 ➔ Rẽ PHẢI, không gian còn 12.500 bài.
          </span>
          <span v-else-if="frame === 3" class="text-amber-300 font-bold">
            🌲 Kiểm tra cân bằng AVL: BF = 0 ∈ {-1, 0, 1}. Chiều cao cây khống chế h = 17 tầng!
          </span>
          <span v-else class="text-emerald-400 font-bold">
            🎯 Tìm thấy bài đăng JOB-042850 sau 16 phép so sánh! Nhanh hơn duyệt mảng 99.98%.
          </span>
        </div>
        <span class="text-ice-400 text-[10px] font-bold">Độ cao: h=17 (O(log n))</span>
      </div>

    </div>

    <!-- ===================================================================== -->
    <!-- 4. STAGE: STACK LIFO (NGĂN XẾP HOÀN TÁC BÁO GIÁ)                      -->
    <!-- ===================================================================== -->
    <div v-else-if="scenario === 'stack'" class="min-h-[220px] flex flex-col justify-between relative py-2">
      
      <div class="flex justify-between items-center text-xs font-mono text-slate-400 px-2">
        <span>CƠ CHẾ HOÀN TÁC BÁO GIÁ (UNDO)</span>
        <span class="text-amber-400 font-bold">Nguyên lý LIFO: Vào Sau, Ra Trước</span>
      </div>

      <!-- Center: Vertical Acrylic Cylinder Stack -->
      <div class="flex justify-center items-center py-2">
        <div class="w-64 border-x-2 border-b-2 border-amber-400/50 rounded-b-2xl p-2.5 bg-black/40 space-y-2 flex flex-col justify-end min-h-[140px]">
          
          <!-- Top frame being Popped or Pushed -->
          <transition name="pop-up">
            <div
              v-if="frame !== 3"
              :class="[
                'p-2.5 rounded-xl font-mono text-xs font-bold transition-all duration-500 flex items-center justify-between',
                frame === 1
                  ? 'bg-champagne-400 text-slate-900 shadow-md ring-2 ring-champagne-300 animate-bounce'
                  : frame === 2
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/50 ring-4 ring-rose-400/40 animate-pulse'
                  : 'bg-emerald-950 border border-emerald-400 text-emerald-200'
              ]"
            >
              <div class="flex items-center gap-1.5">
                <span>▲ TOP: APPLY("JOB-1234")</span>
              </div>
              <span class="text-[9px] bg-black/20 px-1 py-0.5 rounded">$2,500</span>
            </div>
          </transition>

          <!-- Middle Frame -->
          <div class="p-2 rounded-xl bg-white/10 text-slate-300 font-mono text-[11px] flex justify-between">
            <span>Frame #2: FILTER_SKILL("python")</span>
            <span class="text-[9px] text-slate-500">19:42:01</span>
          </div>

          <!-- Bottom Frame -->
          <div class="p-2 rounded-xl bg-white/5 text-slate-400 font-mono text-[11px] flex justify-between">
            <span>Frame #1: VIEW_JOB("JOB-0089")</span>
            <span class="text-[9px] text-slate-600">19:41:50</span>
          </div>

        </div>
      </div>

      <!-- Bottom Status Bar -->
      <div class="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-[11px] font-mono">
        <div class="flex items-center gap-2">
          <span v-if="frame === 1" class="text-champagne-300 font-bold">
            ★ Thao tác nộp đơn trượt xuống đáy ống, nằm ở Đỉnh (Top) của Ngăn xếp LIFO...
          </span>
          <span v-else-if="frame === 2" class="text-amber-300 font-bold">
            ⚡ Người dùng bấm nút Hoàn tác ➔ Đỉnh ngăn xếp phát sáng chuẩn bị Pop O(1)...
          </span>
          <span v-else-if="frame === 3" class="text-rose-400 font-bold">
            ▲ Thao tác nộp đơn bay vút lên khỏi ống, xóa khỏi bộ nhớ tức thì trong O(1)!
          </span>
          <span v-else class="text-emerald-400 font-bold">
            ✓ Trạng thái tuyển dụng chuyển về OPEN, slot hoàn trả chính xác. 0 lỗi sai lệch!
          </span>
        </div>
        <span class="text-amber-400 text-[10px] font-bold">Chi phí: O(1) Tức thì</span>
      </div>

    </div>

    <!-- ===================================================================== -->
    <!-- 5. STAGE: QUEUE FIFO (HÀNG ĐỢI GIẢI NGÂN ESCROW)                       -->
    <!-- ===================================================================== -->
    <div v-else-if="scenario === 'queue'" class="min-h-[220px] flex flex-col justify-between relative py-2">
      
      <div class="flex justify-between items-center text-xs font-mono text-slate-400 px-2">
        <span>HÀNG ĐỢI GIẢI NGÂN HỢP ĐỒNG ESCROW</span>
        <span class="text-ice-400 font-bold">Nguyên lý FIFO: Vào Trước, Ra Trước</span>
      </div>

      <!-- Center: Horizontal Conveyor Queue -->
      <div class="py-4 px-2 flex items-center justify-between overflow-x-auto">
        
        <!-- EXIT / FRONT (Giải ngân) -->
        <div class="flex flex-col items-center pr-3 border-r border-dashed border-white/20">
          <span class="text-[9px] font-mono text-emerald-400 font-bold">FRONT (ĐẦU RA)</span>
          <span class="text-emerald-400 text-xs font-bold">◀ Giải Ngân</span>
        </div>

        <!-- Conveyor Tickets -->
        <div class="flex items-center gap-3 px-3">
          
          <!-- Ticket 1 (Next in line to get paid) -->
          <div :class="[
            'px-3.5 py-2.5 rounded-2xl border font-mono text-xs transition-all duration-500',
            frame === 3
              ? 'bg-emerald-500 text-slate-900 border-white shadow-xl shadow-emerald-500/50 scale-110 -translate-x-4 animate-pulse'
              : 'bg-emerald-950/80 border-emerald-400 text-emerald-200'
          ]">
            <div class="font-bold flex items-center gap-1">
              <span>Vé #01</span>
              <span class="text-[9px] px-1 rounded bg-emerald-400/20 text-emerald-300">Hoàn tất</span>
            </div>
            <div class="text-[10px] text-emerald-300 font-bold">$1,500 ➔ Ví Freelancer</div>
          </div>

          <span class="text-slate-600 font-mono text-xs font-bold">◀──</span>

          <!-- Ticket 2 -->
          <div class="px-3 py-2 rounded-2xl bg-white/5 border border-white/10 text-slate-400 font-mono text-xs">
            <div class="font-bold">Vé #02</div>
            <div class="text-[10px] text-slate-500">$2,000 (Đang nghiệm thu)</div>
          </div>

          <span class="text-slate-600 font-mono text-xs font-bold">◀──</span>

          <!-- Ticket 3 (Entering from REAR on frame 1) -->
          <div :class="[
            'px-3.5 py-2 rounded-2xl border font-mono text-xs transition-all duration-500',
            frame >= 1
              ? 'bg-champagne-400 text-slate-900 border-white shadow-lg ring-2 ring-champagne-300'
              : 'opacity-0'
          ]">
            <div class="font-bold">Vé #03 (MỚI)</div>
            <div class="text-[10px] text-slate-800 font-bold">$2,500 (Nạp Đuôi)</div>
          </div>

        </div>

        <!-- ENQUEUE / REAR (Đầu vào) -->
        <div class="flex flex-col items-center pl-3 border-l border-dashed border-white/20">
          <span class="text-[9px] font-mono text-ice-400 font-bold">REAR (ĐẦU VÀO)</span>
          <span class="text-ice-400 text-xs font-bold">◀ Nạp Vé Mới</span>
        </div>

      </div>

      <!-- Bottom Status Bar -->
      <div class="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-[11px] font-mono">
        <div class="flex items-center gap-2">
          <span v-if="frame === 1" class="text-champagne-300 font-bold">
            ★ Vé giải ngân mới nạp vào đuôi REAR của Hàng đợi FIFO...
          </span>
          <span v-else-if="frame === 2" class="text-ice-300 font-bold">
            ⚡ Băng chuyền cuộn tiến: Vé #01 ở đầu FRONT bước vào buồng giải ngân.
          </span>
          <span v-else class="text-emerald-400 font-bold">
            ✓ Vé #01 trượt ra ngoài, giải ngân $1,500 thẳng vào ví Freelancer! 0 thất thoát số dư.
          </span>
        </div>
        <span class="text-emerald-400 text-[10px] font-bold">Công bằng tuyệt đối FIFO</span>
      </div>

    </div>

  </div>
</template>

<script setup>
const props = defineProps({
  scenario: {
    type: String,
    default: 'linked_list'
  },
  frame: {
    type: Number,
    default: 1
  }
});
</script>

<style scoped>
.bounce-drop-enter-active {
  animation: bounceDrop 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
@keyframes bounceDrop {
  0% {
    opacity: 0;
    transform: translateY(-40px) scale(0.7);
  }
  70% {
    opacity: 1;
    transform: translateY(10px) scale(1.05);
  }
  100% {
    transform: translateY(0) scale(1);
  }
}

.pop-up-leave-active {
  animation: popUpExit 0.5s cubic-bezier(0.6, -0.28, 0.735, 0.045);
}
@keyframes popUpExit {
  0% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateY(-60px) scale(0.6);
  }
}
</style>
