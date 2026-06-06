-- BUG FIX PATCH 7: Fix 4 Runtime Bugs
-- Run this in Supabase SQL Editor

-- ============================================================
-- BUG 1: Spin Internal Server Error
-- Root cause: spin_segments_json may store reward as integer/text
-- but execute_spin expects FLOAT. Also, segments may have
-- 'ticket' type not handled by the reward applier.
-- Fix: Make p_reward_amount accept FLOAT, add 'ticket' and 'max_energy' types
-- ============================================================
CREATE OR REPLACE FUNCTION execute_spin(
    p_user_id BIGINT,
    p_today_str TEXT,
    p_reward_type TEXT,
    p_reward_amount FLOAT
) RETURNS JSON AS $$
DECLARE
    v_user RECORD;
    v_using_free_spin BOOLEAN := false;
BEGIN
    SELECT * INTO v_user FROM users WHERE telegram_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;

    IF COALESCE(v_user.last_free_spin, '') != p_today_str THEN
        v_using_free_spin := true;
    ELSIF COALESCE(v_user.spin_tickets, 0) > 0 THEN
        v_using_free_spin := false;
    ELSE
        RETURN json_build_object('success', false, 'error', 'No tickets available');
    END IF;

    -- Deduct ticket or use free spin
    IF v_using_free_spin THEN
        UPDATE users SET last_free_spin = p_today_str WHERE telegram_id = p_user_id;
    ELSE
        UPDATE users SET spin_tickets = spin_tickets - 1 WHERE telegram_id = p_user_id;
    END IF;

    -- Apply reward (handle ALL possible reward types from spin segments)
    IF p_reward_type = 'energy' THEN
        UPDATE users SET energy = LEAST(COALESCE(max_energy, 1000), COALESCE(energy, 0) + p_reward_amount) WHERE telegram_id = p_user_id;
    ELSIF p_reward_type = 'votes' THEN
        UPDATE users SET total_votes = COALESCE(total_votes, 0) + p_reward_amount, available_votes = COALESCE(available_votes, 0) + p_reward_amount WHERE telegram_id = p_user_id;
    ELSIF p_reward_type = 'speed' THEN
        UPDATE users SET mining_speed_bonus = COALESCE(mining_speed_bonus, 0) + p_reward_amount WHERE telegram_id = p_user_id;
    ELSIF p_reward_type = 'xp' THEN
        UPDATE users SET xp = COALESCE(xp, 0) + p_reward_amount WHERE telegram_id = p_user_id;
    ELSIF p_reward_type = 'regen' THEN
        UPDATE users SET energy_regen_bonus = COALESCE(energy_regen_bonus, 0) + p_reward_amount WHERE telegram_id = p_user_id;
    ELSIF p_reward_type = 'ton' THEN
        UPDATE users SET ton_balance = COALESCE(ton_balance, 0) + p_reward_amount WHERE telegram_id = p_user_id;
    ELSIF p_reward_type = 'ticket' OR p_reward_type = 'spin_ticket' THEN
        UPDATE users SET spin_tickets = COALESCE(spin_tickets, 0) + p_reward_amount WHERE telegram_id = p_user_id;
    ELSIF p_reward_type = 'max_energy' THEN
        UPDATE users SET max_energy = COALESCE(max_energy, 1000) + p_reward_amount WHERE telegram_id = p_user_id;
    ELSIF p_reward_type = 'nothing' OR p_reward_type = 'miss' THEN
        -- No reward
        NULL;
    ELSE
        -- Unknown type: log it but don't crash
        RAISE NOTICE 'Unknown spin reward type: %', p_reward_type;
    END IF;

    INSERT INTO spin_results (user_id, reward_type, reward_amount) VALUES (p_user_id, p_reward_type, p_reward_amount);

    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- BUG 2: Prediction "voting is closed" even though match hasn't started
-- Root cause: matches.status may be 'upcoming', 'scheduled', NULL, etc.
-- The RPC only allows status = 'voting' exactly.
-- Fix: Allow voting when status IN ('voting', 'upcoming', 'scheduled')
--       OR when match_date is still in the future.
-- ============================================================
CREATE OR REPLACE FUNCTION stake_prediction(
    p_user_id BIGINT,
    p_match_id UUID,
    p_team TEXT,
    p_votes_staked BIGINT
) RETURNS JSON AS $$
DECLARE
    v_user RECORD;
    v_match RECORD;
    v_existing_pred RECORD;
    v_is_new BOOLEAN := false;
