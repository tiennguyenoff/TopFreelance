-- =====================================================================
-- TOPFREELANCE CORE: HỆ THỐNG CƠ SỞ DỮ LIỆU QUAN HỆ MYSQL 8.0
-- Mô hình Hybrid: MySQL Lưu Trữ Bền Vững <---> In-Memory DSA Engine (100k Jobs)
-- =====================================================================

CREATE DATABASE IF NOT EXISTS `topfreelance_db` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `topfreelance_db`;
SET NAMES utf8mb4; -- tránh lỗi tiếng Việt bị lưu thành "???" khi import qua mysql CLI

-- ---------------------------------------------------------------------
-- 1. BẢNG NGƯỜI DÙNG & TÀI KHOẢN (USERS & RBAC ROLES)
-- Hỗ trợ 2 vai trò: 'freelancer' (Người tìm việc) & 'business' (Doanh nghiệp)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
    `id` VARCHAR(36) NOT NULL PRIMARY KEY,
    `email` VARCHAR(191) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `full_name` VARCHAR(100) NOT NULL,
    `title` VARCHAR(150) DEFAULT NULL,
    `role` ENUM('freelancer', 'business', 'admin') NOT NULL DEFAULT 'freelancer',
    `avatar_url` VARCHAR(255) DEFAULT NULL,
    `rating` DECIMAL(3, 2) NOT NULL DEFAULT 5.00,
    `wallet_balance` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `bio` TEXT DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_users_role` (`role`),
    INDEX `idx_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 2. BẢNG DỰ ÁN TUYỂN DỤNG (JOB POSTS)
