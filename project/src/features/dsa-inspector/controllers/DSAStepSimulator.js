/**
 * DSAStepSimulator
 * Động cơ ghi vết và tái hiện kịch bản tiến trình giải thuật từng bước
 * Cung cấp kịch bản hoạt họa (Visual Frames) cho AlgorithmVisualStage
 */
export class DSAStepSimulator {
  
  /**
   * Kịch bản mô phỏng Danh sách liên kết: Thêm Node vào cuối DSLK (Lab 2)
   * Đúng theo kịch bản người dùng mô tả:
   * 1. Node mới rơi xuống
   * 2. Vệt sáng duyệt từng node từ Head tìm Tail
   * 3. Node mới di chuyển xuống cuối và Tail.next nối vào Node mới
   * 4. Node mới.next trỏ về null, hoàn tất
   */
  static getLinkedListSteps() {
    return [
      {
        step: 1,
        stageType: 'linked_list',
        stageFrame: 1,
        title: 'Khởi tạo Node Mới & Rơi Xuống Kế Bên DSLK',
        badge: 'Node Drop-in',
        color: 'champagne',
        description: 'Hồ sơ ứng tuyển mới (ProposalNode FL-9821, Báo thầu: $2,500) được cấp phát trong RAM. Hình ảnh một node chấm tròn rơi xuống nằm lơ lửng kế bên DSLK sẵn sàng được kết nối.',
        details: 'ProposalNode: { id: "P04", freelancer: "FL-9821", bid: $2500, next: null }',
        codeSnippet: 'const newNode = new ProposalNode({ freelancerId: "FL-9821", bid: 2500 });'
      },
      {
        step: 2,
        stageType: 'linked_list',
        stageFrame: 2,
        title: 'Vệt Sáng Di Chuyển Duyệt Từng Node Tìm Node Cuối (Tail)',
        badge: 'Traversal Scan',
        color: 'ice',
        description: 'Vệt sáng năng lượng laser di chuyển lần lượt qua từng node: từ Head (P01) ➔ P02 ➔ P03 (Tail). Mỗi node được vệt sáng đi qua sẽ bừng sáng để mô phỏng quá trình duyệt danh sách liên kết.',
        details: 'Quét con trỏ: current = head; while (current.next !== null) current = current.next;',
        codeSnippet: 'let current = this.head;\nwhile (current.next !== null) {\n  current = current.next;\n} // Tìm thấy Tail tại P03'
      },
      {
        step: 3,
        stageType: 'linked_list',
        stageFrame: 3,
        title: 'Node Mới Di Chuyển Xuống Cuối & Nối Con Trỏ Next',
        badge: 'Pointer Wiring',
        color: 'amber',
        description: 'Node mới di chuyển xuống vị trí cuối cùng. Mũi tên con trỏ next của node đuôi trước đó (P03) phóng ra tia sáng nối trực tiếp vào Node mới.',
        details: 'Gán liên kết: Tail.next = newNode (P03.next ➔ P04)',
        codeSnippet: 'current.next = newNode; // Nối con trỏ đuôi vào node mới'
      },
      {
        step: 4,
        stageType: 'linked_list',
        stageFrame: 4,
        title: 'Nối Con Trỏ Next Của Node Mới Vào Null',
        badge: 'Null Termination',
        color: 'emerald',
        description: 'Tiếp đến, con trỏ next của Node mới (P04) bắn ra mũi tên trỏ vào null để đánh dấu điểm kết thúc danh sách. Hoàn tất nộp hồ sơ ứng tuyển an toàn vào RAM!',
        details: 'newNode.next = null • Chiều dài DSLK: 4 nodes • Bộ nhớ phát sinh: đúng 1 Node',
        codeSnippet: 'newNode.next = null;\nthis.size++;\nreturn { success: true, totalNodes: 4 };'
      }
    ];
  }

