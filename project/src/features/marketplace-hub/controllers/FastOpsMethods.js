/**
 * FastOpsMethods.js — Bản "chế độ nhanh" của các thao tác lõi, dành cho bài tải lớn (Stress / thử RAM).
 *
 * Khác bản giao diện (ProposalMethods / UndoMethods / PayoutMethods / SkillSearchMethods):
 *   - KHÔNG dựng trace (trace gọi toArray hàng đợi → O(hàng đợi) mỗi thao tác, không chịu nổi 100.000 thao tác);
 *   - KHÔNG qua Vue reactive;
 *   - nhưng vẫn chạy trên CHÍNH các cấu trúc của lõi: AVL (tra mã), Bảng băm (kỹ năng), mảng ngân sách + tìm nhị phân,
 *     DSLK đôi (hồ sơ), Hàng đợi FIFO (giải ngân), Ngăn xếp LIFO (hoàn tác), JobPost.hireFreelancer / payoutEscrow.
 *
 * Sổ cái (ledger) ghi tiền đã giải ngân ĐỘC LẬP với escrowBalance của JobPost → có thể kiểm bảo toàn:
 *     ngân sách ký quỹ ban đầu = đã giải ngân + còn trong ký quỹ.
 *
 * Quy tắc nghiệp vụ của tải: hồ sơ ĐÃ giải ngân thì không rút / hoàn tác được (tiền đã chuyển).
 * Nhờ đó số hồ sơ đã trả ≤ hiredCount ≤ slots, tổng giải ngân của một việc ≤ slots × floor(budget / slots) ≤ budget.
 */

import { JobFactory, SKILL_TAGS } from '../../job-catalog/models/JobFactory.js';
import { BinarySearchRange } from '../../skill-search/models/BinarySearchRange.js';

export const OP_NAMES = ['skill', 'lookup', 'budget', 'post', 'apply', 'withdraw', 'undo', 'payout'];
// Ngưỡng cộng dồn của bộ trộn thao tác (tổng = 1)
const MIX = [0.25, 0.35, 0.45, 0.49, 0.73, 0.79, 0.85, 1.0];
const RING_MAX = 64;
const ME = 'FL-ME';

const pad = (k) => 'JOB-' + String(k).padStart(6, '0');

