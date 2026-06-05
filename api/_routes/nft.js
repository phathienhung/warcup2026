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
      const { nftId } = req.body;
      try {
        const { data: nft } = await supabase.from('nft_templates').select('*').eq('id', nftId).single();
        if (!nft) return res.status(404).json({ error: 'NFT not found' });
        
        const { data: result, error: rpcError } = await supabase.rpc('buy_nft', {
          p_user_id: user.id,
          p_template_id: nft.id,
          p_price: nft.price_votes
        });

        if (rpcError) throw rpcError;

        if (!result.success) {
          return res.status(400).json({ error: result.error });
        }
        
        return res.status(200).json({ success: true, message: `Successfully purchased ${nft.player_name}` });
      } catch (e) {
        console.error('NFT purchase error:', e);
        return res.status(500).json({ error: 'Server error during NFT purchase' });
      }
    }
  }
}
