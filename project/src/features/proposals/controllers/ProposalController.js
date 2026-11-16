import { ProposalNode } from '../models/ProposalNode.js';
import { DoublyLinkedList } from '../models/DoublyLinkedList.js';

/**
 * ProposalController - Tầng điều khiển nghiệp vụ Hồ sơ ứng tuyển (Lab 2)
 * Quản trị toàn bộ vòng đời hồ sơ: Nộp đơn -> Duyệt đơn -> Từ chối -> Rút đơn O(1).
 * Tối ưu hóa:
 *   - Mỗi JobPost ánh xạ với một DoublyLinkedList độc lập lưu trữ các ProposalNode.
 *   - Chèn hồ sơ mới vào đầu DSLK đôi: O(1).
 *   - Rút hồ sơ ứng tuyển giữa danh sách: O(1) khi giữ con trỏ node.
 *   - Duy trì Single Source of Truth, bộ nhớ phụ < 10MB.
 */
export class ProposalController {
  constructor() {
    /**
     * Map ánh xạ: jobId -> DoublyLinkedList
     * @type {Map<string, DoublyLinkedList>}
     */
    this.jobProposalsMap = new Map();

    /**
     * Index tra cứu ngược: freelancerId -> Set<ProposalNode>
     * @type {Map<string, Set<ProposalNode>>}
     */
    this.freelancerProposalsIndex = new Map();

    this.proposalSequence = 1;
  }

  /**
   * Lấy hoặc khởi tạo DoublyLinkedList cho một công việc
   * @private
   * @param {string} jobId
   * @returns {DoublyLinkedList}
   */
  _getOrCreateList(jobId) {
    if (!this.jobProposalsMap.has(jobId)) {
      this.jobProposalsMap.set(jobId, new DoublyLinkedList());
    }
    return this.jobProposalsMap.get(jobId);
  }

  /**
   * Sinh mã Proposal ID tự tăng duy nhất
   * @private
   * @returns {string}
   */
  _generateProposalId() {
    return `PROP-${String(this.proposalSequence++).padStart(6, '0')}`;
  }

  /**
   * 1. NGHIỆP VỤ NỘP HỒ SƠ ỨNG TUYỂN (SUBMIT PROPOSAL)
   * Hồ sơ mới được nạp thẳng vào đầu DoublyLinkedList của Job đó trong O(1).
   *
   * @param {Object} params
   * @param {string} params.jobId - Mã công việc
   * @param {string} params.freelancerId - Mã freelancer nộp đơn
   * @param {string} [params.freelancerName] - Tên ứng viên
   * @param {number} params.bidAmount - Giá thù lao đề xuất ($)
   * @param {string} [params.coverLetter] - Lời ngỏ đề xuất
   * @param {Object} [params.jobRef] - Con trỏ trỏ tới đối tượng JobPost gốc
   * @returns {{ success: boolean, node?: ProposalNode, code?: string, message: string }}
   */
  submitProposal({
    jobId,
    freelancerId,
    freelancerName = 'Alex Vance',
    bidAmount = 1000,
    coverLetter = '',
    jobRef = null
  }) {
    if (!jobId || !freelancerId) {
      return {
        success: false,
        code: 'INVALID_INPUT',
        message: 'jobId và freelancerId là thông tin bắt buộc!'
      };
    }

    // 1. Kiểm tra trạng thái bài đăng nếu có jobRef
    if (jobRef && !jobRef.isAvailable) {
      return {
        success: false,
        code: 'JOB_FULL',
        message: 'Dự án này đã tuyển đủ số lượng hoặc đang đóng, không thể nộp thêm!'
      };
    }

    const list = this._getOrCreateList(jobId);

    // 2. Kiểm tra trùng lặp: Một freelancer không được nộp 2 hồ sơ PENDING/ACCEPTED vào cùng 1 Job
    const existing = list.findByFreelancerId(freelancerId);
    if (existing && (existing.status === 'PENDING' || existing.status === 'ACCEPTED')) {
      return {
        success: false,
        code: 'DUPLICATE_PROPOSAL',
        message: `Freelancer ${freelancerId} đã có hồ sơ đang xử lý cho dự án ${jobId}!`
      };
    }

    // 3. Khởi tạo ProposalNode mới
    const node = new ProposalNode({
      id: this._generateProposalId(),
      jobId,
      freelancerId,
      freelancerName,
      bidAmount,
      coverLetter,
      status: 'PENDING',
      submittedAt: Date.now()
    });

    // 4. Chèn vào đầu DoublyLinkedList trong O(1)
    list.insertHead(node);

    // 5. Cập nhật chỉ mục ngược theo freelancer
    if (!this.freelancerProposalsIndex.has(freelancerId)) {
      this.freelancerProposalsIndex.set(freelancerId, new Set());
    }
    this.freelancerProposalsIndex.get(freelancerId).add(node);

    return {
      success: true,
      node,
      message: `Đã nộp hồ sơ ${node.id} thành công vào đầu DSLK đôi (O(1))`
    };
  }

