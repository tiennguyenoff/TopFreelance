<template>
  <div class="w-full flex flex-col rounded-3xl bg-[#090b11] border border-white/10 shadow-2xl overflow-hidden font-sans text-white select-none">

    <!-- TOP STATUS BAR: Action Metadata (Minimal text, max visual) -->
    <div class="px-5 py-3 bg-white/5 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">

      <!-- Left: Action Tag & Lab -->
      <div class="flex items-center gap-2.5">
        <span class="relative flex h-2.5 w-2.5">
          <span :class="[
            'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
            action ? 'bg-emerald-400' : 'bg-ice-400'
          ]"></span>
          <span :class="[
            'relative inline-flex rounded-full h-2.5 w-2.5',
            action ? 'bg-emerald-500' : 'bg-ice-500'
          ]"></span>
        </span>

        <div>
          <div class="font-extrabold text-sm font-mono text-champagne-300 flex items-center gap-2">
            <span>{{ action ? action.title : 'Hệ Thống Đang Ở Trạng Thái Nghỉ (Standby)' }}</span>
            <span v-if="action" class="px-2 py-0.2 rounded-full bg-champagne-400/20 text-champagne-300 text-[10px] border border-champagne-400/30 font-bold">
              {{ action.lab }}
            </span>
          </div>
          <div class="text-[10.5px] text-slate-400 font-mono">
            {{ action ? action.summary : 'Hãy thực hiện một thao tác trên website (tìm kiếm, lọc giá, ứng tuyển, v.v.).' }}
          </div>
        </div>
      </div>

      <!-- Right: Real Performance Badges -->
      <div v-if="action" class="flex items-center gap-2 font-mono text-xs">
        <div class="px-2.5 py-1 rounded-xl bg-white/10 border border-white/10 flex items-center gap-1.5">
          <span class="text-slate-400 text-[10px]">Độ Phức Tạp:</span>
          <strong class="text-champagne-300 font-bold">{{ action.bigO }}</strong>
        </div>
        <div class="px-2.5 py-1 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-bold flex items-center gap-1.5">
          <span class="text-emerald-400 text-[10px]">Độ Trễ:</span>
          <span>{{ action.latency }}</span>
        </div>
      </div>

    </div>

    <!-- MAIN HTML5 CANVAS STAGE (HIGH-DPI 60 FPS INTERPOLATED MOTION) -->
    <div class="relative w-full h-[300px] @2xl:h-[340px] bg-gradient-to-b from-[#090b11] via-[#0d1017] to-[#090b11] overflow-hidden">
      <canvas
        ref="canvasRef"
        class="w-full h-full block cursor-crosshair"
      ></canvas>

      <!-- Frame Step Caption Pill (Overlay bottom left) -->
      <div v-if="action && currentFrameObj" class="absolute bottom-3 left-4 max-w-[85%] px-3.5 py-1.5 rounded-xl bg-black/80 backdrop-blur-md border border-white/15 text-[11px] font-mono flex items-center gap-2 shadow-lg">
        <span class="w-2 h-2 rounded-full bg-champagne-400 animate-pulse"></span>
        <span class="font-bold text-champagne-300">Bước {{ currentFrameIdx + 1 }}/{{ totalFrames }}: {{ currentFrameObj.label }}</span>
      </div>
    </div>

    <!-- BOTTOM CONTROLLER BAR: Slow-motion replay & Step Scrubbing -->
    <div class="px-5 py-3 bg-white/5 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">

      <!-- Left: Playback Controls -->
      <div class="flex items-center gap-2">
        <button
          @click="prevFrame"
          :disabled="!action || currentFrameIdx <= 0"
          class="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 text-slate-300 transition-all text-xs"
        >
          ◀ Trước
        </button>

        <!-- Slow-motion Replay Button -->
        <button
          @click="togglePlay"
          :disabled="!action"
          :class="[
            'px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 text-xs shadow-md',
            isPlaying
              ? 'bg-rose-500 text-white'
              : 'bg-gradient-to-r from-champagne-400 to-amber-300 text-slate-900 hover:brightness-110 disabled:opacity-40'
          ]"
        >
          <span>{{ isPlaying ? '⏸ Tạm Dừng' : '▶ Trình Chiếu Chậm' }}</span>
        </button>

        <button
          @click="nextFrame"
          :disabled="!action || currentFrameIdx >= totalFrames - 1"
          class="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 text-slate-300 transition-all text-xs"
        >
          Kế Tiếp ▶
        </button>
      </div>

      <!-- Center: Frame Scrub Timeline Dots -->
      <div v-if="action" class="flex items-center gap-1.5">
        <button
          v-for="(f, idx) in action.frames"
          :key="idx"
          @click="selectFrame(idx)"
          :class="[
            'w-6 h-6 rounded-lg font-mono text-[10px] font-bold transition-all flex items-center justify-center',
            idx === currentFrameIdx
              ? 'bg-champagne-400 text-slate-900 ring-2 ring-champagne-300 scale-110'
              : idx < currentFrameIdx
              ? 'bg-emerald-600 text-white'
              : 'bg-white/10 text-slate-500 hover:bg-white/20'
          ]"
        >
          {{ idx + 1 }}
        </button>
      </div>

      <!-- Right: Speed Selector & Reset -->
      <div class="flex items-center gap-2">
        <span class="text-slate-400 text-[10px]">Tốc độ:</span>
        <button
          v-for="s in [0.5, 1, 2]"
          :key="s"
          @click="playbackSpeed = s"
          :class="[
            'px-2 py-0.5 rounded text-[10px]',
            playbackSpeed === s
              ? 'bg-champagne-400 text-slate-900 font-bold'
              : 'bg-white/10 text-slate-400 hover:bg-white/20'
          ]"
        >
          {{ s }}x
        </button>

        <button
          v-if="action"
          @click="clearAction"
          class="ml-2 text-slate-500 hover:text-slate-300 text-[10px]"
          title="Chuyển về trạng thái nghỉ"
        >
          ↺ Reset
        </button>
      </div>

    </div>

    <!-- GIẢI THÍCH TRỰC TIẾP -->
    <div v-if="action" class="px-5 py-4 border-t border-white/10 bg-[#0d1017] space-y-3">
      <div class="rounded-2xl bg-champagne-400/10 border border-champagne-400/30 p-3.5">
        <div class="text-[10px] font-mono font-bold uppercase tracking-wider text-champagne-300">
          Bước {{ currentFrameIdx + 1 }}/{{ totalFrames }} · {{ currentFrameObj?.label }}
        </div>
        <p class="mt-1.5 text-[13px] leading-relaxed text-slate-100">{{ currentFrameObj?.desc }}</p>
      </div>

      <div v-if="explain" class="grid gap-3 @xl:grid-cols-2">
        <div class="rounded-2xl bg-white/[0.04] border border-white/10 p-3">
          <div class="text-[11px] font-bold text-sky-300">🧠 Hình dung đời thực</div>
          <p class="mt-1 text-[12px] leading-relaxed text-slate-300">{{ explain.analogy }}</p>
        </div>
        <div class="rounded-2xl bg-white/[0.04] border border-white/10 p-3">
          <div class="text-[11px] font-bold text-emerald-300">⏱ Vì sao là {{ action.bigO }}</div>
          <p class="mt-1 text-[12px] leading-relaxed text-slate-300">{{ explain.why }}</p>
          <p v-if="explain.naive" class="mt-1.5 text-[11.5px] leading-relaxed text-slate-400"><span class="text-rose-300 font-semibold">So với cách thường:</span> {{ explain.naive }}</p>
        </div>
      </div>

      <div v-if="explain?.legend" class="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-slate-300">
        <span class="text-slate-500 font-mono">Màu:</span>
        <span v-for="([c, t]) in explain.legend" :key="t" class="flex items-center gap-1.5">
          <span class="w-2.5 h-2.5 rounded-full" :style="{ background: c }"></span>{{ t }}
        </span>
      </div>

      <details class="group">
        <summary class="cursor-pointer text-[11px] font-mono text-slate-400 hover:text-slate-200">Toàn bộ các bước ({{ totalFrames }}) — bấm để nhảy tới bước</summary>
        <ol class="mt-2 space-y-1">
          <li v-for="(fr, idx) in action.frames" :key="idx">
            <button
              @click="selectFrame(idx)"
              :class="['w-full text-left px-2.5 py-1.5 rounded-lg text-[11.5px] leading-snug transition-colors',
                idx === currentFrameIdx ? 'bg-champagne-400/20 text-champagne-200' : 'text-slate-400 hover:bg-white/5']"
            >
              <span class="font-mono font-bold mr-1.5">{{ idx + 1 }}.</span><span class="font-semibold">{{ fr.label }}</span>
              <span class="block text-slate-500 mt-0.5">{{ fr.desc }}</span>
            </button>
          </li>
        </ol>
      </details>
    </div>

    <!-- THƯ VIỆN BÀI HỌC -->
    <div class="px-5 py-4 border-t border-white/10 bg-white/[0.03]">
      <div class="flex flex-wrap items-baseline justify-between gap-2">
        <div class="text-[12px] font-bold text-champagne-300">📚 Thư viện bài học (7 Lab + thuật toán sàn TMĐT)</div>
        <div class="text-[10.5px] text-slate-500">Chạy cấu trúc dữ liệu thật của dự án và xem từng bước</div>
      </div>
      <div class="mt-2.5 grid gap-2 @xl:grid-cols-2">
        <button
          v-for="l in LESSONS"
          :key="l.id"
          @click="playLesson(l)"
          :class="['text-left rounded-xl border px-3 py-2 transition-colors',
            action && action.type === l.id ? 'border-champagne-400/60 bg-champagne-400/10' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.07]']"
        >
          <div class="flex items-center gap-2">
            <span class="shrink-0 px-1.5 py-0.5 rounded-md bg-champagne-400/20 text-champagne-300 text-[9.5px] font-mono font-bold">{{ l.lab }}</span>
            <span class="text-[12px] font-semibold text-slate-100 truncate">{{ l.name }}</span>
          </div>
          <div class="mt-1 text-[10.5px] text-slate-400 leading-snug">Trên web: {{ l.live }}</div>
        </button>
      </div>
      <p v-if="lessonError" class="mt-2 text-[11px] text-rose-300">{{ lessonError }}</p>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { DSAActionBridge } from '../controllers/DSAActionBridge.js';
import { LESSONS, runLesson } from '../controllers/DSALessons.js';

const emit = defineEmits(['open-telemetry']);
const lessonError = ref('');

// Giải thích bằng ngôn ngữ đời thường cho từng loại cảnh trên canvas
const EXPLAIN = {
  LINEAR_SEARCH: {
    analogy: 'Giống tìm một cuốn sách trong thùng đồ chưa xếp: phải nhấc từng cuốn lên xem cho tới khi thấy.',
    why: 'Dữ liệu không có thứ tự theo từ khóa nên không thể bỏ qua phần tử nào. n gấp đôi → thời gian gấp đôi.',
    naive: 'Đây chính là cách "ngây thơ". Các chỉ mục AVL / bảng băm bên dưới sinh ra để tránh nó.'
  },
  AVL_TREE: {
    analogy: 'Như trò đoán số "cao hơn / thấp hơn": mỗi câu trả lời loại được một nửa số khả năng.',
    why: 'Cây luôn được giữ cân bằng (chênh lệch chiều cao ≤ 1) nên chiều cao ≈ log₂ n; 100.000 việc chỉ cần ~17 bước.',
    naive: 'Quét mảng sẽ cần tới 100.000 lần so sánh.'
  },
  HASH_TABLE: {
    analogy: 'Như tủ hồ sơ có nhãn: đọc tên kỹ năng → tính ra số ngăn → mở đúng ngăn đó, không cần lục các ngăn khác.',
    why: 'Hàm băm Horner biến chuỗi thành số ngăn trong O(độ dài từ khóa). Trung bình mỗi ngăn chỉ có vài phần tử (hệ số tải ≤ 0.75).',
    naive: 'Không có bảng băm phải quét cả 100.000 việc để lọc theo kỹ năng.'
  },
  BINARY_SEARCH: {
    analogy: 'Như mở từ điển: lật giữa cuốn, thấy chữ cái lớn hơn thì bỏ nửa sau, cứ thế chia đôi.',
    why: 'Mảng đã sắp theo ngân sách; mỗi bước bỏ đi một nửa → log₂ n bước để tìm biên của dải giá.',
    naive: 'Quét tuyến tính phải kiểm tra từng việc xem có nằm trong dải giá không.'
  },
  JOB_POST: {
    analogy: 'Đăng tin giống nhập kho: ghi vào sổ cái (mảng gốc) rồi cập nhật các mục lục tra cứu (AVL, bảng băm, mảng sắp xếp).',
    why: 'Chèn AVL O(log n), chèn bảng băm O(1) trung bình. Tất cả chỉ giữ CON TRỎ tới cùng một đối tượng, không sao chép.',
    naive: 'Nếu sao chép đối tượng cho từng chỉ mục, RAM sẽ tăng gấp nhiều lần.'
  },
  LINKED_LIST: {
    analogy: 'Như xếp hàng nối tay: người mới nắm tay người đứng đầu là thành người đầu tiên, không ai phải dịch chỗ.',
    why: 'insertHead chỉ đổi 2–3 con trỏ nên tốn O(1) bất kể danh sách dài bao nhiêu.',
    naive: 'Chèn vào đầu mảng phải dời toàn bộ phần tử sang phải → O(n).'
  },
  DLL_REMOVE: {
    analogy: 'Như rời khỏi hàng nối tay: người trước và người sau tự nắm tay nhau, không ai khác bị ảnh hưởng.',
    why: 'Nút DSLK đôi biết cả prev lẫn next nên khi đã cầm nút thì gỡ ra chỉ mất O(1).',
    naive: 'DSLK đơn phải đi từ đầu để tìm nút đứng trước (xem bài học Lab 2).'
  },
  STACK_LIFO: {
    analogy: 'Như chồng đĩa: đĩa đặt lên sau cùng được lấy ra đầu tiên. Nút "Hoàn tác" khi sửa Hồ sơ năng lực luôn gỡ lần sửa gần nhất (đơn ứng tuyển thì rút bất kỳ, không dùng Stack).',
    why: 'push/pop chỉ thao tác trên đỉnh ngăn xếp → O(1).',
    naive: 'Lưu lịch sử bằng mảng rồi tìm phần tử cuối vẫn được, nhưng Stack diễn đạt đúng ý "làm sau, hoàn tác trước".'
  },
  QUEUE_FIFO: {
    analogy: 'Như xếp hàng ở quầy ngân hàng: ai đến trước được phục vụ trước, không ai chen ngang.',
    why: 'enqueue ở cuối, dequeue ở đầu, mỗi thao tác O(1). Bảo đảm công bằng khi giải ngân.',
    naive: 'Dùng mảng và shift() phần tử đầu sẽ phải dời cả mảng → O(n) mỗi lần.'
  },
  MERGESORT: {
    analogy: 'Như chia bộ bài cho nhiều người, mỗi người xếp phần nhỏ của mình rồi trộn các phần đã xếp lại.',
    why: 'Chia đôi log₂ n tầng, mỗi tầng trộn n phần tử → O(n log n) mọi trường hợp. Ổn định: phần tử bằng nhau giữ nguyên thứ tự.',
    naive: 'Sắp nổi bọt / chọn tốn O(n²): 100.000 việc ≈ 10 tỷ phép so sánh.'
  },
  QUICKSORT: {
    analogy: 'Chọn một "chốt", ai nhỏ hơn đứng bên trái, lớn hơn đứng bên phải, rồi làm lại cho từng bên.',
    why: 'Trung bình O(n log n), thường nhanh nhất thực tế; median-of-three giúp tránh trường hợp xấu O(n²). Không ổn định.',
    naive: 'Sắp nổi bọt / chọn tốn O(n²).'
  },
  STRESS_TEST: {
    analogy: 'Như cho 100.000 khách hàng thao tác cùng lúc rồi kiểm toán sổ sách: không được tuyển quá chỉ tiêu, không lệch tiền ký quỹ.',
    why: 'Mọi thao tác đều O(1) hoặc O(log n) nên 100.000 thao tác chạy trong vài trăm mili-giây với một nhân CPU.',
    naive: 'Nếu dùng quét tuyến tính cho mỗi thao tác sẽ thành 100.000 × 100.000 phép so sánh.'
  },
  LESSON_ARRAY: {
    analogy: 'Như dãy tủ khóa đánh số: biết số tủ thì đi thẳng tới, không cần mở các tủ trước nó.',
    why: 'Các ô nằm liền nhau, cùng kích thước → địa chỉ = gốc + i × kích thước ô. Một phép tính, không phụ thuộc n.',
    naive: 'Nếu chỉ biết nội dung (mã việc) mà không biết số tủ, phải mở lần lượt → O(n).',
    legend: [['#fde047', 'ô đang tính địa chỉ'], ['#34d399', 'ô đọc được sau 1 bước'], ['#fb7185', 'số bước khi quét tuyến tính']]
  },
  LESSON_SLL: {
    analogy: 'Như chuỗi người chỉ đường "đi tiếp hỏi người kia": muốn tới người thứ 3 phải hỏi qua người 1 và 2.',
    why: 'Thêm vào đầu O(1). Xóa theo mã phải tìm nút đứng trước → O(n) vì không có con trỏ ngược.',
    naive: 'DSLK đôi (dùng cho hồ sơ ứng tuyển) có con trỏ prev nên gỡ nút O(1).',
    legend: [['#34d399', 'head / nối tắt mới'], ['#fde047', 'prev'], ['#fb7185', 'current = nút cần xóa'], ['#38bdf8', 'con trỏ next']]
  },
  LESSON_CQUEUE: {
    analogy: 'Như băng chuyền sushi tròn: đĩa chạy hết vòng thì quay lại chỗ cũ, các chỗ trống được dùng lại.',
    why: 'front/rear tăng theo (i + 1) % capacity nên enqueue/dequeue luôn O(1) và không bao giờ phải dời phần tử.',
    naive: 'Hàng đợi bằng mảng thường: dequeue bằng shift() dời toàn bộ mảng → O(n).',
    legend: [['#38bdf8', 'front · vé đang chờ'], ['#d4af37', 'rear · vé vừa xếp hàng'], ['#34d399', 'vé được giải ngân']]
  },
  LESSON_BST_AVL: {
    analogy: 'BST nhận khóa tăng dần giống xếp sách chồng lên một cột duy nhất. AVL như người thủ thư liên tục chia lại cho đều các kệ.',
    why: 'AVL giữ |cao(trái) − cao(phải)| ≤ 1 tại mọi nút bằng 4 phép xoay → chiều cao luôn O(log n).',
    naive: 'BST thường với mã việc tự tăng suy biến thành danh sách → tìm kiếm O(n).',
    legend: [['#fb7185', 'BST thường / trước khi xoay'], ['#34d399', 'AVL / sau khi xoay'], ['#fde047', 'kiểu xoay']]
  },
  LESSON_STABILITY: {
    analogy: 'Hai người cùng điểm thi: xếp hạng "ổn định" giữ ai nộp bài trước thì đứng trước.',
    why: 'Cả hai đều O(n log n), nhưng chỉ MergeSort đảm bảo giữ thứ tự tương đối của các phần tử bằng nhau.',
    naive: 'Cần ổn định khi sắp nhiều tiêu chí liên tiếp (deadline rồi ngân sách).',
    legend: [['#d4af37', 'nhóm cùng ngân sách A'], ['#38bdf8', 'nhóm B'], ['#34d399', 'nhóm C'], ['#fb7185', 'cặp bị đảo thứ tự']]
  },
  LESSON_SELFORG: {
    analogy: 'Như ngăn bàn: món hay dùng để gần tay. MTF đặt ngay lên trên cùng; Transpose chỉ nhích lên một bậc.',
    why: 'Tìm trong danh sách tốn O(k) với k = vị trí. Đưa từ khóa hay dùng về gần đầu làm k nhỏ lại.',
    naive: 'Danh sách cố định không tự sắp xếp: từ khóa hay dùng có thể nằm mãi ở cuối.',
    legend: [['#d4af37', 'Move-to-Front'], ['#38bdf8', 'Transpose'], ['#fde047', 'từ khóa đang tìm']]
  },
  TRIE_SUGGEST: {
    analogy: 'Như tra danh bạ theo vần: gõ "r" mở ngăn R, gõ thêm "e" mở ngăn con RE — mọi từ bắt đầu bằng "re" đã nằm sẵn trong ngăn đó.',
    why: 'Mỗi ký tự là một bước Map.get O(1) nên đi tới nút tiền tố mất O(L) với L = độ dài tiền tố, không phụ thuộc số bài đăng. Sau đó chỉ gom nhánh con nhỏ.',
    naive: 'Không có Trie phải quét toàn bộ từ điển (hoặc cả 100.000 bài đăng) và kiểm tra startsWith từng từ.',
    legend: [['#d4af37', 'cạnh đúng ký tự đã gõ'], ['#fde047', 'ký tự đang xét'], ['#475569', 'nhánh con khác'], ['#34d399', 'từ gợi ý'], ['#fb7185', 'không có cạnh → dừng']]
  },
  HEAP_TOPK: {
    analogy: 'Như giữ bảng "10 người cao nhất": chỉ cần so người mới với người thấp nhất trên bảng; thấp hơn thì khỏi xét.',
    why: 'Min-heap K phần tử giữ phần tử nhỏ nhất ở gốc. Mỗi việc chỉ tốn 1 so sánh nếu bị loại, hoặc O(log K) nếu vào heap → O(n log K).',
    naive: 'Sắp xếp toàn bộ n việc O(n log n) rồi lấy K đầu: làm thừa rất nhiều vì chỉ cần 10 việc.',
    legend: [['#38bdf8', 'gốc = nhỏ nhất Top-K'], ['#34d399', 'việc mới vào heap'], ['#f59e0b', 'đường sift-down'], ['#fb7185', 'bị loại / sắp xếp toàn bộ']]
  },
  LRU_CACHE: {
    analogy: 'Như bàn làm việc chỉ để được vài tập hồ sơ: tập vừa dùng đặt lên trên cùng, hết chỗ thì cất tập lâu không đụng tới nhất.',
    why: 'Map tìm nút O(1); DSLK đôi tháo nút và gắn lên đầu chỉ bằng vài phép gán con trỏ O(1); nút sát TAIL luôn là nút lâu chưa dùng nhất.',
    naive: 'Không cache: mỗi lần gõ lại cùng từ khóa phải quét lại 100.000 việc. Dùng mảng để giữ thứ tự thì dời phần tử tốn O(n).',
    legend: [['#38bdf8', 'bảng băm Map'], ['#fde047', 'nút vừa được truy cập'], ['#34d399', 'nút mới'], ['#fb7185', 'nút bị loại']]
  }
,
  TOKEN_BUCKET: {
    analogy: 'Như vé lượt ở quầy: mỗi lần nộp hồ sơ xé 1 vé; vé được phát lại đều đặn mỗi 2 giây, ví chỉ chứa tối đa 5 vé.',
    why: 'Chỉ lưu 2 số (tokens, lastRefill). Mỗi lần nộp: nạp thêm Δt × tốc độ, so với 1, trừ 1 → O(1) thời gian và bộ nhớ cho mỗi freelancer.',
    naive: 'Lưu thời điểm mọi lần nộp rồi đếm trong cửa sổ 10 giây: tốn O(k) bộ nhớ và phải dọn lịch sử cũ liên tục.',
    legend: [['#34d399', 'token có sẵn'], ['#f59e0b', 'token đang nạp dở'], ['#38bdf8', 'nạp lại theo thời gian'], ['#fb7185', 'bị từ chối']]
  },
  BAYES_RANK: {
    analogy: 'Quán mới có 1 lượt 5★ chưa chắc ngon hơn quán 4.8★ với 500 lượt: ta tạm coi quán mới "như mức trung bình" cho đến khi đủ đánh giá.',
    why: 'score = (v·R + m·C)/(v+m): cộng thêm m "đánh giá ảo" bằng điểm trung bình sàn C. v nhỏ → điểm gần C; v lớn → điểm gần R. C tính 1 lần O(n), sắp xếp O(n log n).',
    naive: 'Sắp theo sao thô: khách có 1 đánh giá 5★ đứng trên khách 500 đánh giá 4.9★ — dễ bị đánh giá ảo thao túng.',
    legend: [['#f59e0b', 'sao thô R'], ['#d4af37', 'điểm Bayes'], ['#38bdf8', 'trung bình sàn C'], ['#fb7185', 'rơi khỏi top vì ít đánh giá']]
  },
  JACCARD_SIM: {
    analogy: 'Hai giỏ hàng càng nhiều món chung (so với tổng số món khác nhau) thì càng giống nhau — giống "sản phẩm tương tự" trên Shopee.',
    why: 'J(A,B) = |A∩B| / |A∪B|. Ứng viên chỉ lấy từ đúng ô băm cùng kỹ năng (O(1) trung bình) nên chỉ so m việc, mỗi lần O(f) với f ≈ 10 đặc trưng; Top-5 bằng min-heap.',
    naive: 'So việc đang xem với cả 100.000 việc trên sàn rồi sắp xếp toàn bộ: O(n·f + n log n) cho mỗi lần mở chi tiết.',
    legend: [['#38bdf8', 'tập A (việc đang xem)'], ['#d4af37', 'tập B (ứng viên)'], ['#34d399', 'đặc trưng chung A∩B'], ['#fde047', 'ô băm cùng kỹ năng']]
  }
};
EXPLAIN.LESSON_TOKEN = EXPLAIN.TOKEN_BUCKET;
EXPLAIN.LESSON_BAYES = EXPLAIN.BAYES_RANK;
EXPLAIN.LESSON_JACCARD = EXPLAIN.JACCARD_SIM;
EXPLAIN.LESSON_TRIE = EXPLAIN.TRIE_SUGGEST;
EXPLAIN.LESSON_HEAP = EXPLAIN.HEAP_TOPK;
EXPLAIN.LESSON_LRU = EXPLAIN.LRU_CACHE;
const explain = computed(() => (action.value ? EXPLAIN[action.value.type] || null : null));

