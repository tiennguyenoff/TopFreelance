/**
 * PayoutMethods.js
 * FIFO queue-based escrow payout processing
 */


const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const fmt = (ms) => {
  if (typeof ms !== 'number' || !isFinite(ms)) return '0ms';
  return ms < 1 ? `${(ms * 1000).toFixed(0)}μs` : `${ms.toFixed(2)}ms`;
};

function ticketView(t) {
  return { id: t.id, jobId: t.jobId, amount: t.amount, fl: t.freelancerId };
}

export const PayoutMethods = {
  // =======================================================================
  // 9. GIẢI NGÂN — Dequeue đầu hàng đợi FIFO, trừ ký quỹ Escrow của Job
  // =======================================================================
  /**
   * @param wallet ví Freelancer nhận tiền
   * @param payer  ví Nhà tuyển dụng đang duyệt. Việc của chính họ: tiền đã nằm trong ký quỹ từ lúc đăng tin.
   *               Việc mẫu (chủ ảo, chưa nạp ký quỹ): trừ thẳng ví nhà tuyển dụng — khớp route /api/escrow/payout.
   */
  processPayout(wallet, payer = null) {
    const queueBefore = this.store.escrowQueue.getPendingTickets().map(ticketView);
    if (queueBefore.length === 0) return { res: { success: false }, trace: null };

    const head = this.store.escrowQueue.getPendingTickets()[0];
    const headJob = this.findById(head.jobId);
    const fromWallet = !!payer && !(headJob && headJob.employer_id === payer.id);
    if (fromWallet && Number(payer.walletBalance) < head.amount) {
      return { res: { success: false, reason: 'INSUFFICIENT_FUNDS' }, trace: null };
    }
    const payerBefore = payer ? Number(payer.walletBalance) : null;

    const t0 = now();
    const res = this.store.escrowQueue.processNextPayout(wallet);
    let escrowRemaining = null;
    if (res.success) {
      const job = this.findById(res.ticket.jobId);
      if (job) {
        job.payoutEscrow(res.ticket.amount);
        escrowRemaining = job.escrowBalance;
      }
      if (fromWallet) payer.walletBalance = Number(payer.walletBalance) - res.ticket.amount;
    }
    const durMs = now() - t0;

    return {
      res,
      trace: {
        queueBefore: queueBefore.slice(0, 5),
        queueBeforeSize: queueBefore.length,
        ticket: res.success ? ticketView(res.ticket) : null,
        queueAfterSize: this.store.escrowQueue.getPendingTickets().length,
        walletBalance: wallet && typeof wallet.walletBalance === 'number' ? wallet.walletBalance : null,
        escrowRemaining,
        source: fromWallet ? 'wallet' : 'escrow',
        payerName: payer ? payer.name : null,
        payerBefore,
        payerAfter: payer ? Number(payer.walletBalance) : null,
        latency: fmt(durMs)
      }
    };
  }
};
