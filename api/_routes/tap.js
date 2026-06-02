import { supabase } from '../_lib/supabase.js';
import { validateInitData } from '../_lib/auth.js';
import { computeStats, computeLevelFromXp } from '../_lib/gameLogic.js';

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
        .select('energy, max_energy, total_votes, available_votes, total_taps, xp, level, login_streak, mining_speed_bonus, energy_regen_bonus, last_login, boost_multiplier, boost_expires_at')
        .eq('telegram_id', user.id)
        .single();

      if (!dbUser) return res.status(404).json({ error: 'User not found' });

      // Get friend count for speed calc
      const { count: friendCount } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_id', user.id);

      // Get NFT multiplier
      const { data: userNfts } = await supabase
        .from('user_nfts')
        .select('nft_templates(vote_multiplier)')
        .eq('user_id', user.id);
        
      let nftMultiplier = 1.0;
      if (userNfts) {
        userNfts.forEach(n => {
          let template = n.nft_templates;
          if (Array.isArray(template)) template = template[0];
          const mult = Number(template?.vote_multiplier);
          if (!isNaN(mult) && mult > 0) {
            nftMultiplier += (mult - 1.0);
          }
        });
      }

      const stats = computeStats(dbUser, friendCount || 0, nftMultiplier);
      const speed = stats.speed.final;
      
      // Calculate background energy regen since last interaction
      const now = new Date();
      const lastInteraction = new Date(dbUser.last_login || now);
      const diffMs = now - lastInteraction;
      const regenRateMs = 1000;
      const energyGained = Math.floor(diffMs / regenRateMs) * stats.regen.final;
      
      const currentRegennedEnergy = Math.min(stats.maxEnergy.final, (dbUser.energy || 0) + energyGained);
      let validCount = count;
      let energyCost = validCount * speed;
      if (currentRegennedEnergy < energyCost) {
        // Graceful clamping instead of 400 error to prevent client desync deadlocks
        validCount = Math.floor(currentRegennedEnergy / speed);
        energyCost = validCount * speed;
      }
      
      if (validCount <= 0 && count > 0) {
        // If they can't even afford 1 tap, return success but 0 votes so client sync clears pendingTaps
        return res.status(200).json({
          success: true,
          stats: {
            energy: currentRegennedEnergy,
            totalVotes: Number(dbUser.total_votes),
            availableVotes: Number(dbUser.available_votes),
            xp: Number(dbUser.xp),
            level: dbUser.level || 1,
            miningSpeed: speed
          }
        });
      }

      const votesGained = validCount * speed;
      const xpGained = validCount; // 1 tap = 1 XP
      
      const newEnergy = Math.max(0, currentRegennedEnergy - energyCost);
      const newTotalVotes = Number(dbUser.total_votes) + votesGained;
      const newAvailableVotes = Number(dbUser.available_votes) + votesGained;
      const newTotalTaps = Number(dbUser.total_taps) + count;
      const newXp = Number(dbUser.xp) + xpGained;
      
      const newLevel = computeLevelFromXp(newXp);
      const levelUpUpdates = {};

      if (newLevel > (dbUser.level || 1)) {
        const { data: config } = await supabase.from('game_config').select('level_up_reward_type, level_up_reward_value').eq('id', 1).single();
        const levelsGained = newLevel - (dbUser.level || 1);
        const rewardType = config?.level_up_reward_type || 'speed';
        const rewardValue = (config?.level_up_reward_value || 1) * levelsGained;

        if (rewardType === 'speed') {
          levelUpUpdates.mining_speed_bonus = (dbUser.mining_speed_bonus || 0) + rewardValue;
        } else if (rewardType === 'regen') {
          levelUpUpdates.energy_regen_bonus = (dbUser.energy_regen_bonus || 0) + rewardValue;
        } else if (rewardType === 'max_energy') {
          levelUpUpdates.max_energy = (dbUser.max_energy || 1000) + rewardValue;
        }
      }

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
          last_login: now.toISOString(), // Update last_login so next regen is calculated from now
          ...levelUpUpdates
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
          level: newLevel,
          miningSpeed: speed
        }
      });
    } catch (err) {
      console.error('Tap error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
