/**
 * DSALessons — "Thư viện bài học" cho Live Inspector Canvas.
 *
 * Mỗi bài học CHẠY THẬT các lớp cấu trúc dữ liệu của dự án (SinglyLinkedList, BinarySearchTree,
 * AVLTree, CircularQueue, MergeSort, QuickSort, MoveToFrontHistory, TransposeHistory) trên dữ liệu
 * lấy từ mảng gốc MarketplaceEngine.jobs (chỉ giữ con trỏ, không clone), ghi lại vết từng bước rồi
 * gửi sang DSAActionBridge để canvas vẽ. Không có con số minh họa cố định nào.
 *
 * Mục đích: bổ sung những phần của 7 bài lab mà thao tác thường ngày trên sàn không tự kích hoạt
 * (truy cập chỉ số O(1), DSLK đơn, BST suy biến & đủ 4 phép xoay AVL, hàng đợi vòng,
 * tính ổn định khi sắp xếp, so sánh Move-to-Front với Transpose).
 */

import { DSAActionBridge } from './DSAActionBridge.js';
import { MarketplaceEngine } from '../../marketplace-hub/controllers/MarketplaceEngine.js';
import { SinglyLinkedList } from '../../proposals/models/SinglyLinkedList.js';
import { CircularQueue } from '../../escrow-payout/models/CircularQueue.js';
import { BinarySearchTree } from '../../job-index/models/BinarySearchTree.js';
import { AVLTree } from '../../job-index/models/AVLTree.js';
import { MergeSort } from '../../job-sorting/models/MergeSort.js';
import { QuickSort } from '../../job-sorting/models/QuickSort.js';
import { MoveToFrontHistory } from '../../skill-search/models/MoveToFrontHistory.js';
import { TransposeHistory } from '../../skill-search/models/TransposeHistory.js';
import { Trie } from '../../ecommerce-extras/models/Trie.js';
import { LRUCache } from '../../ecommerce-extras/models/LRUCache.js';
import { TokenBucket } from '../../ecommerce-extras/models/TokenBucket.js';

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const us = (ms) => (ms * 1000 < 1 ? `${(ms * 1e6).toFixed(0)} ns` : `${(ms * 1000).toFixed(1)} µs`);
const money = (v) => `$${Number(v || 0).toLocaleString('en-US')}`;

function jobsArray() {
  const arr = MarketplaceEngine.jobs;
  return Array.isArray(arr) ? arr : [];
}

// Chụp cây thành danh sách nút {key, depth, order} để canvas tự xếp tọa độ (thứ tự trung tố = trục x)
function snapshotTree(root) {
  const nodes = [];
  const edges = [];
  let order = 0;
  const walk = (node, depth, parentKey) => {
    if (!node) return;
    walk(node.left, depth + 1, node.key);
    nodes.push({ key: node.key, depth, order: order++ });
    if (parentKey !== null) edges.push([parentKey, node.key]);
    walk(node.right, depth + 1, node.key);
  };
  walk(root, 0, null);
  const height = nodes.reduce((m, n) => Math.max(m, n.depth + 1), 0);
  return { nodes, edges, height, size: nodes.length };
}

