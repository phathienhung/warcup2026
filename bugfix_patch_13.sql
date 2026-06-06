-- BUGFIX PATCH 12: Fix Tasks Claiming Bypass and Tap Race Condition
-- Run this in Supabase SQL Editor

-- 1. Fix claim_reward RPC to enforce 'verified' status
CREATE OR REPLACE FUNCTION claim_reward(
    p_user_id BIGINT,
    p_task_id TEXT,
    p_reward_type TEXT,
    p_reward_value BIGINT
) RETURNS JSON AS $$
DECLARE
    v_user_task RECORD;
BEGIN
    SELECT * INTO v_user_task FROM user_tasks 
    WHERE user_id = p_user_id AND task_id = p_task_id 
    FOR UPDATE;
    
    IF NOT FOUND THEN
        -- Task was never verified!
        RETURN json_build_object('success', false, 'error', 'Task has not been verified yet');
    ELSIF v_user_task.status = 'claimed' THEN
        RETURN json_build_object('success', false, 'error', 'Reward already claimed');
    ELSIF v_user_task.status != 'verified' THEN
        RETURN json_build_object('success', false, 'error', 'Task must be verified before claiming');
    ELSE
        -- Update to claimed
        UPDATE user_tasks SET status = 'claimed', completed = true, completed_at = NOW() WHERE id = v_user_task.id;
    END IF;

    -- Apply rewards
    IF p_reward_type = 'speed' THEN
        UPDATE users SET mining_speed_bonus = COALESCE(mining_speed_bonus, 0) + p_reward_value WHERE telegram_id = p_user_id;
    ELSIF p_reward_type = 'regen' THEN
        UPDATE users SET energy_regen_bonus = COALESCE(energy_regen_bonus, 0) + p_reward_value WHERE telegram_id = p_user_id;
    ELSIF p_reward_type = 'max_energy' THEN
        UPDATE users SET max_energy = COALESCE(max_energy, 1000) + p_reward_value WHERE telegram_id = p_user_id;
    ELSIF p_reward_type = 'energy' THEN
        UPDATE users SET energy = COALESCE(energy, 0) + p_reward_value WHERE telegram_id = p_user_id;
    ELSIF p_reward_type = 'votes' THEN
        UPDATE users SET total_votes = COALESCE(total_votes, 0) + p_reward_value, available_votes = COALESCE(available_votes, 0) + p_reward_value WHERE telegram_id = p_user_id;
    ELSIF p_reward_type = 'xp' THEN
        UPDATE users SET xp = COALESCE(xp, 0) + p_reward_value WHERE telegram_id = p_user_id;
    ELSIF p_reward_type = 'ton' THEN
        UPDATE users SET ton_balance = COALESCE(ton_balance, 0) + p_reward_value WHERE telegram_id = p_user_id;
    ELSIF p_reward_type = 'spin_ticket' OR p_reward_type = 'ticket' THEN
        UPDATE users SET spin_tickets = COALESCE(spin_tickets, 0) + p_reward_value WHERE telegram_id = p_user_id;
    END IF;

    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql;

-- 2. Create execute_tap RPC to prevent Race Condition
CREATE OR REPLACE FUNCTION execute_tap(
    p_user_id BIGINT,
    p_count INT,
    p_mining_speed INT
) RETURNS JSON AS $$
DECLARE
    v_user RECORD;
    v_cost INT;
    v_reward INT;
BEGIN
    IF p_count <= 0 OR p_count > 5000 THEN
        RETURN json_build_object('success', false, 'error', 'Invalid tap count');
    END IF;

    v_cost := p_count * p_mining_speed;
    v_reward := p_count * p_mining_speed;

    SELECT * INTO v_user FROM users WHERE telegram_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;

    IF COALESCE(v_user.energy, 0) < v_cost THEN
        -- Allow partial tap if they have some energy
        v_cost := COALESCE(v_user.energy, 0);
        v_reward := v_cost;
        
        IF v_cost <= 0 THEN
            RETURN json_build_object('success', false, 'error', 'Not enough energy');
        END IF;
    END IF;

    UPDATE users SET 
        energy = energy - v_cost,
        total_votes = COALESCE(total_votes, 0) + v_reward,
        available_votes = COALESCE(available_votes, 0) + v_reward,
        total_taps = COALESCE(total_taps, 0) + v_cost,
        xp = COALESCE(xp, 0) + (v_cost * 2)
    WHERE telegram_id = p_user_id;

    RETURN json_build_object(
        'success', true,
        'taps_applied', v_cost,
        'votes_earned', v_reward
    );
END;
$$ LANGUAGE plpgsql;
