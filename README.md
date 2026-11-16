# TOPFREELANCE CORE // NỀN TẢNG THỊ TRƯỜNG FREELANCER (CTDL & GT)
> **Đồ án Cuối Kỳ Môn Cấu trúc Dữ liệu và Giải thuật (DSA)**  
> **Kiến trúc:** Enterprise Systems Engineering (MVC + Folder by Feature)  
> **Tài nguyên vận hành tối đa:** $\le 1\text{ GB RAM}$, $1\text{ CPU Core}$ (Thực tế chỉ tiêu thụ $\sim 120 - 180\text{ MB RAM}$)

---

## 1. GIỚI THIỆU DỰ ÁN

**TopFreelance Core** là một sàn việc làm Freelancer hoàn chỉnh (Two-Sided Freelance Marketplace), kết nối Doanh nghiệp đăng tuyển dự án với hàng trăm nghìn Freelancer toàn cầu. Khác với các bài tập lý thuyết đơn điệu, dự án được thiết kế theo tư duy của một **Kỹ sư Hệ thống (Systems Engineer)** nhằm chứng minh sức mạnh của Cấu trúc Dữ liệu & Giải thuật trong việc giải quyết các bài toán hóc búa của một nền tảng thực tế:

1. **Lõi Giải thuật Độc lập (Node.js)**: Chạy nhanh qua terminal, tính toán độ trễ với độ phân giải micro-giây ($\mu s$), kiểm soát $0$ rò rỉ bộ nhớ.
2. **Giao diện Dashboard Tỉ lệ vàng (80% – 10% – 10%)**: 
   - **80%**: Sàn việc làm Freelancer tương tác đầy đủ tính năng (Tìm kiếm, Đấu thầu, Lọc giá, Ký quỹ Escrow).
   - **10%**: Kính lúp mô phỏng hoạt động nội tại của từng cấu trúc dữ liệu cho giảng viên xem và vấn đáp.
   - **10%**: Bảng Telemetry đo lường hiệu năng và mức tiêu hao tài nguyên phần cứng theo thời gian thực.
3. **Bộ Kiểm thử Cực hạn (Extreme Stress Testing)**: Giả lập kịch bản **100.000 tác vụ người dùng đồng thời**, chứng minh độ ổn định tuyệt đối và bất biến dữ liệu trong vùng nhớ RAM.

---

## 2. BẢN ĐỒ ÁNH XẠ 7 BÀI LAB (DSA $\rightarrow$ FREELANCE MARKETPLACE)

| Lab | Cấu trúc Dữ liệu & Thuật toán | Nghiệp vụ Sàn Freelancer | Ý nghĩa Kỹ thuật & Big-O |
| :---: | :--- | :--- | :--- |
| **Lab 1** | **ADT & Mảng Tĩnh, Linear Search** | ADT `JobPost`: Quản lý 100.000 tin tuyển dụng tĩnh. Tra cứu mã công việc. | $\Omega(1)$ Best case, $O(n)$ Worst case. Lý giải hạn chế khối nhớ RAM liên tục. |
| **Lab 2** | **Singly & Doubly Linked List** | Danh sách Hồ sơ ứng tuyển (Proposals) & Danh mục việc làm đã lưu. | Chèn đầu $O(1)$, rút đơn giữa $O(1)$, khắc phục phân mảnh bộ nhớ của mảng tĩnh. |
| **Lab 3** | **Stack LIFO & Queue FIFO** | - Hàng đợi xét duyệt hồ sơ & Giải ngân Escrow (Queue FIFO)<br>- Hoàn tác rút lại báo giá nhầm (Stack LIFO) | Đảm bảo tính công bằng (Fairness) cho Freelancer. Thao tác Push/Pop/Enqueue/Dequeue đạt $O(1)$. |
| **Lab 4** | **Cây BST & Cây tự cân bằng AVL** | Chỉ mục tra cứu bài đăng theo `JobID` và `Budget` trong 100.000 việc làm. | Tra cứu $O(\log n)$. Tự động kích hoạt 4 phép xoay (LL, RR, LR, RL) chống suy biến cây khi ID tăng liên tục. |
| **Lab 5** | **Sorting (QuickSort, MergeSort, Multi-key)** | Bộ lọc dự án theo: Ngân sách cao nhất, Deadline gấp nhất, hoặc Rating uy tín (5.0★ $\rightarrow$ 1.0★). | Đối đầu $O(n^2)$ vs $O(n \log n)$ trên 100.000 việc làm. Đảm bảo tính ổn định (Stability) của `MergeSort`. |
| **Lab 6** | **Hash Table, Binary Search, Self-Organizing** | - Bảng băm: Tìm việc tức thì theo Kỹ năng (`React`, `Python`, `Figma`)<br>- Binary Search: Tìm theo dải ngân sách<br>- MTF: Lịch sử tìm kiếm gần đây | Bảng băm $O(1)$ trung bình, rehash động $\alpha > 0.75$. Move-to-Front giảm hơn 50% số bước tra cứu lặp lại. |
| **Lab 7** | **Master Hub & Stress Testing 100k** | Tích hợp hệ sinh thái Freelancer Marketplace hoàn chỉnh + Bộ kiểm thử tải 100.000 thao tác. | Chứng minh kiến trúc đa chỉ mục (Multi-index) cùng trỏ về 1 tham chiếu duy nhất. $0$ vi phạm bất biến dữ liệu. |

