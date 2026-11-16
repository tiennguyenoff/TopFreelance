import { Timer } from '../../../shared/utils/timer.js';
import { StressSession, DEFAULT_SEED } from './StressSandbox.js';

/**
 * Extreme Stress Test Engine
 * Xả hàng chục nghìn tác vụ ngẫu nhiên vào CHÍNH lõi xử lý của dự án (MarketplaceEngine) chạy ở chế độ
 * bản lõi riêng (sandbox): AVL, bảng băm, mảng ngân sách + tìm nhị phân, DSLK hồ sơ, Queue giải ngân thật
 * (trừ ký quỹ), Stack hoàn tác thật. Kiểm 7 bất biến riêng rẽ. Dữ liệu sinh ra không chạm lõi/CSDL thật.
 */
export class StressTestEngine {
  /**
   * @param {Object} [options]
   * @param {number} [options.jobCount=100000]
   * @param {number} [options.actionCount=100000]
   * @param {number} [options.seed]
   * @param {StressSession} [options.session] dùng lại phiên (giao diện cần phiên để dọn dữ liệu sau)
   * @param {Function} [options.onProgress]
   * @param {Function} [options.shouldCancel]
   * @param {boolean} [options.keepAlive=false] giữ sandbox sống sau khi chạy (UI gọi session.cleanup() sau)
   */
  static run({ jobCount = 100000, actionCount = 100000, seed = DEFAULT_SEED, session, onProgress, shouldCancel, keepAlive = false } = {}) {
    const sess = session || new StressSession();
    const timer = new Timer();
    timer.start();
    const r = sess.run({ jobCount, actionCount, seed, onProgress, shouldCancel });
    const total = timer.stop();
    const cleanup = keepAlive ? null : sess.cleanup();
    return {
      ...r,
      durationMs: r.durationMs,
      durationFormatted: Timer.formatDuration(r.durationMs),
      totalWithBuildMs: total,
      peakRamMb: r.peakHeapMb || r.heapMb,
      cleanup,
      session: keepAlive ? sess : null
    };
  }
}

// Nếu chạy trực tiếp từ Terminal qua lệnh CLI: `node StressTestEngine.js`
if (typeof process !== 'undefined' && process.argv && process.argv[1] && process.argv[1].endsWith('StressTestEngine.js')) {
  console.log('======================================================================');
  console.log('     TOPFREELANCE: BỘ KIỂM THỬ TẢI CỰC HẠN (100.000 TÁC VỤ ĐỒNG THỜI)  ');
  console.log('     Chạy trên LÕI THẬT (bản riêng) · 1 CPU Core · Heap RAM < 512MB     ');
  console.log('======================================================================\n');

  console.log('Đang dựng bản lõi riêng với 100.000 bài đăng và xả 100.000 tác vụ vào AVL/Hash/Queue/Stack thật...');
  const res = StressTestEngine.run({ jobCount: 100000, actionCount: 100000 });

  console.log('\n--- KẾT QUẢ THỰC NGHIỆM ĐO ĐẠC ---');
  console.log(`• Hạt giống / mã lô:           ${res.seed} / ${res.batchId}`);
  console.log(`• Tổng số tác vụ:              ${res.totalActions.toLocaleString()} operations`);
  console.log(`• Thời gian dựng lõi:          ${res.buildMs.toFixed(0)} ms`);
  console.log(`• Thời gian xả tải:            ${res.durationFormatted}`);
  console.log(`• Tốc độ xử lý (Throughput):   ${res.throughputOps.toLocaleString()} ops/giây`);
  console.log(`• Bộ nhớ Heap RAM đỉnh:        ${res.peakRamMb} MB (${res.ramLabel}; ~${((res.peakRamMb / 512) * 100).toFixed(1)}% trần 512MB)`);
  console.log('• Theo loại thao tác (số lần / có tác dụng / bị chặn / µs trung bình):');
  for (const [name, s] of Object.entries(res.byOp)) {
    console.log(`    - ${name.padEnd(9)} ${String(s.ops).padStart(7)} / ${String(s.ok).padStart(7)} / ${String(s.blocked).padStart(6)} / ${s.avgUs.toFixed(2)} µs`);
  }
  console.log(`• Cây AVL: cao ${res.core.avlHeight}, xoay ${JSON.stringify(res.core.avlRotations)}`);
  console.log(`• Đã giải ngân thật:           ${res.core.paidTotal.toLocaleString()} (qua ${res.core.wallets.toLocaleString()} ví freelancer)`);
  console.log('\n--- 7 BẤT BIẾN DỮ LIỆU (mỗi cái kiểm riêng) ---');
  for (const inv of res.invariants) {
    console.log(`  [${inv.ok ? 'ĐẠT' : 'LỖI'}] ${inv.label} — ${inv.violations} vi phạm (${inv.detail})`);
  }
  console.log(`\n• Tổng vi phạm bất biến:       ${res.invariantErrors}`);
  console.log(`• Dọn dữ liệu kiểm thử:        ${res.cleanup.summary} (lõi thật còn ${res.cleanup.jobCount} việc)`);
  console.log(res.invariantErrors === 0
    ? '\n=> KẾT LUẬN: 7/7 bất biến đạt trên lõi thật, dọn xong lõi thật không đổi.'
    : '\n=> KẾT LUẬN: CÓ VI PHẠM BẤT BIẾN — xem chi tiết phía trên.');
  if (res.invariantErrors !== 0) process.exitCode = 1;
}
