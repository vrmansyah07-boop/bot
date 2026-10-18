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
    res.status(204).end();
    return;
  }

  const text = (req.query.text || '').trim();
  const lang = (req.query.lang || 'id').trim();

  if (!text) {
    res.status(400).json({ error: 'Parameter text diperlukan' });
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

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', finalBuffer.length);
    res.setHeader('Cache-Control', 'public, s-maxage=86400, max-age=86400');
    res.status(200).send(finalBuffer);
  } catch (err) {
    console.error('Vercel Serverless TTS error:', err);
    res.status(500).json({ error: err.message });
  }
};
