/**
 * MinHeap — Đống nhỏ nhất (mảng nhị phân) dùng cho bài toán Top-K
 *
 * Ý tưởng giống bảng "Bán chạy nhất" (Amazon) / "Top Rated" (Upwork): muốn lấy K phần tử lớn nhất
 * trong n phần tử mà KHÔNG phải sắp xếp cả n.
 *  - Giữ một min-heap đúng K phần tử. Gốc heap = phần tử NHỎ NHẤT trong nhóm Top-K hiện tại.
 *  - Duyệt từng việc: nếu ngân sách ≤ gốc → loại ngay O(1). Nếu lớn hơn → thay gốc rồi sift-down O(log K).
 *  - Tổng chi phí O(n log K); với K = 10 thì log K ≈ 3.3, nhanh hơn sắp xếp toàn bộ O(n log n).
 *
 * Heap chỉ chứa CON TRỎ tới JobPost gốc (Single Source of Truth).
 */
export class MinHeap {
  constructor(keyFn = (x) => x) {
    this.keyFn = keyFn;
    this.data = [];
    this.comparisons = 0;
    this.swaps = 0;
  }

  get size() { return this.data.length; }
  peek() { return this.data[0]; }

  _less(i, j) {
    this.comparisons++;
    return this.keyFn(this.data[i]) < this.keyFn(this.data[j]);
  }

  _swap(i, j) {
    this.swaps++;
    const t = this.data[i];
    this.data[i] = this.data[j];
    this.data[j] = t;
  }

  /** Thêm phần tử rồi sift-up. O(log n). Trả về dãy chỉ số đã đi qua. */
  push(item) {
    this.data.push(item);
    let i = this.data.length - 1;
    const path = [i];
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (!this._less(i, parent)) break;
      this._swap(i, parent);
      i = parent;
      path.push(i);
    }
    return path;
  }

  /** Thay gốc bằng phần tử mới rồi sift-down. O(log n). */
  replaceTop(item) {
    const removed = this.data[0];
    this.data[0] = item;
    const path = this._siftDown(0);
    return { removed, path };
  }

  pop() {
    if (!this.data.length) return undefined;
    const top = this.data[0];
    const last = this.data.pop();
    if (this.data.length) {
      this.data[0] = last;
      this._siftDown(0);
    }
    return top;
  }

  _siftDown(i) {
    const n = this.data.length;
    const path = [i];
    while (true) {
      const l = 2 * i + 1;
      const r = l + 1;
      let m = i;
      if (l < n && this._less(l, m)) m = l;
      if (r < n && this._less(r, m)) m = r;
      if (m === i) break;
      this._swap(i, m);
      i = m;
      path.push(i);
    }
    return path;
  }

  /**
   * Lấy K phần tử có key lớn nhất trong `items`.
   *  - top: đã xếp giảm dần theo key
   *  - heapArray: mảng heap (gốc = nhỏ nhất trong Top-K) trước khi rút ra
   *  - lastReplace: ảnh chụp heap ngay trước & sau lần thay gốc gần nhất (để vẽ sift-down)
   */
  static topK(items, k, keyFn) {
    const heap = new MinHeap(keyFn);
    let pushes = 0, replaces = 0, rejects = 0;
    let lastReplace = null;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (heap.size < k) {
        heap.push(it);
        pushes++;
        continue;
      }
      heap.comparisons++;
      if (keyFn(it) <= keyFn(heap.data[0])) { rejects++; continue; } // loại O(1)
      const before = heap.data.slice();
      const { removed, path } = heap.replaceTop(it);
      replaces++;
      lastReplace = { index: i, before, incoming: it, removed, path, after: heap.data.slice() };
    }
    const heapArray = heap.data.slice();
    const top = [];
    while (heap.size) top.push(heap.pop()); // O(K log K), ra theo thứ tự tăng dần
    top.reverse();
    return { top, heapArray, comparisons: heap.comparisons, swaps: heap.swaps, pushes, replaces, rejects, lastReplace };
  }
}