// =====================================================================
// 1. MẢNG TĨNH — truy cập theo chỉ số O(1) so với quét tuyến tính O(n)
// =====================================================================
function lessonArrayIndex() {
  const jobs = jobsArray();
  const n = jobs.length;
  if (!n) return null;
  const index = Math.floor(n * (0.55 + Math.random() * 0.4));

  const job = jobs[index];               // O(1): một phép tính địa chỉ
  // Đồng hồ trình duyệt chỉ chính xác ~0.1 ms -> đo trung bình 200.000 lần đọc theo chỉ số
  const REP = 200000;
  let sink = 0;
  const t0 = now();
  for (let r = 0; r < REP; r++) sink += jobs[(index + r) % n].budget;
  const tIndex = (now() - t0) / REP;
  if (sink < 0) console.log(sink);

  const t1 = now();
  let steps = 0;
  for (let i = 0; i < n; i++) {           // O(n): quét tới khi gặp đúng mã việc
    steps++;
    if (jobs[i].id === job.id) break;
  }
  const tLinear = now() - t1;

  const window = [];
  for (let i = Math.max(0, index - 3); i <= Math.min(n - 1, index + 3); i++) {
    window.push({ i, id: jobs[i].id, budget: jobs[i].budget, skill: jobs[i].skillTag });
  }
  const data = {
    n, index, steps, window, slotBytes: 8,
    job: { id: job.id, title: job.title, budget: job.budget, skill: job.skillTag },
    indexLatency: us(tIndex), linearLatency: us(tLinear)
  };
  return DSAActionBridge._make('LESSON_ARRAY', {
    lab: 'Mảng tĩnh · ADT JobPost',
    title: `Truy cập jobs[${index.toLocaleString()}] theo chỉ số`,
    bigO: 'O(1) vs O(n)',
    latency: us(tIndex),
    summary: `Biết chỉ số → nhảy thẳng 1 bước (${us(tIndex)}). Chỉ biết mã việc → quét ${steps.toLocaleString()} ô (${us(tLinear)}).`,
    data,
    frames: [
      { label: 'Mảng = dãy ô nhớ liền kề', desc: `${n.toLocaleString()} con trỏ JobPost nằm sát nhau trong RAM, mỗi ô ${data.slotBytes} byte. Ô thứ i luôn nằm ở vị trí cố định.` },
      { label: 'Tính địa chỉ', desc: `Địa chỉ(jobs[${index}]) = gốc + ${index} × ${data.slotBytes} byte. Chỉ là một phép nhân và một phép cộng, không cần nhìn các ô khác.` },
      { label: 'Nhảy thẳng tới ô', desc: `Đọc được ${job.id} · ${money(job.budget)} ngay lập tức. Dù mảng có 10 hay 10 triệu phần tử, số bước vẫn là 1 → O(1).` },
      { label: 'So với quét tuyến tính', desc: `Nếu chỉ biết mã ${job.id} mà không biết vị trí, phải so từ jobs[0] → ${steps.toLocaleString()} lần so sánh → O(n). Vì vậy dự án dựng thêm cây AVL và bảng băm làm chỉ mục.` }
    ]
  });
}

// =====================================================================
// 2. DSLK ĐƠN — danh mục việc đã lưu (Bookmarks)
// =====================================================================
function lessonSinglyList() {
  const jobs = jobsArray();
  if (jobs.length < 5) return null;
  const list = new SinglyLinkedList();
  const picks = [];
  const start = Math.floor(Math.random() * (jobs.length - 5));
  for (let k = 0; k < 5; k++) picks.push(jobs[start + k * 1]);

  const t0 = now();
  for (const j of picks) list.insertHead({ id: `BM-${j.id}`, jobId: j.id, freelancerId: 'USR-FL-001', bidAmount: j.budget });
  const tInsert = now() - t0;

  const before = list.toArray().map(nd => ({ id: nd.id, jobId: nd.jobId, budget: nd.bidAmount }));
  const targetPos = 2;
  const target = before[targetPos];

  const t1 = now();
  const ok = list.removeById(target.id);
  const tRemove = now() - t1;
  const after = list.toArray().map(nd => ({ id: nd.id, jobId: nd.jobId, budget: nd.bidAmount }));

  const data = { before, after, targetPos, target, ok, size: list.getSize() };
  return DSAActionBridge._make('LESSON_SLL', {
    lab: 'DSLK đơn · Việc đã lưu',
    title: `Lưu 5 việc rồi bỏ lưu ${target.jobId}`,
    bigO: 'insertHead O(1) · removeById O(n)',
    latency: us(tInsert + tRemove),
    summary: `5 lần insertHead mất ${us(tInsert)}; removeById phải đi ${targetPos} bước để tìm nút đứng trước (${us(tRemove)}).`,
    data,
    frames: [
      { label: 'insertHead × 5', desc: 'Mỗi việc được lưu tạo một nút mới; nút mới trỏ next vào head cũ rồi trở thành head. Không phải dời phần tử nào → O(1).' },
      { label: 'Chuỗi next một chiều', desc: 'head → … → null. Mỗi nút chỉ biết nút ĐI SAU nó, không biết nút đứng trước.' },
      { label: 'Tìm nút cần xóa', desc: `Muốn bỏ lưu ${target.jobId}: dùng 2 con trỏ prev & current đi từ head, mất ${targetPos} bước mới tới. Đây là điểm yếu của DSLK đơn.` },
      { label: 'prev.next = current.next', desc: 'Nối tắt qua nút cần xóa; nút đó không còn ai trỏ tới và được bộ gom rác thu hồi.' },
      { label: 'Kết quả & so với DSLK đôi', desc: `Còn ${data.size} nút. Hồ sơ ứng tuyển dùng DSLK ĐÔI (có prev) nên khi đã cầm con trỏ nút thì rút đơn chỉ mất O(1), không cần đi tìm.` }
    ]
  });
}

