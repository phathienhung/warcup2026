const fs = require('fs');
const env = Object.fromEntries(fs.readFileSync('.env', 'utf-8').split('\n').filter(Boolean).map(line => line.split('=')));
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.VITE_SUPABASE_URL || env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY.trim());

async function check() {
  const { data: dbUser } = await supabase.from('users').select('*').limit(1);
  console.log('users schema:', Object.keys(dbUser[0]));
}
check();
