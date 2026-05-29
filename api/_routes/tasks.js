import { supabase } from '../_lib/supabase.js';
import { validateInitData } from '../_lib/auth.js';
import fetch from 'node-fetch'; // if available, or native fetch

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
        
      if (tasksError) throw tasksError;

      // Get user's task progress
      const { data: userTasks, error: userTasksError } = await supabase
        .from('user_tasks')
        .select('*')
        .eq('user_id', user.id);
        
      if (userTasksError) throw userTasksError;

      // Map progress to tasks
      const merged = allTasks.map(task => {
        const progress = userTasks.find(ut => ut.task_id === task.id);
        return {
          ...task,
          status: progress ? progress.status : 'pending', // 'pending', 'verified', 'claimed'
        };
      });

      return res.status(200).json(merged);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Failed to fetch tasks' });
    }
  }

  if (req.method === 'POST') {
    const { action, taskId } = req.body;

    if (action === 'claim_streak') {
      try {
        const { data: dbUser } = await supabase.from('users').select('login_streak, last_streak_claim').eq('telegram_id', user.id).single();
        if (!dbUser) return res.status(404).json({ error: 'User not found' });

        const today = new Date().toISOString().split('T')[0];
        if (dbUser.last_streak_claim === today) {
          return res.status(400).json({ error: 'Already claimed today' });
        }

        const { data: config } = await supabase.from('game_config').select('streak_reward_type, streak_reward_value').eq('id', 1).single();
        
        const rewardType = config?.streak_reward_type || 'speed';
        const rewardValue = config?.streak_reward_value || 1;
        
        const updates = { last_streak_claim: today };
        
        if (rewardType === 'speed') {
          updates.mining_speed_bonus = (dbUser.mining_speed_bonus || 0) + rewardValue;
        } else if (rewardType === 'regen') {
          updates.energy_regen_bonus = (dbUser.energy_regen_bonus || 0) + rewardValue;
        } else if (rewardType === 'max_energy') {
          updates.max_energy = (dbUser.max_energy || 1000) + rewardValue;
        }

        await supabase.from('users').update(updates).eq('telegram_id', user.id);
        return res.status(200).json({ success: true, rewardType, rewardValue });
      } catch (e) {
        console.error(e);
        return res.status(500).json({ error: 'Server error' });
      }
    }
    
    if (action === 'verify' && taskId) {
      try {
        const { data: task } = await supabase.from('tasks').select('*').eq('id', taskId).single();
        if (!task) return res.status(404).json({ error: 'Task not found' });

        // If it's a telegram channel task, verify with Telegram API
        if (task.type === 'telegram' && task.verification_data) {
          const botToken = process.env.TELEGRAM_BOT_TOKEN;
          const channelId = task.verification_data; // e.g. @warcup2026
          
          const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${channelId}&user_id=${user.id}`);
          const tgData = await tgRes.json();
          
          if (!tgData.ok) {
            return res.status(400).json({ error: 'Verification failed. Make sure the bot is an admin of the channel.' });
          }
          
          const status = tgData.result.status;
          if (['member', 'administrator', 'creator'].includes(status)) {
            // verified!
            await supabase.from('user_tasks').upsert({ user_id: user.id, task_id: taskId, status: 'verified' }, { onConflict: 'user_id,task_id,reset_date' });
            return res.status(200).json({ success: true, status: 'verified' });
          } else {
            return res.status(400).json({ error: 'You have not joined the channel yet.' });
          }
        } else {
          // For simple link tasks, just mark verified automatically after they click
          await supabase.from('user_tasks').upsert({ user_id: user.id, task_id: taskId, status: 'verified' }, { onConflict: 'user_id,task_id,reset_date' });
          return res.status(200).json({ success: true, status: 'verified' });
        }
      } catch (e) {
        console.error(e);
        return res.status(500).json({ error: 'Server error' });
      }
    }

    if (action === 'claim_task' && taskId) {
      try {
        const { data: task } = await supabase.from('tasks').select('*').eq('id', taskId).single();
        if (!task) return res.status(404).json({ error: 'Task not found' });

        const { data: userTask } = await supabase.from('user_tasks').select('*').eq('user_id', user.id).eq('task_id', taskId).single();
        
        // Ensure they verified it first
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
        } else if (task.reward_type === 'votes') {
          updates.total_votes = (dbUser.total_votes || 0) + task.reward_value;
          updates.available_votes = (dbUser.available_votes || 0) + task.reward_value;
        }

        await supabase.from('users').update(updates).eq('telegram_id', user.id);
        await supabase.from('user_tasks').update({ status: 'claimed', completed: true, completed_at: new Date().toISOString() }).eq('id', userTask.id);

        return res.status(200).json({ success: true, rewardType: task.reward_type, rewardValue: task.reward_value });
      } catch (e) {
        console.error(e);
        return res.status(500).json({ error: 'Server error' });
      }
    }
    
    return res.status(400).json({ error: 'Invalid action' });
  }
}
