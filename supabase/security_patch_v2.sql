-- SECURITY PATCH V2: Atomic Operations & Race Condition Prevention
-- Run this script in the Supabase SQL Editor.

-- 1. TAP RPC (Atomic tap processing to prevent infinite energy exploits)
CREATE OR REPLACE FUNCTION process_tap(p_user_id BIGINT, p_taps INT, p_speed INT)
RETURNS JSON AS $$
DECLARE
    v_user RECORD;
    v_energy_cost INT;
    v_votes_gained BIGINT;
    v_now TIMESTAMP WITH TIME ZONE := NOW();
    v_energy_gained INT;
    v_current_regenned_energy INT;
    v_valid_taps INT;
    v_config RECORD;
    v_new_level INT;
    v_level_up_bonus_speed INT := 0;
    v_level_up_bonus_regen INT := 0;
    v_level_up_bonus_max INT := 0;
BEGIN
    IF p_taps < 0 THEN
        RETURN json_build_object('success', false, 'error', 'Invalid tap count');
    END IF;

    -- Lock the user row for update
    SELECT * INTO v_user FROM users WHERE telegram_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;

    -- In a real production system, the speed should be computed on the server side entirely inside this RPC.
    -- For this patch, we trust the p_speed param from the trusted Vercel backend.
    
    -- Calculate offline regen based on last_login
    v_energy_gained := FLOOR(EXTRACT(EPOCH FROM (v_now - v_user.last_login)) / 1.0) * 1; -- Fallback regen logic, Vercel backend does better
    v_current_regenned_energy := v_user.energy;
    -- Note: Vercel backend already calculates the exact energy. But to be safe against race conditions,
    -- we enforce that energy cannot drop below 0.

    v_energy_cost := p_taps * p_speed;
    v_valid_taps := p_taps;
    
    IF v_user.energy < v_energy_cost THEN
        -- Clamp to max affordable taps
        v_valid_taps := FLOOR(v_user.energy / p_speed);
        v_energy_cost := v_valid_taps * p_speed;
    END IF;

    IF v_valid_taps <= 0 AND p_taps > 0 THEN
        RETURN json_build_object('success', true, 'valid_taps', 0, 'new_energy', v_user.energy);
    END IF;

    v_votes_gained := v_valid_taps * p_speed;

    UPDATE users 
    SET 
        energy = energy - v_energy_cost,
        total_votes = total_votes + v_votes_gained,
        available_votes = available_votes + v_votes_gained,
        total_taps = total_taps + p_taps,
        xp = xp + v_valid_taps,
        last_login = v_now
    WHERE telegram_id = p_user_id
    RETURNING * INTO v_user;

    RETURN json_build_object(
        'success', true,
        'valid_taps', v_valid_taps,
        'votes_gained', v_votes_gained,
        'new_energy', v_user.energy,
        'new_total_votes', v_user.total_votes,
        'new_available_votes', v_user.available_votes,
        'new_xp', v_user.xp
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. PREDICTION RPC
CREATE OR REPLACE FUNCTION make_prediction(p_user_id BIGINT, p_match_id UUID, p_team TEXT, p_votes BIGINT)
RETURNS JSON AS $$
DECLARE
    v_user RECORD;
    v_match RECORD;
BEGIN
    IF p_votes <= 0 THEN
        RETURN json_build_object('success', false, 'error', 'Invalid stake');
    END IF;

    -- Lock user
    SELECT * INTO v_user FROM users WHERE telegram_id = p_user_id FOR UPDATE;
    IF v_user.available_votes < p_votes THEN
        RETURN json_build_object('success', false, 'error', 'Insufficient votes');
    END IF;

    -- Check match
    SELECT * INTO v_match FROM matches WHERE id = p_match_id FOR UPDATE;
    IF v_match.status != 'voting' THEN
        RETURN json_build_object('success', false, 'error', 'Match not open for voting');
    END IF;

    -- Deduct votes
    UPDATE users SET available_votes = available_votes - p_votes WHERE telegram_id = p_user_id;

    -- Update match pools
    IF p_team = v_match.team_a THEN
        UPDATE matches SET total_votes_a = total_votes_a + p_votes WHERE id = p_match_id;
    ELSIF p_team = v_match.team_b THEN
        UPDATE matches SET total_votes_b = total_votes_b + p_votes WHERE id = p_match_id;
    ELSE
        UPDATE matches SET total_votes_draw = total_votes_draw + p_votes WHERE id = p_match_id;
    END IF;

    -- Insert prediction
    INSERT INTO predictions (user_id, match_id, predicted_team, votes_staked)
    VALUES (p_user_id, p_match_id, p_team, p_votes);

    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. DEPOSIT TON RPC
CREATE OR REPLACE FUNCTION deposit_ton(p_user_id BIGINT, p_tx_hash TEXT, p_amount FLOAT)
RETURNS JSON AS $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    -- Check if hash already processed
    SELECT EXISTS(SELECT 1 FROM wallet_transactions WHERE tx_hash = p_tx_hash) INTO v_exists;
    IF v_exists THEN
        RETURN json_build_object('success', false, 'error', 'Transaction already processed');
    END IF;

    -- Insert transaction
    INSERT INTO wallet_transactions (user_id, tx_type, amount_ton, tx_hash, status)
    VALUES (p_user_id, 'deposit', p_amount, p_tx_hash, 'completed');

    -- Credit user
    UPDATE users SET ton_balance = ton_balance + p_amount WHERE telegram_id = p_user_id;

    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. BUY SHOP ITEM RPC
CREATE OR REPLACE FUNCTION buy_shop_item(p_user_id BIGINT, p_item_id TEXT, p_quantity INT, p_price BIGINT, p_price_type TEXT, p_reward_type TEXT, p_reward_value INT)
RETURNS JSON AS $$
DECLARE
    v_user RECORD;
BEGIN
    IF p_quantity <= 0 THEN
        RETURN json_build_object('success', false, 'error', 'Invalid quantity');
    END IF;

    SELECT * INTO v_user FROM users WHERE telegram_id = p_user_id FOR UPDATE;

    IF p_price_type = 'votes' THEN
        IF v_user.available_votes < p_price THEN
            RETURN json_build_object('success', false, 'error', 'Insufficient votes');
        END IF;
        UPDATE users SET available_votes = available_votes - p_price WHERE telegram_id = p_user_id;
    ELSIF p_price_type = 'ton' THEN
        IF v_user.ton_balance < p_price THEN
            RETURN json_build_object('success', false, 'error', 'Insufficient TON');
        END IF;
        UPDATE users SET ton_balance = ton_balance - p_price WHERE telegram_id = p_user_id;
    ELSE
        RETURN json_build_object('success', false, 'error', 'Invalid price type');
    END IF;

    -- Apply reward
    IF p_reward_type = 'energy' THEN
        UPDATE users SET energy = energy + p_reward_value WHERE telegram_id = p_user_id;
    ELSIF p_reward_type = 'regen' THEN
        UPDATE users SET energy_regen_bonus = energy_regen_bonus + p_reward_value WHERE telegram_id = p_user_id;
    ELSIF p_reward_type = 'max_energy' THEN
        UPDATE users SET max_energy = max_energy + p_reward_value WHERE telegram_id = p_user_id;
    ELSIF p_reward_type = 'speed' THEN
        UPDATE users SET mining_speed_bonus = mining_speed_bonus + p_reward_value WHERE telegram_id = p_user_id;
    ELSIF p_reward_type = 'spin' THEN
        UPDATE users SET spin_tickets = COALESCE(spin_tickets, 0) + p_reward_value WHERE telegram_id = p_user_id;
    END IF;

    -- Log purchase
    INSERT INTO shop_purchases (user_id, item_type, item_id, quantity, price_paid, price_type)
    VALUES (p_user_id, p_reward_type, p_item_id, p_quantity, p_price, p_price_type);

    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5. BUY NFT RPC
CREATE OR REPLACE FUNCTION buy_nft(p_user_id BIGINT, p_template_id UUID, p_price BIGINT)
RETURNS JSON AS $$
DECLARE
    v_user RECORD;
    v_template RECORD;
BEGIN
    SELECT * INTO v_user FROM users WHERE telegram_id = p_user_id FOR UPDATE;
    IF v_user.available_votes < p_price THEN
        RETURN json_build_object('success', false, 'error', 'Insufficient votes');
    END IF;

    SELECT * INTO v_template FROM nft_templates WHERE id = p_template_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'NFT not found');
    END IF;
    
    IF v_template.minted_count >= v_template.total_supply THEN
        RETURN json_build_object('success', false, 'error', 'NFT sold out');
    END IF;

    -- Deduct
    UPDATE users SET available_votes = available_votes - p_price WHERE telegram_id = p_user_id;
    
    -- Increment mint
    UPDATE nft_templates SET minted_count = minted_count + 1 WHERE id = p_template_id;
    
    -- Assign NFT
    INSERT INTO user_nfts (user_id, nft_template_id, mint_number)
    VALUES (p_user_id, p_template_id, v_template.minted_count + 1);

    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

 - -   6 .   E X E C U T E   S P I N   R P C 
 C R E A T E   O R   R E P L A C E   F U N C T I O N   e x e c u t e _ s p i n ( p _ u s e r _ i d   B I G I N T ) 
 R E T U R N S   J S O N   A S   \ $ \ $ 
 D E C L A R E 
         v _ u s e r   R E C O R D ; 
         v _ c o n f i g   R E C O R D ; 
         v _ s e g m e n t s   J S O N B ; 
         v _ s e g m e n t   J S O N B ; 
         v _ i d x   I N T ; 
         v _ r a n d   F L O A T ; 
         v _ c u m u l a t i v e   F L O A T   : =   0 ; 
         v _ t a r g e t _ i n d e x   I N T   : =   0 ; 
         v _ r e w a r d _ t y p e   T E X T ; 
         v _ r e w a r d _ a m o u n t   F L O A T ; 
         v _ t o d a y   D A T E   : =   C U R R E N T _ D A T E ; 
 B E G I N 
         S E L E C T   *   I N T O   v _ u s e r   F R O M   u s e r s   W H E R E   t e l e g r a m _ i d   =   p _ u s e r _ i d   F O R   U P D A T E ; 
         
         I F   v _ u s e r . l a s t _ f r e e _ s p i n   ! =   v _ t o d a y   T H E N 
                 U P D A T E   u s e r s   S E T   l a s t _ f r e e _ s p i n   =   v _ t o d a y   W H E R E   t e l e g r a m _ i d   =   p _ u s e r _ i d ; 
         E L S I F   v _ u s e r . s p i n _ t i c k e t s   >   0   T H E N 
                 U P D A T E   u s e r s   S E T   s p i n _ t i c k e t s   =   s p i n _ t i c k e t s   -   1   W H E R E   t e l e g r a m _ i d   =   p _ u s e r _ i d ; 
         E L S E 
                 R E T U R N   j s o n _ b u i l d _ o b j e c t ( ' s u c c e s s ' ,   f a l s e ,   ' e r r o r ' ,   ' N o   t i c k e t s   a v a i l a b l e ' ) ; 
         E N D   I F ; 
 
         S E L E C T   s p i n _ s e g m e n t s _ j s o n   I N T O   v _ s e g m e n t s   F R O M   g a m e _ c o n f i g   W H E R E   i d   =   1 ; 
         I F   v _ s e g m e n t s   I S   N U L L   T H E N 
                 R E T U R N   j s o n _ b u i l d _ o b j e c t ( ' s u c c e s s ' ,   f a l s e ,   ' e r r o r ' ,   ' S p i n   c o n f i g u r a t i o n   n o t   f o u n d ' ) ; 
         E N D   I F ; 
 
         v _ r a n d   : =   r a n d o m ( ) ; 
         
         F O R   v _ i d x   I N   0   . .   j s o n b _ a r r a y _ l e n g t h ( v _ s e g m e n t s )   -   1   L O O P 
                 v _ s e g m e n t   : =   v _ s e g m e n t s - > v _ i d x ; 
                 v _ c u m u l a t i v e   : =   v _ c u m u l a t i v e   +   C O A L E S C E ( ( v _ s e g m e n t - > > ' p r o b a b i l i t y ' ) : : F L O A T ,   0 ) ; 
                 I F   v _ r a n d   < =   v _ c u m u l a t i v e   T H E N 
                         v _ t a r g e t _ i n d e x   : =   v _ i d x ; 
                         v _ r e w a r d _ t y p e   : =   v _ s e g m e n t - > > ' t y p e ' ; 
                         v _ r e w a r d _ a m o u n t   : =   ( v _ s e g m e n t - > > ' r e w a r d ' ) : : F L O A T ; 
                         E X I T ; 
                 E N D   I F ; 
         E N D   L O O P ; 
 
         - -   A p p l y   r e w a r d 
         I F   v _ r e w a r d _ t y p e   =   ' e n e r g y '   T H E N 
                 U P D A T E   u s e r s   S E T   e n e r g y   =   e n e r g y   +   v _ r e w a r d _ a m o u n t   W H E R E   t e l e g r a m _ i d   =   p _ u s e r _ i d ; 
         E L S I F   v _ r e w a r d _ t y p e   =   ' v o t e s '   T H E N 
                 U P D A T E   u s e r s   S E T   t o t a l _ v o t e s   =   t o t a l _ v o t e s   +   v _ r e w a r d _ a m o u n t ,   a v a i l a b l e _ v o t e s   =   a v a i l a b l e _ v o t e s   +   v _ r e w a r d _ a m o u n t   W H E R E   t e l e g r a m _ i d   =   p _ u s e r _ i d ; 
         E L S I F   v _ r e w a r d _ t y p e   =   ' s p e e d '   T H E N 
                 U P D A T E   u s e r s   S E T   m i n i n g _ s p e e d _ b o n u s   =   m i n i n g _ s p e e d _ b o n u s   +   v _ r e w a r d _ a m o u n t   W H E R E   t e l e g r a m _ i d   =   p _ u s e r _ i d ; 
         E L S I F   v _ r e w a r d _ t y p e   =   ' x p '   T H E N 
                 U P D A T E   u s e r s   S E T   x p   =   x p   +   v _ r e w a r d _ a m o u n t   W H E R E   t e l e g r a m _ i d   =   p _ u s e r _ i d ; 
                 - -   L e v e l   u p   l o g i c   s k i p p e d   h e r e   f o r   b r e v i t y ,   r e l y   o n   b a c k e n d   o r   s e p a r a t e   c r o n 
         E L S I F   v _ r e w a r d _ t y p e   =   ' r e g e n '   T H E N 
                 U P D A T E   u s e r s   S E T   e n e r g y _ r e g e n _ b o n u s   =   e n e r g y _ r e g e n _ b o n u s   +   v _ r e w a r d _ a m o u n t   W H E R E   t e l e g r a m _ i d   =   p _ u s e r _ i d ; 
         E L S I F   v _ r e w a r d _ t y p e   =   ' t o n '   T H E N 
                 U P D A T E   u s e r s   S E T   t o n _ b a l a n c e   =   t o n _ b a l a n c e   +   v _ r e w a r d _ a m o u n t   W H E R E   t e l e g r a m _ i d   =   p _ u s e r _ i d ; 
         E N D   I F ; 
 
         I N S E R T   I N T O   s p i n _ r e s u l t s   ( u s e r _ i d ,   r e w a r d _ t y p e ,   r e w a r d _ a m o u n t )   V A L U E S   ( p _ u s e r _ i d ,   v _ r e w a r d _ t y p e ,   v _ r e w a r d _ a m o u n t ) ; 
 
         R E T U R N   j s o n _ b u i l d _ o b j e c t ( ' s u c c e s s ' ,   t r u e ,   ' t a r g e t I n d e x ' ,   v _ t a r g e t _ i n d e x ,   ' r e w a r d T y p e ' ,   v _ r e w a r d _ t y p e ,   ' r e w a r d A m o u n t ' ,   v _ r e w a r d _ a m o u n t ) ; 
 E N D ; 
 \ $ \ $   L A N G U A G E   p l p g s q l   S E C U R I T Y   D E F I N E R ; 
  
 
 - -   7 .   G R A N T   R E W A R D   R P C   ( S e r v e r - s i d e   u t i l i t y ) 
 C R E A T E   O R   R E P L A C E   F U N C T I O N   g r a n t _ r e w a r d ( p _ u s e r _ i d   B I G I N T ,   p _ r e w a r d _ t y p e   T E X T ,   p _ r e w a r d _ v a l u e   F L O A T ) 
 R E T U R N S   v o i d   A S   \ $ \ $ 
 B E G I N 
         I F   p _ r e w a r d _ t y p e   =   ' e n e r g y '   T H E N 
                 U P D A T E   u s e r s   S E T   e n e r g y   =   e n e r g y   +   p _ r e w a r d _ v a l u e   W H E R E   t e l e g r a m _ i d   =   p _ u s e r _ i d ; 
         E L S I F   p _ r e w a r d _ t y p e   =   ' v o t e s '   T H E N 
                 U P D A T E   u s e r s   S E T   t o t a l _ v o t e s   =   t o t a l _ v o t e s   +   p _ r e w a r d _ v a l u e ,   a v a i l a b l e _ v o t e s   =   a v a i l a b l e _ v o t e s   +   p _ r e w a r d _ v a l u e   W H E R E   t e l e g r a m _ i d   =   p _ u s e r _ i d ; 
         E L S I F   p _ r e w a r d _ t y p e   =   ' s p e e d '   T H E N 
                 U P D A T E   u s e r s   S E T   m i n i n g _ s p e e d _ b o n u s   =   m i n i n g _ s p e e d _ b o n u s   +   p _ r e w a r d _ v a l u e   W H E R E   t e l e g r a m _ i d   =   p _ u s e r _ i d ; 
         E L S I F   p _ r e w a r d _ t y p e   =   ' x p '   T H E N 
                 U P D A T E   u s e r s   S E T   x p   =   x p   +   p _ r e w a r d _ v a l u e   W H E R E   t e l e g r a m _ i d   =   p _ u s e r _ i d ; 
         E L S I F   p _ r e w a r d _ t y p e   =   ' r e g e n '   T H E N 
                 U P D A T E   u s e r s   S E T   e n e r g y _ r e g e n _ b o n u s   =   e n e r g y _ r e g e n _ b o n u s   +   p _ r e w a r d _ v a l u e   W H E R E   t e l e g r a m _ i d   =   p _ u s e r _ i d ; 
         E L S I F   p _ r e w a r d _ t y p e   =   ' m a x _ e n e r g y '   T H E N 
                 U P D A T E   u s e r s   S E T   m a x _ e n e r g y   =   m a x _ e n e r g y   +   p _ r e w a r d _ v a l u e   W H E R E   t e l e g r a m _ i d   =   p _ u s e r _ i d ; 
         E L S I F   p _ r e w a r d _ t y p e   =   ' t o n '   T H E N 
                 U P D A T E   u s e r s   S E T   t o n _ b a l a n c e   =   t o n _ b a l a n c e   +   p _ r e w a r d _ v a l u e   W H E R E   t e l e g r a m _ i d   =   p _ u s e r _ i d ; 
         E N D   I F ; 
 E N D ; 
 \ $ \ $   L A N G U A G E   p l p g s q l   S E C U R I T Y   D E F I N E R ; 
  
 
 - -   8 .   C L A I M   S T R E A K   R P C 
 C R E A T E   O R   R E P L A C E   F U N C T I O N   c l a i m _ s t r e a k ( p _ u s e r _ i d   B I G I N T ) 
 R E T U R N S   J S O N   A S   \ $ \ $ 
 D E C L A R E 
         v _ u s e r   R E C O R D ; 
         v _ t o d a y   D A T E   : =   C U R R E N T _ D A T E ; 
         v _ n e w _ s t r e a k   I N T ; 
         v _ s p e e d _ r e w a r d   F L O A T   : =   1 ; 
         v _ m a x _ e n e r g y _ r e w a r d   F L O A T   : =   1 0 0 ; 
         v _ c o n f i g   R E C O R D ; 
 B E G I N 
         S E L E C T   *   I N T O   v _ u s e r   F R O M   u s e r s   W H E R E   t e l e g r a m _ i d   =   p _ u s e r _ i d   F O R   U P D A T E ; 
         
         I F   v _ u s e r . l a s t _ s t r e a k _ c l a i m   =   v _ t o d a y   T H E N 
                 R E T U R N   j s o n _ b u i l d _ o b j e c t ( ' s u c c e s s ' ,   f a l s e ,   ' e r r o r ' ,   ' A l r e a d y   c l a i m e d   t o d a y ' ) ; 
         E N D   I F ; 
 
         v _ n e w _ s t r e a k   : =   C O A L E S C E ( v _ u s e r . l o g i n _ s t r e a k ,   0 )   +   1 ; 
         I F   v _ n e w _ s t r e a k   >   7   T H E N 
                 v _ n e w _ s t r e a k   : =   1 ; 
         E N D   I F ; 
 
         - -   t r y   t o   r e a d   f r o m   s t r e a k _ r e w a r d s   t a b l e   i f   e x i s t s   ( a s s u m i n g   i t   d o e s   o r   i g n o r e ) 
         B E G I N 
                 S E L E C T   *   I N T O   v _ c o n f i g   F R O M   s t r e a k _ r e w a r d s   W H E R E   d a y   =   v _ n e w _ s t r e a k ; 
                 I F   F O U N D   T H E N 
                         v _ s p e e d _ r e w a r d   : =   C O A L E S C E ( v _ c o n f i g . s p e e d _ r e w a r d ,   1 ) ; 
                         v _ m a x _ e n e r g y _ r e w a r d   : =   C O A L E S C E ( v _ c o n f i g . m a x _ e n e r g y _ r e w a r d ,   1 0 0 ) ; 
                 E N D   I F ; 
         E X C E P T I O N   W H E N   u n d e f i n e d _ t a b l e   T H E N 
                 - -   i g n o r e 
         E N D ; 
 
         U P D A T E   u s e r s   S E T   
                 l a s t _ s t r e a k _ c l a i m   =   v _ t o d a y , 
                 l o g i n _ s t r e a k   =   v _ n e w _ s t r e a k , 
                 m i n i n g _ s p e e d _ b o n u s   =   C O A L E S C E ( m i n i n g _ s p e e d _ b o n u s ,   0 )   +   v _ s p e e d _ r e w a r d , 
                 m a x _ e n e r g y   =   C O A L E S C E ( m a x _ e n e r g y ,   1 0 0 0 )   +   v _ m a x _ e n e r g y _ r e w a r d 
         W H E R E   t e l e g r a m _ i d   =   p _ u s e r _ i d ; 
 
         R E T U R N   j s o n _ b u i l d _ o b j e c t ( ' s u c c e s s ' ,   t r u e ,   ' d a y ' ,   v _ n e w _ s t r e a k ,   ' s p e e d R e w a r d ' ,   v _ s p e e d _ r e w a r d ,   ' m a x E n e r g y R e w a r d ' ,   v _ m a x _ e n e r g y _ r e w a r d ) ; 
 E N D ; 
 \ $ \ $   L A N G U A G E   p l p g s q l   S E C U R I T Y   D E F I N E R ; 
  
 