/**
 * AuthStore.js
 * Quản lý phiên đăng nhập và phân quyền 2 vai trò: Freelancer & Business
 * Cấp phát 2 tài khoản độc lập phục vụ trải nghiệm và thuyết trình đồ án
 */

import { reactive, computed } from 'vue';

class AuthStore {
  constructor() {
    this.state = reactive({
      currentRole: 'business', // Mặc định là 'business' (Doanh nghiệp) hoặc 'freelancer' (Ứng viên)
      users: {
        freelancer: {
          id: 'USR-FL-001',
          role: 'freelancer',
          email: 'alex.freelancer@topfreelance.io',
          name: 'Alex Vance',
          title: 'Senior Fullstack & AI Engineer',
          avatar: '👨‍💻',
          rating: 4.95,
          completedJobs: 42,
          walletBalance: 25000, // Tiền thù lao đã giải ngân từ hợp đồng
          bio: 'Chuyên gia phát triển ứng dụng hiệu năng cao với Vue 3, Node.js và hệ thống phân tán.'
        },
        business: {
          id: 'USR-BIZ-002',
          role: 'business',
          email: 'sarah.enterprise@techcorp.global',
          name: 'Sarah Jenkins',
          title: 'Giám Đốc Kỹ Thuật - TechCorp Global',
          avatar: '🏢',
          rating: 5.0,
          totalHired: 128,
          walletBalance: 1000000, // Ngân sách doanh nghiệp sẵn sàng ký quỹ Escrow
          bio: 'Tập đoàn công nghệ TechCorp Global - Tuyển dụng nhân tài tự do phát triển dự án toàn cầu.'
        }
      },
      isAuthModalOpen: false
    });
  }

  get currentUser() {
    return this.state.users[this.state.currentRole] || this.state.users.freelancer;
  }

  get isBusiness() {
    return this.state.currentRole === 'business';
  }

  get isFreelancer() {
    return this.state.currentRole === 'freelancer';
  }

  switchRole(newRole) {
    if (this.state.users[newRole]) {
      this.state.currentRole = newRole;
      return true;
    }
    return false;
  }

  toggleRole() {
    this.state.currentRole = this.state.currentRole === 'business' ? 'freelancer' : 'business';
  }

  openAuthModal() {
    this.state.isAuthModalOpen = true;
  }

  closeAuthModal() {
    this.state.isAuthModalOpen = false;
  }
}

export const authStore = new AuthStore();
