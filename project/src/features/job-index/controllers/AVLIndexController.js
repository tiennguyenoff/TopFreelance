import { AVLTree } from '../models/AVLTree.js';
import { Timer } from '../../../shared/utils/timer.js';

/**
 * AVLIndexController - Tầng điều phối Chỉ mục Cây tự cân bằng AVL (Lab 4)
 * Quản trị tra cứu 100.000 việc làm theo ID và theo Dải ngân sách với độ phức tạp O(log n).
 */
export class AVLIndexController {
  constructor() {
    /**
     * Cây AVL chỉ mục theo JobID (đảm bảo tra cứu ID trong <= 17 bước)
     * @type {AVLTree}
     */
    this.idTree = new AVLTree();

    /**
     * Cây AVL chỉ mục theo Ngân sách (Budget) phục vụ lọc giá
     * @type {AVLTree}
     */
    this.budgetTree = new AVLTree();
  }

  /**
   * Chuẩn hóa khóa JobID thành số nguyên để so sánh cực nhanh
   * @private
   * @param {string} jobId - Ví dụ 'JOB-000042' -> 42
   * @returns {number|string}
   */
  _extractNumericKey(jobId) {
    if (typeof jobId === 'number') return jobId;
    if (typeof jobId === 'string') {
      const match = jobId.match(/\d+/);
      if (match) return parseInt(match[0], 10);
    }
    return jobId;
  }

  /**
   * Nạp một bài đăng tuyển dụng vào Chỉ mục Cây AVL (O(log n))
   * @param {Object} job - Đối tượng JobPost gốc
   * @returns {{ success: boolean, jobId: string, height: number }}
   */
  indexJob(job) {
    if (!job || !job.id) {
      return { success: false, message: 'JobPost không hợp lệ' };
    }

    const key = this._extractNumericKey(job.id);
    this.idTree.insert(key, job);

    if (job.budget !== undefined && job.budget !== null) {
      this.budgetTree.insert(job.budget, job);
    }

    return {
      success: true,
      jobId: job.id,
      height: this.idTree.height,
      totalIndexed: this.idTree.size
    };
  }

  /**
   * Nạp hàng loạt bài tuyển dụng vào cây AVL
   * @param {Array<Object>} jobs
   * @returns {{ totalIndexed: number, duration: string, height: number, rotations: Object }}
   */
  indexAllJobs(jobs) {
    const timer = new Timer();
    timer.start();

    for (let i = 0; i < jobs.length; i++) {
      this.indexJob(jobs[i]);
    }

    const dur = timer.stop();

    return {
      totalIndexed: this.idTree.size,
      duration: Timer.formatDuration(dur),
      height: this.idTree.height,
      rotations: { ...this.idTree.rotationsCount }
    };
  }

  /**
   * Tìm kiếm bài đăng theo JobID với độ phức tạp O(log n)
   * @param {string|number} jobId
   * @returns {{ found: boolean, job: Object|null, steps: number, latency: string }}
   */
  searchJobById(jobId) {
    const timer = new Timer();
    timer.start();

    const key = this._extractNumericKey(jobId);
    const searchRes = this.idTree.search(key);

    const dur = timer.stop();

    return {
      found: searchRes.found,
      job: searchRes.node ? searchRes.node.jobRef : null,
      steps: searchRes.steps,
      latency: Timer.formatDuration(dur)
    };
  }

  /**
   * Tra cứu danh sách việc làm theo dải ngân sách [minBudget, maxBudget]
   * @param {number} minBudget
   * @param {number} maxBudget
   * @returns {Array<Object>}
   */
  searchJobsByBudgetRange(minBudget, maxBudget) {
    return this.budgetTree.searchRange(minBudget, maxBudget);
  }

  /**
   * Xóa một bài đăng khỏi chỉ mục AVL
   * @param {string} jobId
   * @returns {boolean}
   */
  removeJobById(jobId) {
    const key = this._extractNumericKey(jobId);
    return this.idTree.delete(key);
  }

  /**
   * Thống kê trạng thái chỉ mục Cây AVL
   * @returns {{ totalJobs: number, treeHeight: number, theoreticalMaxHeight: number, isBalanced: boolean, rotations: Object }}
   */
  getStats() {
    const n = this.idTree.size;
    const height = this.idTree.height;
    const theoreticalMax = n > 0 ? Math.ceil(1.44 * Math.log2(n + 2)) : 0;

    return {
      totalJobs: n,
      treeHeight: height,
      theoreticalMaxHeight: theoreticalMax,
      isBalanced: height <= (theoreticalMax || 1),
      rotations: { ...this.idTree.rotationsCount }
    };
  }

  /**
   * Xóa sạch chỉ mục
   */
  clear() {
    this.idTree.clear();
    this.budgetTree.clear();
  }
}

export const avlIndexController = new AVLIndexController();
