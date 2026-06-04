-- 1. Atomic Milestone Claim
CREATE OR REPLACE FUNCTION claim_friend_milestone(
    p_user_id BIGINT,
    p_milestone_count INT,
    p_reward_type TEXT,
    p_reward_value FLOAT
) RETURNS JSON AS $$
DECLARE
    v_user RECORD;
    v_claimed INT[];
BEGIN
    SELECT * INTO v_user FROM users WHERE telegram_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;

    v_claimed := COALESCE(v_user.claimed_friend_milestones, '{}'::INT[]);

    IF p_milestone_count = ANY(v_claimed) THEN
        RETURN json_build_object('success', false, 'error', 'Milestone already claimed');
    END IF;

    -- Add to array
    v_claimed := array_append(v_claimed, p_milestone_count);

    IF p_reward_type = 'votes' THEN
        UPDATE users SET total_votes = COALESCE(total_votes, 0) + p_reward_value,
                         available_votes = COALESCE(available_votes, 0) + p_reward_value,
                         claimed_friend_milestones = v_claimed
        WHERE telegram_id = p_user_id;
    ELSIF p_reward_type = 'ton' THEN
        UPDATE users SET ton_balance = COALESCE(ton_balance, 0) + p_reward_value,
                         claimed_friend_milestones = v_claimed
        WHERE telegram_id = p_user_id;
    ELSIF p_reward_type = 'energy' THEN
        UPDATE users SET energy = LEAST(COALESCE(energy, 0) + p_reward_value, COALESCE(max_energy, 1000)),
                         claimed_friend_milestones = v_claimed
        WHERE telegram_id = p_user_id;
    ELSIF p_reward_type = 'speed' THEN
        UPDATE users SET mining_speed_bonus = COALESCE(mining_speed_bonus, 0) + p_reward_value,
                         claimed_friend_milestones = v_claimed
        WHERE telegram_id = p_user_id;
    ELSIF p_reward_type = 'regen' THEN
        UPDATE users SET energy_regen_bonus = COALESCE(energy_regen_bonus, 0) + p_reward_value,
                         claimed_friend_milestones = v_claimed
        WHERE telegram_id = p_user_id;
    ELSIF p_reward_type = 'max_energy' THEN
        UPDATE users SET max_energy = COALESCE(max_energy, 1000) + p_reward_value,
                         energy = COALESCE(energy, 0) + p_reward_value,
                         claimed_friend_milestones = v_claimed
        WHERE telegram_id = p_user_id;
    ELSE 
        -- Just mark as claimed if unknown type (fallback)
        UPDATE users SET claimed_friend_milestones = v_claimed WHERE telegram_id = p_user_id;
    END IF;

    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql;

-- 2. Update milestones to include regen and max_energy
UPDATE game_config
SET referral_system_json = '{
  "bot_link": "https://t.me/warcup2026_bot/app",
  "f1_percent": 10,
  "f2_percent": 5,
  "f3_percent": 2,
  "milestones": [
    { "count": 1, "reward_type": "votes", "reward": 10000 },
    { "count": 3, "reward_type": "votes", "reward": 30000 },
    { "count": 5, "reward_type": "votes", "reward": 50000 },
    { "count": 10, "reward_type": "votes", "reward": 100000 },
    { "count": 20, "reward_type": "max_energy", "reward": 500 },
    { "count": 50, "reward_type": "regen", "reward": 1 },
    { "count": 100, "reward_type": "votes", "reward": 1000000 },
    { "count": 200, "reward_type": "regen", "reward": 2 },
    { "count": 500, "reward_type": "max_energy", "reward": 2000 }
  ]
}'::jsonb
WHERE id = 1;
