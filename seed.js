import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const SCHEDULED_MATCHES = [
  { id: 1, round: 'Matchday 1', stage: 'Group A', date: '2026-06-12T02:00:00+07:00', teamA: 'MX', teamB: 'ZA' },
  { id: 2, round: 'Matchday 1', stage: 'Group A', date: '2026-06-12T09:00:00+07:00', teamA: 'KR', teamB: 'CZ' },
  { id: 3, round: 'Matchday 1', stage: 'Group B', date: '2026-06-13T02:00:00+07:00', teamA: 'CA', teamB: 'BA' },
  { id: 4, round: 'Matchday 1', stage: 'Group D', date: '2026-06-13T08:00:00+07:00', teamA: 'US', teamB: 'PY' },
  { id: 5, round: 'Matchday 1', stage: 'Group B', date: '2026-06-14T02:00:00+07:00', teamA: 'QA', teamB: 'CH' },
  { id: 6, round: 'Matchday 1', stage: 'Group C', date: '2026-06-14T05:00:00+07:00', teamA: 'BR', teamB: 'MA' },
  { id: 7, round: 'Matchday 1', stage: 'Group C', date: '2026-06-14T08:00:00+07:00', teamA: 'HT', teamB: 'SC' },
  { id: 8, round: 'Matchday 1', stage: 'Group D', date: '2026-06-14T11:00:00+07:00', teamA: 'AU', teamB: 'TR' },
  { id: 9, round: 'Matchday 1', stage: 'Group E', date: '2026-06-15T00:00:00+07:00', teamA: 'DE', teamB: 'CW' },
  { id: 10, round: 'Matchday 1', stage: 'Group F', date: '2026-06-15T03:00:00+07:00', teamA: 'NL', teamB: 'JP' },
  { id: 11, round: 'Matchday 1', stage: 'Group E', date: '2026-06-15T06:00:00+07:00', teamA: 'CI', teamB: 'EC' },
  { id: 12, round: 'Matchday 1', stage: 'Group F', date: '2026-06-15T09:00:00+07:00', teamA: 'SE', teamB: 'TN' },
  { id: 13, round: 'Matchday 1', stage: 'Group H', date: '2026-06-15T23:00:00+07:00', teamA: 'ES', teamB: 'CV' },
  { id: 14, round: 'Matchday 1', stage: 'Group G', date: '2026-06-16T02:00:00+07:00', teamA: 'BE', teamB: 'EG' },
  { id: 15, round: 'Matchday 1', stage: 'Group H', date: '2026-06-16T05:00:00+07:00', teamA: 'SA', teamB: 'UY' },
  { id: 16, round: 'Matchday 1', stage: 'Group G', date: '2026-06-16T08:00:00+07:00', teamA: 'IR', teamB: 'NZ' },
  { id: 17, round: 'Matchday 1', stage: 'Group I', date: '2026-06-17T02:00:00+07:00', teamA: 'FR', teamB: 'SN' },
  { id: 18, round: 'Matchday 1', stage: 'Group I', date: '2026-06-17T05:00:00+07:00', teamA: 'IQ', teamB: 'NO' },
  { id: 19, round: 'Matchday 1', stage: 'Group J', date: '2026-06-17T08:00:00+07:00', teamA: 'AR', teamB: 'DZ' },
  { id: 20, round: 'Matchday 1', stage: 'Group J', date: '2026-06-17T11:00:00+07:00', teamA: 'AT', teamB: 'JO' },
  { id: 21, round: 'Matchday 1', stage: 'Group K', date: '2026-06-18T00:00:00+07:00', teamA: 'PT', teamB: 'CD' },
  { id: 22, round: 'Matchday 1', stage: 'Group L', date: '2026-06-18T03:00:00+07:00', teamA: 'GB', teamB: 'HR' },
  { id: 23, round: 'Matchday 1', stage: 'Group L', date: '2026-06-18T06:00:00+07:00', teamA: 'GH', teamB: 'PA' },
  { id: 24, round: 'Matchday 1', stage: 'Group K', date: '2026-06-18T09:00:00+07:00', teamA: 'UZ', teamB: 'CO' },
  { id: 25, round: 'Matchday 2', stage: 'Group A', date: '2026-06-18T23:00:00+07:00', teamA: 'CZ', teamB: 'ZA' },
  { id: 26, round: 'Matchday 2', stage: 'Group B', date: '2026-06-19T02:00:00+07:00', teamA: 'CH', teamB: 'BA' },
  { id: 27, round: 'Matchday 2', stage: 'Group B', date: '2026-06-19T05:00:00+07:00', teamA: 'CA', teamB: 'QA' },
  { id: 28, round: 'Matchday 2', stage: 'Group A', date: '2026-06-19T08:00:00+07:00', teamA: 'MX', teamB: 'KR' },
  { id: 29, round: 'Matchday 2', stage: 'Group D', date: '2026-06-20T02:00:00+07:00', teamA: 'US', teamB: 'AU' },
  { id: 30, round: 'Matchday 2', stage: 'Group C', date: '2026-06-20T05:00:00+07:00', teamA: 'SC', teamB: 'MA' },
  { id: 31, round: 'Matchday 2', stage: 'Group C', date: '2026-06-20T07:30:00+07:00', teamA: 'BR', teamB: 'HT' },
  { id: 32, round: 'Matchday 2', stage: 'Group D', date: '2026-06-20T10:00:00+07:00', teamA: 'TR', teamB: 'PY' },
  { id: 33, round: 'Matchday 2', stage: 'Group F', date: '2026-06-21T00:00:00+07:00', teamA: 'NL', teamB: 'SE' },
  { id: 34, round: 'Matchday 2', stage: 'Group E', date: '2026-06-21T03:00:00+07:00', teamA: 'DE', teamB: 'CI' },
  { id: 35, round: 'Matchday 2', stage: 'Group E', date: '2026-06-21T07:00:00+07:00', teamA: 'EC', teamB: 'CW' },
  { id: 36, round: 'Matchday 2', stage: 'Group F', date: '2026-06-21T11:00:00+07:00', teamA: 'TN', teamB: 'JP' },
  { id: 37, round: 'Matchday 2', stage: 'Group H', date: '2026-06-21T23:00:00+07:00', teamA: 'ES', teamB: 'SA' },
  { id: 38, round: 'Matchday 2', stage: 'Group G', date: '2026-06-22T02:00:00+07:00', teamA: 'BE', teamB: 'IR' },
  { id: 39, round: 'Matchday 2', stage: 'Group H', date: '2026-06-22T05:00:00+07:00', teamA: 'UY', teamB: 'CV' },
  { id: 40, round: 'Matchday 2', stage: 'Group G', date: '2026-06-22T08:00:00+07:00', teamA: 'NZ', teamB: 'EG' },
  { id: 41, round: 'Matchday 2', stage: 'Group J', date: '2026-06-23T00:00:00+07:00', teamA: 'AR', teamB: 'AT' },
  { id: 42, round: 'Matchday 2', stage: 'Group I', date: '2026-06-23T04:00:00+07:00', teamA: 'FR', teamB: 'IQ' },
  { id: 43, round: 'Matchday 2', stage: 'Group I', date: '2026-06-23T07:00:00+07:00', teamA: 'NO', teamB: 'SN' },
  { id: 44, round: 'Matchday 2', stage: 'Group J', date: '2026-06-23T10:00:00+07:00', teamA: 'JO', teamB: 'DZ' },
  { id: 45, round: 'Matchday 2', stage: 'Group K', date: '2026-06-24T00:00:00+07:00', teamA: 'PT', teamB: 'UZ' },
  { id: 46, round: 'Matchday 2', stage: 'Group L', date: '2026-06-24T03:00:00+07:00', teamA: 'GB', teamB: 'GH' },
  { id: 47, round: 'Matchday 2', stage: 'Group L', date: '2026-06-24T06:00:00+07:00', teamA: 'PA', teamB: 'HR' },
  { id: 48, round: 'Matchday 2', stage: 'Group K', date: '2026-06-24T09:00:00+07:00', teamA: 'CO', teamB: 'CD' },
  { id: 49, round: 'Matchday 3', stage: 'Group B', date: '2026-06-25T02:00:00+07:00', teamA: 'BA', teamB: 'QA' },
  { id: 50, round: 'Matchday 3', stage: 'Group B', date: '2026-06-25T02:00:00+07:00', teamA: 'CH', teamB: 'CA' },
  { id: 51, round: 'Matchday 3', stage: 'Group C', date: '2026-06-25T05:00:00+07:00', teamA: 'MA', teamB: 'HT' },
  { id: 52, round: 'Matchday 3', stage: 'Group C', date: '2026-06-25T05:00:00+07:00', teamA: 'SC', teamB: 'BR' },
  { id: 53, round: 'Matchday 3', stage: 'Group A', date: '2026-06-25T08:00:00+07:00', teamA: 'ZA', teamB: 'KR' },
  { id: 54, round: 'Matchday 3', stage: 'Group A', date: '2026-06-25T08:00:00+07:00', teamA: 'CZ', teamB: 'MX' },
  { id: 55, round: 'Matchday 3', stage: 'Group E', date: '2026-06-26T03:00:00+07:00', teamA: 'CW', teamB: 'CI' },
  { id: 56, round: 'Matchday 3', stage: 'Group E', date: '2026-06-26T03:00:00+07:00', teamA: 'EC', teamB: 'DE' },
  { id: 57, round: 'Matchday 3', stage: 'Group F', date: '2026-06-26T06:00:00+07:00', teamA: 'TN', teamB: 'NL' },
  { id: 58, round: 'Matchday 3', stage: 'Group F', date: '2026-06-26T06:00:00+07:00', teamA: 'JP', teamB: 'SE' },
  { id: 59, round: 'Matchday 3', stage: 'Group D', date: '2026-06-26T09:00:00+07:00', teamA: 'TR', teamB: 'US' },
  { id: 60, round: 'Matchday 3', stage: 'Group D', date: '2026-06-26T09:00:00+07:00', teamA: 'PY', teamB: 'AU' },
  { id: 61, round: 'Matchday 3', stage: 'Group I', date: '2026-06-27T02:00:00+07:00', teamA: 'NO', teamB: 'FR' },
  { id: 62, round: 'Matchday 3', stage: 'Group I', date: '2026-06-27T02:00:00+07:00', teamA: 'SN', teamB: 'IQ' },
  { id: 63, round: 'Matchday 3', stage: 'Group H', date: '2026-06-27T07:00:00+07:00', teamA: 'CV', teamB: 'SA' },
  { id: 64, round: 'Matchday 3', stage: 'Group H', date: '2026-06-27T07:00:00+07:00', teamA: 'UY', teamB: 'ES' },
  { id: 65, round: 'Matchday 3', stage: 'Group G', date: '2026-06-27T10:00:00+07:00', teamA: 'NZ', teamB: 'BE' },
  { id: 66, round: 'Matchday 3', stage: 'Group G', date: '2026-06-27T10:00:00+07:00', teamA: 'EG', teamB: 'IR' },
  { id: 67, round: 'Matchday 3', stage: 'Group L', date: '2026-06-28T04:00:00+07:00', teamA: 'PA', teamB: 'GB' },
  { id: 68, round: 'Matchday 3', stage: 'Group L', date: '2026-06-28T04:00:00+07:00', teamA: 'HR', teamB: 'GH' },
  { id: 69, round: 'Matchday 3', stage: 'Group K', date: '2026-06-28T06:30:00+07:00', teamA: 'CO', teamB: 'PT' },
  { id: 70, round: 'Matchday 3', stage: 'Group K', date: '2026-06-28T06:30:00+07:00', teamA: 'CD', teamB: 'UZ' },
  { id: 71, round: 'Matchday 3', stage: 'Group J', date: '2026-06-28T09:00:00+07:00', teamA: 'DZ', teamB: 'AT' },
  { id: 72, round: 'Matchday 3', stage: 'Group J', date: '2026-06-28T09:00:00+07:00', teamA: 'JO', teamB: 'AR' }
];

