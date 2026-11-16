/**
 * SkillSearchController.js
 * Controller quản trị Bảng Băm Kỹ Năng (SkillHashTable) và điều phối tìm kiếm O(1)
 */

import { SkillHashTable } from '../models/SkillHashTable.js';

export class SkillSearchController {
  constructor(initialCapacity = 31, maxLoadFactor = 0.75) {
    this.hashTable = new SkillHashTable(initialCapacity, maxLoadFactor);
    this.isIndexed = false;
  }

  /**
   * Lập chỉ mục toàn bộ danh sách bài tuyển dụng vào Bảng Băm
   * @param {Array} jobs - Danh sách 100.000 bài tuyển dụng
   */
  buildIndex(jobs = []) {
    this.hashTable = new SkillHashTable(31, 0.75);
    this.hashTable.bulkInsert(jobs);
    this.isIndexed = true;
    return this.hashTable.getStats();
  }

  /**
   * Tra cứu công việc theo từ khóa kỹ năng
   */
  search(skillTag) {
    return this.hashTable.search(skillTag);
  }

  /**
   * Lấy số liệu thống kê hiện tại của Bảng Băm
   */
  getStats() {
    return this.hashTable.getStats();
  }

  /**
   * Lấy danh sách kỹ năng có sẵn
   */
  getAvailableSkills() {
    return this.hashTable.getAllKeys();
  }
}
