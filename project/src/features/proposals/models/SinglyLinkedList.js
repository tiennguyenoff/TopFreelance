import { ProposalNode } from './ProposalNode.js';

/**
 * SinglyLinkedList - Danh sách liên kết đơn (Lab 2)
 * Ứng dụng: Quản lý danh sách hồ sơ ứng tuyển theo luồng First-In First-Out hoặc Last-In First-Out cơ bản.
 * Mỗi Node chỉ chứa 1 con trỏ next trỏ tới phần tử tiếp theo.
 */
export class SinglyLinkedList {
  constructor() {
    this.head = null;
    this.tail = null;
    this.size = 0;
  }

  /**
   * Kiểm tra danh sách có rỗng không
   * Độ phức tạp: O(1)
   */
  isEmpty() {
    return this.size === 0 || this.head === null;
  }

  /**
   * Lấy số lượng node hiện có
   * Độ phức tạp: O(1)
   */
  getSize() {
    return this.size;
  }

  /**
   * Chuẩn hóa đầu vào thành một thực thể ProposalNode
   * @private
   */
  _normalizeNode(nodeOrData) {
    if (nodeOrData instanceof ProposalNode) {
      return nodeOrData;
    }
    return new ProposalNode(nodeOrData);
  }

  /**
   * Chèn hồ sơ vào đầu danh sách (Insert at Head)
   * Trường hợp ứng dụng: Hồ sơ mới nộp đưa lên đầu danh sách để ưu tiên hiển thị.
   * Độ phức tạp: O(1)
   * @param {ProposalNode|Object} item
   * @returns {ProposalNode}
   */
  insertHead(item) {
    const node = this._normalizeNode(item);
    node.prev = null;

    if (this.isEmpty()) {
      this.head = node;
      this.tail = node;
    } else {
      node.next = this.head;
      this.head = node;
    }

    this.size++;
    return node;
  }

  /**
   * Chèn hồ sơ vào đuôi danh sách (Insert at Tail)
   * Trường hợp ứng dụng: Xếp hồ sơ theo thứ tự nộp trước - sau.
   * Nhờ có con trỏ tail, thao tác đạt O(1) thay vì O(n) như duyệt thông thường.
   * Độ phức tạp: O(1)
   * @param {ProposalNode|Object} item
   * @returns {ProposalNode}
   */
  insertTail(item) {
    const node = this._normalizeNode(item);
    node.next = null;
    node.prev = null;

    if (this.isEmpty()) {
      this.head = node;
      this.tail = node;
    } else {
      this.tail.next = node;
      this.tail = node;
    }

    this.size++;
    return node;
  }

  /**
   * Xóa và lấy ra phần tử ở đầu danh sách (Remove Head)
   * Độ phức tạp: O(1)
   * @returns {ProposalNode|null}
   */
  removeHead() {
    if (this.isEmpty()) return null;

    const removedNode = this.head;
    this.head = this.head.next;
    removedNode.next = null;
    this.size--;

    if (this.size === 0) {
      this.tail = null;
    }

    return removedNode;
  }

  /**
   * Xóa phần tử ở đuôi danh sách (Remove Tail)
   * Lưu ý trong DSLK đơn: Vì không có con trỏ prev, ta bắt buộc phải duyệt từ head
   * để tìm node liền kề trước tail (second-to-last node).
   * Độ phức tạp: O(n)
   * @returns {ProposalNode|null}
   */
  removeTail() {
    if (this.isEmpty()) return null;

    if (this.size === 1) {
      const removedNode = this.head;
      this.head = null;
      this.tail = null;
      this.size = 0;
      return removedNode;
    }

    // Duyệt tìm node áp chót
    let current = this.head;
    while (current.next && current.next !== this.tail) {
      current = current.next;
    }

    const removedNode = this.tail;
    current.next = null;
    this.tail = current;
    this.size--;

    return removedNode;
  }

  /**
   * Tìm hồ sơ theo Proposal ID
   * Độ phức tạp: O(n)
   * @param {string} id
   * @returns {ProposalNode|null}
   */
  findById(id) {
    let current = this.head;
    while (current) {
      if (current.id === id) return current;
      current = current.next;
    }
    return null;
  }

  /**
   * Tìm hồ sơ theo ID ứng viên (Freelancer ID)
   * Độ phức tạp: O(n)
   * @param {string} freelancerId
   * @returns {ProposalNode|null}
   */
  findByFreelancerId(freelancerId) {
    let current = this.head;
    while (current) {
      if (current.freelancerId === freelancerId) return current;
      current = current.next;
    }
    return null;
  }

  /**
   * Xóa một hồ sơ theo Proposal ID
   * Độ phức tạp: O(n)
   * @param {string} id
   * @returns {boolean}
   */
  removeById(id) {
    if (this.isEmpty()) return false;

    // Xóa ngay đầu nếu trùng
    if (this.head.id === id) {
      this.removeHead();
      return true;
    }

    let prev = this.head;
    let current = this.head.next;

    while (current) {
      if (current.id === id) {
        prev.next = current.next;
        if (current === this.tail) {
          this.tail = prev;
        }
        current.next = null;
        this.size--;
        return true;
      }
      prev = current;
      current = current.next;
    }

    return false;
  }

  /**
   * Chuyển danh sách liên kết thành mảng Array thông thường
   * Độ phức tạp: O(n)
   * @returns {Array<ProposalNode>}
   */
  toArray() {
    const result = [];
    let current = this.head;
    while (current) {
      result.push(current);
      current = current.next;
    }
    return result;
  }

  /**
   * Xóa toàn bộ danh sách, giải phóng con trỏ
   * Độ phức tạp: O(1)
   */
  clear() {
    this.head = null;
    this.tail = null;
    this.size = 0;
  }

  /**
   * Hỗ trợ duyệt for...of
   */
  *[Symbol.iterator]() {
    let current = this.head;
    while (current) {
      yield current;
      current = current.next;
    }
  }
}
