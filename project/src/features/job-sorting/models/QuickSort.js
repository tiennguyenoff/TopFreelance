/**
 * QuickSort.js
 * Hiện thực giải thuật QuickSort với:
 * - Chọn pivot Trung Vị Ba (Median-of-Three) chống suy biến O(n²)
 * - Hỗ trợ cả 2 kỹ thuật phân đoạn: Hoare Partition và Lomuto Partition
 * - Sắp xếp in-place trên mảng con trỏ JobPost (Single Source of Truth)
 * - Độ phức tạp: O(n log n) Best/Average case, O(log n) bộ nhớ stack
 */

export class QuickSort {
  /**
   * Tạo bộ so sánh chuẩn hóa từ tên thuộc tính hoặc hàm tùy biến
   */
  static getComparator(criteria = 'budget_desc') {
    if (typeof criteria === 'function') return criteria;

    switch (criteria) {
      case 'budget_desc':
        return (a, b) => (b.budget ?? 0) - (a.budget ?? 0);
      case 'budget_asc':
        return (a, b) => (a.budget ?? 0) - (b.budget ?? 0);
      case 'deadline_asc':
        return (a, b) => (a.deadlineDays ?? 0) - (b.deadlineDays ?? 0);
      case 'deadline_desc':
        return (a, b) => (b.deadlineDays ?? 0) - (a.deadlineDays ?? 0);
      case 'rating_desc':
        return (a, b) => (b.clientRating ?? 0) - (a.clientRating ?? 0);
      case 'rating_asc':
        return (a, b) => (a.clientRating ?? 0) - (b.clientRating ?? 0);
      default:
        return (a, b) => (b.budget ?? 0) - (a.budget ?? 0);
    }
  }

  /**
   * Hoán vị 2 phần tử trong mảng
   */
  static swap(arr, i, j, stats) {
    if (i === j) return;
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
    if (stats) stats.swaps++;
  }

  /**
   * Cơ chế chọn Pivot Median-of-Three:
   * Lấy trung vị của 3 phần tử: arr[low], arr[mid], arr[high]
   * Sắp xếp 3 vị trí này và đưa phần tử trung vị về vị trí thích hợp
   */
  static medianOfThree(arr, low, high, comparator, stats) {
    const mid = low + Math.floor((high - low) / 2);

    // Sắp xếp arr[low], arr[mid], arr[high]
    stats.comparisons++;
    if (comparator(arr[mid], arr[low]) < 0) {
      this.swap(arr, low, mid, stats);
    }

    stats.comparisons++;
    if (comparator(arr[high], arr[low]) < 0) {
      this.swap(arr, low, high, stats);
    }

    stats.comparisons++;
    if (comparator(arr[high], arr[mid]) < 0) {
      this.swap(arr, mid, high, stats);
    }

    // Sau 3 phép so sánh, arr[mid] chính là giá trị trung vị (median)
    return mid;
  }

  /**
   * Phân đoạn theo kỹ thuật Hoare (Hoare Partition Scheme)
   * Sử dụng 2 con trỏ chạy ngược chiều từ 2 đầu mảng
   * Tối ưu số lần hoán vị (swaps) ít hơn Lomuto khoảng 3 lần
   */
  static hoarePartition(arr, low, high, comparator, stats, useMedianOfThree = true) {
    let pivot;
    if (useMedianOfThree && high - low >= 2) {
      const mid = this.medianOfThree(arr, low, high, comparator, stats);
      pivot = arr[mid];
      // Hoare hoạt động trơn tru khi pivot là giá trị của arr[mid]
    } else {
      pivot = arr[low];
    }

    let i = low - 1;
    let j = high + 1;

    while (true) {
      do {
        i++;
        stats.comparisons++;
      } while (comparator(arr[i], pivot) < 0);

      do {
        j--;
        stats.comparisons++;
      } while (comparator(arr[j], pivot) > 0);

      if (i >= j) {
        return j;
      }

      this.swap(arr, i, j, stats);
    }
  }

