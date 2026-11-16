/**
 * TreeNode - Node đại diện cho một đỉnh trong Cây Nhị Phân Tìm Kiếm BST & Cây Tự Cân Bằng AVL (Lab 4)
 * Tuân thủ nghiêm ngặt nguyên lý Single Source of Truth:
 *   - Chỉ lưu trữ con trỏ jobRef trỏ về đối tượng JobPost gốc trong RAM.
 *   - Không clone hoặc copy đối tượng dữ liệu.
 */
export class TreeNode {
  /**
   * @param {number|string} key - Khóa tìm kiếm (ví dụ: số thứ tự ID, hoặc budget)
   * @param {Object} jobRef     - Con trỏ tham chiếu tới đối tượng JobPost gốc
   */
  constructor(key, jobRef = null) {
    if (key === undefined || key === null) {
      throw new Error('TreeNode: key không được undefined hoặc null');
    }

    this.key = key;
    this.jobRef = jobRef; // Single Source of Truth

    // Con trỏ cây con (Tree Pointers)
    this.left = null;  // Cây con trái (chứa các khóa nhỏ hơn)
    this.right = null; // Cây con phải (chứa các khóa lớn hơn)

    // Chiều cao của node (Height) phục vụ tính toán Hệ số cân bằng Balance Factor trong Cây AVL
    this.height = 1;
  }

  /**
   * Cập nhật lại chiều cao của node dựa trên 2 cây con
   */
  updateHeight() {
    const leftHeight = this.left ? this.left.height : 0;
    const rightHeight = this.right ? this.right.height : 0;
    this.height = 1 + Math.max(leftHeight, rightHeight);
  }

  /**
   * Lấy hệ số cân bằng Balance Factor = Height(Left) - Height(Right)
   * @returns {number}
   */
  getBalanceFactor() {
    const leftHeight = this.left ? this.left.height : 0;
    const rightHeight = this.right ? this.right.height : 0;
    return leftHeight - rightHeight;
  }
}
