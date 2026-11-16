/**
 * HashBucketNode.js
 * Node trong danh sách liên kết đơn (Singly Linked List) dùng cho cơ chế Separate Chaining của Bảng Băm
 */

export class HashBucketNode {
  /**
   * @param {string} key - Từ khóa kỹ năng (ví dụ: 'react', 'python')
   * @param {Object} [jobRef=null] - Con trỏ đến JobPost đầu tiên
   * @param {HashBucketNode|null} [next=null] - Node kế tiếp trong chuỗi va chạm
   */
  constructor(key, jobRef = null, next = null) {
    if (!key || typeof key !== 'string') {
      throw new Error('HashBucketNode: key bắt buộc phải là chuỗi không rỗng');
    }

    this.key = key.toLowerCase().trim();
    // Danh sách con trỏ các bài đăng tuyển dụng khớp với kỹ năng này (Single Source of Truth)
    this.jobs = jobRef ? [jobRef] : [];
    this.next = next;
  }

  /**
   * Thêm con trỏ JobPost vào node này
   */
  addJob(jobRef) {
    if (jobRef) {
      this.jobs.push(jobRef);
    }
  }

  /**
   * Số lượng bài tuyển dụng trong node này
   */
  get count() {
    return this.jobs.length;
  }
}
