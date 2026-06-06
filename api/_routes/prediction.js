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
      if (error) return res.status(500).json({ error: 'Failed to fetch data' });
      
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
      if (error) return res.status(500).json({ error: 'Failed to fetch data' });
      return res.status(200).json(data);
    }
  }

  if (req.method === 'POST') {
    const { action } = req.body;
    
    if (action === 'predict') {
      const { matchId, team, votesStaked } = req.body;
      
      if (!matchId || !team || typeof votesStaked !== 'number' || !Number.isFinite(votesStaked) || !Number.isInteger(votesStaked) || votesStaked <= 0) {
        return res.status(400).json({ error: 'Invalid prediction data' });
      }
      
      try {
        const { data: result, error: rpcError } = await supabase.rpc('stake_prediction', {
          p_user_id: user.id,
          p_match_id: matchId,
          p_team: team,
          p_votes_staked: votesStaked
        });

        if (rpcError) throw rpcError;

        if (!result.success) {
          return res.status(400).json({ error: result.error });
        }

        return res.status(200).json({ success: true, newAvailableVotes: result.newAvailableVotes });
      } catch (err) {
        console.error('Prediction error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }

    if (action === 'unstake') {
      const { predictionId } = req.body;
      
      if (!predictionId) return res.status(400).json({ error: 'Invalid prediction ID' });
      
      try {
        const { data: result, error: rpcError } = await supabase.rpc('unstake_prediction', {
          p_user_id: user.id,
          p_prediction_id: predictionId
        });

        if (rpcError) throw rpcError;

        if (!result.success) {
          return res.status(400).json({ error: result.error });
        }

        return res.status(200).json({ success: true });
      } catch (err) {
        console.error('Unstake error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }

    if (action === 'claim') {
      const { predictionId } = req.body;
      
      if (!predictionId) return res.status(400).json({ error: 'Invalid prediction ID' });
      
      try {
        const { data: result, error: rpcError } = await supabase.rpc('claim_prediction_reward', {
          p_user_id: user.id,
          p_prediction_id: predictionId
        });

        if (rpcError) throw rpcError;

        if (!result.success) {
          return res.status(400).json({ error: result.error });
        }

        return res.status(200).json({ success: true, reward: result.reward });
      } catch (err) {
        console.error('Claim prediction error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
