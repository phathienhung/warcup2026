export function computeLevelFromXp(totalXp, baseXp = 1000) {
  if (totalXp < 0) return 1;
  return Math.floor(Math.log2((totalXp / baseXp) + 1)) + 1;
}

export function computeXpForNextLevel(currentLevel, baseXp = 1000) {
  // Total XP required to REACH (currentLevel + 1)
  return baseXp * (Math.pow(2, currentLevel) - 1);
}

export function computeStats(dbUser, friendCount = 0, nftBonus = 0.0, nationMultiplier = 1.0) {
  const level = dbUser.level || 1;
  const streak = dbUser.login_streak || 1;
  const speedBonus = dbUser.mining_speed_bonus || 0;
  
  // 1. Speed
  const baseSpeed = 1 + friendCount + (level - 1) + Math.floor(streak / 7) + speedBonus;
  const multiply = Number((baseSpeed * nftBonus).toFixed(1));
  let boost = nationMultiplier;
  
  if (dbUser.boost_expires_at && new Date(dbUser.boost_expires_at) > new Date()) {
    boost *= (dbUser.boost_multiplier || 1);
  }
  
  const finalSpeed = Math.round((baseSpeed + multiply) * boost);

  // 2. Regen
  const baseRegen = 1 + (dbUser.energy_regen_bonus || 0);
  const finalRegen = Math.round(baseRegen * (1 + multiply));

  // 3. Max Energy
  const baseMaxEnergy = dbUser.max_energy || 1000;
  const finalMaxEnergy = Math.round(baseMaxEnergy * (1 + multiply));

  return {
    speed: { final: finalSpeed, base: baseSpeed, multiply: multiply },
    regen: { final: finalRegen, base: baseRegen, multiply: multiply },
    maxEnergy: { final: finalMaxEnergy, base: baseMaxEnergy, multiply: multiply },
    rewardMultiplier: 1 + multiply,
    nftMultiplier: multiply,
    nationMultiplier
  };
}
