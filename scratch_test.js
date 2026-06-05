import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: dbUser } = await supabase.from('users').select('*').limit(1).single();
  if (!dbUser) {
    console.log('No users found to test');
    return;
  }

  const { data, error } = await supabase.rpc('deposit_ton', {
    p_user_id: dbUser.telegram_id,
    p_tx_hash: 'test_hash_' + Date.now(),
    p_amount: 5
  });
  console.log('RPC Response:', data, error);
  
  const { data: updatedUser } = await supabase.from('users').select('ton_balance, ton_deposited').eq('telegram_id', dbUser.telegram_id).single();
  console.log('Updated User:', updatedUser);
}
test();