// =====================================================================
// 3. HÀNG ĐỢI VÒNG (Circular Queue) — giải ngân FIFO trên mảng cố định
// =====================================================================
function lessonCircularQueue() {
  const cap = 5;
  const q = new CircularQueue(cap);
  const snaps = [];
  const snap = (op, note) => snaps.push({
    op, note,
    buffer: Array.from({ length: cap }, (_, i) => (q.buffer[i] ? q.buffer[i].label : null)),
    front: q.front, rear: q.rear, size: q.size
  });
  // Buffer có thể còn tham chiếu phần tử đã dequeue -> chỉ hiện ô thuộc vùng [front..rear]
  const live = () => {
    const s = snaps[snaps.length - 1];
    const keep = new Set();
    for (let k = 0; k < s.size; k++) keep.add((s.front + k) % cap);
    s.buffer = s.buffer.map((v, i) => (keep.has(i) ? v : null));
  };
  snap('Khởi tạo', `Mảng cố định ${cap} ô, front = 0, rear = -1.`); live();
  for (let k = 1; k <= 4; k++) { q.enqueue({ label: `T${k}` }); snap(`enqueue(T${k})`, `rear = (rear + 1) % ${cap}`); live(); }
  for (let k = 0; k < 2; k++) { const x = q.dequeue(); snap(`dequeue() → ${x?.label}`, `front = (front + 1) % ${cap}`); live(); }
  for (let k = 5; k <= 7; k++) { q.enqueue({ label: `T${k}` }); snap(`enqueue(T${k})`, `rear = (rear + 1) % ${cap}`); live(); }

  const wrapStep = snaps.findIndex((s, i) => i > 0 && snaps[i - 1].rear > s.rear && s.op.startsWith('enqueue'));
  const frames = snaps.map((s, i) => ({
    label: s.op,
    desc: i === 0
      ? 'Hàng đợi giải ngân dùng mảng cố định. front chỉ ô sắp được trả tiền, rear chỉ ô vừa xếp hàng.'
      : i === wrapStep
        ? `rear chạy tới cuối mảng rồi QUAY VÒNG về ô ${s.rear} (phép chia lấy dư). Không cần dời phần tử nào, các ô đã giải ngân được tái sử dụng.`
        : s.op.startsWith('dequeue')
          ? `Vé đứng đầu được giải ngân trước (FIFO). ${s.note} → front = ${s.front}. O(1).`
          : `${s.note} → rear = ${s.rear}, size = ${s.size}. O(1).`
  }));
  return DSAActionBridge._make('LESSON_CQUEUE', {
    lab: 'Hàng đợi vòng · Giải ngân FIFO',
    title: 'Hàng đợi vòng 5 ô: rear quay vòng về đầu mảng',
    bigO: 'enqueue/dequeue O(1)',
    latency: '—',
    summary: `7 lần enqueue và 2 lần dequeue trên CircularQueue thật (capacity ${cap}); rear quay vòng ở bước ${wrapStep + 1}.`,
    data: { cap, snaps, wrapStep },
    frames
  });
}

