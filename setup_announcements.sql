-- ==============================================================================
-- BẢNG THÔNG BÁO TỪ GAME (announcements)
-- Hiển thị thông báo, cập nhật, cảnh báo cho người dùng
-- ==============================================================================
CREATE TABLE IF NOT EXISTS announcements (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'info', -- 'info', 'feature', 'warning'
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Thêm một vài thông báo mẫu ban đầu
INSERT INTO announcements (title, content, type)
VALUES 
  ('🚀 Phase 1: Mining Votes is LIVE!', 'Bắt đầu cày cuốc (tap) để nhận thật nhiều Votes. Đây là nguyên liệu quan trọng nhất chuẩn bị cho Phase 2 (Dự đoán World Cup 2026).', 'feature'),
  ('⚽ Hướng dẫn chơi Prediction Mode', 'Nhấn vào tab Predict để chọn trận đấu. Đặt cược cho Đội thắng hoặc Tỉ số chính xác để nhận phần thưởng khổng lồ từ Parimutuel Pool.', 'info')
ON CONFLICT DO NOTHING;

-- HƯỚNG DẪN:
-- Chạy đoạn mã này trong Supabase SQL Editor.
-- Sau này muốn gửi thông báo mới cho toàn bộ người chơi,
-- bạn chỉ việc Insert một dòng mới vào bảng `announcements`.
