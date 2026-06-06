import { supabase } from '../_lib/supabase.js';
import { validateInitData } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  const initData = req.headers['x-telegram-init-data'];
  const user = validateInitData(initData);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    const action = req.query.action;
    if (action === 'profile') {
      const { data, error } = await supabase.from('users').select('*').eq('telegram_id', user.id).single();
      if (error) return res.status(500).json({ error: 'Failed to fetch profile' });
      return res.status(200).json(data);
    }
    return res.status(400).json({ error: 'Invalid action' });
  }

  if (req.method === 'POST') {
    const { action } = req.body;
    
    if (action === 'updateNation') {
      const { nation } = req.body;
      if (!nation) return res.status(400).json({ error: 'Nation is required' });
      
      // M-7 FIX: Validate nation exists
      const { data: validNation } = await supabase.from('nations').select('code').eq('code', nation).single();
      if (!validNation) return res.status(400).json({ error: 'Invalid nation code' });

      const { error } = await supabase
        .from('users')
        .update({ favorite_nation: nation })
        .eq('telegram_id', user.id);
        
      if (error) return res.status(500).json({ error: 'Failed to update nation' });
      return res.status(200).json({ success: true, nation });
    }
    
    return res.status(400).json({ error: 'Invalid action' });
  }
}
