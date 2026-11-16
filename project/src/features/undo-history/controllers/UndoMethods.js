/**
 * UndoMethods.js
 * LIFO stack-based undo for proposals
 */


const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const fmt = (ms) => {
  if (typeof ms !== 'number' || !isFinite(ms)) return '0ms';
  return ms < 1 ? `${(ms * 1000).toFixed(0)}μs` : `${ms.toFixed(2)}ms`;
};

function actionView(a) {
  return { id: a.id, jobId: a.jobId, fl: a.freelancerId, bid: a.bidAmount };
}

function shortProp(node) {
  const m = String(node.id).match(/-(\d+)$/);
  return {
    id: node.id,
    label: m ? `P${m[1]}` : String(node.id).slice(-4),
    fl: node.freelancerId,
    bid: node.bidAmount
  };
}

export const UndoMethods = {
  // =======================================================================
  // 8. HOÀN TÁC — Pop đỉnh Stack, gỡ head DSLK, hủy vé Queue
  // =======================================================================
  undoLastApply() {
    const stackBefore = this.store.undoStack.getActionHistory().map(actionView);
    if (stackBefore.length === 0) return { res: { success: false }, trace: null };

    const t0 = now();
    const undoRes = this.store.undoStack.undoLastAction(); // pop + rollback hiredCount trên JobPost
    let removedNode = null;
    let cancelled = null;
    if (undoRes.success) {
      const list = this.store.proposalsMap.get(undoRes.action.jobId);
      if (list && list.size > 0) removedNode = list.removeHead();
      cancelled = this.store.escrowQueue.cancelTicketByJobId(undoRes.action.jobId);
    }
    const durMs = now() - t0;

    return {
      res: undoRes,
      remainingForJob: undoRes.success ? (this.store.proposalsMap.get(undoRes.action.jobId)?.size || 0) : 0,
      trace: {
        stackBefore: stackBefore.slice(0, 5),
        stackBeforeSize: stackBefore.length,
        popped: undoRes.success ? actionView(undoRes.action) : null,
        stackAfterSize: this.store.undoStack.getActionHistory().length,
        removedNode: removedNode ? shortProp(removedNode).label : null,
        ticketId: cancelled ? cancelled.id : null,
        hired: undoRes.action?.jobRef ? `${undoRes.action.jobRef.hiredCount}/${undoRes.action.jobRef.slots}` : '',
        latency: fmt(durMs)
      }
    };
  }
};
