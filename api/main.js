import authHandler from './_routes/auth.js';
import userHandler from './_routes/user.js';
import tapHandler from './_routes/tap.js';
import tasksHandler from './_routes/tasks.js';
import leaderboardHandler from './_routes/leaderboard.js';
import predictionHandler from './_routes/prediction.js';
import shopHandler from './_routes/shop.js';
import nftHandler from './_routes/nft.js';
import clanHandler from './_routes/clan.js';
import referralHandler from './_routes/referral.js';
import spinHandler from './_routes/spin.js';
import configHandler from './_routes/config.js';
import walletHandler from './_routes/wallet.js';

export default async function handler(req, res) {
  // CORS Preflight
  if (req.method === 'OPTIONS') return res.status(200).end();

  const route = req.query.route;
  
  switch(route) {
    case 'auth': return authHandler(req, res);
    case 'user': return userHandler(req, res);
    case 'tap': return tapHandler(req, res);
    case 'tasks': return tasksHandler(req, res);
    case 'leaderboard': return leaderboardHandler(req, res);
    case 'prediction': return predictionHandler(req, res);
    case 'shop': return shopHandler(req, res);
    case 'nft': return nftHandler(req, res);
    case 'clan': return clanHandler(req, res);
    case 'referral': return referralHandler(req, res);
    case 'spin': return spinHandler(req, res);
    case 'config': return configHandler(req, res);
    case 'wallet': return walletHandler(req, res);
    default: return res.status(404).json({ error: 'Route not found' });
  }
}
