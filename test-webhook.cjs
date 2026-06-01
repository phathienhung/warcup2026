const https = require('https');

const data = JSON.stringify({
  update_id: 10000,
  message: {
    message_id: 1,
    from: { id: 1597337885, is_bot: false, first_name: "Test" },
    chat: { id: 1597337885, type: "private" },
    date: Math.floor(Date.now() / 1000),
    text: "/ping"
  }
});

const options = {
  hostname: 'warcup2026.vercel.app',
  port: 443,
  path: '/api/bot',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, res => {
  console.log(`statusCode: ${res.statusCode}`);
  res.on('data', d => {
    process.stdout.write(d);
  });
});

req.on('error', error => {
  console.error(error);
});

req.write(data);
req.end();
