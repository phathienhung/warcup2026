import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';
import fetch from 'node-fetch';
import { normalizeTeamName } from '../_lib/countryMap.js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const db = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const CRON_SECRET = process.env.CRON_SECRET || '123456';
const SOURCE_URL = 'https://www.24h.com.vn/world-cup-2026/ket-qua-thi-dau-bong-da-world-cup-2026-moi-nhat-c860a1747405.html';

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

  try {
    // 1. Get pending matches from DB (started but not finished)
    const { data: matches, error } = await db
      .from('matches')
      .select('*')
      .lte('match_date', new Date().toISOString())
      .neq('status', 'finished');

    if (error) throw error;
    if (!matches || matches.length === 0) {
      return res.status(200).json({ status: 'success', message: 'No pending matches to sync' });
    }

    console.log(`Found ${matches.length} matches to check.`);

    // 2. Fetch the hardcoded 24h article URL
    console.log(`Fetching results from: ${SOURCE_URL}`);
    const response = await fetch(SOURCE_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch source URL: ${response.statusText}`);
    }
    const html = await response.text();
    const $ = cheerio.load(html);

    // 3. Extract scores from article
    const scrapedResults = [];
    $('.match-hot, .box-items').each((i, el) => {
      const text = $(el).text().replace(/\s+/g, ' ').trim();
      // Format usually: "Bảng F 15/06 03:00 Trận 10 Hà Lan 2 - 2 Nhật Bản Video highlight"
      const matchRegex = /Trận\s+\d+\s+(.*?)\s+(\d+)\s*-\s*(\d+)\s+(.*?)(?:\s+Video|\s+VTV|$)/i;
      const m = text.match(matchRegex);
      if (m) {
        const teamAName = m[1].trim();
        const scoreA = parseInt(m[2]);
        const scoreB = parseInt(m[3]);
        const teamBName = m[4].trim();

        const isoA = normalizeTeamName(teamAName);
        const isoB = normalizeTeamName(teamBName);

        if (isoA && isoB) {
          scrapedResults.push({
            team_a: isoA,
            team_b: isoB,
            score_a: scoreA,
            score_b: scoreB,
            status: 'finished'
          });
        }
      }
    });

    console.log(`Parsed ${scrapedResults.length} completed matches from the article.`);

    let processedCount = 0;

    // 4. Reconcile pending matches with scraped results
    for (const match of matches) {
      // Find matching result
      const result = scrapedResults.find(r => 
        (r.team_a === match.team_a && r.team_b === match.team_b) ||
        (r.team_a === match.team_b && r.team_b === match.team_a)
      );

      if (!result) {
        console.log(`No results found yet for ${match.team_a} vs ${match.team_b}`);
        continue;
      }

      // We found a result! Determine actual score A and B based on db ordering
      let finalScoreA, finalScoreB;
      if (result.team_a === match.team_a) {
        finalScoreA = result.score_a;
        finalScoreB = result.score_b;
      } else {
        finalScoreA = result.score_b;
        finalScoreB = result.score_a;
      }

      let winner = 'DRAW';
      if (finalScoreA > finalScoreB) winner = 'A';
      else if (finalScoreB > finalScoreA) winner = 'B';

      // Resolve match atomically via RPC
      const { data: resolveResult, error: resolveErr } = await db.rpc('resolve_match', {
        p_match_id: match.id,
        p_score_a: finalScoreA,
        p_score_b: finalScoreB,
        p_winner: winner
      });
      
      if (resolveErr) {
        console.error(`Failed to resolve match ${match.id}:`, resolveErr);
      } else {
        console.log(`Successfully resolved ${match.team_a} vs ${match.team_b} (${finalScoreA}-${finalScoreB}):`, resolveResult);
        processedCount++;
      }
    }

    return res.status(200).json({ status: 'success', processed: processedCount });

  } catch (err) {
    console.error('Cron sync error:', err);
    return res.status(500).json({ error: err.message });
  }
}
