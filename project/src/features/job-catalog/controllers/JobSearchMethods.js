/**
 * JobSearchMethods.js
 * Linear search on the base jobs array and posting new jobs
 */

import { reactive } from 'vue';
import { JobPost } from '../models/JobPost.js';

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const fmt = (ms) => {
  if (typeof ms !== 'number' || !isFinite(ms)) return '0ms';
  return ms < 1 ? `${(ms * 1000).toFixed(0)}μs` : `${ms.toFixed(2)}ms`;
};

export function jobKey(id) {
  if (typeof id === 'number') return id;
  const k = parseInt(String(id || '').trim().toUpperCase().replace(/^JOB-?/, ''), 10);
  return Number.isNaN(k) ? null : k;
}

export const JobSearchMethods = {
  // 1. TÌM KIẾM TUYẾN TÍNH THEO TỪ KHÓA (Mảng gốc)
  // =======================================================================
  linearSearch(list, keyword) {
    const kw = String(keyword || '').trim().toLowerCase();
    const t0 = now();
    const matches = [];
    const window = [];
    let comparisons = 0;
    let firstHit = -1;
    for (let i = 0; i < list.length; i++) {
      comparisons++;
      const j = list[i];
      const hit = (j.title && j.title.toLowerCase().includes(kw)) ||
        (j.skillTag && j.skillTag.includes(kw)) ||
        (j.id && j.id.toLowerCase().includes(kw));
      if (hit) {
        matches.push(j);
        if (firstHit === -1) firstHit = i;
      }
      if (i < 10) window.push({ idx: i, id: j.id, title: j.title, hit: !!hit });
    }
    const durMs = now() - t0;
    return {
      matches,
      trace: {
        keyword: kw,
        n: list.length,
        comparisons,
        matchesCount: matches.length,
        firstHit,
        firstHitId: firstHit >= 0 ? list[firstHit].id : null,
        window,
        latency: fmt(durMs)
      }
    };
  },

  // 5. ĐĂNG VIỆC MỚI — unshift mảng gốc + chèn AVL (có xoay) + băm + chèn mảng sắp xếp
  // =======================================================================
  postJob(payload) {
    const t0 = now();
    const key = this.maxKey + 1;
    const id = `JOB-${String(key).padStart(6, '0')}`;
    const job = reactive(new JobPost({
      id,
      title: payload.title || `Dự án tuyển dụng #${key}`,
      skillTag: (payload.skillTag || 'general').toLowerCase().trim(),
      category: payload.category || undefined,
      budget: Number(payload.budget) || 1000,
      slots: Number(payload.slots) || 1,
      deadlineDays: Number(payload.deadlineDays) || 14,
      clientRating: 5.0
    }));
    job.isFromMySQL = true;

    // (1) Mảng gốc
    this.jobs.unshift(job);

    // (2) AVL — ghi lại đường đi trước khi chèn để tính nút mất cân bằng
    const avl = this.avl;
    const path = [];
    let node = avl.root;
    while (node) {
      const dir = key < node.key ? 'L' : 'R';
      const other = dir === 'L' ? node.right : node.left;
      path.push({
        key: node.key,
        h: node.height,
        bf: (node.left ? node.left.height : 0) - (node.right ? node.right.height : 0),
        dir,
        otherH: other ? other.height : 0
      });
      node = dir === 'L' ? node.left : node.right;
    }

    // Mô phỏng chiều cao sau khi gắn lá mới để tìm nút mất cân bằng thấp nhất (z)
    let rotation = null;
    let childH = 1;
    for (let i = path.length - 1; i >= 0; i--) {
      const p = path[i];
      const bf = p.dir === 'L' ? childH - p.otherH : p.otherH - childH;
      if (Math.abs(bf) > 1) {
        const y = path[i + 1];
        const x = path[i + 2];
        const type = p.dir + y.dir;
        const yKey = y.key;
        const xKey = x ? x.key : key;
        const newRoot = (type === 'RR' || type === 'LL') ? yKey : xKey;
        rotation = {
          type,
          bfZ: bf,
          z: p.key,
          y: yKey,
          x: xKey,
          parentKey: i > 0 ? path[i - 1].key : null,
          newRoot
        };
        break;
      }
      childH = 1 + Math.max(childH, p.otherH);
    }

    const rotBefore = { ...avl.rotationsCount };
    avl.insert(key, job);
    const rotDiff = ['LL', 'RR', 'LR', 'RL'].filter(t => avl.rotationsCount[t] > rotBefore[t]);
    if (key > this.maxKey) this.maxKey = key;

    // (3) Bảng băm
    const ht = this.hash;
    const cap0 = ht.capacity;
    const bucket0 = ht.hornerHash(job.skillTag);
    let existed = false;
    let n0 = ht.buckets[bucket0];
    while (n0) { if (n0.key === job.skillTag) { existed = true; break; } n0 = n0.next; }
    const distinct0 = ht.distinctKeys;
    const lf0 = ht.loadFactor;
    ht.insert(job);
    this.trie.indexJob(job);
    this.searchCache.clear();      // dữ liệu đổi → kết quả tìm kiếm cũ không còn đúng
    this.dataVersion++;
    const cap1 = ht.capacity;
    const bucket1 = ht.hornerHash(job.skillTag);
    const chain = [];
    let c = ht.buckets[bucket1];
    while (c) { chain.push({ key: c.key, count: c.count }); c = c.next; }

    // (4) Mảng con trỏ sắp xếp theo ngân sách — lowerBound rồi splice
    const probes = [];
    const sorted = this.sortedBudget;
    const idx = this._probeBound(sorted, job.budget, false, probes);
    sorted.splice(idx, 0, job);

    const durMs = now() - t0;

    const trace = {
      jobId: id,
      title: job.title,
      skillTag: job.skillTag,
      budget: job.budget,
      slots: job.slots,
      n: this.jobs.length,
      secondId: this.jobs[1] ? this.jobs[1].id : null,
      avl: {
        key,
        path: path.map(p => ({ key: p.key, dir: p.dir, bf: p.bf, h: p.h })).slice(-16),
        depth: path.length,
        rotation,
        rotDiff,
        rotationsTotal: { ...avl.rotationsCount },
        height: avl.height,
        size: avl.size
      },
      hash: {
        capacity0: cap0,
        capacity1: cap1,
        bucket0,
        bucket1,
        existed,
        rehashed: cap1 !== cap0,
        distinct0,
        distinct1: ht.distinctKeys,
        lf0: Number(lf0.toFixed(3)),
        lf1: Number(ht.loadFactor.toFixed(3)),
        maxLoad: ht.maxLoadFactor,
        chain: chain.slice(0, 5)
      },
      sorted: {
        n: sorted.length,
        idx,
        probes,
        prevBudget: idx > 0 ? sorted[idx - 1].budget : null,
        nextBudget: idx + 1 < sorted.length ? sorted[idx + 1].budget : null
      },
      latency: fmt(durMs)
    };

    return { job, trace };
  }
};
