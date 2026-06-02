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
      const { data: nations } = await supabase.from('vw_nation_multipliers').select('*');
      const { data: shop_items } = await supabase.from('shop_items').select('*');
      const { data: nft_templates } = await supabase.from('nft_templates').select('*');
      const { data: daily_tasks } = await supabase.from('daily_tasks').select('*');
      const { data: achievements } = await supabase.from('achievements').select('*');
      
      // If config is not found in DB yet, provide defaults
      const defaultConfig = config || {
        energy_regen_rate_ms: 1000,
        energy_regen_amount: 1,
        max_energy_base: 1000,
        base_mining_speed: 1,
        base_xp_req: 1000,
        spin_segments_json: null
      };
      
      return res.status(200).json({ 
        config: defaultConfig, 
        nations: nations || [],
        shop_items: shop_items || [],
        nft_templates: nft_templates || [],
        daily_tasks: daily_tasks || [],
        achievements: achievements || []
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
