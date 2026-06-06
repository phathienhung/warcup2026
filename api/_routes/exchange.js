import { supabase } from '../_lib/supabase.js';
import { validateInitData } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  const initData = req.headers['x-telegram-init-data'];
  const user = validateInitData(initData);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'POST') {
    try {
      const { data: config } = await supabase.from('game_config').select('exchange_rate_votes, exchange_rate_ton, exchange_ads_required').eq('id', 1).single();
      
      if (!config) return res.status(400).json({ error: 'Missing configuration' });
      if (config.exchange_rate_votes <= 0 || config.exchange_rate_ton <= 0) {
        return res.status(400).json({ error: 'Invalid exchange rates' });
      }

      const { data: result, error: rpcError } = await supabase.rpc('exchange_votes_for_ton', {
        p_user_id: user.id,
        p_votes_cost: config.exchange_rate_votes,
        p_ton_reward: config.exchange_rate_ton,
        p_ads_required: config.exchange_ads_required
      });

      if (rpcError) throw rpcError;

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      return res.status(200).json({ 
        success: true, 
        tonBalance: result.new_balance, 
        availableVotes: result.new_votes, 
        adsWatched: 0 
      });
    } catch (err) {
      console.error('Exchange error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
