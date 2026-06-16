import { getMatchResult24h } from './scrapers/24h.js';
import { getMatchResultTheThao247 } from './scrapers/thethao247.js';

/**
 * Validates match results from multiple sources
 * returns { resolved: boolean, scoreA: number, scoreB: number, status: string, error?: string }
 */
export async function getConsensusScore(teamA, teamB, date, primaryScoreA, primaryScoreB, primaryStatus) {
  // Source 1: API-Football (Primary)
  const source1 = { scoreA: primaryScoreA, scoreB: primaryScoreB, status: primaryStatus };
  
  // If API-Football says finished, OR we don't have API-Football data but the match is past its duration (e.g. 2.5 hours)
  const isPast = new Date() > new Date(new Date(date).getTime() + 2.5 * 60 * 60 * 1000);
  
  if (primaryStatus !== 'finished' && !isPast) {
    return { resolved: false, ...source1 }; // Match is still live or upcoming
  }

  // Fetch Source 2 and 3 concurrently
  console.log(`[Consensus] Fetching alternate sources for ${teamA} vs ${teamB}`);
  const [source2, source3] = await Promise.all([
    getMatchResult24h(teamA, teamB, date),
    getMatchResultTheThao247(teamA, teamB, date)
  ]);

  const scores = [];
  if (source1.scoreA !== null && source1.scoreB !== null) scores.push(`${source1.scoreA}-${source1.scoreB}`);
  if (source2 && source2.scoreA !== null && source2.scoreB !== null) scores.push(`${source2.scoreA}-${source2.scoreB}`);
  if (source3 && source3.scoreA !== null && source3.scoreB !== null) scores.push(`${source3.scoreA}-${source3.scoreB}`);

  console.log(`[Consensus] Scores collected: API-Football: ${scores[0]}, 24h: ${scores[1] || 'N/A'}, thethao247: ${scores[2] || 'N/A'}`);

  // If we couldn't get any alternate sources, we either trust Source 1 or delay.
  // For safety, if alternate scrapers fail (very common), we fall back to Source 1.
  if (scores.length === 1) {
    console.warn('[Consensus] Alternate scrapers failed. Trusting primary source.');
    return { resolved: true, ...source1 };
  }

  // Count frequencies of each score
  const frequency = {};
  let maxCount = 0;
  let majorityScore = null;

  for (const s of scores) {
    frequency[s] = (frequency[s] || 0) + 1;
    if (frequency[s] > maxCount) {
      maxCount = frequency[s];
      majorityScore = s;
    }
  }

  // If there's a strict majority (at least 2 sources agree)
  if (maxCount >= 2) {
    const [sa, sb] = majorityScore.split('-');
    return {
      resolved: true,
      scoreA: parseInt(sa, 10),
      scoreB: parseInt(sb, 10),
      status: 'finished'
    };
  }

  // No majority (e.g. 3 sources gave 3 different results, or 1 source gave a result and others failed but we require 2)
  console.error('[Consensus] CONFLICT DETECTED. No majority found.', frequency);
  return {
    resolved: false,
    scoreA: null, // Keep it unresolved
    scoreB: null,
    status: 'disputed',
    error: 'Sources conflicting'
  };
}
