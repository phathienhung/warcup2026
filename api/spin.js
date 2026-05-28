import { supabase } from './_lib/supabase.js';
import { validateInitData } from './_lib/auth.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  const initData = req.headers['x-telegram-init-data'];
  const user = validateInitData(initData);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    return res.status(200).json({ tickets: 1, daily_free_spin_available: true });
  }

  if (req.method === 'POST') {
    const { action } = req.body;
    
    if (action === 'spin') {
      // Mock spin
      const reward = { type: 'votes', amount: 5000 };
      
      // Save spin result
      await supabase.from('spin_results').insert({
        user_id: user.id,
        reward_type: reward.type,
        reward_amount: reward.amount
      });
      
      return res.status(200).json({ success: true, reward });
    }
  }
}
