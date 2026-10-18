const https = require('https');

module.exports = async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Range');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  // Extract target URL from query
  let targetUrl = '';
  if (req.query && req.query.url) {
    targetUrl = req.query.url;
  } else if (req.url) {
    try {
      const parsed = new URL(req.url, 'http://localhost');
      targetUrl = parsed.searchParams.get('url') || '';
    } catch (e) {}
  }

  if (!targetUrl || !targetUrl.startsWith('https://www.googleapis.com/youtube/v3/')) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Parameter url valid diperlukan (hanya googleapis.com/youtube/v3/)' }));
    return;
  }

  // Forward authorization header if present
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  };
  if (req.headers && req.headers.authorization) {
    headers['Authorization'] = req.headers.authorization;
  }

  https.get(targetUrl, { headers }, (apiRes) => {
    res.statusCode = apiRes.statusCode;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    apiRes.pipe(res);
  }).on('error', (err) => {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: err.message }));
  });
};
