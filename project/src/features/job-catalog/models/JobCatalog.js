/**
 * DANH MỤC LĨNH VỰC & KỸ NĂNG (dùng chung cho trình duyệt, server API và benchmark CLI)
 * ---------------------------------------------------------------------------
 * Mỗi lĩnh vực có danh sách kỹ năng (khóa băm của bảng băm Lab 6) và mẫu tiêu đề.
 * Lọc theo lĩnh vực = hợp các ô băm của từng kỹ năng thuộc lĩnh vực đó: O(số kỹ năng + số kết quả).
 */

export const CATEGORIES = [
  {
    id: 'it', label: 'Lập trình & CNTT', icon: '💻',
    skills: ['react', 'nodejs', 'python', 'vue', 'golang', 'aws', 'docker', 'typescript', 'nextjs', 'devops', 'ai-agent', 'solidity', 'flutter', 'tailwind'],
    titles: ['Xây dựng website bán hàng', 'Phát triển API cho ứng dụng di động', 'Làm trang quản trị (dashboard)', 'Tối ưu tốc độ cơ sở dữ liệu', 'Lập trình app đa nền tảng', 'Tích hợp cổng thanh toán', 'Viết chatbot tự động trả lời', 'Triển khai máy chủ lên cloud', 'Sửa lỗi và nâng cấp hệ thống cũ', 'Làm landing page giới thiệu sản phẩm']
  },
  {
    id: 'design', label: 'Thiết kế & Sáng tạo', icon: '🎨',
    skills: ['figma', 'ui-ux', 'photoshop', 'illustrator', 'branding'],
    titles: ['Thiết kế logo và bộ nhận diện thương hiệu', 'Thiết kế giao diện app di động', 'Vẽ banner quảng cáo mạng xã hội', 'Thiết kế bao bì sản phẩm', 'Làm bộ slide thuyết trình chuyên nghiệp', 'Thiết kế menu nhà hàng']
  },
  {
    id: 'marketing', label: 'Marketing & Bán hàng', icon: '📈',
    skills: ['seo', 'facebook-ads', 'google-ads', 'content-marketing', 'tiktok'],
    titles: ['Chạy quảng cáo Facebook cho shop thời trang', 'Tối ưu SEO website lên top Google', 'Lên kế hoạch nội dung fanpage 1 tháng', 'Quản lý kênh TikTok bán hàng', 'Viết kịch bản livestream bán hàng', 'Nghiên cứu thị trường và đối thủ']
  },
  {
    id: 'writing', label: 'Viết lách & Dịch thuật', icon: '✍️',
    skills: ['copywriting', 'translation-en', 'translation-ja', 'proofreading'],
    titles: ['Viết bài chuẩn SEO cho blog', 'Dịch tài liệu kỹ thuật Anh – Việt', 'Dịch hợp đồng Nhật – Việt', 'Biên tập và soát lỗi sách', 'Viết mô tả sản phẩm cho sàn TMĐT', 'Viết kịch bản video ngắn']
  },
  {
    id: 'video', label: 'Video & Hình ảnh', icon: '🎬',
    skills: ['video-editing', 'premiere', 'after-effects', 'photography', '3d-blender'],
    titles: ['Dựng video quảng cáo 30 giây', 'Chỉnh sửa vlog du lịch', 'Làm video hoạt hình giới thiệu', 'Chụp ảnh sản phẩm cho shop online', 'Dựng mô hình 3D sản phẩm', 'Làm phụ đề cho video YouTube']
  },
  {
    id: 'finance', label: 'Kế toán & Tài chính', icon: '📊',
    skills: ['accounting', 'excel', 'tax', 'financial-analysis'],
    titles: ['Làm sổ sách kế toán hàng tháng', 'Quyết toán thuế cuối năm', 'Lập báo cáo tài chính quý', 'Xây dựng file Excel quản lý kho', 'Phân tích hiệu quả kinh doanh', 'Lập kế hoạch dòng tiền cho startup']
  },
  {
    id: 'education', label: 'Giáo dục & Đào tạo', icon: '📚',
    skills: ['english-tutor', 'math-tutor', 'ielts', 'course-design'],
    titles: ['Gia sư tiếng Anh giao tiếp online', 'Luyện thi IELTS 6.5+', 'Gia sư Toán lớp 9 ôn thi vào 10', 'Soạn khóa học online cho người mới', 'Làm bài giảng điện tử', 'Huấn luyện kỹ năng thuyết trình']
  },
  {
    id: 'admin', label: 'Hành chính & CSKH', icon: '🎧',
    skills: ['data-entry', 'virtual-assistant', 'customer-support'],
    titles: ['Nhập liệu đơn hàng vào hệ thống', 'Trợ lý ảo quản lý lịch và email', 'Trực chat chăm sóc khách hàng ca tối', 'Tổng hợp danh sách khách hàng tiềm năng', 'Trả lời đánh giá trên sàn TMĐT', 'Xử lý đơn đổi trả']
  },
  {
    id: 'engineering', label: 'Kỹ thuật & Kiến trúc', icon: '🏗️',
    skills: ['autocad', 'revit', 'interior-design'],
    titles: ['Vẽ bản vẽ AutoCAD nhà phố', 'Dựng mô hình Revit công trình', 'Thiết kế nội thất căn hộ', 'Bóc tách khối lượng công trình', 'Phối cảnh 3D mặt tiền', 'Thiết kế cải tạo văn phòng']
  }
];