// =====================================================================
// 4. BST SUY BIẾN vs AVL + đủ 4 phép xoay
// =====================================================================
function lessonBstVsAvl() {
  const keys = [10, 20, 30, 40, 50, 60, 70];
  const bst = new BinarySearchTree();
  const avl = new AVLTree();
  for (const k of keys) { bst.insert(k); avl.insert(k); }
  const bstSnap = snapshotTree(bst.root);
  const avlSnap = snapshotTree(avl.root);

  const cases = [
    { seq: [30, 20, 10], name: 'Lệch Trái-Trái' },
    { seq: [10, 20, 30], name: 'Lệch Phải-Phải' },
    { seq: [30, 10, 20], name: 'Lệch Trái-Phải' },
    { seq: [10, 30, 20], name: 'Lệch Phải-Trái' }
  ].map(c => {
    const b = new BinarySearchTree();
    const a = new AVLTree();
    c.seq.forEach(k => { b.insert(k); a.insert(k); });
    const rc = a.rotationsCount;
    const kind = ['LL', 'RR', 'LR', 'RL'].find(r => rc[r] > 0) || '—';
    return { ...c, kind, before: snapshotTree(b.root), after: snapshotTree(a.root) };
  });

  const data = { keys, bst: bstSnap, avl: avlSnap, rotations: { ...avl.rotationsCount }, cases };
  return DSAActionBridge._make('LESSON_BST_AVL', {
    lab: 'BST & AVL · Chỉ mục mã việc',
    title: 'Chèn mã việc tăng dần: BST suy biến, AVL tự cân bằng',
    bigO: 'BST O(n) · AVL O(log n)',
    latency: '—',
    summary: `Cùng 7 khóa tăng dần: BST cao ${bstSnap.height}, AVL cao ${avlSnap.height} sau ${avl.rotationsCount.total} lần xoay. Mã việc trên sàn tự tăng nên đây chính là tình huống thật.`,
    data,
    frames: [
      { label: 'Chèn khóa tăng dần vào BST', desc: `Mã việc tự tăng (${keys.join(', ')}): khóa sau luôn lớn hơn nên luôn rẽ phải.` },
      { label: 'BST suy biến thành "que"', desc: `Cây cao ${bstSnap.height} = số nút. Tìm khóa cuối phải đi ${bstSnap.height} bước, chẳng khác gì danh sách liên kết → O(n).` },
      { label: 'AVL: cùng dãy khóa', desc: `Sau mỗi lần chèn, AVL kiểm tra hệ số cân bằng = cao(trái) − cao(phải). Nếu vượt ±1 thì xoay. Đã xoay ${avl.rotationsCount.total} lần.` },
      { label: 'AVL cao ' + avlSnap.height, desc: `Chiều cao ≈ log₂(${keys.length}) → tìm kiếm tối đa ${avlSnap.height} bước. Với 100.000 việc, AVL cao ~17 thay vì 100.000.` },
      { label: '4 kiểu mất cân bằng', desc: 'Mỗi ô bên dưới chèn 3 khóa vào BST (trái) và AVL (phải). LL/RR xoay 1 lần; LR/RL là "gấp khúc" nên xoay 2 lần.' },
      ...cases.map(c => ({
        label: `Ca ${c.kind}: chèn ${c.seq.join(' → ')}`,
        desc: c.kind === 'LL' ? 'Nút 30 lệch trái 2 bậc, con trái cũng lệch trái → xoay PHẢI một lần quanh 30; 20 lên làm gốc.'
          : c.kind === 'RR' ? 'Nút 10 lệch phải 2 bậc, con phải cũng lệch phải → xoay TRÁI một lần quanh 10; 20 lên làm gốc.'
          : c.kind === 'LR' ? 'Lệch trái nhưng con trái lại lệch phải (gấp khúc) → xoay trái ở 10 cho thẳng, rồi xoay phải ở 30.'
          : c.kind === 'RL' ? 'Lệch phải nhưng con phải lại lệch trái (gấp khúc) → xoay phải ở 30 cho thẳng, rồi xoay trái ở 10.'
          : 'Không phát sinh phép xoay.'
      }))
    ]
  });
}

// =====================================================================
// 5. TÍNH ỔN ĐỊNH: MergeSort vs QuickSort trên các việc CÙNG ngân sách
// =====================================================================
function stableCheck(original, sorted) {
  const pos = new Map(original.map((r, i) => [r, i]));
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].budget === sorted[i - 1].budget && pos.get(sorted[i]) < pos.get(sorted[i - 1])) return false;
  }
  return true;
}

