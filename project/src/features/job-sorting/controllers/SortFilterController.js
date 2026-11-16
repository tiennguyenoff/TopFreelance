/**
 * SortFilterController.js
 * Controller điều phối bộ lọc và giải thuật sắp xếp (QuickSort & MergeSort)
 * Tích hợp Single Source of Truth và bảo đảm tiêu chuẩn kiến trúc MVC
 */

import { QuickSort } from '../models/QuickSort.js';
import { MergeSort } from '../models/MergeSort.js';

export class SortFilterController {
  constructor(jobList = []) {
    this.jobs = jobList; // Single Source of Truth
  }

  setJobs(jobs) {
    this.jobs = jobs;
  }

  /**
   * Sắp xếp bài tuyển dụng theo tiêu chuẩn
   * @param {string} sortBy - 'budget_desc' | 'budget_asc' | 'deadline_asc' | 'rating_desc' | 'rating_desc_budget_asc'
   * @param {string} [algorithm='mergesort'] - 'mergesort' (ổn định) hoặc 'quicksort' (in-place)
   */
  sortJobs(sortBy = 'budget_desc', algorithm = 'mergesort') {
    if (!this.jobs || this.jobs.length === 0) {
      return { sorted: [], durationMs: 0, algorithm, isStable: true };
    }

    if (algorithm === 'quicksort') {
      const result = QuickSort.sort(this.jobs, { criteria: sortBy, inPlace: false });
      return {
        ...result,
        algorithm: 'quicksort',
        isStable: false
      };
    }

    // Mặc định dùng MergeSort bảo đảm tính ổn định
    const result = MergeSort.sort(this.jobs, { criteria: sortBy, inPlace: false });
    return {
      ...result,
      algorithm: 'mergesort',
      isStable: true
    };
  }

  /**
   * Sắp xếp đa tiêu chí kép (Multi-key sort)
   * Ví dụ: rating giảm dần, nếu bằng nhau thì ngân sách tăng dần
   */
  sortMultiKey(criteriaList = [{ key: 'clientRating', order: 'desc' }, { key: 'budget', order: 'asc' }]) {
    return MergeSort.multiKeySort(this.jobs, criteriaList);
  }

  /**
   * Kiểm tra tính ổn định thực nghiệm trên tập bài đăng
   */
  checkStability(sortBy = 'rating_desc', algorithm = 'mergesort') {
    const sortedResult = algorithm === 'quicksort'
      ? QuickSort.sort(this.jobs, { criteria: sortBy, inPlace: false })
      : MergeSort.sort(this.jobs, { criteria: sortBy, inPlace: false });

    const key = sortBy.includes('rating') ? 'clientRating' : 'budget';
    const stability = MergeSort.verifyStability(this.jobs, sortedResult.sorted, key, 'id');

    return {
      algorithm,
      sortBy,
      durationMs: sortedResult.durationMs,
      ...stability
    };
  }
}
