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
        
        const { data: dbUser } = await supabase.from('users').select('*').eq('telegram_id', user.id).single();
        if (!dbUser) return res.status(404).json({ error: 'User not found' });

        // Simulate Ton transaction success (same as shop.js)
        // Add to user_nfts
        const { data: newNft, error: insertError } = await supabase.from('user_nfts').insert({
          user_id: user.id,
          nft_template_id: nft.id,
          mint_number: (nft.minted_count || 0) + 1,
          equipped: false
        }).select().single();
        
        if (insertError) throw insertError;

        // Update nft template minted count
        await supabase.from('nft_templates').update({ minted_count: (nft.minted_count || 0) + 1 }).eq('id', nft.id);
        
        // Update user nft_count and ton_balance
        const updates = { nft_count: (dbUser.nft_count || 0) + 1 };
        const totalCost = Number(nft.price_votes) || 1.5;
        const currentTon = Number(dbUser.ton_balance) || 0;
        if (currentTon >= totalCost || currentTon > 0) {
          updates.ton_balance = Math.max(0, currentTon - totalCost);
        }
        await supabase.from('users').update(updates).eq('telegram_id', user.id);
        
        // Log purchase in shop_purchases
        await supabase.from('shop_purchases').insert({
          user_id: user.id,
          item_type: 'nft',
          item_id: nft.id,
          quantity: 1,
          price_paid: nft.price_votes, // or price_ton if added
          price_type: 'ton'
        });

        return res.status(200).json({ success: true, message: `Successfully purchased ${nft.player_name}` });
      } catch (e) {
        console.error('NFT purchase error:', e);
        return res.status(500).json({ error: 'Server error during NFT purchase' });
      }
    }
  }
}
