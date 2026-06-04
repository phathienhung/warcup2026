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
      const { data: dbUser } = await supabase.from('users').select('available_votes, ads_watched, ton_balance').eq('telegram_id', user.id).single();
      
      if (!config || !dbUser) return res.status(400).json({ error: 'Missing configuration or user' });
      
      const requiredAds = config.exchange_ads_required || 10;
      const requiredVotes = config.exchange_rate_votes || 120000;
      const tonReward = config.exchange_rate_ton || 0.1;

      if ((dbUser.ads_watched || 0) < requiredAds) {
        return res.status(400).json({ error: `You must watch at least ${requiredAds} ads to exchange.` });
      }
      
      if ((dbUser.available_votes || 0) < requiredVotes) {
        return res.status(400).json({ error: `Not enough votes. You need ${requiredVotes} votes.` });
      }
      
      const newVotes = Number(dbUser.available_votes) - Number(requiredVotes);
      const newAds = Number(dbUser.ads_watched) - Number(requiredAds);
      const newTon = Number(dbUser.ton_balance || 0) + Number(tonReward);
      
      const { error } = await supabase.from('users').update({
        available_votes: newVotes,
        ads_watched: newAds,
        ton_balance: newTon
      }).eq('telegram_id', user.id);
      
      if (error) throw error;
      
      return res.status(200).json({ 
        success: true, 
        tonBalance: newTon, 
        availableVotes: newVotes, 
        adsWatched: newAds 
      });
    } catch (err) {
      console.error('Exchange error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
