import { supabase } from '../_lib/supabase.js';
import { validateInitData } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  const initData = req.headers['x-telegram-init-data'];
  const user = validateInitData(initData);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    try {
      // Get all active tasks
      const { data: allTasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('is_active', true);
        
      if (tasksError) {
        console.error('Tasks table error:', tasksError);
        return res.status(200).json([]); // Return empty array if table doesn't exist yet
      }

      // Get user's task progress
      const { data: userTasks } = await supabase
        .from('user_tasks')
        .select('*')
        .eq('user_id', user.id);

      // Map progress to tasks
      const merged = (allTasks || []).map(task => {
        const progress = (userTasks || []).find(ut => ut.task_id === task.id);
        return {
          ...task,
          status: progress ? progress.status : 'pending',
        };
      });

      // Get claimed achievements
      const claimedAchievements = (userTasks || [])
        .filter(ut => ut.task_id.startsWith('ach_') && ut.status === 'claimed')
        .map(ut => ut.task_id.replace('ach_', ''));

      return res.status(200).json({ tasks: merged, claimedAchievements });
    } catch (e) {
      console.error('Tasks GET error:', e);
      return res.status(200).json({ tasks: [], claimedAchievements: [] });
    }
  }

  if (req.method === 'POST') {
    const { action, taskId } = req.body;

    if (action === 'claim_streak') {
      try {
        const { data: dbUser } = await supabase
          .from('users')
          .select('login_streak, last_streak_claim, mining_speed_bonus, energy_regen_bonus, max_energy')
          .eq('telegram_id', user.id)
          .single();
        if (!dbUser) return res.status(404).json({ error: 'User not found' });

        const today = new Date().toISOString().split('T')[0];
        if (dbUser.last_streak_claim === today) {
          return res.status(400).json({ error: 'Already claimed today' });
        }

        // Increment streak (capped at 7, reset after 7)
        const currentStreak = dbUser.login_streak || 0;
        const newStreak = currentStreak >= 7 ? 1 : currentStreak + 1;

        // Read per-day reward config from streak_rewards table
        // Fallback to defaults if table doesn't exist
        let speedReward = 1;
        let maxEnergyReward = 100;
        
        try {
          const { data: streakConfig } = await supabase
            .from('streak_rewards')
            .select('speed_reward, max_energy_reward')
            .eq('day', newStreak)
            .single();
          if (streakConfig) {
            speedReward = streakConfig.speed_reward || 1;
            maxEnergyReward = streakConfig.max_energy_reward || 100;
          }
        } catch (e) {
          // Table may not exist yet, use defaults
        }

        const updates = {
          last_streak_claim: today,
          login_streak: newStreak,
          mining_speed_bonus: (dbUser.mining_speed_bonus || 0) + speedReward,
          max_energy: (dbUser.max_energy || 1000) + maxEnergyReward
        };

        await supabase.from('users').update(updates).eq('telegram_id', user.id);
        return res.status(200).json({ 
          success: true, 
          day: newStreak,
          speedReward,
          maxEnergyReward,
          rewardType: 'streak',
          rewardValue: `+${speedReward} Speed, +${maxEnergyReward} Max Energy`
        });
      } catch (e) {
        console.error('Claim streak error:', e);
        return res.status(500).json({ error: 'Server error' });
      }
    }
    
    if (action === 'verify' && taskId) {
      try {
        const { data: task } = await supabase.from('tasks').select('*').eq('id', taskId).single();
        if (!task) return res.status(404).json({ error: 'Task not found' });

        // If it's a telegram channel/group task, verify membership with Bot API
        if (task.type === 'telegram' && task.verification_data) {
          const botToken = process.env.TELEGRAM_BOT_TOKEN;
          let channelId = task.verification_data.trim(); // e.g. '@warcup2026_community' or 'https://t.me/...'
          
          // Convert t.me links to @username format
          if (channelId.includes('t.me/')) {
            const match = channelId.match(/t\.me\/([a-zA-Z0-9_]+)/);
            if (match && match[1] && match[1] !== 'joinchat') {
              channelId = '@' + match[1];
            }
          } else if (!channelId.startsWith('@') && !channelId.startsWith('-')) {
            channelId = '@' + channelId;
          }
          
          const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${channelId}&user_id=${user.id}`);
          const tgData = await tgRes.json();
          
          if (!tgData.ok) {
            console.error('Telegram API Error:', tgData);
            return res.status(400).json({ error: `Verification failed for chat ${channelId}. Telegram says: ${tgData.description || 'Unknown error'}` });
          }
          
          const memberStatus = tgData.result.status;
          if (['member', 'administrator', 'creator'].includes(memberStatus)) {
            await supabase.from('user_tasks').upsert(
              { user_id: user.id, task_id: taskId, status: 'verified' },
              { onConflict: 'user_id,task_id,reset_date' }
            );
            return res.status(200).json({ success: true, status: 'verified' });
          } else {
            return res.status(400).json({ error: 'You have not joined the channel/group yet.' });
          }
        } else {
          // For link tasks, mark verified when they come back
          await supabase.from('user_tasks').upsert(
            { user_id: user.id, task_id: taskId, status: 'verified' },
            { onConflict: 'user_id,task_id,reset_date' }
          );
          return res.status(200).json({ success: true, status: 'verified' });
        }
      } catch (e) {
        console.error('Verify task error:', e);
        return res.status(500).json({ error: 'Server error' });
      }
    }

    if (action === 'claim_task' && taskId) {
      try {
        const { data: task } = await supabase.from('tasks').select('*').eq('id', taskId).single();
        if (!task) return res.status(404).json({ error: 'Task not found' });

        const { data: userTask } = await supabase.from('user_tasks').select('*').eq('user_id', user.id).eq('task_id', taskId).single();
        
        if (!userTask || userTask.status !== 'verified') {
          return res.status(400).json({ error: 'Task not verified yet' });
        }

        const { data: dbUser } = await supabase.from('users').select('*').eq('telegram_id', user.id).single();
        
        const updates = {};
        if (task.reward_type === 'speed') {
          updates.mining_speed_bonus = (dbUser.mining_speed_bonus || 0) + task.reward_value;
        } else if (task.reward_type === 'regen') {
          updates.energy_regen_bonus = (dbUser.energy_regen_bonus || 0) + task.reward_value;
        } else if (task.reward_type === 'max_energy') {
          updates.max_energy = (dbUser.max_energy || 1000) + task.reward_value;
        } else if (task.reward_type === 'energy') {
          updates.energy = (dbUser.energy || 0) + task.reward_value;
        } else if (task.reward_type === 'votes') {
          updates.total_votes = (dbUser.total_votes || 0) + task.reward_value;
          updates.available_votes = (dbUser.available_votes || 0) + task.reward_value;
        } else if (task.reward_type === 'xp') {
          updates.xp = (dbUser.xp || 0) + task.reward_value;
        }

        if (Object.keys(updates).length > 0) {
          await supabase.from('users').update(updates).eq('telegram_id', user.id);
        }
        await supabase.from('user_tasks').update({
          status: 'claimed',
          completed: true,
          completed_at: new Date().toISOString()
        }).eq('id', userTask.id);

        return res.status(200).json({ success: true, rewardType: task.reward_type, rewardValue: task.reward_value });
      } catch (e) {
        console.error('Claim task error:', e);
        return res.status(500).json({ error: 'Server error' });
      }
    }

    if (action === 'claim_achievement' && taskId) {
      try {
        const { data: dbUser } = await supabase.from('users').select('*').eq('telegram_id', user.id).single();
        const { data: existing } = await supabase.from('user_tasks').select('*').eq('user_id', user.id).eq('task_id', `ach_${taskId}`).single();
        if (existing && existing.status === 'claimed') {
          return res.status(400).json({ error: 'Already claimed' });
        }

        // Fetch additional stats not stored directly on user table
        const { count: friendCount } = await supabase.from('referrals').select('*', { count: 'exact', head: true }).eq('referrer_id', user.id);
        dbUser.friend_count = friendCount || 0;
        
        const { count: nftCount } = await supabase.from('user_nfts').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
        dbUser.nft_count = nftCount || 0;

        const { count: predictionsWon } = await supabase.from('predictions').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_correct', true);
        dbUser.predictions_won = predictionsWon || 0;

        // Validate condition
        let isValid = false;
        let rewardVotes = 0;
        
        const check = (id, condition, reward) => { if (taskId === id && condition) { isValid = true; rewardVotes = reward; } };
        
        check('first_tap', dbUser.total_taps > 0, 100);
        check('tap_1k', dbUser.total_taps >= 1000, 500);
        check('tap_10k', dbUser.total_taps >= 10000, 2000);
        check('tap_100k', dbUser.total_taps >= 100000, 10000);
        check('tap_1m', dbUser.total_taps >= 1000000, 50000);
        check('friends_5', dbUser.friend_count >= 5, 2000);
        check('friends_20', dbUser.friend_count >= 20, 10000);
        // Note: predict_win logic requires predictions table, simplifying for now
        check('predict_win_3', dbUser.predictions_won >= 3, 5000);
        check('predict_win_10', dbUser.predictions_won >= 10, 25000);
        check('nft_5', dbUser.nft_count >= 5, 3000);
        check('streak_7', dbUser.login_streak >= 7, 2000);
        check('streak_30', dbUser.login_streak >= 30, 15000);
        check('level_10', dbUser.level >= 10, 5000);
        check('level_50', dbUser.level >= 50, 50000);
        check('clan_join', dbUser.clan_id != null, 500);
        check('founder', dbUser.founder_badge === true, 10000);

        if (!isValid) return res.status(400).json({ error: 'Achievement condition not met' });

        // Update DB
        const newVotes = (dbUser.total_votes || 0) + rewardVotes;
        const newAvail = (dbUser.available_votes || 0) + rewardVotes;
        
        await supabase.from('users').update({ total_votes: newVotes, available_votes: newAvail }).eq('telegram_id', user.id);
        await supabase.from('user_tasks').upsert({ user_id: user.id, task_id: `ach_${taskId}`, status: 'claimed', completed: true, completed_at: new Date().toISOString() }, { onConflict: 'user_id,task_id,reset_date' });
        
        return res.status(200).json({ success: true, rewardVotes });
      } catch (e) {
        console.error('Claim achievement error:', e);
        return res.status(500).json({ error: 'Server error' });
      }
    }
    
    return res.status(400).json({ error: 'Invalid action' });
  }
}