  /**
   * 2. NGHIỆP VỤ DUYỆT HỒ SƠ ỨNG VIÊN (ACCEPT PROPOSAL)
   * Nhà tuyển dụng chấp thuận hồ sơ và ký kết hợp đồng.
   *
   * @param {Object} params
   * @param {string} params.jobId
   * @param {string} params.proposalId
   * @param {Object} [params.jobRef]
   * @returns {{ success: boolean, node?: ProposalNode, code?: string, message: string }}
   */
  acceptProposal({ jobId, proposalId, jobRef = null }) {
    const list = this.jobProposalsMap.get(jobId);
    if (!list) {
      return { success: false, code: 'NOT_FOUND', message: `Không tìm thấy dự án ${jobId}` };
    }

    const node = list.findById(proposalId);
    if (!node) {
      return { success: false, code: 'PROPOSAL_NOT_FOUND', message: `Không tìm thấy hồ sơ ${proposalId}` };
    }

    if (node.status === 'ACCEPTED') {
      return { success: false, code: 'ALREADY_ACCEPTED', message: 'Hồ sơ này đã được duyệt trước đó!' };
    }

    // Kiểm tra slot tuyển dụng
    if (jobRef) {
      const hireRes = jobRef.hireFreelancer();
      if (!hireRes.success) {
        return { success: false, code: hireRes.code, message: hireRes.message };
      }
    }

    node.setStatus('ACCEPTED');

    return {
      success: true,
      node,
      message: `Đã duyệt hồ sơ ${proposalId} của ứng viên ${node.freelancerName}`
    };
  }

  /**
   * 3. NGHIỆP VỤ TỪ CHỐI HỒ SƠ (REJECT PROPOSAL)
   * @param {Object} params
   * @param {string} params.jobId
   * @param {string} params.proposalId
   * @param {string} [params.reason]
   * @returns {{ success: boolean, node?: ProposalNode, message: string }}
   */
  rejectProposal({ jobId, proposalId, reason = '' }) {
    const list = this.jobProposalsMap.get(jobId);
    if (!list) {
      return { success: false, message: `Không tìm thấy dự án ${jobId}` };
    }

    const node = list.findById(proposalId);
    if (!node) {
      return { success: false, message: `Không tìm thấy hồ sơ ${proposalId}` };
    }

    node.setStatus('REJECTED');

    return {
      success: true,
      node,
      message: `Đã từ chối hồ sơ ${proposalId}. Lý do: ${reason || 'Không phù hợp yêu cầu'}`
    };
  }

