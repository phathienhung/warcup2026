-- 8. Atomic Claim Achievement Reward
CREATE OR REPLACE FUNCTION claim_achievement_reward(
    p_user_id BIGINT,
    p_achievement_id TEXT,
    p_reward_votes BIGINT
) RETURNS JSON AS $$
DECLARE
    v_user RECORD;
BEGIN
    -- Attempt to insert the achievement claim record
    -- If it already exists, this will raise a unique violation error (which we catch)
    BEGIN
        INSERT INTO user_tasks (user_id, task_id, status, completed, completed_at)
        VALUES (p_user_id, p_achievement_id, 'claimed', true, NOW());
    EXCEPTION WHEN unique_violation THEN
        RETURN json_build_object('success', false, 'error', 'Reward already claimed');
    END;

    -- If insert succeeded, we can safely apply the reward
    UPDATE users SET 
        total_votes = COALESCE(total_votes, 0) + p_reward_votes, 
        available_votes = COALESCE(available_votes, 0) + p_reward_votes 
    WHERE telegram_id = p_user_id;

    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql;
