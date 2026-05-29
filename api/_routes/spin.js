import { supabase } from '../_lib/supabase.js';
import { validateInitData } from '../_lib/auth.js';
import { computeLevelFromXp } from '../_lib/gameLogic.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  const initData = req.headers['x-telegram-init-data'];
  const user = validateInitData(initData);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    return res.status(200).json({ tickets: 1, daily_free_spin_available: true });
  }

  if (req.method === 'POST') {
    const { action, reward } = req.body;
    
    if (action === 'save_reward' && reward) {
      try {
        // Fetch current user stats
        const { data: dbUser } = await supabase.from('users').select('*').eq('telegram_id', user.id).single();
        if (!dbUser) return res.status(404).json({ error: 'User not found' });

        const updates = {};
        
        if (reward.type === 'energy') {
          updates.energy = Math.min(dbUser.max_energy || 1000, (dbUser.energy || 0) + reward.reward);
        } else if (reward.type === 'votes') {
          updates.total_votes = (dbUser.total_votes || 0) + reward.reward;
          updates.available_votes = (dbUser.available_votes || 0) + reward.reward;
        } else if (reward.type === 'speed') {
          // Note: mining speed is derived in some places, but we can store a bonus
          updates.mining_speed_bonus = (dbUser.mining_speed_bonus || 0) + reward.reward;
        } else if (reward.type === 'xp') {
          updates.xp = (dbUser.xp || 0) + reward.reward;
          const newLevel = computeLevelFromXp(updates.xp);
          if (newLevel > (dbUser.level || 1)) {
            updates.level = newLevel;
            const { data: config } = await supabase.from('game_config').select('level_up_reward_type, level_up_reward_value').eq('id', 1).single();
            const levelsGained = newLevel - (dbUser.level || 1);
            const rewardType = config?.level_up_reward_type || 'speed';
            const rewardValue = (config?.level_up_reward_value || 1) * levelsGained;

            if (rewardType === 'speed') {
              updates.mining_speed_bonus = (dbUser.mining_speed_bonus || 0) + rewardValue;
            } else if (rewardType === 'regen') {
              updates.energy_regen_bonus = (dbUser.energy_regen_bonus || 0) + rewardValue;
            } else if (rewardType === 'max_energy') {
              updates.max_energy = (dbUser.max_energy || 1000) + rewardValue;
            }
          }
        } else if (reward.type === 'regen') {
          updates.energy_regen_bonus = (dbUser.energy_regen_bonus || 0) + reward.reward;
        } else if (reward.type === 'ton') {
          updates.ton_balance = (dbUser.ton_balance || 0) + reward.reward;
        }

        // Save to users table
        if (Object.keys(updates).length > 0) {
          await supabase.from('users').update(updates).eq('telegram_id', user.id);
        }

        // Save spin history
        await supabase.from('spin_results').insert({
          user_id: user.id,
          reward_type: reward.type,
          reward_amount: reward.reward
        });
        
        return res.status(200).json({ success: true, updated_bonus: updates.mining_speed_bonus });
      } catch (err) {
        console.error('Spin save error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }
  }
}
