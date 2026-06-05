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
    const { action, reward, segCount } = req.body;
    
    if (action === 'start_spin') {
      try {
        const { data, error } = await supabase.rpc('execute_spin', { p_user_id: user.id });
        if (error) throw error;
        
        if (!data.success) {
          return res.status(400).json({ error: data.error });
        }
        
        return res.status(200).json(data);
      } catch (err) {
        console.error('Spin execution error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }
  }
}
