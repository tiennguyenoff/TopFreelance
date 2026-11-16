<template>
  <aside class="h-full flex flex-col bg-cyber-900/90 border border-white/[0.06] rounded-2xl p-3 text-xs overflow-y-auto no-scrollbar space-y-4">
    <!-- Header -->
    <div class="pb-2 border-b border-white/[0.08] flex items-center justify-between">
      <div class="flex items-center gap-1.5 font-bold text-white uppercase tracking-wider text-[11px]">
        <span class="text-cyan-400">🔬</span>
        <span>DSA Simulator (10%)</span>
      </div>
      <span class="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-mono">Live</span>
    </div>

    <!-- 1. AVL Tree Balancing Engine -->
    <div class="p-2.5 rounded-xl bg-black/40 border border-cyan-500/20 space-y-2">
      <div class="flex items-center justify-between text-[11px] font-bold text-cyan-300">
        <span>🌲 AVL Tree (Lab 4)</span>
        <span class="font-mono text-slate-400">O(log n)</span>
      </div>
      <div class="text-[10px] text-slate-400 leading-tight">
        Khóa ID tăng dần $\rightarrow$ Tự động xoay giữ chiều cao $\le 17$.
      </div>
      <div class="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
        <div class="p-1 rounded bg-white/[0.03] border border-white/[0.04]">
          <span class="text-slate-500">LL/RR: </span>
          <strong class="text-white">{{ simulatorState.rotations.single }}</strong>
        </div>
        <div class="p-1 rounded bg-white/[0.03] border border-white/[0.04]">
          <span class="text-slate-500">LR/RL: </span>
          <strong class="text-white">{{ simulatorState.rotations.double }}</strong>
        </div>
        <div class="p-1 rounded bg-white/[0.03] border border-white/[0.04]">
          <span class="text-slate-500">Height: </span>
          <strong class="text-emerald-400">{{ simulatorState.treeHeight }}</strong>
        </div>
        <div class="p-1 rounded bg-white/[0.03] border border-white/[0.04]">
          <span class="text-slate-500">Ideal: </span>
          <strong class="text-slate-300">17</strong>
        </div>
      </div>
    </div>

    <!-- 2. Hash Table Collision Inspector -->
    <div class="p-2.5 rounded-xl bg-black/40 border border-emerald-500/20 space-y-2">
      <div class="flex items-center justify-between text-[11px] font-bold text-emerald-300">
        <span>⚡ Hash Index (Lab 6)</span>
        <span class="font-mono text-slate-400">O(1)</span>
      </div>
      <div class="text-[10px] text-slate-400 leading-tight">
        Hàm băm Horner cơ số 31 trên Skill Tag. Rehash khi $\alpha > 0.75$.
      </div>
      <div class="space-y-1 font-mono text-[10px]">
        <div class="flex justify-between text-slate-300">
          <span class="text-slate-500">Last Key:</span>
          <span class="text-emerald-400 font-bold">"{{ simulatorState.lastHashKey || 'react' }}"</span>
        </div>
        <div class="flex justify-between text-slate-300">
          <span class="text-slate-500">Bucket Slot:</span>
          <span>#{{ simulatorState.lastBucket }} / 133,337</span>
        </div>
        <div class="flex justify-between text-slate-300">
          <span class="text-slate-500">Chain Length:</span>
          <span class="text-amber-400">{{ simulatorState.lastChainLen }} nodes</span>
        </div>
      </div>
    </div>

    <!-- 3. Proposals Linked List Chain -->
    <div class="p-2.5 rounded-xl bg-black/40 border border-white/[0.06] space-y-2">
      <div class="flex items-center justify-between text-[11px] font-bold text-slate-200">
        <span>🔗 Proposal DSLK (Lab 2)</span>
        <span class="font-mono text-slate-400">O(1) Head</span>
      </div>
      <div class="text-[10px] text-slate-400">
        Nộp hồ sơ chèn đầu $O(1)$, rút đơn xóa giữa $O(1)$.
      </div>
      <div class="p-1.5 rounded bg-black/60 border border-white/[0.04] font-mono text-[9px] text-slate-400 overflow-x-auto whitespace-nowrap">
        <span>Head ➔ [P104] ⇄ [P089] ⇄ [P012] ➔ null</span>
      </div>
    </div>

    <!-- 4. LIFO Undo Stack & FIFO Queue -->
    <div class="p-2.5 rounded-xl bg-black/40 border border-flame-500/20 space-y-2">
      <div class="flex items-center justify-between text-[11px] font-bold text-flame-400">
        <span>⏳ Queue & Stack (Lab 3)</span>
        <span class="font-mono text-slate-400">O(1)</span>
      </div>
      <div class="space-y-1 text-[10px] font-mono">
        <div class="flex items-center justify-between">
          <span class="text-slate-400">FIFO Payout Queue:</span>
          <span class="text-emerald-400 font-bold">{{ simulatorState.queueCount }} tickets</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-slate-400">LIFO Undo Stack:</span>
          <span class="text-flame-400 font-bold">{{ simulatorState.stackCount }} frames</span>
        </div>
      </div>
      <div class="text-[9px] text-slate-500 italic">
        "Công bằng tuyệt đối cho freelancer hoàn thành trước."
      </div>
    </div>

    <!-- Oral Exam Quick Tip -->
    <div class="mt-auto p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-300">
      💡 <strong>Góc vấn đáp:</strong> Tất cả chỉ mục trên chỉ lưu con trỏ 8-byte, trỏ chung về 100k Job trong RAM, không clone bộ nhớ.
    </div>
  </aside>
</template>

<script setup>
defineProps({
  simulatorState: {
    type: Object,
    default: () => ({
      rotations: { single: 99420, double: 480 },
      treeHeight: 17,
      lastHashKey: 'react',
      lastBucket: 4210,
      lastChainLen: 1,
      queueCount: 4,
      stackCount: 2
    })
  }
});
</script>
