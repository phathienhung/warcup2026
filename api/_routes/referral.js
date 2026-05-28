import { supabase } from '../_lib/supabase.js';
import { validateInitData } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  const initData = req.headers['x-telegram-init-data'];
  const user = validateInitData(initData);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    const { data: dbUser } = await supabase.from('users').select('referral_code').eq('telegram_id', user.id).single();
    
    const { data: friends } = await supabase.from('referrals').select('referred_id, users!referred_id(username, total_votes)').eq('referrer_id', user.id);
    
    return res.status(200).json({
      referral_code: dbUser?.referral_code,
      friends: friends || []
    });
  }
}
