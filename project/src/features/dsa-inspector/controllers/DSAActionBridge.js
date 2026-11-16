/**
 * DSAActionBridge
 * Cầu nối thời gian thực giữa thao tác trên web và Live Inspector Canvas.
 *
 * Mỗi dispatcher nhận `trace` do MarketplaceEngine đọc ra từ CHÍNH cấu trúc dữ liệu
 * (đường đi trên cây AVL, bucket + chuỗi va chạm, các bước nhị phân, các lần merge/swap...)
 * rồi dựng thành các khung hình (frames). Canvas chỉ vẽ lại dữ liệu này — không có số liệu
 * minh họa cố định nào.
 *
 * Quy ước action: { id, type, lab, title, bigO, latency, summary, data, frames: [{frame,label,desc}] }
 */

import { reactive } from 'vue';

const money = (v) => `$${Number(v || 0).toLocaleString('en-US')}`;
let seq = 0;

class DSAActionBridgeStore {
  constructor() {
    this.state = reactive({
      activeAction: null,    // Thao tác đang được mô phỏng
      actionHistory: [],     // Lịch sử các thao tác gần nhất
      isSlowMoPlaying: false // Trạng thái phát chậm
    });
  }

  _make(type, fields) {
    seq += 1;
    const action = { id: `${Date.now()}-${seq}`, type, ...fields };
    action.frames = action.frames.map((f, i) => ({ frame: i + 1, ...f }));
    this.setAction(action);
    return action;
  }

  // ---------------------------------------------------------------------
  // TÌM KIẾM TUYẾN TÍNH THEO TỪ KHÓA — O(n)
  // ---------------------------------------------------------------------
  dispatchLinearSearch(t) {
    return this._make('LINEAR_SEARCH', {
      lab: 'Mảng gốc · Tìm kiếm tuyến tính',
      title: `Quét tuyến tính từ khóa "${t.keyword}"`,
      bigO: 'O(n)',
      latency: t.latency,
      summary: `Duyệt ${t.n.toLocaleString()} phần tử, ${t.comparisons.toLocaleString()} phép so sánh, khớp ${t.matchesCount.toLocaleString()} việc.`,
      data: t,
      frames: [
        { label: 'Quét từ chỉ số 0', desc: `Con trỏ i chạy từ jobs[0], so khớp "${t.keyword}" với tiêu đề / kỹ năng / mã việc.` },
        { label: 'Không thể nhảy cóc', desc: `Mảng chưa sắp theo từ khóa nên phải đi hết: ${t.comparisons.toLocaleString()} lần so sánh (trường hợp xấu nhất = n).` },
        {
          label: t.matchesCount ? 'Thu thập kết quả' : 'Không tìm thấy',
          desc: t.matchesCount
            ? `Lần khớp đầu tiên ở chỉ số ${t.firstHit} (${t.firstHitId}); tổng cộng ${t.matchesCount.toLocaleString()} việc khớp.`
            : 'Đã duyệt hết mảng nhưng không có phần tử nào khớp.'
        }
      ]
    });
  }

  // ---------------------------------------------------------------------
  // TRA CỨU MÃ VIỆC TRÊN CÂY AVL — O(log n)
  // ---------------------------------------------------------------------
  dispatchAVLSearch(t) {
    const pathStr = t.path.map(p => p.key).join(' → ');
    return this._make('AVL_TREE', {
      lab: 'Cây AVL · Chỉ mục mã việc',
      title: `Tra cứu ${t.target} trên cây AVL`,
      bigO: 'O(log n)',
      latency: t.latency,
      summary: `${t.found ? 'Tìm thấy' : 'Không có'} khóa ${t.key ?? '?'} sau ${t.steps} bước so sánh — cây ${t.size.toLocaleString()} nút, cao ${t.treeHeight}.`,
      data: t,
      frames: [
        { label: 'Bắt đầu tại gốc', desc: `So sánh khóa ${t.key ?? '?'} với gốc ${t.path[0] ? t.path[0].key : '(rỗng)'}.` },
        { label: 'Đi xuống theo BST', desc: `Nhỏ hơn rẽ trái, lớn hơn rẽ phải: ${pathStr || '—'}` },
        {
          label: t.found ? 'Tìm thấy nút' : 'Chạm nút rỗng',
          desc: t.found
            ? `Khớp sau ${t.steps} bước ≤ chiều cao ${t.treeHeight} ≈ 1.44·log₂(${t.size.toLocaleString()}). ${t.title || ''}`
            : `Đã đi ${t.steps} bước tới nhánh rỗng → khóa không tồn tại.`
        }
      ]
    });
  }

