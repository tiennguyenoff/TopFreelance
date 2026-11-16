/**
 * PayoutTicket - Model đại diện cho một vé giải ngân trong Hàng đợi Escrow FIFO (Lab 3)
 * Lưu trữ thông tin hợp đồng giải ngân giữa Doanh nghiệp và Freelancer.
 */
export class PayoutTicket {
  /**
   * @param {Object} data
   * @param {string} data.id            - Mã vé duy nhất (ví dụ: 'TK-000001')
   * @param {string} data.jobId         - Mã bài đăng công việc
   * @param {string} data.freelancerId  - Mã Freelancer thụ hưởng
   * @param {string} [data.employerId]  - Mã Doanh nghiệp giải ngân
   * @param {number} data.amount        - Số tiền thù lao giải ngân ($ USD)
   * @param {string} [data.jobTitle]    - Tiêu đề công việc
   * @param {string} [data.status]      - 'QUEUED' | 'PROCESSED' | 'CANCELLED'
   * @param {number} [data.createdAt]   - Thời gian tạo vé (timestamp)
   */
  constructor({
    id,
    jobId,
    freelancerId,
    employerId = 'USR-BIZ-002',
    amount,
    jobTitle = 'Dự án hoàn thành',
    status = 'QUEUED',
    createdAt = Date.now()
  } = {}) {
    if (!id || typeof id !== 'string') {
      throw new Error('PayoutTicket: id bắt buộc phải là chuỗi định danh duy nhất');
    }
    if (!jobId) {
      throw new Error('PayoutTicket: jobId không được để trống');
    }
    if (!freelancerId) {
      throw new Error('PayoutTicket: freelancerId không được để trống');
    }

    this.id = id;
    this.jobId = jobId;
    this.freelancerId = freelancerId;
    this.employerId = employerId;
    this.amount = Math.max(0, Number(amount) || 0);
    this.jobTitle = jobTitle;
    this.status = status;
    this.createdAt = createdAt;
    this.processedAt = null;

    // Con trỏ liên kết đơn cho LinkedQueue (FIFO)
    this.next = null;
  }

  /**
   * Đánh dấu vé đã giải ngân thành công
   * @returns {void}
   */
  markProcessed() {
    this.status = 'PROCESSED';
    this.processedAt = Date.now();
  }

  /**
   * Hủy vé giải ngân (khiếu nại hoặc rút hợp đồng)
   * @param {string} reason
   * @returns {void}
   */
  markCancelled(reason = '') {
    this.status = 'CANCELLED';
    this.cancelReason = reason;
  }
}
