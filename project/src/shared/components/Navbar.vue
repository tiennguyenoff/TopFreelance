<template>
  <header class="w-full border-b border-emerald-500/15 bg-cyber-900/90 backdrop-blur-xl sticky top-0 z-50">
    <div class="w-full px-4 lg:px-6 h-14 flex items-center justify-between gap-3">
      <!-- Left: Brand -->
      <div class="flex items-center gap-2.5 flex-shrink-0">
        <div class="h-8 w-8 rounded-lg bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 p-0.5 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
          <div class="w-full h-full bg-cyber-950 rounded-[6px] flex items-center justify-center text-sm">
            ⚡
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span class="font-extrabold text-sm text-white tracking-tight bg-gradient-to-r from-white via-emerald-100 to-emerald-400 bg-clip-text text-transparent">
            TopFreelance
          </span>
          <span class="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
            DSA Core v1.0
          </span>
        </div>
      </div>

      <!-- Center: Labs Ribbon -->
      <nav class="flex items-center gap-1 p-0.5 rounded-xl bg-black/40 border border-white/[0.04] overflow-x-auto no-scrollbar max-w-full">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="$emit('select-lab', tab.id)"
          :class="[
            'px-2.5 py-1 text-xs font-semibold rounded-lg transition-all whitespace-nowrap flex items-center gap-1',
            currentLab === tab.id
              ? 'bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-bold shadow-[0_0_12px_rgba(16,185,129,0.35)]'
              : 'text-slate-300 hover:text-white hover:bg-white/[0.04]'
          ]"
        >
          <span>{{ tab.name }}</span>
        </button>
      </nav>

      <!-- Right: Realtime Hardware & Integrity Badges -->
      <div class="hidden sm:flex items-center gap-2 text-xs flex-shrink-0 font-mono">
        <div class="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/50 border border-emerald-500/20 text-[11px]">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span class="text-slate-400">RAM:</span>
          <strong class="text-emerald-400">&lt;150MB</strong>
          <span class="text-slate-500">/ 1GB</span>
        </div>
        <div class="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/50 border border-cyan-500/20 text-[11px]">
          <span class="text-slate-400">CPU:</span>
          <strong class="text-cyan-400">1 Core</strong>
        </div>
        <div class="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/50 border border-emerald-500/30 text-[11px]">
          <span class="text-emerald-400">✓ Invariants: 0 Errors</span>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
defineProps({
  currentLab: {
    type: Number,
    default: 7
  }
});

defineEmits(['select-lab']);

const tabs = [
  { id: 1, name: 'Lab 1: Static Jobs' },
  { id: 2, name: 'Lab 2: Linked Proposals' },
  { id: 3, name: 'Lab 3: Queue & Undo' },
  { id: 4, name: 'Lab 4: AVL Job Index' },
  { id: 5, name: 'Lab 5: Multi-key Sort' },
  { id: 6, name: 'Lab 6: Skill Hash Search' },
  { id: 7, name: 'Lab 7: Master Marketplace' },
];
</script>