  /**
   * Kịch bản mô phỏng Bảng băm đa thức Horner & Nhảy ô Bucket O(1) (Lab 6)
   * 1. Ký tự rơi vào phễu
   * 2. Bánh răng tính toán Horner
   * 3. Tia laser bắn trúng ô Bucket O(1)
   * 4. Mở chuỗi Chaining
   */
  static getHashSearchSteps(keyword = 'react') {
    const cleanKey = (keyword || 'react').toLowerCase().trim();
    return [
      {
        step: 1,
        stageType: 'hash',
        stageFrame: 1,
        title: 'Các Ký Tự Rơi Vào Cỗ Máy Băm Đa Thức Horner',
        badge: 'Input Phase',
        color: 'champagne',
        description: `Từ khóa "${cleanKey}" được phân rã thành các hạt ký tự 'r' (114), 'e' (101), 'a' (97), 'c' (99), 't' (116) lần lượt rơi vào phễu băm cơ số 31.`,
        details: 'ASCII Codes: [114, 101, 97, 99, 116] • Cơ số Horner: 31 • Dung lượng Bucket: 133,337',
        codeSnippet: 'const chars = "react".split("").map(c => c.charCodeAt(0));'
      },
      {
        step: 2,
        stageType: 'hash',
        stageFrame: 2,
        title: 'Cỗ Máy Horner Tính Toán Ra Chỉ Số Ô Băm #4,210',
        badge: 'Horner Engine',
        color: 'amber',
        description: 'Bộ xử lý Horner tính toán lặp h = (h × 31 + c) % 133,337. Bánh răng băm quay phát sáng và xuất ra chỉ số ô nhớ duy nhất: #4,210.',
        details: 'h = ((((114×31 + 101)×31 + 97)×31 + 99)×31 + 116) % 133,337 = 4,210',
        codeSnippet: 'let hash = 0;\nfor (let c of chars) hash = (hash * 31 + c) % 133337;\n// hash = 4210'
      },
      {
        step: 3,
        stageType: 'hash',
        stageFrame: 3,
        title: 'Tia Laser Năng Lượng Bắn Trúng Ô Bucket #4,210 Trong O(1)',
        badge: 'Direct O(1) Jump',
        color: 'ice',
        description: 'Tia laser năng lượng xanh tuyết phóng vút từ cỗ máy băm bắn thẳng vào ô Bucket #4,210 trên thanh mảng RAM. Một bước nhảy định vị O(1) duy nhất, bỏ qua 100.000 bài đăng!',
        details: 'Bucket Array: Nhảy trực tiếp đến vị trí memory[4210] với độ trễ 1.20 µs',
        codeSnippet: 'const chain = this.buckets[4210]; // Định vị bộ nhớ tức thì O(1)'
      },
      {
        step: 4,
        stageType: 'hash',
        stageFrame: 4,
        title: 'Mở Chuỗi Chaining Trả Về 6.250 Việc Làm Khớp Hoàn Toàn',
        badge: 'Chain Resolved',
        color: 'emerald',
        description: 'Tại ô #4,210, chuỗi danh sách liên kết giải quyết va chạm bung nở, trỏ tới node kỹ năng "react" chứa 6.250 bài đăng việc làm phù hợp.',
        details: 'Separate Chaining: [Node "react" | 6,250 Jobs] ➔ null • Độ trễ: 1.20 µs • Vi phạm: 0',
        codeSnippet: 'return chain.find(node => node.key === "react").jobs;'
      }
    ];
  }

