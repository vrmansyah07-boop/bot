/**
 * TTSEngine - Streaming Text-to-Speech Manager
 * Supports:
 * 1. Natural Human Indonesian Voice (Server Audio MP3 via Google Cloud Model)
 * 2. Web Speech API (Microsoft Gadis/Ardi Natural & browser voices)
 * 3. Indonesian Slang & Streamer Acronyms Normalizer (Kamus Gaul Streamer)
 */
class TTSEngine {
  constructor() {
    this.synth = window.speechSynthesis;
    this.voices = [];
    this.selectedEngine = 'natural-indonesia'; // 'natural-indonesia' | 'browser-speech'
    this.selectedVoiceURI = null;
    
    this.rate = 1.0;
    this.pitch = 1.0;
    this.volume = 1.0;
    this.template = 'Dari {author}, {message}';
    this.enabled = true;
    
    this.queue = [];
    this.isSpeaking = false;
    this.currentAudio = null;

    this.onStatusChange = null;
    this.onSpeakStart = null;
    this.onSpeakEnd = null;

    this.filterProfanity = true;
    this.maxCharLength = 140;

    this.badWords = [
      'anjing', 'babi', 'bangsat', 'kontol', 'memek', 'jembut', 
      'pantek', 'ngentot', 'tai', 'tolol', 'goblok', 'idiot', 'puki'
    ];

    // Slang Dictionary for Natural Spoken Indonesian
    this.slangDictionary = [
      { r: /\byg\b|\byng\b/gi, v: 'yang' },
      { r: /\bbgt\b/gi, v: 'banget' },
      { r: /\bsdh\b|\budh\b|\buda\b/gi, v: 'udah' },
      { r: /\bblm\b|\bblom\b/gi, v: 'belum' },
      { r: /\bkpn\b/gi, v: 'kapan' },
      { r: /\bdgn\b/gi, v: 'dengan' },
      { r: /\bbs\b/gi, v: 'bisa' },
      { r: /\bkrn\b/gi, v: 'karena' },
      { r: /\btp\b|\btpi\b/gi, v: 'tapi' },
      { r: /\bsy\b/gi, v: 'saya' },
      { r: /\bsm\b/gi, v: 'sama' },
      { r: /\btrs\b|\btrus\b/gi, v: 'terus' },
      { r: /\bskrg\b|\bskrng\b/gi, v: 'sekarang' },
      { r: /\bbkn\b/gi, v: 'bukan' },
      { r: /\bjgn\b|\bjngn\b/gi, v: 'jangan' },
      { r: /\bbgtu\b/gi, v: 'begitu' },
      { r: /\bmabar\b/gi, v: 'main bareng' },
      { r: /\bgg\b|\bggwp\b/gi, v: 'gege' },
      { r: /\bez\b/gi, v: 'izi' },
      { r: /\bnt\b/gi, v: 'nais trai' },
      { r: /\bgpp\b/gi, v: 'nggak apa-apa' },
      { r: /\bga\b|\bgak\b|\bngga\b|\bnggak\b/gi, v: 'nggak' },
      { r: /\bthx\b|\bty\b/gi, v: 'makasih' },
      { r: /\bpls\b|\bplis\b/gi, v: 'tolong' },
      { r: /\bjir\b|\bbjir\b|\banjir\b/gi, v: 'anjir' },
      { r: /\bafk\b/gi, v: 'a ef ka' },
      { r: /\bhp\b/gi, v: 'ha pe' },
      { r: /\botw\b/gi, v: 'on the way' },
      { r: /\bp+\b/gi, v: 'halo' },
      { r: /(.)\1{2,}/g, v: '$1$1' }, // shorten duplicated chars like 'halo banggggg' -> 'halo bang'
      { r: /(wk){2,}/gi, v: 'wkwk' },
      { r: /(ha){2,}/gi, v: 'haha' }
    ];

    this.initVoices();
  }

