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
      if (error) return res.status(500).json({ error: 'Failed to fetch NFTs' });
      return res.status(200).json(data);
    } else if (action === 'myNfts') {
      const { data, error } = await supabase.from('user_nfts').select('*, nft_templates(*)').eq('user_id', user.id);
      if (error) return res.status(500).json({ error: 'Failed to fetch NFTs' });
      return res.status(200).json(data);
    }
  }

  if (req.method === 'POST') {
    const { action } = req.body;
    
    if (action === 'equip') {
      // M-5 FIX: Implement actual equip/unequip
      const { userNftId } = req.body;
      if (!userNftId) return res.status(400).json({ error: 'Missing userNftId' });

      try {
        // Verify ownership
        const { data: nft, error: nftErr } = await supabase.from('user_nfts').select('id, equipped').eq('id', userNftId).eq('user_id', user.id).single();
        if (nftErr || !nft) return res.status(404).json({ error: 'NFT not found or not owned by you' });

        // Toggle equipped status
        const newEquipped = !nft.equipped;
        const { error: updateErr } = await supabase.from('user_nfts').update({ equipped: newEquipped }).eq('id', userNftId);
        if (updateErr) return res.status(500).json({ error: 'Failed to update NFT' });

        return res.status(200).json({ success: true, equipped: newEquipped });
      } catch (e) {
        console.error('NFT equip error:', e);
        return res.status(500).json({ error: 'Server error' });
      }
    }
    
    if (action === 'buy') {
      const { nftId } = req.body;
      try {
        const { data: result, error: rpcError } = await supabase.rpc('buy_nft', {
          p_user_id: user.id,
          p_nft_id: nftId
        });

        if (rpcError) throw rpcError;
        if (!result.success) return res.status(400).json({ error: result.error });

        return res.status(200).json({ success: true, message: `Successfully purchased NFT` });
      } catch (e) {
        console.error('NFT purchase error:', e);
        return res.status(500).json({ error: 'Server error during NFT purchase' });
      }
    }

    return res.status(400).json({ error: 'Invalid action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