  /**
   * Phân đoạn theo kỹ thuật Lomuto (Lomuto Partition Scheme)
   * Giữ pivot ở cuối mảng (arr[high]), con trỏ trượt i và j từ trái sang phải
   */
  static lomutoPartition(arr, low, high, comparator, stats, useMedianOfThree = true) {
    if (useMedianOfThree && high - low >= 2) {
      const mid = this.medianOfThree(arr, low, high, comparator, stats);
      // Đưa pivot trung vị về cuối mảng để áp dụng chuẩn Lomuto
      this.swap(arr, mid, high, stats);
    }

    const pivot = arr[high];
    let i = low - 1;

    for (let j = low; j < high; j++) {
      stats.comparisons++;
      if (comparator(arr[j], pivot) <= 0) {
        i++;
        this.swap(arr, i, j, stats);
      }
    }

    this.swap(arr, i + 1, high, stats);
    return i + 1;
  }

  /**
   * Sắp xếp QuickSort đệ quy với khử đệ quy đuôi (Tail Call Optimization)
   */
  static sortSubArray(arr, low, high, comparator, stats, partitionScheme = 'hoare', useMedianOfThree = true) {
    while (low < high) {
      // Với mảng nhỏ dưới 10 phần tử, có thể dùng InsertionSort để tối ưu nếu cần
      let p;
      if (partitionScheme === 'lomuto') {
        p = this.lomutoPartition(arr, low, high, comparator, stats, useMedianOfThree);
        // Đệ quy trên phân vùng nhỏ hơn trước để khống chế chiều sâu call stack O(log n)
        if (p - 1 - low < high - (p + 1)) {
          this.sortSubArray(arr, low, p - 1, comparator, stats, partitionScheme, useMedianOfThree);
          low = p + 1;
        } else {
          this.sortSubArray(arr, p + 1, high, comparator, stats, partitionScheme, useMedianOfThree);
          high = p - 1;
        }
      } else {
        // Hoare Partition
        p = this.hoarePartition(arr, low, high, comparator, stats, useMedianOfThree);
        if (p - low < high - (p + 1)) {
          this.sortSubArray(arr, low, p, comparator, stats, partitionScheme, useMedianOfThree);
          low = p + 1;
        } else {
          this.sortSubArray(arr, p + 1, high, comparator, stats, partitionScheme, useMedianOfThree);
          high = p;
        }
      }
    }
  }

  /**
   * Phương thức chính sắp xếp QuickSort
   * @param {Array} array - Mảng các đối tượng cần sắp xếp
   * @param {Object} options
   * @param {string|Function} [options.criteria='budget_desc'] - Tiêu chí hoặc comparator tùy biến
   * @param {string} [options.partitionScheme='hoare'] - 'hoare' | 'lomuto'
   * @param {boolean} [options.useMedianOfThree=true] - Kích hoạt chọn pivot Median-of-Three
   * @param {boolean} [options.inPlace=false] - Sắp xếp trực tiếp trên mảng truyền vào hay sao chép con trỏ
   * @returns {{ sorted: Array, comparisons: number, swaps: number, durationMs: number }}
   */
  static sort(array, options = {}) {
    const {
      criteria = 'budget_desc',
      partitionScheme = 'hoare',
      useMedianOfThree = true,
      inPlace = false
    } = options;

    if (!Array.isArray(array) || array.length <= 1) {
      return {
        sorted: inPlace ? array : [...(array || [])],
        comparisons: 0,
        swaps: 0,
        durationMs: 0
      };
    }

    const targetArr = inPlace ? array : array.slice();
    const comparator = this.getComparator(criteria);
    const stats = { comparisons: 0, swaps: 0 };

    const startTime = (typeof performance !== 'undefined' && performance.now) 
      ? performance.now() 
      : Date.now();

    this.sortSubArray(targetArr, 0, targetArr.length - 1, comparator, stats, partitionScheme, useMedianOfThree);

    const endTime = (typeof performance !== 'undefined' && performance.now) 
      ? performance.now() 
      : Date.now();

    const durationMs = Number((endTime - startTime).toFixed(3));

    return {
      sorted: targetArr,
      comparisons: stats.comparisons,
      swaps: stats.swaps,
      durationMs
    };
  }
}
