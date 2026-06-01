import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Parse .env
const env = fs.readFileSync('.env', 'utf-8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val.length) acc[key.trim()] = val.join('=').trim();
  return acc;
}, {});

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.from('tasks').select('*').limit(1);
  if (error) {
    console.log("Error querying tasks table:", error.message);
  } else {
    console.log("Tasks table exists!");
    if (data.length > 0) {
      console.log("Columns:", Object.keys(data[0]));
    } else {
      console.log("Table is empty. Let's try inserting a dummy to see schema error.");
      const { error: insErr } = await supabase.from('tasks').insert([{ id: 'test' }]);
      if (insErr) console.log("Insert error (gives hints about schema):", insErr.message);
    }
  }
}
check();