  /**
   * 4. NGHIỆP VỤ RÚT HỒ SƠ ỨNG TUYỂN (WITHDRAW PROPOSAL - O(1))
   * Freelancer chủ động rút đơn hoặc hủy báo giá.
   * Sử dụng con trỏ 2 chiều để ngắt node khỏi DoublyLinkedList trong O(1).
   *
   * @param {Object} params
   * @param {string} params.jobId
   * @param {string} params.proposalId
   * @param {string} [params.freelancerId]
   * @param {Object} [params.jobRef]
   * @returns {{ success: boolean, node?: ProposalNode, message: string }}
   */
  withdrawProposal({ jobId, proposalId, freelancerId = null, jobRef = null }) {
    const list = this.jobProposalsMap.get(jobId);
    if (!list) {
      return { success: false, message: `Không tìm thấy dự án ${jobId}` };
    }

    const node = list.findById(proposalId);
    if (!node) {
      return { success: false, message: `Không tìm thấy hồ sơ ${proposalId}` };
    }

    // Kiểm tra quyền sở hữu nếu có truyền freelancerId
    if (freelancerId && node.freelancerId !== freelancerId) {
      return {
        success: false,
        message: 'Bạn không có quyền rút hồ sơ của ứng viên khác!'
      };
    }

    const wasAccepted = node.status === 'ACCEPTED';

    // Rút Node khỏi DoublyLinkedList trong O(1)
    list.removeNode(node);
    node.setStatus('WITHDRAWN');

    // Xóa khỏi index của freelancer
    const fSet = this.freelancerProposalsIndex.get(node.freelancerId);
    if (fSet) {
      fSet.delete(node);
    }

    // Nếu trước đó hồ sơ đã được duyệt, hoàn trả lại 1 slot cho Job
    if (wasAccepted && jobRef && jobRef.hiredCount > 0) {
      jobRef.hiredCount--;
      if (jobRef.hiredCount < jobRef.slots) {
        jobRef.status = 'OPEN';
      }
    }

    return {
      success: true,
      node,
      message: `Đã rút hồ sơ ${proposalId} khỏi DSLK đôi trong O(1)`
    };
  }

  /**
   * Lấy danh sách toàn bộ hồ sơ ứng tuyển của một công việc (mới nhất đến cũ nhất)
   * @param {string} jobId
   * @returns {Array<ProposalNode>}
   */
  getProposalsByJob(jobId) {
    const list = this.jobProposalsMap.get(jobId);
    if (!list) return [];
    return list.toArray();
  }

  /**
   * Lấy danh sách tất cả hồ sơ mà một Freelancer đã nộp
   * @param {string} freelancerId
   * @returns {Array<ProposalNode>}
   */
  getProposalsByFreelancer(freelancerId) {
    const set = this.freelancerProposalsIndex.get(freelancerId);
    if (!set) return [];
    return Array.from(set);
  }

  /**
   * Thống kê hồ sơ ứng tuyển của một Job
   * @param {string} jobId
   * @returns {{ total: number, pending: number, accepted: number, rejected: number, minBid: number, maxBid: number, avgBid: number }}
   */
  getProposalStats(jobId) {
    const proposals = this.getProposalsByJob(jobId);
    if (proposals.length === 0) {
      return {
        total: 0,
        pending: 0,
        accepted: 0,
        rejected: 0,
        minBid: 0,
        maxBid: 0,
        avgBid: 0
      };
    }

    let pending = 0;
    let accepted = 0;
    let rejected = 0;
    let sumBid = 0;
    let minBid = Infinity;
    let maxBid = -Infinity;

    for (const p of proposals) {
      if (p.status === 'PENDING') pending++;
      else if (p.status === 'ACCEPTED') accepted++;
      else if (p.status === 'REJECTED') rejected++;

      sumBid += p.bidAmount;
      if (p.bidAmount < minBid) minBid = p.bidAmount;
      if (p.bidAmount > maxBid) maxBid = p.bidAmount;
    }

    return {
      total: proposals.length,
      pending,
      accepted,
      rejected,
      minBid: minBid === Infinity ? 0 : minBid,
      maxBid: maxBid === -Infinity ? 0 : maxBid,
      avgBid: Math.round(sumBid / proposals.length)
    };
  }

  /**
   * Xóa sạch toàn bộ dữ liệu controller
   */
  clear() {
    this.jobProposalsMap.clear();
    this.freelancerProposalsIndex.clear();
    this.proposalSequence = 1;
  }
}

export const proposalController = new ProposalController();
