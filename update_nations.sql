-- Delete all current nations to replace with the accurate 48-team list
-- Source: https://www.24h.com.vn/bong-da/lich-thi-dau-bong-da-world-cup-2026-moi-nhat-c48a1747402.html
DELETE FROM nations;

-- Insert 48 updated nations with correct groups
INSERT INTO nations (code, name, flag, "group", confederation, multiplier) VALUES
-- Group A
('MX', 'Mexico', '🇲🇽', 'A', 'CONCACAF', 1.0),
('ZA', 'South Africa', '🇿🇦', 'A', 'CAF', 1.0),
('KR', 'South Korea', '🇰🇷', 'A', 'AFC', 1.0),
('CZ', 'Czech Republic', '🇨🇿', 'A', 'UEFA', 1.0),
-- Group B
('CA', 'Canada', '🇨🇦', 'B', 'CONCACAF', 1.0),
('BA', 'Bosnia', '🇧🇦', 'B', 'UEFA', 1.0),
('QA', 'Qatar', '🇶🇦', 'B', 'AFC', 1.0),
('CH', 'Switzerland', '🇨🇭', 'B', 'UEFA', 1.0),
-- Group C
('BR', 'Brazil', '🇧🇷', 'C', 'CONMEBOL', 1.0),
('MA', 'Morocco', '🇲🇦', 'C', 'CAF', 1.0),
('HT', 'Haiti', '🇭🇹', 'C', 'CONCACAF', 1.0),
('SC', 'Scotland', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'C', 'UEFA', 1.0),
-- Group D
('US', 'United States', '🇺🇸', 'D', 'CONCACAF', 1.0),
('PY', 'Paraguay', '🇵🇾', 'D', 'CONMEBOL', 1.0),
('AU', 'Australia', '🇦🇺', 'D', 'AFC', 1.0),
('TR', 'Turkey', '🇹🇷', 'D', 'UEFA', 1.0),
-- Group E
('DE', 'Germany', '🇩🇪', 'E', 'UEFA', 1.0),
('CW', 'Curacao', '🇨🇼', 'E', 'CONCACAF', 1.0),
('CI', 'Ivory Coast', '🇨🇮', 'E', 'CAF', 1.0),
('EC', 'Ecuador', '🇪🇨', 'E', 'CONMEBOL', 1.0),
-- Group F
('NL', 'Netherlands', '🇳🇱', 'F', 'UEFA', 1.0),
('JP', 'Japan', '🇯🇵', 'F', 'AFC', 1.0),
('SE', 'Sweden', '🇸🇪', 'F', 'UEFA', 1.0),
('TN', 'Tunisia', '🇹🇳', 'F', 'CAF', 1.0),
-- Group G
('BE', 'Belgium', '🇧🇪', 'G', 'UEFA', 1.0),
('EG', 'Egypt', '🇪🇬', 'G', 'CAF', 1.0),
('IR', 'Iran', '🇮🇷', 'G', 'AFC', 1.0),
('NZ', 'New Zealand', '🇳🇿', 'G', 'OFC', 1.0),
-- Group H
('ES', 'Spain', '🇪🇸', 'H', 'UEFA', 1.0),
('CV', 'Cabo Verde', '🇨🇻', 'H', 'CAF', 1.0),
('SA', 'Saudi Arabia', '🇸🇦', 'H', 'AFC', 1.0),
('UY', 'Uruguay', '🇺🇾', 'H', 'CONMEBOL', 1.0),
-- Group I
('FR', 'France', '🇫🇷', 'I', 'UEFA', 1.0),
('SN', 'Senegal', '🇸🇳', 'I', 'CAF', 1.0),
('IQ', 'Iraq', '🇮🇶', 'I', 'AFC', 1.0),
('NO', 'Norway', '🇳🇴', 'I', 'UEFA', 1.0),
-- Group J
('AR', 'Argentina', '🇦🇷', 'J', 'CONMEBOL', 1.0),
('AT', 'Austria', '🇦🇹', 'J', 'UEFA', 1.0),
('JO', 'Jordan', '🇯🇴', 'J', 'AFC', 1.0),
('DZ', 'Algeria', '🇩🇿', 'J', 'CAF', 1.0),
-- Group K
('PT', 'Portugal', '🇵🇹', 'K', 'UEFA', 1.0),
('CD', 'DR Congo', '🇨🇩', 'K', 'CAF', 1.0),
('UZ', 'Uzbekistan', '🇺🇿', 'K', 'AFC', 1.0),
('CO', 'Colombia', '🇨🇴', 'K', 'CONMEBOL', 1.0),
-- Group L
('GB', 'England', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'L', 'UEFA', 1.0),
('HR', 'Croatia', '🇭🇷', 'L', 'UEFA', 1.0),
('GH', 'Ghana', '🇬🇭', 'L', 'CAF', 1.0),
('PA', 'Panama', '🇵🇦', 'L', 'CONCACAF', 1.0);
