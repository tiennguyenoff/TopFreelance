/**
 * BinarySearchRange.js
 * Hiện thực thuật toán Tìm Kiếm Nhị Phân (Binary Search) lọc theo Dải Ngân Sách:
 * - Áp dụng trên mảng bài tuyển dụng đã sắp xếp theo budget tăng dần
 * - Tìm kiếm cận trái (lowerBound) và cận phải (upperBound) trong O(log n)
 * - Trích xuất dải bài đăng từ $min đến $max trong O(log n + k) với k là số lượng kết quả
 * - Không tốn thêm RAM, Single Source of Truth
 */

export class BinarySearchRange {
  /**
   * Tìm vị trí đầu tiên có job.budget >= minBudget (Cận trái / Lower Bound)
   * @param {Array} sortedJobs - Mảng con trỏ đã sắp xếp theo budget tăng dần
   * @param {number} minBudget - Ngân sách tối thiểu
   * @param {Object} [stats] - Bộ đếm số phép so sánh
   * @returns {number} Chỉ số index đầu tiên thoả mãn (từ 0 đến n)
   */
  static lowerBound(sortedJobs, minBudget, stats = null) {
    let low = 0;
    let high = sortedJobs.length;

    while (low < high) {
      if (stats) stats.comparisons++;
      const mid = low + Math.floor((high - low) / 2);

      if (sortedJobs[mid].budget >= minBudget) {
        high = mid;
      } else {
        low = mid + 1;
      }
    }

    return low;
  }

  /**
   * Tìm vị trí đầu tiên có job.budget > maxBudget (Cận phải / Upper Bound)
   * @param {Array} sortedJobs - Mảng con trỏ đã sắp xếp theo budget tăng dần
   * @param {number} maxBudget - Ngân sách tối đa
   * @param {Object} [stats] - Bộ đếm số phép so sánh
   * @returns {number} Chỉ số index đầu tiên có budget > maxBudget
   */
  static upperBound(sortedJobs, maxBudget, stats = null) {
    let low = 0;
    let high = sortedJobs.length;

    while (low < high) {
      if (stats) stats.comparisons++;
      const mid = low + Math.floor((high - low) / 2);

      if (sortedJobs[mid].budget > maxBudget) {
        high = mid;
      } else {
        low = mid + 1;
      }
    }

    return low;
  }

  /**
   * Phiên bản ĐỆ QUY của lowerBound (theo yêu cầu đề: Binary Search bằng đệ quy).
   * Mỗi lời gọi loại bỏ một nửa đoạn [low, high) nên độ sâu đệ quy = ⌈log2 n⌉ (≈ 17 với 100.000 phần tử).
   * Kết quả trùng khớp lowerBound() dạng vòng lặp ở trên.
   */
  static lowerBoundRecursive(sortedJobs, minBudget, low = 0, high = sortedJobs.length, stats = null) {
    if (low >= high) return low;
    if (stats) stats.comparisons++;
    const mid = low + Math.floor((high - low) / 2);
    return sortedJobs[mid].budget >= minBudget
      ? this.lowerBoundRecursive(sortedJobs, minBudget, low, mid, stats)
      : this.lowerBoundRecursive(sortedJobs, minBudget, mid + 1, high, stats);
  }

  /**
   * Tìm kiếm toàn bộ các bài đăng tuyển dụng có ngân sách nằm trong khoảng [minBudget, maxBudget]
   * Độ phức tạp: O(log n + k)
   * @param {Array} sortedJobs - Mảng đã sắp xếp theo budget tăng dần
   * @param {number} minBudget - Giá sàn ($ USD)
   * @param {number} maxBudget - Giá trần ($ USD)
   * @returns {{ matches: Array, count: number, lowerIndex: number, upperIndex: number, comparisons: number, durationMs: number }}
   */
  static searchRange(sortedJobs, minBudget, maxBudget) {
    const stats = { comparisons: 0 };
    const startTime = (typeof performance !== 'undefined' && performance.now) 
      ? performance.now() 
      : Date.now();

    if (!Array.isArray(sortedJobs) || sortedJobs.length === 0 || minBudget > maxBudget) {
      return {
        matches: [],
        count: 0,
        lowerIndex: -1,
        upperIndex: -1,
        comparisons: 0,
        durationMs: 0
      };
    }

    // 1. Tìm cận trái lowerBound (O(log n))
    const left = this.lowerBound(sortedJobs, minBudget, stats);

    // 2. Tìm cận phải upperBound (O(log n))
    const right = this.upperBound(sortedJobs, maxBudget, stats);

    // 3. Trích xuất lát cắt kết quả trong O(k)
    const matches = (left < right) ? sortedJobs.slice(left, right) : [];

    const endTime = (typeof performance !== 'undefined' && performance.now) 
      ? performance.now() 
      : Date.now();

    const durationMs = Number((endTime - startTime).toFixed(3));

    return {
      matches,
      count: matches.length,
      lowerIndex: left,
      upperIndex: right - 1,
      comparisons: stats.comparisons,
      durationMs
    };
  }

  /**
   * Duyệt Tuyến Tính (Linear Scan) để kiểm chứng đối đầu và chứng minh tính đúng đắn O(n)
   */
  static linearScanRange(jobs, minBudget, maxBudget) {
    const startTime = (typeof performance !== 'undefined' && performance.now) 
      ? performance.now() 
      : Date.now();

    let comparisons = 0;
    const matches = [];

    for (let i = 0; i < jobs.length; i++) {
      comparisons += 2;
      const b = jobs[i].budget;
      if (b >= minBudget && b <= maxBudget) {
        matches.push(jobs[i]);
      }
    }

    const endTime = (typeof performance !== 'undefined' && performance.now) 
      ? performance.now() 
      : Date.now();

    return {
      matches,
      count: matches.length,
      comparisons,
      durationMs: Number((endTime - startTime).toFixed(3))
    };
  }
}
