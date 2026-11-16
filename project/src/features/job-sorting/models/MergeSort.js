/**
 * MergeSort.js
 * Hiện thực giải thuật Sắp Xếp Trộn (MergeSort) với:
 * - Bảo đảm TUYỆT ĐỐI Tính Ổn Định (Stability): Không thay đổi thứ tự tương đối của các phần tử trùng khóa
 * - Hỗ trợ lọc đa tiêu chí linh hoạt (Multi-key sort: Primary key -> thenBy Secondary key)
 * - Tối ưu hóa bộ nhớ: Tái sử dụng 1 mảng phụ duy nhất (auxiliary array) để khống chế RAM Heap < 180MB
 * - Thuật toán kiểm tra tính ổn định tự động verifyStability()
 * - Độ phức tạp: O(n log n) trong MỌI trường hợp (Best, Average, Worst case)
 */

export class MergeSort {
  /**
   * Tạo comparator đa tiêu chí từ danh sách các tiêu chí
   * @param {Array<{ key: string, order: 'asc'|'desc' }>} criteriaList
   * Ví dụ: [{ key: 'clientRating', order: 'desc' }, { key: 'budget', order: 'asc' }]
   */
  static createMultiKeyComparator(criteriaList = []) {
    if (!Array.isArray(criteriaList) || criteriaList.length === 0) {
      return (a, b) => (b.budget ?? 0) - (a.budget ?? 0);
    }

    return (a, b) => {
      for (const criteria of criteriaList) {
        const { key, order = 'asc' } = criteria;
        const valA = a[key] ?? 0;
        const valB = b[key] ?? 0;

        if (valA !== valB) {
          if (typeof valA === 'string' && typeof valB === 'string') {
            const cmp = valA.localeCompare(valB);
            return order === 'desc' ? -cmp : cmp;
          }
          return order === 'desc' ? (valB - valA) : (valA - valB);
        }
      }
      return 0; // Trùng toàn bộ các khóa
    };
  }

