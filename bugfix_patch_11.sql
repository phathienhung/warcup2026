-- BUGFIX PATCH 11: Remove incorrect energy capping in RPCs
-- Run this in Supabase SQL Editor

-- In previous patches, we used LEAST(COALESCE(max_energy, 1000), energy + reward)
-- to cap energy. However, max_energy in the DB is just the base value.
-- The true max_energy is dynamically multiplied by NFT/Nation bonuses in the backend.
-- Capping it strictly in SQL causes users to lose energy if their true max is higher.
-- Also, it's a common mechanic to allow reward energy to overflow max_energy.

CREATE OR REPLACE FUNCTION execute_spin(
    p_user_id BIGINT,
    p_today_str TEXT,
    p_reward_type TEXT,
    p_reward_amount FLOAT
) RETURNS JSON AS $$
DECLARE
    v_user RECORD;
    v_using_free_spin BOOLEAN := false;
    v_amount FLOAT;
BEGIN
    v_amount := COALESCE(p_reward_amount, 0);

    SELECT * INTO v_user FROM users WHERE telegram_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;

    IF COALESCE(v_user.last_free_spin::text, '') != p_today_str THEN
        v_using_free_spin := true;
    ELSIF COALESCE(v_user.spin_tickets, 0) > 0 THEN
        v_using_free_spin := false;
    ELSE
        RETURN json_build_object('success', false, 'error', 'No tickets available');
    END IF;

    IF v_using_free_spin THEN
        UPDATE users SET last_free_spin = p_today_str::date WHERE telegram_id = p_user_id;
    ELSE
        UPDATE users SET spin_tickets = COALESCE(spin_tickets, 0) - 1 WHERE telegram_id = p_user_id;
    END IF;

    IF p_reward_type = 'energy' THEN
        -- FIX: Remove LEAST() cap
        UPDATE users SET energy = COALESCE(energy, 0) + v_amount WHERE telegram_id = p_user_id;
    ELSIF p_reward_type = 'votes' THEN
        UPDATE users SET total_votes = COALESCE(total_votes, 0) + v_amount, available_votes = COALESCE(available_votes, 0) + v_amount WHERE telegram_id = p_user_id;
    ELSIF p_reward_type = 'speed' THEN
        UPDATE users SET mining_speed_bonus = COALESCE(mining_speed_bonus, 0) + v_amount WHERE telegram_id = p_user_id;
    ELSIF p_reward_type = 'xp' THEN
        UPDATE users SET xp = COALESCE(xp, 0) + v_amount WHERE telegram_id = p_user_id;
    ELSIF p_reward_type = 'regen' THEN
        UPDATE users SET energy_regen_bonus = COALESCE(energy_regen_bonus, 0) + v_amount WHERE telegram_id = p_user_id;
    ELSIF p_reward_type = 'ton' THEN
        UPDATE users SET ton_balance = COALESCE(ton_balance, 0) + v_amount WHERE telegram_id = p_user_id;
    ELSIF p_reward_type IN ('ticket', 'spin_ticket') THEN
        UPDATE users SET spin_tickets = COALESCE(spin_tickets, 0) + v_amount WHERE telegram_id = p_user_id;
    ELSIF p_reward_type = 'max_energy' THEN
        UPDATE users SET max_energy = COALESCE(max_energy, 1000) + v_amount WHERE telegram_id = p_user_id;
    ELSIF p_reward_type IN ('nothing', 'miss', '') THEN
        NULL;
    ELSE
        RAISE NOTICE 'Unknown spin reward type: %', p_reward_type;
    END IF;

    INSERT INTO spin_results (user_id, reward_type, reward_amount) 
    VALUES (p_user_id, COALESCE(p_reward_type, 'unknown'), v_amount);

    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql;


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
        RETURN json_build_object('success', false, 'error', 'Unknown price type');
    END IF;

    IF v_item.type = 'energy' THEN
        -- FIX: Remove LEAST() cap
        UPDATE users SET energy = COALESCE(energy, 0) + v_total_value WHERE telegram_id = p_user_id;
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
        IF v_item.nft_template_id IS NOT NULL THEN
            SELECT * INTO v_nft_template FROM nft_templates WHERE id = v_item.nft_template_id;
            IF NOT FOUND THEN
                RETURN json_build_object('success', false, 'error', 'NFT template not found');
            END IF;
            IF v_nft_template.total_supply IS NOT NULL AND v_nft_template.minted_count >= v_nft_template.total_supply THEN
                RETURN json_build_object('success', false, 'error', 'NFT is sold out');
            END IF;
            FOR v_i IN 1..p_quantity LOOP
                INSERT INTO user_nfts (user_id, nft_template_id, mint_number)
                VALUES (p_user_id, v_item.nft_template_id, v_nft_template.minted_count + v_i);
            END LOOP;
            UPDATE nft_templates SET minted_count = minted_count + p_quantity WHERE id = v_item.nft_template_id;
        ELSE
            UPDATE users SET available_votes = COALESCE(available_votes, 0) + v_total_value, total_votes = COALESCE(total_votes, 0) + v_total_value WHERE telegram_id = p_user_id;
        END IF;
    ELSIF v_item.type = 'speed' THEN
        UPDATE users SET mining_speed_bonus = COALESCE(mining_speed_bonus, 0) + v_total_value WHERE telegram_id = p_user_id;
    END IF;

    INSERT INTO shop_purchases(user_id, item_type, item_id, quantity, price_paid, price_type)
    VALUES (p_user_id, v_item.type, p_item_id, p_quantity, COALESCE(v_total_cost, v_total_cost_ton), v_item.price_type);

    RETURN json_build_object('success', true, 'message', 'Successfully purchased ' || v_item.name);
END;
$$ LANGUAGE plpgsql;


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
        INSERT INTO user_tasks (user_id, task_id, status, completed, completed_at)
        VALUES (p_user_id, p_task_id, 'claimed', true, NOW());
    ELSIF v_user_task.status = 'claimed' THEN
        RETURN json_build_object('success', false, 'error', 'Reward already claimed');
    ELSE
        UPDATE user_tasks SET status = 'claimed', completed = true, completed_at = NOW() WHERE id = v_user_task.id;
    END IF;

    IF p_reward_type = 'speed' THEN
        UPDATE users SET mining_speed_bonus = COALESCE(mining_speed_bonus, 0) + p_reward_value WHERE telegram_id = p_user_id;
    ELSIF p_reward_type = 'regen' THEN
        UPDATE users SET energy_regen_bonus = COALESCE(energy_regen_bonus, 0) + p_reward_value WHERE telegram_id = p_user_id;
    ELSIF p_reward_type = 'max_energy' THEN
        UPDATE users SET max_energy = COALESCE(max_energy, 1000) + p_reward_value WHERE telegram_id = p_user_id;
    ELSIF p_reward_type = 'energy' THEN
        -- FIX: Remove LEAST() cap
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