export const FastOpsMethods = {
  /** Tạo sổ cái. Gọi sau init(): ghi tổng ký quỹ ban đầu của mọi việc đang có. */
  ledgerInit() {
    let dep = 0;
    const jobs = this.store.jobs;
    for (let i = 0; i < jobs.length; i++) dep += jobs[i].budget;
    this.ledger = {
      depositedTotal: dep,
      paidTotal: 0,
      paidByJob: new Map(),
      wallets: new Map(),
      mineRing: [],
      ops: new Array(8).fill(0),     // số lần gọi theo loại
      ok: new Array(8).fill(0),      // số lần có tác dụng
      blocked: new Array(8).fill(0), // bị nghiệp vụ chặn (đủ slot, đã giải ngân, ...)
      micros: new Array(8).fill(0),  // tổng thời gian (µs) theo loại
      escrowFailures: 0              // giải ngân bị từ chối vì thiếu ký quỹ (phải = 0)
    };
    return this.ledger;
  },

  fastSearchSkill(skill) {
    return this.store.searchBySkill(skill).count;
  },

  fastLookup(key) {
    const r = this.avl.search(key);
    return r.found ? r.node.jobRef : null;
  },

  /** Lọc dải ngân sách: hai lần tìm nhị phân, trả số việc trong dải (không cắt mảng). */
  fastBudgetRange(min, max) {
    const arr = this.sortedBudget;
    const l = BinarySearchRange.lowerBound(arr, min);
    const r = BinarySearchRange.upperBound(arr, max);
    return r > l ? r - l : 0;
  },

  fastPostJob(seed) {
    const job = JobFactory.generateJobs(1, seed, this.maxKey)[0];
    this.store.jobs.push(job);
    this._indexJob(job, true);
    this.dataVersion++;
    if (this.ledger) this.ledger.depositedTotal += job.budget;
    return job;
  },

  /** Nộp hồ sơ: AVL tìm việc → hireFreelancer → DSLK → vé Queue → Stack. true nếu thành công. */
  fastApply(key, freelancerId) {
    const L = this.ledger;
    const jobId = pad(key);
    const res = this.store.applyProposal({ jobId, freelancerId, recordUndo: true });
    if (!res.success) return false;
    const node = res.proposal;
    const ticket = res.payoutTicket;
    node.ticketId = ticket.id;
    ticket.proposalNode = node;
    node.paid = false;
    const act = this.store.undoStack.peekLastAction(); // hành động vừa ghi (đỉnh Stack)
    if (act) act.proposalNode = node;
    if (freelancerId === ME) {
      node.mine = true;
      this._trackMyApp(res.job, node);
      if (L.mineRing.length >= RING_MAX) { L.ringPos = ((L.ringPos || 0) + 1) % RING_MAX; L.mineRing[L.ringPos] = jobId; }
      else L.mineRing.push(jobId);
    }
    return true;
  },

  /** Rút một đơn của "tôi" bất kỳ: bảng băm → gỡ prev/next O(1) → hủy đúng vé & hành động. */
  fastWithdraw(rand) {
    const L = this.ledger;
    const ring = L.mineRing;
    if (ring.length === 0) return 'empty';
    const at = (rand() * ring.length) | 0;
    const jobId = ring[at];
    ring[at] = ring[ring.length - 1];
    ring.pop();
    const entry = this.myAppIndex.get(jobId);
    if (!entry) return 'empty';
    const node = entry.jobNode;
    if (node.paid) return 'blocked';
    const job = this.store.searchById(jobId);
    this.myApps.removeNode(entry.mine);
    this.myAppIndex.delete(jobId);
    this._listOf(jobId).removeNode(node);
    this.store.escrowQueue.cancelTicketById(node.ticketId);
    this.store.undoStack.removeActionByTicketId(node.ticketId);
    job.hiredCount = Math.max(0, job.hiredCount - 1);
    if (job.hiredCount < job.slots) job.status = 'OPEN';
    return 'ok';
  },

  /** Hoàn tác (LIFO): pop đỉnh Stack, rollback JobPost, gỡ hồ sơ + vé tương ứng. */
  fastUndo() {
    const stack = this.store.undoStack;
    const action = stack.peekLastAction();
    if (!action) return 'empty';
    const node = action.proposalNode;
    if (node && node.paid) {
      stack.stack.pop(); // đã giải ngân: bỏ khỏi Stack, không rollback
      return 'blocked';
    }
    stack.undoLastAction(); // pop + executeRollback (hiredCount--, mở lại trạng thái)
    if (node) {
      const list = this.store.proposalsMap.get(action.jobId);
      if (list) list.removeNode(node);
      if (node.mine) {
        const entry = this.myAppIndex.get(action.jobId);
        if (entry && entry.jobNode === node) {
          this.myApps.removeNode(entry.mine);
          this.myAppIndex.delete(action.jobId);
        }
      }
    }
    this.store.escrowQueue.cancelTicketById(action.ticketId);
    return 'ok';
  },

  /** Giải ngân (FIFO): dequeue đầu hàng đợi, cộng ví freelancer, trừ ký quỹ JobPost, ghi sổ cái. */
  fastPayout() {
    const L = this.ledger;
    const q = this.store.escrowQueue;
    if (!q.queue.peek()) return 'empty';
    const head = q.queue.peek();
    let wallet = L.wallets.get(head.freelancerId);
    if (!wallet) { wallet = { walletBalance: 0 }; L.wallets.set(head.freelancerId, wallet); }
    const res = q.processNextPayout(wallet);
    if (!res.success) return 'empty';
    const ticket = res.ticket;
    const job = this.store.searchById(ticket.jobId);
    const pay = job.payoutEscrow(ticket.amount);
    if (!pay.success) { L.escrowFailures++; return 'blocked'; }
    L.paidTotal += ticket.amount;
    L.paidByJob.set(job.id, (L.paidByJob.get(job.id) || 0) + ticket.amount);
    if (ticket.proposalNode) ticket.proposalNode.paid = true;
    q.processedHistory.length = 0; // không tích lịch sử trong bài tải (giữ RAM)
    return 'ok';
  },

  /**
   * Một thao tác ngẫu nhiên theo bộ trộn (25% kỹ năng, 10% tra mã, 10% dải ngân sách, 4% đăng việc,
   * 24% nộp, 6% rút, 6% hoàn tác, 15% giải ngân). Cập nhật bộ đếm trong sổ cái.
   */
  fastStep(rand, timed = true) {
    const L = this.ledger;
    const x = rand();
    let t = 0;
    while (x >= MIX[t]) t++;
    const t0 = timed ? performance.now() : 0;
    let outcome = 'ok';
    switch (t) {
      case 0: this.fastSearchSkill(SKILL_TAGS[(rand() * SKILL_TAGS.length) | 0]); break;
      case 1: this.fastLookup(1 + ((rand() * this.maxKey) | 0)); break;
      case 2: {
        const lo = (4 + ((rand() * 190) | 0)) * 50;
        this.fastBudgetRange(lo, lo + 500);
        break;
      }
      case 3: this.fastPostJob((rand() * 4294967295) >>> 0); break;
      case 4: {
        const key = 1 + ((rand() * this.maxKey) | 0);
        const wantMine = rand() < 0.3 && !this.myAppIndex.has(pad(key));
        outcome = this.fastApply(key, wantMine ? ME : 'FL-' + ((rand() * 5000) | 0)) ? 'ok' : 'blocked';
        break;
      }
      case 5: outcome = this.fastWithdraw(rand); break;
      case 6: outcome = this.fastUndo(); break;
      default: outcome = this.fastPayout(); break;
    }
    if (timed) L.micros[t] += (performance.now() - t0) * 1000;
    L.ops[t]++;
    if (outcome === 'ok') L.ok[t]++;
    else if (outcome === 'blocked') L.blocked[t]++;
    return t;
  }
};
