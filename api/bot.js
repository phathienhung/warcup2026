import { Bot } from 'grammy';
import { supabase } from './_lib/supabase.js';

const token = process.env.TELEGRAM_BOT_TOKEN;

// Create bot without starting polling, so it can handle webhooks
const bot = token ? new Bot(token) : null;

if (bot) {
  bot.command('start', async (ctx) => {
    const startParam = ctx.match;
    const appUrl = process.env.VITE_TELEGRAM_WEBAPP_URL || 'https://worldcup2026.vercel.app';
    const finalUrl = startParam ? `${appUrl}?startapp=${startParam}` : appUrl;
    
    await ctx.reply(
      `Welcome to World Cup Mining War 2026! ⚽🏆\n\nTap, mine votes, collect star NFTs, and predict the world cup matches to become the ultimate fan!`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'PLAY NOW 🎮', web_app: { url: finalUrl } }]
          ]
        }
      }
    );
  });

  bot.command('help', async (ctx) => {
    await ctx.reply('This is the World Cup Mining War 2026 bot. Tap "Play Now" to launch the mini app!');
  });
  
  // Handle successful payments
  bot.on('pre_checkout_query', (ctx) => ctx.answerPreCheckoutQuery(true));
  bot.on('message:successful_payment', async (ctx) => {
    await ctx.reply('Thank you for your purchase! The items have been added to your account.');
  });
  
  // Handle Admin Approvals
  bot.on('callback_query', async (ctx) => {
    const data = ctx.callbackQuery.data;
    if (!data) return ctx.answerCallbackQuery('Unknown action');
    
    const adminChatId = process.env.ADMIN_CHAT_ID?.trim();
    const chatId = ctx.callbackQuery.message?.chat?.id?.toString();
    const fromId = ctx.from?.id?.toString();
    
    if (chatId !== adminChatId && fromId !== adminChatId) {
       return ctx.answerCallbackQuery({ text: 'Unauthorized: Not in Admin Chat', show_alert: true });
    }

    try {
      if (data.startsWith('withdraw_')) {
        const txId = data.replace('withdraw_', '');
        
        // 1. Get Tx
        const { data: tx } = await supabase.from('wallet_transactions').select('*, users(username)').eq('id', txId).single();
        
        if (!tx || tx.status !== 'pending') {
          return ctx.answerCallbackQuery({ text: 'Tx not found or already processed', show_alert: true });
        }

        // 2. Update status
        await supabase.from('wallet_transactions').update({ status: 'completed' }).eq('id', txId);
        
        // 3. Notify Public Channel
        const publicChannelId = process.env.PUBLIC_CHANNEL_ID;
        if (publicChannelId) {
           const usernameStr = tx.users?.username ? `@${tx.users.username}` : `ID: ${tx.user_id}`;
           await bot.api.sendMessage(publicChannelId, `💸 Congratulations to ${usernameStr} for successfully withdrawing *${tx.amount_ton} TON*!`, { parse_mode: 'Markdown' });
        }
        
        // 4. Delete admin message
        await ctx.deleteMessage();
        return ctx.answerCallbackQuery({ text: 'Withdrawal Approved!', show_alert: true });
      }

      if (data.startsWith('reject_')) {
        const txId = data.replace('reject_', '');
        
        const { data: tx } = await supabase.from('wallet_transactions').select('*').eq('id', txId).single();
        
        if (!tx || tx.status !== 'pending') {
          return ctx.answerCallbackQuery({ text: 'Tx not found or already processed', show_alert: true });
        }

        // Refund user balance
        const { data: user } = await supabase.from('users').select('ton_balance').eq('telegram_id', tx.user_id).single();
        if (user) {
          await supabase.from('users').update({ ton_balance: (user.ton_balance || 0) + tx.amount_ton }).eq('telegram_id', tx.user_id);
        }

        // Update tx
        await supabase.from('wallet_transactions').update({ status: 'rejected' }).eq('id', txId);
        
        // Delete message
        await ctx.deleteMessage();
        return ctx.answerCallbackQuery({ text: 'Rejected and Refunded!', show_alert: true });
      }
    } catch (e) {
      console.error(e);
      return ctx.answerCallbackQuery({ text: 'Error processing action', show_alert: true });
    }
  });
}

export default async function handler(req, res) {
  if (req.method === 'POST') {
    if (bot) {
      try {
        await bot.handleUpdate(req.body);
        return res.status(200).send('OK');
      } catch (err) {
        console.error(err);
        return res.status(500).send('Error');
      }
    } else {
      return res.status(500).send('Bot not configured');
    }
  }
  
  return res.status(200).send('Bot Webhook Endpoint');
}
