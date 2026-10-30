// Alle geluid wordt live opgewekt: geen geluidsbestanden nodig.
const SETTINGS_KEY = 'homo-v2-audio';

export class Audio {
  constructor() {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    this.music = saved.music ?? true;
    this.sfx = saved.sfx ?? true;
    this.ctx = null; this.timer = null; this.step = 0; this.next = 0; this.song = null;
  }

  save() { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ music: this.music, sfx: this.sfx })); }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.7; this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = this.music ? 0.16 : 0; this.musicGain.connect(this.master);
      this.sfxGain = this.ctx.createGain(); this.sfxGain.gain.value = this.sfx ? 0.75 : 0; this.sfxGain.connect(this.master);
      const len = Math.floor(this.ctx.sampleRate * 0.5);
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.timer = setInterval(() => this.tick(), 25);
    }
    if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
  }

  setMusic(on) { this.music = on; this.save(); if (this.musicGain) this.musicGain.gain.setTargetAtTime(on ? 0.16 : 0, this.ctx.currentTime, 0.05); }
  setSfx(on) { this.sfx = on; this.save(); if (this.sfxGain) this.sfxGain.gain.setTargetAtTime(on ? 0.75 : 0, this.ctx.currentTime, 0.02); }

  playSong(name) { this.song = SONGS[name] || null; this.step = 0; if (this.ctx) this.next = this.ctx.currentTime + 0.05; }
  stopSong() { this.song = null; }

  tone(freq, dur, type, vol, when, dest, slide = 0) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(Math.max(30, freq), when);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), when + dur);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), when + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g); g.connect(dest); o.start(when); o.stop(when + dur + 0.05);
  }
  noise(when, dur, vol, type, freq, slide = 0, dest = this.sfxGain) {
    const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noiseBuf; f.type = type; f.frequency.setValueAtTime(freq, when);
    if (slide) f.frequency.exponentialRampToValueAtTime(slide, when + dur);
    g.gain.setValueAtTime(vol, when); g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    s.connect(f); f.connect(g); g.connect(dest); s.start(when); s.stop(when + dur + 0.02);
  }

  tick() {
    const c = this.ctx;
    if (!c || !this.song || c.state !== 'running') return;
    const s = this.song, beat = 60 / s.bpm / 2;
    if (this.next < c.currentTime) this.next = c.currentTime + 0.05;
    while (this.next < c.currentTime + 0.15) {
      const i = this.step, t = this.next;
      const n = s.lead[i % s.lead.length];
      if (n) this.tone(midi(n), beat * 0.85, 'square', 0.05, t, this.musicGain);
      const b = s.bass[Math.floor(i / 2) % s.bass.length];
      if (i % 2 === 0 && b) this.tone(midi(b), beat * 1.7, 'triangle', 0.14, t, this.musicGain);
      if (s.drums) {
        if (i % 4 === 0) this.tone(70, 0.12, 'sine', 0.3, t, this.musicGain, 0.4);
        if (i % 4 === 2) this.noise(t, 0.05, 0.12, 'highpass', 5000, 0, this.musicGain);
      }
      this.step++; this.next += beat;
    }
  }

  play(kind) {
    const c = this.ctx;
    if (!c || !this.sfx) return;
    const t = c.currentTime + 0.005, d = this.sfxGain;
    switch (kind) {
      case 'jump': this.tone(300, 0.16, 'square', 0.07, t, d, 2.2); break;
      case 'stomp': this.tone(220, 0.12, 'square', 0.12, t, d, 0.5); this.noise(t, 0.08, 0.2, 'lowpass', 900); break;
      case 'bone': this.tone(midi(84), 0.06, 'square', 0.06, t, d); this.tone(midi(91), 0.14, 'square', 0.06, t + 0.06, d); break;
      case 'flint': [76, 79, 83].forEach((n, k) => this.tone(midi(n), 0.08, 'triangle', 0.12, t + k * 0.05, d)); break;
      case 'heart': [72, 76, 79, 84].forEach((n, k) => this.tone(midi(n), 0.1, 'triangle', 0.12, t + k * 0.06, d)); break;
      case 'artifact': [79, 83, 86, 91, 95].forEach((n, k) => this.tone(midi(n), 0.14, 'square', 0.06, t + k * 0.07, d)); break;
      case 'oneup': [76, 79, 88, 84, 86, 91].forEach((n, k) => this.tone(midi(n), 0.1, 'square', 0.07, t + k * 0.08, d)); break;
      case 'throw': this.noise(t, 0.12, 0.15, 'bandpass', 1800, 500); break;
      case 'hit': this.noise(t, 0.06, 0.25, 'highpass', 2000); this.tone(160, 0.08, 'triangle', 0.1, t, d, 0.6); break;
      case 'hurt': this.tone(500, 0.3, 'sawtooth', 0.1, t, d, 0.4); break;
      case 'die': [72, 67, 64, 60, 55].forEach((n, k) => this.tone(midi(n), 0.16, 'square', 0.08, t + 0.3 + k * 0.13, d)); break;
      case 'spring': this.tone(150, 0.3, 'sine', 0.25, t, d, 4); break;
      case 'bump': this.tone(110, 0.1, 'triangle', 0.25, t, d, 0.6); this.noise(t, 0.06, 0.15, 'lowpass', 600); break;
      case 'crumble': this.noise(t, 0.35, 0.25, 'lowpass', 700, 150); break;
      case 'checkpoint': [67, 72, 76, 79].forEach((n, k) => this.tone(midi(n), 0.2, 'triangle', 0.13, t + k * 0.09, d)); this.noise(t, 0.4, 0.08, 'bandpass', 900, 300); break;
      case 'win': [72, 76, 79, 84, 79, 84, 88].forEach((n, k) => this.tone(midi(n), 0.18, 'square', 0.08, t + k * 0.12, d)); break;
      case 'hiss': this.noise(t, 0.4, 0.12, 'highpass', 4000, 6000); break;
      case 'screech': this.tone(1300, 0.35, 'sawtooth', 0.05, t, d, 0.6); this.tone(1700, 0.25, 'square', 0.03, t + 0.05, d, 0.7); break;
      case 'snort': this.noise(t, 0.2, 0.3, 'lowpass', 500, 200); this.noise(t + 0.22, 0.2, 0.3, 'lowpass', 500, 200); break;
      case 'grab': this.noise(t, 0.08, 0.15, 'bandpass', 900, 400); this.tone(240, 0.08, 'triangle', 0.08, t, d, 1.5); break;
      case 'bubble': for (let k = 0; k < 3; k++) this.tone(300 + k * 120, 0.06, 'sine', 0.08, t + k * 0.07, d, 1.8); break;
      case 'snap': this.noise(t, 0.08, 0.35, 'lowpass', 1200); this.tone(120, 0.12, 'square', 0.12, t, d, 0.5); break;
      case 'splash': this.noise(t, 0.5, 0.3, 'lowpass', 2500, 300); break;
      case 'meet': [67, 71, 74, 79].forEach((n, k) => this.tone(midi(n), 0.25, 'triangle', 0.1, t + k * 0.1, d)); break;
      case 'chatter': [900, 1100, 950].forEach((f, k) => this.tone(f, 0.05, 'square', 0.04, t + k * 0.06, d, 0.8)); break;
      case 'growl': this.noise(t, 0.5, 0.3, 'lowpass', 300, 120); this.tone(70, 0.5, 'sawtooth', 0.08, t, d, 0.8); break;
      case 'squeak': this.tone(2400, 0.08, 'square', 0.03, t, d, 1.3); this.tone(2600, 0.06, 'square', 0.03, t + 0.1, d, 1.2); break;
      case 'crack': this.noise(t, 0.15, 0.2, 'highpass', 1500); break;
      case 'roar': this.noise(t, 1.1, 0.4, 'lowpass', 500, 120); this.tone(90, 1, 'sawtooth', 0.12, t, d, 0.6); break;
      case 'crash': this.noise(t, 0.4, 0.45, 'lowpass', 900, 100); this.tone(60, 0.3, 'sine', 0.3, t, d, 0.5); break;
      case 'bosshit': this.tone(300, 0.2, 'square', 0.12, t, d, 0.4); this.noise(t, 0.2, 0.3, 'bandpass', 1200, 300); break;
      case 'click': this.tone(660, 0.05, 'square', 0.05, t, d); break;
    }
  }
}

