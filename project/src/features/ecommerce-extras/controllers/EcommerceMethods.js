/**
 * EcommerceMethods.js
 * Ecommerce algorithms: Trie autocomplete, MinHeap topK, LRU cache, Token Bucket rate limiting, Bayesian ranking, Jaccard similarity
 */

import { MinHeap } from '../models/MinHeap.js';
import { JaccardRecommender } from '../models/JaccardRecommender.js';

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const fmt = (ms) => {
  if (typeof ms !== 'number' || !isFinite(ms)) return '0ms';
  return ms < 1 ? `${(ms * 1000).toFixed(0)}μs` : `${ms.toFixed(2)}ms`;
};

export const EcommerceMethods = {
  // =======================================================================
  // 8. TRIE — gợi ý tự động khi gõ O(L)
  // =======================================================================
  suggest(prefix, limit = 8) {
    const t0 = now();
    const res = this.trie.suggest(prefix, limit);
    const durMs = now() - t0;
    return {
      suggestions: res.suggestions,
      trace: {
        prefix: res.prefix,
        found: res.found,
        path: res.path,
        failedAt: res.failedAt ?? -1,
        suggestions: res.suggestions,
        visited: res.visited,
        totalUnder: res.totalUnder,
        vocab: this.trie.wordCount,
        nodes: this.trie.nodeCount,
        n: this.jobs.length,
        latency: fmt(durMs)
      }
    };
  },

  // =======================================================================
  // 9. MIN-HEAP TOP-K — K việc ngân sách cao nhất O(n log K)
  // =======================================================================
  topK(k = 10, list = this.jobs) {
    const view = (j) => (j ? { id: j.id, budget: j.budget, title: j.title, skill: j.skillTag } : null);
    const t0 = now();
    const res = MinHeap.topK(list, k, (j) => j.budget);
    const heapMs = now() - t0;

    // Đối chứng: sắp xếp toàn bộ mảng con trỏ O(n log n) rồi cắt K phần tử đầu
    const t1 = now();
    let sortCmp = 0;
    const copy = new Array(list.length);
    for (let i = 0; i < list.length; i++) copy[i] = list[i];
    copy.sort((a, b) => { sortCmp++; return b.budget - a.budget; });
    const sortMs = now() - t1;
    const same = res.top.every((j, i) => copy[i] && copy[i].budget === j.budget);

    const lr = res.lastReplace;
    return {
      top: res.top,
      trace: {
        n: list.length,
        k,
        heap: res.heapArray.map(view),
        top: res.top.map(view),
        comparisons: res.comparisons,
        swaps: res.swaps,
        pushes: res.pushes,
        replaces: res.replaces,
        rejects: res.rejects,
        lastReplace: lr ? {
          index: lr.index,
          before: lr.before.map(view),
          after: lr.after.map(view),
          incoming: view(lr.incoming),
          removed: view(lr.removed),
          path: lr.path
        } : null,
        sortComparisons: sortCmp,
        heapMs,
        sortMs,
        heapLatency: fmt(heapMs),
        sortLatency: fmt(sortMs),
        same,
        latency: fmt(heapMs)
      }
    };
  },

  // =======================================================================
  // 10. LRU CACHE — cache kết quả tìm kiếm & "Việc bạn vừa xem" O(1)
  // =======================================================================
  _lruTrace(cache, key, op, hit, evicted, fromPos, keysBefore, labelOf) {
    return {
      op,
      key,
      hit,
      fromPos,
      evicted,
      capacity: cache.capacity,
      keysBefore: keysBefore.map(labelOf),
      keysAfter: cache.keys().map(labelOf),
      stats: cache.stats()
    };
  },

  /** Tìm theo từ khóa có cache. `scope` mô tả tập nguồn (toàn bộ / kỹ năng / dải ngân sách...). */
  cachedSearch(list, keyword, scope = 'all') {
    const kw = String(keyword || '').trim().toLowerCase();
    const key = `${scope}|v${this.dataVersion}|${kw}`;
    const label = (k) => String(k).split('|').pop();
    const cache = this.searchCache;
    const keysBefore = cache.keys();
    const fromPos = cache.positionOf(key);
    const t0 = now();
    const got = cache.get(key);
    if (got.hit) {
      const durMs = now() - t0;
      const v = got.value;
      return {
        matches: v.matches,
        linearTrace: v.trace,
        hit: true,
        trace: {
          ...this._lruTrace(cache, label(key), 'get', true, null, fromPos, keysBefore, label),
          kind: 'search',
          scope,
          matchesCount: v.matches.length,
          savedComparisons: v.trace.comparisons,
          latency: fmt(durMs),
          missLatency: v.trace.latency
        }
      };
    }
    const { matches, trace } = this.linearSearch(list, kw);
    const put = cache.put(key, { matches, trace });
    const durMs = now() - t0;
    return {
      matches,
      linearTrace: trace,
      hit: false,
      trace: {
        ...this._lruTrace(cache, label(key), 'put', false, put.evicted ? label(put.evicted) : null, -1, keysBefore, label),
        kind: 'search',
        scope,
        matchesCount: matches.length,
        savedComparisons: 0,
        latency: fmt(durMs),
        missLatency: trace.latency
      }
    };
  },

  /** Ghi nhận người dùng vừa mở chi tiết một việc. */
  viewJob(job) {
    if (!job) return null;
    const cache = this.recentViews;
    const keysBefore = cache.keys();
    const fromPos = cache.positionOf(job.id);
    const t0 = now();
    const hit = fromPos >= 0;
    const put = cache.put(job.id, job);
    const durMs = now() - t0;
    return {
      trace: {
        ...this._lruTrace(cache, job.id, hit ? 'get' : 'put', hit, put.evicted, fromPos, keysBefore, (k) => k),
        kind: 'recent',
        title: job.title,
        latency: fmt(durMs)
      }
    };
  },

  recentlyViewed() {
    return this.recentViews.values();
  },

  // =======================================================================
  // 11. TOKEN BUCKET — giới hạn 5 hồ sơ / 10 giây cho mỗi freelancer, O(1)
  // =======================================================================
  tryApply(userId) {
    const bucket = this.rateLimiter.bucketFor(userId);
    const t0 = now();
    const r = bucket.tryConsume(1);
    const durMs = now() - t0;
    return {
      allowed: r.allowed,
      waitMs: r.waitMs,
      trace: {
        user: userId,
        ...r,
        capacity: bucket.capacity,
        refillPerSec: bucket.refillPerSec,
        stats: bucket.stats(),
        latency: fmt(durMs)
      }
    };
  },

  tokenStatus(userId) {
    const bucket = this.rateLimiter.bucketFor(userId);
    return { tokens: bucket.peek(), capacity: bucket.capacity, refillPerSec: bucket.refillPerSec };
  },

  // =======================================================================
  // 12. BAYESIAN AVERAGE — xếp hạng uy tín công bằng
  // =======================================================================
  _bayesReady() {
    const key = `${this.dataVersion}|${this.jobs.length}`;
    if (this._bayesKey !== key) {
      this.bayes.prepare(this.jobs); // O(n), chỉ chạy lại khi dữ liệu đổi
      this._bayesKey = key;
    }
    return this.bayes;
  },

  /** Vết so sánh "xếp theo sao thô" và "xếp theo Bayes" trên danh sách hiện tại. */
  bayesTrace(list) {
    const ranker = this._bayesReady();
    const K = 6;
    const t0 = now();
    const sorted = this.sortList(list, 'bayes_desc').sorted;
    const sortMs = now() - t0;
    // Sắp theo sao thô (ổn định): chỉ cần Top-K → Min-Heap, khóa phụ giữ thứ tự gốc
    const rawTop = MinHeap.topK(list.map((j, i) => ({ j, k: (Number(j.clientRating) || 0) - i * 1e-9 })), K, (x) => x.k).top.map(x => x.j);
    const bayesTop = sorted.slice(0, K);
    const rankRaw = new Map(rawTop.map((j, i) => [j.id, i + 1]));
    const rankBayes = new Map(bayesTop.map((j, i) => [j.id, i + 1]));
    const view = (j) => ({
      id: j.id,
      R: Number(j.clientRating) || 0,
      v: Number(j.clientReviews) || 0,
      score: Number(ranker.scoreOf(j).toFixed(3)),
      rawRank: rankRaw.get(j.id) || null,
      bayesRank: rankBayes.get(j.id) || null
    });
    const example = rawTop.slice().sort((a, b) => (a.clientReviews || 0) - (b.clientReviews || 0))[0] || bayesTop[0] || null;
    return {
      sorted,
      trace: {
        n: list.length,
        C: Number(ranker.C.toFixed(3)),
        m: ranker.m,
        rawTop: rawTop.map(view),
        bayesTop: bayesTop.map(view),
        example: example ? view(example) : null,
        dropped: rawTop.filter(j => !rankBayes.has(j.id)).length,
        sortLatency: fmt(sortMs),
        latency: fmt(sortMs)
      }
    };
  },

  // =======================================================================
  // 13. JACCARD — "Việc tương tự": ứng viên lấy từ ô bảng băm cùng kỹ năng
  // =======================================================================
  similar(job, k = 5) {
    if (!job) return null;
    const t0 = now();
    const res = this.hash.search(job.skillTag);
    const cands = res.matches || [];
    const r = JaccardRecommender.similar(job, cands, k);
    const durMs = now() - t0;
    return {
      similar: r.top.map(x => x.job),
      scores: r.top.map(x => ({ id: x.job.id, score: x.score, inter: x.inter, union: x.union })),
      trace: {
        jobId: job.id,
        title: job.title,
        skill: job.skillTag,
        n: this.jobs.length,
        m: cands.length,
        bucket: res.bucketIndex,
        steps: res.steps,
        A: [...r.A],
        top: r.top.map(x => ({
          id: x.job.id,
          title: x.job.title,
          budget: x.job.budget,
          score: Number(x.score.toFixed(3)),
          inter: x.inter,
          union: x.union,
          B: [...JaccardRecommender.features(x.job)]
        })),
        comparisons: r.comparisons,
        latency: fmt(durMs)
      }
    };
  }
};
