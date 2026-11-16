/**
 * BayesianRanker — Điểm uy tín "thực" theo trung bình Bayes (Bayesian Average)
 *
 * Vấn đề: 1 khách hàng có 1 đánh giá 5.0★ không đáng tin bằng khách có 500 đánh giá 4.8★,
 * nhưng sắp xếp theo điểm thô lại đặt người 5.0★ lên trước.
 * Cách Amazon / IMDb / Tiki giải quyết: "kéo" điểm về trung bình toàn sàn C theo số đánh giá v:
 *
 *        score = (v · R + m · C) / (v + m)
 *
 *  - R: điểm thô, v: số đánh giá, C: điểm trung bình của toàn sàn, m: "số đánh giá ảo" (độ tin trước).
 *  - v nhỏ → score ≈ C (chưa đủ bằng chứng); v lớn → score ≈ R.
 * Tính C một lần O(n); mỗi điểm O(1); sắp xếp O(n log n) bằng MergeSort (ổn định).
 */
export class BayesianRanker {
  constructor(m = 20) {
    this.m = m;
    this.C = 4.0;
    this.n = 0;
    this.prepared = false;
  }

  /** Tính điểm trung bình toàn sàn C. O(n). Chỉ đọc mảng gốc, không sao chép. */
  prepare(jobs) {
    let sum = 0;
    let cnt = 0;
    for (let i = 0; i < jobs.length; i++) {
      const r = Number(jobs[i].clientRating);
      if (Number.isFinite(r) && r > 0) { sum += r; cnt++; }
    }
    this.C = cnt ? sum / cnt : 4.0;
    this.n = cnt;
    this.prepared = true;
    return this;
  }

  static score(R, v, C, m) {
    return (v * R + m * C) / (v + m);
  }

  scoreOf(job) {
    return BayesianRanker.score(Number(job.clientRating) || 0, Number(job.clientReviews) || 0, this.C, this.m);
  }

  /** Comparator giảm dần theo điểm Bayes; hòa thì ai nhiều đánh giá hơn đứng trước. */
  comparator() {
    return (a, b) => (this.scoreOf(b) - this.scoreOf(a)) || ((b.clientReviews || 0) - (a.clientReviews || 0));
  }

  /** Thứ hạng theo điểm thô (đối chứng): rating giảm dần, hòa thì giữ thứ tự gốc. */
  static rawComparator() {
    return (a, b) => (b.clientRating || 0) - (a.clientRating || 0);
  }
}
