import { supabase } from '../_lib/supabase.js';
import { validateInitData } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  const initData = req.headers['x-telegram-init-data'];
  const user = validateInitData(initData);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    const action = req.query.action || 'list';
    
    if (action === 'list') {
      const { data, error } = await supabase.from('clans').select('*').order('total_votes', { ascending: false }).limit(20);
      if (error) return res.status(500).json({ error: 'Failed to fetch clans' });
      return res.status(200).json(data);
    }

    if (action === 'detail') {
      const clanId = req.query.clanId;
      if (!clanId) return res.status(400).json({ error: 'Missing clanId' });
      const { data, error } = await supabase.from('clans').select('*, users(telegram_id, username, total_votes)').eq('id', clanId).single();
      if (error) return res.status(500).json({ error: 'Failed to fetch clan' });
      return res.status(200).json(data);
    }
  }

  if (req.method === 'POST') {
    const { action } = req.body;
    
    if (action === 'create') {
      const { name, nation } = req.body;

      // M-3 FIX: Validate name
      if (!name || typeof name !== 'string' || name.trim().length < 3 || name.trim().length > 30) {
        return res.status(400).json({ error: 'Clan name must be 3-30 characters' });
      }
      if (!nation || typeof nation !== 'string') {
        return res.status(400).json({ error: 'Nation is required' });
      }

      // Sanitize name (strip HTML)
      const sanitizedName = name.trim().replace(/<[^>]*>/g, '');

      // Check if user already leads a clan
      const { data: existingClan } = await supabase.from('clans').select('id').eq('leader_id', user.id).single();
      if (existingClan) {
        return res.status(400).json({ error: 'You already have a clan' });
      }

      // Check duplicate name
      const { data: dupClan } = await supabase.from('clans').select('id').eq('name', sanitizedName).single();
      if (dupClan) {
        return res.status(400).json({ error: 'Clan name already taken' });
      }

      const { error } = await supabase.from('clans').insert({
        name: sanitizedName, nation, leader_id: user.id, member_count: 1
      });
      if (error) return res.status(500).json({ error: 'Failed to create clan' });

      // Also set user's clan_id
      const { data: newClan } = await supabase.from('clans').select('id').eq('leader_id', user.id).single();
      if (newClan) {
        await supabase.from('users').update({ clan_id: newClan.id }).eq('telegram_id', user.id);
      }

      return res.status(200).json({ success: true });
    }
    
    // M-4 FIX: Actually implement join
    if (action === 'join') {
      const { clanId } = req.body;
      if (!clanId) return res.status(400).json({ error: 'Missing clanId' });

      // Check if user already in a clan
      const { data: dbUser } = await supabase.from('users').select('clan_id').eq('telegram_id', user.id).single();
      if (dbUser?.clan_id) {
        return res.status(400).json({ error: 'You are already in a clan. Leave first.' });
      }

      // Update user
      const { error } = await supabase.from('users').update({ clan_id: clanId }).eq('telegram_id', user.id);
      if (error) return res.status(500).json({ error: 'Failed to join clan' });

      // Increment member count
      await supabase.rpc('increment_clan_members', { p_clan_id: clanId }).catch(() => {
        // If RPC doesn't exist, do manual increment (non-atomic but better than nothing)
        supabase.from('clans').select('member_count').eq('id', clanId).single().then(({ data }) => {
          if (data) supabase.from('clans').update({ member_count: (data.member_count || 0) + 1 }).eq('id', clanId);
        });
      });

      return res.status(200).json({ success: true });
    }

    if (action === 'leave') {
      const { data: dbUser } = await supabase.from('users').select('clan_id').eq('telegram_id', user.id).single();
      if (!dbUser?.clan_id) return res.status(400).json({ error: 'You are not in a clan' });

      await supabase.from('users').update({ clan_id: null }).eq('telegram_id', user.id);
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Invalid action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
