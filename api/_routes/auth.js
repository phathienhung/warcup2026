import { supabase } from '../_lib/supabase.js';
import { validateInitData } from '../_lib/auth.js';
import { computeStats } from '../_lib/gameLogic.js';

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
    } else {
      // Update login streak and last login
      const lastLoginDate = new Date(dbUser.last_login || new Date()).toISOString().split('T')[0];
      const now = new Date();
      const nowDate = now.toISOString().split('T')[0];
      
      let newStreak = dbUser.login_streak || 1;
      
      if (lastLoginDate !== nowDate) {
        // It's a new day
        const yesterday = new Date(now);
        yesterday.setUTCDate(yesterday.getUTCDate() - 1);
        const yesterdayDate = yesterday.toISOString().split('T')[0];
        
        if (lastLoginDate === yesterdayDate) {
          // Logged in yesterday, increment streak
          newStreak += 1;
        } else {
          // Missed a day, reset streak
          newStreak = 1;
        }
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
          let template = n.nft_templates;
          if (Array.isArray(template)) template = template[0];
          const mult = Number(template?.vote_multiplier);
          if (!isNaN(mult) && mult > 0) {
            nftMultiplier += (mult - 1.0);
          }
        });
      }

      const stats = computeStats(dbUser, friendCount || 0, nftMultiplier);

      // Offline energy regen
      const regenRateMs = 1000;
      const energyGained = Math.floor(diffMs / regenRateMs) * stats.regen.final;
      const newEnergy = Math.min(stats.maxEnergy.final, (dbUser.energy || 0) + energyGained);

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
      
      // Store computed stats temporarily to avoid recomputing below
      dbUser._stats = stats;
      dbUser._friendCount = friendCount;
      dbUser._nftMultiplier = nftMultiplier;
    }

    // Process referral if exists and user has no referrer yet
    if (start_param && start_param.startsWith('WC26_') && !dbUser.referred_by) {
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
        dbUser.referred_by = referrer.telegram_id;
      }
    }

    // Calculate mining speed (use cached stats if available)
    const friendCount = dbUser._friendCount || 0;
    const nftMultiplier = dbUser._nftMultiplier || 1.0;
    const stats = dbUser._stats || computeStats(dbUser, friendCount, nftMultiplier);

    return res.status(200).json({ 
      user: {
        ...dbUser,
        mining_speed: stats.speed.final,
        mining_speed_base: stats.speed.base,
        mining_speed_multiply: stats.speed.multiply,
        energy_regen_amount: stats.regen.final,
        energy_regen_base: stats.regen.base,
        energy_regen_multiply: stats.regen.multiply,
        max_energy: stats.maxEnergy.final,
        max_energy_base: stats.maxEnergy.base,
        max_energy_multiply: stats.maxEnergy.multiply,
        reward_multiplier: stats.rewardMultiplier,
        friend_count: friendCount || 0,
        nft_count: dbUser.nft_count || 0
      } 
    });

  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
