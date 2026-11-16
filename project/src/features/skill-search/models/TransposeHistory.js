/**
 * TransposeHistory - Danh sách tự tổ chức theo chiến lược Transpose (hoán vị kề)
 *
 * Khác với Move-to-Front (đưa thẳng lên đầu), Transpose chỉ đổi chỗ phần tử vừa truy cập
 * với phần tử ĐỨNG NGAY TRƯỚC nó. Từ khóa được dùng nhiều sẽ "nổi" dần lên đầu từng bậc một,
 * nên một lần truy cập lẻ tẻ không đẩy được các từ khóa quen thuộc xuống cuối.
 *
 * Độ phức tạp mỗi lần truy cập: O(k) tìm tuyến tính + O(1) hoán vị, k = vị trí phần tử.
 */
export class TransposeHistory {
  constructor(maxCapacity = 15) {
    this.maxCapacity = Math.max(1, maxCapacity);
    this.items = [];
    this.totalAccesses = 0;
    this.totalSteps = 0;
  }

  /**
   * @param {string} keyword
   * @returns {{ keyword: string, isHit: boolean, positionFound: number, newPosition: number, steps: number, history: string[] }}
   */
  access(keyword) {
    const key = String(keyword || '').toLowerCase().trim();
    if (!key) return { keyword: '', isHit: false, positionFound: -1, newPosition: -1, steps: 0, history: this.getHistory() };
    this.totalAccesses++;

    let steps = 0;
    let found = -1;
    for (let i = 0; i < this.items.length; i++) {
      steps++;
      if (this.items[i] === key) { found = i; break; }
    }

    if (found === -1) {
      // MISS: thêm vào CUỐI danh sách (khác MTF thêm vào đầu)
      this.items.push(key);
      if (this.items.length > this.maxCapacity) this.items.shift();
      this.totalSteps += steps + 1;
      return { keyword: key, isHit: false, positionFound: -1, newPosition: this.items.length - 1, steps: steps + 1, history: this.getHistory() };
    }

    // HIT: hoán vị với phần tử đứng trước (nếu không phải đầu danh sách)
    let newPosition = found;
    if (found > 0) {
      const tmp = this.items[found - 1];
      this.items[found - 1] = this.items[found];
      this.items[found] = tmp;
      newPosition = found - 1;
    }
    this.totalSteps += steps;
    return { keyword: key, isHit: true, positionFound: found, newPosition, steps, history: this.getHistory() };
  }

  getHistory() {
    return [...this.items];
  }

  clear() {
    this.items = [];
    this.totalAccesses = 0;
    this.totalSteps = 0;
  }
}
