import { supabase } from '../_lib/supabase.js';
import { validateInitData } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  const initData = req.headers['x-telegram-init-data'];
  const user = validateInitData(initData);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'POST') {
    const { action } = req.body;
    
    if (action === 'watch') {
      try {
        const { data: dbUser } = await supabase.from('users').select('ads_watched').eq('telegram_id', user.id).single();
        if (!dbUser) return res.status(404).json({ error: 'User not found' });

        const newAdsWatched = (dbUser.ads_watched || 0) + 1;
        
        await supabase.from('users').update({ ads_watched: newAdsWatched }).eq('telegram_id', user.id);
        
        return res.status(200).json({ success: true, adsWatched: newAdsWatched });
      } catch (err) {
        console.error('Ads error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
