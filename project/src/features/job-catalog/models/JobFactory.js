import { JobPost } from './JobPost.js';

import { CATEGORIES, ALL_SKILLS, CATEGORY_OF_SKILL } from './JobCatalog.js';

// Mọi kỹ năng của 9 lĩnh vực (IT, thiết kế, marketing, viết/dịch, video, kế toán, giáo dục, hành chính, kỹ thuật)
export const SKILL_TAGS = ALL_SKILLS;

const TITLES_BY_CATEGORY = Object.fromEntries(CATEGORIES.map(c => [c.id, c.titles]));
const AUDIENCES = ['cho startup', 'cho cửa hàng online', 'cho công ty SME', 'cho dự án cá nhân', 'cho chuỗi cửa hàng', 'cho trung tâm đào tạo', 'cho thương hiệu mới', 'gấp trong tháng'];

export class JobFactory {
  /**
   * Sinh N bài đăng tuyển dụng với hạt giống xác định (Deterministic PRNG)
   * Giúp kết quả đo đạc lặp lại chính xác giữa các lần chạy.
   * startIndex: đánh số mã việc tiếp nối (dùng khi nạp dần theo lô, ví dụ kiểm thử RAM cực hạn).
   */
  static generateJobs(count = 100000, seed = 42, startIndex = 0) {
    let s = seed;
    function nextRand() {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    }

    const jobs = new Array(count);
    // Luồng ngẫu nhiên THỨ HAI cho số lượt đánh giá: không làm lệch chuỗi số của các trường cũ
    let s2 = (seed * 7 + 13) >>> 0;
    function nextRand2() {
      s2 = (s2 * 1664525 + 1013904223) % 4294967296;
      return s2 / 4294967296;
    }

    for (let i = 0; i < count; i++) {
      const numStr = String(startIndex + i + 1).padStart(6, '0');
      const id = `JOB-${numStr}`;
      // Giữ nguyên số lần gọi nextRand() như bản cũ để ngân sách / deadline / slots không đổi
      const skill = SKILL_TAGS[Math.floor(nextRand() * SKILL_TAGS.length)];
      const category = CATEGORY_OF_SKILL[skill];
      const titles = TITLES_BY_CATEGORY[category];
      const prefix = titles[Math.floor(nextRand() * titles.length)];
      const title = `${prefix} ${AUDIENCES[i % AUDIENCES.length]}`;
      const budget = Math.floor(nextRand() * 200 + 4) * 50; // $200 -> $10,000
      const rating = Number((3.0 + nextRand() * 2.0).toFixed(1)); // 3.0 -> 5.0
      const deadline = Math.floor(nextRand() * 30 + 1); // 1 -> 30 days
      const slots = Math.floor(nextRand() * 3 + 1); // 1 -> 3 slots

      jobs[i] = new JobPost({
        id,
        title,
        skillTag: skill,
        category,
        budget,
        clientRating: rating,
        clientReviews: Math.floor(Math.exp(nextRand2() * Math.log(800))), // 1 → 799, phân phối log (đa số ít đánh giá)
        deadlineDays: deadline,
        slots,
        hiredCount: 0,
        escrowBalance: budget
      });
    }

    return jobs;
  }
}
