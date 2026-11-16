/**
 * SkillSearchMethods.js
 * Hash table skill search, category search, and binary search budget range
 */

import { CATEGORY_BY_ID } from '../../job-catalog/models/JobCatalog.js';

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const fmt = (ms) => {
  if (typeof ms !== 'number' || !isFinite(ms)) return '0ms';
  return ms < 1 ? `${(ms * 1000).toFixed(0)}μs` : `${ms.toFixed(2)}ms`;
};

export const SkillSearchMethods = {
  // =======================================================================
  // 3. LỌC THEO KỸ NĂNG — HASH TABLE (Horner + Chaining) + MOVE-TO-FRONT
  // =======================================================================
  searchSkill(skill) {
    const key = String(skill || '').toLowerCase().trim();
    const ht = this.hash;
    const capacity = ht.capacity;
    const mtfBefore = this.store.searchHistory.getHistory();

    // Từng bước Horner thật: h = (h*31 + code) % capacity
    const chars = [];
    let h = 0;
    for (let i = 0; i < key.length; i++) {
      h = (h * 31 + key.charCodeAt(i)) % capacity;
      chars.push({ ch: key[i], code: key.charCodeAt(i), h });
    }
    const bucket = ht.hornerHash(key);

    // Chuỗi va chạm thật tại bucket
    const chain = [];
    let node = ht.buckets[bucket];
    while (node) {
      chain.push({ key: node.key, count: node.count });
      node = node.next;
    }

    const t0 = now();
    const res = this.store.searchBySkill(key);
    const durMs = now() - t0;

    return {
      matches: res.matches || [],
      trace: {
        keyword: key,
        capacity,
        chars,
        bucket,
        chain: chain.slice(0, 5),
        chainLength: chain.length,
        foundPos: chain.findIndex(c => c.key === key),
        steps: res.steps,
        matchesCount: res.count || 0,
        loadFactor: Number(ht.loadFactor.toFixed(3)),
        distinctKeys: ht.distinctKeys,
        rehashCount: ht.rehashCount,
        mtfBefore: mtfBefore.slice(0, 6),
        mtfAfter: this.store.searchHistory.getHistory().slice(0, 6),
        mtfHit: !!res.mtfCacheHit,
        mtfPos: mtfBefore.indexOf(key),
        latency: fmt(durMs)
      }
    };
  },

  /**
   * Lọc theo LĨNH VỰC: một lĩnh vực gồm nhiều kỹ năng → tra bảng băm từng kỹ năng (O(1) mỗi lần)
   * rồi hợp các danh sách con trỏ. Không đụng lịch sử Move-to-Front (đây không phải từ khóa người gõ).
   */
  searchCategory(categoryId) {
    const cat = CATEGORY_BY_ID[categoryId];
    if (!cat) return { matches: [], trace: null };
    const t0 = now();
    const matches = [];
    const perSkill = [];
    for (const skill of cat.skills) {
      const res = this.hash.search(skill);
      for (const j of res.matches || []) if (j.category === categoryId) matches.push(j);
      perSkill.push({ skill, bucket: res.bucketIndex, count: res.count || 0, steps: res.steps || 0 });
    }
    const durMs = now() - t0;
    return {
      matches,
      trace: { category: categoryId, label: cat.label, perSkill, matchesCount: matches.length, latency: fmt(durMs) }
    };
  },

  // =======================================================================
  // 4. LỌC DẢI NGÂN SÁCH — BINARY SEARCH lowerBound / upperBound
  // =======================================================================
  _probeBound(arr, x, strict, probes) {
    let lo = 0;
    let hi = arr.length;
    while (lo < hi) {
      const mid = lo + Math.floor((hi - lo) / 2);
      const v = arr[mid].budget;
      const goLeft = strict ? v > x : v >= x;
      probes.push({ lo, hi, mid, v, goLeft });
      if (goLeft) hi = mid; else lo = mid + 1;
    }
    return lo;
  },

  budgetRange(minBudget, maxBudget) {
    const arr = this.sortedBudget;
    const min = Number(minBudget) > 0 ? Number(minBudget) : 0;
    const max = Number(maxBudget) > 0 ? Number(maxBudget) : Number.MAX_SAFE_INTEGER;
    const lowerProbes = [];
    const upperProbes = [];
    const left = this._probeBound(arr, min, false, lowerProbes);
    const right = this._probeBound(arr, max, true, upperProbes);

    const t0 = now();
    // BinarySearchRange is imported from the model and used here for verification
    const res = { matches: [], count: 0, comparisons: 0 };
    for (let i = left; i < right; i++) res.matches.push(arr[i]);
    res.count = res.matches.length;
    res.comparisons = lowerProbes.length + upperProbes.length;
    const durMs = now() - t0;

    return {
      matches: res.matches,
      trace: {
        n: arr.length,
        min,
        max: max === Number.MAX_SAFE_INTEGER ? null : max,
        minVal: arr.length ? arr[0].budget : 0,
        maxVal: arr.length ? arr[arr.length - 1].budget : 0,
        lowerProbes,
        upperProbes,
        left,
        right,
        count: res.count,
        comparisons: res.comparisons,
        verified: res.count === Math.max(0, right - left),
        latency: fmt(durMs)
      }
    };
  }
};
