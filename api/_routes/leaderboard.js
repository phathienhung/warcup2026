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

    if (type === 'nft') {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('telegram_id, username, favorite_nation, user_nfts(nft_templates(vote_multiplier))');
        
      if (usersError) return res.status(500).json({ error: usersError.message });
      
      const computed = usersData.map(u => {
        let nftMultiplier = 1.0;
        if (u.user_nfts && Array.isArray(u.user_nfts)) {
          u.user_nfts.forEach(n => {
            let template = n.nft_templates;
            if (Array.isArray(template)) template = template[0];
            const mult = Number(template?.vote_multiplier);
            if (!isNaN(mult) && mult > 0) {
              nftMultiplier += (mult - 1.0);
            }
          });
        }
        return {
          telegram_id: u.telegram_id,
          username: u.username,
          favorite_nation: u.favorite_nation,
          nft_multiplier: nftMultiplier
        };
      });
      
      computed.sort((a, b) => b.nft_multiplier - a.nft_multiplier);
      const rankedData = computed.slice(0, limit).map((item, index) => ({
        ...item,
        rank: index + 1
      }));
      return res.status(200).json(rankedData);
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
