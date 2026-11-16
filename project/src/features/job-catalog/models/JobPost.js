import { categoryOfSkill } from './JobCatalog.js';

/**
 * ADT JobPost (Bài đăng tuyển dụng Freelancer)
 * Tái sử dụng xuyên suốt toàn bộ 7 bài Lab
 */

export class JobPost {
  /**
   * @param {Object} data
   * @param {string} data.id            - Ví dụ: 'JOB-000001'
   * @param {string} data.title         - Tiêu đề công việc
   * @param {string} data.skillTag      - Kỹ năng chính: 'react', 'seo', 'accounting', 'figma'...
   * @param {string} [data.category]    - Lĩnh vực (mặc định suy ra từ kỹ năng qua JobCatalog)
   * @param {number} data.budget        - Ngân sách ($ USD)
   * @param {number} data.clientRating  - Đánh giá nhà tuyển dụng (1.0 -> 5.0)
   * @param {number} data.deadlineDays  - Số ngày hạn chót
   * @param {number} [data.slots=1]     - Số lượng freelancer cần tuyển
   */
  constructor(arg1, arg2, arg3, arg4, arg5, arg6, arg7) {
    let id, title, skillTag, category, budget, clientRating, clientReviews, deadlineDays, slots, hiredCount, escrowBalance, status;

    if (arg1 && typeof arg1 === 'object') {
      ({
        id,
        title,
        skillTag,
        category,
        budget,
        clientRating = 5.0,
        clientReviews = 0,
        deadlineDays = 14,
        slots = 1,
        hiredCount = 0,
        escrowBalance = 0,
        status = 'OPEN'
      } = arg1);
    } else {
      id = arg1;
      title = arg2;
      skillTag = arg3;
      budget = arg4;
      slots = arg5 ?? 1;
      deadlineDays = arg6 ?? 14;
      clientRating = arg7 ?? 5.0;
      clientReviews = 0;
      hiredCount = 0;
      escrowBalance = budget;
      status = 'OPEN';
    }

    if (!id || typeof id !== 'string') throw new Error('JobPost: id bắt buộc phải là chuỗi duy nhất');
    if (!title) throw new Error('JobPost: title không được rỗng');

    this.id = id;
    this.title = title;
    this.skillTag = (skillTag || 'general').toLowerCase().trim();
    this.category = category || categoryOfSkill(this.skillTag); // lĩnh vực: it, design, marketing...
    this.budget = Math.max(0, Number(budget) || 0);
    this.clientRating = Number(clientRating) || 5.0;
    this.clientReviews = Math.max(0, Math.floor(Number(clientReviews) || 0)); // số lượt đánh giá client (dùng cho điểm Bayes)
    this.deadlineDays = Number(deadlineDays) || 14;
    this.slots = Math.max(1, Number(slots) || 1);
    this.hiredCount = Number(hiredCount) || 0;
    this.escrowBalance = Number(escrowBalance) || this.budget;
    this.status = status; // 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  }

  get isAvailable() {
    return this.status === 'OPEN' && this.hiredCount < this.slots;
  }

  hireFreelancer() {
    if (!this.isAvailable) {
      return { success: false, code: 'SLOTS_FULL', message: 'Dự án đã đủ người, không nhận thêm!' };
    }
    this.hiredCount++;
    if (this.hiredCount >= this.slots) {
      this.status = 'IN_PROGRESS';
    }
    return { success: true, hiredCount: this.hiredCount, remainingSlots: this.slots - this.hiredCount };
  }

  payoutEscrow(amount) {
    if (amount > this.escrowBalance) {
      return { success: false, code: 'INSUFFICIENT_ESCROW', message: 'Số dư ký quỹ không đủ' };
    }
    this.escrowBalance -= amount;
    return { success: true, remainingEscrow: this.escrowBalance };
  }
}
