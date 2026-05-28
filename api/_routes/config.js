import { supabase } from '../_lib/supabase.js';
import { validateInitData } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  const initData = req.headers['x-telegram-init-data'];
  const user = validateInitData(initData);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    try {
      const { data: config } = await supabase.from('game_config').select('*').single();
      const { data: nations } = await supabase.from('nations').select('*');
      
      // If config is not found in DB yet, provide defaults
      const defaultConfig = config || {
        energy_regen_rate_ms: 1000,
        energy_regen_amount: 1,
        max_energy_base: 1000,
        base_mining_speed: 1
      };
      
      return res.status(200).json({ config: defaultConfig, nations: nations || [] });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
