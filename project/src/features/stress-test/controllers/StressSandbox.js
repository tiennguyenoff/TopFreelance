/**
 * StressSandbox.js — Bài tải chạy trên MỘT BẢN LÕI RIÊNG (sandbox) của MarketplaceEngine.
 *
 *  - Bản lõi riêng: hàng đợi giải ngân + ngăn xếp hoàn tác của riêng nó, không bọc Vue reactive, không trace.
 *  - Dữ liệu sinh ra mang mã lô `STRESS-<seed>` và KHÔNG BAO GIỜ được gửi tới API/MySQL.
 *  - Hạt giống cố định → lặp lại được từng con số.
 *  - Singleton đang dùng (dữ liệu người dùng thật) chỉ được ĐỌC để chụp snapshot trước/sau.
 */

import { MarketplaceEngineImpl, MarketplaceEngine } from '../../marketplace-hub/controllers/MarketplaceEngine.js';
import { OP_NAMES } from '../../marketplace-hub/controllers/FastOpsMethods.js';
import { checkInvariants, totalViolations } from './CoreInvariants.js';
import { takeSnapshot, compareSnapshots } from './CoreSnapshot.js';

export const DEFAULT_SEED = 20260515;
const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/** PRNG mulberry32: xác định theo hạt giống. */
export function makeRng(seed) {
  let a = seed >>> 0;
  return function rand() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Đo RAM kèm NGUỒN đo — không bao giờ trả số cố định. */
export function readHeap() {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    return { mb: process.memoryUsage().heapUsed / 1048576, source: 'node', label: 'Đo thật tại Node (process.memoryUsage)' };
  }
  if (typeof performance !== 'undefined' && performance.memory) {
    return { mb: performance.memory.usedJSHeapSize / 1048576, source: 'browser', label: 'Đo từ trình duyệt (performance.memory)' };
  }
  return { mb: null, source: 'none', label: 'Trình duyệt này không cho đo RAM' };
}

export class StressSandbox {
  constructor({ seed = DEFAULT_SEED, jobCount = 100000 } = {}) {
    this.seed = seed;
    this.jobCount = jobCount;
    this.batchId = `STRESS-${seed}`;
    this.engine = null;
  }

  /** Dựng lõi riêng, nạp jobCount việc (một lần duy nhất) + sổ cái. */
  build() {
    const t0 = nowMs();
    this.engine = new MarketplaceEngineImpl({ isolated: true, reactive: false, indexTrie: false });
    this.engine.init(this.jobCount, [], { seed: this.seed, startIndex: 0 });
    this.engine.ledgerInit();
    this.tagBatch();
    this.buildMs = nowMs() - t0;
    return this.engine;
  }

  /** Gắn mã lô cho mọi việc (cùng một chuỗi, chỉ tốn một con trỏ mỗi việc). */
  tagBatch() {
    const jobs = this.engine.jobs;
    const b = this.batchId;
    for (let i = 0; i < jobs.length; i++) if (jobs[i].batchId !== b) jobs[i].batchId = b;
  }

  /**
   * Chạy `ops` thao tác ngẫu nhiên.
   * @param {Object} o
   * @param {number} o.ops
   * @param {(p:{done:number,total:number})=>void} [o.onProgress]
   * @param {()=>boolean} [o.shouldCancel]
   * @param {boolean} [o.timed=true] đo thời gian từng loại thao tác
   * @param {number} [o.salt=0] đổi chuỗi ngẫu nhiên theo từng bậc (vẫn xác định)
   */
  runOps({ ops, onProgress, shouldCancel, timed = true, salt = 0, chunk = 5000 } = {}) {
    const rand = makeRng(this.seed + salt * 7919);
    const e = this.engine;
    let done = 0;
    let cancelled = false;
    let peak = 0;
    const t0 = nowMs();
    while (done < ops) {
      const n = Math.min(chunk, ops - done);
      for (let i = 0; i < n; i++) e.fastStep(rand, timed);
      done += n;
      const h = readHeap();
      if (h.mb !== null && h.mb > peak) peak = h.mb;
      if (onProgress) onProgress({ done, total: ops });
      if (shouldCancel && shouldCancel()) { cancelled = true; break; }
    }
    const durationMs = nowMs() - t0;
    this.tagBatch();
    return { done, cancelled, durationMs, peakHeapMb: peak };
  }

  /** Bảng thống kê theo từng loại thao tác (đọc từ sổ cái). */
  opStats() {
    const L = this.engine.ledger;
    const out = {};
    OP_NAMES.forEach((name, i) => {
      out[name] = { ops: L.ops[i], ok: L.ok[i], blocked: L.blocked[i], avgUs: L.ops[i] ? L.micros[i] / L.ops[i] : 0 };
    });
    return out;
  }

