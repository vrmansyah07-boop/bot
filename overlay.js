/**
 * overlay.js - Client script for OBS Studio Browser Source
 */
(function() {
  const params = new URLSearchParams(window.location.search);
  const ttsInOverlay = params.get('tts') === '1' || params.get('tts') === 'true';
  const soundEnabled = params.get('sound') !== '0';
  const displayDuration = parseInt(params.get('duration') || '6500', 10);

  const sfx = new SoundEffects();
  const tts = new TTSEngine();

  const card = document.getElementById('alert-card');
  const avatarEl = document.getElementById('alert-avatar');
  const badgeEl = document.getElementById('alert-badge');
  const tagEl = document.getElementById('alert-tag');
  const usernameEl = document.getElementById('alert-username');
  const bubbleEl = document.getElementById('alert-bubble');
  const obsHint = document.getElementById('obs-hint');

  // Fade out hint after 5s
  setTimeout(() => {
    if (obsHint) obsHint.style.opacity = '0';
  }, 5000);

  // Load saved preferences if available in localStorage
  try {
    const savedConfig = localStorage.getItem('streamvox_config');
    if (savedConfig) {
      const cfg = JSON.parse(savedConfig);
      if (cfg.ttsRate) tts.rate = parseFloat(cfg.ttsRate);
      if (cfg.ttsPitch) tts.pitch = parseFloat(cfg.ttsPitch);
      if (cfg.ttsVolume) tts.volume = parseFloat(cfg.ttsVolume);
      if (cfg.ttsTemplate) tts.setTemplate(cfg.ttsTemplate);
      if (cfg.ttsEngine) tts.setEngine(cfg.ttsEngine);
      if (cfg.selectedVoice) tts.setVoice(cfg.selectedVoice);
      if (cfg.sfxSound) currentSfxSound = cfg.sfxSound;
      if (cfg.sfxVolume) sfx.setVolume(parseFloat(cfg.sfxVolume));
    }
  } catch (e) {
    console.warn('Config load error:', e);
  }

  let currentSfxSound = 'cyber-ding';
  const alertQueue = [];
  let isAlertActive = false;

  function processAlert(data) {
    if (!data) return;

    alertQueue.push(data);
    if (!isAlertActive) {
      showNextAlert();
    }
  }

  function showNextAlert() {
    if (alertQueue.length === 0) {
      isAlertActive = false;
      return;
    }

    isAlertActive = true;
    const item = alertQueue.shift();

    // Setup visual fields
    usernameEl.textContent = item.author || 'Penonton';
    bubbleEl.textContent = item.message || '';

    if (item.avatar) {
      avatarEl.src = item.avatar;
    } else {
      avatarEl.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(item.author || 'User')}`;
    }

    // Role tags & badges
    if (item.isSuperChat) {
      tagEl.textContent = `SUPERCHAT ${item.superChatAmount || ''}`.trim();
      tagEl.className = 'alert-tag tag-superchat';
      badgeEl.textContent = '💎';
    } else if (item.isOwner) {
      tagEl.textContent = 'STREAMER';
      tagEl.className = 'alert-tag';
      badgeEl.textContent = '👑';
    } else if (item.isModerator) {
      tagEl.textContent = 'MODERATOR';
      tagEl.className = 'alert-tag tag-mod';
      badgeEl.textContent = '🛡️';
    } else if (item.isSponsor) {
      tagEl.textContent = 'MEMBER VIP';
      tagEl.className = 'alert-tag tag-member';
      badgeEl.textContent = '⭐';
    } else {
      tagEl.textContent = 'LIVE CHAT';
      tagEl.className = 'alert-tag';
      badgeEl.textContent = '💬';
    }

    // Sound effect
    if (soundEnabled && item.playSfx !== false) {
      try {
        const soundType = item.soundType || currentSfxSound;
        sfx.play(soundType);
      } catch (e) {
        console.warn('SFX error:', e);
      }
    }

    // Trigger visual pop in
    card.classList.remove('closing');
    card.classList.add('active');

    // Handle TTS in overlay if configured
    if (ttsInOverlay && !item.skipVoice) {
      card.classList.add('speaking');
      tts.onSpeakEnd = () => {
        card.classList.remove('speaking');
      };
      tts.enqueue(item.author, item.message, item);
    }

    // Schedule dismiss
    setTimeout(() => {
      card.classList.add('closing');
      setTimeout(() => {
        card.classList.remove('active');
        card.classList.remove('closing');
        card.classList.remove('speaking');

        // Small pause between alerts
        setTimeout(() => {
          showNextAlert();
        }, 300);
      }, 450);
    }, displayDuration);
  }

  // Cross-tab Synchronization via BroadcastChannel
  if (typeof BroadcastChannel !== 'undefined') {
    const channel = new BroadcastChannel('yt_stream_alerts');
    channel.onmessage = (event) => {
      if (event.data && event.data.type === 'NEW_CHAT_ALERT') {
        processAlert(event.data.payload);
      } else if (event.data && event.data.type === 'CONFIG_UPDATE') {
        const cfg = event.data.payload;
        if (cfg.ttsRate) tts.rate = parseFloat(cfg.ttsRate);
        if (cfg.ttsPitch) tts.pitch = parseFloat(cfg.ttsPitch);
        if (cfg.ttsVolume) tts.volume = parseFloat(cfg.ttsVolume);
        if (cfg.ttsTemplate) tts.setTemplate(cfg.ttsTemplate);
        if (cfg.ttsEngine) tts.setEngine(cfg.ttsEngine);
        if (cfg.selectedVoice) tts.setVoice(cfg.selectedVoice);
        if (cfg.sfxSound) currentSfxSound = cfg.sfxSound;
        if (cfg.sfxVolume) sfx.setVolume(parseFloat(cfg.sfxVolume));
      }
    };
  }

  // Storage fallback for older OBS browser source versions
  window.addEventListener('storage', (e) => {
    if (e.key === 'yt_stream_latest_alert' && e.newValue) {
      try {
        const alertData = JSON.parse(e.newValue);
        processAlert(alertData);
      } catch (err) {}
    }
  });

  // Standalone Direct YouTube Polling Mode (for Vercel Online OBS setup)
  const directVideoId = params.get('v') || params.get('videoId') || params.get('video');
  const directApiKey = params.get('key') || params.get('apiKey');

  if (directVideoId && directApiKey && typeof YouTubePoller !== 'undefined') {
    const directPoller = new YouTubePoller();
    if (obsHint) obsHint.textContent = 'Menghubungkan ke YouTube Live...';
    
    directPoller.onNewMessage = (chatItem) => {
      processAlert({
        ...chatItem,
        soundType: params.get('sound') || currentSfxSound,
        playSfx: soundEnabled,
        skipVoice: false
      });
    };

    directPoller.onStatusChange = (status, info) => {
      if (status === 'connected' && obsHint) {
        obsHint.textContent = `Live Terhubung: ${info.title || ''}`;
        setTimeout(() => { if (obsHint) obsHint.style.opacity = '0'; }, 4000);
      }
    };

    directPoller.connect(directApiKey, directVideoId).catch(err => {
      if (obsHint) obsHint.textContent = `Error: ${err.message}`;
    });
  }

  // Enable audio context on any click (if OBS source is interacted with)
  window.addEventListener('click', () => {
    sfx.init();
    tts.unlock();
  });
})();
