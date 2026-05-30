export function computeLevelFromXp(totalXp, baseXp = 1000) {
  if (totalXp < 0) return 1;
  return Math.floor(Math.log2((totalXp / baseXp) + 1)) + 1;
}

export function computeXpForNextLevel(currentLevel, baseXp = 1000) {
  // Total XP required to REACH (currentLevel + 1)
  return baseXp * (Math.pow(2, currentLevel) - 1);
}

export function computeSpeed(dbUser, friendCount = 0, nftMultiplier = 1.0) {
  // Base 1 + friend bonus + level bonus + streak bonus + spin bonus
  const level = dbUser.level || 1;
  const streak = dbUser.login_streak || 1;
  const bonus = dbUser.mining_speed_bonus || 0;
  
  const baseSpeed = 1 + friendCount + (level - 1) + Math.floor(streak / 7) + bonus;
  return Math.floor(baseSpeed * nftMultiplier);
}
