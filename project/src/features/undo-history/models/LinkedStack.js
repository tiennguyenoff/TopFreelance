/**
 * LinkedStack - Ngăn xếp LIFO cài đặt bằng Danh sách liên kết đơn có con trỏ Top
 * Đạt độ phức tạp O(1) tuyệt đối cho cả Push và Pop:
 *   - Push: Chèn vào đỉnh (Top) trong O(1).
 *   - Pop: Rút từ đỉnh (Top) trong O(1).
 *   - Dung lượng co giãn linh hoạt theo nhu cầu thực tế, không lãng phí bộ nhớ RAM.
 */
export class LinkedStack {
  constructor() {
    this.top = null; // Node đỉnh ngăn xếp (hành động gần nhất)
    this._size = 0;
  }

  /**
   * Đẩy một phần tử vào đỉnh ngăn xếp (Push - O(1))
   * @param {Object} item - Node hành động cần lưu vết
   * @returns {number} Kích thước mới của ngăn xếp
   */
  push(item) {
    if (!item) {
      throw new Error('LinkedStack: Không thể push phần tử rỗng hoặc undefined');
    }

    item.next = this.top;
    this.top = item;
    this._size++;

    return this._size;
  }

  /**
   * Rút phần tử trên đỉnh ngăn xếp ra xử lý (Pop - O(1))
   * @returns {Object|null} Phần tử đỉnh ngăn xếp hoặc null nếu rỗng
   */
  pop() {
    if (this.isEmpty()) {
      return null;
    }

    const poppedItem = this.top;
    this.top = this.top.next;

    // Ngắt kết nối next để bộ thu gom rác V8 thu hồi bộ nhớ (tránh memory leak)
    poppedItem.next = null;
    this._size--;

    return poppedItem;
  }

  /**
   * Xem phần tử trên đỉnh ngăn xếp mà không rút ra (Peek - O(1))
   * @returns {Object|null}
   */
  peek() {
    return this.top;
  }

  /**
   * Kiểm tra ngăn xếp có rỗng hay không (O(1))
   * @returns {boolean}
   */
  isEmpty() {
    return this._size === 0 || this.top === null;
  }

  /**
   * Kích thước hiện tại của ngăn xếp (O(1))
   * @returns {number}
   */
  get size() {
    return this._size;
  }

  /**
   * Chuyển toàn bộ các phần tử trong ngăn xếp thành mảng (LIFO: từ đỉnh xuống đáy)
   * @returns {Array} Mảng các phần tử phục vụ hiển thị trên giao diện Vue
   */
  toArray() {
    const result = [];
    let curr = this.top;
    while (curr) {
      result.push(curr);
      curr = curr.next;
    }
    return result;
  }

  /** Gỡ ĐÚNG hành động gắn với vé `ticketId` khỏi ngăn xếp. O(n). */
  removeByTicketId(ticketId) {
    let prev = null;
    let curr = this.top;
    while (curr) {
      if (curr.ticketId === ticketId) {
        if (prev) prev.next = curr.next; else this.top = curr.next;
        curr.next = null;
        this._size--;
        return curr;
      }
      prev = curr;
      curr = curr.next;
    }
    return null;
  }

  /**
   * Xóa một phần tử bất kỳ trong ngăn xếp theo jobId (khi người dùng rút đơn thủ công)
   * @param {string} jobId
   * @returns {Object|null} Node đã bị xóa hoặc null
   */
  removeByJobId(jobId) {
    if (this.isEmpty()) return null;

    // Trường hợp node cần xóa ở đỉnh Stack
    if (this.top.jobId === jobId) {
      return this.pop();
    }

    let prev = this.top;
    let curr = this.top.next;

    while (curr) {
      if (curr.jobId === jobId) {
        prev.next = curr.next;
        curr.next = null;
        this._size--;
        return curr;
      }
      prev = curr;
      curr = curr.next;
    }

    return null;
  }

  /**
   * Xóa sạch toàn bộ ngăn xếp
   */
  clear() {
    let curr = this.top;
    while (curr) {
      const next = curr.next;
      curr.next = null;
      curr = next;
    }
    this.top = null;
    this._size = 0;
  }

  /**
   * Cho phép duyệt ngăn xếp bằng vòng lặp for...of
   */
  *[Symbol.iterator]() {
    let curr = this.top;
    while (curr) {
      yield curr;
      curr = curr.next;
    }
  }
}
