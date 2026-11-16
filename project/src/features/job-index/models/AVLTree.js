import { TreeNode } from './TreeNode.js';

/**
 * AVLTree - Cây Tự Cân Bằng (Adelson-Velsky and Landis Tree) (Lab 4 - TASK-14)
 * Đặc tính:
 *   - Tuyệt đối duy trì Hệ số cân bằng |Balance Factor| <= 1 cho mọi Node.
 *   - Tự động kích hoạt 4 phép xoay (LL, RR, LR, RL) để kéo chiều cao về O(log n).
 *   - Khi nạp 100.000 bài đăng, chiều cao h <= 1.44 * log2(100.000) <= 17.
 *   - Độ phức tạp tìm kiếm, chèn, xóa luôn bảo đảm O(log n).
 */
export class AVLTree {
  constructor() {
    this.root = null;
    this._size = 0;

    /**
     * Bộ đếm thống kê 4 phép xoay phục vụ Giảng viên & Telemetry
     */
    this.rotationsCount = {
      LL: 0,
      RR: 0,
      LR: 0,
      RL: 0,
      total: 0
    };
  }

  /**
   * Lấy chiều cao của một node (O(1))
   * @private
   * @param {TreeNode|null} node
   * @returns {number}
   */
  _height(node) {
    return node ? node.height : 0;
  }

  /**
   * Tính hệ số cân bằng Balance Factor = Height(Left) - Height(Right)
   * @private
   * @param {TreeNode|null} node
   * @returns {number}
   */
  _getBalanceFactor(node) {
    if (!node) return 0;
    return this._height(node.left) - this._height(node.right);
  }

  /**
   * Cập nhật chiều cao của một node
   * @private
   * @param {TreeNode} node
   */
  _updateHeight(node) {
    node.height = 1 + Math.max(this._height(node.left), this._height(node.right));
  }

  // ===========================================================================
  // 4 PHÉP XOAY TÁI CÂN BẰNG KINH ĐIỂN CỦA CÂY AVL (LL, RR, LR, RL)
  // ===========================================================================

  /**
   * 1. PHÉP XOAY PHẢI ĐƠN (RIGHT ROTATION / LL ROTATION)
   * Kích hoạt khi cây bị lệch trái nặng (BF > 1) và node con trái lệch trái (BF >= 0).
   *
   *       y                               x
   *      / \     Xoay Phải (LL)          / \
   *     x   T3   -------------->        T1  y
   *    / \                                 / \
   *   T1  T2                              T2  T3
   *
   * @param {TreeNode} y
   * @returns {TreeNode} Node gốc mới x
   */
  rotateRight(y) {
    const x = y.left;
    const T2 = x.right;

    // Thực hiện xoay
    x.right = y;
    y.left = T2;

    // Cập nhật chiều cao (y trước, x sau)
    this._updateHeight(y);
    this._updateHeight(x);

    this.rotationsCount.LL++;
    this.rotationsCount.total++;

    return x;
  }

  /**
   * 2. PHÉP XOAY TRÁI ĐƠN (LEFT ROTATION / RR ROTATION)
   * Kích hoạt khi cây bị lệch phải nặng (BF < -1) và node con phải lệch phải (BF <= 0).
   *
   *     x                                   y
   *    / \       Xoay Trái (RR)            / \
   *   T1  y      ------------->           x   T3
   *      / \                             / \
   *     T2  T3                          T1  T2
   *
   * @param {TreeNode} x
   * @returns {TreeNode} Node gốc mới y
   */
  rotateLeft(x) {
    const y = x.right;
    const T2 = y.left;

    // Thực hiện xoay
    y.left = x;
    x.right = T2;

    // Cập nhật chiều cao (x trước, y sau)
    this._updateHeight(x);
    this._updateHeight(y);

    this.rotationsCount.RR++;
    this.rotationsCount.total++;

    return y;
  }

