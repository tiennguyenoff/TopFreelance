/**
 * TokenBucket — Giới hạn tần suất (Rate Limiter) kiểu "xô token"
 *
 * Cùng cơ chế với API gateway của Stripe / Shopify và bộ chống spam đặt hàng flash sale:
 *  - Xô chứa tối đa `capacity` token (cho phép "bùng nổ" ngắn tối đa capacity yêu cầu).
 *  - Token được nạp lại đều đặn `refillPerSec` token / giây, không vượt quá capacity.
 *  - Mỗi yêu cầu lấy 1 token; xô rỗng → từ chối và báo thời gian phải chờ.
 * Không cần lưu lịch sử từng yêu cầu: chỉ 2 số (tokens, lastRefill) → O(1) thời gian, O(1) bộ nhớ.
 */
export class TokenBucket {
  constructor(capacity = 5, refillPerSec = 0.5, clock = () => Date.now()) {
    this.capacity = Math.max(1, capacity);
    this.refillPerSec = refillPerSec;
    this.clock = clock;
    this.tokens = this.capacity;
    this.lastRefill = clock();
    this.allowed = 0;
    this.rejected = 0;
  }

  /** Nạp token theo thời gian trôi qua kể từ lần nạp trước. O(1). */
  _refill(t) {
    const elapsedMs = Math.max(0, t - this.lastRefill);
    const before = this.tokens;
    this.tokens = Math.min(this.capacity, this.tokens + (elapsedMs / 1000) * this.refillPerSec);
    this.lastRefill = t;
    return { elapsedMs, added: this.tokens - before };
  }

  /** Số token hiện có (không thay đổi trạng thái). */
  peek(t = this.clock()) {
    const elapsedMs = Math.max(0, t - this.lastRefill);
    return Math.min(this.capacity, this.tokens + (elapsedMs / 1000) * this.refillPerSec);
  }

  /**
   * Thử lấy `n` token. Trả về vết đầy đủ để vẽ canvas.
   * @returns {{allowed:boolean, tokensBefore:number, refilled:number, elapsedMs:number,
   *            tokensAfterRefill:number, tokensAfter:number, waitMs:number}}
   */
  tryConsume(n = 1, t = this.clock()) {
    const tokensBefore = this.tokens;
    const { elapsedMs, added } = this._refill(t);
    const tokensAfterRefill = this.tokens;
    const allowed = this.tokens >= n;
    if (allowed) {
      this.tokens -= n;
      this.allowed++;
    } else {
      this.rejected++;
    }
    const waitMs = allowed ? 0 : Math.ceil(((n - this.tokens) / this.refillPerSec) * 1000);
    return { allowed, tokensBefore, refilled: added, elapsedMs, tokensAfterRefill, tokensAfter: this.tokens, waitMs };
  }

  stats() {
    return { allowed: this.allowed, rejected: this.rejected, capacity: this.capacity, refillPerSec: this.refillPerSec };
  }
}

/** Mỗi người dùng một xô riêng, tra theo Map O(1). */
export class RateLimiter {
  constructor(capacity = 5, refillPerSec = 0.5, clock = () => Date.now()) {
    this.capacity = capacity;
    this.refillPerSec = refillPerSec;
    this.clock = clock;
    this.buckets = new Map();
  }

  bucketFor(key) {
    let b = this.buckets.get(key);
    if (!b) {
      b = new TokenBucket(this.capacity, this.refillPerSec, this.clock);
      this.buckets.set(key, b);
    }
    return b;
  }

  tryConsume(key, n = 1, t = this.clock()) {
    return this.bucketFor(key).tryConsume(n, t);
  }
}