function lessonSortStability() {
  const jobs = jobsArray();
  // Gom các việc trùng ngân sách (con trỏ tới JobPost gốc)
  const groups = new Map();
  for (const j of jobs) {
    if (!groups.has(j.budget)) groups.set(j.budget, []);
    const g = groups.get(j.budget);
    if (g.length < 3) g.push(j);
  }
  const dupBudgets = [...groups.entries()].filter(([, g]) => g.length >= 2);
  if (dupBudgets.length < 2) return null;

  const cmp = (a, b) => a.budget - b.budget; // tăng dần theo ngân sách
  let best = null;
  for (let attempt = 0; attempt < 40; attempt++) {
    const chosen = [];
    const pool = [...dupBudgets].sort(() => Math.random() - 0.5).slice(0, 3);
    pool.forEach(([, g]) => chosen.push(...g.slice(0, pool.length === 3 ? 2 : 3)));
    const original = chosen.sort(() => Math.random() - 0.5).slice(0, 7);
    const m = MergeSort.sort(original, { criteria: cmp });
    const q = QuickSort.sort(original, { criteria: cmp, partitionScheme: 'lomuto', useMedianOfThree: true });
    best = { original, m, q };
    if (!stableCheck(original, q.sorted)) break; // tìm được ví dụ lộ rõ tính không ổn định
  }
  const { original, m, q } = best;

  // Nhãn a₁, a₂… theo thứ tự xuất hiện ban đầu trong cùng một mức ngân sách
  // (chỉ lưu nhãn trong Map riêng, không ghi gì vào object JobPost gốc)
  const SUB = ['₁', '₂', '₃', '₄'];
  const letter = new Map();
  const count = new Map();
  const tags = new Map();
  let code = 65;
  for (const r of original) {
    if (!letter.has(r.budget)) letter.set(r.budget, String.fromCharCode(code++));
    const c = count.get(r.budget) || 0;
    count.set(r.budget, c + 1);
    tags.set(r, `${letter.get(r.budget)}${SUB[c]}`);
  }
  const view = (arr) => arr.map(r => ({ tag: tags.get(r), id: r.id, budget: r.budget }));

  const mergeStable = stableCheck(original, m.sorted);
  const quickStable = stableCheck(original, q.sorted);
  const data = {
    original: view(original), merge: view(m.sorted), quick: view(q.sorted),
    mergeStable, quickStable, mergeCmp: m.comparisons, quickCmp: q.comparisons, quickSwaps: q.swaps
  };
  return DSAActionBridge._make('LESSON_STABILITY', {
    lab: 'Sắp xếp · Tính ổn định',
    title: 'Sắp các việc cùng ngân sách: ai giữ được thứ tự cũ?',
    bigO: 'O(n log n)',
    latency: `${m.durationMs} ms / ${q.durationMs} ms`,
    summary: `MergeSort ${mergeStable ? 'GIỮ' : 'ĐẢO'} thứ tự các việc bằng giá; QuickSort ${quickStable ? 'lần này tình cờ giữ' : 'ĐẢO'} thứ tự (${q.swaps} lần hoán đổi).`,
    data,
    frames: [
      { label: 'Dữ liệu ban đầu', desc: 'Các việc cùng chữ cái có CÙNG ngân sách. Số nhỏ (₁, ₂) là thứ tự chúng đang đứng, ví dụ do được đăng trước/sau.' },
      { label: 'MergeSort (ổn định)', desc: `Khi hai việc bằng giá, phép trộn luôn lấy phần tử bên trái trước nên A₁ vẫn đứng trước A₂. ${data.mergeCmp} phép so sánh.` },
      { label: 'QuickSort (không ổn định)', desc: `Phép phân hoạch hoán đổi các phần tử ở xa nhau nên các việc bằng giá có thể bị đảo. ${quickStable ? 'Lần chạy này tình cờ không đảo, nhưng không có gì bảo đảm.' : 'Ở đây đã xảy ra đảo thứ tự (khung đỏ).'}` },
      { label: 'Vì sao quan trọng', desc: 'Sắp nhiều tiêu chí: sắp theo deadline trước, rồi sắp ổn định theo ngân sách → các việc cùng giá vẫn giữ thứ tự deadline. Đó là lý do bộ lọc đa tiêu chí dùng MergeSort.' }
    ]
  });
}