  /**
   * Kịch bản mô phỏng Cây tự cân bằng AVL (Lab 4)
   * 1. Xuất phát từ Root, rẽ nhánh trái, loại 50.000 bài
   * 2. Tới node con, rẽ nhánh phải, loại tiếp 25.000 bài
   * 3. Kiểm tra cân bằng BF = 0, h = 17
   * 4. Đốm sáng chạm trúng đích JOB-042850
   */
  static getAVLSearchSteps(jobId = 'JOB-042850') {
    return [
      {
        step: 1,
        stageType: 'avl',
        stageFrame: 1,
        title: 'Tia Sáng Từ Gốc (JOB-050000) Rẽ Trái, Loại 50.000 Bài Bên Phải',
        badge: 'Root Partition',
        color: 'champagne',
        description: 'Khóa cần tìm là JOB-042850. So sánh tại Gốc: "42,850" < "50,000". Tia sáng trượt xuống nhánh TRÁI; toàn bộ nửa cây bên phải mờ đi, loại bỏ ngay 50.000 bài đăng!',
        details: 'So sánh: 42,850 < 50,000 ➔ Rẽ TRÁI. Bỏ qua 50% không gian tìm kiếm.',
        codeSnippet: 'if (targetId < node.id) { eliminate(node.right); node = node.left; }'
      },
      {
        step: 2,
        stageType: 'avl',
        stageFrame: 2,
        title: 'Tia Sáng Tới Node JOB-025000 Rẽ Phải, Loại Tiếp 25.000 Bài',
        badge: 'Divide & Conquer',
        color: 'ice',
        description: 'Tia sáng tới Node con JOB-025000. So sánh: "42,850" > "25,000". Tia sáng bẻ hướng sang nhánh PHẢI; loại bỏ tiếp 25.000 bài đăng. Không gian tìm kiếm chỉ còn 12.500 bài!',
        details: 'So sánh: 42,850 > 25,000 ➔ Rẽ PHẢI. Không gian còn lại: 12,500 bài.',
        codeSnippet: 'if (targetId > node.id) { eliminate(node.left); node = node.right; }'
      },
      {
        step: 3,
        stageType: 'avl',
        stageFrame: 3,
        title: 'Kiểm Tra Hệ Số Cân Bằng AVL: Cây Đạt Độ Cao Lý Tưởng h = 17',
        badge: 'AVL Balance Check',
        color: 'amber',
        description: 'Hệ thống kiểm tra Hệ số cân bằng Balance Factor BF = h_trái - h_phải = 0. Cây hoàn toàn cân bằng, chiều cao tối đa khống chế ở mức 17 tầng.',
        details: 'BF = 0 ∈ {-1, 0, 1} • Chiều cao: 17 • Số bước so sánh tối đa: 17 lần thay vì 100.000',
        codeSnippet: 'const bf = getHeight(node.left) - getHeight(node.right);\nassert(Math.abs(bf) <= 1);'
      },
      {
        step: 4,
        stageType: 'avl',
        stageFrame: 4,
        title: 'Tia Sáng Đáp Trúng Đích JOB-042850 Bừng Sáng Hào Quang',
        badge: 'Target Found O(log n)',
        color: 'emerald',
        description: 'Tia sáng định vị trúng đích bài đăng JOB-042850. Node bừng sáng hào quang ngọc lục bảo sau đúng 16 phép so sánh nhị phân O(log n)!',
        details: 'Độ phức tạp O(log₂ 100,000) ≈ 17 bước • Tìm thấy bài đăng trong 1.85 µs',
        codeSnippet: 'return { found: node.job, comparisons: 16, latency: "1.85 µs" };'
      }
    ];
  }

  /**
   * Kịch bản mô phỏng Ngăn xếp Stack LIFO: Hoàn tác Báo giá (Lab 3)
   * 1. Thao tác nộp đơn trượt xuống đáy ống (Push)
   * 2. Người dùng nhấn Undo: Đỉnh ngăn xếp phát sáng
   * 3. Thao tác bay vút ra khỏi miệng ống (Pop O(1))
   * 4. Khôi phục trạng thái an toàn
   */
  static getStackUndoSteps() {
    return [
      {
        step: 1,
        stageType: 'stack',
        stageFrame: 1,
        title: 'Thao Tác Nộp Đơn Trượt Vào Đáy Ngăn Xếp (Push LIFO)',
        badge: 'Stack Push',
        color: 'champagne',
        description: 'Khi Freelancer nộp hồ sơ vào JOB-001234, một frame ghi vết hành động trượt từ trên miệng ống rơi xuống nằm ở đỉnh ngăn xếp LIFO.',
        details: 'Stack State: [Frame #1, Frame #2, ... Top: APPLY("JOB-001234")]',
        codeSnippet: 'undoStack.push({ action: "APPLY", jobId: "JOB-001234", timestamp: Date.now() });'
      },
      {
        step: 2,
        stageType: 'stack',
        stageFrame: 2,
        title: 'Nhấn Nút Hoàn Tác: Đỉnh Ngăn Xếp Bừng Sáng Cảnh Báo',
        badge: 'Top Highlight',
        color: 'amber',
        description: 'Người dùng phát hiện báo giá nhầm và nhấn nút "Hoàn tác". Khối thao tác trên cùng ở đỉnh ngăn xếp phát sáng màu hổ phách sẵn sàng được rút ra.',
        details: 'Định vị phần tử trên đỉnh: const top = undoStack.peek(); // Chi phí O(1)',
        codeSnippet: 'if (undoStack.isEmpty()) return;\nconst actionToUndo = undoStack.peek();'
      },
      {
        step: 3,
        stageType: 'stack',
        stageFrame: 3,
        title: 'Thao Tác Bay Vút Lên Khỏi Ống Giải Phóng Bộ Nhớ (Pop O(1))',
        badge: 'Stack Pop O(1)',
        color: 'rose',
        description: 'Khối thao tác ở đỉnh phóng vút lên khỏi miệng ống và biến mất. Ngăn xếp thực hiện Pop chỉ trong 1 thao tác O(1) duy nhất.',
        details: 'Pop thao tác: undoStack.pop() • Con trỏ đỉnh giảm 1 vị trí • RAM giải phóng tức thì',
        codeSnippet: 'const undone = undoStack.pop(); // Rút khỏi đỉnh trong O(1)'
      },
      {
        step: 4,
        stageType: 'stack',
        stageFrame: 4,
        title: 'Khôi Phục Trạng Thái Bài Tuyển Dụng & Bảo Toàn Số Dư',
        badge: 'State Restored',
        color: 'emerald',
        description: 'Hệ thống hoàn trả số lượt tuyển (hiredCount - 1), chuyển trạng thái tin tuyển dụng về "OPEN" và hoàn lại số dư ký quỹ về ví. 0 lỗi sai lệch dữ liệu!',
        details: 'Bảo toàn bất biến: 0 thất thoát số dư • Slot tuyển dụng hoàn trả chính xác',
        codeSnippet: 'job.hiredCount--;\njob.status = "OPEN";\nreturn { success: true, rolledBack: true };'
      }
    ];
  }

