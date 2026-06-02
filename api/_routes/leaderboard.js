import { supabase } from '../_lib/supabase.js';
import { validateInitData } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  const initData = req.headers['x-telegram-init-data'];
  const user = validateInitData(initData);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    const type = req.query.type || 'global';
    const limit = parseInt(req.query.limit || '100', 10);
    
    if (type === 'multiplier') {
      const { data, error } = await supabase
        .from('user_nft_multipliers')
        .select('telegram_id, username, favorite_nation, avatar_url, nft_multiplier, nft_count')
        .order('nft_multiplier', { ascending: false })
        .limit(limit);
        
      if (error) return res.status(500).json({ error: error.message });
      
      const rankedData = data.map((item, index) => ({
        ...item,
        total_votes: item.nft_multiplier.toFixed(2) + 'x', // Reuse total_votes field for UI rendering
        rank: index + 1
      }));
      return res.status(200).json(rankedData);
    }
    
    let query = supabase
      .from('users')
      .select('telegram_id, username, favorite_nation, total_votes')
      .order('total_votes', { ascending: false })
      .limit(limit);

    if (type === 'nation') {
      // Get user's nation first
      const { data: dbUser } = await supabase.from('users').select('favorite_nation').eq('telegram_id', user.id).single();
      if (dbUser?.favorite_nation) {
        query = query.eq('favorite_nation', dbUser.favorite_nation);
      }
    } else if (type === 'friends') {
      // Get friends ids
      const { data: refs } = await supabase.from('referrals').select('referred_id').eq('referrer_id', user.id);
      const friendIds = (refs || []).map(r => r.referred_id);
      friendIds.push(user.id); // include self
      query = query.in('telegram_id', friendIds);
    }

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    // Add rank
    const rankedData = data.map((item, index) => ({
      ...item,
      rank: index + 1
    }));

    return res.status(200).json(rankedData);
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
