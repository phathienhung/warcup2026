import { supabase } from '../_lib/supabase.js';
import { validateInitData } from '../_lib/auth.js';
import { computeStats, computeLevelFromXp } from '../_lib/gameLogic.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  const initData = req.headers['x-telegram-init-data'];
  const user = validateInitData(initData);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    return res.status(200).json({ success: true, message: 'Use POST to tap' });
  }

  if (req.method === 'POST') {
    const { count } = req.body;
    if (!count || typeof count !== 'number' || !Number.isInteger(count) || count <= 0 || count > 1000) {
      return res.status(400).json({ error: 'Invalid tap count' });
    }

    try {
      // 1. Get current user stats
      const { data: dbUser } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', user.id)
        .single();

      if (!dbUser) return res.status(404).json({ error: 'User not found' });

      // Calculate speed
      const { count: friendCount } = await supabase.from('referrals').select('*', { count: 'exact', head: true }).eq('referrer_id', user.id);
      
      const stats = computeStats(dbUser, friendCount || 0, 1.0, 1.0); // For atomic tap we'll just pass basic speed, in reality we'd pull nfts
      
      // Use Atomic execute_tap RPC
      const { data: result, error: rpcError } = await supabase.rpc('execute_tap', {
        p_user_id: user.id,
        p_count: count,
        p_mining_speed: Math.floor(stats.speed.final)
      });

      if (rpcError) throw rpcError;
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      // Check level up logic
      const totalXp = (dbUser.xp || 0) + (result.taps_applied * 2);
      const newLevel = computeLevelFromXp(totalXp);
      let levelUpData = null;
      
      if (newLevel > (dbUser.level || 1)) {
        const { data: config } = await supabase.from('game_config').select('level_up_reward_type, level_up_reward_value').eq('id', 1).single();
        const rewardType = config?.level_up_reward_type;
        const rewardValue = config?.level_up_reward_value || 0;
        
        const levelUpUpdates = { level: newLevel };
        
        if (rewardType === 'energy') {
          levelUpUpdates.energy = Math.min(dbUser.max_energy || 1000, (dbUser.energy || 0) + rewardValue);
        } else if (rewardType === 'votes') {
          levelUpUpdates.total_votes = (dbUser.total_votes || 0) + rewardValue;
          levelUpUpdates.available_votes = (dbUser.available_votes || 0) + rewardValue;
        } else if (rewardType === 'speed') {
          levelUpUpdates.mining_speed_bonus = (dbUser.mining_speed_bonus || 0) + rewardValue;
        } else if (rewardType === 'xp') {
          levelUpUpdates.xp = totalXp + rewardValue;
        } else if (rewardType === 'max_energy') {
          levelUpUpdates.max_energy = (dbUser.max_energy || 1000) + rewardValue;
        } else if (rewardType === 'ton') {
          levelUpUpdates.ton_balance = (dbUser.ton_balance || 0) + rewardValue;
        }

        await supabase.from('users').update(levelUpUpdates).eq('telegram_id', user.id);
        levelUpData = { newLevel, rewardType, rewardValue };
      }

      // Re-fetch the user to return the updated stats required by gameStore.js
      const { data: updatedUser } = await supabase.from('users').select('*').eq('telegram_id', user.id).single();
      const updatedStats = computeStats(updatedUser, friendCount || 0, 1.0, 1.0);

      return res.status(200).json({ 
        success: true, 
        taps_applied: result.taps_applied, 
        votes_earned: result.votes_earned,
        levelUp: levelUpData,
        stats: {
          totalVotes: updatedUser.total_votes,
          availableVotes: updatedUser.available_votes,
          miningSpeed: updatedStats.speed.final,
          miningSpeedBase: updatedStats.speed.base,
          miningSpeedMultiply: updatedStats.speed.multiply,
          nationMultiplier: 1.0
        }
      });
    } catch (e) {
      console.error('Tap post error:', e);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
