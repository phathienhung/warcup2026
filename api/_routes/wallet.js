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
        const todayStr = new Date().toISOString().split('T')[0];
        const { data: result, error: rpcError } = await supabase.rpc('request_withdrawal', {
          p_user_id: user.id,
          p_amount: amount,
          p_wallet_address: address,
          p_today_str: todayStr
        });

        if (rpcError) throw rpcError;

        if (!result.success) {
          return res.status(400).json({ error: result.error });
        }

        // Send to Admin Chat
        if (bot && adminChatId) {
          const { data: dbUser } = await supabase.from('users').select('username').eq('telegram_id', user.id).single();
          const usernameStr = dbUser?.username ? `@${dbUser.username}` : `ID: ${user.id}`;
          const text = `📤 *WITHDRAW REQUEST*\nUser: ${usernameStr}\nAmount: *${amount} TON*\nWallet: \`${address}\``;
          
          const nanoTon = Math.floor(amount * 1e9);
          const keyboard = new InlineKeyboard()
            .url('🔗 Open Tonkeeper to Pay', `ton://transfer/${address}?amount=${nanoTon}`).row()
            .text('✅ Confirm Transfer', `withdraw_${result.transaction_id}`).row()
            .text('❌ Reject & Refund', `reject_${result.transaction_id}`);
            
          await bot.api.sendMessage(adminChatId, text, { parse_mode: 'Markdown', reply_markup: keyboard });
        }

        return res.status(200).json({ success: true, newBalance: result.newBalance });

      } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }

    if (action === 'deposit') {
      try {
        // Automatic Deposit Approval MVP
        const { tx_hash } = req.body;
        if (!tx_hash) {
          return res.status(400).json({ error: 'Missing transaction hash' });
        }

        const { data: result, error: rpcError } = await supabase.rpc('deposit_ton', {
          p_user_id: user.id,
          p_tx_hash: tx_hash,
          p_amount: amount,
          p_wallet_address: address
        });

        if (rpcError) throw rpcError;

        if (!result.success) {
          return res.status(400).json({ error: result.error });
        }

        // 3. Notify Admin & Public
        if (bot) {
          const { data: dbUser } = await supabase.from('users').select('username').eq('telegram_id', user.id).single();
          const usernameStr = dbUser?.username ? `@${dbUser.username}` : `ID: ${user.id}`;
          
          if (adminChatId) {
             const text = `📥 *NEW DEPOSIT*\nUser: ${usernameStr}\nAmount: *${amount} TON*\nWallet: \`${address}\`\nHash: \`${tx_hash.substring(0, 16)}...\``;
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