  /**
   * 3. PHÉP XOAY KÉP TRÁI - PHẢI (LEFT-RIGHT ROTATION / LR ROTATION)
   * Kích hoạt khi cây lệch trái nặng (BF > 1) nhưng node con trái lại lệch phải (BF < 0).
   * Bước 1: Xoay trái con trái (RR trên con trái)
   * Bước 2: Xoay phải node cha (LL trên cha)
   *
   * @param {TreeNode} z
   * @returns {TreeNode}
   */
  rotateLeftRight(z) {
    this.rotationsCount.LR++;
    this.rotationsCount.total++;

    z.left = this.rotateLeft(z.left);
    // Bù trừ số đếm phụ từ rotateLeft bên trong
    this.rotationsCount.RR--;
    this.rotationsCount.total--;

    const res = this.rotateRight(z);
    this.rotationsCount.LL--;
    this.rotationsCount.total--;

    return res;
  }

  /**
   * 4. PHÉP XOAY KÉP PHẢI - TRÁI (RIGHT-LEFT ROTATION / RL ROTATION)
   * Kích hoạt khi cây lệch phải nặng (BF < -1) nhưng node con phải lại lệch trái (BF > 0).
   * Bước 1: Xoay phải con phải (LL trên con phải)
   * Bước 2: Xoay trái node cha (RR trên cha)
   *
   * @param {TreeNode} z
   * @returns {TreeNode}
   */
  rotateRightLeft(z) {
    this.rotationsCount.RL++;
    this.rotationsCount.total++;

    z.right = this.rotateRight(z.right);
    // Bù trừ số đếm phụ từ rotateRight bên trong
    this.rotationsCount.LL--;
    this.rotationsCount.total--;

    const res = this.rotateLeft(z);
    this.rotationsCount.RR--;
    this.rotationsCount.total--;

    return res;
  }

  // ===========================================================================
  // NGHIỆP VỤ CHÈN VÀ TỰ CÂN BẰNG (INSERT O(log n))
  // ===========================================================================

  /**
   * Chèn khóa mới và tự động tái cân bằng cây
   * @param {number|string} key
   * @param {Object} jobRef
   * @returns {TreeNode}
   */
  insert(key, jobRef = null) {
    let inserted = false;

    const insertHelper = (node) => {
      // 1. Chèn thông thường như BST
      if (!node) {
        inserted = true;
        this._size++;
        return new TreeNode(key, jobRef);
      }

      if (key === node.key) {
        node.jobRef = jobRef; // Cập nhật tham chiếu
        return node;
      }

      if (key < node.key) {
        node.left = insertHelper(node.left);
      } else {
        node.right = insertHelper(node.right);
      }

      // 2. Cập nhật chiều cao của node cha hiện tại
      this._updateHeight(node);

      // 3. Tính hệ số cân bằng Balance Factor
      const balance = this._getBalanceFactor(node);

      // 4. Kích hoạt 1 trong 4 phép xoay nếu node bị mất cân bằng
      // TRƯỜNG HỢP 1: Lệch Trái - Trái (Left-Left -> Xoay phải LL)
      if (balance > 1 && key < node.left.key) {
        return this.rotateRight(node);
      }

      // TRƯỜNG HỢP 2: Lệch Phải - Phải (Right-Right -> Xoay trái RR)
      if (balance < -1 && key > node.right.key) {
        return this.rotateLeft(node);
      }

      // TRƯỜNG HỢP 3: Lệch Trái - Phải (Left-Right -> Xoay LR)
      if (balance > 1 && key > node.left.key) {
        return this.rotateLeftRight(node);
      }

      // TRƯỜNG HỢP 4: Lệch Phải - Trái (Right-Left -> Xoay RL)
      if (balance < -1 && key < node.right.key) {
        return this.rotateRightLeft(node);
      }

      return node;
    };

    this.root = insertHelper(this.root);
    return this.root;
  }

