import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://example.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'fake';

async function main() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data } = await supabase.from('users').select('*').eq('telegram_id', '1597337885').single();
  console.log("DB User:", data);
}

main();
