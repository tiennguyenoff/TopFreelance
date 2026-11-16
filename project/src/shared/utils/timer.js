/**
 * High-precision Timer Utility
 * Hỗ trợ đo lường thời gian thực thi với độ phân giải micro-giây (µs)
 */

export class Timer {
  constructor() {
    this.startTime = 0;
    this.endTime = 0;
  }

  start() {
    this.startTime = performance.now();
    this.endTime = 0;
  }

  stop() {
    this.endTime = performance.now();
    return this.getDuration();
  }

  getDuration() {
    if (this.endTime === 0) {
      return performance.now() - this.startTime;
    }
    return this.endTime - this.startTime;
  }

  /**
   * Định dạng thời gian theo đơn vị dễ đọc (ms hoặc µs)
   */
  static formatDuration(ms) {
    if (ms < 1) {
      return `${(ms * 1000).toFixed(2)} µs`;
    }
    return `${ms.toFixed(4)} ms`;
  }
}

export function measureExecutionTime(fn) {
  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;
  return { result, duration };
}
