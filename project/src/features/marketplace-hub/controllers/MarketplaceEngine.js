/**
 * MarketplaceEngine.js — Lõi cấu trúc dữ liệu chạy trực tiếp trên trình duyệt.
 *
 * Giao diện web gọi vào đây thay vì dùng Array.filter / Array.find "giả lập".
 * Mọi thao tác chạy trên CHÍNH các cấu trúc dữ liệu của dự án (MarketplaceHubController):
 *   - Mảng gốc jobs (Single Source of Truth)      -> Tìm kiếm tuyến tính theo từ khóa
 *   - AVLTree (khóa = số trong JOB-xxxxxx)         -> Tra cứu theo mã việc, chèn có xoay cây
 *   - SkillHashTable (Horner + chaining + rehash)  -> Lọc theo kỹ năng
 *   - MoveToFrontHistory                           -> Lịch sử kỹ năng tự tổ chức
 *   - Mảng con trỏ sortedBudgetJobs + BinarySearch -> Lọc theo dải ngân sách
 *   - DoublyLinkedList theo từng job               -> Hồ sơ ứng tuyển
 *   - LinkedQueue (FIFO) / LinkedStack (LIFO)      -> Hàng đợi giải ngân / Hoàn tác
 *   - MergeSort / QuickSort                        -> Sắp xếp danh sách
 *
 * Mỗi thao tác trả về `trace`: dữ liệu THẬT đọc ra từ cấu trúc (đường đi trên cây,
 * bucket, chuỗi va chạm, các bước nhị phân, các lần merge/swap...). DSAActionBridge
 * biến trace thành các khung hình để LiveCanvasVisualizer vẽ lại.
 *
 * Bất biến bộ nhớ: mọi cấu trúc chỉ giữ THAM CHIẾU tới cùng một đối tượng JobPost
 * (đã bọc reactive của Vue để giao diện tự cập nhật), không clone dữ liệu.
 */

import { reactive } from 'vue';
import { JobPost } from '../../job-catalog/models/JobPost.js';
import { JobFactory } from '../../job-catalog/models/JobFactory.js';
import { DoublyLinkedList } from '../../proposals/models/DoublyLinkedList.js';
import { ProposalNode } from '../../proposals/models/ProposalNode.js';
import { escrowQueueController } from '../../escrow-payout/controllers/EscrowQueueController.js';
import { undoController } from '../../undo-history/controllers/UndoController.js';
import { AVLTree } from '../../job-index/models/AVLTree.js';
import { MergeSort } from '../../job-sorting/models/MergeSort.js';
import { SkillHashTable } from '../../skill-search/models/SkillHashTable.js';
import { BinarySearchRange } from '../../skill-search/models/BinarySearchRange.js';
import { MarketplaceHubController } from './MarketplaceHubController.js';
import { Trie } from '../../ecommerce-extras/models/Trie.js';
import { LRUCache } from '../../ecommerce-extras/models/LRUCache.js';
import { RateLimiter } from '../../ecommerce-extras/models/TokenBucket.js';
import { BayesianRanker } from '../../ecommerce-extras/models/BayesianRanker.js';

// Method mixins
import { jobKey as jobKeyExport, JobSearchMethods } from '../../job-catalog/controllers/JobSearchMethods.js';
import { JobIndexMethods } from '../../job-index/controllers/JobIndexMethods.js';
import { SkillSearchMethods } from '../../skill-search/controllers/SkillSearchMethods.js';
import { ProposalMethods } from '../../proposals/controllers/ProposalMethods.js';
import { UndoMethods } from '../../undo-history/controllers/UndoMethods.js';
import { PayoutMethods } from '../../escrow-payout/controllers/PayoutMethods.js';
import { SortMethods } from '../../job-sorting/controllers/SortMethods.js';
import { FastOpsMethods } from './FastOpsMethods.js';
import { EcommerceMethods } from '../../ecommerce-extras/controllers/EcommerceMethods.js';

// Re-export jobKey for external use
export const jobKey = jobKeyExport;

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/**
 * @param {Object} [opts]
 * @param {boolean} [opts.isolated=false] true = bản lõi RIÊNG (sandbox): dùng hàng đợi giải ngân & ngăn xếp
 *        hoàn tác của chính MarketplaceHubController, không đụng singleton của giao diện.
 *        false (mặc định) = bản singleton dùng chung với ví ký quỹ như trước.
 * @param {boolean} [opts.reactive=true] false = không bọc Vue reactive (chế độ nhanh cho tải lớn).
 * @param {boolean} [opts.indexTrie=true] false = bỏ chỉ mục Trie gợi ý từ khóa (bài tải không dùng tới; Trie chiếm ~70% thời gian dựng).
 */