  // ===========================================================================
  // NGHIỆP VỤ TÌM KIẾM BẢO CHỨNG O(log n)
  // ===========================================================================

  /**
   * Tìm kiếm bài đăng theo khóa trong O(log n)
   * Tối đa 17 bước so sánh cho 100.000 bài đăng!
   *
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

  // ===========================================================================
  // NGHIỆP VỤ XÓA VÀ TỰ CÂN BẰNG (DELETE O(log n))
  // ===========================================================================

  /**
   * Xóa node theo key và tự cân bằng ngược lên root
   * @param {number|string} key
   * @returns {boolean} true nếu xóa thành công, false nếu không tìm thấy
   */
  delete(key) {
    let deleted = false;

    const deleteHelper = (node, k) => {
      if (!node) return null;

      if (k < node.key) {
        node.left = deleteHelper(node.left, k);
      } else if (k > node.key) {
        node.right = deleteHelper(node.right, k);
      } else {
        // Đã tìm thấy node cần xóa
        deleted = true;
        this._size--;

        // TH 1 & 2: Node có 0 con hoặc 1 con
        if (!node.left || !node.right) {
          const temp = node.left ? node.left : node.right;
          if (!temp) {
            // Node lá (0 con)
            node = null;
          } else {
            // Node có 1 con
            node = temp;
          }
        } else {
          // TH 3: Node có 2 con -> Tìm successor nhỏ nhất bên cây con phải
          let succ = node.right;
          while (succ.left) {
            succ = succ.left;
          }

          node.key = succ.key;
          node.jobRef = succ.jobRef;
          node.right = deleteHelper(node.right, succ.key);
        }
      }

      if (!node) return null;

      // Cập nhật chiều cao
      this._updateHeight(node);

      // Tái cân bằng
      const balance = this._getBalanceFactor(node);

      // LL
      if (balance > 1 && this._getBalanceFactor(node.left) >= 0) {
        return this.rotateRight(node);
      }

      // LR
      if (balance > 1 && this._getBalanceFactor(node.left) < 0) {
        return this.rotateLeftRight(node);
      }

      // RR
      if (balance < -1 && this._getBalanceFactor(node.right) <= 0) {
        return this.rotateLeft(node);
      }

      // RL
      if (balance < -1 && this._getBalanceFactor(node.right) > 0) {
        return this.rotateRightLeft(node);
      }

      return node;
    };

    this.root = deleteHelper(this.root, key);
    return deleted;
  }

  /**
   * Tìm kiếm các bài tuyển dụng trong khoảng ngân sách [minKey, maxKey]
   * @param {number} minKey
   * @param {number} maxKey
   * @returns {Array<Object>}
   */
  searchRange(minKey, maxKey) {
    const result = [];

    const traverse = (node) => {
      if (!node) return;

      if (node.key > minKey && node.left) {
        traverse(node.left);
      }

      if (node.key >= minKey && node.key <= maxKey) {
        if (node.jobRef) result.push(node.jobRef);
      }

      if (node.key < maxKey && node.right) {
        traverse(node.right);
      }
    };

    traverse(this.root);
    return result;
  }

  /**
   * Duyệt cây theo thứ tự tăng dần (In-order)
   * @returns {Array<{ key: number|string, jobRef: Object }>}
   */
  inOrder() {
    const result = [];
    const traverse = (node) => {
      if (!node) return;
      traverse(node.left);
      result.push({ key: node.key, jobRef: node.jobRef });
      traverse(node.right);
    };
    traverse(this.root);
    return result;
  }

  /**
   * Chiều cao thực tế hiện tại của cây AVL
   * @returns {number}
   */
  get height() {
    return this._height(this.root);
  }

  /**
   * Kích thước tổng số node trong cây
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
    this.rotationsCount = { LL: 0, RR: 0, LR: 0, RL: 0, total: 0 };
  }
}
