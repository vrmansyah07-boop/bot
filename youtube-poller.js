/**
 * YouTubePoller - Handles YouTube Data API v3 live chat polling and demo simulation.
 */
class YouTubePoller {
  constructor() {
    this.apiKey = '';
    this.accessToken = '';
    this.videoId = '';
    this.liveChatId = '';
    this.nextPageToken = '';
    this.pollingInterval = 4000;
    this.timer = null;
    this.isRunning = false;
    this.seenMessageIds = new Set();
    this.isFirstFetch = true;
    this.readExistingChatOnConnect = false;

    // Simulation state
    this.isSimulating = false;
    this.simTimer = null;

    // Callbacks
    this.onNewMessage = null; // (chatItem) => void
    this.onStatusChange = null; // (status, details) => void
    this.onError = null; // (errorMessage) => void
  }

  static extractVideoId(input) {
    if (!input) return '';
    const trimmed = input.trim();

    // Direct 11-char ID
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      return trimmed;
    }

    // Standard watch URL: youtube.com/watch?v=XYZ123
    let match = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (match) return match[1];

    // Short URL: youtu.be/XYZ123
    match = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (match) return match[1];

    // Live URL: youtube.com/live/XYZ123
    match = trimmed.match(/youtube\.com\/live\/([a-zA-Z0-9_-]{11})/);
    if (match) return match[1];

    // Embed URL: youtube.com/embed/XYZ123
    match = trimmed.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
    if (match) return match[1];

