import { TreeNode } from './TreeNode.js';

/**
 * BinarySearchTree (BST) - Cây Nhị Phân Tìm Kiếm (Lab 4 - TASK-13)
 * Đặc tính:
 *   - Mọi node bên cây con trái đều có key < node.key
 *   - Mọi node bên cây con phải đều có key > node.key
 *   - Độ phức tạp thời gian: O(h) với h là chiều cao của cây.
 *   - Cài đặt bằng vòng lặp (iterative) để chống tràn Call Stack khi dữ liệu bị suy biến.
 */
export class BinarySearchTree {
  constructor() {
    this.root = null;
    this._size = 0;
  }

  /**
   * 1. CHÈN MỘT NODE MỚI VÀO CÂY BST (O(h))
   * Sử dụng vòng lặp iterative để chống RangeError khi nạp ID tăng dần.
   *
   * @param {number|string} key
   * @param {Object} jobRef
   * @returns {TreeNode}
   */
  insert(key, jobRef = null) {
    const newNode = new TreeNode(key, jobRef);

    if (!this.root) {
      this.root = newNode;
      this._size++;
      return newNode;
    }

    let curr = this.root;
    while (true) {
      if (key === curr.key) {
        // Khóa đã tồn tại: cập nhật con trỏ jobRef
        curr.jobRef = jobRef;
        return curr;
      }

      if (key < curr.key) {
        if (!curr.left) {
          curr.left = newNode;
          this._size++;
          break;
        }
        curr = curr.left;
      } else {
        if (!curr.right) {
          curr.right = newNode;
          this._size++;
          break;
        }
        curr = curr.right;
      }
    }

    return newNode;
  }

  /**
   * 2. TÌM KIẾM NODE THEO KEY TRONG BST (O(h))
   * @param {number|string} key
   * @returns {{ node: TreeNode|null, steps: number, found: boolean }}
   */
  search(key) {
    let curr = this.root;
    let steps = 0;

    while (curr) {
      steps++;
      if (key === curr.key) {
        return { node: curr, steps, found: true };
      }
      if (key < curr.key) {
        curr = curr.left;
      } else {
        curr = curr.right;
      }
    }

    return { node: null, steps, found: false };
  }

  /**
   * 3. XÓA MỘT NODE KHỎI BST (HỖ TRỢ ĐẦY ĐỦ 3 TRƯỜNG HỢP)
   *   - Trường hợp 1: Node lá (không có con).
   *   - Trường hợp 2: Node có đúng 1 con (trái hoặc phải).
   *   - Trường hợp 3: Node có 2 con (tìm In-order Successor để thay thế).
   *
   * @param {number|string} key
   * @returns {boolean} true nếu xóa thành công, false nếu không tìm thấy key
   */
  delete(key) {
    let parent = null;
    let curr = this.root;

    // Bước 1: Tìm node cần xóa và node cha của nó
    while (curr && curr.key !== key) {
      parent = curr;
      if (key < curr.key) {
        curr = curr.left;
      } else {
        curr = curr.right;
      }
    }

    if (!curr) {
      return false; // Không tìm thấy key cần xóa
    }

    // Bước 2: Xử lý 3 trường hợp xóa
    // TRƯỜNG HỢP 3: Node có đủ 2 con
    if (curr.left && curr.right) {
      // Tìm In-order Successor (node nhỏ nhất bên cây con phải)
      let succParent = curr;
      let succ = curr.right;
      while (succ.left) {
        succParent = succ;
        succ = succ.left;
      }

      // Sao chép key và jobRef của successor vào curr
      curr.key = succ.key;
      curr.jobRef = succ.jobRef;

      // Chuyển bài toán thành xóa successor (successor chắc chắn có tối đa 1 con phải)
      curr = succ;
      parent = succParent;
    }

    // TRƯỜNG HỢP 1 & 2: Node có 0 con hoặc 1 con
    const child = curr.left ? curr.left : curr.right;

    if (!parent) {
      // Node cần xóa là root
      this.root = child;
    } else if (parent.left === curr) {
      parent.left = child;
    } else {
      parent.right = child;
    }

    // Giải phóng con trỏ
    curr.left = null;
    curr.right = null;
    curr.jobRef = null;
    this._size--;

    return true;
  }

  /**
   * 4. DUYỆT TRUNG THỨ TỰ (IN-ORDER TRAVERSAL: LEFT -> ROOT -> RIGHT)
   * Đối với BST, phép duyệt này luôn trả về danh sách các khóa tăng dần!
   * @returns {Array<{ key: number|string, jobRef: Object }>}
   */
  inOrder() {
    const result = [];
    const stack = [];
    let curr = this.root;

    while (curr || stack.length > 0) {
      while (curr) {
        stack.push(curr);
        curr = curr.left;
      }
      curr = stack.pop();
      result.push({ key: curr.key, jobRef: curr.jobRef });
      curr = curr.right;
    }

    return result;
  }