function midi(n) { return 440 * Math.pow(2, (n - 69) / 12); }

// Eigen melodieën. Lead in achtsten, bas in kwarten.
const SONGS = {
  forest: {
    bpm: 112, drums: true,
    lead: [72, 0, 76, 79, 0, 76, 74, 0, 72, 0, 74, 76, 79, 81, 79, 0, 77, 0, 76, 74, 72, 0, 74, 0, 76, 0, 72, 0, 0, 0, 0, 0,
           72, 0, 76, 79, 0, 81, 84, 0, 83, 81, 79, 0, 77, 76, 74, 0, 76, 0, 79, 0, 77, 76, 74, 72, 71, 0, 72, 0, 0, 0, 0, 0],
    bass: [48, 55, 48, 55, 45, 52, 45, 52, 41, 48, 41, 48, 43, 50, 43, 50, 48, 55, 48, 55, 45, 52, 45, 52, 41, 48, 43, 50, 48, 48, 48, 48],
  },
  cave: {
    bpm: 84, drums: false,
    lead: [57, 0, 0, 60, 0, 0, 64, 0, 63, 0, 0, 0, 60, 0, 0, 0, 57, 0, 0, 55, 0, 0, 57, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    bass: [33, 33, 33, 33, 31, 31, 29, 29, 33, 33, 36, 36, 31, 31, 33, 33],
  },
  boss: {
    bpm: 152, drums: true,
    lead: [57, 57, 60, 57, 63, 0, 62, 60, 57, 57, 60, 57, 55, 0, 56, 0, 57, 57, 60, 57, 63, 0, 65, 63, 62, 60, 62, 63, 64, 0, 0, 0],
    bass: [33, 33, 33, 33, 36, 36, 35, 35, 33, 33, 33, 33, 31, 31, 32, 32],
  },
  gorge: {
    bpm: 120, drums: true,
    lead: [69, 0, 72, 0, 76, 74, 72, 0, 71, 0, 72, 74, 76, 0, 0, 0, 74, 0, 72, 71, 69, 0, 67, 0, 69, 72, 71, 69, 67, 0, 0, 0,
           69, 0, 72, 0, 76, 0, 79, 77, 76, 0, 74, 72, 74, 0, 0, 0, 72, 0, 74, 76, 77, 76, 74, 72, 71, 0, 72, 71, 69, 0, 0, 0],
    bass: [45, 52, 45, 52, 41, 48, 41, 48, 43, 50, 43, 50, 40, 47, 40, 47,
           45, 52, 45, 52, 41, 48, 41, 48, 38, 45, 43, 50, 45, 52, 45, 45],
  },
  savanna: {
    bpm: 132, drums: true,
    lead: [67, 0, 71, 74, 76, 0, 74, 71, 72, 0, 74, 76, 79, 0, 76, 74, 71, 0, 72, 74, 76, 74, 72, 71, 69, 0, 71, 72, 74, 0, 0, 0,
           67, 0, 71, 74, 76, 0, 79, 81, 79, 0, 76, 74, 76, 0, 79, 0, 81, 0, 79, 76, 74, 76, 72, 74, 71, 0, 69, 71, 67, 0, 0, 0],
    bass: [43, 50, 43, 50, 48, 55, 48, 55, 40, 47, 40, 47, 45, 52, 50, 50,
           43, 50, 43, 50, 48, 55, 48, 55, 45, 52, 50, 57, 43, 50, 43, 43],
  },
  title: {
    bpm: 96, drums: false,
    lead: [67, 0, 0, 71, 74, 0, 72, 0, 71, 0, 0, 67, 69, 0, 0, 0, 64, 0, 0, 67, 71, 0, 69, 0, 67, 0, 0, 0, 0, 0, 0, 0],
    bass: [43, 43, 40, 40, 36, 36, 38, 38],
  },
};
