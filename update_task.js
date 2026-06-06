import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('tasks')
    .update({ verification_data: '@warcup2026_global_chat' })
    .ilike('verification_data', '%Global Chat%');

  if (error) console.error('Error updating task:', error);
  else console.log('Successfully updated task verification data');
}

run();