function playLesson(l) {
  lessonError.value = '';
  if (!l.run) { emit('open-telemetry'); return; }
  const res = runLesson(l.id);
  if (!res) lessonError.value = 'Chưa đủ dữ liệu việc làm để chạy bài học này. Hãy đợi sàn nạp xong dữ liệu.';
  nextTick(() => initCanvasSize());
}

const canvasRef = ref(null);
let ctx = null;
let animFrameId = null;
let radarAngle = 0;

const currentFrameIdx = ref(0);
const isPlaying = ref(false);
const playbackSpeed = ref(1);
let playTimer = null;

// Interpolated Motion Physics State
let frameStartTime = performance.now();
const BASE_FRAME_DURATION = 1400; // ms per step for smooth viewing

const action = computed(() => DSAActionBridge.state.activeAction);

const totalFrames = computed(() => {
  return action.value?.frames?.length || 1;
});

const currentFrameObj = computed(() => {
  if (!action.value || !action.value.frames) return null;
  return action.value.frames[currentFrameIdx.value] || action.value.frames[0];
});

// Watch for new actions from user clicks on web
watch(action, (newAction) => {
  if (newAction) {
    stopPlay();
    currentFrameIdx.value = 0;
    frameStartTime = performance.now();
    startPlay(); // Auto play the slow-mo animation for the user's action
    setTimeout(initCanvasSize, 50);
  }
}, { immediate: true });

function selectFrame(idx) {
  currentFrameIdx.value = idx;
  frameStartTime = performance.now();
}

function togglePlay() {
  if (isPlaying.value) {
    stopPlay();
  } else {
    startPlay();
  }
}

function startPlay() {
  if (currentFrameIdx.value >= totalFrames.value - 1) {
    currentFrameIdx.value = 0;
  }
  isPlaying.value = true;
  frameStartTime = performance.now();
  scheduleNextStep();
}

function stopPlay() {
  isPlaying.value = false;
  if (playTimer) {
    clearTimeout(playTimer);
    playTimer = null;
  }
}

function scheduleNextStep() {
  if (!isPlaying.value) return;
  const delay = Math.round(BASE_FRAME_DURATION / playbackSpeed.value);
  playTimer = setTimeout(() => {
    if (currentFrameIdx.value < totalFrames.value - 1) {
      currentFrameIdx.value++;
      frameStartTime = performance.now();
      scheduleNextStep();
    } else {
      stopPlay();
    }
  }, delay);
}

function prevFrame() {
  if (currentFrameIdx.value > 0) {
    currentFrameIdx.value--;
    frameStartTime = performance.now();
  }
}

function nextFrame() {
  if (currentFrameIdx.value < totalFrames.value - 1) {
    currentFrameIdx.value++;
    frameStartTime = performance.now();
  }
}

function clearAction() {
  stopPlay();
  DSAActionBridge.clearAction();
}

// =========================================================================
// EASING & INTERPOLATION MATHEMATICAL FUNCTIONS
// =========================================================================
function lerp(a, b, t) {
  return a + (b - a) * t;
}

function easeOutBounce(x) {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (x < 1 / d1) {
    return n1 * x * x;
  } else if (x < 2 / d1) {
    return n1 * (x -= 1.5 / d1) * x + 0.75;
  } else if (x < 2.5 / d1) {
    return n1 * (x -= 2.25 / d1) * x + 0.9375;
  } else {
    return n1 * (x -= 2.625 / d1) * x + 0.984375;
  }
}

function easeInOutCubic(x) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function easeOutCubic(x) {
  return 1 - Math.pow(1 - x, 3);
}

function easeInQuad(x) {
  return x * x;
}

function easeOutQuad(x) {
  return 1 - (1 - x) * (1 - x);
}

// =========================================================================
// CANVAS RENDERING ENGINE (60 FPS CONTINUOUS RENDER LOOP)
// =========================================================================
function renderLoop() {
  if (!canvasRef.value) return;
  const canvas = canvasRef.value;
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.width / dpr;
  const h = canvas.height / dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  // Background subtle grid
  drawGrid(w, h);

  if (!action.value) {
    // 1. STANDBY / IDLE STATE (Sleek Cyber Radar)
    drawIdleStandby(w, h);
  } else {
    // 2. ACTIVE ACTION GRAPHICAL SIMULATION WITH INTERPOLATION
    const currentFrame = currentFrameIdx.value + 1;

    // Calculate progress (0.0 -> 1.0) for the current step
    const currentDuration = BASE_FRAME_DURATION / playbackSpeed.value;
    const elapsed = performance.now() - frameStartTime;
    const progress = Math.min(1.0, Math.max(0.0, elapsed / currentDuration));

    const d = action.value.data || {};
    const f = currentFrame;
    const p = progress;
    ctx.save();
    try {
      switch (action.value.type) {
        case 'LINEAR_SEARCH': drawLinearSearchCanvas(w, h, d, f, p); break;
        case 'AVL_TREE': drawAVLSearchCanvas(w, h, d, f, p); break;
        case 'HASH_TABLE': drawHashCanvas(w, h, d, f, p); break;
        case 'BINARY_SEARCH': drawBinarySearchCanvas(w, h, d, f, p); break;
        case 'JOB_POST': drawJobPostCanvas(w, h, d, f, p); break;
        case 'LINKED_LIST': drawApplyCanvas(w, h, d, f, p); break;
        case 'DLL_REMOVE': drawWithdrawCanvas(w, h, d, f, p); break;
        case 'STACK_LIFO': drawUndoCanvas(w, h, d, f, p); break;
        case 'QUEUE_FIFO': drawPayoutCanvas(w, h, d, f, p); break;
        case 'MERGESORT':
        case 'QUICKSORT': drawSortCanvas(w, h, d, f, p, totalFrames.value); break;
        case 'STRESS_TEST': drawStressTestCanvas(w, h, d, f, p); break;
        case 'LESSON_ARRAY': drawLessonArray(w, h, d, f, p); break;
        case 'LESSON_SLL': drawLessonSLL(w, h, d, f, p); break;
        case 'LESSON_CQUEUE': drawLessonCQueue(w, h, d, f, p); break;
        case 'LESSON_BST_AVL': drawLessonBstAvl(w, h, d, f, p); break;
        case 'LESSON_STABILITY': drawLessonStability(w, h, d, f, p); break;
        case 'LESSON_SELFORG': drawLessonSelfOrg(w, h, d, f, p); break;
        case 'TRIE_SUGGEST':
        case 'LESSON_TRIE': drawTrieCanvas(w, h, d, f, p); break;
        case 'HEAP_TOPK':
        case 'LESSON_HEAP': drawHeapTopKCanvas(w, h, d, f, p); break;
        case 'LRU_CACHE':
        case 'LESSON_LRU': drawLRUCanvas(w, h, d, f, p); break;
        case 'TOKEN_BUCKET':
        case 'LESSON_TOKEN': drawTokenBucketCanvas(w, h, d, f, p); break;
        case 'BAYES_RANK':
        case 'LESSON_BAYES': drawBayesCanvas(w, h, d, f, p); break;
        case 'JACCARD_SIM':
        case 'LESSON_JACCARD': drawJaccardCanvas(w, h, d, f, p); break;
        default: drawGenericActionCanvas(w, h, action.value);
      }
    } catch (err) {
      // Không để một vết thiếu trường làm dừng vòng lặp vẽ
      ctx.restore();
      ctx.save();
      label('Không vẽ được bước này: ' + err.message, w / 2, h / 2, MONO(11), COL.rose);
    }
    ctx.restore();
  }

  animFrameId = requestAnimationFrame(renderLoop);
}

function drawGrid(w, h) {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.lineWidth = 1;
  const gridSize = 30;
  for (let x = 0; x < w; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
}

// -------------------------------------------------------------------------
// IDLE STANDBY RADAR
// -------------------------------------------------------------------------
function drawIdleStandby(w, h) {
  const cx = w / 2;
  const cy = h / 2 - 15;
  const radius = Math.min(cx, cy) - 25;

  radarAngle += 0.025;

  // Concentric radar circles
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
  ctx.lineWidth = 1.5;
  for (let r = 30; r <= radius; r += 35) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Cross lines
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.1)';
  ctx.beginPath();
  ctx.moveTo(cx - radius, cy);
  ctx.lineTo(cx + radius, cy);
  ctx.moveTo(cx, cy - radius);
  ctx.lineTo(cx, cy + radius);
  ctx.stroke();

  // Radar sweep line
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(radarAngle) * radius, cy + Math.sin(radarAngle) * radius);
  ctx.stroke();

  // Center core dot
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fill();

  // Center standby text
  ctx.fillStyle = '#f8f4eb';
  ctx.font = 'bold 13px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('HỆ THỐNG ĐANG Ở TRẠNG THÁI NGHỈ (STANDBY)', cx, cy + radius + 22);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Thao tác trên sàn: gõ từ khóa, tra mã việc, chọn kỹ năng, lọc giá, sắp xếp, đăng việc, ứng tuyển...', cx, cy + radius + 40);
}

