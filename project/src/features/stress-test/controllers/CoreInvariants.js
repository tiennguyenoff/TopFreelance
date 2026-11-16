/**
 * CoreInvariants.js — 7 bất biến THẬT của lõi, kiểm riêng từng cái (không gộp một con số).
 * Đọc trực tiếp các cấu trúc của MarketplaceEngine; không sửa dữ liệu.
 */

function avlCheck(node, out) {
  // trả chiều cao; ghi vi phạm vào out
  if (!node) return 0;
  const hl = avlCheck(node.left, out);
  const hr = avlCheck(node.right, out);
  if (Math.abs(hl - hr) > 1) out.unbalanced++;
  if (node.height !== undefined && node.height !== 1 + Math.max(hl, hr)) out.badHeight++;
  out.nodes++;
  return 1 + Math.max(hl, hr);
}

/** @returns {{id:string,label:string,ok:boolean,violations:number,detail:string}[]} */
export function checkInvariants(engine) {
  const jobs = engine.jobs;
  const L = engine.ledger;
  const res = [];
  const add = (id, label, violations, detail) => res.push({ id, label, ok: violations === 0, violations, detail });

  // 1. hires ≤ slots và ≥ 0
  let v1 = 0;
  for (let i = 0; i < jobs.length; i++) {
    const j = jobs[i];
    if (j.hiredCount > j.slots || j.hiredCount < 0) v1++;
  }
  add('hires', 'Tuyển không vượt slot, không âm', v1, `${jobs.length.toLocaleString('en-US')} việc đã quét`);

  // 2. Bảo toàn ký quỹ: từng việc + tổng + ví
  let v2 = 0;
  let sumBudget = 0;
  let sumEscrow = 0;
  for (let i = 0; i < jobs.length; i++) {
    const j = jobs[i];
    const paid = L.paidByJob.get(j.id) || 0;
    sumBudget += j.budget;
    sumEscrow += j.escrowBalance;
    if (j.budget !== paid + j.escrowBalance || j.escrowBalance < 0) v2++;
  }
  let sumWallet = 0;
  for (const w of L.wallets.values()) sumWallet += w.walletBalance;
  let sumPaidMap = 0;
  for (const p of L.paidByJob.values()) sumPaidMap += p;
  if (sumBudget !== L.depositedTotal) v2++;
  if (sumBudget !== L.paidTotal + sumEscrow) v2++;
  if (sumWallet !== L.paidTotal) v2++;
  if (sumPaidMap !== L.paidTotal) v2++;
  if (L.escrowFailures !== 0) v2++;
  add('escrow', 'Bảo toàn ký quỹ (đã nạp = đã trả + còn lại)', v2,
    `nạp ${sumBudget.toLocaleString('en-US')} = trả ${L.paidTotal.toLocaleString('en-US')} + còn ${sumEscrow.toLocaleString('en-US')}; ví ${sumWallet.toLocaleString('en-US')}`);

  // 3. Số vé Queue = số hồ sơ hợp lệ (chưa giải ngân), từng việc
  const ticketsBy = new Map();
  let nTickets = 0;
  for (let t = engine.store.escrowQueue.queue.head; t; t = t.next) {
    ticketsBy.set(t.jobId, (ticketsBy.get(t.jobId) || 0) + 1);
    nTickets++;
  }
  let v3 = nTickets !== engine.store.escrowQueue.queue.size ? 1 : 0;
  let nValid = 0;
  for (const [jobId, list] of engine.store.proposalsMap) {
    let unpaid = 0;
    for (let n = list.head; n; n = n.next) if (!n.paid) unpaid++;
    nValid += unpaid;
    if (unpaid !== (ticketsBy.get(jobId) || 0)) v3++;
  }
  if (nValid !== nTickets) v3++;
  add('queue', 'Số vé hàng đợi = số hồ sơ hợp lệ', v3, `${nTickets} vé / ${nValid} hồ sơ chưa giải ngân`);

  // 4. AVL cân bằng, số nút = số việc
  const a = { unbalanced: 0, badHeight: 0, nodes: 0 };
  avlCheck(engine.avl.root, a);
  let v4 = a.unbalanced + a.badHeight;
  if (a.nodes !== jobs.length || engine.avl.size !== jobs.length) v4++;
  add('avl', 'AVL cân bằng, số nút = số việc', v4, `${a.nodes.toLocaleString('en-US')} nút, cao ${engine.avl.height}`);

  // 5. Bảng băm: hệ số tải ≤ 0,75 và đủ số con trỏ
  const h = engine.hash;
  const lf = h.distinctKeys / h.capacity;
  let v5 = lf > 0.75 ? 1 : 0;
  if (h.totalJobs !== jobs.length) v5++;
  add('hash', 'Hệ số tải bảng băm ≤ 0,75', v5, `α = ${lf.toFixed(3)}, ${h.totalJobs.toLocaleString('en-US')} con trỏ`);

  // 6. Mảng ngân sách tăng dần
  const s = engine.sortedBudget;
  let v6 = s.length !== jobs.length ? 1 : 0;
  for (let i = 1; i < s.length; i++) if (s[i - 1].budget > s[i].budget) v6++;
  add('budget', 'Mảng ngân sách sắp tăng dần', v6, `${s.length.toLocaleString('en-US')} phần tử`);

  // 7. Chỉ mục "đơn của tôi" khớp DSLK
  let v7 = engine.myApps.size !== engine.myAppIndex.size ? 1 : 0;
  const inList = new Set();
  for (let n = engine.myApps.head; n; n = n.next) inList.add(n);
  if (inList.size !== engine.myApps.size) v7++;
  for (const [jobId, e] of engine.myAppIndex) {
    if (!inList.has(e.mine)) v7++;
    const list = engine.store.proposalsMap.get(jobId);
    let found = false;
    if (list) for (let n = list.head; n; n = n.next) if (n === e.jobNode) { found = true; break; }
    if (!found) v7++;
  }
  add('myapps', 'Chỉ mục "đơn của tôi" khớp danh sách liên kết', v7, `${engine.myApps.size} đơn`);

  return res;
}

export const totalViolations = (list) => list.reduce((s, r) => s + r.violations, 0);
