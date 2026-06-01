import { Bot } from 'grammy';
import { createClient } from '@supabase/supabase-js';

const token = process.env.TELEGRAM_BOT_TOKEN;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const db = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

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
  
  bot.on('pre_checkout_query', (ctx) => ctx.answerPreCheckoutQuery(true));
  bot.on('message:successful_payment', async (ctx) => {
    await ctx.reply('Thank you for your purchase! The items have been added to your account.');
  });
  
  // Handle Admin button clicks (Confirm / Reject withdraw)
  bot.on('callback_query:data', async (ctx) => {
    const cbData = ctx.callbackQuery.data;
    console.log('[BOT] callback_query received:', cbData, 'from:', ctx.from?.id);

    if (!db) {
      console.error('[BOT] No database connection');
      return ctx.answerCallbackQuery({ text: 'DB not configured', show_alert: true });
    }

    try {
      // ── APPROVE WITHDRAW ──
      if (cbData.startsWith('withdraw_')) {
        const txId = cbData.replace('withdraw_', '');
        console.log('[BOT] Processing withdraw approval for tx:', txId);

        // 1. Get transaction
        const { data: tx, error: txErr } = await db
          .from('wallet_transactions')
          .select('*')
          .eq('id', txId)
          .single();

        console.log('[BOT] tx lookup result:', tx ? tx.id : 'null', 'error:', txErr?.message);

        if (txErr || !tx) {
          return ctx.answerCallbackQuery({ text: 'Transaction not found', show_alert: true });
        }
        if (tx.status !== 'pending') {
          return ctx.answerCallbackQuery({ text: 'Already processed', show_alert: true });
        }

        // 2. Mark as completed
        const { error: updateErr } = await db
          .from('wallet_transactions')
          .update({ status: 'completed' })
          .eq('id', txId);

        if (updateErr) {
          console.error('[BOT] update error:', updateErr.message);
          return ctx.answerCallbackQuery({ text: 'DB update failed', show_alert: true });
        }

        // 3. Get username for public message
        const { data: txUser } = await db
          .from('users')
          .select('username')
          .eq('telegram_id', tx.user_id)
          .single();

        const displayName = txUser?.username ? `@${txUser.username}` : `User ${tx.user_id}`;

        // 4. Post to public channel
        const publicChannelId = process.env.PUBLIC_CHANNEL_ID;
        if (publicChannelId) {
          try {
            await bot.api.sendMessage(
              publicChannelId,
              `💸 Congratulations to ${displayName} for successfully withdrawing *${tx.amount_ton} TON*!`,
              { parse_mode: 'Markdown' }
            );
          } catch (chErr) {
            console.error('[BOT] channel post error:', chErr.message);
          }
        }

        // 5. Delete admin message
        try { await ctx.deleteMessage(); } catch (e) { /* ignore */ }

        return ctx.answerCallbackQuery({ text: '✅ Withdrawal Approved!', show_alert: true });
      }

      // ── REJECT WITHDRAW ──
      if (cbData.startsWith('reject_')) {
        const txId = cbData.replace('reject_', '');
        console.log('[BOT] Processing reject for tx:', txId);

        const { data: tx, error: txErr } = await db
          .from('wallet_transactions')
          .select('*')
          .eq('id', txId)
          .single();

        if (txErr || !tx) {
          return ctx.answerCallbackQuery({ text: 'Transaction not found', show_alert: true });
        }
        if (tx.status !== 'pending') {
          return ctx.answerCallbackQuery({ text: 'Already processed', show_alert: true });
        }

        // Refund user balance
        const { data: refundUser } = await db
          .from('users')
          .select('ton_balance')
          .eq('telegram_id', tx.user_id)
          .single();

        if (refundUser) {
          await db
            .from('users')
            .update({ ton_balance: (refundUser.ton_balance || 0) + tx.amount_ton })
            .eq('telegram_id', tx.user_id);
        }

        // Mark as rejected
        await db
          .from('wallet_transactions')
          .update({ status: 'rejected' })
          .eq('id', txId);

        // Delete admin message
        try { await ctx.deleteMessage(); } catch (e) { /* ignore */ }

        return ctx.answerCallbackQuery({ text: '❌ Rejected & Refunded!', show_alert: true });
      }

      return ctx.answerCallbackQuery({ text: 'Unknown action', show_alert: true });

    } catch (e) {
      console.error('[BOT] callback error:', e);
      return ctx.answerCallbackQuery({ text: `Error: ${e.message?.slice(0, 50)}`, show_alert: true });
    }
  });
}

export default async function handler(req, res) {
  if (req.method === 'POST') {
    if (!bot) return res.status(500).send('Bot not configured');
    try {
      console.log('[BOT] Incoming update:', JSON.stringify(req.body).slice(0, 200));
      await bot.handleUpdate(req.body);
      return res.status(200).send('OK');
    } catch (err) {
      console.error('[BOT] handleUpdate error:', err);
      return res.status(200).send('OK'); // Always return 200 to Telegram
    }
  }
  return res.status(200).send('Bot Webhook Endpoint');
}
