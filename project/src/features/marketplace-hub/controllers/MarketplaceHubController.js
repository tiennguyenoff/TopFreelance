/**
 * MarketplaceHubController.js
 * Trung tâm điều phối duy nhất (Single Source of Truth) kết nối toàn diện 7 phân hệ DSA:
 * - Lab 1: ADT JobPost (100.000 bài đăng trong RAM)
 * - Lab 2: DoublyLinkedList (Quản lý hồ sơ ứng tuyển Proposals)
 * - Lab 3: EscrowQueue (Hàng đợi FIFO Payout) & UndoStack (Ngăn xếp LIFO Undo)
 * - Lab 4: AVLTree (Chỉ mục tra cứu JobID O(log n))
 * - Lab 5: MergeSort & QuickSort (Bộ lọc sắp xếp đa tiêu chí)
 * - Lab 6: SkillHashTable (Bảng băm kỹ năng Horner & Rehashing O(1)) + BinarySearchRange + MoveToFrontHistory
 * - Lab 7: Quản trị bất biến (Zero Over-Hiring, Zero Escrow Discrepancy), Heap RAM < 160MB
 */

import { JobPost } from '../../job-catalog/models/JobPost.js';
import { JobFactory } from '../../job-catalog/models/JobFactory.js';
import { DoublyLinkedList } from '../../proposals/models/DoublyLinkedList.js';
import { ProposalNode } from '../../proposals/models/ProposalNode.js';
import { EscrowQueueController } from '../../escrow-payout/controllers/EscrowQueueController.js';
import { UndoController } from '../../undo-history/controllers/UndoController.js';
import { AVLTree } from '../../job-index/models/AVLTree.js';
import { MergeSort } from '../../job-sorting/models/MergeSort.js';
import { QuickSort } from '../../job-sorting/models/QuickSort.js';
import { SkillHashTable } from '../../skill-search/models/SkillHashTable.js';
import { BinarySearchRange } from '../../skill-search/models/BinarySearchRange.js';
import { MoveToFrontHistory } from '../../skill-search/models/MoveToFrontHistory.js';
import { Timer } from '../../../shared/utils/timer.js';

// Đo Heap an toàn cho cả Node.js (CLI) lẫn trình duyệt (Web)
function heapUsedMbSafe() {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    return Number((process.memoryUsage().heapUsed / (1024 * 1024)).toFixed(2));
  }
  if (typeof performance !== 'undefined' && performance.memory) {
    return Number((performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(2));
  }
  return 0;
}

export class MarketplaceHubController {
  constructor() {
    this.jobs = []; // Lab 1: Mảng gốc Single Source of Truth
    this.proposalsMap = new Map(); // Lab 2: jobId -> DoublyLinkedList
    this.escrowQueue = new EscrowQueueController(); // Lab 3: FIFO Queue
    this.undoStack = new UndoController(); // Lab 3: LIFO Stack
    this.avlIndex = new AVLTree(); // Lab 4: Cây AVL theo ID
    this.sortedBudgetJobs = []; // Lab 5: Mảng con trỏ sắp xếp theo Budget
    this.skillHashTable = new SkillHashTable(31, 0.75); // Lab 6: Bảng băm kỹ năng
    this.searchHistory = new MoveToFrontHistory(15); // Lab 6: Lịch sử MTF
    this.isInitialized = false;
  }

  /**
   * Khởi tạo toàn bộ hệ sinh thái với N bài tuyển dụng
   * @param {number} [count=100000] - Số lượng bài đăng (mặc định 100.000)
   * @param {number} [seed=42]
   */
  initialize(count = 100000, seed = 42) {
    const timer = new Timer();
    timer.start();

    // 1. Tạo tập dữ liệu gốc JobPost (Lab 1)
    this.jobs = JobFactory.generateJobs(count, seed);

    // 2. Nạp vào Cây AVL (Lab 4) & Bảng băm Kỹ năng (Lab 6)
    for (let i = 0; i < this.jobs.length; i++) {
      const job = this.jobs[i];
      // Khóa số nguyên trích xuất từ JOB-000001 -> 1
      const numKey = parseInt(job.id.replace('JOB-', ''), 10) || (i + 1);
      this.avlIndex.insert(numKey, job);
      this.skillHashTable.insert(job);
    }

    // 3. Tạo mảng con trỏ sắp xếp theo Budget để phục vụ Binary Search (Lab 5 & 6)
    this.sortedBudgetJobs = this.jobs.slice();
    MergeSort.sort(this.sortedBudgetJobs, { criteria: 'budget_asc', inPlace: true });

    this.isInitialized = true;
    const durMs = timer.stop();

    return {
      count: this.jobs.length,
      durationMs: durMs,
      heapRamMb: heapUsedMbSafe(),
      avlHeight: this.avlIndex.height,
      hashStats: this.skillHashTable.getStats()
    };
  }

