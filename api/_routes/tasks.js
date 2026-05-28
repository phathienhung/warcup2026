import { supabase } from '../_lib/supabase.js';
import { validateInitData } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  const initData = req.headers['x-telegram-init-data'];
  const user = validateInitData(initData);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    // Return mock tasks structure joined with user progress
    return res.status(200).json([
      { id: 't1', title: 'Daily Tap 10k', progress: 5000, target: 10000, completed: false },
      { id: 't2', title: 'Join Clan', progress: 0, target: 1, completed: false }
    ]);
  }

  if (req.method === 'POST') {
    const { action, taskId } = req.body;
    
    if (action === 'claim') {
      // In real app: verify task is complete, add reward, mark claimed
      return res.status(200).json({ success: true, reward: 5000 });
    }
    
    return res.status(400).json({ error: 'Invalid action' });
  }
}
