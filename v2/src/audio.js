// Geluid wordt live opgewekt: muziek met echte instrumentklanken, galm, omgevingsgeluid en effecten.
const SETTINGS_KEY = 'homo-v2-audio';
const midi = n => 440 * Math.pow(2, (n - 69) / 12);

export class Audio {
  constructor() {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    this.music = saved.music ?? true;
    this.sfx = saved.sfx ?? true;
    this.ctx = null; this.step = 0; this.next = 0; this.song = null; this.ambience = null; this.ambT = 0;
  }
  save() { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ music: this.music, sfx: this.sfx })); }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const c = this.ctx = new AC();
      this.comp = c.createDynamicsCompressor(); this.comp.threshold.value = -14; this.comp.ratio.value = 3;
      this.comp.connect(c.destination);
      this.master = c.createGain(); this.master.gain.value = 0.85; this.master.connect(this.comp);
      // Galm: zelfgemaakte impulsrespons (ruis die uitsterft)
      this.verb = c.createConvolver(); this.verb.buffer = this.impulse(2.4, 2.2);
      this.verbOut = c.createGain(); this.verbOut.gain.value = 0.55; this.verb.connect(this.verbOut); this.verbOut.connect(this.master);
      this.verbSend = c.createGain(); this.verbSend.gain.value = 0.22; this.verbSend.connect(this.verb);
      this.musicGain = c.createGain(); this.musicGain.gain.value = this.music ? 0.5 : 0; this.musicGain.connect(this.master);
      this.musicSend = c.createGain(); this.musicSend.gain.value = 0.32; this.musicGain.connect(this.musicSend); this.musicSend.connect(this.verb);
      this.sfxGain = c.createGain(); this.sfxGain.gain.value = this.sfx ? 0.8 : 0; this.sfxGain.connect(this.master); this.sfxGain.connect(this.verbSend);
      this.ambGain = c.createGain(); this.ambGain.gain.value = this.sfx ? 0.5 : 0; this.ambGain.connect(this.master); this.ambGain.connect(this.verbSend);
      const len = Math.floor(c.sampleRate * 1);
      this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
      const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      setInterval(() => this.tick(), 25);
      if (this.pendingSpace) this.setSpace(this.pendingSpace);
    }
    if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
  }
  impulse(sec, decay) {
    const c = this.ctx, n = Math.floor(c.sampleRate * sec), b = c.createBuffer(2, n, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay); }
    return b;
  }

  setMusic(on) { this.music = on; this.save(); if (this.musicGain) this.musicGain.gain.setTargetAtTime(on ? 0.5 : 0, this.ctx.currentTime, 0.1); }
  setSfx(on) { this.sfx = on; this.save(); if (this.sfxGain) { this.sfxGain.gain.setTargetAtTime(on ? 0.8 : 0, this.ctx.currentTime, 0.05); this.ambGain.gain.setTargetAtTime(on ? 0.5 : 0, this.ctx.currentTime, 0.2); } }
  // Meer galm in grotten
  setSpace(kind) {
    if (!this.ctx) { this.pendingSpace = kind; return; }
    const cave = kind === 'cave';
    this.verbSend.gain.setTargetAtTime(cave ? 0.7 : 0.22, this.ctx.currentTime, 0.3);
    this.musicSend.gain.setTargetAtTime(cave ? 0.6 : 0.32, this.ctx.currentTime, 0.3);
  }

  playSong(name) { this.song = SONGS[name] || SONGS.savanna; this.step = 0; if (this.ctx) this.next = this.ctx.currentTime + 0.08; }
  stopSong() { this.song = null; }
  setAmbience(theme) { this.ambience = AMBIENCE[theme] || null; }

  // ---------- bouwstenen ----------
  env(g, t, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  osc(type, f, t, dur, dest, slide = 0, detune = 0) {
    const o = this.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(Math.max(20, f), t); o.detune.value = detune;
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f * slide), t + dur);
    o.connect(dest); o.start(t); o.stop(t + dur + 0.05); return o;
  }
  noise(t, dur, vol, type, freq, slide = 0, dest = this.sfxGain, q = 1) {
    const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noiseBuf; f.type = type; f.Q.value = q; f.frequency.setValueAtTime(freq, t);
    if (slide) f.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }
  tone(f, dur, type, vol, t, dest, slide = 0) {
    const g = this.ctx.createGain(); this.env(g, t, 0.006, vol, dur); g.connect(dest);
    this.osc(type, f, t, dur, g, slide);
  }
  // Marimba / houten klank: grondtoon + boventoon, snel uitstervend
  marimba(f, t, vol, dest) {
    const g = this.ctx.createGain(); this.env(g, t, 0.004, vol, 0.45); g.connect(dest);
    this.osc('sine', f, t, 0.5, g);
    const g2 = this.ctx.createGain(); this.env(g2, t, 0.002, vol * 0.35, 0.12); g2.connect(dest);
    this.osc('sine', f * 3.9, t, 0.15, g2);
  }
  // Getokkelde snaar: gefilterde zaagtand met dalend filter
  pluck(f, t, vol, dest, dur = 0.4) {
    const c = this.ctx, fl = c.createBiquadFilter(), g = c.createGain();
    fl.type = 'lowpass'; fl.frequency.setValueAtTime(Math.min(8000, f * 8), t); fl.frequency.exponentialRampToValueAtTime(Math.max(200, f * 1.2), t + dur);
    this.env(g, t, 0.003, vol, dur); fl.connect(g); g.connect(dest);
    this.osc('sawtooth', f, t, dur, fl, 0, -6); this.osc('triangle', f, t, dur, fl, 0, 7);
  }
  // Warme klanklaag (pad) voor akkoorden
  pad(notes, t, dur, vol, dest) {
    const c = this.ctx, fl = c.createBiquadFilter(), g = c.createGain();
    fl.type = 'lowpass'; fl.frequency.value = 1100; fl.Q.value = 0.5;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.3); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    fl.connect(g); g.connect(dest);
    for (const n of notes) for (const dt of [-9, 9]) this.osc('sawtooth', midi(n), t, dur, fl, 0, dt);
  }
  bass(f, t, dur, vol, dest) {
    const g = this.ctx.createGain(); this.env(g, t, 0.01, vol, dur); g.connect(dest);
    this.osc('triangle', f, t, dur, g); this.osc('sine', f / 2, t, dur, g);
  }
  drum(kind, t, vol, dest) {
    if (kind === 'kick') { const g = this.ctx.createGain(); this.env(g, t, 0.002, vol, 0.28); g.connect(dest); this.osc('sine', 120, t, 0.3, g, 0.35); }
    else if (kind === 'tom') { const g = this.ctx.createGain(); this.env(g, t, 0.002, vol * 0.8, 0.22); g.connect(dest); this.osc('sine', 190, t, 0.24, g, 0.62); this.noise(t, 0.05, vol * 0.25, 'bandpass', 900, 0, dest); }
    else if (kind === 'slap') { this.noise(t, 0.09, vol * 0.6, 'bandpass', 1800, 900, dest, 1.4); const g = this.ctx.createGain(); this.env(g, t, 0.002, vol * 0.4, 0.07); g.connect(dest); this.osc('sine', 330, t, 0.08, g, 0.7); }
    else if (kind === 'shaker') this.noise(t, 0.05, vol * 0.35, 'highpass', 6500, 0, dest);
    else if (kind === 'clap') this.noise(t, 0.12, vol * 0.5, 'bandpass', 1400, 0, dest, 0.8);
  }

  // ---------- muziek en omgeving ----------
  tick() {
    const c = this.ctx;
    if (!c || c.state !== 'running') return;
    const s = this.song;
    if (s) {
      const sixteenth = 60 / s.bpm / 4;
      if (this.next < c.currentTime) this.next = c.currentTime + 0.05;
      while (this.next < c.currentTime + 0.15) {
        const i = this.step, t = this.next + ((i % 2) ? sixteenth * (s.swing || 0) : 0);
        const bar = Math.floor(i / 16) % s.chords.length, pos = i % 16, chord = s.chords[bar];
        const dest = this.musicGain;
        if (pos === 0) this.pad(chord.map(n => n + 12), t, sixteenth * 16, s.padVol ?? 0.05, dest);
        const b = s.bass[pos];
        if (b !== undefined && b !== null) this.bass(midi(chord[0] - 12 + b), t, sixteenth * 3, 0.32, dest);
        const m = s.melody[i % s.melody.length];
        if (m) { if (s.lead === 'pluck') this.pluck(midi(m), t, 0.16, dest); else this.marimba(midi(m), t, 0.22, dest); }
        const arp = s.arp && s.arp[pos];
        if (arp !== undefined && arp !== null) this.marimba(midi(chord[arp % chord.length] + 12), t, 0.07, dest);
        if (s.drums) for (const [kind, pat] of Object.entries(s.drums)) if (pat[pos] === 'x') this.drum(kind, t, 0.5, dest);
        this.step++; this.next += sixteenth;
      }
    }
    // Omgevingsgeluid: vogels, krekels, druppels, wind
    const A = this.ambience;
    if (A && this.sfx) {
      this.ambT -= 0.025;
      if (this.ambT <= 0) { this.ambT = A.every * (0.5 + Math.random()); this.amb(A.sounds[Math.floor(Math.random() * A.sounds.length)], c.currentTime + 0.02); }
    }
  }
  amb(kind, t) {
    const d = this.ambGain;
    if (kind === 'bird') { const f = 2200 + Math.random() * 1600; for (let k = 0; k < 2 + Math.floor(Math.random() * 3); k++) this.tone(f * (1 + Math.random() * 0.1), 0.09, 'sine', 0.05, t + k * 0.11, d, 1.35); }
    else if (kind === 'dove') { for (let k = 0; k < 3; k++) this.tone(520, 0.28, 'sine', 0.04, t + k * 0.38, d, 0.85); }
    else if (kind === 'cricket') { for (let k = 0; k < 6; k++) this.tone(4300, 0.025, 'square', 0.012, t + k * 0.05, d); }
    else if (kind === 'drip') { this.tone(1100 + Math.random() * 700, 0.12, 'sine', 0.07, t, d, 1.6); }
    else if (kind === 'wind') { this.noise(t, 2.5, 0.05, 'bandpass', 400, 900, d, 0.7); }
    else if (kind === 'water') { this.noise(t, 1.2, 0.03, 'lowpass', 900, 500, d); }
    else if (kind === 'monkey') { for (let k = 0; k < 3; k++) this.tone(900 + k * 150, 0.08, 'sawtooth', 0.02, t + k * 0.09, d, 1.2); }
    else if (kind === 'rumble') { this.noise(t, 2, 0.06, 'lowpass', 120, 60, d); }
  }

  // ---------- effecten ----------
  play(kind) {
    const c = this.ctx;
    if (!c || !this.sfx) return;
    const t = c.currentTime + 0.005, d = this.sfxGain;
    switch (kind) {
      case 'jump': this.noise(t, 0.14, 0.12, 'bandpass', 900, 2600, d, 1.2); this.tone(330, 0.13, 'sine', 0.07, t, d, 1.9); break;
      case 'land': { const g = c.createGain(); this.env(g, t, 0.002, 0.18, 0.1); g.connect(d); this.osc('sine', 110, t, 0.12, g, 0.5); this.noise(t, 0.08, 0.1, 'lowpass', 600, 0, d); break; }
      case 'step': this.noise(t, 0.05, 0.05, 'lowpass', 900 + Math.random() * 600, 0, d); break;
      case 'stomp': this.tone(180, 0.12, 'sine', 0.3, t, d, 0.5); this.noise(t, 0.09, 0.2, 'lowpass', 1200, 0, d); this.tone(500, 0.15, 'triangle', 0.08, t + 0.04, d, 1.8); break;
      case 'bone': this.marimba(midi(84), t, 0.18, d); this.marimba(midi(91), t + 0.06, 0.14, d); break;
      case 'flint': [76, 79, 83].forEach((n, k) => this.marimba(midi(n), t + k * 0.05, 0.18, d)); break;
      case 'heart': [72, 76, 79, 84].forEach((n, k) => this.marimba(midi(n), t + k * 0.06, 0.2, d)); break;
      case 'artifact': [79, 83, 86, 91, 95].forEach((n, k) => this.marimba(midi(n), t + k * 0.07, 0.18, d)); this.pad([79, 83, 86], t, 0.9, 0.04, d); break;
      case 'oneup': [76, 79, 88, 84, 86, 91].forEach((n, k) => this.marimba(midi(n), t + k * 0.08, 0.2, d)); break;
      case 'throw': this.noise(t, 0.16, 0.2, 'bandpass', 2200, 500, d, 1.5); break;
      case 'hit': this.noise(t, 0.06, 0.3, 'highpass', 2000, 0, d); this.tone(170, 0.09, 'triangle', 0.15, t, d, 0.6); break;
      case 'hurt': this.tone(420, 0.25, 'sawtooth', 0.08, t, d, 0.5); this.noise(t, 0.15, 0.15, 'bandpass', 900, 300, d); break;
      case 'die': [72, 67, 64, 60, 55].forEach((n, k) => this.marimba(midi(n), t + 0.3 + k * 0.14, 0.2, d)); break;
      case 'spring': this.tone(140, 0.35, 'sine', 0.3, t, d, 4); this.noise(t, 0.12, 0.08, 'bandpass', 600, 2000, d); break;
      case 'bump': this.tone(110, 0.1, 'triangle', 0.3, t, d, 0.6); this.noise(t, 0.06, 0.18, 'lowpass', 600, 0, d); break;
      case 'crumble': this.noise(t, 0.45, 0.3, 'lowpass', 900, 120, d); break;
      case 'checkpoint': [67, 72, 76, 79].forEach((n, k) => this.marimba(midi(n), t + k * 0.09, 0.2, d)); break;
      case 'win': [72, 76, 79, 84, 79, 84, 88].forEach((n, k) => this.marimba(midi(n), t + k * 0.12, 0.22, d)); this.pad([72, 76, 79], t + 0.4, 1.6, 0.06, d); break;
      case 'hiss': this.noise(t, 0.45, 0.14, 'highpass', 4000, 7000, d); break;
      case 'screech': this.tone(1400, 0.4, 'sawtooth', 0.04, t, d, 0.55); this.tone(1800, 0.3, 'square', 0.02, t + 0.05, d, 0.6); break;
      case 'snort': this.noise(t, 0.2, 0.35, 'lowpass', 500, 180, d); this.noise(t + 0.24, 0.2, 0.35, 'lowpass', 500, 180, d); break;
      case 'click': this.marimba(midi(88), t, 0.1, d); break;
      case 'grab': this.noise(t, 0.1, 0.18, 'bandpass', 900, 400, d); this.tone(240, 0.08, 'triangle', 0.08, t, d, 1.5); break;
      // Plons: holle "bloop", spetterende ruis en druppels
      case 'splash': {
        const g = c.createGain(); this.env(g, t, 0.004, 0.35, 0.25); g.connect(d); this.osc('sine', 340, t, 0.28, g, 0.25);
        this.noise(t, 0.5, 0.45, 'lowpass', 3200, 400, d, 0.7);
        this.noise(t + 0.02, 0.25, 0.2, 'highpass', 4000, 0, d);
        for (let k = 0; k < 5; k++) this.tone(900 + Math.random() * 900, 0.06, 'sine', 0.05, t + 0.12 + k * 0.06 + Math.random() * 0.04, d, 1.5);
        break;
      }
      case 'plip': this.tone(700 + Math.random() * 300, 0.07, 'sine', 0.06, t, d, 1.6); this.noise(t, 0.08, 0.06, 'highpass', 3000, 0, d); break;
      case 'bubble': for (let k = 0; k < 3; k++) this.tone(300 + k * 120, 0.06, 'sine', 0.08, t + k * 0.07, d, 1.8); break;
      case 'snap': this.noise(t, 0.08, 0.4, 'lowpass', 1400, 0, d); this.tone(110, 0.12, 'square', 0.12, t, d, 0.5); break;
      case 'meet': this.pad([67, 71, 74], t, 1.2, 0.06, d); [67, 71, 74, 79].forEach((n, k) => this.marimba(midi(n), t + k * 0.1, 0.16, d)); break;
      case 'chatter': [900, 1150, 950].forEach((f, k) => this.tone(f, 0.05, 'square', 0.03, t + k * 0.06, d, 0.8)); break;
      case 'growl': this.noise(t, 0.55, 0.35, 'lowpass', 320, 110, d); this.tone(68, 0.5, 'sawtooth', 0.09, t, d, 0.8); break;
      case 'squeak': this.tone(2400, 0.08, 'square', 0.025, t, d, 1.3); this.tone(2600, 0.06, 'square', 0.025, t + 0.1, d, 1.2); break;
      case 'crack': this.noise(t, 0.15, 0.25, 'highpass', 1500, 0, d); break;
      case 'roar': this.noise(t, 1.2, 0.45, 'lowpass', 520, 110, d); this.tone(85, 1.1, 'sawtooth', 0.12, t, d, 0.6); this.tone(130, 0.9, 'sawtooth', 0.05, t, d, 0.6); break;
      case 'crash': this.noise(t, 0.45, 0.5, 'lowpass', 900, 90, d); this.tone(55, 0.35, 'sine', 0.35, t, d, 0.5); break;
      case 'bosshit': this.tone(300, 0.2, 'square', 0.1, t, d, 0.4); this.noise(t, 0.2, 0.35, 'bandpass', 1200, 300, d); break;
      case 'swing': this.noise(t, 0.14, 0.24, 'bandpass', 2600, 800, d, 1.6); break;
      case 'whoosh': this.noise(t, 0.24, 0.24, 'bandpass', 900, 300, d); this.noise(t + 0.03, 0.2, 0.1, 'highpass', 3000, 0, d); break;
      case 'break': this.noise(t, 0.35, 0.45, 'lowpass', 1500, 200, d); this.tone(130, 0.15, 'square', 0.1, t, d, 0.5); break;
      case 'sizzle': this.noise(t, 0.7, 0.3, 'highpass', 3000, 7000, d); break;
      case 'ignite': this.noise(t, 0.6, 0.3, 'bandpass', 700, 2200, d); [62, 67, 71, 74].forEach((n, k) => this.marimba(midi(n), t + 0.12 + k * 0.09, 0.15, d)); break;
      case 'windwarn': this.noise(t, 0.7, 0.1, 'bandpass', 600, 1500, d); break;
      case 'wind': this.noise(t, 1.8, 0.22, 'bandpass', 450, 1000, d, 0.6); break;
      case 'rumble': this.noise(t, 1.6, 0.4, 'lowpass', 180, 70, d); this.tone(42, 1.5, 'sine', 0.3, t, d, 0.9); break;
    }
  }
}

