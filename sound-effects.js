/**
 * SoundEffects - Web Audio API Procedural Sound Generator
 * Generates alert chimes without external audio files.
 */
class SoundEffects {
  constructor() {
    this.audioCtx = null;
    this.volume = 0.8;
  }

  init() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
  }

  play(soundType = 'cyber-ding', customVolume = null) {
    this.init();
    if (!this.audioCtx) return;

    const vol = customVolume !== null ? customVolume : this.volume;
    if (vol <= 0) return;

    switch (soundType) {
      case 'cyber-ding':
        this.playCyberDing(vol);
        break;
      case 'pop-bubble':
        this.playPopBubble(vol);
        break;
      case 'retro-game':
        this.playRetroGame(vol);
        break;
      case 'crystal-bell':
        this.playCrystalBell(vol);
        break;
      case 'soft-marimba':
        this.playSoftMarimba(vol);
        break;
      default:
        this.playCyberDing(vol);
    }
  }

  playCyberDing(vol) {
    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(vol * 0.45, now);
    masterGain.connect(ctx.destination);

    // Tone 1: 587.33 Hz (D5) -> 880 Hz (A5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12);

    gain1.gain.setValueAtTime(1, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc1.connect(gain1);
    gain1.connect(masterGain);
    osc1.start(now);
    osc1.stop(now + 0.65);

    // Tone 2: Harmonizer shimmer
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1174.66, now + 0.08); // D6
    osc2.frequency.exponentialRampToValueAtTime(1760, now + 0.2); // A6

    gain2.gain.setValueAtTime(0.001, now);
    gain2.gain.setValueAtTime(0.7, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

    osc2.connect(gain2);
    gain2.connect(masterGain);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.9);
  }

  playPopBubble(vol) {
    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(vol * 0.6, now);
    masterGain.connect(ctx.destination);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.08);

    gain.gain.setValueAtTime(1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(now);
    osc.stop(now + 0.28);
  }

  playRetroGame(vol) {
    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(vol * 0.35, now);
    masterGain.connect(ctx.destination);

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = now + idx * 0.07;

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.8, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(startTime);
      osc.stop(startTime + 0.16);
    });
  }

  playCrystalBell(vol) {
    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(vol * 0.4, now);
    masterGain.connect(ctx.destination);

    const freqs = [1046.5, 1318.51, 1567.98]; // C6, E6, G6
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + idx * 0.05;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.8, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.2);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(start);
      osc.stop(start + 1.25);
    });
  }

  playSoftMarimba(vol) {
    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(vol * 0.5, now);
    masterGain.connect(ctx.destination);

    const notes = [440, 659.25]; // A4, E5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + i * 0.09;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(1, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(start);
      osc.stop(start + 0.38);
    });
  }
}

if (typeof window !== 'undefined') {
  window.SoundEffects = SoundEffects;
}
