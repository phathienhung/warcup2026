import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const db = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const apiFootballKey = process.env.API_FOOTBALL_KEY;
const CRON_SECRET = process.env.CRON_SECRET;

export default async function handler(req, res) {
  // Security check for cron invocation
  const authHeader = req.headers.authorization;
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
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

    // Group by date to fetch from API-Football efficiently
    // API-Football endpoint: GET https://v3.football.api-sports.io/fixtures?date=YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];
    
    const response = await fetch(`https://v3.football.api-sports.io/fixtures?date=${today}`, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'v3.football.api-sports.io',
        'x-rapidapi-key': apiFootballKey
      }
    });

    const apiData = await response.json();
    if (!apiData || !apiData.response) {
      throw new Error('Invalid response from API-Football');
    }

    const fixtures = apiData.response;
    let processedCount = 0;

    // 2. Map and update matches
    for (const match of matches) {
      // Find matching fixture in API data
      // (Using basic string matching for team names. In production, mapping team IDs is safer)
      const fixture = fixtures.find(f => 
        (f.teams.home.name.toLowerCase().includes(match.team_a.toLowerCase()) || 
         match.team_a.toLowerCase().includes(f.teams.home.name.toLowerCase())) ||
        (f.teams.away.name.toLowerCase().includes(match.team_b.toLowerCase()) || 
         match.team_b.toLowerCase().includes(f.teams.away.name.toLowerCase()))
      );

      if (!fixture) continue;

      const scoreA = fixture.goals.home;
      const scoreB = fixture.goals.away;
      const fixtureStatus = fixture.fixture.status.short; // FT (Full Time), PEN (Penalties), 1H, 2H, etc.

      let newStatus = match.status;
      if (['1H', '2H', 'HT', 'ET', 'P'].includes(fixtureStatus)) {
        newStatus = 'live';
      }

      let winner = null;
      let finalScoreA = scoreA;
      let finalScoreB = scoreB;

      if (['FT', 'AET', 'PEN'].includes(fixtureStatus)) {
        newStatus = 'finished';
        
        // Handle penalties if applicable
        if (fixtureStatus === 'PEN' && fixture.score.penalty.home !== null) {
          finalScoreA = fixture.score.penalty.home;
          finalScoreB = fixture.score.penalty.away;
        }

        if (finalScoreA > finalScoreB) winner = 'A';
        else if (finalScoreB > finalScoreA) winner = 'B';
        else winner = 'DRAW';
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
    }

    return res.status(200).json({ status: 'success', processed: processedCount });

  } catch (err) {
    console.error('Cron sync error:', err);
    return res.status(500).json({ error: err.message });
  }
}
