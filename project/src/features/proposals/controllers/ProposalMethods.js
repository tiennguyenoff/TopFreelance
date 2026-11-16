/**
 * ProposalMethods.js
 * Proposal tracking, application, and withdrawal using doubly-linked lists
 */

import { ProposalNode } from '../models/ProposalNode.js';
import { DoublyLinkedList } from '../models/DoublyLinkedList.js';

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const fmt = (ms) => {
  if (typeof ms !== 'number' || !isFinite(ms)) return '0ms';
  return ms < 1 ? `${(ms * 1000).toFixed(0)}μs` : `${ms.toFixed(2)}ms`;
};

function jobKey(id) {
  if (typeof id === 'number') return id;
  const k = parseInt(String(id || '').trim().toUpperCase().replace(/^JOB-?/, ''), 10);
  return Number.isNaN(k) ? null : k;
}

function shortProp(node) {
  // PROP-JOB-000123-2 -> P2
  const m = String(node.id).match(/-(\d+)$/);
  return {
    id: node.id,
    label: m ? `P${m[1]}` : String(node.id).slice(-4),
    fl: node.freelancerId,
    bid: node.bidAmount
  };
}

function dllToArray(list, limit = 8) {
  const out = [];
  let cur = list ? list.head : null;
  while (cur && out.length < limit) {
    out.push(shortProp(cur));
    cur = cur.next;
  }
  return out;
}

/** Nhãn 1 đơn trong "Đơn của tôi": mã việc rút gọn JOB-000123 -> #123 */
function appView(node) {
  const k = jobKey(node.jobId);
  return { id: node.id, jobId: node.jobId, label: k !== null ? `#${k}` : String(node.jobId).slice(-5), bid: node.bidAmount };
}

/** Cửa sổ tối đa `max` node quanh node đích để canvas luôn thấy đích + hàng xóm. */
function dllWindow(list, target, max = 6) {
  const all = [];
  let cur = list.head;
  let idx = -1;
  while (cur) {
    if (cur === target) idx = all.length;
    all.push(cur);
    cur = cur.next;
  }
  let start = 0;
  if (idx >= 0) start = Math.max(0, Math.min(idx - Math.floor(max / 2), all.length - max));
  const win = all.slice(start, start + max).map(appView);
  return { nodes: win, idx: idx >= 0 ? idx - start : -1, start, total: all.length };
}

function ticketView(t) {
  return { id: t.id, jobId: t.jobId, amount: t.amount, fl: t.freelancerId };
}

