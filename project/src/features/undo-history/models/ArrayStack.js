/**
 * ArrayStack - Ngăn xếp cài đặt bằng Mảng có cơ chế kiểm soát dung lượng (Capacity Guard)
 * Hỗ trợ so sánh với LinkedStack trong các kịch bản thực nghiệm DSA.
 * Đạt O(1) Push/Pop và có cơ chế chống tràn ngăn xếp (Stack Overflow Protection).
 */
export class ArrayStack {
  /**
   * @param {number} [maxCapacity=1000] - Dung lượng tối đa của ngăn xếp
   */
  constructor(maxCapacity = 1000) {
    if (maxCapacity <= 0) {
      throw new Error('ArrayStack: Dung lượng maxCapacity phải lớn hơn 0');
    }
    this.maxCapacity = maxCapacity;
    this.items = [];
  }

  /**
   * Đẩy một phần tử vào đỉnh ngăn xếp (Push - O(1))
   * @param {Object} item
   * @returns {boolean} true nếu thành công, false nếu ngăn xếp đã đầy
   */
  push(item) {
    if (this.isFull()) {
      return false; // Chống tràn Stack
    }
    this.items.push(item);
    return true;
  }

  /**
   * Rút phần tử trên đỉnh ngăn xếp (Pop - O(1))
   * @returns {Object|null}
   */
  pop() {
    if (this.isEmpty()) {
      return null;
    }
    return this.items.pop();
  }

  /**
   * Xem phần tử trên đỉnh ngăn xếp (Peek - O(1))
   * @returns {Object|null}
   */
  peek() {
    if (this.isEmpty()) return null;
    return this.items[this.items.length - 1];
  }

  /**
   * Kiểm tra ngăn xếp có rỗng không (O(1))
   * @returns {boolean}
   */
  isEmpty() {
    return this.items.length === 0;
  }

  /**
   * Kiểm tra ngăn xếp đã đầy chưa (O(1))
   * @returns {boolean}
   */
  isFull() {
    return this.items.length >= this.maxCapacity;
  }

  /**
   * Kích thước hiện tại của ngăn xếp (O(1))
   * @returns {number}
   */
  get size() {
    return this.items.length;
  }

  /**
   * Xuất danh sách theo thứ tự LIFO (từ đỉnh xuống đáy)
   * @returns {Array}
   */
  toArray() {
    return [...this.items].reverse();
  }

  /**
   * Xóa sạch ngăn xếp
   */
  clear() {
    this.items = [];
  }
}
