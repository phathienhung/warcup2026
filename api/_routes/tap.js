import { supabase } from '../_lib/supabase.js';
import { validateInitData } from '../_lib/auth.js';
import { computeStats, computeLevelFromXp } from '../_lib/gameLogic.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  const initData = req.headers['x-telegram-init-data'];
  const user = validateInitData(initData);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    const { data } = await supabase.from('users').select('total_votes, energy, max_energy').eq('telegram_id', user.id).single();
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const { count } = req.body;
    if (!count || typeof count !== 'number' || count < 0 || count > 1000) {
      return res.status(400).json({ error: 'Invalid tap count' });
    }

    try {
      const { data: dbUser } = await supabase
        .from('users')
        .select('energy, max_energy, total_votes, available_votes, total_taps, xp, level, login_streak, mining_speed_bonus, energy_regen_bonus, last_login, boost_multiplier, boost_expires_at, favorite_nation')
        .eq('telegram_id', user.id)
        .single();

      if (!dbUser) return res.status(404).json({ error: 'User not found' });

      const { count: friendCount } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_id', user.id);

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
      
      let nationMultiplier = 1.0;
      if (dbUser.favorite_nation) {
        const { data: nStats } = await supabase.from('vw_nation_multipliers').select('final_multiplier').eq('code', dbUser.favorite_nation).single();
        if (nStats) nationMultiplier = Number(nStats.final_multiplier);
      }

      const stats = computeStats(dbUser, friendCount || 0, nftMultiplier, nationMultiplier);
      const speed = stats.speed.final;
      
      const now = new Date();
      const lastInteraction = new Date(dbUser.last_login || now);
      const diffMs = now - lastInteraction;
      const regenRateMs = 1000;
      const energyGained = Math.floor(diffMs / regenRateMs) * stats.regen.final;
      
      let currentRegennedEnergy = dbUser.energy || 0;
      if (currentRegennedEnergy < stats.maxEnergy.final) {
        currentRegennedEnergy = Math.min(stats.maxEnergy.final, currentRegennedEnergy + energyGained);
      }
      let validCount = count;
      let energyCost = validCount * speed;
      if (currentRegennedEnergy < energyCost) {
        validCount = Math.floor(currentRegennedEnergy / speed);
        energyCost = validCount * speed;
      }
      
      if (validCount <= 0 && count > 0) {
        return res.status(200).json({
          success: true,
          stats: {
            energy: currentRegennedEnergy,
            totalVotes: Number(dbUser.total_votes),
            availableVotes: Number(dbUser.available_votes),
            xp: Number(dbUser.xp),
            level: dbUser.level || 1,
            miningSpeed: speed,
            miningSpeedBase: stats.speed.base,
            miningSpeedMultiply: stats.speed.multiply,
            nationMultiplier: stats.nationMultiplier
          }
        });
      }

      // Update DB atomically
      const { data: rpcData, error } = await supabase.rpc('process_tap', {
        p_user_id: user.id,
        p_taps: count,
        p_speed: speed
      });

      if (error) throw error;
      if (!rpcData.success) {
        return res.status(400).json({ error: rpcData.error || 'Failed to process tap' });
      }

      const newEnergy = rpcData.new_energy;
      const newTotalVotes = rpcData.new_total_votes;
      const newAvailableVotes = rpcData.new_available_votes;
      const newXp = rpcData.new_xp;
      
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
        
        await supabase.from('users').update({ level: newLevel, ...levelUpUpdates }).eq('telegram_id', user.id);
      }

      res.status(200).json({
        success: true,
        stats: {
          energy: newEnergy,
          totalVotes: newTotalVotes,
          availableVotes: newAvailableVotes,
          xp: newXp,
          level: newLevel,
          miningSpeed: speed,
          miningSpeedBase: stats.speed.base,
          miningSpeedMultiply: stats.speed.multiply,
          nationMultiplier: stats.nationMultiplier
        }
      });
    } catch (err) {
      console.error('Tap error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