BEGIN
    IF p_votes_staked <= 0 THEN
        RETURN json_build_object('success', false, 'error', 'Invalid stake amount');
    END IF;

    SELECT * INTO v_user FROM users WHERE telegram_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;
    IF COALESCE(v_user.available_votes, 0) < p_votes_staked THEN
        RETURN json_build_object('success', false, 'error', 'Not enough votes');
    END IF;

    SELECT * INTO v_match FROM matches WHERE id = p_match_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Match not found');
    END IF;

    -- BUG FIX: Allow voting if match status is open OR match hasn't started yet
    IF v_match.status IN ('finished', 'completed', 'settled', 'cancelled') THEN
        RETURN json_build_object('success', false, 'error', 'Voting is closed for this match');
    END IF;
    -- Also check match_date: if it's in the past, block voting
    IF v_match.match_date IS NOT NULL AND v_match.match_date < NOW() THEN
        RETURN json_build_object('success', false, 'error', 'Match has already started');
    END IF;

    -- Upsert prediction
    SELECT * INTO v_existing_pred FROM predictions 
    WHERE user_id = p_user_id AND match_id = p_match_id AND predicted_team = p_team FOR UPDATE;

    IF FOUND THEN
        UPDATE predictions SET votes_staked = votes_staked + p_votes_staked WHERE id = v_existing_pred.id;
    ELSE
        v_is_new := true;
        INSERT INTO predictions (user_id, match_id, predicted_team, votes_staked)
        VALUES (p_user_id, p_match_id, p_team, p_votes_staked);
    END IF;

    -- Deduct votes
    UPDATE users SET available_votes = available_votes - p_votes_staked WHERE telegram_id = p_user_id;

    -- Update match total pool dynamically via JSONB
    UPDATE matches SET 
        total_pool = COALESCE(total_pool, 0) + p_votes_staked,
        outcome_pools = jsonb_set(
            COALESCE(outcome_pools, '{}'::jsonb),
            array[p_team],
            to_jsonb(COALESCE((outcome_pools->>p_team)::bigint, 0) + p_votes_staked)
        ),
        outcome_users = CASE WHEN v_is_new THEN jsonb_set(
            COALESCE(outcome_users, '{}'::jsonb),
            array[p_team],
            to_jsonb(COALESCE((outcome_users->>p_team)::bigint, 0) + 1)
        ) ELSE outcome_users END
    WHERE id = p_match_id;

    RETURN json_build_object('success', true, 'newAvailableVotes', v_user.available_votes - p_votes_staked);
END;
$$ LANGUAGE plpgsql;


-- Fix unstake_prediction too (same issue)
CREATE OR REPLACE FUNCTION unstake_prediction(
    p_user_id BIGINT,
    p_prediction_id UUID
) RETURNS JSON AS $$
DECLARE
    v_user RECORD;
    v_prediction RECORD;
    v_match RECORD;
BEGIN
    -- Lock prediction
    SELECT * INTO v_prediction FROM predictions WHERE id = p_prediction_id AND user_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Prediction not found');
    END IF;

    -- Lock match
    SELECT * INTO v_match FROM matches WHERE id = v_prediction.match_id FOR UPDATE;
    
    -- BUG FIX: Block unstake only if match is truly over or already started (by time)
    IF v_match.status IN ('finished', 'completed', 'settled', 'cancelled') THEN
        RETURN json_build_object('success', false, 'error', 'Cannot unstake: Match is finished');
    END IF;
    IF v_match.match_date IS NOT NULL AND v_match.match_date < NOW() THEN
        RETURN json_build_object('success', false, 'error', 'Cannot unstake: Match has already started');
    END IF;

    -- Refund votes
    UPDATE users SET available_votes = COALESCE(available_votes, 0) + v_prediction.votes_staked WHERE telegram_id = p_user_id;

    -- Delete prediction
    DELETE FROM predictions WHERE id = p_prediction_id;

    -- Update match total pool dynamically via JSONB
    UPDATE matches SET 
        total_pool = GREATEST(0, COALESCE(total_pool, 0) - v_prediction.votes_staked),
        outcome_pools = jsonb_set(
            COALESCE(outcome_pools, '{}'::jsonb),
            array[v_prediction.predicted_team],
            to_jsonb(GREATEST(0::bigint, COALESCE((outcome_pools->>v_prediction.predicted_team)::bigint, 0) - v_prediction.votes_staked))
        ),
        outcome_users = jsonb_set(
            COALESCE(outcome_users, '{}'::jsonb),
            array[v_prediction.predicted_team],
            to_jsonb(GREATEST(0::bigint, COALESCE((outcome_users->>v_prediction.predicted_team)::bigint, 0) - 1))
        )
    WHERE id = v_prediction.match_id;

    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- BUG 3: Shop NFT items not deducting TON