  // ---------------------------------------------------------------------
  // LỌC KỸ NĂNG BẰNG BẢNG BĂM HORNER + DANH SÁCH TỰ TỔ CHỨC MTF
  // ---------------------------------------------------------------------
  dispatchHashSearch(t) {
    const chainStr = t.chain.map(c => c.key).join(' → ') || '(rỗng)';
    return this._make('HASH_TABLE', {
      lab: 'Bảng băm Horner · Move-to-Front',
      title: `Lọc kỹ năng "${t.keyword}" qua bảng băm`,
      bigO: 'O(1) trung bình',
      latency: t.latency,
      summary: `Horner → bucket #${t.bucket}/${t.capacity}, duyệt chuỗi ${t.steps} bước, khớp ${t.matchesCount.toLocaleString()} việc. α = ${t.loadFactor}.`,
      data: t,
      frames: [
        { label: 'Băm Horner từng ký tự', desc: `h = (h·31 + mã ký tự) mod ${t.capacity}, lần lượt cho ${t.chars.length} ký tự → ${t.bucket}.` },
        { label: `Nhảy thẳng tới bucket #${t.bucket}`, desc: `Truy cập mảng bucket theo chỉ số trong O(1) — không cần duyệt ${t.capacity} ô.` },
        {
          label: t.foundPos >= 0 ? 'Duyệt chuỗi va chạm' : 'Chuỗi không có khóa',
          desc: `Chuỗi tại bucket: ${chainStr}. ${t.foundPos >= 0 ? `Khớp ở mắt xích thứ ${t.foundPos + 1}.` : 'Không khóa nào trùng.'}`
        },
        {
          label: 'Move-to-Front lịch sử',
          desc: t.mtfHit
            ? `"${t.keyword}" đã có ở vị trí ${t.mtfPos + 1} → dời lên đầu danh sách.`
            : `"${t.keyword}" chưa có trong lịch sử → chèn vào đầu danh sách.`
        }
      ]
    });
  }

  // ---------------------------------------------------------------------
  // LỌC DẢI NGÂN SÁCH BẰNG TÌM KIẾM NHỊ PHÂN — O(log n)
  // ---------------------------------------------------------------------
  dispatchBinarySearch(t) {
    const maxStr = t.max === null ? '∞' : money(t.max);
    return this._make('BINARY_SEARCH', {
      lab: 'Mảng sắp xếp · Tìm kiếm nhị phân',
      title: `Lọc ngân sách ${money(t.min)} – ${maxStr}`,
      bigO: 'O(log n)',
      latency: t.latency,
      summary: `lowerBound ${t.lowerProbes.length} bước + upperBound ${t.upperProbes.length} bước trên ${t.n.toLocaleString()} con trỏ → [${t.left}, ${t.right}) = ${t.count.toLocaleString()} việc.`,
      data: t,
      frames: [
        { label: 'lowerBound(min)', desc: `Tìm chỉ số đầu tiên có budget ≥ ${money(t.min)}: ${t.lowerProbes.length} lần chia đôi → ${t.left}.` },
        { label: 'upperBound(max)', desc: `Tìm chỉ số đầu tiên có budget > ${maxStr}: ${t.upperProbes.length} lần chia đôi → ${t.right}.` },
        { label: 'Cắt đoạn kết quả', desc: `Đoạn [${t.left}, ${t.right}) chứa ${t.count.toLocaleString()} việc — ${t.verified ? 'khớp' : 'KHÔNG khớp'} với BinarySearchRange.searchRange.` }
      ]
    });
  }

  // ---------------------------------------------------------------------
  // ĐĂNG VIỆC MỚI: MẢNG GỐC → AVL (CÓ XOAY) → BẢNG BĂM (CÓ REHASH) → MẢNG SẮP XẾP
  // ---------------------------------------------------------------------
  dispatchJobPost(t) {
    const rot = t.avl.rotation;
    const hs = t.hash;
    return this._make('JOB_POST', {
      lab: 'Mảng · AVL · Bảng băm · Nhị phân',
      title: `Đăng việc ${t.jobId} vào toàn bộ chỉ mục`,
      bigO: 'O(log n) AVL + O(1) băm',
      latency: t.latency,
      summary: `${t.jobId}: AVL sâu ${t.avl.depth} bước${rot ? `, xoay ${rot.type}` : ''}; #${t.skillTag} → bucket ${hs.bucket1}${hs.rehashed ? ` (rehash ${hs.capacity0}→${hs.capacity1})` : ''}; chèn mảng ngân sách tại ${t.sorted.idx}.`,
      data: t,
      frames: [
        { label: 'Thêm vào mảng gốc', desc: `jobs.unshift(${t.jobId}) — đối tượng duy nhất, các chỉ mục chỉ giữ con trỏ. n = ${t.n.toLocaleString()}.` },
        { label: 'Chèn vào cây AVL', desc: `Khóa ${t.avl.key} đi qua ${t.avl.depth} nút rồi gắn thành lá mới.` },
        rot
          ? { label: `Mất cân bằng → xoay ${rot.type}`, desc: `Nút ${rot.z} có BF = ${rot.bfZ > 0 ? '+' : ''}${rot.bfZ}; xoay ${rot.type} đưa ${rot.newRoot} lên làm gốc cây con. Tổng số lần xoay: ${t.avl.rotationsTotal.total}.` }
          : { label: 'Cây vẫn cân bằng', desc: `Mọi nút trên đường đi có |BF| ≤ 1 — không cần xoay. Chiều cao cây: ${t.avl.height}.` },
        hs.rehashed
          ? { label: `Rehash ${hs.capacity0} → ${hs.capacity1}`, desc: `α sẽ vượt ${hs.maxLoad} khi thêm khóa mới "${t.skillTag}" → nhân đôi lên số nguyên tố ${hs.capacity1} và băm lại toàn bộ.` }
          : { label: `Băm "${t.skillTag}" → bucket #${hs.bucket1}`, desc: hs.existed ? `Khóa đã có trong chuỗi — chỉ nối thêm con trỏ việc. α = ${hs.lf1}.` : `Khóa mới, chèn vào đầu chuỗi. α = ${hs.lf1}.` },
        { label: 'Chèn mảng ngân sách', desc: `lowerBound(${money(t.budget)}) sau ${t.sorted.probes.length} bước → chỉ số ${t.sorted.idx}, splice giữ mảng luôn có thứ tự.` }
      ]
    });
  }