  invariants() { return checkInvariants(this.engine); }

  /** Hủy bản lõi riêng + mọi bộ nhớ đệm/bộ đếm/sổ cái nó giữ. */
  destroy() {
    const e = this.engine;
    if (!e) return false;
    e.store.escrowQueue.clear();
    e.store.undoStack.clear();
    e.store.proposalsMap.clear();
    e.myAppIndex.clear();
    if (e.ledger) { e.ledger.paidByJob.clear(); e.ledger.wallets.clear(); e.ledger.mineRing.length = 0; }
    e.store.jobs.length = 0;
    e.store.sortedBudgetJobs.length = 0;
    e.store.avlIndex = null;
    e.store.skillHashTable = null;
    e.trie = null; e.searchCache = null; e.recentViews = null;
    e.ledger = null;
    this.engine = null;
    return true;
  }
}

/**
 * Một lượt chạy trọn vẹn (chụp snapshot lõi thật → dựng sandbox → tải → kiểm 7 bất biến),
 * giữ sandbox sống để người dùng xem, rồi cleanup() mới hủy và so snapshot.
 */
export class StressSession {
  /**
   * @param {Object} [o]
   * @param {Object} [o.realEngine] lõi thật cần bảo vệ (mặc định singleton)
   * @param {()=>Array<{id:string,balance:number}>} [o.walletsProvider] ví thật đưa vào snapshot
   */
  constructor({ realEngine = MarketplaceEngine, walletsProvider = () => [] } = {}) {
    this.realEngine = realEngine;
    this.walletsProvider = walletsProvider;
    this.sandbox = null;
    this.snapBefore = null;
    this.running = false;
    this.cancelRequested = false;
  }

  snapshotReal() {
    return takeSnapshot(this.realEngine, { wallets: this.walletsProvider() });
  }

  cancel() { this.cancelRequested = true; }

  /** @returns {Object} kết quả (chạy đồng bộ; onProgress được gọi theo từng khối thao tác) */
  run({ jobCount = 100000, actionCount = 100000, seed = DEFAULT_SEED, onProgress, shouldCancel } = {}) {
    if (this.running) throw new Error('Bài tải đang chạy');
    this.running = true;
    this.cancelRequested = false;
    try {
      if (this.sandbox) this.sandbox.destroy();
      this.snapBefore = this.snapshotReal();
      this.sandbox = new StressSandbox({ seed, jobCount });
      this.sandbox.build();
      const r = this.sandbox.runOps({
        ops: actionCount,
        onProgress,
        shouldCancel: () => this.cancelRequested || (shouldCancel ? shouldCancel() : false)
      });
      const invariants = this.sandbox.invariants();
      const violations = totalViolations(invariants);
      const heap = readHeap();
      const byOp = this.sandbox.opStats();
      const e = this.sandbox.engine;
      const L = e.ledger;
      return {
        seed, batchId: this.sandbox.batchId, jobCount: e.jobs.length,
        totalActions: r.done, cancelled: r.cancelled,
        durationMs: r.durationMs, buildMs: this.sandbox.buildMs,
        throughputOps: r.durationMs > 0 ? Math.round(r.done / (r.durationMs / 1000)) : 0,
        byOp,
        breakdown: {
          searches: byOp.skill.ops + byOp.lookup.ops + byOp.budget.ops,
          applies: byOp.apply.ok,
          undos: byOp.undo.ok,
          payouts: byOp.payout.ok,
          slotsBlocked: byOp.apply.blocked
        },
        invariants, invariantErrors: violations, isInvariantValid: violations === 0,
        heapMb: heap.mb === null ? null : Number(heap.mb.toFixed(1)),
        peakHeapMb: Number(r.peakHeapMb.toFixed(1)),
        ramSource: heap.source, ramLabel: heap.label,
        core: {
          avlHeight: e.avl.height, avlRotations: { ...e.avl.rotationsCount },
          hash: e.hash.getStats(), queue: e.store.escrowQueue.queue.size, stack: e.store.undoStack.stack.size,
          paidTotal: L.paidTotal, wallets: L.wallets.size, myApps: e.myApps.size
        }
      };
    } finally {
      this.running = false;
    }
  }

  /** Hủy sandbox, chụp lại lõi thật và so với snapshot trước khi chạy. */
  cleanup() {
    if (this.running) return { ok: false, reason: 'RUNNING' };
    const destroyed = this.sandbox ? this.sandbox.destroy() : false;
    this.sandbox = null;
    const after = this.snapshotReal();
    const cmp = this.snapBefore ? compareSnapshots(this.snapBefore, after) : { match: true, diffs: [], summary: 'khớp 100%' };
    return { ok: true, destroyed, ...cmp, jobCount: after.jobCount };
  }
}