  /**
   * Đăng tin tuyển dụng mới và đồng bộ tức thời sang tất cả các cấu trúc chỉ mục
   * @param {Object} payload
   */
  postJob(payload) {
    const newId = `JOB-${String(this.jobs.length + 1).padStart(6, '0')}`;
    const newJob = new JobPost({
      id: newId,
      title: payload.title || `Dự án tuyển dụng #${this.jobs.length + 1}`,
      skillTag: (payload.skillTag || 'general').toLowerCase().trim(),
      budget: Number(payload.budget) || 1000,
      slots: Number(payload.slots) || 1,
      deadlineDays: Number(payload.deadlineDays) || 14,
      clientRating: Number(payload.clientRating) || 5.0
    });

    // 1. Thêm vào mảng gốc (Single Source of Truth)
    this.jobs.unshift(newJob);

    // 2. Nạp vào Cây AVL (Lab 4)
    const numKey = parseInt(newId.replace('JOB-', ''), 10);
    this.avlIndex.insert(numKey, newJob);

    // 3. Nạp vào Bảng Băm Kỹ Năng (Lab 6)
    this.skillHashTable.insert(newJob);

    // 4. Chèn vào mảng sắp xếp theo ngân sách duy trì trật tự (Lab 5/6)
    const insIdx = BinarySearchRange.lowerBound(this.sortedBudgetJobs, newJob.budget);
    this.sortedBudgetJobs.splice(insIdx, 0, newJob);

    return newJob;
  }

  /**
   * Nộp hồ sơ ứng tuyển vào dự án (Liên luồng Lab 1, Lab 2, Lab 3)
   */
  applyProposal({ jobId, freelancerId, bid, proposalText, recordUndo = true }) {
    const job = this.searchById(jobId);
    if (!job) {
      return { success: false, code: 'JOB_NOT_FOUND', message: `Không tìm thấy dự án ${jobId}` };
    }

    // Bất biến 1: Chặn tuyển vượt số lượng (Zero Over-Hiring)
    if (!job.isAvailable) {
      return { success: false, code: 'OVER_HIRING_BLOCKED', message: 'Dự án đã đủ người tuyển dụng!' };
    }

    // 1. Thu nạp vào JobPost (Lab 1)
    const hireRes = job.hireFreelancer();
    if (!hireRes.success) return hireRes;

    // 2. Chèn vào DoublyLinkedList của Job (Lab 2)
    if (!this.proposalsMap.has(job.id)) {
      this.proposalsMap.set(job.id, new DoublyLinkedList());
    }
    const propList = this.proposalsMap.get(job.id);
    const propId = `PROP-${job.id}-${propList.size + 1}`;
    const propNode = new ProposalNode({
      id: propId,
      jobId: job.id,
      freelancerId: freelancerId || 'FL-UNKNOWN',
      bidAmount: bid || Math.floor(job.budget / job.slots),
      coverLetter: proposalText || 'Tôi sẵn sàng nhận việc'
    });
    propList.insertHead(propNode);

    // 3. Đẩy vé giải ngân vào Hàng đợi FIFO Payout Queue (Lab 3)
    const ticketRes = this.escrowQueue.enqueuePayout({
      jobId: job.id,
      freelancerId: propNode.freelancerId,
      amount: propNode.bidAmount,
      jobTitle: job.title
    });

    // 4. Ghi nhận hành động vào Ngăn xếp LIFO Undo Stack (Lab 3) — CLI/stress test.
    //    Giao diện web tắt bước này: freelancer rút BẤT KỲ đơn nào nên không theo LIFO.
    if (recordUndo) this.undoStack.recordApplyAction({
      job,
      freelancerId: propNode.freelancerId,
      bidAmount: propNode.bidAmount,
      ticketId: ticketRes?.ticket?.id
    });

    return {
      success: true,
      job,
      proposal: propNode,
      payoutTicket: ticketRes?.ticket,
      remainingSlots: job.slots - job.hiredCount
    };
  }

  /**
   * Hoàn tác hành động ứng tuyển gần nhất (Lab 3: LIFO Undo)
   */
  undoLastApply() {
    const undoRes = this.undoStack.undoLastAction();
    if (!undoRes.success) {
      return undoRes;
    }

    const action = undoRes.action;
    const { jobId } = action;
    const job = this.searchById(jobId);

    if (job) {
      // 2. Xóa khỏi DSLK đôi (Lab 2)
      const propList = this.proposalsMap.get(jobId);
      if (propList && propList.size > 0) {
        propList.removeHead();
      }

      // 3. Hủy vé khỏi FIFO Queue (Lab 3)
      this.escrowQueue.cancelTicketByJobId(jobId);
    }

    return {
      success: true,
      message: undoRes.message,
      job
    };
  }

