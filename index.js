const fs = require('fs');
const path = require('path');
const https = require('https');

// Static file registry with literal path.join so Vercel's bundler traces and packages every asset
const STATIC_FILES = {
  '/': { file: path.join(__dirname, 'index.html'), type: 'text/html; charset=UTF-8' },
  '/index.html': { file: path.join(__dirname, 'index.html'), type: 'text/html; charset=UTF-8' },
  '/styles.css': { file: path.join(__dirname, 'styles.css'), type: 'text/css; charset=UTF-8' },
  '/dashboard.js': { file: path.join(__dirname, 'dashboard.js'), type: 'text/javascript; charset=UTF-8' },
  '/overlay.html': { file: path.join(__dirname, 'overlay.html'), type: 'text/html; charset=UTF-8' },
  '/overlay.js': { file: path.join(__dirname, 'overlay.js'), type: 'text/javascript; charset=UTF-8' },
  '/sound-effects.js': { file: path.join(__dirname, 'sound-effects.js'), type: 'text/javascript; charset=UTF-8' },
  '/tts-engine.js': { file: path.join(__dirname, 'tts-engine.js'), type: 'text/javascript; charset=UTF-8' },
  '/youtube-poller.js': { file: path.join(__dirname, 'youtube-poller.js'), type: 'text/javascript; charset=UTF-8' }
};

// In-memory cache for ultra fast delivery
const fileCache = new Map();

// Built-in YouTube Proxy to bypass Browser CORS
function proxyYouTube(req, res, targetUrl) {
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
}

module.exports = (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Range');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = parsedUrl.pathname;

  // 1. Route API TTS
  if (pathname === '/api/tts') {
    try {
      const ttsHandler = require('./api/tts.js');
      return ttsHandler(req, res);
    } catch (err) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: err.message }));
      return;
    }
  }

  // 1b. Route API YouTube Proxy (Bypasses Browser CORS)
  if (pathname === '/api/youtube') {
    const targetUrl = parsedUrl.searchParams.get('url') || '';
    if (!targetUrl || !targetUrl.startsWith('https://www.googleapis.com/youtube/v3/')) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Parameter url valid diperlukan (hanya googleapis.com/youtube/v3/)' }));
      return;
    }
    return proxyYouTube(req, res, targetUrl);
  }

  // 2. Serve Static File from Registry
  const asset = STATIC_FILES[pathname];
  if (asset) {
    if (fileCache.has(pathname)) {
      const cached = fileCache.get(pathname);
      res.statusCode = 200;
      res.setHeader('Content-Type', asset.type);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.end(cached);
      return;
    }

    try {
      if (fs.existsSync(asset.file)) {
        const content = fs.readFileSync(asset.file);
        fileCache.set(pathname, content);
        res.statusCode = 200;
        res.setHeader('Content-Type', asset.type);
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.end(content);
        return;
      }
    } catch (e) {
      console.warn('Read error:', e);
    }
  }

  // Fallback 404
  res.statusCode = 404;
  res.setHeader('Content-Type', 'text/plain');
  res.end(`404 Not Found: ${pathname}`);
};
