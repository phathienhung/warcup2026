import { supabase } from './_lib/supabase.js';
import { validateInitData } from './_lib/auth.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  const initData = req.headers['x-telegram-init-data'];
  const user = validateInitData(initData);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    // Get transaction history
    try {
      const { data } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      return res.status(200).json(data || []);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to fetch transactions' });
    }
  }

  if (req.method === 'POST') {
    const { action, amount, txHash } = req.body;
    
    if (action === 'deposit') {
      if (!amount || !txHash) return res.status(400).json({ error: 'Missing parameters' });
      // Insert pending deposit record
      // Real app would verify txHash on TON blockchain here
      const { error } = await supabase.from('wallet_transactions').insert({
        user_id: user.id,
        tx_type: 'deposit',
        amount_ton: amount,
        tx_hash: txHash,
        status: 'pending' // Or 'completed' if verified
      });
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true });
    }

    if (action === 'withdraw') {
      if (!amount) return res.status(400).json({ error: 'Missing amount' });
      // Insert pending withdraw request
      const { error } = await supabase.from('wallet_transactions').insert({
        user_id: user.id,
        tx_type: 'withdraw',
        amount_ton: amount,
        tx_hash: `withdraw_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        status: 'pending'
      });
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true });
    }
    
    return res.status(400).json({ error: 'Invalid action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
