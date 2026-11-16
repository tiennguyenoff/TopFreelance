/**
 * UndoAction - Model đại diện cho một hành động có thể hoàn tác trong Ngăn xếp LIFO (Lab 3)
 * Lưu trữ ngữ cảnh trước và sau khi Freelancer thực hiện hành động nộp đơn / đấu thầu.
 */
export class UndoAction {
  /**
   * @param {Object} data
   * @param {string} data.id             - Mã hành động duy nhất (ví dụ: 'ACT-000001')
   * @param {string} [data.actionType]   - Loại hành động ('APPLY_JOB' | 'UPDATE_BID')
   * @param {string} data.jobId          - Mã công việc
   * @param {string} [data.jobTitle]     - Tiêu đề dự án
   * @param {string} data.freelancerId   - Mã Freelancer thực hiện
   * @param {number} data.bidAmount      - Mức thù lao đã chào giá ($)
   * @param {string} [data.ticketId]     - Mã vé giải ngân tương ứng trong Escrow Queue
   * @param {Object} [data.previousState]- Trạng thái trước khi nộp đơn { hiredCount, status }
   * @param {Object} [data.jobRef]       - Con trỏ tham chiếu tới đối tượng JobPost gốc
   * @param {number} [data.timestamp]    - Thời điểm thực hiện hành động
   */
  constructor({
    id,
    actionType = 'APPLY_JOB',
    jobId,
    jobTitle = 'Dự án tuyển dụng',
    freelancerId,
    bidAmount = 0,
    ticketId = '',
    previousState = {},
    jobRef = null,
    timestamp = Date.now()
  } = {}) {
    if (!id || typeof id !== 'string') {
      throw new Error('UndoAction: id bắt buộc phải là chuỗi định danh duy nhất');
    }
    if (!jobId) {
      throw new Error('UndoAction: jobId không được để trống');
    }
    if (!freelancerId) {
      throw new Error('UndoAction: freelancerId không được để trống');
    }

    this.id = id;
    this.actionType = actionType;
    this.jobId = jobId;
    this.jobTitle = jobTitle;
    this.freelancerId = freelancerId;
    this.bidAmount = Math.max(0, Number(bidAmount) || 0);
    this.ticketId = ticketId;
    this.previousState = {
      hiredCount: previousState.hiredCount ?? 0,
      status: previousState.status || 'OPEN'
    };
    this.jobRef = jobRef;
    this.timestamp = timestamp;

    // Con trỏ liên kết đơn cho LinkedStack (LIFO)
    this.next = null;
  }

  /**
   * Thực hiện phục hồi trạng thái cho đối tượng JobPost gốc
   * @returns {{ success: boolean, message: string }}
   */
  executeRollback() {
    if (this.jobRef) {
      // Giảm số lượng tuyển và mở lại trạng thái tuyển dụng nếu cần
      this.jobRef.hiredCount = Math.max(0, this.jobRef.hiredCount - 1);
      if (this.jobRef.hiredCount < this.jobRef.slots) {
        this.jobRef.status = 'OPEN';
      }
      return {
        success: true,
        message: `Đã khôi phục slot tuyển dụng cho dự án ${this.jobId} (hired: ${this.jobRef.hiredCount}/${this.jobRef.slots})`
      };
    }
    return {
      success: true,
      message: `Đã rollback hành động ${this.id} của dự án ${this.jobId}`
    };
  }
}
