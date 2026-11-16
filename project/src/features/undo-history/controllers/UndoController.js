import { UndoAction } from '../models/UndoAction.js';
import { LinkedStack } from '../models/LinkedStack.js';

/**
 * UndoController - Tầng điều phối nghiệp vụ Ngăn xếp Hoàn tác Báo giá LIFO (Lab 3)
 * Cho phép Freelancer hoàn tác/rút lại hành động nộp đơn hoặc đấu thầu gần nhất trong O(1).
 * Tự động phục hồi trạng thái bài đăng và đồng bộ với Hàng đợi Escrow.
 */
export class UndoController {
  constructor() {
    /**
     * Ngăn xếp chính thức lưu trữ các hành động có thể hoàn tác (LinkedStack LIFO)
     * @type {LinkedStack}
     */
    this.stack = new LinkedStack();

    this.actionSequence = 1;
  }

  /**
   * Sinh mã Action ID tự tăng duy nhất
   * @private
   * @returns {string}
   */
  _generateActionId() {
    return `ACT-${String(this.actionSequence++).padStart(6, '0')}`;
  }

  /**
   * 1. LƯU VẾT HÀNH ĐỘNG NỘP ĐƠN / ĐẤU THẦU VÀO ĐỈNH STACK (PUSH - O(1))
   *
   * @param {Object} params
   * @param {Object} params.job - Đối tượng JobPost gốc
   * @param {string} params.freelancerId - Mã Freelancer
   * @param {number} [params.bidAmount] - Mức giá chào thầu ($)
   * @param {string} [params.ticketId] - Mã vé giải ngân tương ứng trong Escrow Queue
   * @returns {{ success: boolean, action?: UndoAction, stackSize: number, message: string }}
   */
  recordApplyAction({
    job,
    freelancerId,
    bidAmount = 0,
    ticketId = ''
  }) {
    if (!job || !job.id) {
      return {
        success: false,
        stackSize: this.stack.size,
        message: 'JobPost không hợp lệ!'
      };
    }
    if (!freelancerId) {
      return {
        success: false,
        stackSize: this.stack.size,
        message: 'freelancerId là bắt buộc!'
      };
    }

    const action = new UndoAction({
      id: this._generateActionId(),
      actionType: 'APPLY_JOB',
      jobId: job.id,
      jobTitle: job.title || 'Dự án',
      freelancerId,
      bidAmount: Number(bidAmount) || Math.floor((job.budget || 0) / (job.slots || 1)),
      ticketId,
      previousState: {
        hiredCount: Math.max(0, (job.hiredCount || 1) - 1),
        status: 'OPEN'
      },
      jobRef: job,
      timestamp: Date.now()
    });

    // Push vào LinkedStack trong O(1)
    this.stack.push(action);

    return {
      success: true,
      action,
      stackSize: this.stack.size,
      message: `Đã lưu vết hành động ${action.id} vào Ngăn xếp LIFO (O(1))`
    };
  }

  /**
   * 2. HOÀN TÁC HÀNH ĐỘNG GẦN NHẤT TRÊN ĐỈNH STACK (POP - O(1))
   * Rút hành động trên cùng, tự động rollback trạng thái bài đăng và hoàn trả slot.
   *
   * @returns {{ success: boolean, action?: UndoAction, remainingCount: number, message: string }}
   */
  undoLastAction() {
    if (this.stack.isEmpty()) {
      return {
        success: false,
        remainingCount: 0,
        message: 'Ngăn xếp hoàn tác hiện đang trống! Không có hành động nào để rollback.'
      };
    }

    // Pop hành động trên đỉnh trong O(1)
    const action = this.stack.pop();

    // Thực hiện logic rollback trên JobPost gốc
    const rollbackRes = action.executeRollback();

    return {
      success: true,
      action,
      remainingCount: this.stack.size,
      message: `Đã hoàn tác thành công hành động ${action.id} (${action.jobTitle}): ${rollbackRes.message}`
    };
  }

  /**
   * Xóa một hành động khỏi Stack theo jobId (khi người dùng rút đơn trực tiếp ngoài giao diện)
   * @param {string} jobId
   * @returns {UndoAction|null}
   */
  removeActionByJobId(jobId) {
    return this.stack.removeByJobId(jobId);
  }

  /** Gỡ đúng hành động theo mã vé giải ngân. */
  removeActionByTicketId(ticketId) {
    return this.stack.removeByTicketId(ticketId);
  }

  /**
   * Xem hành động gần nhất trên đỉnh Stack mà không rút ra (Peek - O(1))
   * @returns {UndoAction|null}
   */
  peekLastAction() {
    return this.stack.peek();
  }

  /**
   * Lấy toàn bộ lịch sử hành động theo thứ tự LIFO (Mới nhất -> Cũ nhất)
   * @returns {Array<UndoAction>}
   */
  getActionHistory() {
    return this.stack.toArray();
  }

  /**
   * Thống kê trạng thái ngăn xếp hoàn tác
   * @returns {{ canUndo: boolean, totalActions: number, nextUndoAction: UndoAction|null }}
   */
  getStackStats() {
    return {
      canUndo: !this.stack.isEmpty(),
      totalActions: this.stack.size,
      nextUndoAction: this.stack.peek()
    };
  }

  /**
   * Xóa sạch toàn bộ lịch sử hoàn tác
   */
  clear() {
    this.stack.clear();
    this.actionSequence = 1;
  }
}

export const undoController = new UndoController();
