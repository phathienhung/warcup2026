import { supabase } from '../_lib/supabase.js';
import { validateInitData } from '../_lib/auth.js';
import { computeSpeed, computeLevelFromXp } from '../_lib/gameLogic.js';

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
        .select('energy, max_energy, total_votes, available_votes, total_taps, xp, level, login_streak, mining_speed_bonus, energy_regen_bonus, last_login')
        .eq('telegram_id', user.id)
        .single();

      if (!dbUser) return res.status(404).json({ error: 'User not found' });

      // Get friend count for speed calc
      const { count: friendCount } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_id', user.id);

      const speed = computeSpeed(dbUser, friendCount || 0);
      
      // Calculate background energy regen since last interaction
      const now = new Date();
      const lastLogin = new Date(dbUser.last_login || now);
      const diffMs = now - lastLogin;
      const regenRateMs = 1000;
      const regenMultiplier = 1 + (dbUser.energy_regen_bonus || 0);
      const energyGained = Math.floor(diffMs / regenRateMs) * regenMultiplier;
      const currentRegennedEnergy = Math.min(dbUser.max_energy || 1000, (dbUser.energy || 0) + energyGained);

      const energyCost = count * speed;
      if (currentRegennedEnergy < energyCost) {
        return res.status(400).json({ error: 'Not enough energy', energy: currentRegennedEnergy });
      }

      const votesGained = count * speed;
      const xpGained = count; // 1 tap = 1 XP
      
      const newEnergy = Math.max(0, currentRegennedEnergy - energyCost);
      const newTotalVotes = Number(dbUser.total_votes) + votesGained;
      const newAvailableVotes = Number(dbUser.available_votes) + votesGained;
      const newTotalTaps = Number(dbUser.total_taps) + count;
      const newXp = Number(dbUser.xp) + xpGained;
      
      const newLevel = computeLevelFromXp(newXp);

      // 3. Update DB
      const { error } = await supabase
        .from('users')
        .update({
          energy: newEnergy,
          total_votes: newTotalVotes,
          available_votes: newAvailableVotes,
          total_taps: newTotalTaps,
          xp: newXp,
          level: newLevel,
          last_login: now.toISOString() // Update last_login so next regen is calculated from now
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
