-- 9. Atomic Claim Streak Reward
CREATE OR REPLACE FUNCTION claim_streak_reward(
    p_user_id BIGINT,
    p_today_str TEXT
) RETURNS JSON AS $$
DECLARE
    v_user RECORD;
    v_new_streak INT;
    v_speed_reward INT := 1;
    v_max_energy_reward INT := 100;
    v_streak_config RECORD;
BEGIN
    SELECT * INTO v_user FROM users WHERE telegram_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;

    IF COALESCE(v_user.last_streak_claim, '') = p_today_str THEN
        RETURN json_build_object('success', false, 'error', 'Already claimed today');
    END IF;

    v_new_streak := COALESCE(v_user.login_streak, 0);
    IF v_new_streak >= 7 THEN
        v_new_streak := 1;
    ELSE
        v_new_streak := v_new_streak + 1;
    END IF;

    -- Try to fetch config, fallback handled by COALESCE below if empty
    BEGIN
        SELECT speed_reward, max_energy_reward INTO v_streak_config FROM streak_rewards WHERE day = v_new_streak;
        IF FOUND THEN
            v_speed_reward := COALESCE(v_streak_config.speed_reward, 1);
            v_max_energy_reward := COALESCE(v_streak_config.max_energy_reward, 100);
        END IF;
    EXCEPTION WHEN undefined_table THEN
        -- table doesn't exist yet, ignore
    END;

    UPDATE users SET 
        last_streak_claim = p_today_str,
        login_streak = v_new_streak,
        mining_speed_bonus = COALESCE(mining_speed_bonus, 0) + v_speed_reward,
        max_energy = COALESCE(max_energy, 1000) + v_max_energy_reward
    WHERE telegram_id = p_user_id;

    RETURN json_build_object(
        'success', true, 
        'day', v_new_streak, 
        'speedReward', v_speed_reward, 
        'maxEnergyReward', v_max_energy_reward
    );
END;
$$ LANGUAGE plpgsql;
