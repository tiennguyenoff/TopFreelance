<template>
  <div class="pointer-events-none fixed inset-0 z-[9999] overflow-hidden hidden md:block">
    <!-- Precision Crosshair / Cyber Reticle -->
    <div
      class="fixed -translate-x-1/2 -translate-y-1/2 transition-transform duration-150 ease-out"
      :style="{
        left: `${cursorX}px`,
        top: `${cursorY}px`,
        transform: `translate(-50%, -50%) rotate(${isHovering ? 45 : 0}deg) scale(${isHovering ? 1.3 : 1})`
      }"
    >
      <!-- Center Laser Core -->
      <div class="w-2 h-2 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-500 shadow-[0_0_10px_#10b981]"></div>

      <!-- 4-Corner Precision Markers -->
      <div
        class="absolute -top-2.5 -left-2.5 w-1.5 h-1.5 border-t-2 border-l-2 transition-colors duration-200"
        :class="isHovering ? 'border-cyan-400' : 'border-emerald-500/70'"
      ></div>
      <div
        class="absolute -top-2.5 -right-2.5 w-1.5 h-1.5 border-t-2 border-r-2 transition-colors duration-200"
        :class="isHovering ? 'border-cyan-400' : 'border-emerald-500/70'"
      ></div>
      <div
        class="absolute -bottom-2.5 -left-2.5 w-1.5 h-1.5 border-b-2 border-l-2 transition-colors duration-200"
        :class="isHovering ? 'border-cyan-400' : 'border-emerald-500/70'"
      ></div>
      <div
        class="absolute -bottom-2.5 -right-2.5 w-1.5 h-1.5 border-b-2 border-r-2 transition-colors duration-200"
        :class="isHovering ? 'border-cyan-400' : 'border-emerald-500/70'"
      ></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const cursorX = ref(-100);
const cursorY = ref(-100);
const isHovering = ref(false);

function onMouseMove(e) {
  cursorX.value = e.clientX;
  cursorY.value = e.clientY;

  const target = e.target;
  if (
    target && (
      target.tagName === 'BUTTON' ||
      target.tagName === 'A' ||
      target.tagName === 'INPUT' ||
      target.tagName === 'SELECT' ||
      target.closest('button') ||
      target.closest('a')
    )
  ) {
    isHovering.value = true;
  } else {
    isHovering.value = false;
  }
}

onMounted(() => {
  window.addEventListener('mousemove', onMouseMove);
});

onUnmounted(() => {
  window.removeEventListener('mousemove', onMouseMove);
});
</script>
