/**
 * MoveToFrontHistory.js
 * Hiện thực Danh Sách Tự Tổ Chức (Self-Organizing List) cơ chế Move-to-Front (MTF):
 * - Quản lý lịch sử tìm kiếm các từ khóa kỹ năng của người dùng
 * - Mỗi khi một từ khóa được tìm kiếm, nó được đẩy ngay lên đầu danh sách (vị trí 0)
 * - Tận dụng nguyên lý Zipf / 80-20: 20% từ khóa hot nhất luôn ở đầu, giảm > 50% số phép duyệt
 * - Dung lượng bộ nhớ siêu nhẹ: < 1KB RAM Cache
 */

export class MoveToFrontHistory {
  /**
   * @param {number} [maxCapacity=15] - Số lượng từ khóa tối đa lưu giữ trong bộ nhớ cache
   */
  constructor(maxCapacity = 15) {
    this.maxCapacity = Math.max(1, maxCapacity);
    this.items = []; // Mảng danh sách tự tổ chức
    this.totalAccesses = 0;
    this.hitCount = 0;
    this.totalSteps = 0;
  }

  /**
   * Truy cập hoặc tìm kiếm một từ khóa
   * Tự động kích hoạt cơ chế Move-to-Front
   * @param {string} keyword - Từ khóa kỹ năng (ví dụ: 'react')
   * @returns {{ keyword: string, isHit: boolean, positionFound: number, steps: number, history: Array<string> }}
   */
  access(keyword) {
    if (!keyword || typeof keyword !== 'string') {
      return { keyword: '', isHit: false, positionFound: -1, steps: 0, history: this.getHistory() };
    }

    const key = keyword.toLowerCase().trim();
    this.totalAccesses++;

    let foundIndex = -1;
    let steps = 0;

    // Duyệt tuyến tính tìm từ khóa trong danh sách
    for (let i = 0; i < this.items.length; i++) {
      steps++;
      if (this.items[i] === key) {
        foundIndex = i;
        break;
      }
    }

    this.totalSteps += steps || 1;

    if (foundIndex !== -1) {
      // HIT: Tìm thấy từ khóa trong lịch sử -> Rút ra và đưa lên vị trí 0 (Move-to-Front)
      this.hitCount++;
      const [hitItem] = this.items.splice(foundIndex, 1);
      this.items.unshift(hitItem);

      return {
        keyword: key,
        isHit: true,
        positionFound: foundIndex,
        steps,
        history: this.getHistory()
      };
    } else {
      // MISS: Chưa có trong lịch sử -> Chèn vào đầu danh sách (vị trí 0)
      this.items.unshift(key);
      if (this.items.length > this.maxCapacity) {
        this.items.pop(); // Loại bỏ phần tử ít dùng nhất ở cuối
      }

      return {
        keyword: key,
        isHit: false,
        positionFound: -1,
        steps: steps + 1,
        history: this.getHistory()
      };
    }
  }

  /**
   * Lấy danh sách lịch sử hiện tại
   */
  getHistory() {
    return [...this.items];
  }

  /**
   * Xóa toàn bộ lịch sử
   */
  clear() {
    this.items = [];
    this.totalAccesses = 0;
    this.hitCount = 0;
    this.totalSteps = 0;
  }

  /**
   * Thống kê hiệu năng của Danh sách tự tổ chức
   */
  getStats() {
    const hitRate = this.totalAccesses > 0 
      ? Number(((this.hitCount / this.totalAccesses) * 100).toFixed(1)) 
      : 0;

    const avgSteps = this.totalAccesses > 0 
      ? Number((this.totalSteps / this.totalAccesses).toFixed(2)) 
      : 0;

    // So sánh với danh sách tĩnh: Nếu không dùng MTF, trung bình phải duyệt N/2 bước
    const staticExpectedSteps = this.items.length > 0 ? (this.items.length / 2) : 1;
    const stepsSavedPercent = staticExpectedSteps > avgSteps 
      ? Number((((staticExpectedSteps - avgSteps) / staticExpectedSteps) * 100).toFixed(1)) 
      : 0;

    return {
      size: this.items.length,
      maxCapacity: this.maxCapacity,
      totalAccesses: this.totalAccesses,
      hitCount: this.hitCount,
      hitRate: `${hitRate}%`,
      avgSteps,
      stepsSavedPercent: `${stepsSavedPercent}%`,
      items: this.getHistory()
    };
  }
}
