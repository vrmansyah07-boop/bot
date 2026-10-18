const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3030;
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'text/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg'
};

// In-memory cache for generated TTS audio to guarantee ultra-fast response
const ttsCache = new Map();

function fetchGoogleTtsChunk(text, lang = 'id') {
  return new Promise((resolve, reject) => {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${encodeURIComponent(lang)}&client=tw-ob&q=${encodeURIComponent(text)}`;
    
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Google TTS status code: ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

async function handleTtsRequest(req, res, parsedUrl) {
  const text = (parsedUrl.searchParams.get('text') || '').trim();
  const lang = (parsedUrl.searchParams.get('lang') || 'id').trim();

  if (!text) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Parameter text diperlukan' }));
    return;
  }

  const cacheKey = `${lang}:${text}`;
  if (ttsCache.has(cacheKey)) {
    const cachedBuffer = ttsCache.get(cacheKey);
    res.writeHead(200, {
      'Content-Type': 'audio/mpeg',
      'Content-Length': cachedBuffer.length,
      'Cache-Control': 'public, max-age=86400'
    });
    res.end(cachedBuffer);
    return;
  }

  try {
    // Google TTS limit is ~180 chars. Split text if needed by punctuation or spaces.
    let textParts = [];
    if (text.length > 160) {
      const sentences = text.match(/[^.!?,\n]+[.!?,\n]*|\S+/g) || [text];
      let current = '';
      for (const s of sentences) {
        if ((current + ' ' + s).length > 150) {
          if (current.trim()) textParts.push(current.trim());
          current = s;
        } else {
          current = (current + ' ' + s).trim();
        }
      }
      if (current.trim()) textParts.push(current.trim());
    } else {
      textParts = [text];
    }

    const buffers = [];
    for (const part of textParts) {
      const buf = await fetchGoogleTtsChunk(part, lang);
      buffers.push(buf);
    }

    const finalBuffer = Buffer.concat(buffers);

    // Keep cache size bounded
    if (ttsCache.size > 500) {
      const firstKey = ttsCache.keys().next().value;
      ttsCache.delete(firstKey);
    }
    ttsCache.set(cacheKey, finalBuffer);

    res.writeHead(200, {
      'Content-Type': 'audio/mpeg',
      'Content-Length': finalBuffer.length,
      'Cache-Control': 'public, max-age=86400'
    });
    res.end(finalBuffer);

  } catch (err) {
    console.error('Error generating TTS:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
}

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Parse URL
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  let pathname = parsedUrl.pathname;

  // Dedicated Natural TTS API Route
  if (pathname === '/api/tts') {
    handleTtsRequest(req, res, parsedUrl);
    return;
  }

  if (pathname === '/') {
    pathname = '/index.html';
  }

  const safePath = path.normalize(path.join(PUBLIC_DIR, pathname));

  // Security check to avoid path traversal
  if (!safePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(safePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end(`404 Not Found: ${pathname}`);
      return;
    }

    const ext = path.extname(safePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });

    const readStream = fs.createReadStream(safePath);
    readStream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log('========================================================');
  console.log('  🚀 STREAMVOX YT - YouTube LiveChat Alert & TTS Studio');
  console.log('  🎙️ Suara Natural Indonesia (Human-like) Aktif!');
  console.log('========================================================');
  console.log(`  🎮 Dashboard Kontrol Streamer: http://localhost:${PORT}/`);
  console.log(`  🎥 OBS Studio Browser Source:  http://localhost:${PORT}/overlay.html`);
  console.log('========================================================');
  console.log('  Tekan Ctrl+C untuk menghentikan server.');
});