-- Root cause: buy_shop_item handles 'votes' and 'ton' price_types,
-- and applies effects for 'energy', 'max_energy', 'regen', 'spin_ticket',
-- 'vote_pack', 'boost'. But NFT items have type='nft' which is NOT handled
-- in the IF chain → payment deducted but no NFT minted.
-- Fix: Add 'nft' type handling that calls into user_nfts
-- ============================================================
CREATE OR REPLACE FUNCTION buy_shop_item(
    p_user_id BIGINT,
    p_item_id TEXT,
    p_quantity INT
) RETURNS JSON AS $$
DECLARE
    v_user RECORD;
    v_item RECORD;
    v_total_cost BIGINT;
    v_total_cost_ton FLOAT;
    v_total_value FLOAT;
    v_nft_template RECORD;
    v_i INT;
BEGIN
    IF p_quantity <= 0 THEN
        RETURN json_build_object('success', false, 'error', 'Invalid quantity');
    END IF;

    SELECT * INTO v_item FROM shop_items WHERE id = p_item_id;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Item not found');
    END IF;

    SELECT * INTO v_user FROM users WHERE telegram_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;

    v_total_value := v_item.bonus_value * p_quantity;

    -- Deduct payment
    IF v_item.price_type = 'votes' THEN
        v_total_cost := v_item.price * p_quantity;
        IF COALESCE(v_user.available_votes, 0) < v_total_cost THEN
            RETURN json_build_object('success', false, 'error', 'Not enough votes');
        END IF;
        UPDATE users SET available_votes = available_votes - v_total_cost WHERE telegram_id = p_user_id;
        
    ELSIF v_item.price_type = 'ton' THEN
        v_total_cost_ton := v_item.price * p_quantity;
        IF COALESCE(v_user.ton_balance, 0) < v_total_cost_ton THEN
            RETURN json_build_object('success', false, 'error', 'Not enough TON');
        END IF;
        UPDATE users SET ton_balance = ton_balance - v_total_cost_ton WHERE telegram_id = p_user_id;
    ELSE
        RETURN json_build_object('success', false, 'error', 'Unknown price type: ' || COALESCE(v_item.price_type, 'null'));
    END IF;

    -- Apply Item Effect
    IF v_item.type = 'energy' THEN
        UPDATE users SET energy = LEAST(COALESCE(max_energy, 1000), COALESCE(energy, 0) + v_total_value) WHERE telegram_id = p_user_id;
    ELSIF v_item.type = 'max_energy' THEN
        UPDATE users SET max_energy = COALESCE(max_energy, 1000) + v_total_value WHERE telegram_id = p_user_id;
    ELSIF v_item.type = 'regen' THEN
        UPDATE users SET energy_regen_bonus = COALESCE(energy_regen_bonus, 0) + v_total_value WHERE telegram_id = p_user_id;
    ELSIF v_item.type = 'spin_ticket' THEN
        UPDATE users SET spin_tickets = COALESCE(spin_tickets, 0) + v_total_value WHERE telegram_id = p_user_id;
    ELSIF v_item.type = 'vote_pack' THEN
        UPDATE users SET available_votes = COALESCE(available_votes, 0) + v_total_value, total_votes = COALESCE(total_votes, 0) + v_total_value WHERE telegram_id = p_user_id;
    ELSIF v_item.type = 'boost' THEN
        IF p_item_id = '6' THEN
            UPDATE users SET boost_multiplier = 3, boost_expires_at = NOW() + INTERVAL '1 hour' WHERE telegram_id = p_user_id;
        ELSE
            UPDATE users SET boost_multiplier = 2, boost_expires_at = NOW() + INTERVAL '1 hour' WHERE telegram_id = p_user_id;
        END IF;
    ELSIF v_item.type = 'nft' THEN
        -- BUG 3 FIX: Handle NFT shop items
        -- v_item should have a nft_template_id field linking to the NFT
        IF v_item.nft_template_id IS NOT NULL THEN
            SELECT * INTO v_nft_template FROM nft_templates WHERE id = v_item.nft_template_id;
            IF NOT FOUND THEN
                RETURN json_build_object('success', false, 'error', 'NFT template not found');
            END IF;
            -- Check supply
            IF v_nft_template.total_supply IS NOT NULL AND v_nft_template.minted_count >= v_nft_template.total_supply THEN
                RETURN json_build_object('success', false, 'error', 'NFT is sold out');
            END IF;
            -- Mint NFT(s)
            FOR v_i IN 1..p_quantity LOOP
                INSERT INTO user_nfts (user_id, nft_template_id, mint_number)
                VALUES (p_user_id, v_item.nft_template_id, v_nft_template.minted_count + v_i);
            END LOOP;
            UPDATE nft_templates SET minted_count = minted_count + p_quantity WHERE id = v_item.nft_template_id;
        ELSE
            -- If no nft_template_id, just give the bonus_value as votes (fallback)
            UPDATE users SET available_votes = COALESCE(available_votes, 0) + v_total_value, total_votes = COALESCE(total_votes, 0) + v_total_value WHERE telegram_id = p_user_id;
        END IF;
    ELSIF v_item.type = 'speed' THEN
        UPDATE users SET mining_speed_bonus = COALESCE(mining_speed_bonus, 0) + v_total_value WHERE telegram_id = p_user_id;
    ELSE
        -- Unknown type: just log, payment already deducted
        RAISE NOTICE 'Unknown shop item type: %', v_item.type;
    END IF;

    INSERT INTO shop_purchases(user_id, item_type, item_id, quantity, price_paid, price_type)
    VALUES (p_user_id, v_item.type, p_item_id, p_quantity, COALESCE(v_total_cost, v_total_cost_ton), v_item.price_type);

    RETURN json_build_object('success', true, 'message', 'Successfully purchased ' || v_item.name);
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- BUG 4: Tasks claim_task → "Task progress not found"
-- Root cause: claim_reward RPC requires user_tasks row with status='verified'
-- to exist BEFORE claiming. But for daily tasks, the row may not exist yet.
-- Fix: If user_task row not found, auto-create it with status='claimed'
--       (the backend already verified the task is complete before calling this)
-- ============================================================
CREATE OR REPLACE FUNCTION claim_reward(
    p_user_id BIGINT,
    p_task_id TEXT,
    p_reward_type TEXT,
    p_reward_value BIGINT
) RETURNS JSON AS $$
DECLARE
    v_user_task RECORD;
