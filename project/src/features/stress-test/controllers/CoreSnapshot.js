/**
 * CoreSnapshot.js — Ảnh chụp trạng thái lõi trước/sau bài tải, để chứng minh "dọn xong là về đúng như cũ".
 * Chỉ ĐỌC. Danh sách mã việc giữ nguyên chuỗi gốc (không clone JobPost).
 */

function fnv(h, str) {
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

/**
 * @param {Object} engine MarketplaceEngine (singleton hoặc sandbox)
 * @param {{wallets?: Array<{id:string,balance:number}>}} [extras] ví cần đưa vào ảnh chụp (ví của người dùng thật)
 */
export function takeSnapshot(engine, extras = {}) {
  const jobs = engine.jobs || [];
  const ids = new Array(jobs.length);
  let h = 2166136261;
  let escrowTotal = 0;
  let hiredTotal = 0;
  for (let i = 0; i < jobs.length; i++) {
    const j = jobs[i];
    ids[i] = j.id;
    escrowTotal += j.escrowBalance;
    hiredTotal += j.hiredCount;
    h = fnv(h, j.id);
    h = fnv(h, `|${j.hiredCount}|${j.escrowBalance}|${j.status}`);
  }
  const avl = engine.avl;
  const hs = engine.hash ? engine.hash.getStats() : null;
  const store = engine.store;
  const wallets = {};
  for (const w of extras.wallets || []) wallets[w.id] = w.balance;
  return {
    jobCount: jobs.length,
    jobIds: ids,
    avlHeight: avl ? avl.height : 0,
    avlSize: avl ? avl.size : 0,
    rotations: avl ? { LL: avl.rotationsCount.LL, RR: avl.rotationsCount.RR, LR: avl.rotationsCount.LR, RL: avl.rotationsCount.RL } : null,
    hash: hs && { capacity: hs.capacity, distinctKeys: hs.distinctKeys, totalJobs: hs.totalJobs, loadFactor: hs.loadFactor, rehashCount: hs.rehashCount },
    queueLength: store.escrowQueue.queue.size,
    stackLength: store.undoStack.stack.size,
    processedHistory: store.escrowQueue.processedHistory.length,
    proposalLists: store.proposalsMap.size,
    myApps: engine.myApps ? engine.myApps.size : 0,
    sortedLength: (engine.sortedBudget || []).length,
    escrowTotal,
    hiredTotal,
    jobDigest: h >>> 0,
    wallets
  };
}

/** @returns {{match:boolean, diffs:{field:string,before:any,after:any}[], summary:string}} */
export function compareSnapshots(a, b) {
  const diffs = [];
  const eq = (field, x, y) => {
    if (JSON.stringify(x) !== JSON.stringify(y)) diffs.push({ field, before: x, after: y });
  };
  for (const k of ['jobCount', 'avlHeight', 'avlSize', 'rotations', 'hash', 'queueLength', 'stackLength',
    'processedHistory', 'proposalLists', 'myApps', 'sortedLength', 'escrowTotal', 'hiredTotal', 'jobDigest', 'wallets']) {
    eq(k, a[k], b[k]);
  }
  // danh sách mã việc: so từng phần tử, báo vị trí lệch đầu tiên
  if (a.jobIds.length !== b.jobIds.length) {
    diffs.push({ field: 'jobIds.length', before: a.jobIds.length, after: b.jobIds.length });
  } else {
    for (let i = 0; i < a.jobIds.length; i++) {
      if (a.jobIds[i] !== b.jobIds[i]) { diffs.push({ field: `jobIds[${i}]`, before: a.jobIds[i], after: b.jobIds[i] }); break; }
    }
  }
  const match = diffs.length === 0;
  return { match, diffs, summary: match ? 'khớp 100%' : `lệch ${diffs.length} mục: ${diffs.map(d => d.field).join(', ')}` };
}
