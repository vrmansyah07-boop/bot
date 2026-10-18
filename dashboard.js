/**
 * app.js - Main Streamer Dashboard Controller for StreamVox YT
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- INITIALIZE ENGINES ---
  const sfx = new SoundEffects();
  const tts = new TTSEngine();
  const poller = new YouTubePoller();

  const broadcastChannel = typeof BroadcastChannel !== 'undefined' 
    ? new BroadcastChannel('yt_stream_alerts') 
    : null;

  // --- DOM ELEMENTS ---
  const liveStatusPill = document.getElementById('live-status-pill');
  const liveStatusText = document.getElementById('live-status-text');
  const audioUnlockBanner = document.getElementById('audio-unlock-banner');
  const btnUnlockAudio = document.getElementById('btn-unlock-audio');

  const btnGoogleLogin = document.getElementById('btn-google-login');
  const googleLoginBtnText = document.getElementById('google-login-btn-text');
  const googleProfileBox = document.getElementById('google-profile-box');
  const googleUserAvatar = document.getElementById('google-user-avatar');
  const googleUserName = document.getElementById('google-user-name');
  const btnGoogleLogout = document.getElementById('btn-google-logout');
  const btnRecheckLive = document.getElementById('btn-recheck-live');

  const ytVideoInput = document.getElementById('yt-video-input');
  const ytApiKey = document.getElementById('yt-api-key');
  const btnConnect = document.getElementById('btn-connect');
  const btnSimulation = document.getElementById('btn-simulation');
  const streamInfoBox = document.getElementById('stream-info-box');
  const streamThumb = document.getElementById('stream-thumb');
  const streamTitle = document.getElementById('stream-title');
  const streamChannel = document.getElementById('stream-channel');

  const ttsEngineMode = document.getElementById('tts-engine-mode');
  const groupBrowserVoice = document.getElementById('group-browser-voice');
  const groupPitch = document.getElementById('group-pitch');
  const ttsVoiceSelect = document.getElementById('tts-voice-select');
  const ttsRate = document.getElementById('tts-rate');
  const valRate = document.getElementById('val-rate');
  const ttsPitch = document.getElementById('tts-pitch');
  const valPitch = document.getElementById('val-pitch');
  const ttsVolume = document.getElementById('tts-volume');
  const valVolume = document.getElementById('val-volume');
  const ttsTemplatePreset = document.getElementById('tts-template-preset');
  const btnTestTts = document.getElementById('btn-test-tts');
  const btnPanicStop = document.getElementById('btn-panic-stop');

  const sfxSoundSelect = document.getElementById('sfx-sound-select');
  const btnTestSfx = document.getElementById('btn-test-sfx');
  const alertDuration = document.getElementById('alert-duration');
  const valDuration = document.getElementById('val-duration');
  const ttsLocation = document.getElementById('tts-location');
  const checkBadwords = document.getElementById('check-badwords');

  const btnTestNormal = document.getElementById('btn-test-normal');
  const btnTestMember = document.getElementById('btn-test-member');
  const btnTestMod = document.getElementById('btn-test-mod');
  const btnTestSuper = document.getElementById('btn-test-super');

  const chatFeed = document.getElementById('chat-feed');
  const chatEmpty = document.getElementById('chat-empty');
  const statTotal = document.getElementById('stat-total');
  const statQueue = document.getElementById('stat-queue');
  const statSpeaking = document.getElementById('stat-speaking');
  const btnClearChat = document.getElementById('btn-clear-chat');

  // Modals & Navigation
  const btnOpenOverlay = document.getElementById('btn-open-overlay');
  const btnObsGuide = document.getElementById('btn-obs-guide');
  const btnApiGuide = document.getElementById('btn-api-guide');
  const linkShowApiGuide = document.getElementById('link-show-api-guide');
  const modalObs = document.getElementById('modal-obs');
  const modalApi = document.getElementById('modal-api');
  const btnCloseObsModal = document.getElementById('btn-close-obs-modal');
  const btnDoneObsModal = document.getElementById('btn-done-obs-modal');
  const btnCloseApiModal = document.getElementById('btn-close-api-modal');
  const btnDoneApiModal = document.getElementById('btn-done-api-modal');
  const btnCopyObsUrl = document.getElementById('btn-copy-obs-url');
  const obsSourceUrl = document.getElementById('obs-source-url');

  let totalChatCount = 0;
  let isConnecting = false;

  // --- DYNAMIC OBS URL ---
  const currentHost = window.location.origin || 'http://localhost:3030';
  obsSourceUrl.value = `${currentHost}/overlay.html`;

  // --- AUDIO UNLOCK HANDLER ---
  function unlockAudioEngine() {
    sfx.init();
    tts.unlock();
    if (audioUnlockBanner) {
      audioUnlockBanner.style.display = 'none';
    }
  }

  btnUnlockAudio.addEventListener('click', () => {
    unlockAudioEngine();
    showToast('Suara Audio dan TTS berhasil diaktifkan!', 'success');
  });

  // Also unlock on any first dashboard click
  document.addEventListener('click', () => {
    if (audioUnlockBanner && audioUnlockBanner.style.display !== 'none') {
      unlockAudioEngine();
    }
  }, { once: true });

  // --- LOAD SAVED SETTINGS ---
  function loadSavedConfig() {
    try {
      const savedKey = localStorage.getItem('streamvox_yt_api_key');
      if (savedKey) ytApiKey.value = savedKey;

      const savedVideo = localStorage.getItem('streamvox_yt_video_input');
      if (savedVideo) ytVideoInput.value = savedVideo;

      const savedEngine = localStorage.getItem('streamvox_tts_engine') || 'natural-indonesia';
      ttsEngineMode.value = savedEngine;
      tts.setEngine(savedEngine);
      if (savedEngine === 'browser-speech') {
        groupBrowserVoice.style.display = 'block';
        groupPitch.style.display = 'block';
      } else {
        groupBrowserVoice.style.display = 'none';
        groupPitch.style.display = 'none';
      }

      const savedRate = localStorage.getItem('streamvox_tts_rate');
      if (savedRate) {
        ttsRate.value = savedRate;
        valRate.textContent = `${parseFloat(savedRate).toFixed(2)}x`;
        tts.rate = parseFloat(savedRate);
      }

      const savedPitch = localStorage.getItem('streamvox_tts_pitch');
      if (savedPitch) {
        ttsPitch.value = savedPitch;
        valPitch.textContent = `${parseFloat(savedPitch).toFixed(1)}x`;
        tts.pitch = parseFloat(savedPitch);
      }

      const savedVol = localStorage.getItem('streamvox_tts_volume');
      if (savedVol) {
        ttsVolume.value = savedVol;
        valVolume.textContent = `${Math.round(savedVol * 100)}%`;
        tts.volume = parseFloat(savedVol);
      }

      const savedTemplate = localStorage.getItem('streamvox_tts_template');
      if (savedTemplate) {
        ttsTemplatePreset.value = savedTemplate;
        tts.setTemplate(savedTemplate);
      }

      const savedSfx = localStorage.getItem('streamvox_sfx_sound');
      if (savedSfx) sfxSoundSelect.value = savedSfx;

      const savedDuration = localStorage.getItem('streamvox_alert_duration');
      if (savedDuration) {
        alertDuration.value = savedDuration;
        valDuration.textContent = `${savedDuration} detik`;
      }

      const savedLocation = localStorage.getItem('streamvox_tts_location');
      if (savedLocation) ttsLocation.value = savedLocation;

    } catch (e) {
      console.warn('Error loading localStorage:', e);
    }
  }

  function saveCurrentConfig() {
    try {
      localStorage.setItem('streamvox_yt_api_key', ytApiKey.value);
      localStorage.setItem('streamvox_yt_video_input', ytVideoInput.value);
      localStorage.setItem('streamvox_tts_engine', ttsEngineMode.value);
      localStorage.setItem('streamvox_tts_rate', ttsRate.value);
      localStorage.setItem('streamvox_tts_pitch', ttsPitch.value);
      localStorage.setItem('streamvox_tts_volume', ttsVolume.value);
      localStorage.setItem('streamvox_tts_template', ttsTemplatePreset.value);
      localStorage.setItem('streamvox_sfx_sound', sfxSoundSelect.value);
      localStorage.setItem('streamvox_alert_duration', alertDuration.value);
      localStorage.setItem('streamvox_tts_location', ttsLocation.value);
      localStorage.setItem('streamvox_config', JSON.stringify({
        ttsEngine: ttsEngineMode.value,
        ttsRate: ttsRate.value,
        ttsPitch: ttsPitch.value,
        ttsVolume: ttsVolume.value,
        ttsTemplate: ttsTemplatePreset.value,
        selectedVoice: ttsVoiceSelect.value,
        sfxSound: sfxSoundSelect.value,
        sfxVolume: ttsVolume.value
      }));

      // Broadcast config to overlay
      if (broadcastChannel) {
        broadcastChannel.postMessage({
          type: 'CONFIG_UPDATE',
          payload: {
            ttsEngine: ttsEngineMode.value,
            ttsRate: ttsRate.value,
            ttsPitch: ttsPitch.value,
            ttsVolume: ttsVolume.value,
            ttsTemplate: ttsTemplatePreset.value,
            selectedVoice: ttsVoiceSelect.value,
            sfxSound: sfxSoundSelect.value
          }
        });
      }
    } catch (e) {}
  }

  // --- POPULATE VOICES ---
  function populateVoiceList() {
    const voices = tts.getVoices();
    if (!voices || voices.length === 0) return;

    ttsVoiceSelect.innerHTML = '';

    // Grouping: Indonesian first, then others
    const idVoices = [];
    const otherVoices = [];

    voices.forEach(v => {
      const isIndo = v.lang.toLowerCase().includes('id') || 
                     v.lang.toLowerCase().includes('in') ||
                     v.name.toLowerCase().includes('indonesia');
      if (isIndo) {
        idVoices.push(v);
      } else {
        otherVoices.push(v);
      }
    });

    if (idVoices.length > 0) {
      const groupIndo = document.createElement('optgroup');
      groupIndo.label = '🇮🇩 Bahasa Indonesia (Direkomendasikan)';
      idVoices.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v.voiceURI;
        opt.textContent = `${v.name} (${v.lang})`;
        groupIndo.appendChild(opt);
      });
      ttsVoiceSelect.appendChild(groupIndo);
    }

    const groupOthers = document.createElement('optgroup');
    groupOthers.label = '🌐 Bahasa Lainnya';
    otherVoices.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.voiceURI;
      opt.textContent = `${v.name} (${v.lang})`;
      groupOthers.appendChild(opt);
    });
    ttsVoiceSelect.appendChild(groupOthers);

    // Select chosen or default
    if (tts.selectedVoiceURI) {
      ttsVoiceSelect.value = tts.selectedVoiceURI;
    } else if (idVoices.length > 0) {
      ttsVoiceSelect.value = idVoices[0].voiceURI;
      tts.setVoice(idVoices[0].voiceURI);
    }
  }

  tts.onStatusChange = (status, data) => {
    if (status === 'voices-loaded') {
      populateVoiceList();
    } else if (status === 'queue-update') {
      statQueue.textContent = data.count || 0;
    } else if (status === 'idle') {
      statSpeaking.textContent = 'Siap';
      statSpeaking.style.color = 'var(--accent-green)';
    }
  };

  tts.onSpeakStart = (item) => {
    statSpeaking.textContent = `Membaca: ${item.author}`;
    statSpeaking.style.color = 'var(--primary)';

    // Highlight chat item in feed
    const el = document.getElementById(`feed_${item.id}`);
    if (el) el.classList.add('speaking-now');
  };

  tts.onSpeakEnd = (item) => {
    const el = document.getElementById(`feed_${item.id}`);
    if (el) el.classList.remove('speaking-now');
  };

  // Wait for voices
  setTimeout(populateVoiceList, 400);

  // --- TTS CONTROLS LISTENERS ---
  ttsEngineMode.addEventListener('change', () => {
    tts.setEngine(ttsEngineMode.value);
    if (ttsEngineMode.value === 'browser-speech') {
      groupBrowserVoice.style.display = 'block';
      groupPitch.style.display = 'block';
    } else {
      groupBrowserVoice.style.display = 'none';
      groupPitch.style.display = 'none';
    }
    saveCurrentConfig();
  });

  ttsVoiceSelect.addEventListener('change', () => {
    tts.setVoice(ttsVoiceSelect.value);
    saveCurrentConfig();
  });

  ttsRate.addEventListener('input', () => {
    valRate.textContent = `${parseFloat(ttsRate.value).toFixed(2)}x`;
    tts.rate = parseFloat(ttsRate.value);
    saveCurrentConfig();
  });

  ttsPitch.addEventListener('input', () => {
    valPitch.textContent = `${parseFloat(ttsPitch.value).toFixed(1)}x`;
    tts.pitch = parseFloat(ttsPitch.value);
    saveCurrentConfig();
  });

  ttsVolume.addEventListener('input', () => {
    valVolume.textContent = `${Math.round(ttsVolume.value * 100)}%`;
    tts.volume = parseFloat(ttsVolume.value);
    saveCurrentConfig();
  });

  ttsTemplatePreset.addEventListener('change', () => {
    tts.setTemplate(ttsTemplatePreset.value);
    saveCurrentConfig();
  });

  alertDuration.addEventListener('input', () => {
    valDuration.textContent = `${alertDuration.value} detik`;
    saveCurrentConfig();
  });

  sfxSoundSelect.addEventListener('change', () => {
    saveCurrentConfig();
  });

  ttsLocation.addEventListener('change', () => {
    saveCurrentConfig();
  });

  checkBadwords.addEventListener('change', () => {
    tts.setProfanityFilter(checkBadwords.checked);
  });

  // Test Buttons
  btnTestTts.addEventListener('click', () => {
    unlockAudioEngine();
    sfx.play(sfxSoundSelect.value);
    setTimeout(() => {
      tts.enqueue('Japuy Streamer', 'Halo semuanya! Ini uji coba suara natural Indonesia. Suaranya terdengar sangat luwes seperti orang asli kan?');
    }, 400);
    showToast('Memutar suara natural Indonesia...', 'success');
  });

  btnTestSfx.addEventListener('click', () => {
    unlockAudioEngine();
    sfx.play(sfxSoundSelect.value);
  });

  btnPanicStop.addEventListener('click', () => {
    tts.stop();
    statSpeaking.textContent = 'Siap';
    statSpeaking.style.color = 'var(--accent-green)';
    showToast('Semua suara dan antrean dihentikan.', 'error');
  });

  // --- CHAT INGESTION & DISPATCH ---
  poller.onNewMessage = (chatItem) => {
    handleIncomingChat(chatItem);
  };

  poller.onStatusChange = (status, info) => {
    if (status === 'connected') {
      liveStatusPill.className = 'status-pill live';
      liveStatusText.textContent = 'LIVE CHAT TERHUBUNG';
      btnConnect.textContent = '❌ Putuskan';
      btnConnect.className = 'btn btn-danger';
      isConnecting = false;

      if (info) {
        streamInfoBox.style.display = 'flex';
        streamTitle.textContent = info.title;
        streamChannel.textContent = info.channelTitle;
        if (info.thumbnail) {
          streamThumb.src = info.thumbnail;
        } else {
          streamThumb.src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&auto=format&fit=crop&q=60';
        }
      }
      showToast('Berhasil terhubung ke live chat YouTube!', 'success');
    } else if (status === 'connecting') {
      liveStatusPill.className = 'status-pill polling';
      liveStatusText.textContent = 'MENGHUBUNGKAN...';
      btnConnect.textContent = '⏳ Menghubungkan...';
    } else if (status === 'disconnected') {
      liveStatusPill.className = 'status-pill offline';
      liveStatusText.textContent = 'OFFLINE';
      btnConnect.textContent = '⚡ Hubungkan Live Chat';
      btnConnect.className = 'btn btn-primary';
      streamInfoBox.style.display = 'none';
      isConnecting = false;
    }
  };

  poller.onError = (errMsg) => {
    showToast(errMsg, 'error');
  };

  function handleIncomingChat(chatItem) {
    totalChatCount++;
    statTotal.textContent = totalChatCount;

    // Remove empty placeholder
    if (chatEmpty) chatEmpty.style.display = 'none';

    // 1. Render in Dashboard Feed
    const itemEl = document.createElement('div');
    itemEl.id = `feed_${chatItem.id}`;
    itemEl.className = 'chat-item';

    const safeAuthor = escapeHtml(chatItem.author);
    const safeMsg = escapeHtml(chatItem.message);
    const timeStr = new Date(chatItem.publishedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    let roleBadge = '<span class="chat-badge">Penonton</span>';
    if (chatItem.isSuperChat) {
      roleBadge = `<span class="chat-badge badge-owner">💎 ${chatItem.superChatAmount || 'Superchat'}</span>`;
    } else if (chatItem.isOwner) {
      roleBadge = '<span class="chat-badge badge-owner">👑 Streamer</span>';
    } else if (chatItem.isModerator) {
      roleBadge = '<span class="chat-badge badge-mod">🛡️ Moderator</span>';
    } else if (chatItem.isSponsor) {
      roleBadge = '<span class="chat-badge badge-member">⭐ Member</span>';
    }

    itemEl.innerHTML = `
      <img class="chat-avatar" src="${chatItem.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(chatItem.author)}" alt="${safeAuthor}">
      <div class="chat-body">
        <div class="chat-meta">
          <span class="chat-author">${safeAuthor}</span>
          ${roleBadge}
          <span class="chat-time">${timeStr}</span>
        </div>
        <div class="chat-text">${safeMsg}</div>
      </div>
      <div class="chat-actions">
        <button class="chat-action-btn" title="Ulangi Suara TTS" data-action="replay">🔊</button>
        <button class="chat-action-btn" title="Hapus pesan dari tampilan" data-action="delete">✕</button>
      </div>
    `;

    // Action listener
    itemEl.querySelector('[data-action="replay"]').addEventListener('click', () => {
      unlockAudioEngine();
      sfx.play(sfxSoundSelect.value);
      tts.enqueue(chatItem.author, chatItem.message, chatItem);
    });

    itemEl.querySelector('[data-action="delete"]').addEventListener('click', () => {
      itemEl.remove();
    });

    chatFeed.insertBefore(itemEl, chatFeed.firstChild);

    // Limit chat feed items to 80
    if (chatFeed.children.length > 80) {
      chatFeed.removeChild(chatFeed.lastChild);
    }

    // 2. Broadcast to OBS Browser Source Overlay
    const locationVal = ttsLocation.value;
    const playTtsInOverlay = locationVal === 'overlay' || locationVal === 'both';
    const playTtsInDashboard = locationVal === 'dashboard' || locationVal === 'both';

    const overlayPayload = {
      ...chatItem,
      soundType: sfxSoundSelect.value,
      playSfx: true,
      skipVoice: !playTtsInOverlay || chatItem.skipVoice
    };

    if (broadcastChannel) {
      broadcastChannel.postMessage({
        type: 'NEW_CHAT_ALERT',
        payload: overlayPayload
      });
    }

    try {
      localStorage.setItem('yt_stream_latest_alert', JSON.stringify(overlayPayload));
    } catch (e) {}

    // 3. Play Chime & TTS in Dashboard (if enabled)
    if (playTtsInDashboard && !chatItem.skipVoice) {
      sfx.play(sfxSoundSelect.value);
      setTimeout(() => {
        tts.enqueue(chatItem.author, chatItem.message, chatItem);
      }, 400);
    }
  }

  // --- GOOGLE OAUTH 2.0 LOGIN ---
  const GOOGLE_CLIENT_ID = '753097274991-m2oij1eqoap4148ii0168pp5ocktapue.apps.googleusercontent.com';
  let googleTokenClient = null;
  let currentGoogleToken = null;

  async function handleGoogleToken(token) {
    currentGoogleToken = token;
    unlockAudioEngine();

    // 1. Fetch channel profile info via proxy to bypass CORS
    try {
      const channelUrl = 'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true';
      const proxyUrl = `/api/youtube?url=${encodeURIComponent(channelUrl)}`;
      let channelRes;
      try {
        channelRes = await fetch(proxyUrl, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (e) {
        channelRes = await fetch(channelUrl, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      if (channelRes.ok) {
        const chanData = await channelRes.json();
        if (chanData.items && chanData.items.length > 0) {
          const ch = chanData.items[0];
          googleUserName.textContent = ch.snippet?.title || 'Channel YouTube Anda';
          if (ch.snippet?.thumbnails?.default?.url) {
            googleUserAvatar.src = ch.snippet.thumbnails.default.url;
          }
          btnGoogleLogin.style.display = 'none';
          googleProfileBox.style.display = 'flex';
        }
      }
    } catch (e) {
      console.warn('Channel fetch error:', e);
    }

    // 2. Automatically find and connect to active live broadcast!
    try {
      showToast('Mencari siaran live aktif di channel Anda...', 'info');
      const info = await poller.connectWithOAuth(token);
      showToast(`Terhubung ke siaran: ${info.title}`, 'success');
      updateObsUrl();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  function initGoogleOAuth() {
    if (typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2) {
      setTimeout(initGoogleOAuth, 300);
      return;
    }

    try {
      if (!googleTokenClient) {
        googleTokenClient = google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'https://www.googleapis.com/auth/youtube.readonly',
          callback: (tokenResponse) => {
            if (tokenResponse.error) {
              console.warn('Google OAuth error:', tokenResponse);
              showToast('Login Google dibatalkan atau gagal: ' + (tokenResponse.error_description || tokenResponse.error), 'error');
              googleLoginBtnText.textContent = 'Masuk dengan Akun Google (Otomatis)';
              return;
            }
            handleGoogleToken(tokenResponse.access_token);
          },
          error_callback: (err) => {
            console.error('Google GIS error:', err);
            showToast('Pop-up login diblokir oleh browser! Silakan izinkan pop-up di bilah URL.', 'error');
            googleLoginBtnText.textContent = 'Masuk dengan Akun Google (Otomatis)';
          }
        });
      }
    } catch (err) {
      console.warn('Google client init err:', err);
    }
  }

  // Pre-initialize
  initGoogleOAuth();

  btnGoogleLogin.addEventListener('click', (e) => {
    e.preventDefault();
    unlockAudioEngine();

    if (typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2) {
      showToast('Sistem login Google sedang dimuat, silakan klik lagi dalam 1 detik...', 'info');
      initGoogleOAuth();
      return;
    }

    // Ensure client exists
    if (!googleTokenClient) {
      initGoogleOAuth();
    }

    if (googleTokenClient) {
      googleLoginBtnText.textContent = 'Membuka Google Login...';
      // MUST be called directly in click handler to avoid browser popup blocking!
      googleTokenClient.requestAccessToken({ prompt: '' });
    }
  });

  btnRecheckLive.addEventListener('click', async () => {
    unlockAudioEngine();
    if (!currentGoogleToken) {
      showToast('Silakan login terlebih dahulu.', 'error');
      return;
    }
    try {
      showToast('Mencari siaran live...', 'info');
      await poller.connectWithOAuth(currentGoogleToken);
      showToast('Berhasil terhubung ke live chat!', 'success');
    } catch (e) {
      showToast(e.message, 'error');
    }
  });

  btnGoogleLogout.addEventListener('click', () => {
    poller.stop();
    currentGoogleToken = null;
    googleProfileBox.style.display = 'none';
    btnGoogleLogin.style.display = 'flex';
    googleLoginBtnText.textContent = 'Masuk dengan Akun Google (Otomatis)';
    showToast('Berhasil logout dari akun Google.', 'info');
  });

  // --- CONNECT / DISCONNECT BUTTON ---
  btnConnect.addEventListener('click', async () => {
    unlockAudioEngine();
    saveCurrentConfig();

    if (poller.isRunning || poller.isSimulating) {
      poller.stop();
      return;
    }

    const apiKey = ytApiKey.value.trim();
    const videoInput = ytVideoInput.value.trim();

    if (!apiKey) {
      showToast('Silakan masukkan YouTube Data API v3 Key Anda terlebih dahulu.', 'error');
      modalApi.classList.add('active');
      return;
    }

    if (!videoInput) {
      showToast('Silakan masukkan URL atau ID Video Live Streaming YouTube Anda.', 'error');
      ytVideoInput.focus();
      return;
    }

    try {
      await poller.connect(apiKey, videoInput);
    } catch (err) {
      showToast(err.message, 'error');
      liveStatusPill.className = 'status-pill offline';
      liveStatusText.textContent = 'GAGAL KONEKSI';
      btnConnect.textContent = '⚡ Coba Hubungkan Lagi';
      btnConnect.className = 'btn btn-primary';
    }
  });

  // --- SIMULATION MODE BUTTON ---
  btnSimulation.addEventListener('click', () => {
    unlockAudioEngine();
    if (poller.isSimulating) {
      poller.stop();
      showToast('Mode simulasi dihentikan.', 'error');
    } else {
      poller.startSimulation();
      showToast('Mode Simulasi aktif! Chat demo akan masuk otomatis setiap beberapa detik.', 'success');
    }
  });

  // --- QUICK TEST BUTTONS ---
  btnTestNormal.addEventListener('click', () => {
    unlockAudioEngine();
    poller.sendSingleTest('Doni Permana', 'Halo bang! Hero andalan kamu apa di game ini?', 'viewer');
  });

  btnTestMember.addEventListener('click', () => {
    unlockAudioEngine();
    poller.sendSingleTest('Sultan Gaming', 'GG gaming bang Japuy! Lanjut push rank!', 'member');
  });

  btnTestMod.addEventListener('click', () => {
    unlockAudioEngine();
    poller.sendSingleTest('Admin Siaga', 'Ayo guys bantu like and subscribe channel ini ya!', 'moderator');
  });

  btnTestSuper.addEventListener('click', () => {
    unlockAudioEngine();
    poller.sendSingleTest('Rahmat Hidayat', 'Mantap bang Japuy! Semangat live streaming nya!', 'superchat');
  });

  // --- CLEAR CHAT ---
  btnClearChat.addEventListener('click', () => {
    chatFeed.innerHTML = `
      <div class="empty-chat" id="chat-empty">
        <div class="empty-chat-icon">📺</div>
        <p>Belum ada chat yang masuk.<br>Hubungkan live stream YouTube Anda atau klik <strong>Mode Simulasi</strong> / <strong>Tes Cepat</strong> di atas.</p>
      </div>
    `;
    totalChatCount = 0;
    statTotal.textContent = '0';
    showToast('Riwayat chat dibersihkan.', 'success');
  });

  // --- MODALS & NAVIGATION ---
  btnOpenOverlay.addEventListener('click', () => {
    window.open('overlay.html', 'OBS_Overlay_Preview', 'width=700,height=300,toolbar=0,menubar=0');
  });

  function updateObsUrl() {
    const videoVal = YouTubePoller.extractVideoId(ytVideoInput.value);
    const keyVal = ytApiKey.value.trim();
    if (videoVal && keyVal) {
      obsSourceUrl.value = `${currentHost}/overlay.html?v=${encodeURIComponent(videoVal)}&key=${encodeURIComponent(keyVal)}`;
    } else {
      obsSourceUrl.value = `${currentHost}/overlay.html`;
    }
  }

  btnObsGuide.addEventListener('click', () => {
    updateObsUrl();
    modalObs.classList.add('active');
  });
  btnCloseObsModal.addEventListener('click', () => modalObs.classList.remove('active'));
  btnDoneObsModal.addEventListener('click', () => modalObs.classList.remove('active'));

  btnApiGuide.addEventListener('click', () => modalApi.classList.add('active'));
  linkShowApiGuide.addEventListener('click', (e) => {
    e.preventDefault();
    modalApi.classList.add('active');
  });
  btnCloseApiModal.addEventListener('click', () => modalApi.classList.remove('active'));
  btnDoneApiModal.addEventListener('click', () => modalApi.classList.remove('active'));

  // Close modals on clicking outside
  [modalObs, modalApi].forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });
  });

  // Copy OBS URL
  btnCopyObsUrl.addEventListener('click', () => {
    obsSourceUrl.select();
    navigator.clipboard.writeText(obsSourceUrl.value).then(() => {
      btnCopyObsUrl.textContent = '✅ Disalin!';
      setTimeout(() => {
        btnCopyObsUrl.textContent = '📋 Salin';
      }, 2000);
      showToast('Link Browser Source OBS berhasil disalin!', 'success');
    }).catch(() => {
      document.execCommand('copy');
      showToast('Link disalin ke clipboard!', 'success');
    });
  });

  // --- TOAST HELPER ---
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'success' ? 'toast-success' : type === 'error' ? 'toast-error' : ''}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '⚠️';

    toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(15px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Initial setup
  loadSavedConfig();
});
