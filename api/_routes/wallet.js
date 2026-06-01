import { supabase } from '../_lib/supabase.js';
import { validateInitData } from '../_lib/auth.js';
import { Bot, InlineKeyboard } from 'grammy';

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const bot = botToken ? new Bot(botToken) : null;
const adminChatId = process.env.ADMIN_CHAT_ID;
const publicChannelId = process.env.PUBLIC_CHANNEL_ID;

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  const initData = req.headers['x-telegram-init-data'];
  const user = validateInitData(initData);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    // Get transaction history
    try {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.status(200).json(data || []);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    const { action, amount, address } = req.body;

    if (action === 'withdraw') {
      try {
        const { data: dbUser } = await supabase
          .from('users')
          .select('ton_balance, username')
          .eq('telegram_id', user.id)
          .single();

        if (!dbUser || dbUser.ton_balance < amount) {
          return res.status(400).json({ error: 'Insufficient balance' });
        }

        // Deduct balance and create pending transaction
        await supabase
          .from('users')
          .update({ ton_balance: dbUser.ton_balance - amount })
          .eq('telegram_id', user.id);

        const { data: tx, error: txError } = await supabase
          .from('wallet_transactions')
          .insert({
            user_id: user.id,
            tx_type: 'withdraw',
            amount_ton: amount,
            wallet_address: address,
            status: 'pending'
          })
          .select()
          .single();
          
        if (txError) throw txError;

        // Send to Admin Chat
        if (bot && adminChatId) {
          const usernameStr = dbUser.username ? `@${dbUser.username}` : `ID: ${user.id}`;
          const text = `📤 *YÊU CẦU RÚT TIỀN*\nNgười chơi: ${usernameStr}\nSố lượng: *${amount} TON*\nĐịa chỉ nhận: \`${address}\``;
          
          const nanoTon = Math.floor(amount * 1e9);
          const keyboard = new InlineKeyboard()
            .url('🔗 Mở Tonkeeper Chuyển Tiền', `ton://transfer/${address}?amount=${nanoTon}`).row()
            .text('✅ Xác Nhận Đã Chuyển', `withdraw_${tx.id}`).row()
            .text('❌ Từ chối & Hoàn tiền', `reject_${tx.id}`);
            
          await bot.api.sendMessage(adminChatId, text, { parse_mode: 'Markdown', reply_markup: keyboard });
        }

        return res.status(200).json({ success: true, newBalance: dbUser.ton_balance - amount });
      } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }

    if (action === 'deposit') {
      try {
        // Automatic Deposit Approval MVP
        const { data: dbUser } = await supabase
          .from('users')
          .select('ton_balance, username')
          .eq('telegram_id', user.id)
          .single();
          
        const newBalance = (dbUser?.ton_balance || 0) + amount;

        // 1. Add balance
        await supabase.from('users').update({ ton_balance: newBalance }).eq('telegram_id', user.id);

        // 2. Insert completed tx
        const { data: tx, error: txError } = await supabase
          .from('wallet_transactions')
          .insert({
            user_id: user.id,
            tx_type: 'deposit',
            amount_ton: amount,
            wallet_address: address,
            status: 'completed'
          })
          .select()
          .single();

        // 3. Notify Admin & Public
        if (bot) {
          const usernameStr = dbUser?.username ? `@${dbUser.username}` : `ID: ${user.id}`;
          
          if (adminChatId) {
             const text = `📥 *BÁO CÁO NẠP TIỀN (AUTO)*\nNgười chơi: ${usernameStr}\nSố lượng: *${amount} TON*\nVí: \`${address}\``;
             await bot.api.sendMessage(adminChatId, text, { parse_mode: 'Markdown' });
          }
          
          if (publicChannelId) {
             const textPub = `🚀 Chúc mừng ${usernameStr} vừa nạp thành công *${amount} TON* để săn vé World Cup! 🏆`;
             await bot.api.sendMessage(publicChannelId, textPub, { parse_mode: 'Markdown' });
          }
        }

        return res.status(200).json({ success: true });
      } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }
  }
}
