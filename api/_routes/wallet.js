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
          .select('ton_balance, username, ton_deposited, ton_withdrawn_today, last_withdrawal_date')
          .eq('telegram_id', user.id)
          .single();

        if (!dbUser) return res.status(400).json({ error: 'User not found' });
        
        if (dbUser.ton_balance < amount) {
          return res.status(400).json({ error: 'Insufficient balance' });
        }
        
        const tonDeposited = Number(dbUser.ton_deposited || 0);
        if (tonDeposited <= 0) {
          return res.status(400).json({ error: 'You must deposit TON first to unlock withdrawals.' });
        }

        // Check Daily Limit
        const todayStr = new Date().toISOString().split('T')[0];
        let withdrawnToday = Number(dbUser.ton_withdrawn_today || 0);
        const lastWithdrawalDateStr = dbUser.last_withdrawal_date ? new Date(dbUser.last_withdrawal_date).toISOString().split('T')[0] : null;
        
        if (lastWithdrawalDateStr !== todayStr) {
          withdrawnToday = 0; // Reset for new day
        }
        
        const dailyLimit = tonDeposited * 0.1;
        if (withdrawnToday + amount > dailyLimit) {
          return res.status(400).json({ error: `Daily limit exceeded. You can only withdraw up to ${(dailyLimit - withdrawnToday).toFixed(3)} TON today.` });
        }

        // Deduct balance, update daily limit stats, create pending transaction
        await supabase
          .from('users')
          .update({ 
            ton_balance: Number(dbUser.ton_balance) - amount,
            ton_withdrawn_today: withdrawnToday + amount,
            last_withdrawal_date: new Date().toISOString()
          })
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
          const text = `📤 *WITHDRAW REQUEST*\nUser: ${usernameStr}\nAmount: *${amount} TON*\nWallet: \`${address}\``;
          
          const nanoTon = Math.floor(amount * 1e9);
          const keyboard = new InlineKeyboard()
            .url('🔗 Open Tonkeeper to Pay', `ton://transfer/${address}?amount=${nanoTon}`).row()
            .text('✅ Confirm Transfer', `withdraw_${tx.id}`).row()
            .text('❌ Reject & Refund', `reject_${tx.id}`);
            
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
          .select('ton_balance, ton_deposited, username')
          .eq('telegram_id', user.id)
          .single();
          
        const newBalance = Number(dbUser?.ton_balance || 0) + amount;
        const newDeposited = Number(dbUser?.ton_deposited || 0) + amount;

        // 1. Add balance & total deposited
        await supabase.from('users').update({ ton_balance: newBalance, ton_deposited: newDeposited }).eq('telegram_id', user.id);

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
             const text = `📥 *NEW DEPOSIT (AUTO)*\nUser: ${usernameStr}\nAmount: *${amount} TON*\nWallet: \`${address}\``;
             await bot.api.sendMessage(adminChatId, text, { parse_mode: 'Markdown' });
          }
          
          if (publicChannelId) {
             const textPub = `🚀 ${usernameStr} just successfully deposited *${amount} TON* to hunt for World Cup tickets! 🏆`;
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
