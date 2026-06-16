import { createClient } from '@supabase/supabase-js';
import { getConsensusScore } from '../_lib/consensus.js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const db = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const apiFootballKey = process.env.API_FOOTBALL_KEY;
const CRON_SECRET = process.env.CRON_SECRET || '123456';

export default async function handler(req, res) {
  // Security check for cron invocation
  const authHeader = req.headers['authorization'];
  const querySecret = req.query.secret;
  
  if (!CRON_SECRET || (authHeader !== `Bearer ${CRON_SECRET}` && querySecret !== CRON_SECRET)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!db) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  if (!apiFootballKey) {
    console.log('API_FOOTBALL_KEY not set. Skipping live sync.');
    return res.status(200).json({ status: 'skipped', reason: 'No API Key' });
  }

  try {
    // 1. Get matches from DB that need updating
    // Matches that have started (match_date <= NOW) and are not finished
    const { data: matches, error } = await db
      .from('matches')
      .select('*')
      .lte('match_date', new Date().toISOString())
      .neq('status', 'finished');

    if (error) throw error;
    if (!matches || matches.length === 0) {
      return res.status(200).json({ status: 'success', message: 'No live matches to sync' });
    }

    console.log(`Found ${matches.length} matches to sync.`);

    // Group matches by date
    const matchesByDate = {};
    for (const match of matches) {
      const dateString = match.match_date.split('T')[0];
      if (!matchesByDate[dateString]) matchesByDate[dateString] = [];
      matchesByDate[dateString].push(match);
    }
    
    let processedCount = 0;

    for (const dateString in matchesByDate) {
      console.log(`Fetching fixtures for ${dateString}...`);
      
      let fixtures = [];
      if (apiFootballKey) {
        const response = await fetch(`https://v3.football.api-sports.io/fixtures?date=${dateString}`, {
          method: 'GET',
          headers: {
            'x-rapidapi-host': 'v3.football.api-sports.io',
            'x-rapidapi-key': apiFootballKey
          }
        });
        const apiData = await response.json();
        if (apiData && apiData.response) {
          fixtures = apiData.response;
        }
      }

      // Process matches for this date
      for (const match of matchesByDate[dateString]) {
        const fixture = fixtures.find(f => 
          (f.teams.home.name.toLowerCase().includes(match.team_a.toLowerCase()) || 
           match.team_a.toLowerCase().includes(f.teams.home.name.toLowerCase())) ||
          (f.teams.away.name.toLowerCase().includes(match.team_b.toLowerCase()) || 
           match.team_b.toLowerCase().includes(f.teams.away.name.toLowerCase()))
        );

      let newStatus = match.status;
      let winner = null;
      let finalScoreA = null;
      let finalScoreB = null;

      if (fixture) {
        finalScoreA = fixture.goals.home;
        finalScoreB = fixture.goals.away;
        const fixtureStatus = fixture.fixture.status.short;

        if (['1H', '2H', 'HT', 'ET', 'P'].includes(fixtureStatus)) {
          newStatus = 'live';
        }

        if (['FT', 'AET', 'PEN'].includes(fixtureStatus)) {
          newStatus = 'finished';
        }
      }

      // 3. Apply Consensus Engine
      const consensus = await getConsensusScore(
        match.team_a, match.team_b, today, 
        scoreA, scoreB, newStatus
      );

      if (consensus.resolved) {
        finalScoreA = consensus.scoreA;
        finalScoreB = consensus.scoreB;
        newStatus = consensus.status;

        if (finalScoreA > finalScoreB) winner = 'A';
        else if (finalScoreB > finalScoreA) winner = 'B';
        else winner = 'DRAW';
      } else {
        // If consensus failed or disputed, we keep the match open or live
        if (consensus.status === 'disputed') {
          newStatus = 'disputed';
        } else {
          // just wait for next tick
          continue;
        }
      }

      // Update DB if there's a change
      if (match.score_a !== finalScoreA || match.score_b !== finalScoreB || match.status !== newStatus) {
        
        if (newStatus === 'finished' && winner) {
          // Resolve match atomically
          const { data: resolveResult, error: resolveErr } = await db.rpc('resolve_match', {
            p_match_id: match.id,
            p_score_a: finalScoreA,
            p_score_b: finalScoreB,
            p_winner: winner
          });
          
          if (resolveErr) console.error(`Failed to resolve match ${match.id}:`, resolveErr);
          else console.log(`Resolved match ${match.id}:`, resolveResult);
        } else {
          // Just update live scores
          await db.from('matches').update({
            score_a: finalScoreA,
            score_b: finalScoreB,
            status: newStatus
          }).eq('id', match.id);
        }
        processedCount++;
      }
    } // End of inner loop
  } // End of outer loop

    return res.status(200).json({ status: 'success', processed: processedCount });

  } catch (err) {
    console.error('Cron sync error:', err);
    return res.status(500).json({ error: err.message });
  }
}