function drawLightBead(ctx, x, y, color) {
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.arc(x, y, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawTreeNode(ctx, x, y, text, color, isHighlight = false) {
  ctx.fillStyle = color;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = isHighlight ? 2.5 : 1;
  drawRoundRect(ctx, x - 55, y - 16, 110, 32, 10);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 10.5px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y + 4);
}

function drawTreeBranch(ctx, x1, y1, x2, y2, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}


// =========================================================================
// BỘ CÔNG CỤ VẼ DÙNG CHUNG
// Mọi cảnh bên dưới chỉ đọc `data` = trace thật do MarketplaceEngine ghi ra.
// =========================================================================
const COL = {
  gold: '#d4af37',
  amber: '#f59e0b',
  green: '#34d399',
  sky: '#38bdf8',
  blue: '#0284c7',
  yellow: '#fde047',
  rose: '#fb7185',
  slate: '#94a3b8',
  dim: '#475569',
  white: '#f8f4eb'
};
const MONO = (s, bold = true) => `${bold ? 'bold ' : ''}${s}px "JetBrains Mono", monospace`;
const SANS = (s) => `${s}px "Plus Jakarta Sans", sans-serif`;
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const fmtMoney = (v) => (v === null || v === undefined ? '—' : '$' + Number(v).toLocaleString('en-US'));
const shortJob = (id) => String(id || '').replace(/^JOB-0*/, '#');
const shortTk = (id) => {
  const s = String(id || '');
  return s.length > 10 ? '…' + s.slice(-8) : s;
};

function panel(x, y, bw, bh, opts = {}) {
  const { fill = 'rgba(212,175,55,0.15)', stroke = COL.gold, lw = 1.5, glow = null, r = 10, alpha = 1 } = opts;
  ctx.save();
  ctx.globalAlpha = alpha;
  if (glow) {
    ctx.shadowColor = glow;
    ctx.shadowBlur = 16;
  }
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lw;
  drawRoundRect(ctx, x, y, bw, bh, r);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function label(str, x, y, font = MONO(11), color = COL.white, align = 'center', alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(str, x, y);
  ctx.restore();
}

function sceneTitle(title, sub) {
  label(title, 18, 24, MONO(12), COL.gold, 'left');
  if (sub) label(sub, 18, 41, SANS(11), COL.slate, 'left');
}

function cornerStat(str, w, color = COL.yellow) {
  label(str, w - 18, 24, MONO(12), color, 'right');
}

function arcPoint(x1, y1, x2, y2, t, lift = 60) {
  return [lerp(x1, x2, t), lerp(y1, y2, t) - Math.sin(Math.PI * t) * lift];
}

function pill(x, y, pw, ph, top, bottom, opts = {}) {
  panel(x - pw / 2, y - ph / 2, pw, ph, opts);
  const a = opts.alpha ?? 1;
  if (bottom) {
    label(top, x, y - 2, MONO(11), opts.text || COL.white, 'center', a);
    label(bottom, x, y + 12, MONO(9.5, false), opts.sub || COL.slate, 'center', a);
  } else {
    label(top, x, y + 4, MONO(11), opts.text || COL.white, 'center', a);
  }
}

// Mũi tên đôi ⇄ giữa hai node của DSLK đôi
function dblArrow(xa, xb, y, color = COL.gold, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  drawArrow(ctx, xa + 2, y - 6, xb - 2, y - 6, color);
  drawArrow(ctx, xb - 2, y + 6, xa + 2, y + 6, 'rgba(56,189,248,0.8)');
  ctx.restore();
}

// Đi qua dãy điểm theo tham số pos (0..len-1, có phần thập phân)
function along(points, pos) {
  if (!points.length) return [0, 0];
  const i = Math.max(0, Math.min(points.length - 1, Math.floor(pos)));
  const t = pos - i;
  if (i + 1 >= points.length) return points[i];
  return [lerp(points[i][0], points[i + 1][0], t), lerp(points[i][1], points[i + 1][1], t)];
}

// -------------------------------------------------------------------------
// 1. TÌM KIẾM TUYẾN TÍNH THEO TỪ KHÓA (mảng gốc)
// -------------------------------------------------------------------------
function drawLinearSearchCanvas(w, h, d, frame, p) {
  sceneTitle(`jobs[0..${(d.n - 1).toLocaleString()}] · từ khóa "${d.keyword}"`, 'Mảng chưa sắp theo từ khóa → duyệt tuần tự từng phần tử');
  const cells = d.window || [];
  const k = cells.length;
  const tailW = 74;
  const cw = Math.min(78, (w - 48 - tailW - 10) / Math.max(k, 1));
  const ch = 54;
  const x0 = 24;
  const y = h * 0.44 - ch / 2;

  let ptr; // vị trí con trỏ i (đơn vị ô)
  if (frame === 1) ptr = easeInOutCubic(p) * Math.max(0, k - 1);
  else if (frame === 2) ptr = (k - 1) + easeInOutCubic(p);
  else ptr = k;

  const shownCmp = frame === 1 ? Math.min(k, Math.floor(ptr) + 1)
    : frame === 2 ? Math.round(lerp(k, d.comparisons, easeInOutCubic(p)))
    : d.comparisons;

  cells.forEach((c, i) => {
    const cx = x0 + i * cw;
    const visited = i <= ptr + 0.001;
    const current = frame === 1 && Math.round(ptr) === i;
    const isFirst = frame === 3 && i === d.firstHit;
    let opts = { fill: 'rgba(255,255,255,0.03)', stroke: '#334155', lw: 1 };
    if (visited) {
      opts = c.hit
        ? { fill: 'rgba(52,211,153,0.18)', stroke: COL.green, lw: 1.6, glow: isFirst ? COL.green : null }
        : { fill: 'rgba(148,163,184,0.10)', stroke: '#64748b', lw: 1 };
    }
    if (current) opts = { ...opts, stroke: COL.yellow, lw: 2.2, glow: COL.yellow };
    panel(cx + 3, y, cw - 6, ch, { ...opts, r: 8 });
    label(`[${c.idx}]`, cx + cw / 2, y + 15, MONO(9, false), COL.slate);
    label(shortJob(c.id), cx + cw / 2, y + 32, MONO(10.5), visited ? COL.white : COL.dim);
    if (visited) label(c.hit ? '✓' : '✗', cx + cw / 2, y + 47, MONO(10), c.hit ? COL.green : '#64748b');
  });

  // Ô "phần còn lại" của mảng
  const tx = x0 + k * cw + 8;
  const tailActive = frame >= 2;
  panel(tx, y, tailW, ch, {
    fill: tailActive ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.03)',
    stroke: tailActive ? COL.gold : '#334155',
    lw: 1,
    r: 8
  });
  label('…', tx + tailW / 2, y + 22, MONO(14), COL.slate);
  label(`[${(d.n - 1).toLocaleString()}]`, tx + tailW / 2, y + 42, MONO(9, false), COL.slate);

  // Con trỏ i
  let px;
  if (frame === 1) px = x0 + ptr * cw + cw / 2;
  else if (frame === 2) px = lerp(x0 + (k - 1) * cw + cw / 2, tx + tailW / 2, easeInOutCubic(p));
  else px = tx + tailW / 2;
  drawLightBead(ctx, px, y - 14, COL.yellow);
  label('i', px, y - 26, MONO(11), COL.yellow);

  // Thanh tiến độ số phép so sánh / n
  const by = y + ch + 30;
  const bw = w - 48;
  panel(24, by, bw, 10, { fill: 'rgba(255,255,255,0.05)', stroke: '#334155', lw: 1, r: 5 });
  const frac = d.n ? clamp01(shownCmp / d.n) : 0;
  if (frac > 0) panel(24, by, Math.max(10, bw * frac), 10, { fill: 'rgba(212,175,55,0.55)', stroke: COL.gold, lw: 1, r: 5 });
  label(`${shownCmp.toLocaleString()} / ${d.n.toLocaleString()} phép so sánh`, 24, by + 26, MONO(11), COL.white, 'left');

  if (frame === 3) {
    const msg = d.matchesCount
      ? `${d.matchesCount.toLocaleString()} việc khớp · lần khớp đầu tại i = ${d.firstHit}`
      : 'Không có phần tử nào khớp';
    label(msg, w - 24, by + 26, MONO(12), d.matchesCount ? COL.green : COL.rose, 'right', clamp01(p * 2));
  }
  cornerStat('O(n)', w);
}

// -------------------------------------------------------------------------
// 2. TRA CỨU MÃ VIỆC TRÊN CÂY AVL (camera bám theo con trỏ đi xuống)
// -------------------------------------------------------------------------
function drawAVLSearchCanvas(w, h, d, frame, p) {
  const path = d.path || [];
  const L = path.length;
  sceneTitle(`Cây AVL · ${d.size.toLocaleString()} nút · chiều cao ${d.treeHeight}`, `Tìm khóa ${d.key ?? '?'} (${d.target})`);
  if (!L) {
    label('Khóa không hợp lệ hoặc cây rỗng', w / 2, h / 2, MONO(13), COL.rose);
    return;
  }
  const pos = frame === 1 ? 0 : frame === 2 ? easeInOutCubic(p) * (L - 1) : L - 1;
  const rowH = 66;
  const dx = Math.min(140, w / 5);
  const xs = [0];
  for (let i = 1; i < L; i++) xs.push(xs[i - 1] + (path[i - 1].dir === 'L' ? -dx : dx));
  const i0 = Math.floor(pos);
  const camX = i0 + 1 < L ? lerp(xs[i0], xs[i0 + 1], pos - i0) : xs[i0];
  const baseY = h * 0.42;
  const X = (i) => w / 2 + xs[i] - camX;
  const Y = (i) => baseY + (i - pos) * rowH;

  // Nhánh
  for (let i = 0; i < L; i++) {
    const y = Y(i);
    if (y < -60 || y > h + 60) continue;
    const n = path[i];
    if (n.dir === 'L' || n.dir === 'R') {
      const otherKey = n.dir === 'L' ? n.rightKey : n.leftKey;
      if (otherKey !== null && otherKey !== undefined) {
        const ox = X(i) + (n.dir === 'L' ? dx : -dx) * 0.85;
        drawTreeBranch(ctx, X(i), y + 16, ox, y + rowH - 12, 'rgba(148,163,184,0.22)');
        pill(ox, y + rowH, 70, 22, String(otherKey), null, { fill: 'rgba(255,255,255,0.03)', stroke: '#334155', lw: 1, r: 7, text: COL.dim });
      }
    }
    if (i + 1 < L) {
      const visited = i + 1 <= pos + 0.001;
      drawTreeBranch(ctx, X(i), y + 16, X(i + 1), Y(i + 1) - 16, visited ? COL.yellow : 'rgba(212,175,55,0.4)');
    }
  }

  // Nút trên đường đi
  for (let i = 0; i < L; i++) {
    const y = Y(i);
    if (y < -40 || y > h + 40) continue;
    const n = path[i];
    const visited = i <= pos + 0.001;
    const current = Math.round(pos) === i;
    const isEnd = frame === 3 && i === L - 1;
    let color = visited ? '#0c4a6e' : 'rgba(30,41,59,0.9)';
    if (current) color = '#92400e';
    if (isEnd) color = d.found ? '#047857' : '#9f1239';
    if (isEnd || current) {
      ctx.save();
      ctx.shadowColor = isEnd ? (d.found ? COL.green : COL.rose) : COL.amber;
      ctx.shadowBlur = 18;
      drawTreeNode(ctx, X(i), y, `${n.key}  bf${n.bf > 0 ? '+' : ''}${n.bf}`, color, true);
      ctx.restore();
    } else {
      drawTreeNode(ctx, X(i), y, `${n.key}  bf${n.bf > 0 ? '+' : ''}${n.bf}`, color, false);
    }
    if (visited) {
      const op = n.dir === 'L' ? '<' : n.dir === 'R' ? '>' : '=';
      const go = n.dir === 'L' ? '↙ trái' : n.dir === 'R' ? '↘ phải' : '✓';
      label(`${d.key} ${op} ${n.key} ${go}`, X(i) + 64, y + 4, MONO(10.5), current ? COL.yellow : COL.slate, 'left');
    }
  }

  const [bx, by] = [w / 2, baseY - 24];
  drawLightBead(ctx, bx, by, COL.yellow);
  cornerStat(`bước ${Math.min(L, Math.floor(pos + 0.001) + 1)}/${d.steps || L}`, w);

  if (frame === 3) {
    const msg = d.found ? `✓ Tìm thấy sau ${d.steps} bước (cao ${d.treeHeight})` : `✗ Không có khóa ${d.key} — chạm nhánh rỗng`;
    label(msg, w - 18, 42, MONO(12), d.found ? COL.green : COL.rose, 'right', clamp01(p * 2));
  }
}

// -------------------------------------------------------------------------
// 3. BẢNG BĂM HORNER + CHUỖI VA CHẠM + MOVE-TO-FRONT
// -------------------------------------------------------------------------
function bucketStrip(w, y, capacity, bucket, glow, alpha = 1) {
  const maxCells = Math.max(8, Math.floor((w - 48) / 24));
  const V = Math.min(capacity, maxCells);
  const start = Math.max(0, Math.min(capacity - V, bucket - Math.floor(V / 2)));
  const cw = (w - 48) / V;
  for (let k = 0; k < V; k++) {
    const idx = start + k;
    const hit = idx === bucket;
    panel(24 + k * cw + 1, y, cw - 2, 26, {
      fill: hit ? `rgba(253,224,71,${0.15 + 0.35 * glow})` : 'rgba(255,255,255,0.03)',
      stroke: hit ? COL.yellow : '#334155',
      lw: hit ? 2 : 1,
      r: 4,
      glow: hit && glow > 0.5 ? COL.yellow : null,
      alpha
    });
    if (hit || idx % 5 === 0 || V <= 16) {
      label(String(idx), 24 + k * cw + cw / 2, y + 17, MONO(cw < 22 ? 8 : 9, hit), hit ? COL.yellow : COL.dim, 'center', alpha);
    }
  }
  if (start > 0) label('…', 14, y + 18, MONO(11), COL.dim, 'center', alpha);
  if (start + V < capacity) label('…', w - 14, y + 18, MONO(11), COL.dim, 'center', alpha);
  return 24 + (bucket - start) * cw + cw / 2;
}

function drawHashCanvas(w, h, d, frame, p) {
  sceneTitle(`Bảng băm · ${d.capacity} bucket · α = ${d.loadFactor}`, `Khóa "${d.keyword}" · ${d.distinctKeys} khóa phân biệt · rehash ${d.rehashCount} lần`);
  cornerStat('O(1) TB', w);
  const chars = d.chars || [];
  const n = chars.length;
  const stripY = h * 0.50;

  if (frame === 1 || frame === 2) {
    const tw = Math.min(34, (w - 60) / Math.max(n, 1));
    const tx0 = w / 2 - (n * tw) / 2;
    const ty = 62;
    const active = frame === 1 ? Math.min(n - 1, Math.floor(p * n)) : n - 1;
    chars.forEach((c, i) => {
      const on = i <= active;
      const cur = frame === 1 && i === active;
      panel(tx0 + i * tw + 2, ty, tw - 4, 28, {
        fill: on ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.03)',
        stroke: cur ? COL.yellow : on ? COL.gold : '#334155',
        lw: cur ? 2 : 1,
        r: 6,
        glow: cur ? COL.yellow : null
      });
      label(c.ch, tx0 + i * tw + tw / 2, ty + 19, MONO(13), on ? COL.white : COL.dim);
      if (on) label(String(c.h), tx0 + i * tw + tw / 2, ty + 44, MONO(9, false), COL.sky);
    });
    if (n) {
      const c = chars[active];
      const prevH = active > 0 ? chars[active - 1].h : 0;
      label(`h = (${prevH}·31 + '${c.ch}'(${c.code})) mod ${d.capacity} = ${c.h}`, w / 2, ty + 72, MONO(12), COL.yellow);
    }
    const bxc = bucketStrip(w, stripY + 30, d.capacity, d.bucket, frame === 2 ? clamp01((p - 0.7) / 0.3) : 0, frame === 1 ? 0.5 : 1);
    if (frame === 2) {
      const [bx, by] = arcPoint(w / 2, ty + 78, bxc, stripY + 30, easeInOutCubic(p), 30);
      drawLightBead(ctx, bx, by, COL.yellow);
      if (p > 0.7) label(`bucket #${d.bucket}`, bxc, stripY + 74, MONO(12), COL.yellow, 'center', clamp01((p - 0.7) / 0.3));
    }
    return;
  }

  if (frame === 3) {
    const bxc = bucketStrip(w, 62, d.capacity, d.bucket, 1);
    const chain = d.chain || [];
    const nw = 104;
    const gap = 30;
    const totalW = chain.length * nw + Math.max(0, chain.length - 1) * gap;
    const cx0 = Math.max(24, Math.min(bxc - nw / 2, w - 24 - totalW));
    const cy = 150;
    const target = d.foundPos >= 0 ? d.foundPos : chain.length - 1;
    const pos = easeInOutCubic(p) * Math.max(0, target);
    if (!chain.length) {
      label('bucket rỗng → không có khóa', bxc, cy + 4, MONO(12), COL.rose);
      return;
    }
    drawArrow(ctx, bxc, 92, cx0 + nw / 2, cy - 20, COL.yellow);
    chain.forEach((c, i) => {
      const x = cx0 + i * (nw + gap);
      const visited = i <= pos + 0.001;
      const isHit = i === d.foundPos && pos >= i - 0.01;
      pill(x + nw / 2, cy, nw, 36, `"${c.key}"`, `${c.count.toLocaleString()} việc`, {
        fill: isHit ? 'rgba(52,211,153,0.2)' : visited ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.03)',
        stroke: isHit ? COL.green : visited ? COL.sky : '#334155',
        glow: isHit ? COL.green : null,
        r: 9
      });
      if (i + 1 < chain.length) drawArrow(ctx, x + nw + 2, cy, x + nw + gap - 2, cy, COL.gold);
    });
    if (d.chainLength > chain.length) label(`+${d.chainLength - chain.length}`, cx0 + totalW + 18, cy + 4, MONO(10), COL.slate, 'left');
    const [bx] = along(chain.map((_, i) => [cx0 + i * (nw + gap) + nw / 2, cy]), pos);
    drawLightBead(ctx, bx, cy - 26, COL.yellow);
    label(`so sánh chuỗi: ${Math.min(chain.length, Math.floor(pos) + 1)} mắt xích · ${d.matchesCount.toLocaleString()} việc khớp`, w / 2, cy + 62, MONO(11.5), d.foundPos >= 0 ? COL.green : COL.rose, 'center', clamp01(p * 1.5));
    return;
  }

  // frame 4: Move-to-Front
  label('Lịch sử kỹ năng (Danh sách tự tổ chức · Move-to-Front)', w / 2, 70, MONO(11.5), COL.white);
  const before = d.mtfBefore || [];
  const after = d.mtfAfter || [];
  const pw = Math.min(110, (w - 48) / Math.max(6, after.length) - 10);
  const slotX = (i) => 24 + i * (pw + 10) + pw / 2;
  const yRow = h * 0.48;
  const e = easeInOutCubic(p);
  after.forEach((kw, i) => {
    const bi = before.indexOf(kw);
    const isKey = kw === d.keyword;
    let x = slotX(i);
    let y = yRow;
    if (bi >= 0) {
      x = lerp(slotX(bi), slotX(i), e);
      if (isKey) y = yRow - Math.sin(Math.PI * e) * 46;
    } else {
      y = lerp(yRow - 70, yRow, easeOutBounce(p));
    }
    pill(x, y, pw, 32, kw, null, {
      fill: isKey ? 'rgba(253,224,71,0.2)' : 'rgba(212,175,55,0.12)',
      stroke: isKey ? COL.yellow : COL.gold,
      glow: isKey ? COL.yellow : null,
      r: 9
    });
  });
  label('HEAD', slotX(0), yRow + 36, MONO(10), COL.sky);
  label(d.mtfHit ? `"${d.keyword}" có sẵn ở vị trí ${d.mtfPos + 1} → dời lên đầu` : `"${d.keyword}" mới → chèn vào đầu`, w / 2, yRow + 66, MONO(11.5), COL.yellow, 'center', clamp01(p * 1.5));
}

// -------------------------------------------------------------------------
// 4. TÌM KIẾM NHỊ PHÂN DẢI NGÂN SÁCH
// -------------------------------------------------------------------------
function drawBinarySearchCanvas(w, h, d, frame, p) {
  sceneTitle(`sortedBudget[0..${d.n.toLocaleString()}) · con trỏ đã sắp theo ngân sách`, `lowerBound(${fmtMoney(d.min)}) · upperBound(${d.max === null ? '∞' : fmtMoney(d.max)})`);
  cornerStat('O(log n)', w);
  const x0 = 30;
  const x1 = w - 30;
  const barY = h * 0.42;
  const barH = 28;
  const X = (i) => x0 + (d.n ? i / d.n : 0) * (x1 - x0);

  const grad = ctx.createLinearGradient(x0, 0, x1, 0);
  grad.addColorStop(0, 'rgba(56,189,248,0.25)');
  grad.addColorStop(1, 'rgba(212,175,55,0.35)');
  ctx.fillStyle = grad;
  drawRoundRect(ctx, x0, barY, x1 - x0, barH, 6);
  ctx.fill();
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1;
  ctx.stroke();
  label(`[0] ${fmtMoney(d.minVal)}`, x0, barY + barH + 16, MONO(9.5, false), COL.slate, 'left');
  label(`${fmtMoney(d.maxVal)} [${d.n - 1}]`, x1, barY + barH + 16, MONO(9.5, false), COL.slate, 'right');

  const drawProbes = (probes, prog, color, name) => {
    const k = probes.length;
    if (!k) return;
    const sf = prog * k;
    const s = Math.min(k - 1, Math.floor(sf));
    const local = clamp01(sf - s);
    const pr = probes[s];
    const prev = s > 0 ? probes[s - 1] : { lo: 0, hi: d.n };
    const ew = easeOutCubic(clamp01(local * 2));
    const lo = lerp(prev.lo, pr.lo, ew);
    const hi = lerp(prev.hi, pr.hi, ew);
    ctx.save();
    ctx.fillStyle = color === COL.sky ? 'rgba(56,189,248,0.35)' : 'rgba(245,158,11,0.35)';
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.fillRect(X(lo), barY - 6, Math.max(3, X(hi) - X(lo)), barH + 12);
    ctx.restore();
    const mx = X(pr.mid);
    ctx.strokeStyle = COL.yellow;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(mx, barY - 18);
    ctx.lineTo(mx, barY + barH + 4);
    ctx.stroke();
    drawLightBead(ctx, mx, barY - 22, COL.yellow);
    const tx = Math.max(110, Math.min(w - 110, mx));
    label(`mid = ${pr.mid} · ${fmtMoney(pr.v)}`, tx, barY - 34, MONO(11), COL.yellow);
    label(`${name} bước ${s + 1}/${k}: [${pr.lo}, ${pr.hi}) → ${pr.goLeft ? '← giữ nửa trái' : 'nửa phải →'}`, w / 2, barY + barH + 44, MONO(11.5), color);
  };

  const marker = (idx, color, text) => {
    const mx = X(idx);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(mx, barY - 10);
    ctx.lineTo(mx, barY + barH + 10);
    ctx.stroke();
    label(text, Math.max(40, Math.min(w - 40, mx)), barY + barH + 28, MONO(10.5), color);
  };

  if (frame === 1) drawProbes(d.lowerProbes, p, COL.sky, 'lowerBound');
  if (frame === 2) {
    marker(d.left, COL.sky, `L=${d.left}`);
    drawProbes(d.upperProbes, p, COL.amber, 'upperBound');
  }
  if (frame === 3) {
    const e = easeOutCubic(p);
    const xa = X(d.left);
    const xb = lerp(xa, X(d.right), e);
    ctx.save();
    ctx.fillStyle = 'rgba(52,211,153,0.4)';
    ctx.shadowColor = COL.green;
    ctx.shadowBlur = 16;
    ctx.fillRect(xa, barY - 4, Math.max(3, xb - xa), barH + 8);
    ctx.restore();
    marker(d.left, COL.sky, `L=${d.left}`);
    marker(d.right, COL.amber, `R=${d.right}`);
    label(`${d.count.toLocaleString()} việc trong [${d.left}, ${d.right}) · ${d.lowerProbes.length + d.upperProbes.length} bước chia đôi thay vì ${d.n.toLocaleString()}`, w / 2, barY + barH + 56, MONO(12), COL.green, 'center', clamp01(p * 2));
  }
}

// -------------------------------------------------------------------------
// 5. ĐĂNG VIỆC: MẢNG GỐC → AVL (XOAY) → BẢNG BĂM (REHASH) → MẢNG NGÂN SÁCH
// -------------------------------------------------------------------------
function rotationLayout(rot, cx, top, dx, dy) {
  // Vị trí trước xoay: z trên cùng, y con theo hướng type[0], x con của y theo hướng type[1]
  const sgn = (c) => (c === 'L' ? -1 : 1);
  const before = {};
  before[rot.z] = [cx, top];
  before[rot.y] = [cx + sgn(rot.type[0]) * dx, top + dy];
  before[rot.x] = [cx + sgn(rot.type[0]) * dx + sgn(rot.type[1]) * dx * 0.8, top + 2 * dy];
  // Sau xoay: khóa giữa làm gốc, nhỏ nhất bên trái, lớn nhất bên phải
  const keys = [rot.z, rot.y, rot.x].sort((a, b) => a - b);
  const after = {};
  after[keys[1]] = [cx, top];
  after[keys[0]] = [cx - dx, top + dy];
  after[keys[2]] = [cx + dx, top + dy];
  return { before, after, keys };
}