  /**
   * 5. DUYỆT TIỀN THỨ TỰ (PRE-ORDER TRAVERSAL: ROOT -> LEFT -> RIGHT)
   * @returns {Array<{ key: number|string, jobRef: Object }>}
   */
  preOrder() {
    if (!this.root) return [];
    const result = [];
    const stack = [this.root];

    while (stack.length > 0) {
      const curr = stack.pop();
      result.push({ key: curr.key, jobRef: curr.jobRef });
      if (curr.right) stack.push(curr.right);
      if (curr.left) stack.push(curr.left);
    }

    return result;
  }

  /**
   * 6. DUYỆT HẬU THỨ TỰ (POST-ORDER TRAVERSAL: LEFT -> RIGHT -> ROOT)
   * @returns {Array<{ key: number|string, jobRef: Object }>}
   */
  postOrder() {
    if (!this.root) return [];
    const result = [];
    const s1 = [this.root];
    const s2 = [];

    while (s1.length > 0) {
      const curr = s1.pop();
      s2.push(curr);
      if (curr.left) s1.push(curr.left);
      if (curr.right) s1.push(curr.right);
    }

    while (s2.length > 0) {
      const curr = s2.pop();
      result.push({ key: curr.key, jobRef: curr.jobRef });
    }

    return result;
  }

  /**
   * Tính chiều cao của cây BST (độ dài đường đi dài nhất từ root đến lá)
   * @returns {number}
   */
  getHeight() {
    if (!this.root) return 0;

    let height = 0;
    const queue = [this.root];

    while (queue.length > 0) {
      const levelSize = queue.length;
      for (let i = 0; i < levelSize; i++) {
        const curr = queue.shift();
        if (curr.left) queue.push(curr.left);
        if (curr.right) queue.push(curr.right);
      }
      height++;
    }

    return height;
  }

  /**
   * Kích thước tổng số node của cây
   * @returns {number}
   */
  get size() {
    return this._size;
  }

  /**
   * Kiểm tra cây rỗng
   * @returns {boolean}
   */
  isEmpty() {
    return this._size === 0 || this.root === null;
  }

  /**
   * Xóa sạch toàn bộ cây
   */
  clear() {
    this.root = null;
    this._size = 0;
  }

  // -------------------------------------------------------------------------
  // PHIÊN BẢN ĐỆ QUY (RECURSIVE) - theo yêu cầu đề: Insert, Delete, Pre/In/Post-order.
  // Độ sâu đệ quy = chiều cao cây h: an toàn khi cây cân bằng (AVL, h ≈ 17 với 100.000 nút),
  // nhưng BST suy biến (h = n) sẽ gây RangeError: Maximum call stack size exceeded,
  // nên các bản vòng lặp ở trên vẫn được giữ để dùng cho dữ liệu khóa tăng dần.
  // -------------------------------------------------------------------------

  /** Chèn đệ quy O(h). */
  insertRecursive(key, jobRef = null) {
    const insertAt = (node) => {
      if (!node) {
        this._size++;
        return new TreeNode(key, jobRef);
      }
      if (key === node.key) node.jobRef = jobRef;
      else if (key < node.key) node.left = insertAt(node.left);
      else node.right = insertAt(node.right);
      return node;
    };
    this.root = insertAt(this.root);
    return this;
  }

  /** Xóa đệ quy O(h), đủ 3 trường hợp (lá, 1 con, 2 con - thay bằng In-order Successor). */
  deleteRecursive(key) {
    let removed = false;
    const deleteAt = (node, k) => {
      if (!node) return null;
      if (k < node.key) node.left = deleteAt(node.left, k);
      else if (k > node.key) node.right = deleteAt(node.right, k);
      else {
        if (!node.left || !node.right) {
          removed = true;
          return node.left || node.right;
        }
        let succ = node.right;
        while (succ.left) succ = succ.left;
        node.key = succ.key;
        node.jobRef = succ.jobRef;
        node.right = deleteAt(node.right, succ.key);
      }
      return node;
    };
    this.root = deleteAt(this.root, key);
    if (removed) this._size--;
    return removed;
  }

  /** Duyệt tiền thứ tự đệ quy: Root -> Left -> Right. */
  preOrderRecursive(node = this.root, out = []) {
    if (!node) return out;
    out.push({ key: node.key, jobRef: node.jobRef });
    this.preOrderRecursive(node.left, out);
    this.preOrderRecursive(node.right, out);
    return out;
  }

  /** Duyệt trung thứ tự đệ quy: Left -> Root -> Right (khóa tăng dần). */
  inOrderRecursive(node = this.root, out = []) {
    if (!node) return out;
    this.inOrderRecursive(node.left, out);
    out.push({ key: node.key, jobRef: node.jobRef });
    this.inOrderRecursive(node.right, out);
    return out;
  }

  /** Duyệt hậu thứ tự đệ quy: Left -> Right -> Root. */
  postOrderRecursive(node = this.root, out = []) {
    if (!node) return out;
    this.postOrderRecursive(node.left, out);
    this.postOrderRecursive(node.right, out);
    out.push({ key: node.key, jobRef: node.jobRef });
    return out;
  }
}
