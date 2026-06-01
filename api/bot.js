import { createClient } from '@supabase/supabase-js';

const token = process.env.TELEGRAM_BOT_TOKEN;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const db = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
const adminChatId = process.env.ADMIN_CHAT_ID?.trim();
const publicChannelId = process.env.PUBLIC_CHANNEL_ID?.trim();

async function telegramAPI(method, payload) {
  if (!token) return;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (err) {
    console.error(`Telegram API error (${method}):`, err);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).send('Bot Webhook Endpoint Active');

  const update = req.body;
  if (!update) return res.status(200).send('OK');

  try {
    // 1. Handle Commands (e.g. /ping, /start)
    if (update.message && update.message.text) {
      const text = update.message.text;
      const chatId = update.message.chat.id;

      if (text.startsWith('/ping')) {
        await telegramAPI('sendMessage', {
          chat_id: chatId,
          text: 'Pong! Webhook is working perfectly via Native Fetch.'
        });
      }
      else if (text.startsWith('/start')) {
        const appUrl = process.env.VITE_TELEGRAM_WEBAPP_URL || 'https://worldcup2026.vercel.app';
        const parts = text.split(' ');
        const startParam = parts.length > 1 ? parts[1] : null;
        const finalUrl = startParam ? `${appUrl}?startapp=${startParam}` : appUrl;
        
        await telegramAPI('sendMessage', {
          chat_id: chatId,
          text: `Welcome to World Cup Mining War 2026! ⚽🏆\n\nTap, mine votes, collect star NFTs, and predict the world cup matches to become the ultimate fan!`,
          reply_markup: {
            inline_keyboard: [
              [{ text: 'PLAY NOW 🎮', web_app: { url: finalUrl } }]
            ]
          }
        });
      }
      else if (text.startsWith('/help')) {
        await telegramAPI('sendMessage', {
          chat_id: chatId,
          text: 'This is the World Cup Mining War 2026 bot. Tap "Play Now" to launch the mini app!'
        });
      }
      return res.status(200).send('OK');
    }

    // 2. Handle Callback Queries (Buttons)
    if (update.callback_query) {
      const cb = update.callback_query;
      const cbData = cb.data;
      
      // Debug log via telegram
      if (adminChatId) {
        await telegramAPI('sendMessage', { chat_id: adminChatId, text: `[DEBUG] Native Webhook triggered! Action: ${cbData}` });
      }

      if (!db) {
        await telegramAPI('answerCallbackQuery', { callback_query_id: cb.id, text: 'DB not configured', show_alert: true });
        return res.status(200).send('OK');
      }

      if (cbData.startsWith('withdraw_')) {
        const txId = cbData.replace('withdraw_', '');
        
        const { data: tx, error: txErr } = await db.from('wallet_transactions').select('*').eq('id', txId).single();
        if (txErr || !tx) {
           await telegramAPI('answerCallbackQuery', { callback_query_id: cb.id, text: 'Transaction not found', show_alert: true });
           return res.status(200).send('OK');
        }
        if (tx.status !== 'pending') {
           await telegramAPI('answerCallbackQuery', { callback_query_id: cb.id, text: 'Already processed', show_alert: true });
           return res.status(200).send('OK');
        }

        // Update DB
        await db.from('wallet_transactions').update({ status: 'completed' }).eq('id', txId);

        // Notify Public Channel
        const { data: txUser } = await db.from('users').select('username').eq('telegram_id', tx.user_id).single();
        const displayName = txUser?.username ? `@${txUser.username}` : `User ${tx.user_id}`;
        
        if (publicChannelId) {
          await telegramAPI('sendMessage', {
            chat_id: publicChannelId,
            text: `💸 Congratulations to ${displayName} for successfully withdrawing *${tx.amount_ton} TON*!`,
            parse_mode: 'Markdown'
          });
        }

        // Answer callback & Delete message
        await telegramAPI('answerCallbackQuery', { callback_query_id: cb.id, text: '✅ Withdrawal Approved!', show_alert: true });
        if (cb.message) {
          await telegramAPI('deleteMessage', { chat_id: cb.message.chat.id, message_id: cb.message.message_id });
        }
      }
      else if (cbData.startsWith('reject_')) {
        const txId = cbData.replace('reject_', '');
        
        const { data: tx, error: txErr } = await db.from('wallet_transactions').select('*').eq('id', txId).single();
        if (txErr || !tx) {
           await telegramAPI('answerCallbackQuery', { callback_query_id: cb.id, text: 'Transaction not found', show_alert: true });
           return res.status(200).send('OK');
        }
        if (tx.status !== 'pending') {
           await telegramAPI('answerCallbackQuery', { callback_query_id: cb.id, text: 'Already processed', show_alert: true });
           return res.status(200).send('OK');
        }

        // Refund
        const { data: refundUser } = await db.from('users').select('ton_balance').eq('telegram_id', tx.user_id).single();
        if (refundUser) {
          await db.from('users').update({ ton_balance: (refundUser.ton_balance || 0) + tx.amount_ton }).eq('telegram_id', tx.user_id);
        }

        // Update DB
        await db.from('wallet_transactions').update({ status: 'rejected' }).eq('id', txId);

        // Answer callback & Delete message
        await telegramAPI('answerCallbackQuery', { callback_query_id: cb.id, text: '❌ Rejected & Refunded!', show_alert: true });
        if (cb.message) {
          await telegramAPI('deleteMessage', { chat_id: cb.message.chat.id, message_id: cb.message.message_id });
        }
      }
      else {
        await telegramAPI('answerCallbackQuery', { callback_query_id: cb.id, text: 'Unknown action', show_alert: true });
      }
    }

  } catch (err) {
    console.error('Webhook processing error:', err);
  }

  return res.status(200).send('OK');
}
