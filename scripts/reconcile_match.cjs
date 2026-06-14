const fs = require('fs');
const env = fs.readFileSync('.env', 'utf-8').split('\n').reduce((acc, line) => {
  const parts = line.split('=');
  if (parts.length >= 2) acc[parts[0].trim()] = parts.slice(1).join('=').trim();
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = env.SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const db = createClient(supabaseUrl, supabaseKey);

async function reconcileMatch(matchId, correctScoreA, correctScoreB, correctWinner) {
  console.log(`Starting reconciliation for Match: ${matchId}`);
  
  // 1. Get the match
  const { data: match, error: matchError } = await db.from('matches').select('*').eq('id', matchId).single();
  if (matchError || !match) {
    console.error("Failed to fetch match:", matchError);
    return;
  }
  
  console.log(`Match ${match.team_a} vs ${match.team_b} current status: ${match.status}, winner: ${match.winner}`);

  // 2. Fetch all predictions
  const { data: predictions, error: predError } = await db.from('predictions').select('*').eq('match_id', matchId);
  if (predError) {
    console.error("Failed to fetch predictions:", predError);
    return;
  }

  console.log(`Found ${predictions.length} predictions for this match.`);

  // 3. Revert user balances for any claims
  for (const pred of predictions) {
    if (pred.is_claimed && pred.reward > 0) {
      console.log(`Reverting claimed reward of ${pred.reward} for User ${pred.user_id}`);
      
      const { data: user, error: userErr } = await db.from('users').select('available_votes, predictions_won').eq('telegram_id', pred.user_id).single();
      if (!userErr && user) {
        const newBalance = Math.max(0, user.available_votes - pred.reward);
        const newWon = Math.max(0, (user.predictions_won || 1) - 1);
        
        await db.from('users').update({
          available_votes: newBalance,
          predictions_won: newWon
        }).eq('telegram_id', pred.user_id);
        
        console.log(`User ${pred.user_id} balance updated to ${newBalance}`);
      }
    }
    
    // Decrease predictions_total for ALL evaluated predictions to prepare for re-evaluation
    if (pred.is_correct !== null) {
        const { data: user, error: userErr } = await db.from('users').select('predictions_total').eq('telegram_id', pred.user_id).single();
        if (!userErr && user) {
            const newTotal = Math.max(0, (user.predictions_total || 1) - 1);
            await db.from('users').update({ predictions_total: newTotal }).eq('telegram_id', pred.user_id);
        }
    }

    // Reset the prediction
    await db.from('predictions').update({
      is_claimed: false,
      is_correct: null,
      reward: 0
    }).eq('id', pred.id);
  }

  // 4. Reset Match status
  console.log("Resetting match status to upcoming...");
  const { error: resetErr } = await db.from('matches').update({
    status: 'upcoming',
    winner: null,
    score_a: null,
    score_b: null
  }).eq('id', matchId);

  if (resetErr) {
    console.error("Failed to reset match:", resetErr);
    return;
  }

  // 5. Re-resolve the match with the correct outcome
  console.log(`Resolving match with score ${correctScoreA}-${correctScoreB} and winner ${correctWinner}...`);
  const { data: resolveResult, error: resolveErr } = await db.rpc('resolve_match', {
    p_match_id: matchId,
    p_score_a: correctScoreA,
    p_score_b: correctScoreB,
    p_winner: correctWinner
  });

  if (resolveErr) {
    console.error("Failed to resolve match:", resolveErr);
  } else {
    console.log("Match successfully resolved:", resolveResult);
  }
}

// Ensure args are provided
const matchId = process.argv[2];
const scoreA = parseInt(process.argv[3], 10);
const scoreB = parseInt(process.argv[4], 10);
const winner = process.argv[5]; // 'A', 'B', or 'DRAW'

if (!matchId || isNaN(scoreA) || isNaN(scoreB) || !winner) {
  console.log("Usage: node reconcile_match.js <match_id> <score_a> <score_b> <winner>");
  process.exit(1);
}

reconcileMatch(matchId, scoreA, scoreB, winner);
