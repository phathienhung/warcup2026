-- Delete all current nations to replace with the accurate 48-team list
DELETE FROM nations;

-- Insert 48 updated nations with correct groups based on FIFA 2026 allocation
INSERT INTO nations (code, name, flag, "group", confederation, multiplier) VALUES
('FR', 'France', '🇫🇷', 'A', 'UEFA', 1.0),
('PL', 'Poland', '🇵🇱', 'A', 'UEFA', 1.0),
('US', 'United States', '🇺🇸', 'A', 'CONCACAF', 1.0),
('UZ', 'Uzbekistan', '🇺🇿', 'A', 'AFC', 1.0),

('GB', 'England', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'B', 'UEFA', 1.0),
('SE', 'Sweden', '🇸🇪', 'B', 'UEFA', 1.0),
('MX', 'Mexico', '🇲🇽', 'B', 'CONCACAF', 1.0),
('DZ', 'Algeria', '🇩🇿', 'B', 'CAF', 1.0),

('ES', 'Spain', '🇪🇸', 'C', 'UEFA', 1.0),
('UA', 'Ukraine', '🇺🇦', 'C', 'UEFA', 1.0),
('CA', 'Canada', '🇨🇦', 'C', 'CONCACAF', 1.0),
('PE', 'Peru', '🇵🇪', 'C', 'CONMEBOL', 1.0),

('DE', 'Germany', '🇩🇪', 'D', 'UEFA', 1.0),
('RS', 'Serbia', '🇷🇸', 'D', 'UEFA', 1.0),
('AR', 'Argentina', '🇦🇷', 'D', 'CONMEBOL', 1.0),
('CI', 'Ivory Coast', '🇨🇮', 'D', 'CAF', 1.0),

('PT', 'Portugal', '🇵🇹', 'E', 'UEFA', 1.0),
('BR', 'Brazil', '🇧🇷', 'E', 'CONMEBOL', 1.0),
('ML', 'Mali', '🇲🇱', 'E', 'CAF', 1.0),
('IQ', 'Iraq', '🇮🇶', 'E', 'AFC', 1.0),

('NL', 'Netherlands', '🇳🇱', 'F', 'UEFA', 1.0),
('UY', 'Uruguay', '🇺🇾', 'F', 'CONMEBOL', 1.0),
('ZA', 'South Africa', '🇿🇦', 'F', 'CAF', 1.0),
('QA', 'Qatar', '🇶🇦', 'F', 'AFC', 1.0),

('IT', 'Italy', '🇮🇹', 'G', 'UEFA', 1.0),
('CO', 'Colombia', '🇨🇴', 'G', 'CONMEBOL', 1.0),
('CM', 'Cameroon', '🇨🇲', 'G', 'CAF', 1.0),
('SA', 'Saudi Arabia', '🇸🇦', 'G', 'AFC', 1.0),

('BE', 'Belgium', '🇧🇪', 'H', 'UEFA', 1.0),
('EC', 'Ecuador', '🇪🇨', 'H', 'CONMEBOL', 1.0),
('TN', 'Tunisia', '🇹🇳', 'H', 'CAF', 1.0),
('AU', 'Australia', '🇦🇺', 'H', 'AFC', 1.0),

('HR', 'Croatia', '🇭🇷', 'I', 'UEFA', 1.0),
('VE', 'Venezuela', '🇻🇪', 'I', 'CONMEBOL', 1.0),
('EG', 'Egypt', '🇪🇬', 'I', 'CAF', 1.0),
('NZ', 'New Zealand', '🇳🇿', 'I', 'OFC', 1.0),

('CH', 'Switzerland', '🇨🇭', 'J', 'UEFA', 1.0),
('PA', 'Panama', '🇵🇦', 'J', 'CONCACAF', 1.0),
('NG', 'Nigeria', '🇳🇬', 'J', 'CAF', 1.0),
('KR', 'South Korea', '🇰🇷', 'J', 'AFC', 1.0),

('DK', 'Denmark', '🇩🇰', 'K', 'UEFA', 1.0),
('CR', 'Costa Rica', '🇨🇷', 'K', 'CONCACAF', 1.0),
('SN', 'Senegal', '🇸🇳', 'K', 'CAF', 1.0),
('IR', 'Iran', '🇮🇷', 'K', 'AFC', 1.0),

('AT', 'Austria', '🇦🇹', 'L', 'UEFA', 1.0),
('JM', 'Jamaica', '🇯🇲', 'L', 'CONCACAF', 1.0),
('MA', 'Morocco', '🇲🇦', 'L', 'CAF', 1.0),
('JP', 'Japan', '🇯🇵', 'L', 'AFC', 1.0);