  // ---------------------------------------------------------------------
  // NỘP HỒ SƠ: DSLK ỨNG VIÊN insertHead + "ĐƠN CỦA TÔI" insertTail + BẢNG BĂM + ENQUEUE VÉ
  // ---------------------------------------------------------------------
  dispatchApply(t) {
    return this._make('LINKED_LIST', {
      lab: 'DSLK đôi · Bảng băm · Hàng đợi',
      title: `Nộp đơn vào ${t.jobId}`,
      bigO: 'O(1)',
      latency: t.latency,
      summary: `Hồ sơ ${t.newNode.label} vào đầu DSLK ứng viên của việc (${t.listSize}); đơn ${t.myNew ? t.myNew.label : ''} nối đuôi "Đơn của tôi" (${t.mySize}) + bảng băm jobId → node; vé ${t.ticket ? t.ticket.id : ''} vào hàng đợi (${t.queueSize}). Tuyển ${t.hired}.`,
      data: t,
      frames: [
        { label: 'DSLK ứng viên của việc · insertHead', desc: `Nhà tuyển dụng thấy hồ sơ mới nhất trước: new.next = head cũ, head.prev = new, head = ${t.newNode.label} — O(1).` },
        { label: '"Đơn của tôi" · insertTail + băm', desc: `Đơn ${t.myNew ? t.myNew.label : ''} nối vào đuôi DSLK đôi (thứ tự nộp), đồng thời map.set(${t.jobId} → con trỏ node). Nhờ con trỏ này, sau này rút BẤT KỲ đơn nào cũng O(1), không theo LIFO.` },
        { label: 'Enqueue vé giải ngân', desc: `Vé ${t.ticket ? t.ticket.id : ''} nối vào đuôi hàng đợi FIFO — nhà tuyển dụng duyệt thanh toán theo thứ tự nộp.` }
      ]
    });
  }

  // ---------------------------------------------------------------------
  // RÚT ĐƠN BẤT KỲ: BẢNG BĂM jobId → NODE O(1) → GỠ prev/next O(1)
  // ---------------------------------------------------------------------
  dispatchWithdrawProposal(t) {
    const caseText = {
      ONLY: 'đơn duy nhất → head = tail = null',
      HEAD: `đơn cũ nhất (head) → head = ${t.nextLabel}, head.prev = null`,
      TAIL: `đơn mới nhất (tail) → tail = ${t.prevLabel}, tail.next = null`,
      MIDDLE: `đơn ở giữa → ${t.prevLabel}.next = ${t.nextLabel}, ${t.nextLabel}.prev = ${t.prevLabel}`,
      NONE: 'không có đơn trong chỉ mục'
    }[t.removedCase];
    return this._make('DLL_REMOVE', {
      lab: 'Bảng băm · DSLK đôi · Hàng đợi',
      title: `Rút đơn ${t.targetLabel || ''} (${t.jobId})`,
      bigO: 'O(1) tra băm + O(1) gỡ',
      latency: t.latency,
      summary: `map.get(${t.jobId}) → node ${t.targetLabel || '—'} ở vị trí ${t.removedCase}, gỡ prev/next không cần duyệt. Còn ${t.mySize} đơn; hủy vé ${t.ticketId || '—'}.`,
      data: t,
      frames: [
        { label: 'Tra bảng băm jobId → node', desc: `map.get("${t.jobId}") trả thẳng con trỏ tới node ${t.targetLabel || '—'} trong "Đơn của tôi" — O(1), không đi từ head.` },
        { label: 'Gỡ node: bắc cầu prev ↔ next', desc: `${caseText}. Chỉ sửa 2 con trỏ — O(1) dù đơn nằm ở đâu.` },
        { label: 'Dọn các cấu trúc liên quan', desc: `Xóa khóa khỏi bảng băm; cùng con trỏ đó gỡ hồ sơ khỏi DSLK ứng viên của việc (${t.jobListBefore} → ${t.jobListAfter}); hủy vé ${t.ticketId || '—'} trong hàng đợi.` },
        { label: '"Đơn của tôi" sau khi rút', desc: `Còn ${t.mySize} đơn: ${t.listAfter.map(n => n.label).join(' ⇄ ') || '(rỗng)'}.` }
      ]
    });
  }