// Akkoorden per maat (MIDI), melodie in zestienden (0 = rust), bas als stap boven de grondtoon per zestiende.
const KICK4 = 'x...x...x...x...', SHAKE = '..x...x...x...x.', SLAP = '....x.......x...';
const SONGS = {
  savanna: { bpm: 104, swing: 0.12, lead: 'marimba', padVol: 0.045,
    chords: [[55, 59, 62], [60, 64, 67], [52, 55, 59], [57, 60, 64]],
    bass: [0, null, null, 7, null, null, 12, null, 0, null, 7, null, null, 5, null, null],
    melody: [67, 0, 71, 0, 74, 0, 72, 71, 72, 0, 74, 76, 79, 0, 0, 0, 76, 0, 74, 72, 71, 0, 72, 0, 74, 0, 71, 0, 67, 0, 0, 0,
             64, 0, 67, 0, 71, 0, 69, 67, 69, 0, 71, 72, 74, 0, 0, 0, 72, 0, 71, 69, 67, 0, 69, 0, 64, 0, 0, 0, 0, 0, 0, 0],
    arp: [0, null, 1, null, 2, null, 1, null, 0, null, 1, null, 2, null, 1, null],
    drums: { kick: KICK4, shaker: SHAKE, slap: SLAP, tom: '..............x.' } },
  gorge: { bpm: 98, swing: 0.1, lead: 'pluck', padVol: 0.05,
    chords: [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]],
    bass: [0, null, null, null, 7, null, null, null, 0, null, 12, null, 7, null, null, null],
    melody: [69, 0, 72, 0, 76, 0, 74, 0, 72, 0, 71, 0, 69, 0, 0, 0, 72, 0, 74, 0, 77, 0, 76, 74, 72, 0, 0, 0, 0, 0, 0, 0],
    arp: [0, null, null, 2, null, null, 1, null, 0, null, null, 2, null, 1, null, null],
    drums: { kick: 'x.......x.......', slap: SLAP, shaker: '..x..x..x..x..x.' } },
  forest: { bpm: 96, swing: 0.15, lead: 'marimba', padVol: 0.055,
    chords: [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]],
    bass: [0, null, null, null, null, null, 7, null, 0, null, null, null, 5, null, null, null],
    melody: [72, 0, 76, 79, 0, 0, 76, 0, 74, 0, 72, 0, 74, 76, 0, 0, 72, 0, 69, 0, 72, 0, 74, 0, 76, 0, 79, 0, 0, 0, 0, 0],
    arp: [0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 1],
    drums: { kick: 'x.......x.......', shaker: SHAKE, tom: '......x.......x.' } },
  cave: { bpm: 72, lead: 'pluck', padVol: 0.07,
    chords: [[45, 48, 52], [43, 47, 50], [41, 45, 48], [40, 44, 47]],
    bass: [0, null, null, null, null, null, null, null, 0, null, null, null, null, null, null, null],
    melody: [69, 0, 0, 0, 72, 0, 0, 0, 0, 0, 71, 0, 0, 0, 0, 0, 67, 0, 0, 0, 69, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    arp: [0, null, null, null, 2, null, null, null, 1, null, null, null, 2, null, null, null] },
  boss: { bpm: 140, lead: 'pluck', padVol: 0.05,
    chords: [[45, 48, 52], [45, 48, 52], [41, 45, 48], [43, 47, 50]],
    bass: [0, null, 0, null, 0, null, 0, 12, 0, null, 0, null, 0, null, 3, null],
    melody: [69, 0, 72, 69, 76, 0, 74, 72, 69, 0, 72, 69, 67, 0, 68, 0],
    drums: { kick: 'x...x...x...x.x.', tom: '..x...x...x...xx', clap: '....x.......x...', shaker: 'xxxxxxxxxxxxxxxx' } },
  title: { bpm: 84, swing: 0.1, lead: 'marimba', padVol: 0.06,
    chords: [[55, 59, 62], [52, 55, 59], [48, 52, 55], [50, 54, 57]],
    bass: [0, null, null, null, null, null, null, null, 7, null, null, null, null, null, null, null],
    melody: [67, 0, 0, 71, 74, 0, 72, 0, 71, 0, 0, 67, 69, 0, 0, 0, 64, 0, 0, 67, 71, 0, 69, 0, 67, 0, 0, 0, 0, 0, 0, 0],
    arp: [0, null, 1, null, 2, null, 1, null, 0, null, 1, null, 2, null, 1, null] },
  plains: { bpm: 112, swing: 0.1, lead: 'marimba', padVol: 0.045,
    chords: [[52, 56, 59], [57, 61, 64], [54, 57, 61], [59, 63, 66]],
    bass: [0, null, 7, null, 12, null, 7, null, 0, null, 7, null, 12, null, 10, null],
    melody: [64, 0, 68, 0, 71, 0, 73, 71, 69, 0, 71, 0, 73, 76, 0, 0, 73, 0, 71, 69, 68, 0, 69, 0, 71, 0, 68, 0, 64, 0, 0, 0],
    arp: [0, null, 1, 2, null, 1, null, 2, 0, null, 1, 2, null, 1, null, 2],
    drums: { kick: KICK4, slap: '....x..x....x...', shaker: 'x.xxx.xxx.xxx.xx' } },
  dmanisi: { bpm: 92, lead: 'pluck', padVol: 0.06,
    chords: [[50, 53, 57], [46, 50, 53], [48, 52, 55], [45, 49, 52]],
    bass: [0, null, null, null, 7, null, null, null, 0, null, null, null, 7, null, 5, null],
    melody: [62, 0, 65, 0, 69, 0, 67, 65, 64, 0, 65, 67, 69, 0, 0, 0, 70, 0, 69, 67, 65, 0, 64, 0, 62, 0, 0, 0, 0, 0, 0, 0],
    arp: [0, null, 2, null, 1, null, 2, null, 0, null, 2, null, 1, null, 2, null],
    drums: { kick: 'x.......x...x...', tom: '......x.......x.' } },
  java: { bpm: 108, swing: 0.08, lead: 'marimba', padVol: 0.05,
    chords: [[57, 60, 64], [55, 59, 62], [53, 57, 60], [52, 56, 59]],
    bass: [0, null, null, 7, null, null, 12, null, 0, null, null, 7, null, 10, null, null],
    melody: [69, 72, 76, 0, 74, 0, 72, 0, 74, 0, 69, 0, 67, 69, 0, 0, 69, 72, 76, 0, 79, 0, 76, 74, 72, 0, 74, 72, 69, 0, 0, 0],
    arp: [0, 2, 1, 2, 0, 2, 1, 2, 0, 2, 1, 2, 0, 2, 1, 2],
    drums: { kick: KICK4, slap: SLAP, shaker: SHAKE, tom: '...x......x.....' } },
  fire: { bpm: 80, lead: 'pluck', padVol: 0.07,
    chords: [[50, 53, 57], [48, 52, 55], [46, 50, 53], [45, 49, 52]],
    bass: [0, null, null, null, null, null, 7, null, 0, null, null, null, null, null, null, null],
    melody: [62, 0, 0, 65, 69, 0, 67, 0, 65, 0, 64, 0, 62, 0, 0, 0, 60, 0, 62, 0, 65, 0, 64, 62, 60, 0, 0, 57, 62, 0, 0, 0],
    arp: [0, null, null, 1, null, null, 2, null, 0, null, null, 1, null, 2, null, null],
    drums: { tom: 'x......x..x.....' } },
};

const AMBIENCE = {
  savanna: { every: 1.6, sounds: ['bird', 'bird', 'cricket', 'dove', 'wind'] },
  grassland: { every: 1.6, sounds: ['bird', 'cricket', 'cricket', 'dove', 'wind'] },
  gorge: { every: 1.8, sounds: ['bird', 'water', 'water', 'dove', 'cricket'] },
  forest: { every: 1.1, sounds: ['bird', 'bird', 'bird', 'cricket', 'monkey', 'dove'] },
  dmanisi: { every: 2.2, sounds: ['wind', 'wind', 'bird', 'cricket'] },
  java: { every: 1.3, sounds: ['bird', 'monkey', 'cricket', 'rumble', 'bird'] },
  cave: { every: 1.4, sounds: ['drip', 'drip', 'drip', 'rumble'] },
  dusk: { every: 1.2, sounds: ['cricket', 'cricket', 'dove'] },
};