-- Lưu trữ bài đăng gốc (Single Source of Truth) kết nối Cây AVL & Horner Hash
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `jobs` (
    `id` VARCHAR(32) NOT NULL PRIMARY KEY,          -- Mã tự tăng định dạng JOB-XXXXXX
    `employer_id` VARCHAR(36) NOT NULL,             -- FK trỏ về users(id) vai trò business
    `title` VARCHAR(255) NOT NULL,
    `skill_tag` VARCHAR(50) NOT NULL,               -- Kỹ năng chính (react, python, figma...)
    `category` VARCHAR(30) NOT NULL DEFAULT 'it',   -- Lĩnh vực (it, design, marketing, writing, video, finance, education, admin, engineering)
    `budget` DECIMAL(12, 2) NOT NULL,               -- Ngân sách thù lao thỏa thuận ($)
    `escrow_balance` DECIMAL(12, 2) NOT NULL,       -- Số tiền đã khóa ký quỹ Escrow bảo chứng 100%
    `slots` INT UNSIGNED NOT NULL DEFAULT 1,        -- Số lượng freelancer cần tuyển
    `hired_count` INT UNSIGNED NOT NULL DEFAULT 0,  -- Số lượng đã tuyển thực tế
    `deadline_days` INT UNSIGNED NOT NULL,          -- Hạn chót hoàn thành (ngày)
    `client_rating` DECIMAL(3, 2) NOT NULL DEFAULT 5.00,
    `status` ENUM('OPEN', 'FILLED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'OPEN',
    `description` TEXT DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_jobs_skill` (`skill_tag`),
    INDEX `idx_jobs_category` (`category`),
    INDEX `idx_jobs_budget` (`budget`),
    INDEX `idx_jobs_status` (`status`),
    INDEX `idx_jobs_employer` (`employer_id`),
    CONSTRAINT `fk_jobs_employer` FOREIGN KEY (`employer_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 2b. HỒ SƠ NĂNG LỰC FREELANCER (trang "Hồ sơ" — nhà tuyển dụng xem khi nhận đơn)
-- skills / portfolio lưu dạng JSON text; server kiểm tra URL chỉ http(s)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `freelancer_profiles` (
    `user_id` VARCHAR(36) NOT NULL PRIMARY KEY,
    `hourly_rate` INT UNSIGNED NOT NULL DEFAULT 0,
    `location` VARCHAR(100) DEFAULT NULL,
    `skills` TEXT DEFAULT NULL,
    `portfolio` TEXT DEFAULT NULL,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_profile_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 3. BẢNG HỒ SƠ ỨNG TUYỂN & ĐẤU THẦU (BIDDING PROPOSALS)
-- Ánh xạ vật lý vào Danh sách liên kết đôi (Doubly Linked List) trong RAM
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `proposals` (
    `id` VARCHAR(36) NOT NULL PRIMARY KEY,
    `job_id` VARCHAR(32) NOT NULL,                  -- FK trỏ về jobs(id)
    `freelancer_id` VARCHAR(36) NOT NULL,           -- FK trỏ về users(id) vai trò freelancer
    `bid_amount` DECIMAL(12, 2) NOT NULL,           -- Mức thù lao đề xuất ($)
    `cover_letter` TEXT DEFAULT NULL,
    `status` ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN') NOT NULL DEFAULT 'PENDING', -- rút đơn = DELETE (WITHDRAWN chỉ giữ để tương thích dữ liệu cũ)
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_proposals_job` (`job_id`),
    INDEX `idx_proposals_freelancer` (`freelancer_id`),
    CONSTRAINT `fk_proposals_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_proposals_freelancer` FOREIGN KEY (`freelancer_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 4. BẢNG HỢP ĐỒNG KÝ QUỸ ESCROW (ESCROW CONTRACTS & PAYOUT QUEUE)
-- Ánh xạ vật lý vào Hàng đợi FIFO (Lab 3) giải ngân tự động công bằng
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `escrow_contracts` (
    `id` VARCHAR(36) NOT NULL PRIMARY KEY,
    `job_id` VARCHAR(32) NOT NULL,
    `employer_id` VARCHAR(36) NOT NULL,
    `freelancer_id` VARCHAR(36) DEFAULT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `status` ENUM('LOCKED', 'DISBURSED', 'REFUNDED') NOT NULL DEFAULT 'LOCKED',
    `payout_ticket_id` VARCHAR(32) DEFAULT NULL,    -- Mã vé trong Queue FIFO (TK-01, TK-02...)
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `disbursed_at` TIMESTAMP NULL DEFAULT NULL,
    INDEX `idx_escrow_job` (`job_id`),
    INDEX `idx_escrow_status` (`status`),
    CONSTRAINT `fk_escrow_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 5. BẢNG CHỈ MỤC BẢNG BĂM HORNER (PRE-COMPUTED HORNER HASH BUCKETS)
-- Tối ưu tốc độ tải mảng 100.000 việc làm từ đĩa vào RAM khi khởi động
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `skills_hash_index` (
    `bucket_index` INT UNSIGNED NOT NULL,           -- Giá trị băm: h = (h * 31 + ASCII) % 133337
    `skill_tag` VARCHAR(50) NOT NULL,
    `job_id` VARCHAR(32) NOT NULL,
    PRIMARY KEY (`bucket_index`, `job_id`),
    INDEX `idx_hash_skill` (`skill_tag`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- DỮ LIỆU MẪU CẤP PHÁT 2 TÀI KHOẢN KHỞI TẠO (SEED DATA)
-- ---------------------------------------------------------------------
INSERT INTO `users` (`id`, `email`, `password_hash`, `full_name`, `title`, `role`, `rating`, `wallet_balance`, `bio`) 
VALUES 
('USR-FL-001', 'alex.freelancer@topfreelance.io', '$2b$12$eX4mpleHashFreelancerKey...', 'Alex Vance', 'Senior Fullstack & AI Engineer', 'freelancer', 4.95, 25000.00, 'Chuyên gia phát triển ứng dụng phân tán với Vue 3 và Node.js.'),
('USR-BIZ-002', 'sarah.enterprise@techcorp.global', '$2b$12$eX4mpleHashEmployerKey...', 'Sarah Jenkins', 'Giám Đốc Tuyển Dụng - TechCorp Global', 'business', 5.00, 1000000.00, 'Tập đoàn TechCorp Global - Tìm kiếm nhân tài tự do trên toàn thế giới.')
ON DUPLICATE KEY UPDATE `email` = VALUES(`email`);