  // ---------------------------------------------------------------------
  // HOÀN TÁC: POP NGĂN XẾP LIFO
  // ---------------------------------------------------------------------
  dispatchUndo(t) {
    return this._make('STACK_LIFO', {
      lab: 'Ngăn xếp LIFO · DSLK · Hàng đợi',
      title: `Hoàn tác ${t.popped ? t.popped.id : ''}`,
      bigO: 'O(1)',
      latency: t.latency,
      summary: `Pop đỉnh Stack (${t.stackBeforeSize} → ${t.stackAfterSize}), gỡ head DSLK ${t.removedNode || '—'}, hủy vé ${t.ticketId || '—'}. Tuyển còn ${t.hired}.`,
      data: t,
      frames: [
        { label: 'Đỉnh ngăn xếp', desc: `Hành động mới nhất ${t.popped ? t.popped.id : ''} (${t.popped ? t.popped.jobId : ''}) nằm trên cùng.` },
        { label: 'Pop — vào sau ra trước', desc: `top = top.next trong O(1). Còn ${t.stackAfterSize} hành động.` },
        { label: 'Rollback dữ liệu', desc: `removeHead DSLK (${t.removedNode || '—'}), hủy vé ${t.ticketId || '—'}, hiredCount giảm → ${t.hired}.` }
      ]
    });
  }

  // ---------------------------------------------------------------------
  // HỒ SƠ NĂNG LỰC: push / pop ngăn xếp hoàn tác chỉnh sửa
  // t = { op: 'push'|'pop', entry: {label}, stackBefore: [{label}], stackAfterSize, field, latency }
  // ---------------------------------------------------------------------
  dispatchProfileUndo(t) {
    const before = t.stackBefore || [];
    const isPop = t.op === 'pop';
    return this._make('STACK_LIFO', {
      lab: 'Ngăn xếp LIFO · Hồ sơ năng lực',
      title: isPop ? `Hoàn tác: ${t.entry.label}` : `Ghi nhớ: ${t.entry.label}`,
      bigO: 'O(1)',
      latency: t.latency,
      summary: isPop
        ? `Pop đỉnh Stack (${before.length} → ${t.stackAfterSize}) và khôi phục giá trị cũ của "${t.field}".`
        : `Push ảnh chụp trước khi sửa "${t.field}" lên đỉnh Stack (${t.stackAfterSize} mục).`,
      data: {
        op: t.op,
        // push: vẽ ngăn xếp SAU khi push để thấy node mới rơi vào đỉnh
        stackBefore: isPop ? before : [t.entry, ...before],
        stackBeforeSize: before.length,
        stackAfterSize: t.stackAfterSize,
        popped: t.entry,
        cards: [
          { t: 'Đỉnh ngăn xếp', v: isPop ? 'pop() O(1)' : 'push() O(1)' },
          { t: 'Trường hồ sơ', v: t.field },
          { t: 'Còn trong Stack', v: `${t.stackAfterSize} mục` }
        ]
      },
      frames: [
        { label: 'Đỉnh ngăn xếp', desc: `Chỉnh sửa gần nhất "${(before[0] || t.entry).label}" nằm trên cùng.` },
        { label: isPop ? 'Pop — vào sau ra trước' : 'Push lên đỉnh', desc: isPop ? `top = top.next trong O(1). Còn ${t.stackAfterSize} mục.` : `node.next = top; top = node — O(1).` },
        { label: isPop ? 'Khôi phục giá trị' : 'Sẵn sàng hoàn tác', desc: isPop ? `Gán lại giá trị trước khi sửa cho "${t.field}". Chưa lưu thì máy chủ không bị ảnh hưởng.` : 'Bấm "Hoàn tác" để quay lại bước này.' }
      ]
    });
  }

  // ---------------------------------------------------------------------
  // GIẢI NGÂN: DEQUEUE HÀNG ĐỢI FIFO
  // ---------------------------------------------------------------------
  dispatchQueuePayout(t) {
    return this._make('QUEUE_FIFO', {
      lab: 'Hàng đợi FIFO · Ký quỹ Escrow',
      title: `Giải ngân vé ${t.ticket ? t.ticket.id : ''}`,
      bigO: 'O(1)',
      latency: t.latency,
      summary: `Dequeue vé đầu hàng (${t.queueBeforeSize} → ${t.queueAfterSize}), chuyển ${money(t.ticket?.amount)} cho ${t.ticket?.fl || ''}${t.source === 'wallet' ? ` — trừ ví nhà tuyển dụng ${money(t.payerBefore)} → ${money(t.payerAfter)}` : ' — lấy từ ký quỹ đã khóa lúc đăng tin'}.`,
      data: t,
      frames: [
        { label: 'Đầu hàng đợi', desc: `Vé ${t.ticket ? t.ticket.id : ''} vào trước nên được phục vụ trước.` },
        { label: 'Dequeue — vào trước ra trước', desc: `head = head.next trong O(1). Còn ${t.queueAfterSize} vé chờ.` },
        t.source === 'wallet'
          ? { label: 'Chuyển tiền: ví NTD → ví freelancer', desc: `Việc mẫu chưa nạp ký quỹ → trừ ${money(t.ticket?.amount)} khỏi ví ${t.payerName || 'nhà tuyển dụng'} (${money(t.payerBefore)} → ${money(t.payerAfter)}), cộng vào ví freelancer${t.walletBalance !== null ? ` → ${money(t.walletBalance)}` : ''}.` }
          : { label: 'Chuyển tiền: ký quỹ → ví freelancer', desc: `Tiền đã rời ví nhà tuyển dụng lúc đăng tin. Trừ ký quỹ ${t.ticket?.jobId || ''}${t.escrowRemaining !== null ? ` (còn ${money(t.escrowRemaining)})` : ''}, cộng ${money(t.ticket?.amount)} vào ví freelancer${t.walletBalance !== null ? ` → ${money(t.walletBalance)}` : ''}.` }
      ]
    });
  }

