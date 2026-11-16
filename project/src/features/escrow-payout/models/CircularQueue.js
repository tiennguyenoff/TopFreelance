/**
 * CircularQueue - Hàng đợi vòng mảng (Circular Array Queue / Ring Buffer)
 * Cài đặt Queue bằng mảng tĩnh có kích thước cố định, sử dụng phép chia lấy dư modulo.
 * Đạt O(1) cho cả Enqueue và Dequeue mà không cần cấp phát thêm Node liên kết.
 */
export class CircularQueue {
  /**
   * @param {number} [capacity=1000] - Sức chứa tối đa của hàng đợi vòng
   */
  constructor(capacity = 1000) {
    if (capacity <= 0) {
      throw new Error('CircularQueue: Dung lượng capacity phải lớn hơn 0');
    }
    this.capacity = capacity;
    this.buffer = new Array(capacity);
    this.front = 0; // Vị trí phần tử đầu hàng đợi (chuẩn bị Dequeue)
    this.rear = -1; // Vị trí phần tử cuối hàng đợi (vừa được Enqueue)
    this._size = 0;
  }

  /**
   * Đưa phần tử vào hàng đợi vòng (Enqueue - O(1))
   * @param {Object} item
   * @returns {boolean} true nếu thành công, false nếu hàng đợi đã đầy
   */
  enqueue(item) {
    if (this.isFull()) {
      return false; // Hàng đợi đã đầy
    }

    this.rear = (this.rear + 1) % this.capacity;
    this.buffer[this.rear] = item;
    this._size++;
    return true;
  }

  /**
   * Lấy phần tử ra khỏi hàng đợi vòng (Dequeue - O(1))
   * @returns {Object|null}
   */
  dequeue() {
    if (this.isEmpty()) {
      return null;
    }

    const item = this.buffer[this.front];
    this.buffer[this.front] = null; // Dọn rác
    this.front = (this.front + 1) % this.capacity;
    this._size--;
    return item;
  }

  /**
   * Xem phần tử đầu hàng đợi vòng (Peek - O(1))
   * @returns {Object|null}
   */
  peek() {
    if (this.isEmpty()) return null;
    return this.buffer[this.front];
  }

  /**
   * Kiểm tra hàng đợi có rỗng hay không (O(1))
   * @returns {boolean}
   */
  isEmpty() {
    return this._size === 0;
  }

  /**
   * Kiểm tra hàng đợi có đầy hay không (O(1))
   * @returns {boolean}
   */
  isFull() {
    return this._size === this.capacity;
  }

  /**
   * Kích thước hiện tại (O(1))
   * @returns {number}
   */
  get size() {
    return this._size;
  }

  /**
   * Chuyển các phần tử thành mảng theo thứ tự FIFO
   * @returns {Array}
   */
  toArray() {
    const result = [];
    for (let i = 0; i < this._size; i++) {
      const idx = (this.front + i) % this.capacity;
      result.push(this.buffer[idx]);
    }
    return result;
  }

  /**
   * Xóa sạch hàng đợi vòng
   */
  clear() {
    this.buffer.fill(null);
    this.front = 0;
    this.rear = -1;
    this._size = 0;
  }
}
