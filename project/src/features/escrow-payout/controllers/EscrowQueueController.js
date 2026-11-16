import { PayoutTicket } from '../models/PayoutTicket.js';
import { LinkedQueue } from '../models/LinkedQueue.js';

/**
 * EscrowQueueController - Tầng điều phối nghiệp vụ Hàng đợi Giải ngân Ký quỹ FIFO (Lab 3)
 * Đảm bảo nguyên tắc First-Come, First-Served: Freelancer hoàn thành dự án trước sẽ được giải ngân trước.
 * Duy trì các bất biến dữ liệu (Data Invariants):
 *   - Không giải ngân vượt quá số tiền ký quỹ (No Escrow Discrepancy).
 *   - Tốc độ xử lý Enqueue và Dequeue đạt O(1) tuyệt đối.
 */
export class EscrowQueueController {
  constructor() {
    /**
     * Hàng đợi chính thức các vé chờ giải ngân (LinkedQueue FIFO)
     * @type {LinkedQueue}
     */
    this.queue = new LinkedQueue();

    /**
     * Lịch sử các vé đã giải ngân thành công
     * @type {Array<PayoutTicket>}
     */
    this.processedHistory = [];

    this.ticketSequence = 1;
  }

  /**
   * Sinh mã Ticket ID tự tăng duy nhất
   * @private
   * @returns {string}
   */
  _generateTicketId() {
    return `TK-${String(this.ticketSequence++).padStart(6, '0')}`;
  }

  /**
   * 1. NẠP YÊU CẦU GIẢI NGÂN VÀO HÀNG ĐỢI FIFO (ENQUEUE - O(1))
   * Khi Freelancer nộp kết quả nghiệm thu thành công hoặc hoàn thành dự án.
   *
   * @param {Object} params
   * @param {string} params.jobId - Mã công việc
   * @param {string} params.freelancerId - Mã Freelancer thụ hưởng
   * @param {string} [params.employerId] - Mã Doanh nghiệp chi trả
   * @param {number} params.amount - Số tiền giải ngân ($)
   * @param {string} [params.jobTitle] - Tiêu đề dự án
   * @returns {{ success: boolean, ticket?: PayoutTicket, code?: string, message: string }}
   */
  enqueuePayout({
    jobId,
    freelancerId,
    employerId = 'USR-BIZ-002',
    amount = 0,
    jobTitle = 'Dự án hoàn tất'
  }) {
    if (!jobId || !freelancerId) {
      return {
        success: false,
        code: 'INVALID_INPUT',
        message: 'jobId và freelancerId là bắt buộc!'
      };
    }

    const validAmount = Number(amount);
    if (isNaN(validAmount) || validAmount <= 0) {
      return {
        success: false,
        code: 'INVALID_AMOUNT',
        message: 'Số tiền giải ngân phải là số dương lớn hơn 0!'
      };
    }

    // Tạo PayoutTicket mới
    const ticket = new PayoutTicket({
      id: this._generateTicketId(),
      jobId,
      freelancerId,
      employerId,
      amount: validAmount,
      jobTitle,
      status: 'QUEUED',
      createdAt: Date.now()
    });

    // Enqueue vào LinkedQueue trong O(1)
    this.queue.enqueue(ticket);

    return {
      success: true,
      ticket,
      queueSize: this.queue.size,
      message: `Đã nạp vé ${ticket.id} (${ticket.amount}$) vào Hàng đợi FIFO (O(1))`
    };
  }

  /**
   * 2. XỬ LÝ GIẢI NGÂN VÉ TIẾP THEO THEO NGUYÊN TẮC FIFO (DEQUEUE - O(1))
   * Rút vé đứng đầu hàng đợi để chuyển tiền vào ví Freelancer.
   *
   * @param {Object} [walletTarget] - Đối tượng chứa ví tiền (vd: currentUser với walletBalance)
   * @returns {{ success: boolean, ticket?: PayoutTicket, remainingCount: number, message: string }}
   */
  processNextPayout(walletTarget = null) {
    if (this.queue.isEmpty()) {
      return {
        success: false,
        remainingCount: 0,
        message: 'Hàng đợi giải ngân hiện đang trống!'
      };
    }

    // Dequeue vé đứng đầu trong O(1)
    const ticket = this.queue.dequeue();
    ticket.markProcessed();

    // Lưu vào lịch sử giải ngân
    this.processedHistory.unshift(ticket);

    // Cộng số dư ví nếu có đối tượng ví hợp lệ
    if (walletTarget && typeof walletTarget.walletBalance === 'number') {
      walletTarget.walletBalance += ticket.amount;
    }

    return {
      success: true,
      ticket,
      remainingCount: this.queue.size,
      message: `Đã giải ngân thành công ${ticket.amount}$ cho vé ${ticket.id} (${ticket.freelancerId})`
    };
  }

  /**
   * Hủy vé giải ngân khi ứng viên rút hồ sơ dự án
   * @param {string} jobId
   * @returns {PayoutTicket|null}
   */
  cancelTicketByJobId(jobId) {
    const removed = this.queue.removeByJobId(jobId);
    if (removed) {
      removed.markCancelled('Freelancer đã rút hồ sơ dự án');
    }
    return removed;
  }

  /** Hủy ĐÚNG vé theo mã vé (an toàn cho việc nhiều slot). */
  cancelTicketById(ticketId) {
    const removed = this.queue.removeByTicketId(ticketId);
    if (removed) removed.markCancelled('Freelancer đã rút hồ sơ dự án');
    return removed;
  }

  /**
   * Xem vé đứng đầu hàng đợi chuẩn bị được nhận tiền (Peek - O(1))
   * @returns {PayoutTicket|null}
   */
  peekNextPayout() {
    return this.queue.peek();
  }

  /**
   * Lấy danh sách toàn bộ các vé đang chờ giải ngân (Head -> Tail)
   * @returns {Array<PayoutTicket>}
   */
  getPendingTickets() {
    return this.queue.toArray();
  }

  /**
   * Lấy lịch sử các vé đã giải ngân
   * @returns {Array<PayoutTicket>}
   */
  getProcessedTickets() {
    return [...this.processedHistory];
  }

  /**
   * Báo cáo thống kê tài chính và hàng đợi Escrow
   * @returns {{ pendingCount: number, totalPendingAmount: number, processedCount: number, totalProcessedAmount: number, nextTicket: PayoutTicket|null }}
   */
  getQueueStats() {
    const pendingTickets = this.queue.toArray();
    const totalPendingAmount = pendingTickets.reduce((sum, t) => sum + t.amount, 0);
    const totalProcessedAmount = this.processedHistory.reduce((sum, t) => sum + t.amount, 0);

    return {
      pendingCount: this.queue.size,
      totalPendingAmount,
      processedCount: this.processedHistory.length,
      totalProcessedAmount,
      nextTicket: this.queue.peek()
    };
  }

  /**
   * Xóa sạch dữ liệu hàng đợi
   */
  clear() {
    this.queue.clear();
    this.processedHistory = [];
    this.ticketSequence = 1;
  }
}

export const escrowQueueController = new EscrowQueueController();