  // ---------------------------------------------------------------------
  // SẮP XẾP: MERGESORT / QUICKSORT (ghi vết thật trên mẫu 8 phần tử)
  // ---------------------------------------------------------------------
  dispatchSort(t) {
    const isQuick = t.algo === 'quicksort';
    const name = isQuick ? 'QuickSort (Hoare)' : 'MergeSort';
    const eventFrames = t.events.map((e) => {
      if (e.kind === 'merge') return { label: `Trộn [${e.low}..${e.mid}] + [${e.mid + 1}..${e.high}]`, desc: 'Hai nửa đã có thứ tự được trộn vào mảng phụ rồi chép lại — giữ ổn định với khóa bằng nhau.' };
      if (e.kind === 'skip') return { label: `Bỏ qua trộn [${e.low}..${e.high}]`, desc: 'Phần tử cuối nửa trái ≤ phần tử đầu nửa phải → đoạn đã có thứ tự.' };
      if (e.kind === 'swap') return { label: `Đổi chỗ vị trí ${e.i} ↔ ${e.j}`, desc: 'Hoare: con trỏ trái/phải dừng ở cặp sai phía chốt rồi hoán đổi.' };
      return { label: `Phân hoạch [${e.low}..${e.high}] tại ${e.p}`, desc: 'Mọi phần tử trái ≤ chốt ≤ mọi phần tử phải; đệ quy hai phía.' };
    });
    return this._make(isQuick ? 'QUICKSORT' : 'MERGESORT', {
      lab: isQuick ? 'Sắp xếp nhanh' : 'Sắp xếp trộn',
      title: `${name} theo ${t.field} trên ${t.n.toLocaleString()} việc`,
      bigO: isQuick ? 'O(n log n) TB · O(n²) xấu nhất' : 'O(n log n) · ổn định',
      latency: t.latency,
      summary: `Toàn danh sách: ${t.comparisons.toLocaleString()} phép so sánh${t.swaps !== null ? `, ${t.swaps.toLocaleString()} hoán đổi` : ''} trong ${t.fullMs} ms. Canvas phát lại ${t.totalEvents} bước thật trên 8 việc đầu.`,
      data: t,
      frames: [
        { label: 'Mẫu 8 việc trước khi sắp', desc: `Các thẻ A–H là 8 việc đầu tiên của danh sách hiện tại (${t.field}).` },
        ...eventFrames,
        { label: 'Hoàn tất', desc: `Toàn bộ ${t.n.toLocaleString()} việc đã được sắp bằng ${name}: ${t.comparisons.toLocaleString()} phép so sánh.` }
      ]
    });
  }

  // ---------------------------------------------------------------------
  // KIỂM THỬ TẢI 100.000 THAO TÁC
  // ---------------------------------------------------------------------
  dispatchStressTest({ totalActions = 0, durationMs = 0, throughput = 0, errors = 0, breakdown = null, byOp = null, core = null, invariants = null, ramLabel = '' } = {}) {
    return this._make('STRESS_TEST', {
      lab: 'Kiểm thử tải',
      title: `Kiểm thử tải ${totalActions.toLocaleString()} thao tác trong RAM`,
      bigO: `${throughput.toLocaleString()} ops/s`,
      latency: `${durationMs.toFixed(1)} ms`,
      summary: `Xử lý ${totalActions.toLocaleString()} thao tác trên lõi thật (tìm kiếm, ứng tuyển, rút đơn, hoàn tác, giải ngân) — ${errors} vi phạm trên 7 bất biến.`,
      data: { totalActions, durationMs, throughput, errors, breakdown, byOp, core, invariants, ramLabel },
      frames: [
        { label: 'Xả tác vụ ngẫu nhiên', desc: 'Trộn ngẫu nhiên các thao tác tìm kiếm, ứng tuyển, hoàn tác (Stack LIFO của lõi Lab 3, khác với rút đơn bất kỳ trên giao diện) và giải ngân.' },
        { label: 'Xử lý tốc độ cao', desc: `Thông lượng ${throughput.toLocaleString()} thao tác/giây trên một luồng.` },
        { label: errors === 0 ? 'Bất biến được bảo toàn' : 'Phát hiện vi phạm', desc: `Hoàn tất trong ${durationMs.toFixed(1)} ms với ${errors} vi phạm (tuyển vượt chỉ tiêu / lệch ký quỹ).` }
      ]
    });
  }

