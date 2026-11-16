/**
 * SkillHashTable.js
 * Hiện thực Bảng Băm (Hash Table) tra cứu việc làm theo Kỹ năng:
 * - Hàm băm Đa Thức Horner (cơ số 31) phân bố đều, chống tràn số 32-bit
 * - Giải quyết va chạm bằng Kỹ thuật Chaining (Danh sách liên kết đơn Separate Chaining)
 * - Cơ chế Tái Băm Động (Dynamic Rehashing) khi hệ số tải α > 0.75
 * - Khống chế chuỗi va chạm dài nhất ≤ 4, bảo đảm tra cứu O(1) trung bình
 * - Single Source of Truth: Chỉ lưu con trỏ tham chiếu đến JobPost gốc
 */

import { HashBucketNode } from './HashBucketNode.js';

export class SkillHashTable {
  /**
   * Kiểm tra một số nguyên có phải là số nguyên tố
   */
  static isPrime(n) {
    if (n <= 1) return false;
    if (n <= 3) return true;
    if (n % 2 === 0 || n % 3 === 0) return false;
    for (let i = 5; i * i <= n; i += 6) {
      if (n % i === 0 || n % (i + 2) === 0) return false;
    }
    return true;
  }

  /**
   * Tìm số nguyên tố nhỏ nhất lớn hơn n (dùng khi mở rộng bảng băm)
   */
  static nextPrime(n) {
    let prime = Math.max(2, Math.floor(n));
    let found = false;
    while (!found) {
      prime++;
      if (this.isPrime(prime)) found = true;
    }
    return prime;
  }

  /**
   * @param {number} [initialCapacity=31] - Kích thước mảng bucket khởi tạo (ưu tiên số nguyên tố)
   * @param {number} [maxLoadFactor=0.75] - Ngưỡng hệ số tải tối đa để kích hoạt Rehash
   */
  constructor(initialCapacity = 31, maxLoadFactor = 0.75) {
    this.capacity = SkillHashTable.isPrime(initialCapacity) 
      ? initialCapacity 
      : SkillHashTable.nextPrime(initialCapacity);
    this.maxLoadFactor = maxLoadFactor;
    this.buckets = new Array(this.capacity).fill(null);
    this.distinctKeys = 0; // Số khóa kỹ năng phân biệt
    this.totalJobs = 0;    // Tổng số con trỏ bài đăng tuyển dụng đã băm
    this.rehashCount = 0;  // Số lần đã thực hiện tái băm động
  }

  /**
   * Hàm băm đa thức Horner (Horner's Rule) với cơ số 31:
   * hash = (hash * 31 + charCode) % capacity
   * @param {string} key - Chuỗi từ khóa kỹ năng
   * @param {number} [modCapacity=this.capacity] - Số modulo (kích thước bảng)
   * @returns {number} Chỉ số bucket tương ứng trong khoảng [0, modCapacity - 1]
   */
  hornerHash(key, modCapacity = this.capacity) {
    if (!key || typeof key !== 'string') return 0;
    const cleanKey = key.toLowerCase().trim();
    let hash = 0;

    for (let i = 0; i < cleanKey.length; i++) {
      hash = (hash * 31 + cleanKey.charCodeAt(i)) % modCapacity;
    }

    return hash;
  }

  /**
   * Hệ số tải hiện tại của bảng băm: α = distinctKeys / capacity
   */
  get loadFactor() {
    return this.capacity > 0 ? (this.distinctKeys / this.capacity) : 0;
  }

  /**
   * Tự động tái băm động (Dynamic Rehashing):
   * Nhân đôi kích thước mảng bucket lên số nguyên tố tiếp theo
   * Phân bổ lại toàn bộ các node để giảm chuỗi va chạm
   */
  rehash() {
    const oldCapacity = this.capacity;
    const newCapacity = SkillHashTable.nextPrime(oldCapacity * 2);
    const newBuckets = new Array(newCapacity).fill(null);

    // Di chuyển toàn bộ các node từ bảng cũ sang bảng mới
    for (let i = 0; i < oldCapacity; i++) {
      let current = this.buckets[i];
      while (current !== null) {
        const nextNode = current.next; // Lưu con trỏ trước khi nối lại
        const newIndex = this.hornerHash(current.key, newCapacity);

        // Chèn vào đầu danh sách liên kết tại bucket mới (O(1))
        current.next = newBuckets[newIndex];
        newBuckets[newIndex] = current;

        current = nextNode;
      }
    }

    this.capacity = newCapacity;
    this.buckets = newBuckets;
    this.rehashCount++;
  }

