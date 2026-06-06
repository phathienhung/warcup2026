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
        const today = new Date().toISOString().split('T')[0];
        
        const { data: result, error: rpcError } = await supabase.rpc('claim_streak_reward', {
          p_user_id: user.id,
          p_today_str: today
        });

        if (rpcError) throw rpcError;

        if (!result.success) {
          return res.status(400).json({ error: result.error });
        }

        return res.status(200).json({ 
          success: true, 
          day: result.day,
          speedReward: result.speedReward,
          maxEnergyReward: result.maxEnergyReward,
          rewardType: 'streak',
          rewardValue: `+${result.speedReward} Speed, +${result.maxEnergyReward} Max Energy`
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
            return res.status(400).json({ error: 'Verification failed. Please make sure you joined the channel.' });
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

        // C-2 FIX: Verify that the task is actually marked as 'verified' in user_tasks
        const { data: userTask } = await supabase.from('user_tasks').select('status').eq('user_id', user.id).eq('task_id', taskId).single();
        if (!userTask || userTask.status !== 'verified') {
          return res.status(403).json({ error: 'Task has not been verified yet' });
        }

        const { data: result, error: rpcError } = await supabase.rpc('claim_reward', {
          p_user_id: user.id,
          p_task_id: taskId,
          p_reward_type: task.reward_type,
          p_reward_value: task.reward_value
        });

        if (rpcError) throw rpcError;

        if (!result.success) {
          return res.status(400).json({ error: result.error });
        }

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

        const { data: achievementDb } = await supabase.from('achievements').select('reward_votes').eq('id', taskId).single();
        if (!achievementDb) return res.status(404).json({ error: 'Achievement not found in database' });

        // Validate condition
        let isValid = false;
        let rewardVotes = achievementDb.reward_votes || 0;
        
        const check = (id, condition) => { if (taskId === id && condition) { isValid = true; } };
        
        check('first_tap', dbUser.total_taps > 0);
        check('tap_1k', dbUser.total_taps >= 1000);
        check('tap_10k', dbUser.total_taps >= 10000);
        check('tap_100k', dbUser.total_taps >= 100000);
        check('tap_1m', dbUser.total_taps >= 1000000);
        check('friends_5', dbUser.friend_count >= 5);
        check('friends_20', dbUser.friend_count >= 20);
        check('predict_win_3', dbUser.predictions_won >= 3);
        check('predict_win_10', dbUser.predictions_won >= 10);
        check('nft_5', dbUser.nft_count >= 5);
        check('streak_7', dbUser.login_streak >= 7);
        check('streak_30', dbUser.login_streak >= 30);
        check('level_10', dbUser.level >= 10);
        check('level_50', dbUser.level >= 50);
        check('clan_join', dbUser.clan_id != null);
        check('founder', dbUser.founder_badge === true);

        if (!isValid) return res.status(400).json({ error: 'Achievement condition not met' });

        // Update DB via RPC
        const { data: result, error: rpcError } = await supabase.rpc('claim_achievement_reward', {
          p_user_id: user.id,
          p_achievement_id: `ach_${taskId}`,
          p_reward_votes: rewardVotes
        });

        if (rpcError) throw rpcError;

        if (!result.success) {
          return res.status(400).json({ error: result.error });
        }
        
        return res.status(200).json({ success: true, rewardVotes });
      } catch (e) {
        console.error('Claim achievement error:', e);
        return res.status(500).json({ error: 'Server error' });
      }
    }
    
    return res.status(400).json({ error: 'Invalid action' });
  }
}
