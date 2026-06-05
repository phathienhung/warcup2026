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
      
      // Merge seed into pools so UI can calculate accurate odds
      const formattedData = data.map(m => {
        const out = m.outcome_pools || {};
        const sa = Number(m.seed_a || 0);
        const sb = Number(m.seed_b || 0);
        const sd = Number(m.seed_draw || 0);
        
        out['A'] = Number(out['A'] || 0) + sa;
        out['B'] = Number(out['B'] || 0) + sb;
        out['DRAW'] = Number(out['DRAW'] || 0) + sd;
        
        return {
          ...m,
          outcome_pools: out,
          total_pool: Number(m.total_pool || 0) + sa + sb + sd
        };
      });
      
      return res.status(200).json(formattedData);
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
      
      try {
      try {
        if (!votesStaked || typeof votesStaked !== 'number' || votesStaked <= 0) {
          return res.status(400).json({ error: 'Invalid stake amount' });
        }

        // 1. Atomic deduction and insertion via RPC
        const { data: rpcData, error } = await supabase.rpc('make_prediction', {
          p_user_id: user.id,
          p_match_id: matchId,
          p_team: team,
          p_votes: votesStaked
        });

        if (error) throw error;
        if (!rpcData.success) {
          return res.status(400).json({ error: rpcData.error || 'Failed to make prediction' });
        }

        // 2. Get Match to update JSONB stats (for UI display)
        const { data: match } = await supabase.from('matches').select('*').eq('id', matchId).single();
        if (match) {
          const outcomePools = match.outcome_pools || {};
          const outcomeUsers = match.outcome_users || {};
          
          const newTotalPool = Number(match.total_pool || 0) + votesStaked;
          outcomePools[team] = Number(outcomePools[team] || 0) + votesStaked;
          
          // We don't perfectly track unique users here due to RPC, but we can approximate
          outcomeUsers[team] = Number(outcomeUsers[team] || 0) + 1;
          
          await supabase.from('matches').update({
            total_pool: newTotalPool,
            outcome_pools: outcomePools,
            outcome_users: outcomeUsers
          }).eq('id', matchId);
        }

        return res.status(200).json({ success: true });
      } catch (err) {
        console.error('Prediction error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }

    if (action === 'unstake') {
      const { predictionId } = req.body;
      
      // 1. Get Prediction
      const { data: prediction } = await supabase.from('predictions').select('*').eq('id', predictionId).eq('user_id', user.id).single();
      if (!prediction) return res.status(404).json({ error: 'Prediction not found' });
      
      // 2. Get Match
      const { data: match } = await supabase.from('matches').select('*').eq('id', prediction.match_id).single();
      if (!match) return res.status(404).json({ error: 'Match not found' });
      if (new Date(match.match_date).getTime() < Date.now()) {
        return res.status(400).json({ error: 'Cannot unstake: Match has already started' });
      }

      // 3. Refund votes
      const { data: dbUser } = await supabase.from('users').select('available_votes').eq('telegram_id', user.id).single();
      await supabase.from('users').update({ 
        available_votes: Number(dbUser.available_votes) + Number(prediction.votes_staked) 
      }).eq('telegram_id', user.id);

      // 4. Delete Prediction
      await supabase.from('predictions').delete().eq('id', predictionId);

      // 5. Update match JSONB stats
      const outcomePools = match.outcome_pools || {};
      const outcomeUsers = match.outcome_users || {};
      const team = prediction.predicted_team;
      const votesToRefund = Number(prediction.votes_staked);
      
      const newTotalPool = Math.max(0, Number(match.total_pool || 0) - votesToRefund);
      outcomePools[team] = Math.max(0, Number(outcomePools[team] || 0) - votesToRefund);
      outcomeUsers[team] = Math.max(0, Number(outcomeUsers[team] || 0) - 1);
      
      const updateData = {
        total_pool: newTotalPool,
        outcome_pools: outcomePools,
        outcome_users: outcomeUsers
      };

      // Keep legacy columns updated
      if (team === 'A') updateData.total_votes_a = Math.max(0, Number(match.total_votes_a || 0) - votesToRefund);
      if (team === 'B') updateData.total_votes_b = Math.max(0, Number(match.total_votes_b || 0) - votesToRefund);
      if (team === 'DRAW') updateData.total_votes_draw = Math.max(0, Number(match.total_votes_draw || 0) - votesToRefund);

      await supabase.from('matches').update(updateData).eq('id', match.id);

      return res.status(200).json({ success: true });
    }

    if (action === 'claim') {
      const { predictionId } = req.body;
      
      const { data: prediction } = await supabase.from('predictions')
        .select('*')
        .eq('id', predictionId)
        .eq('user_id', user.id)
        .single();
        
      if (!prediction) return res.status(404).json({ error: 'Prediction not found' });
      if (!prediction.is_correct) return res.status(400).json({ error: 'Cannot claim a lost prediction' });
      if (prediction.is_claimed) return res.status(400).json({ error: 'Reward already claimed' });
      
      const rewardAmount = Number(prediction.reward || 0);
      
      // 1. Add reward to user balance
      const { data: dbUser } = await supabase.from('users').select('available_votes').eq('telegram_id', user.id).single();
      await supabase.from('users').update({ 
        available_votes: Number(dbUser.available_votes) + rewardAmount 
      }).eq('telegram_id', user.id);
      
      // 2. Mark as claimed
      await supabase.from('predictions').update({ is_claimed: true }).eq('id', predictionId);
      
      return res.status(200).json({ success: true, reward: rewardAmount });
    }
  }
}
