import { supabase } from '../_lib/supabase.js';
import { validateInitData } from '../_lib/auth.js';
import { computeSpeed } from '../_lib/gameLogic.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const initData = req.headers['x-telegram-init-data'];
    const user = validateInitData(initData);
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { start_param } = req.body || {};

    // Check if user exists
    let { data: dbUser } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', user.id)
      .single();

    if (!dbUser) {
      // Create new user
      const referralCode = `WC26_${user.id}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      
      const { data: newUser, error } = await supabase
        .from('users')
        .insert({
          telegram_id: user.id,
          username: user.username,
          first_name: user.first_name,
          avatar_url: user.photo_url,
          referral_code: referralCode,
        })
        .select()
        .single();
        
      if (error) throw error;
      dbUser = newUser;

      // Process referral if exists
      if (start_param && start_param.startsWith('WC26_')) {
        const { data: referrer } = await supabase
          .from('users')
          .select('telegram_id')
          .eq('referral_code', start_param)
          .single();
          
        if (referrer && referrer.telegram_id !== user.id) {
          await supabase.from('referrals').insert({
            referrer_id: referrer.telegram_id,
            referred_id: user.id
          });
          
          await supabase.from('users').update({ referred_by: referrer.telegram_id }).eq('telegram_id', user.id);
          
          // Bonus logic could go here
        }
      }
    } else {
      // Update login streak and last login
      const lastLogin = new Date(dbUser.last_login || new Date());
      const now = new Date();
      const diffHours = (now - lastLogin) / (1000 * 60 * 60);
      const diffMs = now - lastLogin;
      
      let newStreak = dbUser.login_streak;
      if (diffHours > 24 && diffHours < 48) {
        newStreak += 1;
      } else if (diffHours >= 48) {
        newStreak = 1;
      }

      // Offline energy regen
      const regenRateMs = 1000;
      const regenMultiplier = 1 + (dbUser.energy_regen_bonus || 0);
      const energyGained = Math.floor(diffMs / regenRateMs) * regenMultiplier;
      const newEnergy = Math.min(dbUser.max_energy || 1000, (dbUser.energy || 0) + energyGained);

      await supabase
        .from('users')
        .update({ 
          last_login: now.toISOString(), 
          login_streak: newStreak, 
          username: user.username,
          energy: newEnergy 
        })
        .eq('telegram_id', user.id);
        
      dbUser.login_streak = newStreak;
      dbUser.energy = newEnergy;
    }

    // Get friend count for mining speed calculation
    const { count: friendCount } = await supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_id', user.id);

    // Get NFT multiplier
    const { data: userNfts } = await supabase
      .from('user_nfts')
      .select('nft_templates(vote_multiplier)')
      .eq('user_id', user.id);
      
    let nftMultiplier = 1.0;
    if (userNfts) {
      userNfts.forEach(n => {
        if (n.nft_templates && typeof n.nft_templates.vote_multiplier === 'number') {
          nftMultiplier += (n.nft_templates.vote_multiplier - 1.0);
        }
      });
    }

    // Calculate mining speed
    const computedSpeed = computeSpeed(dbUser, friendCount || 0, nftMultiplier);

    res.status(200).json({
      user: {
        ...dbUser,
        mining_speed: computedSpeed,
        ton_balance: dbUser.ton_balance || 0,
        friend_count: friendCount || 0,
        energy_regen_bonus: dbUser.energy_regen_bonus || 0
      }
    });

  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