export class MarketplaceEngineImpl {
  constructor({ isolated = false, reactive: useReactive = true, indexTrie = true } = {}) {
    this.store = new MarketplaceHubController();
    this.useReactive = useReactive;
    this.indexTrie = indexTrie;
    if (!isolated) {
      // Dùng chung hàng đợi & ngăn xếp với phần còn lại của giao diện (ví ký quỹ)
      this.store.escrowQueue = escrowQueueController;
      this.store.undoStack = undoController;
    }
    this.maxKey = 0;
    this.initStats = null;
    // Thuật toán TMĐT mở rộng — đều chỉ giữ con trỏ / bộ đếm, không clone JobPost
    this.trie = new Trie();
    this.searchCache = new LRUCache(12);   // cache kết quả tìm theo từ khóa
    this.recentViews = new LRUCache(8);    // "Việc bạn vừa xem"
    this.dataVersion = 0;
    this.rateLimiter = new RateLimiter(5, 0.5); // 5 hồ sơ / 10 giây cho mỗi freelancer
    this.bayes = new BayesianRanker(20);
    this._bayesKey = '';
    // "Đơn của tôi" của Freelancer: DSLK đôi (thứ tự nộp, cũ → mới) + bảng băm jobId → con trỏ node.
    // Rút BẤT KỲ đơn nào: tra bảng băm O(1) lấy node rồi gỡ prev/next O(1) — không duyệt, không LIFO.
    this.myApps = new DoublyLinkedList();
    this.myAppIndex = new Map(); // jobId -> { mine: node trong myApps, jobNode: node trong DSLK ứng viên của việc }
  }

  get jobs() { return this.store.jobs; }
  get avl() { return this.store.avlIndex; }
  get hash() { return this.store.skillHashTable; }
  get sortedBudget() { return this.store.sortedBudgetJobs; }

  // =======================================================================
  // KHỞI TẠO: sinh N việc làm 1 lần duy nhất, rồi nạp con trỏ vào các chỉ mục
  // =======================================================================
  init(count = 10000, seedJobs = [], { seed = 42, startIndex = 0 } = {}) {
    const t0 = now();
    // Bài đăng thật từ MySQL (nếu có) đứng đầu mảng, sau đó là dữ liệu sinh ngẫu nhiên
    const seeded = seedJobs.map(f => {
      const j = new JobPost(f);
      j.isFromMySQL = true;
      if (f.employer_id) j.employer_id = f.employer_id;
      return j;
    });
    const seededIds = new Set(seeded.map(j => j.id));
    const mocks = JobFactory.generateJobs(count, seed, startIndex).filter(j => !seededIds.has(j.id));
    const all = seeded.concat(mocks);
    const jobs = this.useReactive ? reactive(all) : all;
    this.store.jobs = jobs;
    this.store.avlIndex = new AVLTree();
    this.store.skillHashTable = new SkillHashTable(31, 0.75);
    this.maxKey = 0;
    this.trie = new Trie();
    this.searchCache = new LRUCache(12);
    this.recentViews = new LRUCache(8);
    this.dataVersion++;

    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i]; // proxy reactive trỏ về cùng đối tượng gốc
      this._indexJob(job, false);
    }

    const sorted = new Array(jobs.length);
    for (let i = 0; i < jobs.length; i++) sorted[i] = jobs[i];
    MergeSort.sort(sorted, { criteria: 'budget_asc', inPlace: true });
    this.store.sortedBudgetJobs = sorted;
    this.store.isInitialized = true;

    this.initStats = {
      count: jobs.length,
      durationMs: now() - t0,
      avlHeight: this.avl.height,
      hash: this.hash.getStats()
    };
    return jobs;
  }

  /**
   * Nạp THÊM một lô việc (mã tiếp nối) vào các chỉ mục sẵn có — dùng cho thử RAM nạp dần theo bậc.
   * Chỉ thêm tham chiếu: mảng gốc, AVL, bảng băm, Trie; rồi sắp lại mảng ngân sách.
   */
  appendJobs(count, seed, startIndex) {
    const batch = JobFactory.generateJobs(count, seed, startIndex);
    const jobs = this.store.jobs;
    for (let i = 0; i < batch.length; i++) {
      jobs.push(batch[i]);
      this._indexJob(batch[i], false);
    }
    const sorted = this.store.sortedBudgetJobs;
    for (let i = 0; i < batch.length; i++) sorted.push(batch[i]);
    MergeSort.sort(sorted, { criteria: 'budget_asc', inPlace: true });
    this.dataVersion++;
    return batch.length;
  }

  _indexJob(job, intoSorted = true) {
    const k = jobKey(job.id);
    if (k !== null) {
      this.avl.insert(k, job);
      if (k > this.maxKey) this.maxKey = k;
    }
    this.hash.insert(job);
    if (this.indexTrie) this.trie.indexJob(job);
    if (intoSorted) {
      const idx = BinarySearchRange.lowerBound(this.sortedBudget, job.budget);
      this.sortedBudget.splice(idx, 0, job);
    }
  }

  findById(jobId) {
    return this.store.searchById(jobId);
  }

  getHashStats() {
    return this.hash.getStats();
  }
}

// Install method mixins BEFORE creating the singleton
Object.assign(MarketplaceEngineImpl.prototype, JobSearchMethods);
Object.assign(MarketplaceEngineImpl.prototype, JobIndexMethods);
Object.assign(MarketplaceEngineImpl.prototype, SkillSearchMethods);
Object.assign(MarketplaceEngineImpl.prototype, ProposalMethods);
Object.assign(MarketplaceEngineImpl.prototype, UndoMethods);
Object.assign(MarketplaceEngineImpl.prototype, PayoutMethods);
Object.assign(MarketplaceEngineImpl.prototype, SortMethods);
Object.assign(MarketplaceEngineImpl.prototype, EcommerceMethods);
Object.assign(MarketplaceEngineImpl.prototype, FastOpsMethods);

export const MarketplaceEngine = new MarketplaceEngineImpl();