async function run() {
  console.log('Altering matches table...');
  const { error: alterError } = await supabase.rpc('execute_sql', {
    sql: `
      ALTER TABLE matches ADD COLUMN IF NOT EXISTS base_pool_a BIGINT DEFAULT 10000;
      ALTER TABLE matches ADD COLUMN IF NOT EXISTS base_pool_b BIGINT DEFAULT 10000;
      ALTER TABLE matches ADD COLUMN IF NOT EXISTS base_pool_draw BIGINT DEFAULT 5000;
      ALTER TABLE matches ADD COLUMN IF NOT EXISTS total_votes_draw BIGINT DEFAULT 0;
    `
  });
  
  if (alterError) {
    console.log('Notice: Could not execute alter via rpc (maybe no execute_sql function), skipping. Please ensure schema.sql is executed manually if needed.');
  }

  console.log('Seeding matches...');
  // Check if matches exist
  const { data: existing } = await supabase.from('matches').select('id').limit(1);
  if (existing && existing.length > 0) {
    console.log('Matches already exist. Deleting existing matches...');
    await supabase.from('matches').delete().neq('status', 'nonexistent');
  }

  // Insert matches
  const matchInserts = SCHEDULED_MATCHES.map(m => ({
    team_a: m.teamA,
    team_b: m.teamB,
    match_date: m.date,
    stage: m.stage,
    status: 'upcoming',
    base_pool_a: 10000,
    base_pool_b: 10000,
    base_pool_draw: 5000,
    total_votes_a: 0,
    total_votes_b: 0,
    total_votes_draw: 0
  }));

  const { error } = await supabase.from('matches').insert(matchInserts);
  if (error) {
    console.error('Error seeding matches:', error);
  } else {
    console.log('Successfully seeded 72 matches!');
  }
}

run();