function drawJobPostCanvas(w, h, d, frame, p) {
  const a = d.avl;
  const hs = d.hash;
  const so = d.sorted;

  if (frame === 1) {
    sceneTitle('Mảng gốc jobs[] · Single Source of Truth', `n = ${d.n.toLocaleString()} · các chỉ mục chỉ giữ con trỏ`);
    const cw = Math.min(130, (w - 60) / 4);
    const y = h * 0.46;
    const x0 = w / 2 - (cw * 4) / 2;
    const e = easeInOutCubic(clamp01(p * 1.4));
    const slots = [
      { id: d.secondId, from: 0, to: 1 },
      { id: '…', from: 1, to: 2 },
      { id: `[${(d.n - 1).toLocaleString()}]`, from: 2, to: 3 }
    ];
    slots.forEach((s) => {
      const x = x0 + lerp(s.from, s.to, e) * cw;
      pill(x + cw / 2, y, cw - 12, 44, s.id || '—', null, { fill: 'rgba(255,255,255,0.04)', stroke: '#475569', lw: 1, r: 8, text: COL.slate });
    });
    const dropY = lerp(70, y, easeOutBounce(clamp01(p * 1.2)));
    pill(x0 + cw / 2, dropY, cw - 12, 44, d.jobId, fmtMoney(d.budget), { fill: 'rgba(52,211,153,0.2)', stroke: COL.green, glow: COL.green, r: 8 });
    label('jobs[0]', x0 + cw / 2, y + 40, MONO(10), COL.green);
    label(`#${d.skillTag} · ${d.slots} vị trí · "${String(d.title).slice(0, 42)}"`, w / 2, y + 72, SANS(11.5), COL.white, 'center', clamp01(p * 2));
    return;
  }

  if (frame === 2) {
    sceneTitle(`Chèn khóa ${a.key} vào cây AVL`, `Đi qua ${a.depth} nút (BST) rồi gắn lá mới · cây ${a.size.toLocaleString()} nút, cao ${a.height}`);
    const vis = a.path.slice(-5);
    const hidden = a.depth - vis.length;
    const m = vis.length;
    const rowH = Math.min(40, (h - 110) / (m + 1));
    const dx = Math.min(90, w / 8);
    const xs = [0];
    for (let i = 1; i <= m; i++) xs.push(xs[i - 1] + (vis[i - 1].dir === 'L' ? -dx : dx));
    const mid = (Math.min(...xs) + Math.max(...xs)) / 2;
    const X = (i) => w / 2 + xs[i] - mid;
    const Y = (i) => 64 + i * rowH;
    if (hidden > 0) label(`… ${hidden} nút phía trên (từ gốc)`, X(0), 52, MONO(9.5, false), COL.slate);
    const pos = easeInOutCubic(clamp01(p * 1.25)) * m;
    for (let i = 0; i < m; i++) drawTreeBranch(ctx, X(i), Y(i) + 12, X(i + 1), Y(i + 1) - 12, i + 1 <= pos + 0.001 ? COL.yellow : 'rgba(212,175,55,0.35)');
    vis.forEach((n, i) => {
      const on = i <= pos + 0.001;
      pill(X(i), Y(i), 96, 24, `${n.key} bf${n.bf > 0 ? '+' : ''}${n.bf}`, null, {
        fill: on ? 'rgba(2,132,199,0.35)' : 'rgba(30,41,59,0.8)',
        stroke: on ? COL.sky : '#334155',
        r: 7
      });
      if (on) label(n.dir === 'L' ? '↙' : '↘', X(i) + 56, Y(i) + 4, MONO(11), COL.yellow, 'left');
    });
    const leafA = clamp01((p - 0.75) / 0.25);
    if (leafA > 0) pill(X(m), Y(m), 96, 24, `${a.key} mới`, null, { fill: 'rgba(52,211,153,0.25)', stroke: COL.green, glow: COL.green, r: 7, alpha: leafA });
    const [bx, by] = along(xs.map((_, i) => [X(i), Y(i) - 18]), Math.min(pos, m));
    drawLightBead(ctx, bx, by, COL.yellow);
    return;
  }

  if (frame === 3) {
    const rot = a.rotation;
    if (!rot) {
      sceneTitle('Kiểm tra cân bằng trên đường quay lui', `Chiều cao cây ${a.height} · tổng số lần xoay LL ${a.rotationsTotal.LL} · RR ${a.rotationsTotal.RR} · LR ${a.rotationsTotal.LR} · RL ${a.rotationsTotal.RL}`);
      const vis = a.path.slice(-3);
      const pw = 120;
      vis.forEach((n, i) => {
        const x = w / 2 + (i - (vis.length - 1) / 2) * (pw + 40);
        const show = clamp01(p * 3 - i * 0.6);
        pill(x, h * 0.45, pw, 40, `${n.key}`, `bf trước ${n.bf > 0 ? '+' : ''}${n.bf}`, { fill: 'rgba(52,211,153,0.12)', stroke: COL.green, r: 9, alpha: 0.3 + 0.7 * show });
        if (show > 0.9) label('|bf| ≤ 1 ✓', x, h * 0.45 + 40, MONO(10.5), COL.green);
      });
      label('Không nút nào lệch quá 1 → không cần xoay', w / 2, h * 0.45 + 76, MONO(12), COL.green, 'center', clamp01(p * 2 - 0.4));
      return;
    }
    sceneTitle(`Mất cân bằng tại ${rot.z} (bf ${rot.bfZ > 0 ? '+' : ''}${rot.bfZ}) → xoay ${rot.type}`, `Nút cha phía trên: ${rot.parentKey ?? '(gốc cây)'} · tổng xoay ${rot.type}: ${a.rotationsTotal[rot.type]}`);
    const dxr = Math.min(120, w / 6);
    const lay = rotationLayout(rot, w / 2, 86, dxr, 58);
    const e = easeInOutCubic(clamp01((p - 0.15) / 0.75));
    const P = (k) => [lerp(lay.before[k][0], lay.after[k][0], e), lerp(lay.before[k][1], lay.after[k][1], e)];
    const edges = e < 0.5 ? [[rot.z, rot.y], [rot.y, rot.x]] : [[lay.keys[1], lay.keys[0]], [lay.keys[1], lay.keys[2]]];
    edges.forEach(([u, v]) => {
      const [ux, uy] = P(u);
      const [vx, vy] = P(v);
      drawTreeBranch(ctx, ux, uy + 14, vx, vy - 14, COL.gold);
    });
    [rot.z, rot.y, rot.x].forEach((k) => {
      const [x, y] = P(k);
      const isNew = k === a.key;
      const isZ = k === rot.z;
      const color = isNew ? '#047857' : isZ && e < 0.5 ? '#9f1239' : '#0c4a6e';
      ctx.save();
      if (isZ && e < 0.5) {
        ctx.shadowColor = COL.rose;
        ctx.shadowBlur = 18;
      }
      drawTreeNode(ctx, x, y, `${k}${isZ ? ' (z)' : k === rot.y ? ' (y)' : ' (x)'}`, color, isZ);
      ctx.restore();
    });
    label(`Xoay ${rot.type}`, w - 24, 96, MONO(16), COL.yellow, 'right', 0.5 + 0.5 * Math.sin(Date.now() * 0.006));
    label(`→ ${rot.newRoot} lên làm gốc cây con`, w - 24, 116, MONO(11), COL.white, 'right', e);
    return;
  }

  if (frame === 4) {
    if (hs.rehashed) {
      sceneTitle(`Rehash: α vượt ${hs.maxLoad} → ${hs.capacity0} → ${hs.capacity1} bucket`, `α ${hs.lf0} → ${hs.lf1} · ${hs.distinct0} → ${hs.distinct1} khóa phân biệt`);
      const e = easeInOutCubic(p);
      bucketStrip(w, 76, hs.capacity0, hs.bucket0, 1 - e, 1 - 0.6 * e);
      label(`cũ: ${hs.capacity0} ô`, 24, 70, MONO(10), COL.slate, 'left');
      const bx1 = bucketStrip(w, h * 0.55, hs.capacity1, hs.bucket1, e, 0.3 + 0.7 * e);
      label(`mới: ${hs.capacity1} ô (số nguyên tố)`, 24, h * 0.55 - 6, MONO(10), COL.yellow, 'left');
      for (let i = 0; i < 6; i++) {
        const t = clamp01(p * 1.3 - i * 0.06);
        const sx = 40 + (i * (w - 80)) / 5;
        const [x, y] = arcPoint(sx, 104, i === 0 ? bx1 : sx + ((i * 37) % 60) - 30, h * 0.55, easeInOutCubic(t), 22);
        if (t > 0 && t < 1) drawLightBead(ctx, x, y, i === 0 ? COL.yellow : COL.sky);
      }
      label(`"${d.skillTag}" → bucket #${hs.bucket1}`, bx1, h * 0.55 + 48, MONO(11.5), COL.yellow, 'center', e);
      return;
    }
    sceneTitle(`Băm "${d.skillTag}" → bucket #${hs.bucket1}/${hs.capacity1}`, `α = ${hs.lf1} (ngưỡng rehash ${hs.maxLoad}) · ${hs.existed ? 'khóa đã có → nối thêm con trỏ' : 'khóa mới → chèn đầu chuỗi'}`);
    const bxc = bucketStrip(w, 62, hs.capacity1, hs.bucket1, clamp01(p * 2));
    const chain = hs.chain || [];
    const nw = 104;
    const gap = 28;
    const totalW = chain.length * nw + Math.max(0, chain.length - 1) * gap;
    const cx0 = Math.max(24, Math.min(bxc - nw / 2, w - 24 - totalW));
    const cy = 150;
    if (chain.length) drawArrow(ctx, bxc, 92, cx0 + nw / 2, cy - 20, COL.yellow);
    chain.forEach((c, i) => {
      const x = cx0 + i * (nw + gap);
      const isKey = c.key === d.skillTag;
      const y = isKey && !hs.existed ? lerp(cy - 60, cy, easeOutBounce(clamp01(p * 1.3))) : cy;
      pill(x + nw / 2, y, nw, 36, `"${c.key}"`, `${c.count.toLocaleString()} việc`, {
        fill: isKey ? 'rgba(52,211,153,0.2)' : 'rgba(212,175,55,0.1)',
        stroke: isKey ? COL.green : COL.gold,
        glow: isKey ? COL.green : null,
        r: 9
      });
      if (i + 1 < chain.length) drawArrow(ctx, x + nw + 2, cy, x + nw + gap - 2, cy, COL.gold);
    });
    return;
  }

  // frame 5: chèn vào mảng con trỏ sắp theo ngân sách
  sceneTitle(`Chèn vào mảng ngân sách tại chỉ số ${so.idx}`, `lowerBound(${fmtMoney(d.budget)}) · ${so.probes.length} bước chia đôi trên ${so.n.toLocaleString()} con trỏ`);
  const k = so.probes.length;
  const sf = clamp01(p * 1.4) * k;
  const s = Math.min(k - 1, Math.floor(sf));
  const pr = k ? so.probes[Math.max(0, s)] : null;
  const x0 = 30;
  const x1 = w - 30;
  const barY = 74;
  const X = (i) => x0 + (so.n ? i / so.n : 0) * (x1 - x0);
  panel(x0, barY, x1 - x0, 16, { fill: 'rgba(56,189,248,0.12)', stroke: '#334155', lw: 1, r: 5 });
  if (pr && p < 0.72) {
    ctx.fillStyle = 'rgba(56,189,248,0.35)';
    ctx.fillRect(X(pr.lo), barY - 4, Math.max(3, X(pr.hi) - X(pr.lo)), 24);
    drawLightBead(ctx, X(pr.mid), barY - 10, COL.yellow);
    label(`mid ${pr.mid}: ${fmtMoney(pr.v)} ${pr.goLeft ? '≥' : '<'} ${fmtMoney(d.budget)}`, w / 2, barY + 42, MONO(11), COL.sky);
  } else {
    drawLightBead(ctx, X(so.idx), barY - 10, COL.green);
    label(`vị trí chèn = ${so.idx}`, w / 2, barY + 42, MONO(11), COL.green);
  }
  // Phóng to vùng chèn: [prev] [MỚI] [next]
  const cy = h * 0.62;
  const pw = 120;
  const open = easeInOutCubic(clamp01((p - 0.55) / 0.3));
  pill(w / 2 - lerp(pw / 2 + 6, pw + 18, open), cy, pw, 42, so.prevBudget === null ? '(đầu mảng)' : fmtMoney(so.prevBudget), `[${so.idx - 1}]`, { fill: 'rgba(255,255,255,0.04)', stroke: '#475569', r: 9, text: COL.slate });
  pill(w / 2 + lerp(pw / 2 + 6, pw + 18, open), cy, pw, 42, so.nextBudget === null ? '(cuối mảng)' : fmtMoney(so.nextBudget), `[${so.idx + 1}]`, { fill: 'rgba(255,255,255,0.04)', stroke: '#475569', r: 9, text: COL.slate });
  const dropA = clamp01((p - 0.75) / 0.25);
  if (dropA > 0) {
    pill(w / 2, lerp(cy - 70, cy, easeOutBounce(dropA)), pw, 42, fmtMoney(d.budget), `[${so.idx}] ${d.jobId}`, { fill: 'rgba(52,211,153,0.2)', stroke: COL.green, glow: COL.green, r: 9 });
  }
}

// -------------------------------------------------------------------------
// 6. NỘP ĐƠN: DSLK ứng viên insertHead → "Đơn của tôi" insertTail + bảng băm → enqueue vé
// -------------------------------------------------------------------------
function drawDLLRow(nodes, w, y, opts = {}) {
  const nw = opts.nw || 92;
  const gap = opts.gap || 40;
  const n = nodes.length;
  const total = n * nw + Math.max(0, n - 1) * gap;
  const x0 = Math.max(24, w / 2 - total / 2);
  return { x: (i) => x0 + i * (nw + gap) + nw / 2, nw, gap };
}

function drawQueueStrip(w, y, tickets, opts = {}) {
  const tw = Math.min(118, (w - 120) / Math.max(5, tickets.length));
  const x0 = 70;
  panel(x0 - 14, y - 34, (tw + 10) * Math.max(5, tickets.length) + 18, 68, { fill: 'rgba(255,255,255,0.02)', stroke: 'rgba(56,189,248,0.35)', lw: 1, r: 14 });
  label('FRONT', x0 - 30, y + 4, MONO(9.5), COL.sky);
  return { x: (i) => x0 + i * (tw + 10) + tw / 2, tw };
}

function drawApplyCanvas(w, h, d, frame, p) {
  if (frame === 1) {
    sceneTitle(`DSLK đôi hồ sơ của ${d.jobId} · insertHead O(1)`, `size ${d.listSize} · đã tuyển ${d.hired}`);
    const nodes = d.listAfter || [];
    const lay = drawDLLRow(nodes, w, 0);
    const y = h * 0.5;
    const e = easeInOutCubic(clamp01(p * 1.4));
    nodes.forEach((nd, i) => {
      if (i === 0) return;
      const x = lerp(lay.x(i - 1), lay.x(i), e);
      if (i + 1 < nodes.length) dblArrow(x + lay.nw / 2, lerp(lay.x(i), lay.x(i + 1), e) - lay.nw / 2, y);
      pill(x, y, lay.nw, 46, nd.label, fmtMoney(nd.bid), { r: 9 });
    });
    const drop = easeOutBounce(clamp01(p * 1.2));
    const nx = lay.x(0);
    const ny = lerp(y - 90, y, drop);
    if (nodes.length > 1) dblArrow(nx + lay.nw / 2, lay.x(1) - lay.nw / 2, y, COL.green, clamp01((p - 0.6) / 0.3));
    pill(nx, ny, lay.nw, 46, d.newNode.label, fmtMoney(d.bid), { fill: 'rgba(52,211,153,0.2)', stroke: COL.green, glow: COL.green, r: 9 });
    label('HEAD', nx, y - 38, MONO(10), COL.green, 'center', clamp01((p - 0.5) * 2));
    if (nodes.length > 1) label('TAIL', lay.x(nodes.length - 1), y + 44, MONO(10), COL.sky);
    if (d.listSize > nodes.length) label(`… +${d.listSize - nodes.length}`, lay.x(nodes.length - 1) + lay.nw / 2 + 10, y + 4, MONO(10), COL.slate, 'left');
    label(`new.next = head cũ · head.prev = new · head = ${d.newNode.label}`, w / 2, h - 74, MONO(11), COL.yellow, 'center', clamp01((p - 0.5) * 2));
    return;
  }
  if (frame === 2) {
    drawMyAppsInsert(w, h, d, p);
    return;
  }
  {
    sceneTitle('Hàng đợi giải ngân FIFO · enqueue vào đuôi', `${d.queueSize} vé đang chờ · vé mới ${shortTk(d.ticket && d.ticket.id)}`);
    const q = d.queueAfter || [];
    const y = h * 0.5;
    const lay = drawQueueStrip(w, y, q);
    q.forEach((t, i) => {
      const isNew = i === q.length - 1;
      const x = isNew ? lerp(w + 80, lay.x(i), easeOutCubic(p)) : lay.x(i);
      pill(x, y, lay.tw, 44, shortJob(t.jobId), fmtMoney(t.amount), isNew
        ? { fill: 'rgba(52,211,153,0.2)', stroke: COL.green, glow: COL.green, r: 9 }
        : { r: 9 });
    });
    if (q.length) label('REAR', lay.x(q.length - 1), y + 44, MONO(9.5), COL.amber);
    label('tail.next = vé mới · tail = vé mới — O(1)', w / 2, h - 74, MONO(11), COL.yellow, 'center', clamp01(p * 2));
    return;
  }
}

/** Ô bảng băm nhỏ: jobId → ● (con trỏ node). Trả tọa độ chấm con trỏ của dòng nổi bật. */
function drawMapBox(x, y, key, size, opts = {}) {
  const bw = 196;
  const rowH = 24;
  const rows = opts.rows || 3;
  panel(x, y, bw, 30 + rows * rowH, { fill: 'rgba(56,189,248,0.06)', stroke: 'rgba(56,189,248,0.5)', lw: 1.2, r: 10 });
  label(`Bảng băm jobId → node (${size})`, x + 10, y + 16, MONO(9.5), COL.sky, 'left');
  let dot = null;
  for (let i = 0; i < rows; i++) {
    const ry = y + 30 + i * rowH + rowH / 2;
    const hit = i === Math.floor(rows / 2);
    const txt = hit ? key : '· · ·';
    if (hit) {
      ctx.save();
      ctx.globalAlpha = opts.alpha ?? 1;
      ctx.fillStyle = opts.color === COL.rose ? 'rgba(251,113,133,0.18)' : 'rgba(52,211,153,0.16)';
      ctx.fillRect(x + 6, ry - rowH / 2 + 2, bw - 12, rowH - 4);
      ctx.restore();
    }
    label(txt, x + 14, ry + 4, MONO(10, hit), hit ? (opts.color || COL.green) : COL.slate, 'left', hit ? (opts.alpha ?? 1) : 0.6);
    if (hit) {
      dot = [x + bw - 18, ry];
      drawLightBead(ctx, dot[0], dot[1], opts.color || COL.green);
    }
  }
  return dot;
}

function drawMyAppsInsert(w, h, d, p) {
  sceneTitle('"Đơn của tôi" · insertTail + map.set(jobId → node)', `${d.mySize} đơn · thứ tự nộp cũ → mới · rút đơn nào cũng O(1)`);
  const nodes = d.myAfter || [];
  const lay = drawDLLRow(nodes, w, 0, { nw: 84, gap: 32 });
  const y = h * 0.64;
  const last = nodes.length - 1;
  nodes.forEach((nd, i) => {
    if (i + 1 < last) dblArrow(lay.x(i) + lay.nw / 2, lay.x(i + 1) - lay.nw / 2, y);
    if (i === last) return;
    pill(lay.x(i), y, lay.nw, 42, nd.label, fmtMoney(nd.bid), { r: 9 });
  });
  if (last >= 0) {
    const e = easeOutCubic(clamp01(p * 1.3));
    const nx = lerp(w + 60, lay.x(last), e);
    if (last > 0) dblArrow(lay.x(last - 1) + lay.nw / 2, lay.x(last) - lay.nw / 2, y, COL.green, clamp01((p - 0.5) / 0.3));
    pill(nx, y, lay.nw, 42, nodes[last].label, fmtMoney(nodes[last].bid), { fill: 'rgba(52,211,153,0.2)', stroke: COL.green, glow: COL.green, r: 9 });
    label('TAIL (mới nhất)', lay.x(last), y + 38, MONO(9.5), COL.green, 'center', clamp01((p - 0.5) * 2));
    if (last > 0) label('HEAD (cũ nhất)', lay.x(0), y - 34, MONO(9.5), COL.sky);
    if (d.mySize > nodes.length) label(`+${d.mySize - nodes.length} đơn cũ hơn`, lay.x(0) - lay.nw / 2 - 6, y + 4, MONO(9.5, false), COL.slate, 'right');
    // Bảng băm trỏ thẳng xuống node mới
    const mapA = clamp01((p - 0.45) / 0.3);
    if (mapA > 0) {
      const dot = drawMapBox(Math.max(16, Math.min(w - 212, lay.x(last) - 98)), 52, d.jobId, d.mapSize, { alpha: mapA });
      if (dot) drawArrow(ctx, dot[0], dot[1] + 6, lay.x(last), y - 24, COL.green);
    }
  }
  label('tail.next = new · new.prev = tail · tail = new · map.set(jobId, new)', w / 2, h - 22, MONO(10.5), COL.yellow, 'center', clamp01((p - 0.6) * 2.5));
}

function drawStackTube(w, h, items, p, mode, alphaTop = 1) {
  const tubeW = 210;
  const itemH = 30;
  const slots = 5;
  const tubeH = itemH * slots + 14;
  const cx = w / 2;
  const top = h * 0.5 - tubeH / 2 + 8;
  ctx.strokeStyle = COL.amber;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(cx - tubeW / 2, top);
  ctx.lineTo(cx - tubeW / 2, top + tubeH);
  ctx.lineTo(cx + tubeW / 2, top + tubeH);
  ctx.lineTo(cx + tubeW / 2, top);
  ctx.stroke();
  const shown = items.slice(0, slots);
  const n = shown.length;
  shown.forEach((it, i) => {
    // i = 0 là đỉnh
    const restY = top + tubeH - 7 - (n - i) * itemH + itemH / 2;
    let y = restY;
    let alpha = 1;
    let glow = null;
    let fill = 'rgba(212,175,55,0.15)';
    let stroke = COL.gold;
    if (i === 0) {
      fill = 'rgba(253,224,71,0.18)';
      stroke = COL.yellow;
      glow = COL.yellow;
      if (mode === 'push') y = lerp(top - 70, restY, easeOutBounce(clamp01(p * 1.2)));
      if (mode === 'pop') {
        y = lerp(restY, top - 90, easeInQuad(p));
        alpha = 1 - clamp01((p - 0.6) / 0.4);
      }
      alpha *= alphaTop;
    }
    pill(cx, y, tubeW - 16, itemH - 4, it.label || `${shortJob(it.jobId)} · ${fmtMoney(it.bid)}`, null, { fill, stroke, glow, r: 7, alpha });
  });
  if (n) {
    label('TOP →', cx - tubeW / 2 - 12, top + tubeH - 7 - n * itemH + itemH / 2 + 4, MONO(10), COL.yellow, 'right');
  }
  if (items.length > slots) label(`+${items.length - slots} bên dưới`, cx + tubeW / 2 + 12, top + tubeH - 4, MONO(9.5, false), COL.slate, 'left');
}

