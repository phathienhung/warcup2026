import { supabase } from '../_lib/supabase.js';
import { validateInitData } from '../_lib/auth.js';
import { computeLevelFromXp } from '../_lib/gameLogic.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  const initData = req.headers['x-telegram-init-data'];
  const user = validateInitData(initData);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    const { data: dbUser } = await supabase.from('users').select('spin_tickets, last_free_spin').eq('telegram_id', user.id).single();
    if (!dbUser) return res.status(404).json({ error: 'User not found' });
    
    const today = new Date().toISOString().split('T')[0];
    const daily_free_spin_available = dbUser.last_free_spin !== today;
    
    return res.status(200).json({ 
      tickets: dbUser.spin_tickets || 0, 
      daily_free_spin_available 
    });
  }

  if (req.method === 'POST') {
    const { action } = req.body;
    
    if (action === 'start_spin') {
      try {
        const { data: dbUser } = await supabase.from('users').select('spin_tickets, last_free_spin, energy, total_votes, available_votes, mining_speed_bonus, xp, level, energy_regen_bonus, max_energy, ton_balance').eq('telegram_id', user.id).single();
        if (!dbUser) return res.status(404).json({ error: 'User not found' });
        
        const today = new Date().toISOString().split('T')[0];
        let usingFreeSpin = false;

        if (dbUser.last_free_spin !== today) {
          usingFreeSpin = true;
        } else if (dbUser.spin_tickets > 0) {
          usingFreeSpin = false;
        } else {
          return res.status(400).json({ error: 'No tickets available' });
        }

        // Fetch segments
        const { data: config } = await supabase.from('game_config').select('spin_segments_json, level_up_reward_type, level_up_reward_value').eq('id', 1).single();
        const segments = config?.spin_segments_json || [];
        
        if (segments.length === 0) {
           return res.status(500).json({ error: 'Spin configuration missing' });
        }

        // Pick a random index based on probability
        const rand = Math.random();
        let cumulative = 0;
        let targetIndex = 0;
        for (let i = 0; i < segments.length; i++) {
            cumulative += segments[i].probability || (1 / segments.length);
            if (rand <= cumulative) {
                targetIndex = i;
                break;
            }
        }
        
        const reward = segments[targetIndex];
        const rewardType = reward.type || 'nothing';
        const rewardAmount = Number(reward.reward) || 0;
        
        // Use Atomic RPC to execute spin
        const { data: rpcResult, error: rpcError } = await supabase.rpc('execute_spin', {
          p_user_id: user.id,
          p_today_str: today,
          p_reward_type: rewardType,
          p_reward_amount: rewardAmount
        });

        if (rpcError) throw rpcError;
        if (!rpcResult.success) {
          return res.status(400).json({ error: rpcResult.error });
        }

        // The frontend now doesn't need to call save_reward.
        // It just animates to targetIndex.
        return res.status(200).json({ success: true, targetIndex, reward });
      } catch (err) {
        console.error('Spin error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }
    
    // Legacy support to prevent frontend crashing if it still calls it
    if (action === 'save_reward') {
      return res.status(200).json({ success: true, message: 'Handled by start_spin now' });
    }

    return res.status(400).json({ error: 'Invalid action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
