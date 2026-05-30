import { supabase } from '../_lib/supabase.js';
import { validateInitData } from '../_lib/auth.js';

const SHOP_ITEMS = [
  { id: 1, name: 'Starter Pack', type: 'vote_pack', priceType: 'ton', price: 0.1, value: 1000, description: '1,000 Votes', icon: '📦' },
  { id: 2, name: 'Pro Pack', type: 'vote_pack', priceType: 'ton', price: 0.5, value: 6000, description: '6,000 Votes (+20% bonus)', icon: '💎' },
  { id: 3, name: 'Mega Pack', type: 'vote_pack', priceType: 'ton', price: 1.0, value: 15000, description: '15,000 Votes (+50% bonus)', icon: '🏆' },
  { id: 4, name: 'Energy Refill', type: 'energy', priceType: 'ton', price: 0.05, value: 1000, description: 'Full energy refill', icon: '⚡' },
  { id: 5, name: 'Double Mining (1h)', type: 'boost', priceType: 'ton', price: 0.2, value: 3600, description: '2x mining speed for 1 hour', icon: '🚀' },
  { id: 6, name: 'Triple Mining (1h)', type: 'boost', priceType: 'ton', price: 0.3, value: 3600, description: '3x mining speed for 1 hour', icon: '💫' },
  { id: 7, name: 'Spin Ticket x1', type: 'spin_ticket', priceType: 'ton', price: 0.1, value: 1, description: '1 Lucky Spin ticket', icon: '🎟️' },
  { id: 8, name: 'Spin Ticket x5', type: 'spin_ticket', priceType: 'ton', price: 0.4, value: 5, description: '5 Lucky Spin tickets (-20%)', icon: '🎫' },
];

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
    
    return res.status(200).json(SHOP_ITEMS); 
  }

  if (req.method === 'POST') {
    const { action, itemId, quantity = 1 } = req.body;
    
    if (action === 'buy') {
      try {
        const item = SHOP_ITEMS.find(i => String(i.id) === String(itemId));
        if (!item) return res.status(404).json({ error: 'Item not found' });
        
        // For stars/ton, we just simulate success here for now,
        // but in real app it would be handled via Telegram Stars or TON backend verifier.
        // The frontend already requested tonConnectUI.sendTransaction before calling this.
        
        const { data: dbUser } = await supabase.from('users').select('*').eq('telegram_id', user.id).single();
        if (!dbUser) return res.status(404).json({ error: 'User not found' });
        
        const totalCost = item.price * quantity;
        const totalValue = item.value * quantity;
        const updates = {};
        
        if (item.priceType === 'votes') {
          if ((dbUser.available_votes || 0) < totalCost) {
            return res.status(400).json({ error: 'Not enough votes' });
          }
          updates.available_votes = dbUser.available_votes - totalCost;
        }

        // Apply item effects
        if (item.type === 'energy') {
          updates.energy = Math.min((dbUser.energy || 0) + totalValue, dbUser.max_energy || 1000);
        } else if (item.type === 'spin_ticket') {
          updates.spin_tickets = (dbUser.spin_tickets || 0) + totalValue;
        } else if (item.type === 'vote_pack') {
          updates.available_votes = (updates.available_votes !== undefined ? updates.available_votes : (dbUser.available_votes || 0)) + totalValue;
          updates.total_votes = (dbUser.total_votes || 0) + totalValue;
        } else if (item.type === 'boost') {
          // Simplification for hackathon: just give permanent speed boost
          updates.mining_speed_bonus = (dbUser.mining_speed_bonus || 0) + 1;
        }
        
        if (Object.keys(updates).length > 0) {
          await supabase.from('users').update(updates).eq('telegram_id', user.id);
        }
        
        // Log purchase
        await supabase.from('shop_purchases').insert({
          user_id: user.id,
          item_type: item.type,
          item_id: item.id,
          quantity: quantity,
          price_paid: totalCost,
          price_type: item.priceType
        });
        
        return res.status(200).json({ success: true, message: `Successfully purchased ${item.name}` });
      } catch (e) {
        console.error('Shop purchase error:', e);
        return res.status(500).json({ error: 'Server error during purchase' });
      }
    }
    
    return res.status(400).json({ error: 'Invalid action' });
  }
}