// =====================================================================
// 6. DANH SÁCH TỰ TỔ CHỨC: Move-to-Front vs Transpose
// =====================================================================
function lessonMtfVsTranspose() {
  const seq = ['react', 'python', 'figma', 'node', 'react', 'react', 'sql', 'react', 'python', 'react'];
  const mtf = new MoveToFrontHistory(10);
  const tr = new TransposeHistory(10);
  const steps = seq.map(key => {
    const a = mtf.access(key);
    const b = tr.access(key);
    return {
      key,
      mtf: { hit: a.isHit, pos: a.positionFound, steps: a.steps, list: a.history },
      tr: { hit: b.isHit, pos: b.positionFound, steps: b.steps, list: b.history }
    };
  });
  let sm = 0, st = 0;
  steps.forEach(s => { sm += s.mtf.steps; st += s.tr.steps; s.mtfTotal = sm; s.trTotal = st; });

  const frames = steps.map((s, i) => ({
    label: `Tìm "${s.key}"`,
    desc: (s.mtf.hit
      ? `MTF: thấy ở vị trí ${s.mtf.pos} (${s.mtf.steps} bước) → đưa thẳng lên đầu. `
      : `MTF: chưa có (${s.mtf.steps} bước) → chèn vào đầu. `) +
      (s.tr.hit
        ? `Transpose: thấy ở vị trí ${s.tr.pos} (${s.tr.steps} bước) → ${s.tr.pos > 0 ? 'chỉ đổi chỗ với phần tử ngay trước' : 'đã ở đầu, giữ nguyên'}.`
        : `Transpose: chưa có (${s.tr.steps} bước) → thêm vào cuối.`)
  }));
  frames.push({
    label: 'Tổng kết',
    desc: `Tổng số bước: MTF ${sm}, Transpose ${st}. MTF thích nghi nhanh với từ khóa vừa dùng nhưng một lần tìm lẻ ("sql") cũng nhảy lên đầu; Transpose leo từ từ nên ổn định hơn khi thói quen tìm kiếm ít thay đổi.`
  });
  return DSAActionBridge._make('LESSON_SELFORG', {
    lab: 'Danh sách tự tổ chức · Lịch sử tìm kiếm',
    title: 'Move-to-Front vs Transpose trên cùng chuỗi tìm kiếm',
    bigO: 'O(k) mỗi lần truy cập',
    latency: '—',
    summary: `${seq.length} lượt tìm: MTF tốn ${sm} bước, Transpose tốn ${st} bước (k = vị trí của từ khóa trong danh sách).`,
    data: { seq, steps },
    frames
  });
}

// ---------------------------------------------------------------------------
// TMĐT 1 — TRIE: dựng Trie MỚI từ 3.000 bài đầu rồi gợi ý cho tiền tố của từ phổ biến nhất
// ---------------------------------------------------------------------------
function lessonTrie() {
  const jobs = jobsArray();
  if (jobs.length < 50) return null;
  const sample = jobs.slice(0, Math.min(3000, jobs.length)); // mảng con trỏ, không clone
  const trie = new Trie();
  const t0 = now();
  for (const j of sample) trie.indexJob(j);
  const buildMs = now() - t0;
  const top = trie.entries().sort((x, y) => y[1] - x[1])[0];
  const prefix = top ? top[0].slice(0, 2) : 're';
  const t1 = now();
  const res = trie.suggest(prefix, 8);
  const ms = now() - t1;
  const naive = Trie.naiveSuggest(trie.entries(), prefix, 8);
  const trace = {
    prefix: res.prefix,
    found: res.found,
    path: res.path,
    failedAt: res.failedAt ?? -1,
    suggestions: res.suggestions,
    visited: res.visited,
    totalUnder: res.totalUnder,
    vocab: trie.wordCount,
    nodes: trie.nodeCount,
    n: sample.length,
    latency: us(ms),
    buildLatency: us(buildMs),
    naiveComparisons: naive.comparisons
  };
  trace.summaryOverride = `Trie dựng mới từ ${sample.length.toLocaleString()} bài (${us(buildMs)}): "${prefix}" chỉ cần ${res.path.length} bước, còn quét từ điển cần ${naive.comparisons.toLocaleString()} phép so sánh startsWith.`;
  return DSAActionBridge.dispatchTrieSuggest(trace, 'LESSON_TRIE');
}

// ---------------------------------------------------------------------------
// TMĐT 2 — MIN-HEAP TOP-7 trên toàn bộ mảng gốc (cây 3 tầng dễ quan sát sift-down)
// ---------------------------------------------------------------------------
function lessonHeapTopK() {
  const jobs = jobsArray();
  if (jobs.length < 20) return null;
  const { trace } = MarketplaceEngine.topK(7, jobs);
  return DSAActionBridge.dispatchTopK(trace, 'LESSON_HEAP');
}

