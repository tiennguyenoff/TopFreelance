/**
 * SortMethods.js
 * QuickSort and MergeSort with tracing
 */

import { reactive, toRaw } from 'vue';
import { MergeSort } from '../models/MergeSort.js';
import { QuickSort } from '../models/QuickSort.js';

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const fmt = (ms) => {
  if (typeof ms !== 'number' || !isFinite(ms)) return '0ms';
  return ms < 1 ? `${(ms * 1000).toFixed(0)}μs` : `${ms.toFixed(2)}ms`;
};

const SORT_KEYS = {
  budget_desc: { field: 'budget', label: 'Ngân sách', unit: '$' },
  budget_asc: { field: 'budget', label: 'Ngân sách', unit: '$' },
  rating_desc: { field: 'clientRating', label: 'Rating', unit: '★' },
  deadline_asc: { field: 'deadlineDays', label: 'Hạn (ngày)', unit: 'd' }
};

export const SortMethods = {
  // =======================================================================
  // 10. SẮP XẾP — chạy thuật toán thật trên toàn danh sách + ghi vết mẫu 8 phần tử
  // =======================================================================
  sortList(list, criteria, algo = 'mergesort') {
    if (criteria === 'bayes_desc') {
      const cmp = this._bayesReady().comparator();
      if (algo === 'quicksort') return QuickSort.sort(list, { criteria: cmp, inPlace: false });
      return MergeSort.sort(list, { criteria: cmp, inPlace: false });
    }
    if (algo === 'quicksort') return QuickSort.sort(list, { criteria, inPlace: false });
    return MergeSort.sort(list, { criteria, inPlace: false });
  },

  traceSort(list, criteria, algo = 'mergesort') {
    const meta = SORT_KEYS[criteria] || SORT_KEYS.budget_desc;
    const t0 = now();
    const full = this.sortList(list, criteria, algo);
    const fullMs = now() - t0;

    // Mẫu 8 phần tử đầu tiên của danh sách hiện tại (thứ tự trước khi sắp xếp)
    const sample = [];
    for (let i = 0; i < Math.min(8, list.length); i++) sample.push(list[i]);
    const ids = new Map(sample.map((j, i) => [toRaw(j), i]));
    const items = sample.map((j, i) => ({
      tag: String.fromCharCode(65 + i),
      id: j.id,
      val: j[meta.field]
    }));
    const snap = (arr) => arr.map(x => ids.get(toRaw(x)));

    const events = [];
    if (algo === 'quicksort') {
      const origSwap = QuickSort.swap;
      const origPart = QuickSort.hoarePartition;
      try {
        QuickSort.hoarePartition = function (arr, low, high, cmp, stats, m3) {
          events.push({ kind: 'partition', low, high, order: snap(arr) });
          const p = origPart.call(this, arr, low, high, cmp, stats, m3);
          events.push({ kind: 'split', low, high, p, order: snap(arr) });
          return p;
        };
        QuickSort.swap = function (arr, i, j, stats) {
          origSwap.call(this, arr, i, j, stats);
          events.push({ kind: 'swap', i, j, order: snap(arr) });
        };
        QuickSort.sort(sample, { criteria, inPlace: false });
      } finally {
        QuickSort.swap = origSwap;
        QuickSort.hoarePartition = origPart;
      }
    } else {
      const origMerge = MergeSort.merge;
      const origSub = MergeSort.sortSubArray;
      try {
        MergeSort.merge = function (arr, aux, low, mid, high, cmp, stats) {
          origMerge.call(this, arr, aux, low, mid, high, cmp, stats);
          events.push({ kind: 'merge', low, mid, high, order: snap(arr) });
        };
        MergeSort.sortSubArray = function (arr, aux, low, high, cmp, stats) {
          origSub.call(this, arr, aux, low, high, cmp, stats);
          if (low < high) {
            const last = events[events.length - 1];
            if (!last || last.kind !== 'merge' || last.low !== low || last.high !== high) {
              const mid = low + Math.floor((high - low) / 2);
              events.push({ kind: 'skip', low, mid, high, order: snap(arr) });
            }
          }
        };
        MergeSort.sort(sample, { criteria, inPlace: false });
      } finally {
        MergeSort.merge = origMerge;
        MergeSort.sortSubArray = origSub;
      }
    }

    // Gộp bớt khung hình: chỉ giữ các sự kiện làm thay đổi thứ tự hoặc mốc phân hoạch
    let kept = events.filter(e => e.kind !== 'partition');
    if (kept.length > 12) {
      const step = kept.length / 12;
      const picked = [];
      for (let i = 0; i < 12; i++) picked.push(kept[Math.floor(i * step)]);
      picked[picked.length - 1] = kept[kept.length - 1];
      kept = picked;
    }

    return {
      sorted: full.sorted,
      trace: {
        algo,
        criteria,
        field: meta.label,
        unit: meta.unit,
        n: list.length,
        comparisons: full.comparisons,
        swaps: full.swaps ?? null,
        fullMs: Number(fullMs.toFixed(3)),
        items,
        initial: items.map((_, i) => i),
        events: kept,
        totalEvents: events.length,
        latency: fmt(fullMs)
      }
    };
  }
};
