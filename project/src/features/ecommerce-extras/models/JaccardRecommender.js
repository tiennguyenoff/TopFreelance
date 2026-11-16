/**
 * JaccardRecommender — "Việc tương tự" bằng độ tương đồng Jaccard
 *
 * Giống "Sản phẩm tương tự" của Shopee / "Khách hàng cũng xem" của Amazon:
 *  - Mỗi việc được mô tả bằng một TẬP đặc trưng: kỹ năng, dải ngân sách, độ gấp của hạn chót,
 *    số vị trí và các từ khóa trong tiêu đề.
 *  - J(A, B) = |A ∩ B| / |A ∪ B|  (0 = không giống gì, 1 = giống hệt).
 * Không so với cả 100.000 việc: lấy ứng viên từ ĐÚNG ô Bảng băm kỹ năng (O(1) trung bình),
 * rồi chỉ so m việc cùng kỹ năng → O(m · f) với f ≈ 10 đặc trưng; chọn Top-5 bằng Min-Heap.
 */
import { Trie } from './Trie.js';
import { MinHeap } from './MinHeap.js';

export class JaccardRecommender {
  /** Tập đặc trưng của một việc (chuỗi dễ đọc để hiện thẳng lên canvas). */
  static features(job) {
    const f = new Set();
    const skill = String(job.skillTag || '').toLowerCase();
    f.add(`#${skill}`);
    const lo = Math.floor((Number(job.budget) || 0) / 2000) * 2;
    f.add(`$${lo}-${lo + 2}k`);
    const d = Number(job.deadlineDays) || 0;
    f.add(d <= 7 ? 'hạn ≤7d' : d <= 14 ? 'hạn 8-14d' : 'hạn >14d');
    f.add(`${job.slots || 1} slot`);
    for (const w of Trie.tokenize(job.title)) {
      if (w !== skill) f.add(w);
    }
    return f;
  }

  static jaccard(A, B) {
    let inter = 0;
    const [small, big] = A.size <= B.size ? [A, B] : [B, A];
    for (const x of small) if (big.has(x)) inter++;
    const union = A.size + B.size - inter;
    return { inter, union, score: union ? inter / union : 0 };
  }

  /**
   * @param {object} target - việc đang xem
   * @param {Array} candidates - mảng CON TRỎ cùng kỹ năng (lấy từ bảng băm)
   * @param {number} k
   */
  static similar(target, candidates, k = 5) {
    const A = JaccardRecommender.features(target);
    const tb = Number(target.budget) || 0;
    const scored = [];
    let comparisons = 0;
    for (let i = 0; i < candidates.length; i++) {
      const job = candidates[i];
      if (!job || job.id === target.id) continue;
      const B = JaccardRecommender.features(job);
      const r = JaccardRecommender.jaccard(A, B);
      comparisons++;
      // hòa điểm Jaccard → ưu tiên ngân sách gần hơn (phần lẻ rất nhỏ, không đổi thứ tự điểm chính)
      scored.push({ job, score: r.score, inter: r.inter, union: r.union, key: r.score - Math.abs((Number(job.budget) || 0) - tb) / 1e8 });
    }
    const res = MinHeap.topK(scored, k, (x) => x.key);
    return { A, top: res.top, comparisons, heapComparisons: res.comparisons };
  }
}
