import { supabase } from '../_lib/supabase.js';
import { validateInitData } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  const initData = req.headers['x-telegram-init-data'];
  const user = validateInitData(initData);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    const action = req.query.action || 'list';
    
    if (action === 'list') {
      const { data, error } = await supabase.from('clans').select('*').order('total_votes', { ascending: false }).limit(20);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data);
    }
  }

  if (req.method === 'POST') {
    const { action } = req.body;
    
    if (action === 'create') {
      const { name, nation } = req.body;
      const { error } = await supabase.from('clans').insert({
        name, nation, leader_id: user.id
      });
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true });
    }
    
    if (action === 'join') {
      return res.status(200).json({ success: true });
    }
  }
}