  // ---------------------------------------------------------------------
  // TRIE — GỢI Ý TỰ ĐỘNG KHI GÕ O(L)
  // ---------------------------------------------------------------------
  dispatchTrieSuggest(t, type = 'TRIE_SUGGEST') {
    const frames = t.path.map((st) => ({
      label: st.found ? `Đi cạnh '${st.ch}'` : `Không có cạnh '${st.ch}'`,
      desc: st.found
        ? `Tầng ${st.depth}: nút hiện tại có ${st.branching} nhánh con, chọn đúng nhánh '${st.ch}' bằng Map O(1).`
        : `Tầng ${st.depth}: không nút con nào mang ký tự '${st.ch}' → không có từ nào bắt đầu bằng "${t.prefix}". Dừng ngay, không cần quét.`
    }));
    if (t.found) {
      frames.push({ label: 'Gom nhánh con (DFS)', desc: `Duyệt ${t.visited} nút dưới tiền tố "${t.prefix}", gặp ${t.totalUnder} từ hoàn chỉnh.` });
      frames.push({ label: 'Xếp hạng gợi ý', desc: `Sắp theo số việc giảm dần, lấy ${t.suggestions.length} từ đầu: ${t.suggestions.slice(0, 3).map(x => `${x.word} (${x.count})`).join(', ')}${t.suggestions.length > 3 ? '…' : ''}.` });
    }
    return this._make(type, {
      lab: 'Trie · Gợi ý tự động',
      title: `Gợi ý cho tiền tố "${t.prefix}"`,
      bigO: 'O(L) + nhánh con',
      latency: t.latency,
      summary: t.summaryOverride || (t.found
        ? `${t.prefix.length} bước theo ký tự → ${t.totalUnder} từ trong nhánh; từ điển có ${t.vocab.toLocaleString()} từ / ${t.nodes.toLocaleString()} nút, không quét ${t.n.toLocaleString()} bài đăng.`
        : `Dừng ở ký tự thứ ${t.failedAt + 1}: không có từ nào bắt đầu bằng "${t.prefix}".`),
      data: t,
      frames
    });
  }

  // ---------------------------------------------------------------------
  // MIN-HEAP TOP-K — K VIỆC NGÂN SÁCH CAO NHẤT O(n log K)
  // ---------------------------------------------------------------------
  dispatchTopK(t, type = 'HEAP_TOPK') {
    const lr = t.lastReplace;
    const frames = [
      { label: `Dựng heap ${t.k} phần tử`, desc: `Đưa ${t.k} việc đầu tiên vào min-heap (mảng nhị phân). Gốc luôn là việc có ngân sách NHỎ NHẤT trong nhóm Top-${t.k}.` },
      { label: 'So với gốc, loại O(1)', desc: `Duyệt ${t.n.toLocaleString()} việc: ${t.rejects.toLocaleString()} việc (${((t.rejects / Math.max(1, t.n)) * 100).toFixed(1)}%) có ngân sách ≤ gốc nên bị loại chỉ sau 1 phép so sánh.` }
    ];
    if (lr) {
      frames.push({
        label: 'Thay gốc + sift-down',
        desc: `Việc thứ ${lr.index.toLocaleString()} (${money(lr.incoming.budget)}) lớn hơn gốc ${money(lr.removed.budget)} → thay gốc rồi đẩy xuống ${lr.path.length - 1} tầng (chỉ số ${lr.path.join(' → ')}). Tổng ${t.replaces} lần thay.`
      });
    }
    frames.push({ label: `Rút Top-${t.k}`, desc: `Pop ${t.k} lần O(k log k) rồi đảo ngược: #1 = ${t.top[0] ? `${t.top[0].id} ${money(t.top[0].budget)}` : '—'}.` });
    frames.push({ label: 'So với sắp xếp toàn bộ', desc: `Heap: ${t.comparisons.toLocaleString()} phép so sánh, ${t.heapLatency}. Sắp xếp toàn bộ: ${t.sortComparisons.toLocaleString()} phép so sánh, ${t.sortLatency}. Kết quả ${t.same ? 'trùng khớp' : 'KHÔNG khớp'}.` });
    return this._make(type, {
      lab: 'Min-Heap · Top-K',
      title: `Top ${t.k} ngân sách cao nhất trong ${t.n.toLocaleString()} việc`,
      bigO: 'O(n log k)',
      latency: t.heapLatency,
      summary: t.summaryOverride || `${t.comparisons.toLocaleString()} so sánh (heap) so với ${t.sortComparisons.toLocaleString()} (sắp xếp toàn bộ) — ${t.rejects.toLocaleString()} việc bị loại ngay ở gốc.`,
      data: t,
      frames
    });
  }