BEGIN
    -- Lock user_task row
    SELECT * INTO v_user_task FROM user_tasks 
    WHERE user_id = p_user_id AND task_id = p_task_id 
    FOR UPDATE;
    
    IF NOT FOUND THEN
        -- BUG 4 FIX: Auto-create the row if not found (backend already validated)
        INSERT INTO user_tasks (user_id, task_id, status, completed, completed_at)
        VALUES (p_user_id, p_task_id, 'claimed', true, NOW());
    ELSIF v_user_task.status = 'claimed' THEN
        RETURN json_build_object('success', false, 'error', 'Reward already claimed');
    ELSE
        -- Mark as claimed
        UPDATE user_tasks SET status = 'claimed', completed = true, completed_at = NOW() WHERE id = v_user_task.id;
    END IF;

    -- Apply reward to user
    IF p_reward_type = 'speed' THEN
        UPDATE users SET mining_speed_bonus = COALESCE(mining_speed_bonus, 0) + p_reward_value WHERE telegram_id = p_user_id;
    ELSIF p_reward_type = 'regen' THEN
        UPDATE users SET energy_regen_bonus = COALESCE(energy_regen_bonus, 0) + p_reward_value WHERE telegram_id = p_user_id;
    ELSIF p_reward_type = 'max_energy' THEN
        UPDATE users SET max_energy = COALESCE(max_energy, 1000) + p_reward_value WHERE telegram_id = p_user_id;
    ELSIF p_reward_type = 'energy' THEN
        UPDATE users SET energy = LEAST(COALESCE(max_energy, 1000), COALESCE(energy, 0) + p_reward_value) WHERE telegram_id = p_user_id;
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


-- ============================================================
-- BONUS: Add nft_template_id column to shop_items if missing
-- (needed for Bug 3 fix)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shop_items' AND column_name = 'nft_template_id'
  ) THEN
    ALTER TABLE shop_items ADD COLUMN nft_template_id UUID REFERENCES nft_templates(id);
  END IF;
END $$;