// -------------------------------------------------------------------------
// 7. RÚT ĐƠN BẤT KỲ: bảng băm jobId → node O(1) → bắc cầu prev ↔ next → dọn vé
// -------------------------------------------------------------------------
function drawWithdrawCanvas(w, h, d, frame, p) {
  const before = d.listBefore || [];
  const after = d.listAfter || [];
  const y = h * 0.64;
  const lay = drawDLLRow(before, w, y, { nw: 84, gap: 32 });
  const t = d.targetIdx;
  const more = (n) => {
    if (d.windowStart > 0) label(`+${d.windowStart} đơn`, lay.x(0) - lay.nw / 2 - 6, y + 4, MONO(9.5, false), COL.slate, 'right');
    const rest = d.totalBefore - d.windowStart - n;
    if (rest > 0) label(`+${rest} đơn`, lay.x(n - 1) + lay.nw / 2 + 6, y + 4, MONO(9.5, false), COL.slate, 'left');
  };
  const row = (hl, liftE = 0) => {
    before.forEach((nd, i) => {
      if (i + 1 < before.length && !(liftE > 0 && (i === t || i + 1 === t))) dblArrow(lay.x(i) + lay.nw / 2, lay.x(i + 1) - lay.nw / 2, y);
      const isT = i === t;
      pill(lay.x(i), isT ? y - liftE * 64 : y, lay.nw, 42, nd.label, fmtMoney(nd.bid), isT && hl
        ? { fill: 'rgba(251,113,133,0.2)', stroke: COL.rose, glow: COL.rose, r: 9, alpha: 1 - 0.6 * liftE }
        : { r: 9 });
    });
    if (before.length) more(before.length);
  };

  if (frame === 1) {
    sceneTitle(`map.get("${d.jobId}") → node ${d.targetLabel || '—'} · O(1)`, `Không đi từ head — bảng băm trả thẳng con trỏ, dù đơn nằm giữa ${d.totalBefore} đơn`);
    row(p > 0.55);
    if (t >= 0) {
      const dot = drawMapBox(Math.max(16, Math.min(w - 212, lay.x(t) - 98)), 52, d.jobId, d.mapSize + 1, { color: COL.rose });
      const e = easeInOutCubic(clamp01((p - 0.15) / 0.45));
      if (dot && e > 0) {
        const tx = lay.x(t);
        const ty = y - 24;
        drawArrow(ctx, dot[0], dot[1] + 6, lerp(dot[0], tx, e), lerp(dot[1] + 6, ty, e), COL.rose);
      }
      label('Thời gian không phụ thuộc vị trí đơn', w / 2, h - 22, MONO(10.5), COL.yellow, 'center', clamp01((p - 0.6) * 2.5));
    } else {
      label('Không có đơn trong chỉ mục', w / 2, y - 70, MONO(12), COL.slate);
    }
    return;
  }

  if (frame === 2) {
    sceneTitle(`removeNode(${d.targetLabel || '—'}) · đơn ở ${({ HEAD: 'đầu', TAIL: 'cuối', MIDDLE: 'giữa', ONLY: 'duy nhất' })[d.removedCase] || '—'}`, 'Chỉ sửa 2 con trỏ prev/next — O(1)');
    const e = easeInOutCubic(p);
    row(true, e);
    if (t > 0 && t < before.length - 1) {
      const xa = lay.x(t - 1) + lay.nw / 2;
      const xb = lay.x(t + 1) - lay.nw / 2;
      ctx.save();
      ctx.strokeStyle = COL.green;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = COL.green;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      const steps = 30;
      for (let s2 = 0; s2 <= steps * e; s2++) {
        const u = s2 / steps;
        const px = lerp(xa, xb, u);
        const py = y + 24 + Math.sin(Math.PI * u) * 30;
        if (s2 === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.restore();
      label(`${d.prevLabel}.next = ${d.nextLabel} · ${d.nextLabel}.prev = ${d.prevLabel}`, w / 2, h - 22, MONO(11), COL.green, 'center', e);
    } else if (d.removedCase === 'HEAD') {
      label(`head = ${d.nextLabel} · head.prev = null`, w / 2, h - 22, MONO(11), COL.green, 'center', e);
    } else if (d.removedCase === 'TAIL') {
      label(`tail = ${d.prevLabel} · tail.next = null`, w / 2, h - 22, MONO(11), COL.green, 'center', e);
    } else {
      label('Chỉ còn 1 đơn → head = tail = null', w / 2, h - 22, MONO(11), COL.green, 'center', e);
    }
    return;
  }

  if (frame === 3) {
    sceneTitle('Dọn các cấu trúc liên quan', `${d.jobTitle || d.jobId}`);
    const cards = [
      { t: 'Bảng băm', v: `map.delete("${d.jobId}")`, c: COL.sky },
      { t: 'DSLK ứng viên của việc', v: `gỡ bằng con trỏ · ${d.jobListBefore} → ${d.jobListAfter}`, c: COL.gold },
      { t: 'Hàng đợi giải ngân', v: d.ticketId ? `hủy vé ${shortTk(d.ticketId)}` : 'không có vé', c: COL.amber }
    ];
    const cw = Math.min(210, (w - 80) / 3);
    cards.forEach((c, i) => {
      const s2 = easeOutBounce(clamp01(p * 1.6 - i * 0.3));
      const x = w / 2 + (i - 1) * (cw + 20);
      const yy = lerp(h * 0.55 + 60, h * 0.55, s2);
      pill(x, yy, cw, 52, c.t, c.v, { fill: 'rgba(255,255,255,0.04)', stroke: c.c, glow: s2 > 0.95 ? c.c : null, r: 10, alpha: clamp01(s2 * 1.2), sub: c.c });
    });
    return;
  }

  sceneTitle('"Đơn của tôi" sau khi rút', `${d.mySize} đơn còn lại · các đơn khác giữ nguyên thứ tự`);
  const lay2 = drawDLLRow(after, w, y, { nw: 84, gap: 32 });
  const e = easeInOutCubic(p);
  const xs = after.map((nd, i) => {
    const bi = before.findIndex(b => b.label === nd.label);
    return bi >= 0 ? lerp(lay.x(bi), lay2.x(i), e) : lay2.x(i);
  });
  after.forEach((nd, i) => {
    if (i + 1 < after.length) dblArrow(xs[i] + lay2.nw / 2, xs[i + 1] - lay2.nw / 2, y, COL.gold, clamp01(e * 1.5));
    pill(xs[i], y, lay2.nw, 42, nd.label, fmtMoney(nd.bid), { r: 9 });
  });
  if (!after.length) label('(rỗng) head = tail = null', w / 2, y + 4, MONO(13), COL.slate);
  else {
    label('HEAD', xs[0], y - 34, MONO(10), COL.sky);
    label('TAIL', xs[after.length - 1], y + 38, MONO(10), COL.green);
  }
}

// -------------------------------------------------------------------------
// 8. HOÀN TÁC: POP NGĂN XẾP LIFO
// -------------------------------------------------------------------------
function drawUndoCanvas(w, h, d, frame, p) {
  const items = d.stackBefore || [];
  if (frame === 1) {
    sceneTitle('Ngăn xếp hoàn tác · đỉnh = hành động mới nhất', `${d.stackBeforeSize} hành động`);
    drawStackTube(w, h, items, p, 'idle', 0.6 + 0.4 * Math.sin(Date.now() * 0.008));
    return;
  }
  if (frame === 2) {
    const push = d.op === 'push';
    sceneTitle(push ? 'push(): node.next = top; top = node — O(1)' : 'pop(): top = top.next — O(1)', `${d.stackBeforeSize} → ${d.stackAfterSize} hành động`);
    drawStackTube(w, h, items, p, push ? 'push' : 'pop');
    return;
  }
  sceneTitle('Rollback trên các cấu trúc liên quan', d.popped?.label || `Hành động ${d.popped ? shortTk(d.popped.id) : ''} · ${d.popped ? d.popped.jobId : ''}`);
  const palette = [COL.sky, COL.amber, COL.green];
  const cards = d.cards ? d.cards.slice(0, 3).map((c, i) => ({ t: c.t, v: c.v, c: palette[i] })) : [
    { t: 'DSLK đôi', v: `removeHead → ${d.removedNode || '—'}`, c: COL.sky },
    { t: 'Hàng đợi FIFO', v: `hủy vé ${shortTk(d.ticketId) || '—'}`, c: COL.amber },
    { t: 'JobPost', v: `đã tuyển → ${d.hired}`, c: COL.green }
  ];
  const cw = Math.min(200, (w - 80) / 3);
  cards.forEach((c, i) => {
    const s = easeOutBounce(clamp01(p * 1.6 - i * 0.3));
    const x = w / 2 + (i - 1) * (cw + 20);
    const y = lerp(h * 0.5 + 60, h * 0.5, s);
    pill(x, y, cw, 52, c.t, c.v, { fill: 'rgba(255,255,255,0.04)', stroke: c.c, glow: s > 0.95 ? c.c : null, r: 10, alpha: clamp01(s * 1.2), sub: c.c });
  });
}

// -------------------------------------------------------------------------
// 9. GIẢI NGÂN: DEQUEUE HÀNG ĐỢI FIFO
// -------------------------------------------------------------------------
function drawPayoutCanvas(w, h, d, frame, p) {
  const q = d.queueBefore || [];
  const y = h * 0.5;
  if (frame === 1 || frame === 2) {
    sceneTitle(frame === 1 ? 'Hàng đợi giải ngân · vé ở FRONT được phục vụ trước' : 'dequeue(): head = head.next — O(1)', `${d.queueBeforeSize} → ${frame === 1 ? d.queueBeforeSize : d.queueAfterSize} vé`);
    const lay = drawQueueStrip(w, y, q);
    const e = frame === 2 ? easeInOutCubic(p) : 0;
    q.forEach((t, i) => {
      if (i === 0) {
        const x = lay.x(0) - e * 140;
        pill(x, y + e * 30, lay.tw, 44, shortJob(t.jobId), fmtMoney(t.amount), { fill: 'rgba(253,224,71,0.18)', stroke: COL.yellow, glow: COL.yellow, r: 9, alpha: 1 - clamp01((e - 0.5) * 2) });
        return;
      }
      const slot = lerp(i, i - 1, frame === 2 ? easeInOutCubic(clamp01((p - 0.3) / 0.7)) : 0);
      pill(lay.x(0) + (lay.x(1) - lay.x(0)) * slot, y, lay.tw, 44, shortJob(t.jobId), fmtMoney(t.amount), { r: 9 });
    });
    if (frame === 1) drawLightBead(ctx, lay.x(0), y - 36, COL.yellow);
    if (d.queueBeforeSize > q.length) label(`… +${d.queueBeforeSize - q.length}`, lay.x(q.length - 1) + lay.tw / 2 + 12, y + 4, MONO(10), COL.slate, 'left');
    return;
  }
  const tk = d.ticket || {};
  const fromWallet = d.source === 'wallet';
  sceneTitle(fromWallet
    ? `Trừ ${fmtMoney(tk.amount)} từ ví nhà tuyển dụng → ví ${tk.fl || ''}`
    : `Chuyển ${fmtMoney(tk.amount)} từ ký quỹ ${tk.jobId || ''} sang ví ${tk.fl || ''}`,
  fromWallet ? 'Việc mẫu chưa nạp ký quỹ → nhà tuyển dụng trả từ ví · tổng tiền không đổi' : 'Tiền đã rời ví nhà tuyển dụng lúc đăng tin · tổng ký quỹ + ví không đổi');
  const lx = w * 0.24;
  const rx = w * 0.76;
  if (fromWallet) {
    const shown = p < 0.7 ? d.payerBefore : d.payerAfter;
    pill(lx, y, 180, 60, `Ví ${d.payerName || 'nhà tuyển dụng'}`, shown === null || shown === undefined ? '—' : fmtMoney(shown), { fill: 'rgba(251,113,133,0.14)', stroke: COL.rose, glow: p > 0.7 && p < 0.95 ? COL.rose : null, r: 12, sub: COL.rose });
    label(`−${fmtMoney(tk.amount)}`, lx, y + 52, MONO(13), COL.rose, 'center', clamp01((p - 0.6) * 3));
  } else {
    pill(lx, y, 170, 60, `Ký quỹ ${shortJob(tk.jobId)}`, d.escrowRemaining === null ? '—' : `còn ${fmtMoney(d.escrowRemaining)}`, { fill: 'rgba(245,158,11,0.15)', stroke: COL.amber, r: 12, sub: COL.amber });
  }
  pill(rx, y, 170, 60, `Ví ${tk.fl || ''}`, d.walletBalance === null ? '—' : fmtMoney(d.walletBalance), { fill: 'rgba(52,211,153,0.15)', stroke: COL.green, glow: p > 0.9 ? COL.green : null, r: 12, sub: COL.green });
  for (let i = 0; i < 5; i++) {
    const t = clamp01(p * 1.4 - i * 0.1);
    if (t <= 0 || t >= 1) continue;
    const [x, y2] = arcPoint(lx + 85, y, rx - 85, y, easeInOutCubic(t), 50);
    drawLightBead(ctx, x, y2, COL.yellow);
  }
  label(`+${fmtMoney(tk.amount)}`, w / 2, y - 56, MONO(14), COL.yellow, 'center', clamp01(p * 2));
}

// -------------------------------------------------------------------------
// 10. SẮP XẾP: MERGESORT / QUICKSORT (phát lại các bước thật trên 8 việc)
// -------------------------------------------------------------------------
function drawSortCanvas(w, h, d, frame, p, total) {
  const isQuick = d.algo === 'quicksort';
  const items = d.items || [];
  const n = items.length;
  const E = (d.events || []).length;
  sceneTitle(`${isQuick ? 'QuickSort (Hoare)' : 'MergeSort'} · ${d.field} (${d.n.toLocaleString()} việc)`, `${d.comparisons.toLocaleString()} phép so sánh${d.swaps !== null ? ` · ${d.swaps.toLocaleString()} hoán đổi` : ''} · ${d.fullMs} ms trên toàn danh sách`);
  if (!n) {
    label('Danh sách rỗng', w / 2, h / 2, MONO(13), COL.slate);
    return;
  }
  const orderAt = (f) => {
    if (f <= 1) return d.initial;
    const ei = Math.min(E, f - 1);
    return ei >= 1 ? d.events[ei - 1].order : d.initial;
  };
  const prev = orderAt(frame - 1);
  const cur = orderAt(frame);
  const ev = frame >= 2 && frame - 1 <= E ? d.events[frame - 2] : null;
  const done = frame === total;
  const e = easeInOutCubic(clamp01(p * 1.3));

  const vals = items.map(it => Number(it.val) || 0);
  const vmin = Math.min(...vals);
  const vmax = Math.max(...vals);
  const slotW = Math.min(90, (w - 60) / n);
  const x0 = w / 2 - (slotW * n) / 2;
  const baseY = h - 86;
  const maxBar = h - 160;
  const slotX = (i) => x0 + i * slotW + slotW / 2;

  // Vùng đang xử lý
  if (ev && (ev.kind === 'merge' || ev.kind === 'skip' || ev.kind === 'split')) {
    const lo = ev.low;
    const hi = ev.high;
    const color = ev.kind === 'skip' ? 'rgba(52,211,153,0.10)' : 'rgba(212,175,55,0.10)';
    panel(x0 + lo * slotW + 2, 54, (hi - lo + 1) * slotW - 4, baseY - 54 + 30, { fill: color, stroke: ev.kind === 'skip' ? COL.green : COL.gold, lw: 1, r: 10 });
    if (ev.kind !== 'split' && ev.mid !== undefined) {
      const mx = x0 + (ev.mid + 1) * slotW;
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = COL.slate;
      ctx.beginPath();
      ctx.moveTo(mx, 58);
      ctx.lineTo(mx, baseY + 20);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (ev.kind === 'split' && ev.p !== undefined) {
      const px = x0 + (ev.p + 1) * slotW;
      ctx.strokeStyle = COL.yellow;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, 58);
      ctx.lineTo(px, baseY + 20);
      ctx.stroke();
      label(`p = ${ev.p}`, px, 52, MONO(10), COL.yellow);
    }
  }

  // Vị trí từng phần tử (id = chỉ số trong items)
  for (let id = 0; id < n; id++) {
    const from = prev.indexOf(id);
    const to = cur.indexOf(id);
    const x = lerp(slotX(from), slotX(to), e);
    const lift = from !== to ? Math.sin(Math.PI * e) * 26 : 0;
    const v = Number(items[id].val) || 0;
    const bh = 24 + (vmax > vmin ? (v - vmin) / (vmax - vmin) : 0.5) * maxBar;
    const moving = from !== to && e < 1;
    const swapHit = ev && ev.kind === 'swap' && (to === ev.i || to === ev.j);
    let fill = 'rgba(212,175,55,0.18)';
    let stroke = COL.gold;
    let glow = null;
    if (moving || swapHit) {
      fill = 'rgba(253,224,71,0.25)';
      stroke = COL.yellow;
      glow = COL.yellow;
    }
    if (done) {
      fill = 'rgba(52,211,153,0.2)';
      stroke = COL.green;
    }
    const bw = slotW - 14;
    panel(x - bw / 2, baseY - bh - lift, bw, bh, { fill, stroke, glow, r: 6 });
    label(items[id].tag, x, baseY - bh - lift - 8, MONO(12), stroke);
    const valStr = d.unit === '$' ? fmtMoney(v) : `${v}${d.unit}`;
    label(valStr, x, baseY + 16, MONO(9.5, false), COL.slate);
  }
  if (ev && ev.kind === 'swap') {
    label(`swap(${ev.i}, ${ev.j})`, w / 2, 52, MONO(11), COL.yellow);
  }
  cornerStat(done ? '✓ Đã sắp xếp' : `bước ${Math.max(0, frame - 1)}/${E}`, w, done ? COL.green : COL.yellow);
}

// -------------------------------------------------------------------------
// 11. KIỂM THỬ TẢI 100.000 THAO TÁC
// -------------------------------------------------------------------------
function drawStressTestCanvas(w, h, d, frame, p) {
  sceneTitle(`Kiểm thử tải · ${Number(d.totalActions || 0).toLocaleString()} thao tác`, 'Chạy trên lõi thật (bản riêng): bảng băm · AVL · nhị phân · DSLK · Stack · Queue');
  const cx = w * 0.3;
  const cy = h / 2;
  const e = frame === 1 ? easeOutCubic(p) : 1;
  ctx.strokeStyle = 'rgba(16,185,129,0.25)';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(cx, cy, 64, 0, Math.PI * 2);
  ctx.stroke();
  ctx.save();
  ctx.strokeStyle = d.errors ? COL.rose : COL.green;
  ctx.shadowColor = ctx.strokeStyle;
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.arc(cx, cy, 64, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * e);
  ctx.stroke();
  ctx.restore();
  label(Math.round(e * (d.totalActions || 0)).toLocaleString(), cx, cy, MONO(16), COL.white);
  label(`${Number(d.throughput || 0).toLocaleString()} ops/s`, cx, cy + 18, MONO(10.5), COL.green);
  if (d.invariants) label(`${d.invariants.filter(x => x.ok).length}/7 bất biến đạt`, cx, cy + 118, MONO(10.5, false), COL.slate);
  const OPS = [
    ['skill', 'Tìm kỹ năng (bảng băm)', COL.sky], ['lookup', 'Tra mã (AVL)', COL.sky], ['budget', 'Dải ngân sách (nhị phân)', COL.sky],
    ['post', 'Đăng việc', COL.gold], ['apply', 'Nộp hồ sơ (DSLK + vé)', COL.gold], ['withdraw', 'Rút đơn bất kỳ', COL.slate],
    ['undo', 'Hoàn tác (Stack)', COL.amber], ['payout', 'Giải ngân (Queue FIFO)', COL.green]
  ];
  const b = d.breakdown;
  if (d.byOp) {
    // Thanh theo ĐÚNG số lần mỗi loại thao tác đã chạy trên lõi thật (số trong sổ cái, không phải số minh họa)
    const max = Math.max(1, ...OPS.map(([k]) => (d.byOp[k] && d.byOp[k].ops) || 0));
    const bx = w * 0.52;
    const bw = w * 0.42;
    OPS.forEach(([k, name, c], i) => {
      const v = (d.byOp[k] && d.byOp[k].ops) || 0;
      const y = 56 + i * 27;
      const t = frame === 1 ? clamp01(p * 1.5 - i * 0.08) : 1;
      label(name, bx, y, MONO(9.5, false), COL.slate, 'left');
      panel(bx, y + 5, Math.max(4, bw * (v / max) * easeOutCubic(t)), 8, { fill: c, stroke: c, lw: 1, r: 4, alpha: 0.75 });
      label(v.toLocaleString(), bx + bw, y, MONO(9.5), c, 'right');
    });
    const cr = d.core;
    if (cr) {
      const rot = cr.avlRotations || {};
      label(`AVL cao ${cr.avlHeight} · xoay LL ${rot.LL || 0} RR ${rot.RR || 0} LR ${rot.LR || 0} RL ${rot.RL || 0}`, bx, 56 + 8 * 27 + 4, MONO(9, false), COL.slate, 'left');
      label(`Hàng đợi còn ${Number(cr.queue || 0).toLocaleString()} vé · Stack ${Number(cr.stack || 0).toLocaleString()} · α băm ${cr.hash && cr.hash.loadFactor !== undefined ? Number(cr.hash.loadFactor).toFixed(2) : '—'}`, bx, 56 + 8 * 27 + 18, MONO(9, false), COL.slate, 'left');
    }
  } else if (b) {
    const rows = [
      ['Tìm kiếm (bảng băm)', b.searches, COL.sky],
      ['Nộp hồ sơ', b.applies, COL.gold],
      ['Bị chặn (đủ chỉ tiêu)', b.slotsBlocked, COL.slate],
      ['Hoàn tác (Stack lõi)', b.undos, COL.amber],
      ['Giải ngân FIFO', b.payouts, COL.green]
    ];
    const max = Math.max(1, ...rows.map(r => r[1] || 0));
    const bx = w * 0.52;
    const bw = w * 0.42;
    rows.forEach(([name, v, c], i) => {
      const y = 70 + i * 32;
      const t = frame === 1 ? clamp01(p * 1.5 - i * 0.1) : 1;
      label(name, bx, y, MONO(10, false), COL.slate, 'left');
      panel(bx, y + 5, Math.max(4, bw * ((v || 0) / max) * easeOutCubic(t)), 10, { fill: c, stroke: c, lw: 1, r: 4, alpha: 0.75 });
      label((v || 0).toLocaleString(), bx + bw, y, MONO(10), c, 'right');
    });
  }
  if (frame === 3) {
    label(d.errors === 0 ? '✓ 0 vi phạm bất biến' : `✗ ${d.errors} vi phạm`, cx, cy + 96, MONO(13), d.errors === 0 ? COL.green : COL.rose, 'center', clamp01(p * 2));
  }
}

// Generic fallback canvas

// =========================================================================
// BÀI HỌC BỔ SUNG (DSALessons.js chạy lớp thật → vết → các cảnh dưới đây)
// =========================================================================
function cnode(x, y, text, color = COL.gold, hl = false, alpha = 1, r = 15) {
  ctx.save();
  ctx.globalAlpha = alpha;
  if (hl) { ctx.shadowColor = color; ctx.shadowBlur = 18; }
  ctx.fillStyle = hl ? color : 'rgba(15,23,42,0.95)';
  ctx.strokeStyle = color;
  ctx.lineWidth = hl ? 2.5 : 1.6;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.font = MONO(r > 13 ? 10.5 : 9);
  ctx.fillStyle = hl ? '#0b0f17' : COL.white;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(text), x, y + 0.5);
  ctx.restore();
}

function line(x1, y1, x2, y2, color = 'rgba(148,163,184,0.55)', lw = 1.6, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

// Tọa độ nút của một ảnh chụp cây {nodes:[{key,depth,order}], height, size}
function treePos(snap, x, y, wid, hgt) {
  const pos = new Map();
  const dy = snap.height > 1 ? Math.min(46, hgt / (snap.height - 1)) : 0;
  for (const n of snap.nodes) {
    pos.set(n.key, [x + ((n.order + 0.5) / Math.max(1, snap.size)) * wid, y + n.depth * dy]);
  }
  return pos;
}

function drawSnapTree(snap, x, y, wid, hgt, opts = {}) {
  const { color = COL.gold, hl = null, alpha = 1, reveal = Infinity, r = 14, pos = null } = opts;
  const P = pos || treePos(snap, x, y, wid, hgt);
  const shown = new Set(snap.nodes.slice().sort((a, b) => a.key - b.key).slice(0, reveal).map(n => n.key));
  for (const [a, b] of snap.edges) {
    if (!shown.has(a) || !shown.has(b)) continue;
    const pa = P.get(a), pb = P.get(b);
    line(pa[0], pa[1], pb[0], pb[1], 'rgba(148,163,184,0.6)', 1.6, alpha);
  }
  for (const n of snap.nodes) {
    if (!shown.has(n.key)) continue;
    const [nx, ny] = P.get(n.key);
    cnode(nx, ny, n.key, color, hl ? hl(n) : false, alpha, r);
  }
  return P;
}

// ---- Lab 1: truy cập theo chỉ số -------------------------------------
function drawLessonArray(w, h, d, frame, p) {
  sceneTitle('jobs[] — dãy con trỏ nằm liền kề trong RAM', `${d.n.toLocaleString()} phần tử · mỗi ô ${d.slotBytes} byte`);
  const cells = d.window || [];
  const cw = Math.min(100, (w - 60) / (cells.length + 2));
  const ch = 52;
  const x0 = w / 2 - ((cells.length + 2) * cw) / 2;
  const y = h * 0.47;
  label('…', x0 + cw / 2, y + 5, MONO(16), COL.dim);
  label('…', x0 + (cells.length + 1) * cw + cw / 2, y + 5, MONO(16), COL.dim);
  let tx = w / 2;
  cells.forEach((c, k) => {
    const x = x0 + (k + 1) * cw;
    const isT = c.i === d.index;
    if (isT) tx = x + cw / 2;
    const found = isT && frame >= 3;
    const aimed = isT && frame === 2;
    panel(x + 3, y - ch / 2, cw - 6, ch, {
      fill: found ? 'rgba(52,211,153,0.22)' : 'rgba(255,255,255,0.04)',
      stroke: found ? COL.green : aimed ? COL.yellow : 'rgba(148,163,184,0.4)',
      glow: found ? COL.green : null, r: 6
    });
    label(`[${c.i.toLocaleString()}]`, x + cw / 2, y - ch / 2 - 7, MONO(9.5), isT ? COL.yellow : COL.slate);
    label(shortJob(c.id), x + cw / 2, y - 3, MONO(10.5), COL.white);
    label(fmtMoney(c.budget), x + cw / 2, y + 13, MONO(9, false), COL.slate);
    label(`gốc+${(c.i * d.slotBytes).toLocaleString()}`, x + cw / 2, y + ch / 2 + 14, MONO(8, false), COL.dim);
  });
  if (frame === 2) {
    const a = easeOutCubic(p);
    panel(w / 2 - 170, y - 108, 340, 34, { fill: 'rgba(253,224,71,0.1)', stroke: COL.yellow, r: 8, alpha: a });
    label(`địa chỉ = gốc + ${d.index.toLocaleString()} × ${d.slotBytes} = gốc + ${(d.index * d.slotBytes).toLocaleString()} B`, w / 2, y - 86, MONO(11), COL.yellow, 'center', a);
    ctx.save(); ctx.globalAlpha = a; drawArrow(ctx, w / 2, y - 74, tx, y - ch / 2 - 18, COL.yellow); ctx.restore();
  }
  if (frame >= 3) {
    const t = frame === 3 ? easeOutCubic(p) : 1;
    const [bx, by] = arcPoint(34, y - ch / 2 - 24, tx, y - ch / 2 - 18, t, 46);
    label('CPU', 34, y - ch / 2 - 34, MONO(9), COL.sky);
    drawLightBead(ctx, bx, by, COL.green);
    if (t > 0.95) {
      label('1 bước ✓', tx, y - ch / 2 - 26, MONO(11), COL.green);
      label(`${d.job.id} · ${d.job.skill} · ${fmtMoney(d.job.budget)}`, w / 2, y + ch / 2 + 36, MONO(10.5), COL.green);
    }
  }
  if (frame === 4) {
    const by = h - 70;
    const maxW = w - 260;
    const g = easeOutCubic(p);
    label('Theo chỉ số', 20, by + 4, MONO(10), COL.green, 'left');
    panel(120, by - 8, Math.max(6, maxW / Math.max(1, d.steps)), 14, { fill: COL.green, stroke: COL.green, r: 3 });
    label(`1 bước · ${d.indexLatency}`, 130 + Math.max(6, maxW / d.steps), by + 4, MONO(10), COL.green, 'left');
    label('Quét tuyến tính', 20, by + 28, MONO(10), COL.rose, 'left');
    panel(120, by + 16, Math.max(6, maxW * g), 14, { fill: 'rgba(251,113,133,0.7)', stroke: COL.rose, r: 3 });
    label(`${Math.round(d.steps * g).toLocaleString()} bước · ${d.linearLatency}`, 130 + maxW * g, by + 28, MONO(10), COL.rose, 'left');
  }
}

// ---- Lab 2: DSLK đơn ---------------------------------------------------
function sllRow(nodes, w, y, opts = {}) {
  const { alphaOf = () => 1, colorOf = () => COL.gold, hlOf = () => false, dyOf = () => 0, skipArrowFrom = -1 } = opts;
  const n = nodes.length;
  const nw = Math.min(96, (w - 110) / Math.max(1, n) - 26);
  const gap = 26;
  const x0 = Math.max(16, w / 2 - (n * (nw + gap) + 40) / 2);
  const X = (i) => x0 + i * (nw + gap);
  nodes.forEach((nd, i) => {
    const a = alphaOf(i);
    if (a <= 0) return;
    const ny = y + dyOf(i);
    panel(X(i), ny - 20, nw, 40, { fill: hlOf(i) ? 'rgba(251,113,133,0.2)' : 'rgba(212,175,55,0.1)', stroke: colorOf(i), glow: hlOf(i) ? colorOf(i) : null, r: 8, alpha: a });
    label(shortJob(nd.jobId), X(i) + nw / 2 - 8, ny - 2, MONO(10.5), COL.white, 'center', a);
    label(fmtMoney(nd.budget), X(i) + nw / 2 - 8, ny + 12, MONO(8.5, false), COL.slate, 'center', a);
    line(X(i) + nw - 16, ny - 20, X(i) + nw - 16, ny + 20, colorOf(i), 1, a * 0.6);
    label('•', X(i) + nw - 8, ny + 4, MONO(12), COL.sky, 'center', a);
    if (i !== skipArrowFrom) {
      const last = i === n - 1;
      ctx.save(); ctx.globalAlpha = a;
      drawArrow(ctx, X(i) + nw - 6, ny, X(i) + nw + gap - 2, y + (last ? 0 : dyOf(i + 1)), COL.sky);
      ctx.restore();
      if (last) label('null', X(i) + nw + gap + 14, y + 4, MONO(10), COL.dim, 'center', a);
    }
  });
  if (n) {
    label('head', X(0) + nw / 2, y - 30, MONO(10), COL.green);
    drawArrow(ctx, X(0) + nw / 2, y - 27, X(0) + nw / 2, y - 22, COL.green);
  }
  return { X, nw, gap };
}

function drawLessonSLL(w, h, d, frame, p) {
  sceneTitle('DSLK đơn — danh sách việc đã lưu', 'mỗi nút: [dữ liệu | next •] → chỉ trỏ tới nút đi sau');
  const y = h * 0.48;
  const before = d.before || [];
  const n = before.length;
  if (frame === 1) {
    sllRow(before, w, y, { alphaOf: (i) => clamp01(p * n * 1.1 - (n - 1 - i)) });
    label('Nút mới nhất được chèn ở đầu (head) → không dời phần tử nào', w / 2, h - 52, SANS(12), COL.slate);
    return;
  }
  if (frame === 2) {
    sllRow(before, w, y);
    label('Muốn tới nút thứ k phải đi lần lượt qua k nút trước nó', w / 2, h - 52, SANS(12), COL.slate);
    return;
  }
  if (frame === 3) {
    const lay = sllRow(before, w, y, { hlOf: (i) => i === d.targetPos, colorOf: (i) => (i === d.targetPos ? COL.rose : COL.gold) });
    const cur = Math.min(d.targetPos, 1 + Math.floor(p * d.targetPos * 1.05));
    const prev = cur - 1;
    const mx = (i) => lay.X(i) + lay.nw / 2 - 8;
    label('prev', mx(prev), y + 42, MONO(10), COL.yellow);
    drawArrow(ctx, mx(prev), y + 32, mx(prev), y + 23, COL.yellow);
    label('current', mx(cur), y + 56, MONO(10), COL.rose);
    drawArrow(ctx, mx(cur), y + 46, mx(cur), y + 23, COL.rose);
    label(`bước ${cur}/${d.targetPos}`, w - 18, 24, MONO(12), COL.yellow, 'right');
    return;
  }
  if (frame === 4) {
    const t = easeInOutCubic(p);
    const lay = sllRow(before, w, y, {
      hlOf: (i) => i === d.targetPos,
      colorOf: (i) => (i === d.targetPos ? COL.rose : COL.gold),
      alphaOf: (i) => (i === d.targetPos ? 1 - 0.6 * t : 1),
      dyOf: (i) => (i === d.targetPos ? 46 * t : 0),
      skipArrowFrom: d.targetPos - 1
    });
    const a = d.targetPos - 1, b = d.targetPos + 1;
    if (b < n) {
      const x1 = lay.X(a) + lay.nw - 8, x2 = lay.X(b) + 2;
      ctx.save();
      ctx.strokeStyle = COL.green; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(x1, y - 20); ctx.quadraticCurveTo((x1 + x2) / 2, y - 20 - 50 * t, x2, y - 20); ctx.stroke();
      ctx.restore();
      label('prev.next = current.next', (x1 + x2) / 2, y - 48 - 20 * t, MONO(11), COL.green);
    }
    return;
  }
  sllRow(d.after || [], w, y, { colorOf: () => COL.green });
  label(`Còn ${d.after.length} nút · bỏ lưu ${d.target.jobId} ✓`, w / 2, h - 52, MONO(11), COL.green);
}

// ---- Lab 3: hàng đợi vòng -----------------------------------------------
function drawLessonCQueue(w, h, d, frame, p) {
  const s = d.snaps[Math.min(frame, d.snaps.length) - 1];
  const prevS = d.snaps[Math.max(0, frame - 2)];
  sceneTitle(`Hàng đợi vòng — mảng ${d.cap} ô`, 'front: vé sắp được giải ngân · rear: vé vừa xếp hàng');
  cornerStat(`size = ${s.size}/${d.cap}`, w, s.size === d.cap ? COL.rose : COL.yellow);
  label(s.op, w / 2, 70, MONO(15), COL.white);
  const cw = Math.min(92, (w - 80) / d.cap);
  const x0 = w / 2 - (cw * d.cap) / 2;
  const y = h * 0.5;
  for (let i = 0; i < d.cap; i++) {
    const x = x0 + i * cw;
    const v = s.buffer[i];
    const fresh = s.op.startsWith('enqueue') && i === s.rear;
    panel(x + 3, y - 26, cw - 6, 52, {
      fill: v ? (fresh ? 'rgba(212,175,55,0.3)' : 'rgba(56,189,248,0.14)') : 'rgba(255,255,255,0.03)',
      stroke: v ? (fresh ? COL.gold : COL.sky) : 'rgba(148,163,184,0.3)', glow: fresh ? COL.gold : null, r: 8,
      alpha: fresh ? 0.4 + 0.6 * easeOutCubic(p) : 1
    });
    label(v || '·', x + cw / 2, y + 5, MONO(14), v ? COL.white : COL.dim);
    label(`[${i}]`, x + cw / 2, y - 34, MONO(9.5), COL.slate);
    if (i === s.front && s.size > 0) { label('front', x + cw / 2, y + 48, MONO(10), COL.sky); drawArrow(ctx, x + cw / 2, y + 38, x + cw / 2, y + 29, COL.sky); }
    if (i === s.rear && s.rear >= 0) { label('rear', x + cw / 2, y + 66, MONO(10), COL.gold); drawArrow(ctx, x + cw / 2, y + 56, x + cw / 2, y + 29, COL.gold); }
  }
  // Mũi tên quay vòng từ ô cuối về ô đầu
  const wrap = frame - 1 === d.wrapStep;
  ctx.save();
  ctx.strokeStyle = wrap ? COL.gold : 'rgba(148,163,184,0.35)';
  ctx.lineWidth = wrap ? 2.4 : 1.2;
  ctx.setLineDash([5, 4]);
  const xr = x0 + d.cap * cw - cw / 2, xl = x0 + cw / 2;
  ctx.beginPath(); ctx.moveTo(xr, y - 42); ctx.quadraticCurveTo(w / 2, y - 100, xl, y - 42); ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
  label(`(i + 1) % ${d.cap}`, w / 2, y - 76, MONO(10), wrap ? COL.gold : COL.dim);
  if (s.op.startsWith('dequeue')) {
    const leaving = s.op.split('→ ')[1];
    const xi = x0 + prevS.front * cw + cw / 2;
    const t = easeOutCubic(p);
    label(`${leaving} → giải ngân 💸`, xi, y - 30 - 50 * t, MONO(12), COL.green, 'center', 1 - t * 0.6);
  }
}

// ---- Lab 4: BST suy biến vs AVL, 4 phép xoay ---------------------------
function drawLessonBstAvl(w, h, d, frame, p) {
  const top = 70, hgt = h - top - 60;
  if (frame <= 2) {
    sceneTitle('BST thường — chèn 10, 20, 30, … 70', frame === 1 ? 'khóa sau luôn lớn hơn → luôn rẽ phải' : `cây cao ${d.bst.height} = số nút → giống danh sách liên kết`);
    cornerStat(`cao ${d.bst.height}`, w, COL.rose);
    const reveal = frame === 1 ? Math.max(1, Math.ceil(p * d.bst.size)) : d.bst.size;
    drawSnapTree(d.bst, 40, top, w - 80, hgt, { color: frame === 2 ? COL.rose : COL.gold, reveal, r: 14, hl: (n) => frame === 1 && n.key === d.keys[reveal - 1] });
    return;
  }
  if (frame <= 4) {
    sceneTitle('AVL — cùng 7 khóa tăng dần', frame === 3 ? `tự xoay sau mỗi lần lệch: LL ${d.rotations.LL} · RR ${d.rotations.RR} · LR ${d.rotations.LR} · RL ${d.rotations.RL}` : `cao ${d.avl.height} ≈ log₂(7) → tối đa ${d.avl.height} bước tìm`);
    cornerStat(`cao ${d.avl.height}`, w, COL.green);
    const a = frame === 3 ? easeOutCubic(p) : 1;
    drawSnapTree(d.bst, 14, top, Math.min(200, w * 0.28), hgt, { color: COL.rose, alpha: 0.35, r: 9 });
    label('BST (cao ' + d.bst.height + ')', 14 + Math.min(200, w * 0.28) / 2, h - 46, MONO(9.5), COL.rose, 'center', 0.7);
    const x = Math.min(220, w * 0.3) + 20;
    drawSnapTree(d.avl, x, top + 10, w - x - 30, Math.min(hgt, 120), { color: COL.green, alpha: a, r: 15, hl: (n) => frame === 4 && n.depth === 0 });
    return;
  }
  if (frame === 5) {
    sceneTitle('4 kiểu mất cân bằng (chèn 3 khóa)', 'trái: BST thường · phải: AVL sau khi xoay');
    const cols = w > 640 ? 4 : 2;
    const rows = Math.ceil(d.cases.length / cols);
    const cw = (w - 24) / cols, chh = (h - 80) / rows;
    d.cases.forEach((c, i) => {
      const cx = 12 + (i % cols) * cw, cy = 60 + Math.floor(i / cols) * chh;
      panel(cx + 4, cy, cw - 8, chh - 10, { fill: 'rgba(255,255,255,0.03)', stroke: 'rgba(148,163,184,0.3)', r: 10 });
      label(`${c.kind} · ${c.seq.join('→')}`, cx + cw / 2, cy + 16, MONO(10.5), COL.gold);
      const half = (cw - 30) / 2;
      drawSnapTree(c.before, cx + 10, cy + 34, half - 6, chh - 70, { color: COL.rose, r: 10 });
      label('➜', cx + cw / 2, cy + chh / 2 + 6, MONO(14), COL.yellow);
      drawSnapTree(c.after, cx + cw / 2 + 8, cy + 40, half - 6, chh - 76, { color: COL.green, r: 10 });
    });
    return;
  }
  const c = d.cases[Math.min(d.cases.length - 1, frame - 6)];
  sceneTitle(`Ca ${c.kind}: chèn ${c.seq.join(' → ')}`, c.kind === 'LR' || c.kind === 'RL' ? 'gấp khúc → xoay kép (2 lần)' : 'thẳng hàng → xoay đơn (1 lần)');
  cornerStat(c.kind, w, COL.yellow);
  const half = (w - 60) / 2;
  const pb = treePos(c.before, 20, top, half - 20, hgt * 0.8);
  const pa = treePos(c.after, w / 2 + 20, top + 20, half - 20, hgt * 0.8);
  // Trái: BST (mờ). Phải: nút trượt từ vị trí cũ sang vị trí sau khi xoay
  drawSnapTree(c.before, 20, top, half - 20, hgt * 0.8, { color: COL.rose, alpha: 0.45, r: 16, pos: pb });
  label('trước khi xoay (lệch ±2)', 20 + (half - 20) / 2, h - 44, MONO(10), COL.rose);
  const t = easeInOutCubic(clamp01(p * 1.3));
  const mid = new Map();
  for (const n of c.after.nodes) {
    const a = pb.get(n.key), b = pa.get(n.key);
    mid.set(n.key, [lerp(a[0] + w / 2, b[0], t), lerp(a[1], b[1], t)]);
  }
  const edges = t < 0.5 ? c.before.edges : c.after.edges;
  for (const [a, b] of edges) line(mid.get(a)[0], mid.get(a)[1], mid.get(b)[0], mid.get(b)[1], 'rgba(148,163,184,0.6)', 1.6);
  for (const n of c.after.nodes) {
    const [x, y] = mid.get(n.key);
    const isRoot = c.after.nodes.find(m => m.depth === 0)?.key === n.key;
    cnode(x, y, n.key, COL.green, isRoot && t > 0.95, 1, 16);
  }
  label(t > 0.95 ? 'sau khi xoay: cân bằng ✓' : 'đang xoay…', w / 2 + 20 + (half - 20) / 2, h - 44, MONO(10), COL.green);
}

// ---- Lab 5: tính ổn định -----------------------------------------------
const TAG_COL = [COL.gold, COL.sky, COL.green, COL.rose, COL.amber];
function tagColor(tag) { return TAG_COL[(String(tag).charCodeAt(0) - 65) % TAG_COL.length]; }
function tagSub(tag) { return '₁₂₃₄'.indexOf(String(tag).slice(1)); }

function stabilityRow(items, y, w, caption, capColor, alpha = 1, markBad = false) {
  const cw = Math.min(84, (w - 170) / Math.max(1, items.length));
  const x0 = 150;
  label(caption, 16, y + 4, MONO(10.5), capColor, 'left', alpha);
  items.forEach((it, i) => {
    const bad = markBad && i > 0 && items[i - 1].budget === it.budget && tagSub(items[i - 1].tag) > tagSub(it.tag);
    const bad2 = markBad && i < items.length - 1 && items[i + 1].budget === it.budget && tagSub(items[i + 1].tag) < tagSub(it.tag);
    const c = tagColor(it.tag);
    panel(x0 + i * cw + 3, y - 22, cw - 6, 44, { fill: 'rgba(255,255,255,0.04)', stroke: bad || bad2 ? COL.rose : c, lw: bad || bad2 ? 2.6 : 1.4, glow: bad || bad2 ? COL.rose : null, r: 8, alpha });
    label(it.tag, x0 + i * cw + cw / 2, y - 1, MONO(15), c, 'center', alpha);
    label(fmtMoney(it.budget), x0 + i * cw + cw / 2, y + 14, MONO(8.5, false), COL.slate, 'center', alpha);
  });
}

function drawLessonStability(w, h, d, frame, p) {
  sceneTitle('Sắp tăng dần theo ngân sách', 'cùng chữ cái = cùng ngân sách · số nhỏ = thứ tự ban đầu');
  const a = easeOutCubic(p);
  const gap = Math.min(72, (h - 90) / 3);
  stabilityRow(d.original, 80, w, 'Ban đầu', COL.slate);
  if (frame >= 2) stabilityRow(d.merge, 80 + gap, w, d.mergeStable ? 'MergeSort ✓' : 'MergeSort ✗', COL.green, frame === 2 ? a : 1, true);
  if (frame >= 3) stabilityRow(d.quick, 80 + gap * 2, w, d.quickStable ? 'QuickSort ✓*' : 'QuickSort ✗', d.quickStable ? COL.yellow : COL.rose, frame === 3 ? a : 1, true);
  if (frame >= 4) label('Khung đỏ = hai việc bằng giá bị đảo thứ tự so với ban đầu', w / 2, h - 46, SANS(12), COL.rose);
}

// ---- Lab 6: Move-to-Front vs Transpose ---------------------------------
function selfOrgRow(list, y, w, caption, color, info, moved) {
  const cw = Math.min(86, (w - 210) / Math.max(5, list.length));
  const x0 = 130;
  label(caption, 16, y + 4, MONO(11), color, 'left');
  const X = (i) => x0 + i * cw + cw / 2;
  list.forEach((k, i) => {
    let x = X(i), yy = y, hl = false, a = 1;
    if (moved && k === moved.key) {
      hl = true;
      if (moved.from >= 0) {
        [x, yy] = arcPoint(X(moved.from), y, X(i), y, moved.t, moved.from === i ? 0 : 34);
      } else a = moved.t;
    }
    panel(x - cw / 2 + 3, yy - 17, cw - 6, 34, { fill: hl ? 'rgba(212,175,55,0.25)' : 'rgba(255,255,255,0.04)', stroke: hl ? color : 'rgba(148,163,184,0.4)', glow: hl ? color : null, r: 8, alpha: a });
    label(k, x, yy + 4, MONO(10.5), hl ? COL.white : COL.slate, 'center', a);
    label(String(i), X(i), y + 30, MONO(8.5, false), COL.dim);
  });
  label(info, w - 14, y + 4, MONO(10.5), color, 'right');
}

function drawLessonSelfOrg(w, h, d, frame, p) {
  const steps = d.steps || [];
  const k = Math.min(frame, steps.length) - 1;
  const s = steps[Math.max(0, k)];
  const summary = frame > steps.length;
  sceneTitle('Lịch sử từ khóa tìm kiếm', 'tìm tuyến tính từ vị trí 0 → phần tử càng gần đầu càng nhanh');
  // Chuỗi truy cập
  const chipW = Math.min(64, (w - 40) / d.seq.length);
  d.seq.forEach((key, i) => {
    const x = 20 + i * chipW + chipW / 2;
    const cur = !summary && i === k;
    panel(x - chipW / 2 + 2, 52, chipW - 4, 22, { fill: cur ? 'rgba(253,224,71,0.25)' : 'rgba(255,255,255,0.03)', stroke: cur ? COL.yellow : i < k || summary ? 'rgba(52,211,153,0.5)' : 'rgba(148,163,184,0.25)', r: 6 });
    label(key, x, 67, MONO(9), cur ? COL.yellow : COL.slate);
  });
  const t = easeInOutCubic(p);
  if (summary) {
    const last = steps[steps.length - 1];
    const maxW = w - 260;
    const mx = Math.max(last.mtfTotal, last.trTotal);
    const by = h * 0.5;
    label('Tổng số bước', w / 2, by - 30, MONO(12), COL.white);
    label('Move-to-Front', 20, by + 4, MONO(10.5), COL.gold, 'left');
    panel(140, by - 8, maxW * (last.mtfTotal / mx) * t, 16, { fill: COL.gold, stroke: COL.gold, r: 3 });
    label(String(last.mtfTotal), 150 + maxW * (last.mtfTotal / mx) * t, by + 5, MONO(11), COL.gold, 'left');
    label('Transpose', 20, by + 34, MONO(10.5), COL.sky, 'left');
    panel(140, by + 22, maxW * (last.trTotal / mx) * t, 16, { fill: COL.sky, stroke: COL.sky, r: 3 });
    label(String(last.trTotal), 150 + maxW * (last.trTotal / mx) * t, by + 35, MONO(11), COL.sky, 'left');
    return;
  }
  const mInfo = `${s.mtf.hit ? 'HIT' : 'MISS'} · ${s.mtf.steps} bước · Σ ${s.mtfTotal}`;
  const tInfo = `${s.tr.hit ? 'HIT' : 'MISS'} · ${s.tr.steps} bước · Σ ${s.trTotal}`;
  selfOrgRow(s.mtf.list, h * 0.45, w, 'Move-to-Front', COL.gold, mInfo, { key: s.key, from: s.mtf.pos, t });
  selfOrgRow(s.tr.list, h * 0.72, w, 'Transpose', COL.sky, tInfo, { key: s.key, from: s.tr.pos, t });
}

// =========================================================================
// THUẬT TOÁN SÀN TMĐT: TRIE · MIN-HEAP TOP-K · LRU CACHE
// =========================================================================
function tnode(x, y, r, text, opts = {}) {
  const { stroke = COL.slate, fill = 'rgba(15,23,42,0.9)', glow = null, color = COL.white, alpha = 1, dash = null, font = MONO(11) } = opts;
  ctx.save();
  ctx.globalAlpha = alpha;
  if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 14; }
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = stroke;
  ctx.stroke();
  ctx.restore();
  label(text, x, y + 4, font, color, 'center', alpha);
}

function seg(x1, y1, x2, y2, color, lw = 1.4, alpha = 1, dash = null) {
  ctx.save();
  ctx.globalAlpha = alpha;
  if (dash) ctx.setLineDash(dash);
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

const fmtK = (v) => {
  const n = Number(v || 0);
  if (n < 1000) return `$${n}`;
  // giữ đủ chữ số để phân biệt các ngân sách sát nhau (vd $10.10k vs $10.15k trong Top-K)
  const k = n / 1000;
  return `$${Number.isInteger(k) ? k : k.toFixed(n % 100 === 0 ? 1 : 2)}k`;
};

// -------------------------------------------------------------------------
// TRIE — đi theo từng ký tự của tiền tố, rồi gom nhánh con
// -------------------------------------------------------------------------
function drawTrieCanvas(w, h, d, frame, p) {
  const path = d.path || [];
  const L = path.length;
  const t = easeInOutCubic(p);
  sceneTitle(`Trie · ${Number(d.vocab || 0).toLocaleString()} từ · ${Number(d.nodes || 0).toLocaleString()} nút`,
    `Gõ "${d.prefix}" → đi từ gốc theo từng ký tự, không quét ${Number(d.n || 0).toLocaleString()} bài đăng`);
  cornerStat(`${L} bước · O(L)`, w);

  const listW = Math.min(250, w * 0.36);
  const areaW = w - listW - 50;
  const colW = Math.min(110, areaW / (L + 1.4));
  const x0 = 36;
  const midY = h * 0.52;
  const cur = Math.min(frame, L) - 1;      // ký tự đang xét (0-based)
  const pathDone = frame > L;

  let prev = [x0, midY];
  tnode(x0, midY, 15, 'gốc', { stroke: COL.gold, font: MONO(9) });

  for (let i = 0; i < L; i++) {
    if (i > cur) break;
    const st = path[i];
    const x = x0 + (i + 1) * colW;
    const active = i === cur && !pathDone;
    const prog = active ? t : 1;
    let sibs = (st.siblings || []).slice(0, 7);
    if (st.found && !sibs.includes(st.ch)) sibs = [...sibs.slice(0, 6), st.ch];
    const ci = st.found ? sibs.indexOf(st.ch) : -1;
    const centre = ci >= 0 ? ci : (sibs.length - 1) / 2;
    const span = Math.max(centre, sibs.length - 1 - centre, 1);
    const sp = Math.min(30, (h * 0.5 - 50) / span);

    // các nhánh con khác của nút hiện tại (mờ)
    sibs.forEach((c, j) => {
      if (j === ci) return;
      const y = midY + (j - centre) * sp;
      seg(prev[0], prev[1], x, y, 'rgba(148,163,184,0.35)', 1, prog);
      tnode(x, y, 10, c, { stroke: '#475569', color: COL.dim, alpha: prog, font: MONO(9) });
    });
    if ((st.branching || 0) > sibs.length) {
      label(`+${st.branching - sibs.length}`, x, midY + (sibs.length - centre) * sp + 6, MONO(9, false), COL.dim, 'center', prog);
    }

    if (st.found) {
      // cạnh đúng ký tự được tô sáng, vẽ dần theo p
      const ex = lerp(prev[0], x, prog);
      const ey = lerp(prev[1], midY, prog);
      seg(prev[0], prev[1], ex, ey, COL.gold, 2.4);
      tnode(x, midY, 14, st.ch, { stroke: active ? COL.yellow : COL.gold, glow: active ? COL.yellow : null, fill: 'rgba(212,175,55,0.22)', alpha: clamp01(prog * 1.5) });
      label(`tầng ${st.depth + 1}`, x, midY + 32, MONO(9, false), COL.slate, 'center', prog);
      if (active) drawLightBead(ctx, ex, ey, COL.yellow);
      prev = [x, midY];
    } else {
      seg(prev[0], prev[1], lerp(prev[0], x, prog), midY, COL.rose, 2, 1, [5, 4]);
      tnode(x, midY, 14, st.ch, { stroke: COL.rose, color: COL.rose, dash: [4, 3], fill: 'rgba(251,113,133,0.12)', alpha: clamp01(prog * 1.5) });
      label('✗ không có cạnh', x, midY + 32, MONO(9.5), COL.rose, 'center', prog);
    }
  }

  // chữ đã gõ
  const typed = path.slice(0, Math.max(0, cur + 1)).map(s => s.ch).join('');
  label(`tiền tố: "${typed}${pathDone ? '' : '▌'}"`, x0 - 10, h - 22, MONO(12), COL.yellow, 'left');

  // Cột phải: gom nhánh con & gợi ý
  const lx = w - listW - 16;
  const ly = 62;
  if (!d.found && cur >= L - 1) {
    panel(lx, ly, listW, 70, { fill: 'rgba(251,113,133,0.10)', stroke: COL.rose, r: 10 });
    label(`Không có từ nào bắt đầu bằng`, lx + listW / 2, ly + 28, SANS(11.5), COL.rose);
    label(`"${d.prefix}" → dừng sau ${L} bước`, lx + listW / 2, ly + 48, MONO(11), COL.white);
    return;
  }
  if (!pathDone) {
    label('Mỗi bước: Map.get(ký tự) O(1)', lx + listW / 2, ly + 16, SANS(11), COL.slate);
    return;
  }

  const last = prev;
  const ranking = frame >= L + 2;
  if (!ranking) {
    // tia DFS tỏa từ nút cuối của tiền tố
    const rays = Math.min(12, Math.max(3, d.totalUnder || 0));
    for (let r = 0; r < rays; r++) {
      const ang = -0.9 + (1.8 * r) / Math.max(1, rays - 1);
      const len = 38 + (r % 3) * 12;
      seg(last[0], last[1], last[0] + Math.cos(ang) * len * t, last[1] + Math.sin(ang) * len * t, 'rgba(52,211,153,0.7)', 1.3);
    }
    label(`DFS: ${d.visited} nút · ${d.totalUnder} từ`, last[0] + 4, last[1] - 64, MONO(10.5), COL.green, 'center');
  }

  const sugg = d.suggestions || [];
  const maxC = Math.max(1, ...sugg.map(s => s.count));
  const rowH = Math.min(26, (h - ly - 30) / Math.max(1, sugg.length));
  label(ranking ? 'Gợi ý (theo số việc)' : 'Từ hoàn chỉnh trong nhánh', lx, ly - 8, MONO(10.5), COL.gold, 'left');
  sugg.forEach((s, i) => {
    const y = ly + i * rowH;
    const a = ranking ? clamp01(t * sugg.length - i + 1) : 0.5;
    const bw = (listW - 8) * (s.count / maxC) * (ranking ? t : 0.3);
    panel(lx, y, listW, rowH - 4, { fill: 'rgba(255,255,255,0.03)', stroke: 'rgba(148,163,184,0.25)', lw: 1, r: 6, alpha: a });
    if (bw > 2) panel(lx + 2, y + 2, bw, rowH - 8, { fill: 'rgba(52,211,153,0.22)', stroke: 'rgba(52,211,153,0)', lw: 0, r: 5, alpha: a });
    label(`${d.prefix}`, lx + 8, y + rowH / 2 + 2, MONO(10.5), COL.yellow, 'left', a);
    ctx.save();
    ctx.font = MONO(10.5);
    const pw = ctx.measureText(d.prefix).width;
    ctx.restore();
    label(String(s.word).slice(d.prefix.length), lx + 8 + pw, y + rowH / 2 + 2, MONO(10.5), COL.white, 'left', a);
    label(Number(s.count).toLocaleString(), lx + listW - 8, y + rowH / 2 + 2, MONO(10), COL.green, 'right', a);
  });
}

// -------------------------------------------------------------------------
// MIN-HEAP TOP-K — cây nhị phân + sift-down
// -------------------------------------------------------------------------
function heapXY(i, x, y, wid, gap) {
  const lv = Math.floor(Math.log2(i + 1));
  const first = 2 ** lv - 1;
  const cnt = 2 ** lv;
  return [x + ((i - first + 0.5) * wid) / cnt, y + lv * gap];
}

function drawHeapTopKCanvas(w, h, d, frame, p) {
  const lr = d.lastReplace;
  const kinds = ['build', 'reject'].concat(lr ? ['sift'] : []).concat(['pop', 'compare']);
  const kind = kinds[Math.min(frame, kinds.length) - 1];
  const t = easeInOutCubic(p);
  const k = d.k || (d.heap || []).length;
  sceneTitle(`Min-heap ${k} phần tử · duyệt ${Number(d.n || 0).toLocaleString()} việc`, 'gốc = ngân sách NHỎ NHẤT trong Top-K → việc nào ≤ gốc bị loại ngay');
  cornerStat('O(n log k)', w);

  const splitX = Math.max(260, w * 0.58);
  const tx = 16;
  const ty = 84;
  const treeW = splitX - 30;
  const levels = Math.max(1, Math.ceil(Math.log2(k + 1)));
  const gap = Math.min(72, (h - ty - 46) / Math.max(1, levels - 1));
  const nodeW = Math.max(40, Math.min(70, treeW / 2 ** (levels - 1) - 6));

  // giá trị hiển thị tại mỗi ô
  let arr = d.heap || [];
  let movingPos = null;
  let moving = null;
  const hot = new Set();
  if (kind === 'sift' && lr) {
    const path = lr.path || [0];
    const s = t * (path.length - 1);
    arr = lr.before.slice();
    for (let j = 0; j < path.length - 1; j++) {
      if (j < s) arr[path[j]] = lr.before[path[j + 1]]; // nút con được đẩy lên
    }
    arr[path[path.length - 1]] = p >= 0.999 ? lr.incoming : arr[path[path.length - 1]];
    const pts = path.map(i => heapXY(i, tx, ty, treeW, gap));
    movingPos = along(pts, s);
    moving = lr.incoming;
    path.forEach(i => hot.add(i));
  }
  const tree = kind === 'pop' || kind === 'compare' ? 0.35 : 1;

  // cạnh
  for (let i = 1; i < arr.length; i++) {
    const [x1, y1] = heapXY((i - 1) >> 1, tx, ty, treeW, gap);
    const [x2, y2] = heapXY(i, tx, ty, treeW, gap);
    const shown = kind === 'build' ? clamp01(t * arr.length - i) : 1;
    seg(x1, y1 + 12, x2, y2 - 12, hot.has(i) && hot.has((i - 1) >> 1) ? COL.yellow : 'rgba(148,163,184,0.4)', 1.3, shown * tree);
  }
  // nút
  arr.forEach((j, i) => {
    if (!j) return;
    const [x, y] = heapXY(i, tx, ty, treeW, gap);
    const shown = kind === 'build' ? clamp01(t * arr.length - i + 1) : 1;
    const isRoot = i === 0;
    const glowRoot = isRoot && kind === 'reject';
    const isLanding = moving && p >= 0.999 && j === moving;
    pill(x, y, nodeW, 30, fmtK(j.budget), shortJob(j.id), {
      fill: isRoot ? 'rgba(56,189,248,0.18)' : 'rgba(212,175,55,0.12)',
      stroke: glowRoot ? COL.yellow : isLanding ? COL.green : hot.has(i) ? COL.amber : isRoot ? COL.sky : COL.gold,
      glow: glowRoot ? COL.yellow : isLanding ? COL.green : null,
      r: 8,
      alpha: shown * tree
    });
    if (isRoot && tree === 1) label('gốc (min)', x + nodeW / 2 + 6, y + 4, MONO(9, false), COL.sky, 'left', shown);
  });
  if (moving && p < 0.999) {
    pill(movingPos[0], movingPos[1] - 4, nodeW + 4, 30, fmtK(moving.budget), shortJob(moving.id), { fill: 'rgba(52,211,153,0.28)', stroke: COL.green, glow: COL.green, r: 8 });
  }

  // Cột phải
  const rx = splitX + 6;
  const rw = w - rx - 16;
  let y = 76;
  const line2 = (a, b, color = COL.white, alpha = 1) => {
    label(a, rx, y, SANS(11), COL.slate, 'left', alpha);
    label(b, rx + rw, y, MONO(11), color, 'right', alpha);
    y += 20;
  };
  if (kind === 'build') {
    label(`push ${k} việc đầu (sift-up)`, rx, y, MONO(11), COL.gold, 'left'); y += 22;
    line2('Số nút', `${Math.min(k, Math.ceil(t * k))}/${k}`);
    line2('Gốc hiện tại', d.heap && d.heap[0] ? fmtMoney(d.heap[0].budget) : '—', COL.sky);
  } else if (kind === 'reject') {
    label('So sánh với gốc — 1 phép', rx, y, MONO(11), COL.gold, 'left'); y += 24;
    const frac = (d.rejects || 0) / Math.max(1, d.n);
    panel(rx, y, rw, 12, { fill: 'rgba(255,255,255,0.05)', stroke: '#334155', lw: 1, r: 6 });
    panel(rx, y, Math.max(6, rw * frac * t), 12, { fill: 'rgba(251,113,133,0.5)', stroke: COL.rose, lw: 1, r: 6 });
    y += 30;
    line2('Bị loại ngay O(1)', `${Math.round((d.rejects || 0) * t).toLocaleString()}`, COL.rose);
    line2('Vào heap (thay gốc)', `${Number(d.replaces || 0).toLocaleString()}`, COL.green);
    line2('Tỉ lệ loại', `${(frac * 100).toFixed(1)}%`, COL.yellow);
  } else if (kind === 'sift' && lr) {
    label(`Việc thứ ${Number(lr.index).toLocaleString()} vào heap`, rx, y, MONO(11), COL.gold, 'left'); y += 22;
    line2('Mới', `${shortJob(lr.incoming.id)} ${fmtMoney(lr.incoming.budget)}`, COL.green);
    line2('Gốc bị loại', `${shortJob(lr.removed.id)} ${fmtMoney(lr.removed.budget)}`, COL.rose);
    line2('Đường sift-down', (lr.path || []).join(' → '), COL.amber);
    line2('Số tầng', String((lr.path || []).length - 1), COL.yellow);
  } else {
    const top = d.top || [];
    const rows = kind === 'pop' ? top : top.slice(0, Math.min(top.length, 4));
    label(kind === 'pop' ? `Top ${top.length} (pop rồi đảo ngược)` : 'Top 4 / so với sắp xếp toàn bộ', rx, y - 4, MONO(11), COL.gold, 'left');
    y += 6;
    const rh = Math.min(22, (h - y - (kind === 'compare' ? 120 : 20)) / Math.max(1, rows.length));
    rows.forEach((j, i) => {
      const a = kind === 'pop' ? clamp01(t * rows.length - i + 0.5) : 1;
      label(`#${i + 1}`, rx, y + i * rh + 12, MONO(10), COL.yellow, 'left', a);
      label(shortJob(j.id), rx + 30, y + i * rh + 12, MONO(10, false), COL.slate, 'left', a);
      label(fmtMoney(j.budget), rx + rw, y + i * rh + 12, MONO(10.5), COL.green, 'right', a);
    });
    if (kind === 'compare') {
      let by = y + rows.length * rh + 18;
      const mx = Math.max(d.comparisons || 1, d.sortComparisons || 1);
      const bar = (name, val, time, color) => {
        label(`${name} · ${time}`, rx, by, SANS(11), COL.slate, 'left');
        by += 6;
        panel(rx, by, Math.max(6, rw * (val / mx) * t), 12, { fill: color + '88', stroke: color, lw: 1, r: 5 });
        label(Number(val).toLocaleString(), rx + rw, by + 10, MONO(10), color, 'right');
        by += 30;
      };
      bar('Heap', d.comparisons || 0, d.heapLatency, COL.green);
      bar('Sắp xếp toàn bộ', d.sortComparisons || 0, d.sortLatency, COL.rose);
      label(d.same ? '✓ cùng kết quả' : '✗ lệch kết quả', rx, by, MONO(11), d.same ? COL.green : COL.rose, 'left');
    }
  }
}

// -------------------------------------------------------------------------
// LRU CACHE — bảng băm + DSLK đôi: kéo nút lên đầu, loại nút cuối
// -------------------------------------------------------------------------
function drawLRUCanvas(w, h, d, frame, p) {
  const t = easeInOutCubic(p);
  const before = d.keysBefore || [];
  const after = d.keysAfter || [];
  const cap = d.capacity || Math.max(before.length, after.length, 1);
  const hit = !!d.hit;
  // frame: 1 tra Map · 2 tháo / tạo · 3 lên đầu / loại · 4 thống kê
  const kind = ['lookup', hit ? 'unlink' : 'create', hit ? 'front' : 'evict', 'stats'][Math.min(frame, 4) - 1];
  const nice = (k) => {
    const s = String(k ?? '');
    if (d.kind === 'recent') return shortJob(s);
    return s === '' ? '(trống)' : s.length > 9 ? s.slice(0, 8) + '…' : s;
  };
  sceneTitle(`LRU Cache · ${d.kind === 'recent' ? 'Việc bạn vừa xem' : 'Kết quả tìm kiếm'} · dung lượng ${cap}`,
    'Map: key → nút (O(1)) · DSLK đôi: đầu = mới dùng nhất, cuối = lâu chưa dùng nhất');
  cornerStat(hit ? 'HIT · O(1)' : 'MISS · O(1)', w, hit ? COL.green : COL.amber);

  // Chuỗi truy cập của bài học (nếu có)
  if (Array.isArray(d.seq) && d.seq.length) {
    const cw = Math.min(70, (w - 40) / d.seq.length);
    d.seq.forEach((s, i) => {
      const x = 20 + i * cw;
      const last = i === d.seq.length - 1;
      panel(x + 2, 50, cw - 4, 20, { fill: last ? 'rgba(253,224,71,0.22)' : 'rgba(255,255,255,0.03)', stroke: last ? COL.yellow : 'rgba(148,163,184,0.3)', r: 6 });
      label(nice(s.key), x + cw / 2, 64, MONO(9), last ? COL.yellow : s.hit ? COL.green : COL.slate);
    });
  }

  // Bảng băm (Map)
  const mapY = Array.isArray(d.seq) && d.seq.length ? 84 : 58;
  const mapW = Math.min(300, w - 40);
  panel(20, mapY, mapW, 34, { fill: 'rgba(56,189,248,0.08)', stroke: kind === 'lookup' ? COL.sky : 'rgba(56,189,248,0.4)', glow: kind === 'lookup' ? COL.sky : null, r: 8 });
  label(`Map.get("${nice(d.key)}")`, 32, mapY + 21, MONO(11), COL.sky, 'left');
  label(hit ? `→ nút #${d.fromPos}` : '→ undefined', 20 + mapW - 12, mapY + 21, MONO(11), hit ? COL.green : COL.rose, 'right', kind === 'lookup' ? clamp01(p * 2) : 1);

  // DSLK đôi
  const rowY = Math.max(mapY + 110, h * 0.58);
  const headX = 46;
  const tailX = w - 46;
  const slots = Math.max(cap, before.length + (hit ? 0 : 1), 1);
  const gapX = (tailX - headX - 70) / slots;
  const nodeW = Math.max(36, Math.min(84, gapX - 12));
  const sx = (i) => headX + 35 + gapX * (i + 0.5);

  // vị trí từng nút cần vẽ
  const nodes = [];
  if (kind === 'lookup' || (hit && kind === 'unlink')) {
    before.forEach((k, i) => {
      const isTarget = hit && i === d.fromPos;
      const lift = isTarget && kind === 'unlink' ? -46 * t : 0;
      nodes.push({ key: k, x: sx(i), y: rowY + lift, state: isTarget ? 'target' : 'idle', link: !(isTarget && kind === 'unlink') });
    });
  } else if (hit && kind === 'front') {
    before.forEach((k, i) => {
      if (i === d.fromPos) {
        nodes.push({ key: k, x: lerp(sx(i), sx(0), t), y: rowY - 46 * (1 - t), state: 'target', link: t > 0.95 });
      } else {
        const ni = i < d.fromPos ? i + 1 : i;
        nodes.push({ key: k, x: lerp(sx(i), sx(ni), t), y: rowY, state: 'idle', link: true });
      }
    });
  } else if (kind === 'create') {
    nodes.push({ key: d.key, x: sx(0), y: rowY - 60 * (1 - t), state: 'new', link: t > 0.95 });
    before.forEach((k, i) => nodes.push({ key: k, x: lerp(sx(i), sx(i + 1), t), y: rowY, state: 'idle', link: true }));
  } else if (kind === 'evict') {
    const all = [d.key, ...before];
    all.forEach((k, i) => {
      const gone = d.evicted !== null && d.evicted !== undefined && i === all.length - 1 && nice(k) === nice(d.evicted);
      nodes.push({ key: k, x: sx(i), y: rowY + (gone ? 60 * t : 0), state: i === 0 ? 'new' : gone ? 'evict' : 'idle', link: !gone, alpha: gone ? 1 - t * 0.7 : 1 });
    });
  } else {
    after.forEach((k, i) => nodes.push({ key: k, x: sx(i), y: rowY, state: i === 0 ? (hit ? 'target' : 'new') : 'idle', link: true }));
  }

  // HEAD / TAIL
  pill(headX, rowY, 56, 30, 'HEAD', null, { fill: 'rgba(212,175,55,0.2)', stroke: COL.gold, r: 8 });
  pill(tailX, rowY, 56, 30, 'TAIL', null, { fill: 'rgba(212,175,55,0.2)', stroke: COL.gold, r: 8 });
  label('mới nhất', headX, rowY + 32, MONO(9, false), COL.slate);
  label('cũ nhất', tailX, rowY + 32, MONO(9, false), COL.slate);

  const linked = nodes.filter(n => n.link).sort((a, b) => a.x - b.x);
  let lastX = headX + 28;
  linked.forEach((n) => {
    if (n.x - nodeW / 2 - lastX > 8) dblArrow(lastX, n.x - nodeW / 2, n.y, COL.gold, 0.9);
    lastX = n.x + nodeW / 2;
  });
  if (tailX - 28 - lastX > 8) dblArrow(lastX, tailX - 28, rowY, COL.gold, 0.9);

  nodes.forEach((n) => {
    const st = n.state;
    const stroke = st === 'target' ? COL.yellow : st === 'new' ? COL.green : st === 'evict' ? COL.rose : COL.gold;
    pill(n.x, n.y, nodeW, 34, nice(n.key), null, {
      fill: st === 'evict' ? 'rgba(251,113,133,0.15)' : st === 'new' ? 'rgba(52,211,153,0.15)' : 'rgba(212,175,55,0.10)',
      stroke, glow: st === 'idle' ? null : stroke, r: 8, alpha: n.alpha ?? 1,
      text: st === 'idle' ? COL.white : stroke
    });
  });

  // Ghi chú theo bước
  const note = {
    lookup: hit ? `Map trả về con trỏ tới nút đang đứng ở vị trí ${d.fromPos}` : 'Không có trong Map → phải tính kết quả rồi lưu lại',
    unlink: 'Tháo nút: prev.next = next · next.prev = prev',
    front: 'Chèn ngay sau HEAD: nút vừa dùng là "mới nhất"',
    create: d.kind === 'search' ? `Quét tuyến tính (${d.missLatency || '—'}), lưu ${Number(d.matchesCount || 0).toLocaleString()} con trỏ vào nút mới` : 'Tạo nút mới chứa con trỏ tới JobPost',
    evict: d.evicted ? `Vượt ${cap} nút → loại "${nice(d.evicted)}" sát TAIL và xóa khỏi Map` : `Còn chỗ (${after.length}/${cap}) → không loại nút nào`,
    stats: ''
  }[kind];
  if (note) label(note, w / 2, rowY + 70, SANS(12), COL.white);

  if (kind === 'stats') {
    const s = d.stats || {};
    const total = (s.hits || 0) + (s.misses || 0);
    const bw = Math.min(360, w - 80);
    const bx = (w - bw) / 2;
    const by = rowY + 62;
    panel(bx, by, bw, 12, { fill: 'rgba(251,113,133,0.25)', stroke: '#334155', lw: 1, r: 6 });
    if (total) panel(bx, by, Math.max(6, bw * ((s.hits || 0) / total) * t), 12, { fill: 'rgba(52,211,153,0.6)', stroke: COL.green, lw: 1, r: 6 });
    label(`Hit ${s.hits || 0} · Miss ${s.misses || 0} · Bị loại ${s.evictions || 0} · Tỉ lệ hit ${((s.hitRate || 0) * 100).toFixed(1)}%`, w / 2, by + 32, MONO(11), COL.white);
  }
}

// =========================================================================
// TOKEN BUCKET — xô token, nạp lại theo thời gian, cho phép / từ chối
// =========================================================================
function drawTokenBucketCanvas(w, h, d, frame, p) {
  const t = easeInOutCubic(p);
  const cap = d.capacity || 5;
  const step = Math.min(frame, 4);
  const allowed = !!d.allowed;
  let tokens;
  if (step === 1) tokens = lerp(d.tokensBefore, d.tokensAfterRefill, t);
  else if (step === 2) tokens = d.tokensAfterRefill;
  else if (step === 3) tokens = allowed ? lerp(d.tokensAfterRefill, d.tokensAfter, t) : d.tokensAfter;
  else tokens = d.tokensAfter;

  sceneTitle(`Token Bucket · ${cap} token, nạp ${d.refillPerSec} token/giây`, `Mỗi lần nộp hồ sơ lấy 1 token · xô rỗng → từ chối · người dùng ${d.user || ''}`);
  cornerStat(step >= 3 ? (allowed ? 'CHO PHÉP · O(1)' : 'TỪ CHỐI · O(1)') : 'O(1)', w, step >= 3 ? (allowed ? COL.green : COL.rose) : COL.yellow);

  // Dòng thời gian của bài học
  let topY = 56;
  if (Array.isArray(d.events) && d.events.length) {
    const n = d.events.length;
    const cw = Math.min(78, (w - 40) / n);
    d.events.forEach((e, i) => {
      const x = 20 + i * cw;
      const last = i === n - 1;
      const c = e.allowed ? COL.green : COL.rose;
      panel(x + 2, 50, cw - 4, 30, { fill: last ? 'rgba(253,224,71,0.18)' : 'rgba(255,255,255,0.03)', stroke: last ? COL.yellow : c, r: 6, lw: last ? 2 : 1 });
      label(`${(e.t / 1000).toFixed(2)}s`, x + cw / 2, 62, MONO(9, false), COL.slate);
      label(e.allowed ? '✓ nộp' : '✗ chặn', x + cw / 2, 75, MONO(9.5), c);
    });
    topY = 92;
  }

  // Vòi nạp token
  const bx = Math.max(150, w * 0.32);
  const bw = Math.min(150, w * 0.26);
  const slotH = Math.min(30, (h - topY - 120) / cap);
  const bh = slotH * cap + 16;
  const by = topY + 46;
  panel(bx - 30, topY + 4, 60, 18, { fill: 'rgba(56,189,248,0.12)', stroke: COL.sky, r: 5, glow: step === 1 ? COL.sky : null });
  label(`+${d.refillPerSec}/s`, bx, topY + 17, MONO(9.5), COL.sky);
  if (step === 1 && d.refilled > 0.001) {
    for (let k = 0; k < 3; k++) {
      const q = ((performance.now() / 700) + k / 3) % 1;
      ctx.save();
      ctx.globalAlpha = 1 - q;
      ctx.fillStyle = COL.sky;
      ctx.beginPath();
      ctx.arc(bx, topY + 26 + q * (bh * 0.6), 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // Xô
  ctx.save();
  ctx.strokeStyle = COL.gold;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(bx - bw / 2, by);
  ctx.lineTo(bx - bw / 2 + 8, by + bh);
  ctx.lineTo(bx + bw / 2 - 8, by + bh);
  ctx.lineTo(bx + bw / 2, by);
  ctx.stroke();
  ctx.restore();
  for (let i = 0; i < cap; i++) {
    const fill = clamp01(tokens - i);
    const cy = by + bh - 8 - slotH * (i + 0.5);
    const cw2 = bw - 30;
    panel(bx - cw2 / 2, cy - slotH / 2 + 3, cw2, slotH - 6, { fill: 'rgba(255,255,255,0.03)', stroke: 'rgba(148,163,184,0.25)', lw: 1, r: 6 });
    if (fill > 0) {
      const c = fill >= 1 ? COL.green : COL.amber;
      panel(bx - cw2 / 2, cy - slotH / 2 + 3, Math.max(6, cw2 * fill), slotH - 6, { fill: fill >= 1 ? 'rgba(52,211,153,0.45)' : 'rgba(245,158,11,0.4)', stroke: c, lw: 1, r: 6 });
    }
  }
  label(`tokens = ${Number(tokens).toFixed(2)} / ${cap}`, bx, by + bh + 22, MONO(12), COL.white);

  // Yêu cầu nộp hồ sơ
  const rx0 = w - 70;
  const rx1 = bx + bw / 2 + 60;
  const ry = by + bh / 2;
  if (step >= 2) {
    const prog = step === 2 ? t : 1;
    const x = lerp(rx0, rx1, prog);
    const c = step >= 3 ? (allowed ? COL.green : COL.rose) : COL.yellow;
    pill(x, ry, 96, 38, 'Hồ sơ', step >= 3 ? (allowed ? 'đã lấy 1 token' : `chờ ${(d.waitMs / 1000).toFixed(1)}s`) : 'cần 1 token', { fill: 'rgba(15,23,42,0.85)', stroke: c, glow: c, r: 8, text: c });
    if (step === 2) label(`${Number(d.tokensAfterRefill).toFixed(2)} ${d.tokensAfterRefill >= 1 ? '≥' : '<'} 1 ?`, (x + bx + bw / 2) / 2, ry - 30, MONO(12), COL.yellow);
    if (step >= 3) {
      if (allowed) {
        drawArrow(ctx, x + 50, ry, Math.min(w - 20, x + 130), ry, COL.green);
        label('→ DSLK đôi', Math.min(w - 24, x + 130), ry - 10, MONO(10), COL.green, 'right');
      } else {
        label('✗', x, ry - 30, MONO(18), COL.rose);
      }
    }
  }

  // Công thức
  const fy = h - 26;
  const formula = step === 1
    ? `tokens = min(${cap}, ${Number(d.tokensBefore).toFixed(2)} + ${(d.elapsedMs / 1000).toFixed(2)}s × ${d.refillPerSec}) = ${Number(d.tokensAfterRefill).toFixed(2)}`
    : step === 2 ? 'cho phép ⇔ tokens ≥ 1'
      : step === 3 ? (allowed ? `tokens −= 1 → ${Number(d.tokensAfter).toFixed(2)}` : `chờ = (1 − ${Number(d.tokensAfter).toFixed(2)}) ÷ ${d.refillPerSec} = ${(d.waitMs / 1000).toFixed(1)} giây`)
        : `Cho phép ${d.stats?.allowed ?? 0} · Từ chối ${d.stats?.rejected ?? 0} · bộ nhớ 2 số / người`;
  label(formula, w / 2, fy, MONO(12), step === 3 && !allowed ? COL.rose : COL.gold);
}

// =========================================================================
// BAYESIAN AVERAGE — sao thô vs điểm Bayes
// =========================================================================
function drawBayesCanvas(w, h, d, frame, p) {
  const t = easeInOutCubic(p);
  const step = Math.min(frame, 5);
  const raw = d.rawTop || [];
  const bay = d.bayesTop || [];
  const ex = d.example;
  sceneTitle(`Bayesian Average · C = ${Number(d.C).toFixed(3)}★ · m = ${d.m}`, `Xếp hạng uy tín trên ${Number(d.n || 0).toLocaleString()} việc: sao thô (trái) và điểm Bayes (phải)`);
  cornerStat('O(n) + O(n log n)', w);

  // Công thức
  const fx = w / 2;
  panel(fx - Math.min(280, w / 2 - 20), 52, Math.min(560, w - 40), 36, { fill: 'rgba(212,175,55,0.10)', stroke: step === 3 ? COL.yellow : COL.gold, glow: step === 3 ? COL.yellow : null, r: 8 });
  const ftxt = step >= 3 && ex
    ? `${ex.id}: (${ex.v}·${ex.R.toFixed(1)} + ${d.m}·${Number(d.C).toFixed(2)}) / (${ex.v} + ${d.m}) = ${ex.score.toFixed(3)}`
    : 'score = (v · R + m · C) / (v + m)';
  label(ftxt, fx, 75, MONO(12.5), step === 3 ? COL.yellow : COL.white);

  const top = 112;
  const rowH = Math.min(34, (h - top - 70) / Math.max(raw.length, bay.length, 1));
  const colW = (w - 60) / 2;
  const lx = 20;
  const rx = 40 + colW;
  label('SAO THÔ (R)', lx, top - 6, MONO(10.5), COL.amber, 'left');
  label('ĐIỂM BAYES', rx, top - 6, MONO(10.5), COL.gold, 'left', step >= 4 ? 1 : 0.3);
  const scale = (v) => clamp01((v - 3) / 2); // 3★..5★
  const barX0 = 150;
  const barW = Math.max(40, colW - barX0 - 40);
  const pos = new Map();

  raw.forEach((r, i) => {
    const y = top + i * rowH;
    const isEx = ex && r.id === ex.id && step >= 3;
    const dropped = step >= 5 && !r.bayesRank;
    const c = dropped ? COL.rose : isEx ? COL.yellow : COL.white;
    panel(lx, y, colW, rowH - 6, { fill: dropped ? 'rgba(251,113,133,0.10)' : 'rgba(255,255,255,0.03)', stroke: isEx ? COL.yellow : dropped ? COL.rose : 'rgba(148,163,184,0.25)', lw: isEx ? 2 : 1, r: 6 });
    label(`#${i + 1} ${shortJob(r.id)}`, lx + 8, y + rowH / 2 + 1, MONO(10.5), c, 'left');
    label(`${r.v} đg`, lx + barX0 - 10, y + rowH / 2 + 1, MONO(9.5, false), r.v < d.m ? COL.rose : COL.slate, 'right');
    const bwid = barW * scale(r.R) * (step === 1 ? t : 1);
    panel(lx + barX0, y + rowH / 2 - 6, Math.max(4, bwid), 9, { fill: 'rgba(245,158,11,0.55)', stroke: COL.amber, lw: 1, r: 4 });
    label(`${r.R.toFixed(1)}★`, lx + barX0 + barW + 34, y + rowH / 2 + 1, MONO(10), COL.amber, 'right');
    pos.set(r.id, [lx + colW, y + (rowH - 6) / 2]);
  });
  // vạch trung bình C
  if (step >= 2) {
    const cx = lx + barX0 + barW * scale(d.C);
    ctx.save();
    ctx.globalAlpha = step === 2 ? t : 0.8;
    ctx.strokeStyle = COL.sky;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(cx, top - 2);
    ctx.lineTo(cx, top + raw.length * rowH - 6);
    ctx.stroke();
    ctx.restore();
    label(`C ${Number(d.C).toFixed(2)}`, cx, top + raw.length * rowH + 8, MONO(9.5), COL.sky);
  }

  if (step >= 4) {
    const a = step === 4 ? t : 1;
    bay.forEach((r, i) => {
      const y = top + i * rowH;
      const fromRaw = !!r.rawRank;
      panel(rx, y, colW, rowH - 6, { fill: 'rgba(212,175,55,0.08)', stroke: fromRaw ? COL.gold : COL.green, r: 6, alpha: a });
      label(`#${i + 1} ${shortJob(r.id)}`, rx + 8, y + rowH / 2 + 1, MONO(10.5), fromRaw ? COL.white : COL.green, 'left', a);
      label(`${r.R.toFixed(1)}★·${r.v}`, rx + barX0 - 10, y + rowH / 2 + 1, MONO(9.5, false), COL.slate, 'right', a);
      panel(rx + barX0, y + rowH / 2 - 6, Math.max(4, barW * scale(r.score) * a), 9, { fill: 'rgba(212,175,55,0.6)', stroke: COL.gold, lw: 1, r: 4, alpha: a });
      label(r.score.toFixed(3), rx + barX0 + barW + 34, y + rowH / 2 + 1, MONO(10), COL.gold, 'right', a);
      if (step >= 5 && pos.has(r.id)) {
        const [x0, y0] = pos.get(r.id);
        ctx.save();
        ctx.globalAlpha = 0.7 * t;
        ctx.strokeStyle = COL.sky;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(rx, y + (rowH - 6) / 2);
        ctx.stroke();
        ctx.restore();
      }
    });
  }
  if (step >= 5) label(`${d.dropped} / ${raw.length} việc top sao thô bị loại khỏi top Bayes (viền đỏ: ít đánh giá hơn m = ${d.m})`, w / 2, top + raw.length * rowH + 28, SANS(11.5), COL.rose);
}

// =========================================================================
// JACCARD — Venn A ∩ B, ứng viên từ ô băm cùng kỹ năng
// =========================================================================
function drawJaccardCanvas(w, h, d, frame, p) {
  const t = easeInOutCubic(p);
  const step = Math.min(frame, 4);
  const A = d.A || [];
  const best = (d.top || [])[0];
  const B = best ? best.B || [] : [];
  sceneTitle(`Jaccard · Việc tương tự ${shortJob(d.jobId)} · #${d.skill}`, `Ứng viên: ${Number(d.m || 0).toLocaleString()} / ${Number(d.n || 0).toLocaleString()} việc trong cùng ô băm · J = |A∩B| / |A∪B|`);
  cornerStat('O(m · f)', w);

  // Dải ô băm
  const cells = 12;
  const cw = Math.min(42, (w - 200) / cells);
  const hx = 20;
  const bIdx = Number(d.bucket) || 0;
  const hl = bIdx % cells;
  for (let i = 0; i < cells; i++) {
    const on = i === hl;
    panel(hx + i * cw, 52, cw - 4, 22, { fill: on ? 'rgba(253,224,71,0.25)' : 'rgba(255,255,255,0.03)', stroke: on ? COL.yellow : 'rgba(148,163,184,0.25)', lw: on ? 2 : 1, r: 4, glow: on && step === 1 ? COL.yellow : null });
    label(on ? String(bIdx) : '', hx + i * cw + (cw - 4) / 2, 67, MONO(9), COL.yellow);
  }
  label(`hash("${d.skill}") → ô ${bIdx} → ${Number(d.m || 0).toLocaleString()} con trỏ`, hx + cells * cw + 10, 68, MONO(11), COL.yellow, 'left');

  if (step === 1) {
    // các ứng viên chảy ra từ ô băm
    const n = Math.min(14, d.m || 0);
    for (let i = 0; i < n; i++) {
      const q = clamp01(t * 1.4 - i / n * 0.4);
      const x = lerp(hx + hl * cw + cw / 2, 40 + (i / Math.max(1, n - 1)) * (w - 80), q);
      const y = lerp(76, h * 0.55, q);
      panel(x - 14, y - 9, 28, 18, { fill: 'rgba(212,175,55,0.15)', stroke: COL.gold, r: 4, alpha: q });
    }
    label(`Không quét ${Number(d.n || 0).toLocaleString()} việc — chỉ so ${Number(d.m || 0).toLocaleString()} việc cùng kỹ năng (${d.steps} bước băm)`, w / 2, h * 0.55 + 40, SANS(12), COL.white);
    return;
  }

  if (step <= 3) {
    const cy = Math.max(170, h * 0.52);
    const r = Math.max(60, Math.min(h * 0.33, w * 0.2, 150, cy - 112)); // chừa chỗ cho dải ô băm phía trên
    const ax = w / 2 - r * 0.62;
    const bxEnd = w / 2 + r * 0.62;
    const bxs = step === 2 ? w + r : lerp(w + r, bxEnd, t);
    const setB = new Set(B);
    const inter = A.filter(x => setB.has(x));
    const aOnly = A.filter(x => !setB.has(x));
    const bOnly = B.filter(x => !A.includes(x));
    // vòng A
    ctx.save();
    ctx.fillStyle = 'rgba(56,189,248,0.10)';
    ctx.strokeStyle = COL.sky;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ax, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (step === 3) {
      ctx.fillStyle = 'rgba(212,175,55,0.10)';
      ctx.strokeStyle = COL.gold;
      ctx.beginPath();
      ctx.arc(bxs, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
    label(`A = ${shortJob(d.jobId)} (${A.length})`, ax - r * 0.35, cy - r - 8, MONO(11), COL.sky);
    if (step === 3 && best) label(`B = ${shortJob(best.id)} (${B.length})`, bxs + r * 0.35, cy - r - 8, MONO(11), COL.gold);
    const cut = (x) => (x.length > 13 ? x.slice(0, 12) + '…' : x);
    const list = (items, x, color, max) => {
      const shown = items.slice(0, max);
      const lh = 15;
      const y0 = cy - ((shown.length - 1) * lh) / 2;
      shown.forEach((it, i) => label(cut(it), x, y0 + i * lh + 4, MONO(10, false), color));
      if (items.length > max) label(`+${items.length - max}`, x, y0 + shown.length * lh + 4, MONO(9.5, false), COL.slate);
    };
    const maxRows = Math.max(3, Math.floor((r * 1.6) / 15));
    if (step === 2) {
      list(A, ax, COL.white, maxRows);
      label('Mỗi việc → tập đặc trưng: kỹ năng, dải ngân sách, độ gấp, số slot, từ khóa tiêu đề', w / 2, h - 16, SANS(11.5), COL.slate);
    } else {
      list(aOnly, ax - r * 0.45, COL.sky, maxRows);
      if (t > 0.8) {
        list(inter, (ax + bxs) / 2, COL.green, maxRows);
        list(bOnly, bxs + r * 0.45, COL.gold, maxRows);
      }
      if (best) label(`|A ∩ B| = ${best.inter} · |A ∪ B| = ${best.union} → J = ${best.inter}/${best.union} = ${best.score.toFixed(3)}`, w / 2, h - 16, MONO(12), COL.green, 'center', clamp01(t * 1.5 - 0.3));
    }
    return;
  }

  // step 4: Top-5
  const top = d.top || [];
  const y0 = 96;
  const rowH = Math.min(44, (h - y0 - 40) / Math.max(1, top.length));
  const barX = Math.min(320, w * 0.45);
  const barW = w - barX - 90;
  top.forEach((it, i) => {
    const y = y0 + i * rowH;
    panel(20, y, w - 40, rowH - 8, { fill: i === 0 ? 'rgba(52,211,153,0.10)' : 'rgba(255,255,255,0.03)', stroke: i === 0 ? COL.green : 'rgba(148,163,184,0.3)', r: 8, alpha: clamp01(t * 2 - i * 0.2) });
    const title = String(it.title || '');
    label(`#${i + 1} ${shortJob(it.id)}  ${title.length > 26 ? title.slice(0, 25) + '…' : title}`, 32, y + rowH / 2, MONO(10.5), COL.white, 'left');
    panel(barX, y + rowH / 2 - 10, Math.max(4, barW * it.score * t), 10, { fill: 'rgba(212,175,55,0.6)', stroke: COL.gold, lw: 1, r: 4 });
    label(`J = ${it.inter}/${it.union} = ${it.score.toFixed(2)}`, w - 30, y + rowH / 2, MONO(10.5), COL.gold, 'right');
  });
  label(`${Number(d.comparisons || 0).toLocaleString()} phép tính Jaccard · giữ 5 điểm cao nhất bằng min-heap O(m log 5) · ${d.latency}`, w / 2, h - 14, SANS(11.5), COL.slate);
}

function drawGenericActionCanvas(w, h, act) {
  label(act.title, w / 2, h / 2, MONO(13), COL.white);
}

// Helper Functions
function drawRoundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawArrow(ctx, fromX, fromY, toX, toY, color) {
  const headLen = 8;
  const angle = Math.atan2(toY - fromY, toX - fromX);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - headLen * Math.cos(angle - Math.PI / 6), toY - headLen * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(toX - headLen * Math.cos(angle + Math.PI / 6), toY - headLen * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
}

function initCanvasSize() {
  if (!canvasRef.value) return;
  const canvas = canvasRef.value;
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

let resizeObserver = null;

onMounted(() => {
  initCanvasSize();
  window.addEventListener('resize', initCanvasSize);
  // HUD dùng v-show: canvas có kích thước 0 khi đang ẩn -> đo lại khi hiện ra
  if ('ResizeObserver' in window && canvasRef.value) {
    resizeObserver = new ResizeObserver(() => initCanvasSize());
    resizeObserver.observe(canvasRef.value);
  }
  animFrameId = requestAnimationFrame(renderLoop);
});

onUnmounted(() => {
  if (resizeObserver) resizeObserver.disconnect();
  window.removeEventListener('resize', initCanvasSize);
  if (animFrameId) cancelAnimationFrame(animFrameId);
  stopPlay();
});
</script>
