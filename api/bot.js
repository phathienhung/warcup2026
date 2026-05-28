import { Bot } from 'grammy';

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