/** Tên hiển thị thân thiện của kỹ năng (khóa băm giữ dạng chữ thường không dấu). */
export const SKILL_LABELS = {
  react: 'React', nodejs: 'Node.js', python: 'Python', vue: 'Vue.js', golang: 'Go', aws: 'AWS', docker: 'Docker',
  typescript: 'TypeScript', nextjs: 'Next.js', devops: 'DevOps', 'ai-agent': 'AI / Chatbot', solidity: 'Blockchain',
  flutter: 'Flutter', tailwind: 'Tailwind CSS',
  figma: 'Figma', 'ui-ux': 'UI/UX', photoshop: 'Photoshop', illustrator: 'Illustrator', branding: 'Thương hiệu',
  seo: 'SEO', 'facebook-ads': 'Facebook Ads', 'google-ads': 'Google Ads', 'content-marketing': 'Content Marketing', tiktok: 'TikTok',
  copywriting: 'Copywriting', 'translation-en': 'Dịch tiếng Anh', 'translation-ja': 'Dịch tiếng Nhật', proofreading: 'Biên tập',
  'video-editing': 'Dựng video', premiere: 'Premiere', 'after-effects': 'After Effects', photography: 'Nhiếp ảnh', '3d-blender': 'Blender 3D',
  accounting: 'Kế toán', excel: 'Excel', tax: 'Thuế', 'financial-analysis': 'Phân tích tài chính',
  'english-tutor': 'Gia sư tiếng Anh', 'math-tutor': 'Gia sư Toán', ielts: 'IELTS', 'course-design': 'Thiết kế khóa học',
  'data-entry': 'Nhập liệu', 'virtual-assistant': 'Trợ lý ảo', 'customer-support': 'Chăm sóc khách hàng',
  autocad: 'AutoCAD', revit: 'Revit', 'interior-design': 'Nội thất'
};

/** Danh sách phẳng mọi kỹ năng (thứ tự cố định để bộ sinh dữ liệu xác định). */
export const ALL_SKILLS = CATEGORIES.flatMap(c => c.skills);

/** Bảng tra kỹ năng → lĩnh vực, O(1). */
export const CATEGORY_OF_SKILL = Object.fromEntries(CATEGORIES.flatMap(c => c.skills.map(s => [s, c.id])));

export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));

export function categoryOfSkill(skill) {
  return CATEGORY_OF_SKILL[String(skill || '').toLowerCase()] || 'other';
}

export function skillLabel(skill) {
  return SKILL_LABELS[skill] || skill;
}

export function categoryLabel(id) {
  return CATEGORY_BY_ID[id]?.label || 'Khác';
}