  /**
   * Kịch bản mô phỏng Hàng đợi Queue FIFO: Giải ngân Ký quỹ Escrow (Lab 3)
   * 1. Vé giải ngân mới nạp vào đuôi REAR
   * 2. Băng chuyền cuộn tiến lên
   * 3. Vé ở đầu FRONT trượt ra ngoài bắn tiền vào ví Freelancer
   */
  static getQueuePayoutSteps() {
    return [
      {
        step: 1,
        stageType: 'queue',
        stageFrame: 1,
        title: 'Vé Giải Ngân Mới Chạy Vào Đuôi Hàng Đợi (Enqueue REAR)',
        badge: 'Enqueue REAR',
        color: 'champagne',
        description: 'Dự án mới hoàn thành được đưa vào Hàng đợi thanh toán FIFO. Chiếc vé giải ngân $2,500 chạy vào đầu đuôi REAR của băng chuyền.',
        details: 'Queue State: Front: Ticket #1 ➔ Ticket #2 ➔ REAR: [Ticket #3: $2,500]',
        codeSnippet: 'payoutQueue.enqueue({ ticketId: "TK-03", jobId: "JOB-1234", amount: 2500 });'
      },
      {
        step: 2,
        stageType: 'queue',
        stageFrame: 2,
        title: 'Băng Chuyền Cuộn Tới: Vé Ở Đầu FRONT Sẵn Sàng Giải Ngân',
        badge: 'FIFO Queue Shift',
        color: 'ice',
        description: 'Băng chuyền cuộn sang trái. Vé đầu tiên ở đầu FRONT được đưa vào buồng thanh toán theo nguyên tắc công bằng: Ai nộp trước nhận tiền trước.',
        details: 'Đảm bảo tính công bằng First-Come, First-Served: Không bao giờ có chuyện chen ngang hàng đợi!',
        codeSnippet: 'const nextTicket = payoutQueue.peek(); // Lấy vé ở đầu hàng đợi'
      },
      {
        step: 3,
        stageType: 'queue',
        stageFrame: 3,
        title: 'Vé Đầu Tiên Bắn Ra Ngoài, Giải Ngân Ký Quỹ Vào Ví Freelancer',
        badge: 'Dequeue FRONT',
        color: 'emerald',
        description: 'Vé ở đầu FRONT trượt ra ngoài băng chuyền và giải phóng. Tiền ký quỹ Escrow $2,500 được chuyển thẳng vào tài khoản của Freelancer hoàn thành dự án.',
        details: 'Dequeue O(1) • Tiền nạp = Tiền giải ngân + Tiền còn lại • 0 sai lệch số dư',
        codeSnippet: 'const paid = payoutQueue.dequeue();\nescrowVault.release(paid.amount);\nreturn { paid: true };'
      }
    ];
  }
}