---

## 3. BÍ QUYẾT TỐI ƯU HÓA: VÌ SAO CHỈ TỐN ~150MB RAM VÀ 1 CORE CPU?

> **Cam kết:** Dự án chạy mượt mà ngay cả trên máy cấu hình yếu (8GB RAM), cam kết không bao giờ vượt quá 1 CPU Core và 1GB RAM.

1. **Nguyên lý Single Source of Truth (Tham chiếu con trỏ):**
   - Chỉ duy nhất 1 mảng gốc lưu 100.000 đối tượng `JobPost`.
   - Cây AVL, Bảng băm, Hàng đợi, Danh sách liên kết chỉ lưu **con trỏ (memory reference)** tới đối tượng gốc, tuyệt đối không duplicate dữ liệu. 100.000 con trỏ chỉ tốn $\approx 4\,\text{MB}$ RAM!
2. **Khống chế Heap Node.js:**
   - Script chạy backend và benchmark được ép cờ: `--max-old-space-size=512`.
   - Node.js bản chất là Single-threaded Event Loop nên tự động chỉ dùng đúng 1 CPU Core.
3. **Ảo hóa DOM (Virtual Pagination):**
   - Dù hệ sinh thái có 100.000 công việc trong bộ nhớ, giao diện Vue 3 chỉ render $15 - 20$ thẻ công việc đang hiển thị trên màn hình. Trình duyệt chỉ tốn chưa tới $70\,\text{MB}$ RAM.

---

## 4. HƯỚNG DẪN CÀI ĐẶT VÀ KHỞI CHẠY

### Yêu cầu môi trường:
- Node.js >= 18 (Khuyên dùng v20 hoặc v24)
- Trình duyệt Chrome / Edge

### Cài đặt:
```bash
cd project
npm install
cd ..
```

### Các lệnh điều hành hệ thống:
1. **Khởi chạy Giao diện Web Visualizer (Cockpit 80-10-10):**
   ```bash
   npm run dev
   ```
   Mở trình duyệt tại: `http://localhost:5173`

2. **Chạy Kiểm thử Tải Cực hạn (100.000 thao tác ngẫu nhiên):**
   ```bash
   npm run test:stress
   ```

   **Kiểm thử RAM cực hạn** (nạp việc làm tới khi hết bộ nhớ ở 128/256/512/1024 MB, kết quả vẽ trong Inspector › RAM / CPU):
   ```bash
   npm run test:ram
   ```

3. **Chạy toàn bộ unit/integration test (95 test):**
   ```bash
   npm test
   ```

4. **Đóng gói sản phẩm:**
   ```bash
   npm run build
   ```
