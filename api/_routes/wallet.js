import { supabase } from '../_lib/supabase.js';
import { validateInitData } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  const initData = req.headers['x-telegram-init-data'];
  const user = validateInitData(initData);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    // Get transaction history
    try {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.status(200).json(data || []);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    const { action, amount } = req.body;

    if (action === 'withdraw') {
      try {
        const { data: dbUser } = await supabase
          .from('users')
          .select('ton_balance')
          .eq('telegram_id', user.id)
          .single();

        if (!dbUser || dbUser.ton_balance < amount) {
          return res.status(400).json({ error: 'Insufficient balance' });
        }

        // Deduct balance and create pending transaction
        await supabase
          .from('users')
          .update({ ton_balance: dbUser.ton_balance - amount })
          .eq('telegram_id', user.id);

        await supabase
          .from('wallet_transactions')
          .insert({
            user_id: user.id,
            tx_type: 'withdraw',
            amount_ton: amount,
            status: 'pending'
          });

        return res.status(200).json({ success: true, newBalance: dbUser.ton_balance - amount });
      } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }

    if (action === 'deposit') {
      try {
        // Normally, deposit would be handled via a webhook from TON blockchain.
        // For simulation/MVP, we just record a pending deposit.
        await supabase
          .from('wallet_transactions')
          .insert({
            user_id: user.id,
            tx_type: 'deposit',
            amount_ton: amount,
            status: 'pending'
          });

        return res.status(200).json({ success: true });
      } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }
  }
}
