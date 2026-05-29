import { supabase } from '../_lib/supabase.js';
import { validateInitData } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  const initData = req.headers['x-telegram-init-data'];
  const user = validateInitData(initData);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    const { data: items, error } = await supabase.from('shop_items').select('*');
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(items);
  }

  if (req.method === 'POST') {
    const { action, itemId, quantity } = req.body;
    
    if (action === 'buy') {
      // In real app: deduct price, add item to inventory
      return res.status(200).json({ success: true });
    }
    
    return res.status(400).json({ error: 'Invalid action' });
  }
}
