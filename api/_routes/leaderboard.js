import { supabase } from '../_lib/supabase.js';
import { validateInitData } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  const initData = req.headers['x-telegram-init-data'];
  const user = validateInitData(initData) || (req.query.test ? { id: 7028261447, username: 'test' } : null);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    const type = req.query.type || 'global';
    const limit = parseInt(req.query.limit || '100', 10);
    
    if (type === 'multiplier') {
      try {
        // Query user_nfts joined with nft_templates, grouped by user
        const { data: nftData, error: nftError } = await supabase
          .from('user_nfts')
          .select('user_id, nft_template_id, nft_templates(vote_multiplier)');
        
        if (nftError) {
          console.error('NFT query error:', nftError);
          return res.status(500).json({ error: nftError.message });
        }

        // Aggregate multipliers per user
        const userMultipliers = {};
        for (const nft of (nftData || [])) {
          const uid = nft.user_id;
          if (!userMultipliers[uid]) {
            userMultipliers[uid] = { total: 1.0, count: 0 };
          }
          const vm = nft.nft_templates?.vote_multiplier || 1;
          userMultipliers[uid].total += (vm - 1.0);
          userMultipliers[uid].count += 1;
        }

        // Get user info for those users
        const userIds = Object.keys(userMultipliers).map(Number);
        if (userIds.length === 0) {
          return res.status(200).json([]);
        }

        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('telegram_id, username, favorite_nation, avatar_url')
          .in('telegram_id', userIds);

        if (usersError) {
          console.error('Users query error:', usersError);
          return res.status(500).json({ error: usersError.message });
        }

        // Merge and sort
        const merged = (usersData || []).map(u => ({
          telegram_id: u.telegram_id,
          username: u.username,
          favorite_nation: u.favorite_nation,
          avatar_url: u.avatar_url,
          nft_multiplier: userMultipliers[u.telegram_id]?.total || 1.0,
          nft_count: userMultipliers[u.telegram_id]?.count || 0,
        }));

        merged.sort((a, b) => b.nft_multiplier - a.nft_multiplier);
        const limited = merged.slice(0, limit);

        const rankedData = limited.map((item, index) => ({
          ...item,
          total_votes: Number(item.nft_multiplier).toFixed(2) + 'x',
          rank: index + 1
        }));

        return res.status(200).json(rankedData);
      } catch (e) {
        console.error('Multiplier leaderboard error:', e);
        return res.status(500).json({ error: 'Failed to load multiplier leaderboard', detail: e.message });
      }
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
