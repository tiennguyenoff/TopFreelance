/**
 * LRUCache — Bộ nhớ đệm "Ít dùng gần đây nhất bị loại trước" (Least Recently Used)
 *
 * Cùng ý tưởng với Redis / CDN của các sàn TMĐT và mục "Đã xem gần đây":
 *  - Bảng băm (Map) key → nút: tìm nút trong O(1).
 *  - DSLK đôi có 2 nút lính canh head/tail: nút vừa dùng được kéo lên ngay sau head O(1),
 *    nút đứng sát tail là nút lâu chưa dùng nhất → bị loại khi đầy O(1).
 * get/put đều O(1). Giá trị trong cache chỉ là CON TRỎ (tới JobPost hoặc mảng con trỏ kết quả).
 */
class LRUNode {
  constructor(key, value) {
    this.key = key;
    this.value = value;
    this.prev = null;
    this.next = null;
  }
}

export class LRUCache {
  constructor(capacity = 8) {
    this.capacity = Math.max(1, capacity);
    this.map = new Map();
    this.head = new LRUNode('__HEAD__', null);
    this.tail = new LRUNode('__TAIL__', null);
    this.head.next = this.tail;
    this.tail.prev = this.head;
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }

  get size() { return this.map.size; }

  _unlink(node) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
    node.prev = node.next = null;
  }

  _addFront(node) {
    node.next = this.head.next;
    node.prev = this.head;
    this.head.next.prev = node;
    this.head.next = node;
  }

  /** Vị trí của nút tính từ head — CHỈ dùng để vẽ minh họa, không nằm trên đường đi O(1). */
  positionOf(key) {
    let i = 0;
    for (let n = this.head.next; n !== this.tail; n = n.next, i++) if (n.key === key) return i;
    return -1;
  }

  /** O(1): trả về { hit, value } và kéo nút lên đầu nếu có. */
  get(key) {
    const node = this.map.get(key);
    if (!node) {
      this.misses++;
      return { hit: false, value: undefined };
    }
    this._unlink(node);
    this._addFront(node);
    this.hits++;
    return { hit: true, value: node.value };
  }

  /** Xem giá trị mà KHÔNG thay đổi thứ tự. */
  peek(key) {
    const node = this.map.get(key);
    return node ? node.value : undefined;
  }

  /** O(1): thêm / cập nhật rồi đưa lên đầu; loại nút cuối khi vượt dung lượng. */
  put(key, value) {
    let node = this.map.get(key);
    if (node) {
      node.value = value;
      this._unlink(node);
      this._addFront(node);
      return { inserted: false, evicted: null };
    }
    node = new LRUNode(key, value);
    this.map.set(key, node);
    this._addFront(node);
    let evicted = null;
    if (this.map.size > this.capacity) {
      const lru = this.tail.prev;
      this._unlink(lru);
      this.map.delete(lru.key);
      this.evictions++;
      evicted = lru.key;
    }
    return { inserted: true, evicted };
  }

  delete(key) {
    const node = this.map.get(key);
    if (!node) return false;
    this._unlink(node);
    this.map.delete(key);
    return true;
  }

  clear() {
    this.map.clear();
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  /** Danh sách key từ mới nhất (head) → cũ nhất (tail). */
  keys() {
    const out = [];
    for (let n = this.head.next; n !== this.tail; n = n.next) out.push(n.key);
    return out;
  }

  values() {
    const out = [];
    for (let n = this.head.next; n !== this.tail; n = n.next) out.push(n.value);
    return out;
  }

  get hitRate() {
    const t = this.hits + this.misses;
    return t ? this.hits / t : 0;
  }

  stats() {
    return { capacity: this.capacity, size: this.size, hits: this.hits, misses: this.misses, evictions: this.evictions, hitRate: this.hitRate };
  }
}
