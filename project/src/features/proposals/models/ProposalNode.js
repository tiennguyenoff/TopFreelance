/**
 * ProposalNode - Node đại diện cho một hồ sơ ứng tuyển (Bidding Proposal)
 * Dùng làm phần tử cốt lõi trong SinglyLinkedList và DoublyLinkedList (Lab 2)
 */
export class ProposalNode {
  /**
   * @param {Object} data
   * @param {string} data.id            - Mã hồ sơ duy nhất (ví dụ: 'PROP-001')
   * @param {string} data.jobId         - Mã công việc ứng tuyển (ví dụ: 'JOB-000001')
   * @param {string} data.freelancerId  - Mã ứng viên (ví dụ: 'USR-FL-001')
   * @param {string} [data.freelancerName] - Tên ứng viên
   * @param {number} data.bidAmount     - Số tiền thù lao đề xuất ($ USD)
   * @param {string} [data.coverLetter] - Thư giới thiệu / Đề xuất giải pháp
   * @param {string} [data.status]      - 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN'
   * @param {number} [data.submittedAt] - Thời gian nộp (timestamp)
   */
  constructor({
    id,
    jobId,
    freelancerId,
    freelancerName = 'Ẩn danh',
    bidAmount = 0,
    coverLetter = '',
    status = 'PENDING',
    submittedAt = Date.now()
  } = {}) {
    if (!id || typeof id !== 'string') {
      throw new Error('ProposalNode: id bắt buộc phải là chuỗi định danh duy nhất');
    }
    if (!freelancerId) {
      throw new Error('ProposalNode: freelancerId không được rỗng');
    }

    this.id = id;
    this.jobId = jobId || '';
    this.freelancerId = freelancerId;
    this.freelancerName = freelancerName;
    this.bidAmount = Math.max(0, Number(bidAmount) || 0);
    this.coverLetter = coverLetter;
    this.status = status;
    this.submittedAt = submittedAt;

    // Con trỏ liên kết (Memory Reference Pointers)
    this.next = null; // Con trỏ xuôi (trỏ tới Node kế tiếp)
    this.prev = null; // Con trỏ ngược (trỏ tới Node liền trước trong DoublyLinkedList)
  }

  /**
   * Cập nhật trạng thái duyệt hồ sơ
   * @param {'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN'} newStatus
   */
  setStatus(newStatus) {
    const validStatuses = ['PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`ProposalNode: Trạng thái ${newStatus} không hợp lệ`);
    }
    this.status = newStatus;
  }

  /**
   * Chuyển đổi Node thành Object thuần túy (không đính kèm con trỏ)
   */
  toJSON() {
    return {
      id: this.id,
      jobId: this.jobId,
      freelancerId: this.freelancerId,
      freelancerName: this.freelancerName,
      bidAmount: this.bidAmount,
      coverLetter: this.coverLetter,
      status: this.status,
      submittedAt: this.submittedAt
    };
  }
}
