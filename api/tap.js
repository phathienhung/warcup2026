import { supabase } from './_lib/supabase.js';
import { validateInitData } from './_lib/auth.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  const initData = req.headers['x-telegram-init-data'];
  const user = validateInitData(initData);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    // Get mining info
    const { data } = await supabase.from('users').select('total_votes, energy, max_energy').eq('telegram_id', user.id).single();
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const { count } = req.body;
    if (!count || typeof count !== 'number' || count < 0 || count > 1000) {
      return res.status(400).json({ error: 'Invalid tap count' });
    }

    try {
      // 1. Get current user stats
      const { data: dbUser } = await supabase
        .from('users')
        .select('energy, max_energy, total_votes, available_votes, total_taps, xp, level')
        .eq('telegram_id', user.id)
        .single();

      if (!dbUser) return res.status(404).json({ error: 'User not found' });

      // 2. Calculate
      // For simplicity, assuming mining_speed is passed or retrieved (using 1 here as default if not fetching full profile)
      // In production, we'd fetch full speed including NFT bonuses
      const speed = 1; 
      
      const energyCost = count;
      if (dbUser.energy < energyCost) {
        return res.status(400).json({ error: 'Not enough energy', energy: dbUser.energy });
      }

      const votesGained = count * speed;
      const xpGained = count; // 1 tap = 1 XP
      
      const newEnergy = Math.max(0, dbUser.energy - energyCost);
      const newTotalVotes = Number(dbUser.total_votes) + votesGained;
      const newAvailableVotes = Number(dbUser.available_votes) + votesGained;
      const newTotalTaps = Number(dbUser.total_taps) + count;
      const newXp = Number(dbUser.xp) + xpGained;
      
      // Simple leveling formula
      const newLevel = Math.floor(Math.sqrt(newXp / 100)) + 1;

      // 3. Update DB
      const { error } = await supabase
        .from('users')
        .update({
          energy: newEnergy,
          total_votes: newTotalVotes,
          available_votes: newAvailableVotes,
          total_taps: newTotalTaps,
          xp: newXp,
          level: newLevel
        })
        .eq('telegram_id', user.id);

      if (error) throw error;

      res.status(200).json({
        success: true,
        stats: {
          energy: newEnergy,
          totalVotes: newTotalVotes,
          availableVotes: newAvailableVotes,
          xp: newXp,
          level: newLevel
        }
      });
    } catch (err) {
      console.error('Tap error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
