import { supabase } from '../_lib/supabase.js';
import { validateInitData } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  const initData = req.headers['x-telegram-init-data'];
  const user = validateInitData(initData);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    const action = req.query.action || 'matches';
    
    if (action === 'matches') {
      const { data, error } = await supabase.from('matches').select('*').order('match_date', { ascending: true });
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data);
    } else if (action === 'myPredictions') {
      const { data, error } = await supabase.from('predictions').select('*, matches(*)').eq('user_id', user.id);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data);
    }
  }

  if (req.method === 'POST') {
    const { action } = req.body;
    
    if (action === 'predict') {
      const { matchId, team, votesStaked } = req.body;
      
      // 1. Get user votes
      const { data: dbUser } = await supabase.from('users').select('available_votes').eq('telegram_id', user.id).single();
      if (!dbUser || Number(dbUser.available_votes) < votesStaked) {
        return res.status(400).json({ error: 'Not enough available votes' });
      }
      
      // 2. Deduct votes and create prediction
      await supabase.from('users').update({ available_votes: Number(dbUser.available_votes) - votesStaked }).eq('telegram_id', user.id);
      
      const { error } = await supabase.from('predictions').insert({
        user_id: user.id,
        match_id: matchId,
        predicted_team: team,
        votes_staked: votesStaked
      });
      
      if (error) return res.status(500).json({ error: error.message });
      
      return res.status(200).json({ success: true });
    }
  }
}
