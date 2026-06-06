-- 1. Xóa trận Test cũ (nếu có) để tránh rác DB
DELETE FROM matches WHERE team_a = 'TestTeamA';

-- 2. Tạo một trận đấu thử nghiệm bắt đầu sau 2 PHÚT nữa
INSERT INTO matches (
  id, team_a, team_b, flag_a, flag_b, match_date, stage, group_name, status, 
  base_pool_a, base_pool_b, base_pool_draw, total_votes_a, total_votes_b, total_votes_draw
) VALUES (
  gen_random_uuid(), 'TestTeamA', 'TestTeamB', 'vn', 'us', 
  NOW() + INTERVAL '2 minutes', 'Group Stage', 'Test Group', 'voting',
  1000, 1000, 500, 0, 0, 0
);