  initVoices() {
    if (!this.synth) return;

    const populate = () => {
      this.voices = this.synth.getVoices();
      if (this.onStatusChange) {
        this.onStatusChange('voices-loaded', this.voices);
      }
    };

    populate();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = populate;
    }
  }

  getVoices() {
    return this.voices;
  }

  setEngine(engineType) {
    this.selectedEngine = engineType;
  }

  setVoice(voiceURI) {
    this.selectedVoiceURI = voiceURI;
  }

  setTemplate(templateStr) {
    this.template = templateStr || 'Dari {author}, {message}';
  }

  setProfanityFilter(enabled, customList = null) {
    this.filterProfanity = enabled;
    if (Array.isArray(customList)) {
      this.badWords = customList.map(w => w.trim().toLowerCase()).filter(Boolean);
    }
  }

  normalizeForNaturalSpeech(text) {
    if (!text) return '';

    let clean = ' ' + text + ' ';

    // Replace URLs
    clean = clean.replace(/https?:\/\/\S+/gi, 'tautan');

    // Profanity Filter
    if (this.filterProfanity && this.badWords.length > 0) {
      for (const word of this.badWords) {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        clean = clean.replace(regex, 'sensor');
      }
    }

    // Apply Slang Dictionary for natural Indonesian pronunciation
    this.slangDictionary.forEach(({ r, v }) => {
      clean = clean.replace(r, v);
    });

    clean = clean.trim();

    // Length limit
    if (clean.length > this.maxCharLength) {
      clean = clean.substring(0, this.maxCharLength) + ', dan seterusnya';
    }

    return clean;
  }

  formatMessage(author, message) {
    const safeAuthor = (author || 'Penonton')
      .replace(/[^\w\s\u00C0-\u024F\u1E00-\u1EFF]/gi, '')
      .trim() || 'Penonton';

    const naturalMsg = this.normalizeForNaturalSpeech(message);
    if (!naturalMsg) return '';

    let formatted = this.template
      .replace(/\{author\}/gi, safeAuthor)
      .replace(/\{name\}/gi, safeAuthor)
      .replace(/\{message\}/gi, naturalMsg)
      .replace(/\{chat\}/gi, naturalMsg);

    return formatted;
  }

  enqueue(author, message, rawChatData = {}) {
    if (!this.enabled) return;

    const speechText = this.formatMessage(author, message);
    if (!speechText) return;

    const queueItem = {
      id: rawChatData.id || `chat_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      author,
      rawMessage: message,
      speechText,
      chatData: rawChatData,
      time: Date.now()
    };

    this.queue.push(queueItem);
    if (this.onStatusChange) this.onStatusChange('queue-update', { count: this.queue.length });

    this.processQueue();
  }

  processQueue() {
    if (this.isSpeaking || this.queue.length === 0) return;

    const item = this.queue.shift();
    this.isSpeaking = true;

    if (this.onStatusChange) this.onStatusChange('queue-update', { count: this.queue.length });
    if (this.onSpeakStart) this.onSpeakStart(item);

    // ROUTE 1: Natural Human Indonesian Audio (Default & Most Realistic)
    if (this.selectedEngine === 'natural-indonesia') {
      this.playNaturalAudio(item);
    } else {
      // ROUTE 2: Native Web Speech API
      this.playBrowserSpeech(item);
    }
  }

  playNaturalAudio(item) {
    let finished = false;
    let safetyTimer = null;

    const finish = () => {
      if (finished) return;
      finished = true;
      if (safetyTimer) clearTimeout(safetyTimer);
      this.isSpeaking = false;
      this.currentAudio = null;
      if (this.onSpeakEnd) this.onSpeakEnd(item);
      if (this.onStatusChange) this.onStatusChange('idle');
      setTimeout(() => this.processQueue(), 200);
    };

    // Safety timeout: Never let the queue get stuck for more than 8.5 seconds
    safetyTimer = setTimeout(() => {
      if (!finished) {
        console.warn('Natural TTS playback safety timeout');
        finish();
      }
    }, 8500);

    try {
      const ttsUrl = `/api/tts?lang=id&text=${encodeURIComponent(item.speechText)}`;
      let audio = document.getElementById('streamvox-audio-player');
      if (!audio) {
        audio = new Audio();
        audio.id = 'streamvox-audio-player';
        document.body.appendChild(audio);
      }

      this.currentAudio = audio;
      audio.volume = this.volume;

      // Adjust playback rate if user changed speed
      if (this.rate && this.rate !== 1.0) {
        audio.playbackRate = Math.max(0.75, Math.min(1.5, this.rate));
      }

      audio.onended = () => finish();
      audio.onerror = (e) => {
        console.warn('Natural audio fetch failed, falling back to browser speech:', e);
        if (!finished) {
          if (safetyTimer) clearTimeout(safetyTimer);
          this.playBrowserSpeech(item);
        }
      };

      audio.src = ttsUrl;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Audio play prevented or interrupted:', err);
          if (!finished) {
            if (safetyTimer) clearTimeout(safetyTimer);
            this.playBrowserSpeech(item);
          }
        });
      }
    } catch (err) {
      console.warn('Natural audio error:', err);
      if (!finished) {
        if (safetyTimer) clearTimeout(safetyTimer);
        this.playBrowserSpeech(item);
      }
    }
  }

  playBrowserSpeech(item) {
    if (!this.synth) {
      this.isSpeaking = false;
      return;
    }

    let finished = false;
    let safetyTimer = null;

    const finish = () => {
      if (finished) return;
      finished = true;
      if (safetyTimer) clearTimeout(safetyTimer);
      this.isSpeaking = false;
      if (this.onSpeakEnd) this.onSpeakEnd(item);
      if (this.onStatusChange) this.onStatusChange('idle');
      setTimeout(() => this.processQueue(), 200);
    };

    // Clean any stuck speech in browser
    try {
      this.synth.cancel();
    } catch (e) {}

    safetyTimer = setTimeout(() => {
      if (!finished) {
        console.warn('Browser Speech timeout safety triggered');
        try { this.synth.cancel(); } catch (e) {}
        finish();
      }
    }, 7000);

    try {
      const utterance = new SpeechSynthesisUtterance(item.speechText);
      utterance.rate = this.rate;
      utterance.pitch = this.pitch;
      utterance.volume = this.volume;

      if (this.selectedVoiceURI) {
        const chosen = this.voices.find(v => v.voiceURI === this.selectedVoiceURI);
        if (chosen) utterance.voice = chosen;
      } else {
        // Auto pick Indonesian natural voice if available
        const naturalVoice = this.voices.find(v => 
          (v.name.includes('Natural') || v.name.includes('Online')) && 
          (v.lang.includes('id') || v.lang.includes('ID'))
        ) || this.voices.find(v => v.lang.toLowerCase().includes('id'));
        
        if (naturalVoice) utterance.voice = naturalVoice;
      }

      utterance.onend = () => finish();
      utterance.onerror = (e) => {
        console.warn('Browser speech utterance error:', e);
        finish();
      };

      this.synth.speak(utterance);
    } catch (err) {
      console.warn('Browser speech speak exception:', err);
      finish();
    }
  }

  stop() {
    this.queue = [];
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch (e) {}
      this.currentAudio = null;
    }
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch (e) {}
    }
    this.isSpeaking = false;
    if (this.onStatusChange) this.onStatusChange('stopped', { count: 0 });
  }

  unlock() {
    // Satisfy browser autoplay restriction safely without breaking SpeechSynthesis queue
    try {
      const audioEl = document.getElementById('streamvox-audio-player');
      if (audioEl) {
        audioEl.play().catch(() => {});
      }
    } catch (e) {}

    if (this.synth) {
      try {
        this.synth.cancel();
      } catch (e) {}
    }
  }
}

if (typeof window !== 'undefined') {
  window.TTSEngine = TTSEngine;
}