// ---------------------------------------------------------------------------
// TMĐT 3 — LRU dung lượng 3 với chuỗi kỹ năng thật: A, B, C, A (hit), D (loại B)
// ---------------------------------------------------------------------------
function lessonLRU() {
  const jobs = jobsArray();
  const skills = [];
  for (let i = 0; i < jobs.length && skills.length < 4; i++) {
    const sk = String(jobs[i].skillTag || '').toLowerCase();
    if (sk && !skills.includes(sk)) skills.push(sk);
  }
  if (skills.length < 4) return null;
  const [A, B, C, D] = skills;
  const cache = new LRUCache(3);
  const seqKeys = [A, B, C, A, D];
  const seq = [];
  let trace = null;
  seqKeys.forEach((key, idx) => {
    const keysBefore = cache.keys();
    const fromPos = cache.positionOf(key);
    const t0 = now();
    const got = cache.get(key);
    let evicted = null;
    if (!got.hit) {
      // giá trị = mảng CON TRỎ tới các việc cùng kỹ năng trong 2.000 bài đầu
      const matches = [];
      for (let i = 0; i < Math.min(2000, jobs.length); i++) if (String(jobs[i].skillTag).toLowerCase() === key) matches.push(jobs[i]);
      evicted = cache.put(key, matches).evicted;
    }
    const ms = now() - t0;
    seq.push({ key, hit: got.hit });
    if (idx === seqKeys.length - 1) {
      trace = {
        ...MarketplaceEngine._lruTrace(cache, key, got.hit ? 'get' : 'put', got.hit, evicted, fromPos, keysBefore, (k) => k),
        kind: 'search',
        matchesCount: (cache.peek(key) || []).length,
        missLatency: us(ms),
        latency: us(ms),
        seq
      };
    }
  });
  trace.summaryOverride = `Chuỗi ${seqKeys.join(' → ')} với dung lượng 3: "${A}" được dùng lại nên lên đầu; "${D}" vào thì "${trace.evicted}" (lâu chưa dùng nhất) bị loại.`;
  return DSAActionBridge.dispatchLRU(trace, 'LESSON_LRU');
}

// ---------------------------------------------------------------------------
// TMĐT 4 — TOKEN BUCKET: 8 lần bấm "Nộp" trên đồng hồ giả lập (5 token, 0.5 token/giây)
// ---------------------------------------------------------------------------
function lessonTokenBucket() {
  let clock = 0;
  const bucket = new TokenBucket(5, 0.5, () => clock);
  const times = [0, 150, 300, 450, 600, 750, 900, 3000];
  const events = [];
  let last = null;
  let lastMs = 0;
  times.forEach((tm) => {
    clock = tm;
    const t0 = now();
    const r = bucket.tryConsume(1, tm);
    lastMs = now() - t0;
    events.push({ t: tm, allowed: r.allowed, tokensAfter: r.tokensAfter });
    last = r;
  });
  const trace = {
    user: 'FL-demo',
    ...last,
    capacity: bucket.capacity,
    refillPerSec: bucket.refillPerSec,
    stats: bucket.stats(),
    latency: us(lastMs),
    events
  };
  const rej = events.filter(e => !e.allowed).length;
  trace.summaryOverride = `8 lần bấm "Nộp": 5 lần đầu dùng hết xô, ${rej} lần kế bị từ chối; sau 2,1 giây xô nạp lại đủ 1 token nên lần cuối được qua.`;
  return DSAActionBridge.dispatchTokenBucket(trace, 'LESSON_TOKEN');
}

// ---------------------------------------------------------------------------
// TMĐT 5 — BAYES: 2.000 việc đầu của mảng gốc, sao thô vs điểm Bayes
// ---------------------------------------------------------------------------
function lessonBayes() {
  const jobs = jobsArray();
  if (jobs.length < 20) return null;
  const list = jobs.slice(0, Math.min(2000, jobs.length)); // mảng con trỏ, không clone đối tượng
  const { trace } = MarketplaceEngine.bayesTrace(list);
  const ex = trace.example;
  trace.summaryOverride = ex
    ? `${ex.id} có ${ex.R.toFixed(1)}★ nhưng chỉ ${ex.v} đánh giá → điểm Bayes ${ex.score.toFixed(2)}; ${trace.dropped}/${trace.rawTop.length} việc top sao thô rơi khỏi top Bayes.`
    : null;
  return DSAActionBridge.dispatchBayes(trace, 'LESSON_BAYES');
}

