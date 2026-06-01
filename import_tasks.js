import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Parse .env
const env = fs.readFileSync('.env', 'utf-8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val.length) acc[key.trim()] = val.join('=').trim();
  return acc;
}, {});

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function importTasks() {
  const tasksRaw = fs.readFileSync('onetime_tasks.txt', 'utf-8');
  const tasksJSON = JSON.parse(tasksRaw);

  const mappedTasks = tasksJSON.map(item => ({
    id: item.id,
    title: item.name,
    description: item.desc,
    action_url: item.link,
    reward_value: item.reward,
    reward_type: 'votes', // Default
    type: 'partner', // Default
    is_active: true
  }));

  console.log(`Inserting ${mappedTasks.length} tasks...`);

  // Upsert to avoid duplicate key errors if some already exist
  const { data, error } = await supabase.from('tasks').upsert(mappedTasks, { onConflict: 'id' });

  if (error) {
    console.error("Error inserting tasks:", error);
  } else {
    console.log("Successfully inserted/updated all tasks!");
  }
}

importTasks();