  // ---------------------------------------------------------------------
  // LRU CACHE — BẢNG BĂM + DSLK ĐÔI, get/put O(1)
  // ---------------------------------------------------------------------
  dispatchLRU(t, type = 'LRU_CACHE') {
    const what = t.kind === 'recent' ? 'Việc vừa xem' : 'Cache tìm kiếm';
    const frames = [
      { label: 'Tra bảng băm O(1)', desc: `Map.get("${t.key}") → ${t.hit ? `CÓ, nút đang ở vị trí ${t.fromPos} trong DSLK đôi` : 'KHÔNG có (cache miss)'}.` }
    ];
    if (t.hit) {
      frames.push({ label: 'Tháo nút ra', desc: `Nối prev ↔ next của nút "${t.key}" với nhau: 2 phép gán con trỏ, không dịch chuyển phần tử nào.` });
      frames.push({ label: 'Gắn lên đầu', desc: `Chèn nút ngay sau head: nút vừa dùng trở thành "mới nhất".${t.kind === 'search' ? ` Tiết kiệm ${Number(t.savedComparisons || 0).toLocaleString()} phép so sánh của lượt quét tuyến tính.` : ''}` });
    } else {
      frames.push({ label: 'Tạo nút mới ở đầu', desc: `${t.kind === 'search' ? `Chạy quét tuyến tính (${t.missLatency}) rồi lưu ${Number(t.matchesCount || 0).toLocaleString()} con trỏ kết quả` : 'Lưu con trỏ tới JobPost'} vào nút mới sau head, ghi vào Map.` });
      frames.push(t.evicted
        ? { label: 'Đầy → loại nút cuối', desc: `Vượt dung lượng ${t.capacity}: tháo nút sát tail "${t.evicted}" (lâu chưa dùng nhất) và xóa khỏi Map — O(1).` }
        : { label: 'Chưa đầy', desc: `Cache đang có ${t.keysAfter.length}/${t.capacity} nút, chưa phải loại nút nào.` });
    }
    const st = t.stats;
    frames.push({ label: 'Thống kê', desc: `Hit ${st.hits} · Miss ${st.misses} · Bị loại ${st.evictions} · Tỉ lệ hit ${(st.hitRate * 100).toFixed(1)}%.` });
    return this._make(type, {
      lab: `LRU Cache · ${what}`,
      title: `${t.hit ? 'Cache HIT' : 'Cache MISS'}: "${t.key}"`,
      bigO: 'O(1) get / put',
      latency: t.latency,
      summary: t.summaryOverride || (t.hit
        ? `Nút "${t.key}" được kéo từ vị trí ${t.fromPos} lên đầu danh sách.`
        : `Thêm "${t.key}" vào đầu${t.evicted ? `, loại "${t.evicted}" ở cuối` : ''}. Cache ${t.keysAfter.length}/${t.capacity}.`),
      data: t,
      frames
    });
  }

  // ---------------------------------------------------------------------
  // TOKEN BUCKET — GIỚI HẠN 5 HỒ SƠ / 10 GIÂY, O(1)
  // ---------------------------------------------------------------------
  dispatchTokenBucket(t, type = 'TOKEN_BUCKET') {
    const f1 = (n) => Number(n || 0).toFixed(2);
    const frames = [
      { label: 'Nạp lại theo thời gian', desc: `Đã trôi ${(t.elapsedMs / 1000).toFixed(2)} giây × ${t.refillPerSec} token/giây = +${f1(t.refilled)} token → ${f1(t.tokensAfterRefill)} / ${t.capacity} (không vượt dung lượng).` },
      { label: 'Kiểm tra ≥ 1 token', desc: `tokens = ${f1(t.tokensAfterRefill)} ${t.tokensAfterRefill >= 1 ? '≥' : '<'} 1 → ${t.tokensAfterRefill >= 1 ? 'đủ để nộp' : 'KHÔNG đủ'}. Chỉ 1 phép so sánh, không cần lưu lịch sử từng lần nộp.` },
      t.allowed
        ? { label: 'Lấy 1 token → CHO PHÉP', desc: `tokens −= 1 → còn ${f1(t.tokensAfter)}. Hồ sơ đi tiếp vào DSLK đôi của dự án.` }
        : { label: 'Xô rỗng → TỪ CHỐI', desc: `Cần chờ (1 − ${f1(t.tokensAfter)}) ÷ ${t.refillPerSec} = ${(t.waitMs / 1000).toFixed(1)} giây cho token kế tiếp. Chặn spam mà không chặn người dùng thật.` },
      { label: 'Thống kê', desc: `Cho phép ${t.stats.allowed} · Từ chối ${t.stats.rejected}. Bộ nhớ: chỉ 2 số (tokens, lastRefill) cho mỗi freelancer — O(1).` }
    ];
    return this._make(type, {
      lab: 'Token Bucket · Rate Limiter',
      title: t.peek ? `Xô token của ${t.user}: ${f1(t.tokensAfter)} / ${t.capacity}` : `${t.allowed ? 'CHO PHÉP' : 'TỪ CHỐI'} hồ sơ của ${t.user}`,
      bigO: 'O(1)',
      latency: t.latency,
      summary: t.summaryOverride || (t.allowed
        ? `Còn ${f1(t.tokensAfter)} / ${t.capacity} token — nạp lại ${t.refillPerSec} token/giây.`
        : `Hết token: chờ ${(t.waitMs / 1000).toFixed(1)} giây. Giới hạn ${t.capacity} hồ sơ / ${Math.round(t.capacity / t.refillPerSec)} giây.`),
      data: t,
      frames
    });
  }