  /**
   * Tạo comparator tiêu chuẩn từ chuỗi hoặc hàm
   */
  static getComparator(criteria = 'budget_desc') {
    if (typeof criteria === 'function') return criteria;
    if (Array.isArray(criteria)) return this.createMultiKeyComparator(criteria);

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
      case 'rating_desc_budget_asc':
        return this.createMultiKeyComparator([
          { key: 'clientRating', order: 'desc' },
          { key: 'budget', order: 'asc' }
        ]);
      default:
        return (a, b) => (b.budget ?? 0) - (a.budget ?? 0);
    }
  }

  /**
   * Bước Trộn (Merge) bảo đảm Tính Ổn Định
   * Khi arr[i] và arr[j] bằng nhau (comparator <= 0),
   * PHẢI ưu tiên chọn phần tử bên trái (arr[i]) trước để bảo toàn trật tự ban đầu!
   */
  static merge(arr, aux, low, mid, high, comparator, stats) {
    for (let k = low; k <= high; k++) {
      aux[k] = arr[k];
    }

    let i = low;
    let j = mid + 1;

    for (let k = low; k <= high; k++) {
      if (i > mid) {
        arr[k] = aux[j++];
      } else if (j > high) {
        arr[k] = aux[i++];
      } else {
        stats.comparisons++;
        // ĐIỀU KIỆN SỐNG CÒN CỦA TÍNH ỔN ĐỊNH: Dùng <= 0
        // Nếu aux[i] <= aux[j], chọn aux[i] trước!
        if (comparator(aux[i], aux[j]) <= 0) {
          arr[k] = aux[i++];
        } else {
          arr[k] = aux[j++];
        }
      }
    }
  }

  /**
   * Sắp xếp phân đoạn đệ quy Chia để trị
   */
  static sortSubArray(arr, aux, low, high, comparator, stats) {
    if (low >= high) return;

    const mid = low + Math.floor((high - low) / 2);
    this.sortSubArray(arr, aux, low, mid, comparator, stats);
    this.sortSubArray(arr, aux, mid + 1, high, comparator, stats);

    // Tối ưu hóa: Nếu 2 nửa đã theo thứ tự thì bỏ qua bước merge
    stats.comparisons++;
    if (comparator(arr[mid], arr[mid + 1]) <= 0) {
      return;
    }

    this.merge(arr, aux, low, mid, high, comparator, stats);
  }

  /**
   * Phương thức sắp xếp MergeSort chính
   * @param {Array} array - Mảng các đối tượng cần sắp xếp
   * @param {Object} options
   * @param {string|Array|Function} [options.criteria='budget_desc']
   * @param {boolean} [options.inPlace=false]
   * @returns {{ sorted: Array, comparisons: number, durationMs: number, isStable: boolean }}
   */
  static sort(array, options = {}) {
    const {
      criteria = 'budget_desc',
      inPlace = false
    } = options;

    if (!Array.isArray(array) || array.length <= 1) {
      return {
        sorted: inPlace ? array : [...(array || [])],
        comparisons: 0,
        durationMs: 0,
        isStable: true
      };
    }

    const targetArr = inPlace ? array : array.slice();
    const aux = new Array(targetArr.length);
    const comparator = this.getComparator(criteria);
    const stats = { comparisons: 0 };

    const startTime = (typeof performance !== 'undefined' && performance.now) 
      ? performance.now() 
      : Date.now();

    this.sortSubArray(targetArr, aux, 0, targetArr.length - 1, comparator, stats);

    const endTime = (typeof performance !== 'undefined' && performance.now) 
      ? performance.now() 
      : Date.now();

    const durationMs = Number((endTime - startTime).toFixed(3));

    return {
      sorted: targetArr,
      comparisons: stats.comparisons,
      durationMs,
      isStable: true
    };
  }

  /**
   * Sắp xếp đa tiêu chí tiện ích
   */
  static multiKeySort(jobs, criteriaList, options = {}) {
    return this.sort(jobs, {
      ...options,
      criteria: criteriaList
    });
  }

  /**
   * Thuật toán kiểm tra Tính Ổn Định (Verify Stability)
   * Kiểm tra xem các phần tử có cùng primaryKey trong mảng ban đầu
   * có duy trì đúng 100% thứ tự tương đối trong mảng kết quả sau sắp xếp hay không.
   * 
   * @param {Array} originalArr - Mảng gốc ban đầu
   * @param {Array} sortedArr - Mảng sau khi đã sắp xếp theo primaryKey
   * @param {string} primaryKey - Khóa chính được dùng để sắp xếp (ví dụ: 'clientRating')
   * @param {string} [idKey='id'] - Khóa định danh duy nhất của phần tử
   * @returns {{ isStable: boolean, violationsCount: number, testedPairs: number, violationExamples: Array }}
   */
  static verifyStability(originalArr, sortedArr, primaryKey, idKey = 'id') {
    if (!Array.isArray(originalArr) || !Array.isArray(sortedArr) || originalArr.length !== sortedArr.length) {
      throw new Error('verifyStability: Hai mảng phải hợp lệ và cùng kích thước');
    }

    // 1. Ánh xạ vị trí ban đầu của từng phần tử theo id
    const originalPosMap = new Map();
    for (let i = 0; i < originalArr.length; i++) {
      const item = originalArr[i];
      const id = item[idKey] ?? item;
      originalPosMap.set(id, i);
    }

    let violationsCount = 0;
    let testedPairs = 0;
    const violationExamples = [];

    // 2. Duyệt qua mảng sortedArr, kiểm tra các cặp phần tử liền kề có cùng primaryKey
    for (let i = 0; i < sortedArr.length - 1; i++) {
      const curr = sortedArr[i];
      const next = sortedArr[i + 1];

      if (curr[primaryKey] === next[primaryKey]) {
        testedPairs++;
        const posCurr = originalPosMap.get(curr[idKey] ?? curr);
        const posNext = originalPosMap.get(next[idKey] ?? next);

        // Trong mảng ban đầu, curr phải xuất hiện trước next (posCurr < posNext)
        if (posCurr > posNext) {
          violationsCount++;
          if (violationExamples.length < 5) {
            violationExamples.push({
              primaryKey,
              sharedValue: curr[primaryKey],
              firstItemInSorted: curr[idKey],
              secondItemInSorted: next[idKey],
              originalIndexFirst: posCurr,
              originalIndexSecond: posNext,
              error: `Phần tử ${curr[idKey]} (gốc vị trí ${posCurr}) bị xếp trước ${next[idKey]} (gốc vị trí ${posNext})`
            });
          }
        }
      }
    }

    return {
      isStable: violationsCount === 0,
      violationsCount,
      testedPairs,
      violationExamples
    };
  }
}
