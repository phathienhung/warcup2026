import { supabase } from '../_lib/supabase.js';
import { validateInitData } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  const initData = req.headers['x-telegram-init-data'];
  const user = validateInitData(initData);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    const action = req.query.action;
    if (action === 'history') {
      const { data, error } = await supabase
        .from('shop_purchases')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data);
    }
    
    // Default GET: return shop items
    const { data: shopItems, error: shopError } = await supabase.from('shop_items').select('*').order('price', { ascending: true });
    if (shopError) return res.status(500).json({ error: shopError.message });
    return res.status(200).json(shopItems); 
  }

  if (req.method === 'POST') {
    const { action, itemId, quantity = 1 } = req.body;
    
    if (action === 'buy') {
      try {
        const { data: item } = await supabase.from('shop_items').select('*').eq('id', itemId).single();
        if (!item) return res.status(404).json({ error: 'Item not found' });
        
        // For stars/ton, we just simulate success here for now,
        // but in real app it would be handled via Telegram Stars or TON backend verifier.
        // The frontend already requested tonConnectUI.sendTransaction before calling this.
        
        const { data: result, error: rpcError } = await supabase.rpc('buy_shop_item', {
          p_user_id: user.id,
          p_item_id: itemId,
          p_quantity: quantity
        });

        if (rpcError) throw rpcError;

        if (!result.success) {
          return res.status(400).json({ error: result.error });
        }
        
        return res.status(200).json({ success: true, message: result.message });
      } catch (e) {
        console.error('Shop purchase error:', e);
        return res.status(500).json({ error: 'Server error during purchase' });
      }
    }
    
    return res.status(400).json({ error: 'Invalid action' });
  }
}
