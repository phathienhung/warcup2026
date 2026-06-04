import { supabase } from '../_lib/supabase.js';
import { validateInitData } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  const initData = req.headers['x-telegram-init-data'];
  const user = validateInitData(initData);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    const { data: dbUser } = await supabase.from('users').select('referral_code').eq('telegram_id', user.id).single();
    
    const { data: friends } = await supabase.from('referrals').select('referred_id, users!referred_id(username, total_votes)').eq('referrer_id', user.id);
    
    return res.status(200).json({
      referral_code: dbUser?.referral_code,
      friends: friends || []
    });
  }

  if (req.method === 'POST') {
    const { action, milestoneCount } = req.body;
    
    if (action === 'claim_milestone') {
      try {
        // 1. Get friend count and user stats
        const { count: friendCount } = await supabase.from('referrals').select('referred_id', { count: 'exact', head: true }).eq('referrer_id', user.id);
        const { data: dbUser } = await supabase.from('users').select('claimed_friend_milestones, total_votes, available_votes, energy, max_energy, mining_speed_bonus, energy_regen_bonus, ton_balance').eq('telegram_id', user.id).single();
        
        if (friendCount < milestoneCount) {
          return res.status(400).json({ error: 'Not enough friends for this milestone' });
        }
        
        const claimed = dbUser.claimed_friend_milestones || [];
        if (claimed.includes(milestoneCount)) {
          return res.status(400).json({ error: 'Milestone already claimed' });
        }

        // 2. Read config
        const { data: config } = await supabase.from('game_config').select('referral_system_json').eq('id', 1).single();
        const milestones = config?.referral_system_json?.milestones || [];
        const milestone = milestones.find(m => m.count === milestoneCount);
        
        if (!milestone) {
          return res.status(400).json({ error: 'Invalid milestone' });
        }

        // 3. Grant Reward
        const rewardType = milestone.reward_type;
        const rewardValue = Number(milestone.reward);
        
        const updates = {
          claimed_friend_milestones: [...claimed, milestoneCount]
        };
        
        if (rewardType === 'votes') {
          updates.total_votes = Number(dbUser.total_votes || 0) + rewardValue;
          updates.available_votes = Number(dbUser.available_votes || 0) + rewardValue;
        } else if (rewardType === 'ton') {
          updates.ton_balance = Number(dbUser.ton_balance || 0) + rewardValue;
        } else if (rewardType === 'energy') {
          updates.energy = Math.min(Number(dbUser.energy || 0) + rewardValue, Number(dbUser.max_energy || 1000));
        } else if (rewardType === 'speed') {
          updates.mining_speed_bonus = Number(dbUser.mining_speed_bonus || 0) + rewardValue;
        } else if (rewardType === 'regen') {
          updates.energy_regen_bonus = Number(dbUser.energy_regen_bonus || 0) + rewardValue;
        } else if (rewardType === 'max_energy') {
          updates.max_energy = Number(dbUser.max_energy || 1000) + rewardValue;
          updates.energy = Number(dbUser.energy || 0) + rewardValue; // Heal user when max energy increases
        }
        
        await supabase.from('users').update(updates).eq('telegram_id', user.id);
        
        return res.status(200).json({ success: true, rewardType, rewardValue });
      } catch (err) {
        console.error('Milestone claim error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
