import { ProposalNode } from './ProposalNode.js';

/**
 * DoublyLinkedList - Danh sách liên kết đôi (Lab 2)
 * Cấu trúc cốt lõi quản lý danh mục hồ sơ ứng tuyển của từng dự án.
 * Mỗi Node sở hữu 2 con trỏ:
 *   - next: Trỏ tới hồ sơ phía sau
 *   - prev: Trỏ tới hồ sơ phía trước
 * Ưu điểm vượt trội: Xóa node tại vị trí bất kỳ (đầu, giữa, cuối) đạt O(1) khi giữ con trỏ node!
 */
export class DoublyLinkedList {
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
   * Lấy số lượng node hiện có trong danh sách
   * Độ phức tạp: O(1)
   */
  getSize() {
    return this.size;
  }

  /**
   * Chuẩn hóa đầu vào thành ProposalNode
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
   * Độ phức tạp: O(1)
   * @param {ProposalNode|Object} item
   * @returns {ProposalNode}
   */
  insertHead(item) {
    const node = this._normalizeNode(item);
    node.prev = null;

    if (this.isEmpty()) {
      node.next = null;
      this.head = node;
      this.tail = node;
    } else {
      node.next = this.head;
      this.head.prev = node;
      this.head = node;
    }

    this.size++;
    return node;
  }

  /**
   * Chèn hồ sơ vào đuôi danh sách (Insert at Tail)
   * Độ phức tạp: O(1)
   * @param {ProposalNode|Object} item
   * @returns {ProposalNode}
   */
  insertTail(item) {
    const node = this._normalizeNode(item);
    node.next = null;

    if (this.isEmpty()) {
      node.prev = null;
      this.head = node;
      this.tail = node;
    } else {
      node.prev = this.tail;
      this.tail.next = node;
      this.tail = node;
    }

    this.size++;
    return node;
  }

  /**
   * Chèn một hồ sơ mới vào ngay trước targetNode
   * Độ phức tạp: O(1)
   * @param {ProposalNode} targetNode
   * @param {ProposalNode|Object} item
   * @returns {ProposalNode}
   */
  insertBefore(targetNode, item) {
    if (!targetNode) throw new Error('DoublyLinkedList: targetNode không tồn tại');
    if (targetNode === this.head) return this.insertHead(item);

    const newNode = this._normalizeNode(item);
    newNode.prev = targetNode.prev;
    newNode.next = targetNode;

    if (targetNode.prev) {
      targetNode.prev.next = newNode;
    }
    targetNode.prev = newNode;

    this.size++;
    return newNode;
  }

  /**
   * Chèn một hồ sơ mới vào ngay sau targetNode
   * Độ phức tạp: O(1)
   * @param {ProposalNode} targetNode
   * @param {ProposalNode|Object} item
   * @returns {ProposalNode}
   */
  insertAfter(targetNode, item) {
    if (!targetNode) throw new Error('DoublyLinkedList: targetNode không tồn tại');
    if (targetNode === this.tail) return this.insertTail(item);

    const newNode = this._normalizeNode(item);
    newNode.next = targetNode.next;
    newNode.prev = targetNode;

    if (targetNode.next) {
      targetNode.next.prev = newNode;
    }
    targetNode.next = newNode;

    this.size++;
    return newNode;
  }

  /**
   * Xóa node ở đầu danh sách (Remove Head)
   * Độ phức tạp: O(1)
   * @returns {ProposalNode|null}
   */
  removeHead() {
    if (this.isEmpty()) return null;

    const removedNode = this.head;

    if (this.size === 1) {
      this.head = null;
      this.tail = null;
    } else {
      this.head = this.head.next;
      this.head.prev = null;
    }

    removedNode.next = null;
    removedNode.prev = null;
    this.size--;
    return removedNode;
  }

  /**
   * Xóa node ở đuôi danh sách (Remove Tail)
   * Vượt trội hơn SinglyLinkedList: Nhờ có con trỏ tail.prev, thao tác đạt O(1) tức thì!
   * Độ phức tạp: O(1)
   * @returns {ProposalNode|null}
   */
  removeTail() {
    if (this.isEmpty()) return null;

    const removedNode = this.tail;

    if (this.size === 1) {
      this.head = null;
      this.tail = null;
    } else {
      this.tail = this.tail.prev;
      this.tail.next = null;
    }

    removedNode.next = null;
    removedNode.prev = null;
    this.size--;
    return removedNode;
  }

  /**
   * Rút/Xóa một Node bất kỳ khỏi danh sách (Remove Node)
   * Đây là phương thức cốt lõi giải quyết bài toán "Rút hồ sơ ứng tuyển giữa chừng":
   * Chỉ mất O(1) khi ta nắm giữ trực tiếp con trỏ Node!
   *
   * Thuật toán:
   *   node.prev.next = node.next;
   *   node.next.prev = node.prev;
   *
   * Độ phức tạp: O(1)
   * @param {ProposalNode} node
   * @returns {boolean}
   */
  removeNode(node) {
    if (!node) return false;

    // Trường hợp là đầu danh sách
    if (node === this.head) {
      this.removeHead();
      return true;
    }

    // Trường hợp là cuối danh sách
    if (node === this.tail) {
      this.removeTail();
      return true;
    }

    // Trường hợp nằm ở giữa danh sách (Bắc cầu 2 con trỏ)
    if (node.prev) {
      node.prev.next = node.next;
    }
    if (node.next) {
      node.next.prev = node.prev;
    }

    node.next = null;
    node.prev = null;
    this.size--;
    return true;
  }

  /**
   * Tìm kiếm hồ sơ theo Proposal ID
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
   * Tìm kiếm hồ sơ theo Freelancer ID
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
   * Xóa hồ sơ theo ID
   * Độ phức tạp: O(n) tìm kiếm + O(1) xóa node = O(n)
   * @param {string} id
   * @returns {boolean}
   */
  removeById(id) {
    const node = this.findById(id);
    if (!node) return false;
    return this.removeNode(node);
  }

  /**
   * Xuất danh sách dạng mảng tuần tự từ Head đến Tail
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
   * Xuất danh sách dạng mảng đảo ngược từ Tail về Head
   * Độ phức tạp: O(n)
   * @returns {Array<ProposalNode>}
   */
  toArrayReverse() {
    const result = [];
    let current = this.tail;
    while (current) {
      result.push(current);
      current = current.prev;
    }
    return result;
  }

  /**
   * Xóa sạch danh sách, giải phóng toàn bộ con trỏ
   * Độ phức tạp: O(1)
   */
  clear() {
    this.head = null;
    this.tail = null;
    this.size = 0;
  }

  /**
   * Hỗ trợ duyệt vòng lặp for...of
   */
  *[Symbol.iterator]() {
    let current = this.head;
    while (current) {
      yield current;
      current = current.next;
    }
  }
}