    return '';
  }

  async fetchWithProxy(url, options = {}) {
    const proxyUrl = `/api/youtube?url=${encodeURIComponent(url)}`;
    try {
      const res = await fetch(proxyUrl, options);
      if (res.status !== 404) {
        return res;
      }
    } catch (e) {
      console.warn('Proxy fetch fallback:', e);
    }
    return fetch(url, options);
  }

  async connect(apiKey, videoInput) {
    this.stop();

    this.apiKey = (apiKey || '').trim();
    this.videoId = YouTubePoller.extractVideoId(videoInput);

    if (!this.apiKey) {
      throw new Error('Masukkan API Key YouTube Data API v3 Anda.');
    }
    if (!this.videoId) {
      throw new Error('URL / Video ID YouTube Live tidak valid. Contoh format: https://youtube.com/live/AbCdEf12345');
    }

    if (this.onStatusChange) {
      this.onStatusChange('connecting', { videoId: this.videoId });
    }

    // 1. Fetch live video details to find activeLiveChatId
    const videoUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails&id=${this.videoId}&key=${this.apiKey}`;
    
    let videoData;
    try {
      const res = await this.fetchWithProxy(videoUrl);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const msg = errJson.error?.message || `HTTP ${res.status}: Gagal mengambil data video.`;
        throw new Error(msg);
      }
      videoData = await res.json();
    } catch (e) {
      throw new Error(`Gagal menghubungi YouTube API: ${e.message}`);
    }

    if (!videoData.items || videoData.items.length === 0) {
      throw new Error('Video YouTube tidak ditemukan. Pastikan Video ID benar dan siaran disetel Publik atau Unlisted.');
    }

    const item = videoData.items[0];
    const liveDetails = item.liveStreamingDetails;

    if (!liveDetails) {
      throw new Error('Video ini bukan video live streaming (tidak memiliki live streaming details).');
    }

    if (!liveDetails.activeLiveChatId) {
      throw new Error('Siaran ini tidak memiliki Live Chat aktif. Pastikan live streaming sedang berlangsung dan live chat dibuka.');
    }

    this.liveChatId = liveDetails.activeLiveChatId;
    this.seenMessageIds.clear();
    this.isFirstFetch = true;
    this.nextPageToken = '';
    this.isRunning = true;

    const streamInfo = {
      title: item.snippet?.title || 'Live Stream',
      channelTitle: item.snippet?.channelTitle || 'Channel Streamer',
      thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '',
      liveChatId: this.liveChatId,
      videoId: this.videoId
    };

    if (this.onStatusChange) {
      this.onStatusChange('connected', streamInfo);
    }

    // Start Polling Loop
    this.pollLoop();

    return streamInfo;
  }

  async connectWithOAuth(accessToken) {
    this.stop();
    this.accessToken = accessToken;
    this.apiKey = '';

    if (this.onStatusChange) {
      this.onStatusChange('connecting', { mode: 'oauth' });
    }

    // 1. Fetch active live broadcasts on user's channel
    let broadcastData;
    try {
      const url = `https://www.googleapis.com/youtube/v3/liveBroadcasts?broadcastStatus=active&broadcastType=all&part=id,snippet`;
      const res = await this.fetchWithProxy(url, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const rawMsg = errJson.error?.message || `HTTP ${res.status}`;
        if (rawMsg.includes('has not been used in project') || rawMsg.includes('is disabled')) {
          throw new Error('YouTube Data API v3 belum diaktifkan di Google Cloud Project Anda! Klik link di bawah tombol login untuk mengaktifkannya.');
        }
        throw new Error(rawMsg);
      }
      broadcastData = await res.json();
    } catch (e) {
      if (e.message.toLowerCase().includes('fetch')) {
        throw new Error('Sistem Google sedang memperbarui izin (baru saja di-ENABLE). Silakan tunggu 1 menit, klik "Keluar", lalu Login ulang.');
      }
      throw new Error(`Gagal mencari siaran live aktif: ${e.message}`);
    }

    let broadcast = null;
    if (broadcastData.items && broadcastData.items.length > 0) {
      broadcast = broadcastData.items[0];
    } else {
      // Check upcoming broadcasts if none currently active
      try {
        const urlUpcoming = `https://www.googleapis.com/youtube/v3/liveBroadcasts?broadcastStatus=upcoming&broadcastType=all&part=id,snippet`;
        const resUp = await this.fetchWithProxy(urlUpcoming, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (resUp.ok) {
          const upData = await resUp.json();
          if (upData.items && upData.items.length > 0) {
            broadcast = upData.items[0];
          }
        }
      } catch (e) {}
    }

    if (!broadcast) {
      throw new Error('Tidak ada siaran live yang sedang aktif atau terjadwal di channel YouTube Anda. Silakan mulai live streaming Anda di YouTube Studio terlebih dahulu!');
    }

    const liveChatId = broadcast.snippet?.liveChatId;
    if (!liveChatId) {
      throw new Error('Siaran ini ditemukan, tetapi Live Chat belum aktif atau dinonaktifkan.');
    }

    this.liveChatId = liveChatId;
    this.videoId = broadcast.id;
    this.seenMessageIds.clear();
    this.isFirstFetch = true;
    this.nextPageToken = '';
    this.isRunning = true;

    const streamInfo = {
      title: broadcast.snippet?.title || 'Live Stream',
      channelTitle: broadcast.snippet?.channelTitle || 'Channel Anda',
      thumbnail: broadcast.snippet?.thumbnails?.medium?.url || broadcast.snippet?.thumbnails?.default?.url || '',
      liveChatId: this.liveChatId,
      videoId: this.videoId,
      isOAuth: true
    };

    if (this.onStatusChange) {
      this.onStatusChange('connected', streamInfo);
    }

    this.pollLoop();
    return streamInfo;
  }

  async pollLoop() {
    if (!this.isRunning) return;

    try {
      let chatUrl = `https://www.googleapis.com/youtube/v3/liveChatMessages?liveChatId=${this.liveChatId}&part=snippet,authorDetails`;
      if (this.apiKey) {
        chatUrl += `&key=${this.apiKey}`;
      }
      if (this.nextPageToken) {
        chatUrl += `&pageToken=${encodeURIComponent(this.nextPageToken)}`;
      }

      const headers = {};
      if (this.accessToken) {
        headers['Authorization'] = `Bearer ${this.accessToken}`;
      }

      const res = await this.fetchWithProxy(chatUrl, { headers });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const msg = errJson.error?.message || `HTTP ${res.status}`;
        throw new Error(`Chat Polling Error: ${msg}`);
      }

      const data = await res.json();
      this.nextPageToken = data.nextPageToken || '';

      const intervalMs = Math.max(3000, data.pollingIntervalMillis || 4500);
      this.pollingInterval = intervalMs;

      if (data.items && data.items.length > 0) {
        data.items.forEach(msgItem => {
          const id = msgItem.id;
          if (this.seenMessageIds.has(id)) return;
          this.seenMessageIds.add(id);

          // If first fetch and user chose not to read back-history, skip TTS for past items
          const isHistory = this.isFirstFetch && !this.readExistingChatOnConnect;

          const chatObj = {
            id: id,
            author: msgItem.authorDetails?.displayName || 'Penonton',
            avatar: msgItem.authorDetails?.profileImageUrl || '',
            message: msgItem.snippet?.displayMessage || '',
            publishedAt: msgItem.snippet?.publishedAt || new Date().toISOString(),
            isOwner: !!msgItem.authorDetails?.isChatOwner,
            isModerator: !!msgItem.authorDetails?.isChatModerator,
            isSponsor: !!msgItem.authorDetails?.isChatSponsor,
            isSuperChat: msgItem.snippet?.type === 'superChatEvent',
            superChatAmount: msgItem.snippet?.superChatDetails?.amountDisplayString || '',
            skipVoice: isHistory
          };

          if (this.onNewMessage) {
            this.onNewMessage(chatObj);
          }
        });
      }

      this.isFirstFetch = false;

    } catch (e) {
      console.warn('Poll error:', e.message);
      if (this.onError) {
        this.onError(e.message);
      }
    }

    if (this.isRunning) {
      this.timer = setTimeout(() => this.pollLoop(), this.pollingInterval);
    }
  }

  stop() {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.stopSimulation();
    if (this.onStatusChange) {
      this.onStatusChange('disconnected');
    }
  }

  // --- DEMO / SIMULATOR MODE ---
  startSimulation() {
    this.stop();
    this.isSimulating = true;

    if (this.onStatusChange) {
      this.onStatusChange('connected', {
        title: 'Demo Live Stream - Mode Simulasi',
        channelTitle: 'Japuy Gaming Channel',
        thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=300&auto=format&fit=crop&q=60',
        liveChatId: 'simulated_live_chat_123',
        videoId: 'SIMULATION_MODE'
      });
    }

    const sampleComments = [
      { author: 'Reza Gamers', message: 'Halo bang Japuy! Semangat live streaming nya!', isOwner: false, isModerator: false, isSponsor: false },
      { author: 'Budi Santoso', message: 'Bang nanti mabar ya, gg bgt tadi permainannya!', isOwner: false, isModerator: true, isSponsor: false },
      { author: 'Siti Gaming', message: 'Wkwk kocak bgt musuhnya, bantai terus bang!', isOwner: false, isModerator: false, isSponsor: true },
      { author: 'Kurniawan_ID', message: 'Mantap bang, udh aku like dan share ke temen-temen', isOwner: false, isModerator: false, isSponsor: false },
      { author: 'Dian Permana', message: 'Hero andalan kamu sekarang apa bang?', isOwner: false, isModerator: false, isSponsor: false },
      { author: 'Mega Superfan', message: 'Keren bgt bang! Sukses selalu live streamingnya!', isOwner: false, isModerator: false, isSponsor: true }
    ];

    let index = 0;
    const sendSimulated = () => {
      if (!this.isSimulating) return;

      const item = sampleComments[index % sampleComments.length];
      index++;

      const avatarList = [
        'https://api.dicebear.com/7.x/bottts/svg?seed=Reza',
        'https://api.dicebear.com/7.x/bottts/svg?seed=Budi',
        'https://api.dicebear.com/7.x/bottts/svg?seed=Siti',
        'https://api.dicebear.com/7.x/bottts/svg?seed=Kurnia',
        'https://api.dicebear.com/7.x/bottts/svg?seed=Dian',
        'https://api.dicebear.com/7.x/bottts/svg?seed=Mega'
      ];

      const simChat = {
        id: `sim_${Date.now()}_${index}`,
        author: item.author,
        avatar: avatarList[(index - 1) % avatarList.length],
        message: item.message,
        publishedAt: new Date().toISOString(),
        isOwner: item.isOwner,
        isModerator: item.isModerator,
        isSponsor: item.isSponsor,
        isSuperChat: false,
        skipVoice: false
      };

      if (this.onNewMessage) {
        this.onNewMessage(simChat);
      }

      // Schedule next simulated comment in 8 - 14 seconds
      const nextDelay = Math.floor(Math.random() * 6000) + 8000;
      this.simTimer = setTimeout(sendSimulated, nextDelay);
    };

    // First one arrives after 1.5 seconds
    this.simTimer = setTimeout(sendSimulated, 1500);
  }

  stopSimulation() {
    this.isSimulating = false;
    if (this.simTimer) {
      clearTimeout(this.simTimer);
      this.simTimer = null;
    }
  }

  sendSingleTest(customAuthor, customMessage, role = 'viewer') {
    const avatars = {
      viewer: 'https://api.dicebear.com/7.x/bottts/svg?seed=ViewerTest',
      moderator: 'https://api.dicebear.com/7.x/bottts/svg?seed=ModTest',
      member: 'https://api.dicebear.com/7.x/bottts/svg?seed=MemberTest',
      owner: 'https://api.dicebear.com/7.x/bottts/svg?seed=OwnerTest'
    };

    const testChat = {
      id: `manual_test_${Date.now()}`,
      author: customAuthor || 'Penonton Setia',
      avatar: avatars[role] || avatars.viewer,
      message: customMessage || 'Halo bang! Test notifikasi alert dan suara TTS berhasil!',
      publishedAt: new Date().toISOString(),
      isOwner: role === 'owner',
      isModerator: role === 'moderator',
      isSponsor: role === 'member',
      isSuperChat: role === 'superchat',
      superChatAmount: role === 'superchat' ? 'Rp 50.000' : '',
      skipVoice: false
    };

    if (this.onNewMessage) {
      this.onNewMessage(testChat);
    }
    return testChat;
  }
}

if (typeof window !== 'undefined') {
  window.YouTubePoller = YouTubePoller;
}