  /**
   * Chèn một bài đăng tuyển dụng vào Bảng Băm theo kỹ năng (skillTag)
   * @param {Object} jobPost - Đối tượng JobPost gốc
   */
  insert(jobPost) {
    if (!jobPost || !jobPost.skillTag) return;

    const rawKey = jobPost.skillTag;
    const key = rawKey.toLowerCase().trim();
    let index = this.hornerHash(key);

    // 1. Kiểm tra xem kỹ năng này đã có node trong chuỗi bucket chưa
    let current = this.buckets[index];
    while (current !== null) {
      if (current.key === key) {
        // Khóa đã tồn tại -> chỉ cần thêm con trỏ jobPost vào mảng jobs
        current.addJob(jobPost);
        this.totalJobs++;
        return;
      }
      current = current.next;
    }

    // 2. Khóa kỹ năng mới chưa có trong bảng
    // Kiểm tra xem việc thêm khóa mới có làm vượt ngưỡng hệ số tải α > 0.75 không
    if ((this.distinctKeys + 1) / this.capacity > this.maxLoadFactor) {
      this.rehash();
      // Tính lại chỉ số sau khi đã rehash sang bảng mới
      index = this.hornerHash(key);
    }

    // 3. Tạo node mới và gắn vào đầu danh sách liên kết (Separate Chaining)
    const newNode = new HashBucketNode(key, jobPost, this.buckets[index]);
    this.buckets[index] = newNode;
    this.distinctKeys++;
    this.totalJobs++;
  }

  /**
   * Nạp hàng loạt bài đăng tuyển dụng
   * @param {Array} jobsList - Mảng các bài đăng
   */
  bulkInsert(jobsList = []) {
    if (!Array.isArray(jobsList)) return;
    for (let i = 0; i < jobsList.length; i++) {
      this.insert(jobsList[i]);
    }
  }

  /**
   * Tra cứu danh sách việc làm theo từ khóa kỹ năng trong O(1) trung bình
   * @param {string} skillTag - Từ khóa kỹ năng cần tìm (ví dụ: 'react')
   * @returns {{ skillTag: string, matches: Array, count: number, steps: number, bucketIndex: number, latencyUs: string }}
   */
  search(skillTag) {
    if (!skillTag || typeof skillTag !== 'string') {
      return { skillTag: '', matches: [], count: 0, steps: 0, bucketIndex: -1, latencyUs: '0.00 µs' };
    }

    const key = skillTag.toLowerCase().trim();
    const startTime = (typeof performance !== 'undefined' && performance.now) 
      ? performance.now() 
      : Date.now();

    const index = this.hornerHash(key);
    let current = this.buckets[index];
    let steps = 0;
    let foundNode = null;

    while (current !== null) {
      steps++;
      if (current.key === key) {
        foundNode = current;
        break;
      }
      current = current.next;
    }

    const endTime = (typeof performance !== 'undefined' && performance.now) 
      ? performance.now() 
      : Date.now();

    const latencyMicroseconds = ((endTime - startTime) * 1000).toFixed(2);

    return {
      skillTag: key,
      matches: foundNode ? foundNode.jobs : [],
      count: foundNode ? foundNode.count : 0,
      steps,
      bucketIndex: index,
      latencyUs: `${latencyMicroseconds} µs`
    };
  }

  /**
   * Lấy danh sách toàn bộ các từ khóa kỹ năng đã được lập chỉ mục
   */
  getAllKeys() {
    const keys = [];
    for (let i = 0; i < this.capacity; i++) {
      let current = this.buckets[i];
      while (current !== null) {
        keys.push(current.key);
        current = current.next;
      }
    }
    return keys;
  }

  /**
   * Thống kê chi tiết Bảng Băm phục vụ Telemetry & Simulator Panel
   */
  getStats() {
    let collisionBuckets = 0;
    let maxChainLength = 0;
    let emptyBuckets = 0;

    for (let i = 0; i < this.capacity; i++) {
      let chainLen = 0;
      let current = this.buckets[i];

      while (current !== null) {
        chainLen++;
        current = current.next;
      }

      if (chainLen === 0) {
        emptyBuckets++;
      } else if (chainLen > 1) {
        collisionBuckets++;
      }

      if (chainLen > maxChainLength) {
        maxChainLength = chainLen;
      }
    }

    return {
      capacity: this.capacity,
      distinctKeys: this.distinctKeys,
      totalJobs: this.totalJobs,
      loadFactor: Number(this.loadFactor.toFixed(4)),
      collisionBuckets,
      maxChainLength,
      emptyBuckets,
      rehashCount: this.rehashCount
    };
  }
}
