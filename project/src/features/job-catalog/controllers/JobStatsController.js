import { SKILL_TAGS } from '../models/JobFactory.js';
import { CATEGORIES } from '../models/JobCatalog.js';

/**
 * Service tính toán thống kê tổng quan sàn việc làm từ mảng gốc 100.000 JobPost
 * Tuân thủ Single Source of Truth: Chỉ đọc tham chiếu, không clone object.
 */
export class JobStatsController {
  /**
   * @param {Array<import('../models/JobPost.js').JobPost>} jobs
   */
  static getMarketplaceOverview(jobs = []) {
    let totalEscrow = 0;
    let openJobs = 0;
    let inProgressJobs = 0;
    const categoryCounts = {};

    for (let i = 0; i < SKILL_TAGS.length; i++) {
      categoryCounts[SKILL_TAGS[i]] = 0;
    }

    const len = jobs.length;
    for (let i = 0; i < len; i++) {
      const job = jobs[i];
      totalEscrow += job.escrowBalance || 0;
      if (job.status === 'OPEN') openJobs++;
      else if (job.status === 'IN_PROGRESS') inProgressJobs++;

      if (categoryCounts[job.skillTag] !== undefined) {
        categoryCounts[job.skillTag]++;
      }
    }

    return {
      totalJobs: len,
      openJobs,
      inProgressJobs,
      totalEscrow,
      totalEscrowFormatted: `$${(totalEscrow / 1000000).toFixed(2)}M`,
      categoryCounts,
      // 9 lĩnh vực xếp theo số việc nhiều nhất (đếm = tổng số việc của các kỹ năng thuộc lĩnh vực)
      topCategories: CATEGORIES
        .map(c => ({
          key: `cat:${c.id}`,
          name: c.label,
          icon: c.icon,
          count: c.skills.reduce((sum, sk) => sum + (categoryCounts[sk] || 0), 0)
        }))
        .sort((x, y) => y.count - x.count)
    };
  }
}
