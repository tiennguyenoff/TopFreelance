/**
 * LinkedQueue - Hàng đợi FIFO cài đặt bằng Danh sách liên kết đơn có con trỏ Tail
 * Đạt độ phức tạp O(1) tuyệt đối cho cả Enqueue và Dequeue:
 *   - Enqueue: Chèn vào đuôi (Tail) trong O(1).
 *   - Dequeue: Rút từ đầu (Head) trong O(1).
 *   - Bộ nhớ cấp phát động theo nhu cầu thực tế, không bị giới hạn dung lượng cứng.
 */
export class LinkedQueue {
  constructor() {
    this.head = null; // Node đầu tiên (sẽ được Dequeue tiếp theo)
    this.tail = null; // Node cuối cùng (vừa được Enqueue vào)
    this._size = 0;
  }

  /**
   * Đưa một phần tử vào cuối hàng đợi (Enqueue - O(1))
   * @param {Object} item - Vé giải ngân hoặc node dữ liệu
   * @returns {number} Kích thước mới của hàng đợi
   */
  enqueue(item) {
    if (!item) {
      throw new Error('LinkedQueue: Không thể enqueue phần tử rỗng hoặc undefined');
    }

    // Đảm bảo con trỏ next ban đầu là null
    item.next = null;

    if (this.isEmpty()) {
      this.head = item;
      this.tail = item;
    } else {
      this.tail.next = item;
      this.tail = item;
    }

    this._size++;
    return this._size;
  }

  /**
   * Rút phần tử đứng đầu hàng đợi ra xử lý (Dequeue - O(1))
   * @returns {Object|null} Phần tử đứng đầu hoặc null nếu hàng đợi rỗng
   */
  dequeue() {
    if (this.isEmpty()) {
      return null;
    }

    const dequeuedItem = this.head;
    this.head = this.head.next;

    // Nếu sau khi dequeue hàng đợi rỗng, cập nhật tail về null
    if (!this.head) {
      this.tail = null;
    }

    // Ngắt con trỏ next của phần tử đã rút để giải phóng bộ nhớ (tránh memory leak)
    dequeuedItem.next = null;
    this._size--;

    return dequeuedItem;
  }

  /**
   * Xem phần tử đứng đầu hàng đợi mà không rút ra (Peek - O(1))
   * @returns {Object|null}
   */
  peek() {
    return this.head;
  }

  /**
   * Kiểm tra hàng đợi có rỗng hay không (O(1))
   * @returns {boolean}
   */
  isEmpty() {
    return this._size === 0 || this.head === null;
  }

  /**
   * Kích thước hiện tại của hàng đợi (O(1))
   * @returns {number}
   */
  get size() {
    return this._size;
  }

  /**
   * Chuyển toàn bộ các phần tử trong hàng đợi thành mảng (phục vụ render giao diện)
   * @returns {Array} Mảng các phần tử theo thứ tự FIFO từ Head đến Tail
   */
  toArray() {
    const result = [];
    let curr = this.head;
    while (curr) {
      result.push(curr);
      curr = curr.next;
    }
    return result;
  }

  /**
   * Gỡ ĐÚNG vé có mã `ticketId` (khác removeByJobId: không nhầm vé của việc nhiều slot). O(n).
   * @returns {Object|null}
   */
  removeByTicketId(ticketId) {
    let prev = null;
    let curr = this.head;
    while (curr) {
      if (curr.id === ticketId) {
        if (prev) prev.next = curr.next; else this.head = curr.next;
        if (curr === this.tail) this.tail = prev;
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
   * Xóa một phần tử trong hàng đợi theo jobId (khi ứng viên rút đơn)
   * @param {string} jobId
   * @returns {Object|null} Node đã bị xóa hoặc null
   */
  removeByJobId(jobId) {
    if (this.isEmpty()) return null;

    // Trường hợp node cần xóa ở Head
    if (this.head.jobId === jobId) {
      return this.dequeue();
    }

    let prev = this.head;
    let curr = this.head.next;

    while (curr) {
      if (curr.jobId === jobId) {
        prev.next = curr.next;
        if (curr === this.tail) {
          this.tail = prev;
        }
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
   * Xóa sạch toàn bộ hàng đợi
   */
  clear() {
    let curr = this.head;
    while (curr) {
      const next = curr.next;
      curr.next = null;
      curr = next;
    }
    this.head = null;
    this.tail = null;
    this._size = 0;
  }

  /**
   * Cho phép duyệt hàng đợi bằng vòng lặp for...of
   */
  *[Symbol.iterator]() {
    let curr = this.head;
    while (curr) {
      yield curr;
      curr = curr.next;
    }
  }
}
