import { supabase } from './_lib/supabase.js';
import { validateInitData } from './_lib/auth.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  const initData = req.headers['x-telegram-init-data'];
  const user = validateInitData(initData);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    const action = req.query.action || 'list';
    
    if (action === 'list') {
      const { data, error } = await supabase.from('nft_templates').select('*');
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data);
    } else if (action === 'myNfts') {
      const { data, error } = await supabase.from('user_nfts').select('*, nft_templates(*)').eq('user_id', user.id);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data);
    }
  }

  if (req.method === 'POST') {
    const { action } = req.body;
    
    if (action === 'equip') {
      // Logic to equip NFT
      return res.status(200).json({ success: true });
    }
    
    if (action === 'buy') {
      // Logic to buy NFT
      return res.status(200).json({ success: true });
    }
  }
}
