-- Alter the shop_items table to support floating point prices for TON
ALTER TABLE shop_items
ALTER COLUMN price TYPE FLOAT;

-- Delete any existing local mock data if any
DELETE FROM shop_items;

-- Insert the new shop items
INSERT INTO shop_items (id, type, name, description, icon, price, price_type, bonus_value) VALUES
('1', 'vote_pack', 'Starter Pack', '1,000 Votes', '📦', 0.1, 'ton', 1000),
('2', 'vote_pack', 'Pro Pack', '6,000 Votes (+20% bonus)', '💎', 0.5, 'ton', 6000),
('3', 'vote_pack', 'Mega Pack', '15,000 Votes (+50% bonus)', '🏆', 1.0, 'ton', 15000),
('4', 'energy', 'Energy Refill', 'Full energy refill', '⚡', 0.05, 'ton', 1000),
('5', 'boost', 'Double Mining (1h)', '2x mining speed for 1 hour', '🚀', 0.2, 'ton', 3600),
('6', 'boost', 'Triple Mining (1h)', '3x mining speed for 1 hour', '💫', 0.3, 'ton', 3600),
('7', 'spin_ticket', 'Spin Ticket x1', '1 Lucky Spin ticket', '🎟️', 0.1, 'ton', 1),
('8', 'spin_ticket', 'Spin Ticket x5', '5 Lucky Spin tickets (-20%)', '🎫', 0.4, 'ton', 5);
