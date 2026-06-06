import { VercelRequest, VercelResponse } from '@vercel/node';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || '';
const CHANNEL_CHAT_ID = process.env.PUBLIC_CHANNEL_ID || '@warcup2026_withdrawals';
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(200).send('OK');

    // Verify request comes from Telegram
    if (WEBHOOK_SECRET) {
        const secretHeader = req.headers['x-telegram-bot-api-secret-token'];
        if (secretHeader !== WEBHOOK_SECRET) {
            return res.status(403).send('Forbidden');
        }
    }

    const update = req.body;
    
    try {
        // === 1. Handle Callback Query from inline buttons (callback_data) ===
        if (update.callback_query) {
            const cb = update.callback_query;
            const data = cb.data;
            console.log('Callback Query received:', data);
            
            if (data && data.startsWith('DONE_')) {
                const parts = data.split('_');
                const id = parts[1];
                const username = parts[2];
                const amount = parts[3];

                console.log(`Processing withdrawal #${id} for @${username} (Amount: ${amount})`);

                // === Supabase Sync ===
                const supabaseUrl = process.env.SUPABASE_URL || 'https://ewxbxlqjryfuvhlyveqi.supabase.co';
                const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

                if (supabaseKey) {
                    try {
                        // 1. Get Transaction
                        const txRes = await fetch(`${supabaseUrl}/rest/v1/Transaction?id=eq.${id}&select=*`, {
                            headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
                        });
                        const [tx] = await txRes.json();

                        if (tx && tx.status === 'PENDING') {
                            const totalAmount = Number(tx.amount) + Number(tx.fee);
                            
                            // 2. Update Transaction status
                            await fetch(`${supabaseUrl}/rest/v1/Transaction?id=eq.${id}`, {
                                method: 'PATCH',
                                headers: { 
                                    'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`,
                                    'Content-Type': 'application/json', 'Prefer': 'return=representation'
                                },
                                body: JSON.stringify({ status: 'COMPLETED', updatedAt: new Date().toISOString() })
                            });

                            // H-5 FIX: Use RPC for atomic wallet update instead of read-then-write
                            await fetch(`${supabaseUrl}/rest/v1/rpc/complete_webhook_withdrawal`, {
                                method: 'POST',
                                headers: { 
                                    'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`,
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({ 
                                    p_user_id: tx.userId,
                                    p_amount: totalAmount 
                                })
                            });
                        }
                    } catch (dbErr) {
                        console.error('Database sync error in webhook:', dbErr);
                    }
                }

                // 1. Edit Bot message (Need to check whether the bot has edit permission)
                const editRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: ADMIN_CHAT_ID,
                        message_id: cb.message.message_id,
                        text: `✅ <b>PAYMENT CONFIRMED (#${id})</b>\nUser: @${username}\nAmount: <b>${amount} TON</b>\nStatus: <b>SUCCESS</b>`,
                        parse_mode: 'HTML'
                    })
                });
                const editData = await editRes.json();
                console.log('EditMessage result:', JSON.stringify(editData));

                // 2. Send notification to the Channel
                const sendRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: CHANNEL_CHAT_ID,
                        text: `✅ <b>WITHDRAWAL SUCCESSFUL</b>\nUser: @${username}\nAmount: <b>${amount} TON</b>\nStatus: <b>CONFIRMED BY ADMIN</b>`,
                        parse_mode: 'HTML'
                    })
                });
                const sendData = await sendRes.json();
                console.log('SendMessage (Channel) result:', JSON.stringify(sendData));

                // 3. Answer Callback (IMPORTANT: prevents the button from loading forever)
                await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        callback_query_id: cb.id, 
                        text: "Confirmation successful!",
                        show_alert: true 
                    })
                });
            } else {
                console.log('Ignored callback data:', data);
                await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        callback_query_id: cb.id, 
                        text: `Invalid command: ${data}`, 
                        show_alert: true 
                    })
                });
            }
        }

        // === 2. Fallback: Handle /start DONE_xxx (from old URL button) ===
        if (update.message && update.message.text) {
            const text = update.message.text;
            const match = text.match(/^\/start\s+DONE_(\S+)/i);
            if (match) {
                const payload = match[1]; // e.g. "ID_username_amount" or just "ID"
                const chatId = update.message.chat.id;

                // Send confirmation to admin
                await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: `✅ <b>PAYMENT CONFIRMED</b>\nWithdrawal ID: <code>${payload}</code>\nStatus: <b>SUCCESS</b>`,
                        parse_mode: 'HTML'
                    })
                });

                // Send notification to the channel
                await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: CHANNEL_CHAT_ID,
                        text: `✅ <b>WITHDRAWAL SUCCESSFUL</b>\nWithdrawal ID: <code>${payload}</code>\nStatus: <b>CONFIRMED BY ADMIN</b>`,
                        parse_mode: 'HTML'
                    })
                });
            }
        }
    } catch (e) {
        console.error('Webhook error:', e);
    }

    return res.status(200).send('OK');
}