  // ---------------------------------------------------------------------
  // BAYESIAN AVERAGE — UY TÍN THỰC
  // ---------------------------------------------------------------------
  dispatchBayes(t, type = 'BAYES_RANK') {
    const ex = t.example;
    const frames = [
      { label: 'Xếp theo sao thô', desc: `Top theo điểm thô: ${t.rawTop.slice(0, 3).map(x => `${x.id} ${x.R.toFixed(1)}★ (${x.v} đánh giá)`).join(', ')}… — nhiều khách chỉ có vài đánh giá.` },
      { label: 'Tính trung bình sàn C', desc: `Duyệt 1 lần O(n): C = ${t.C.toFixed(3)}★. m = ${t.m} là "số đánh giá ảo" — độ tin trước khi có bằng chứng.` },
      ex
        ? { label: 'Áp công thức', desc: `${ex.id}: (v·R + m·C) / (v + m) = (${ex.v}·${ex.R.toFixed(1)} + ${t.m}·${t.C.toFixed(2)}) / (${ex.v} + ${t.m}) = ${ex.score.toFixed(3)}. v nhỏ → điểm bị kéo về C.` }
        : { label: 'Áp công thức', desc: 'score = (v·R + m·C) / (v + m).' },
      { label: 'Sắp xếp theo Bayes', desc: `MergeSort ổn định O(n log n) trên ${t.n.toLocaleString()} việc (${t.sortLatency}). #1 = ${t.bayesTop[0] ? `${t.bayesTop[0].id} (${t.bayesTop[0].R.toFixed(1)}★, ${t.bayesTop[0].v} đánh giá → ${t.bayesTop[0].score.toFixed(3)})` : '—'}.` },
      { label: 'So sánh hai bảng', desc: `${t.dropped} / ${t.rawTop.length} việc trong top sao thô bị đẩy ra khỏi top Bayes vì quá ít đánh giá.` }
    ];
    return this._make(type, {
      lab: 'Bayesian Average · Xếp hạng',
      title: `Uy tín thực trên ${t.n.toLocaleString()} việc (C = ${t.C.toFixed(2)}★, m = ${t.m})`,
      bigO: 'O(n) + O(n log n)',
      latency: t.latency,
      summary: t.summaryOverride || `${t.dropped} việc "5★ nhưng ít đánh giá" rơi khỏi top — điểm Bayes thưởng cho bằng chứng nhiều hơn.`,
      data: t,
      frames
    });
  }

  // ---------------------------------------------------------------------
  // JACCARD — VIỆC TƯƠNG TỰ
  // ---------------------------------------------------------------------
  dispatchJaccard(t, type = 'JACCARD_SIM') {
    const b = t.top[0];
    const frames = [
      { label: 'Lấy ứng viên từ bảng băm', desc: `hash("${t.skill}") → ô ${t.bucket} (${t.steps} bước). Chỉ ${t.m.toLocaleString()} / ${t.n.toLocaleString()} việc cùng kỹ năng được so — O(m), không quét cả sàn.` },
      { label: 'Tập đặc trưng A', desc: `${t.jobId}: { ${t.A.join(', ')} } — ${t.A.length} phần tử.` },
      b
        ? { label: 'Giao và hợp', desc: `So với ${b.id}: |A ∩ B| = ${b.inter}, |A ∪ B| = ${b.union} → J = ${b.inter}/${b.union} = ${b.score.toFixed(3)}.` }
        : { label: 'Giao và hợp', desc: 'Không có việc nào khác cùng kỹ năng.' },
      { label: 'Top-5 bằng Min-Heap', desc: `${t.comparisons.toLocaleString()} phép tính Jaccard, giữ 5 điểm cao nhất bằng min-heap O(m log 5). Hòa điểm → ngân sách gần hơn đứng trước.` }
    ];
    return this._make(type, {
      lab: 'Jaccard · Việc tương tự',
      title: `5 việc giống ${t.jobId} nhất (${t.m.toLocaleString()} ứng viên)`,
      bigO: 'O(m · f)',
      latency: t.latency,
      summary: t.summaryOverride || (b ? `#1 = ${b.id} với J = ${b.score.toFixed(2)} (${b.inter} đặc trưng chung / ${b.union}).` : 'Không có ứng viên.'),
      data: t,
      frames
    });
  }

  /**
   * Thiết lập thao tác hiện hành và lưu lịch sử
   */
  setAction(action) {
    this.state.activeAction = action;
    this.state.actionHistory.unshift(action);
    if (this.state.actionHistory.length > 20) {
      this.state.actionHistory.pop();
    }
  }

  /**
   * Xóa trạng thái về chế độ nghỉ (Idle)
   */
  clearAction() {
    this.state.activeAction = null;
  }
}

export const DSAActionBridge = new DSAActionBridgeStore();
