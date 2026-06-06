export default async function handler(req, res) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return res.status(400).send('TELEGRAM_BOT_TOKEN is not set');

  // Automatically determine the Vercel domain
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const url = `${protocol}://${host}/api/bot`;

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(url)}`);
    const data = await response.json();
    
    return res.status(200).json({
      message: 'Webhook updated successfully',
      url: url,
      telegramResponse: data
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
