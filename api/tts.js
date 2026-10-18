const https = require('https');

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

module.exports = async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  // Safe parameter extraction (supports both Vercel req.query and native URL parsing)
  let text = '';
  let lang = 'id';

  if (req.query && req.query.text) {
    text = req.query.text;
    lang = req.query.lang || 'id';
  } else if (req.url) {
    try {
      const parsedUrl = new URL(req.url, 'http://localhost');
      text = parsedUrl.searchParams.get('text') || '';
      lang = parsedUrl.searchParams.get('lang') || 'id';
    } catch (e) {}
  }

  text = text.trim();
  lang = lang.trim();

  if (!text) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Parameter text diperlukan' }));
    return;
  }

  try {
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

    res.statusCode = 200;
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', finalBuffer.length);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, s-maxage=86400, max-age=86400');
    
    // Support both Vercel helper and native end
    if (typeof res.send === 'function') {
      res.send(finalBuffer);
    } else {
      res.end(finalBuffer);
    }
  } catch (err) {
    console.error('Vercel Serverless TTS error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: err.message }));
  }
};
