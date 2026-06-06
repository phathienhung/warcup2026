import crypto from 'crypto';

export function validateInitData(initData) {
  if (!initData) return null;
  
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    // SECURITY: Never skip validation in production
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
      console.error('TELEGRAM_BOT_TOKEN is not set in production!');
      return null;
    }
    console.warn('TELEGRAM_BOT_TOKEN is not set — dev mode, skipping HMAC validation.');
    const parsed = new URLSearchParams(initData);
    const userStr = parsed.get('user');
    return userStr ? JSON.parse(decodeURIComponent(userStr)) : null;
  }

  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get('hash');
  urlParams.delete('hash');
  
  const dataCheckString = Array.from(urlParams.entries())
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join('\n');
    
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
  const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  
  if (calculatedHash !== hash) {
    return null; // Invalid signature
  }

  // Check auth_date (prevent replay attacks, e.g. 24h limit)
  const authDate = parseInt(urlParams.get('auth_date') || '0', 10);
  const now = Math.floor(Date.now() / 1000);
  if (now - authDate > 86400) {
    return null; // Expired
  }

  const userStr = urlParams.get('user');
  if (!userStr) return null;

  return JSON.parse(decodeURIComponent(userStr));
}