export const ProposalMethods = {
  /** Thêm đơn vào "Đơn của tôi" (đuôi danh sách) và đánh chỉ mục. */
  _trackMyApp(job, jobNode) {
    const mine = this.myApps.insertTail(new ProposalNode({
      id: `APP-${job.id}`,
      jobId: job.id,
      freelancerId: jobNode.freelancerId,
      bidAmount: jobNode.bidAmount
    }));
    this.myAppIndex.set(job.id, { mine, jobNode });
    return mine;
  },

  /** Danh sách "Đơn của tôi" (cũ → mới) dạng nhãn, để canvas vẽ. */
  myAppsView(limit = 6) {
    const out = [];
    let cur = this.myApps.tail;
    while (cur && out.length < limit) { out.unshift(appView(cur)); cur = cur.prev; }
    return out;
  },

  /** Khôi phục một hồ sơ từ MySQL vào DSLK đôi + Queue + Stack. */
  restoreProposal({ jobId, freelancerId, bidAmount, jobTitle }) {
    const job = this.findById(jobId);
    if (job) {
      job.hiredCount = Math.min(job.slots, Math.max(job.hiredCount, 1));
      if (job.hiredCount >= job.slots) job.status = 'IN_PROGRESS';
      const list = this._listOf(job.id);
      const jobNode = list.insertHead(new ProposalNode({
        id: `PROP-${job.id}-${list.size + 1}`,
        jobId: job.id,
        freelancerId,
        bidAmount
      }));
      if (!this.myAppIndex.has(job.id)) this._trackMyApp(job, jobNode);
    }
    this.store.escrowQueue.enqueuePayout({
      jobId, freelancerId, amount: bidAmount, jobTitle: jobTitle || job?.title || 'Dự án đã nộp đơn'
    });
    return job;
  },

  _listOf(jobId) {
    if (!this.store.proposalsMap.has(jobId)) {
      this.store.proposalsMap.set(jobId, new DoublyLinkedList());
    }
    return this.store.proposalsMap.get(jobId);
  },

  // =======================================================================
  // 6. NỘP HỒ SƠ — DSLK ứng viên của việc (insertHead) + "Đơn của tôi" (insertTail + bảng băm) + Enqueue vé
  // =======================================================================
  applyProposal({ job, freelancerId, bid, proposalText }) {
    const list = this.store.proposalsMap.get(job.id);
    const listBefore = dllToArray(list);
    const queueBefore = this.store.escrowQueue.getPendingTickets().map(ticketView);
    const myBefore = this.myAppsView(5);

    const t0 = now();
    const res = this.store.applyProposal({ jobId: job.id, freelancerId, bid, proposalText, recordUndo: false });
    if (!res.success) return { res, trace: null };
    if (!this.myAppIndex.has(job.id)) this._trackMyApp(job, res.proposal);
    const durMs = now() - t0;

    const listAfter = dllToArray(this.store.proposalsMap.get(job.id));
    const queueAfter = this.store.escrowQueue.getPendingTickets().map(ticketView);
    const myAfter = this.myAppsView(6);

    return {
      res,
      trace: {
        jobId: job.id,
        freelancerId: res.proposal.freelancerId,
        bid: res.proposal.bidAmount,
        newNode: shortProp(res.proposal),
        listBefore: listBefore.slice(0, 4),
        listAfter: listAfter.slice(0, 5),
        listSize: this.store.proposalsMap.get(job.id).size,
        myBefore,
        myAfter,
        mySize: this.myApps.size,
        myNew: myAfter[myAfter.length - 1] || null,
        mapSize: this.myAppIndex.size,
        ticket: res.payoutTicket ? ticketView(res.payoutTicket) : null,
        queueBefore: queueBefore.slice(-4),
        queueAfter: queueAfter.slice(-5),
        queueSize: queueAfter.length,
        hired: `${job.hiredCount}/${job.slots}`,
        latency: fmt(durMs)
      }
    };
  },

  // =======================================================================
  // 7. RÚT HỒ SƠ BẤT KỲ — tra bảng băm jobId → con trỏ node O(1), gỡ prev/next O(1)
  // =======================================================================
  withdrawProposal(job) {
    const queueBefore = this.store.escrowQueue.getPendingTickets().map(ticketView);
    const entry = this.myAppIndex.get(job.id) || null;
    const win = entry ? dllWindow(this.myApps, entry.mine, 6) : { nodes: this.myAppsView(6), idx: -1, start: 0, total: this.myApps.size };
    const jobList = this.store.proposalsMap.get(job.id);
    const jobListBefore = jobList ? jobList.size : 0;

    const t0 = now();
    // 1. Bảng băm: jobId → con trỏ node (không duyệt danh sách)
    // 2. Gỡ khỏi "Đơn của tôi": bắc cầu prev ↔ next
    let removedCase = 'NONE';
    let prevLabel = null;
    let nextLabel = null;
    if (entry) {
      const n = entry.mine;
      prevLabel = n.prev ? appView(n.prev).label : null;
      nextLabel = n.next ? appView(n.next).label : null;
      removedCase = !n.prev && !n.next ? 'ONLY' : !n.prev ? 'HEAD' : !n.next ? 'TAIL' : 'MIDDLE';
      this.myApps.removeNode(n);
      this.myAppIndex.delete(job.id);
      // 3. Cùng con trỏ đó gỡ hồ sơ khỏi DSLK ứng viên của việc (phía nhà tuyển dụng) — O(1)
      if (jobList && entry.jobNode && (entry.jobNode.prev || entry.jobNode.next || jobList.head === entry.jobNode)) {
        jobList.removeNode(entry.jobNode);
      }
    }
    // 4. Hủy vé giải ngân đang chờ của việc này
    const cancelled = this.store.escrowQueue.cancelTicketByJobId(job.id);
    this.store.undoStack.removeActionByJobId(job.id); // dọn dữ liệu cũ (nếu có), web không còn ghi Stack
    job.hiredCount = Math.max(0, job.hiredCount - 1);
    if (job.hiredCount < job.slots) job.status = 'OPEN';
    const durMs = now() - t0;

    return {
      remaining: jobList ? jobList.size : 0,
      trace: {
        jobId: job.id,
        jobTitle: job.title,
        found: !!entry,
        listBefore: win.nodes,
        targetIdx: win.idx,
        windowStart: win.start,
        totalBefore: win.total,
        targetLabel: entry ? appView(entry.mine).label : null,
        prevLabel,
        nextLabel,
        removedCase,
        listAfter: this.myAppsView(6),
        mySize: this.myApps.size,
        mapSize: this.myAppIndex.size,
        jobListBefore,
        jobListAfter: jobList ? jobList.size : 0,
        ticketId: cancelled ? cancelled.id : null,
        queueBefore: queueBefore.slice(0, 5),
        queueAfterSize: this.store.escrowQueue.getPendingTickets().length,
        latency: fmt(durMs)
      }
    };
  }
};
