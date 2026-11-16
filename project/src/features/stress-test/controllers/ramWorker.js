/**
 * ramWorker.js — Web Worker chứa TOÀN BỘ dữ liệu của bài thử RAM tab web (mảng gốc + AVL + bảng băm).
 * Trang chính chỉ điều khiển và vẽ → luồng giao diện không bị chặn, và "Giải phóng RAM" = worker.terminate():
 * cả heap (isolate V8) của worker bị hủy ngay, không phải chờ bộ dọn rác và không cần cấp phát thêm rác ép GC.
 *
 * Giao thức: {id, type:'init'|'batch'|'mem'} → {id, ...kết quả}
 */
import { createTestData, generateAndIndexBatch, sampleAvlSearch, sampleHashSearch } from './RamTestController.js';

let data = createTestData();

const memInfo = () => {
  const m = typeof performance !== 'undefined' && performance.memory;
  return m ? { usedMB: m.usedJSHeapSize / 1048576, totalMB: m.totalJSHeapSize / 1048576 } : { usedMB: null, totalMB: null };
};

self.onmessage = (e) => {
  const { id, type } = e.data;
  if (type === 'batch') {
    const { size, seed, samples } = e.data;
    const t0 = performance.now();
    generateAndIndexBatch(data, size, seed, data.jobs.length);
    const avlUs = sampleAvlSearch(data.avl, data.jobs.length, samples);
    const hashUs = sampleHashSearch(data.hash, samples);
    self.postMessage({ id, jobs: data.jobs.length, blockMs: Math.round(performance.now() - t0), avlUs, hashUs, ...memInfo() });
  } else {
    self.postMessage({ id, jobs: data.jobs.length, ...memInfo() });
  }
};