// ---------------------------------------------------------------------------
// TMĐT 6 — JACCARD: việc tương tự của việc đầu tiên trong mảng gốc
// ---------------------------------------------------------------------------
function lessonJaccard() {
  const jobs = jobsArray();
  if (jobs.length < 20) return null;
  const res = MarketplaceEngine.similar(jobs[0], 5);
  if (!res) return null;
  const t = res.trace;
  t.summaryOverride = `Chỉ so ${t.m.toLocaleString()} việc cùng ô băm "${t.skill}" thay vì ${t.n.toLocaleString()} việc: ${t.top[0] ? `#1 = ${t.top[0].id}, J = ${t.top[0].inter}/${t.top[0].union}` : 'không có ứng viên'}.`;
  return DSAActionBridge.dispatchJaccard(t, 'LESSON_JACCARD');
}

export const LESSONS = [
  { id: 'LESSON_ARRAY', lab: 'Lab 1', name: 'Mảng tĩnh: truy cập O(1)', run: lessonArrayIndex, live: 'Ô tìm kiếm trên Sàn việc làm → quét tuyến tính O(n)' },
  { id: 'LESSON_SLL', lab: 'Lab 2', name: 'DSLK đơn: lưu / bỏ lưu việc', run: lessonSinglyList, live: 'Ứng tuyển / Rút đơn (Freelancer) → DSLK đôi' },
  { id: 'LESSON_CQUEUE', lab: 'Lab 3', name: 'Hàng đợi vòng (Circular Queue)', run: lessonCircularQueue, live: 'Hoàn tác (Stack LIFO) · Giải ngân của Doanh nghiệp (Queue FIFO)' },
  { id: 'LESSON_BST_AVL', lab: 'Lab 4', name: 'BST suy biến vs AVL · 4 phép xoay', run: lessonBstVsAvl, live: 'Tìm theo mã việc (AVL) · Đăng tin mới (chèn AVL)' },
  { id: 'LESSON_STABILITY', lab: 'Lab 5', name: 'Tính ổn định Merge vs Quick', run: lessonSortStability, live: 'Bộ lọc sắp xếp giá / deadline / đánh giá' },
  { id: 'LESSON_SELFORG', lab: 'Lab 6', name: 'Move-to-Front vs Transpose', run: lessonMtfVsTranspose, live: 'Lọc theo kỹ năng (Hash + MTF) · Lọc dải ngân sách (Nhị phân)' },
  { id: 'STRESS', lab: 'Lab 7', name: 'Stress Test 100.000 thao tác', run: null, live: 'Tab "RAM / CPU / Stress Test" trong Inspector' },
  { id: 'LESSON_TRIE', lab: 'TMĐT', name: 'Trie: gợi ý tự động khi gõ', run: lessonTrie, live: 'Ô tìm kiếm từ khóa → danh sách gợi ý bên dưới' },
  { id: 'LESSON_HEAP', lab: 'TMĐT', name: 'Min-Heap Top-K vs sắp xếp toàn bộ', run: lessonHeapTopK, live: 'Khối "🔥 Top 10 việc ngân sách cao nhất"' },
  { id: 'LESSON_LRU', lab: 'TMĐT', name: 'LRU Cache: kéo lên đầu, loại cuối', run: lessonLRU, live: 'Cache tìm kiếm · "👀 Việc bạn vừa xem"' },
  { id: 'LESSON_TOKEN', lab: 'TMĐT', name: 'Token Bucket: chống spam nộp hồ sơ', run: lessonTokenBucket, live: 'Modal nộp hồ sơ → thanh "🪣 Token còn lại"' },
  { id: 'LESSON_BAYES', lab: 'TMĐT', name: 'Bayesian Average: uy tín thực', run: lessonBayes, live: 'Sắp xếp → "Uy tín thực (Bayes)"' },
  { id: 'LESSON_JACCARD', lab: 'TMĐT', name: 'Jaccard: việc tương tự', run: lessonJaccard, live: 'Chi tiết việc → "🧩 Việc tương tự"' }
];

export function runLesson(id) {
  const l = LESSONS.find(x => x.id === id);
  if (!l || !l.run) return null;
  return l.run();
}