  /**
   * Xử lý giải ngân hợp đồng theo thứ tự nộp trước (Lab 3: FIFO Queue)
   */
  processNextPayout() {
    const payoutRes = this.escrowQueue.processNextPayout();
    if (!payoutRes.success) {
      return payoutRes;
    }

    const ticket = payoutRes.ticket;
    const job = this.searchById(ticket.jobId);
    if (job) {
      // Khấu trừ ký quỹ Escrow (Bất biến 2: Không được âm số dư)
      job.payoutEscrow(ticket.amount);
    }

    return {
      success: true,
      ticket,
      jobEscrowRemaining: job ? job.escrowBalance : 0
    };
  }

  /**
   * Tra cứu bài đăng theo ID trong O(log n) bằng Cây tự cân bằng AVL (Lab 4)
   * @param {string|number} jobId - Chuỗi 'JOB-000123' hoặc số nguyên 123
   */
  searchById(jobId) {
    if (!jobId) return null;
    const key = typeof jobId === 'number' 
      ? jobId 
      : parseInt(String(jobId).replace('JOB-', ''), 10);

    const searchRes = this.avlIndex.search(key);
    return searchRes.found ? searchRes.node.jobRef : null;
  }

  /**
   * Tra cứu theo Kỹ năng trong O(1) bằng Bảng Băm Horner & MTF History (Lab 6)
   * @param {string} skillTag
   */
  searchBySkill(skillTag) {
    if (!skillTag) return { matches: [], count: 0, steps: 0, history: [] };

    // 1. Cập nhật Lịch sử tìm kiếm tự tổ chức Move-to-Front
    const mtfRes = this.searchHistory.access(skillTag);

    // 2. Tra cứu trong Bảng băm Horner
    const hashRes = this.skillHashTable.search(skillTag);

    return {
      ...hashRes,
      mtfCacheHit: mtfRes.isHit,
      mtfSteps: mtfRes.steps,
      recentHistory: this.searchHistory.getHistory()
    };
  }

  /**
   * Lọc bài đăng theo Dải Ngân Sách bằng Tìm Kiếm Nhị Phân O(log n + k) (Lab 6)
   * @param {number} minBudget
   * @param {number} maxBudget
   */
  searchByBudgetRange(minBudget, maxBudget) {
    return BinarySearchRange.searchRange(this.sortedBudgetJobs, minBudget, maxBudget);
  }

  /**
   * Sắp xếp bài tuyển dụng đa tiêu chí (Lab 5)
   * @param {string} criteria - 'budget_desc' | 'budget_asc' | 'deadline_asc' | 'rating_desc'
   * @param {string} [algo='mergesort'] - 'mergesort' (ổn định) hoặc 'quicksort'
   */
  sortJobs(criteria = 'budget_desc', algo = 'mergesort') {
    if (algo === 'quicksort') {
      return QuickSort.sort(this.jobs, { criteria, inPlace: false });
    }
    return MergeSort.sort(this.jobs, { criteria, inPlace: false });
  }

  /**
   * Kiểm toán trạng thái toàn hệ thống & Đo lường Bất biến Dữ liệu
   */
  getSystemMetrics() {
    let totalEscrowAllocated = 0;
    let totalEscrowRemaining = 0;
    let overHiringViolations = 0;

    for (let i = 0; i < this.jobs.length; i++) {
      const j = this.jobs[i];
      totalEscrowAllocated += j.budget;
      totalEscrowRemaining += j.escrowBalance;

      // Kiểm tra bất biến tuyển vượt
      if (j.hiredCount > j.slots) {
        overHiringViolations++;
      }
    }

    const heapUsedMb = heapUsedMbSafe();

    return {
      totalJobs: this.jobs.length,
      proposalsCount: this.proposalsMap.size,
      pendingPayouts: this.escrowQueue.queue.size,
      undoStackSize: this.undoStack.stack.size,
      avlHeight: this.avlIndex.height,
      hashStats: this.skillHashTable.getStats(),
      mtfStats: this.searchHistory.getStats(),
      financials: {
        totalEscrowAllocated,
        totalEscrowRemaining
      },
      invariants: {
        overHiringViolations,
        isZeroOverHiring: overHiringViolations === 0,
        heapUnder180Mb: heapUsedMb < 180,
        heapUsedMb
      }
    };
  }
}
