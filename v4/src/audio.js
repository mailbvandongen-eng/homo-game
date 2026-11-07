// Geluid van de savanne, helemaal opgewekt in de browser (geen geluidsbestanden).
// Wind, krekels, vogels, ritselend gras, voetstappen en korte geluidjes bij wat je doet.
export class Sound {
  constructor() { this.ctx = null; this.muted = localStorage.getItem('homo4-mute') === '1'; }

  start() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain(); this.master.gain.value = this.muted ? 0 : 0.9;
    // bij de zintuigen klinkt de wereld gedempt
    this.muffle = ctx.createBiquadFilter(); this.muffle.type = 'lowpass'; this.muffle.frequency.value = 18000;
    this.muffle.connect(this.master); this.master.connect(ctx.destination);
    this.out = this.muffle;

    const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;

    // wind: gefilterde ruis die aanzwelt en wegzakt
    this.wind = this.loop(320, 'lowpass', 0.5, 0.05);
    // gras: ritselt als je loopt
    this.rustle = this.loop(2600, 'bandpass', 0.7, 0);
    this.gust = 0; this.chirpT = 2; this.cricketT = 1; this.callT = 20;
  }

  loop(freq, type, q, vol) {
    const src = this.ctx.createBufferSource(); src.buffer = this.noise; src.loop = true;
    const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = this.ctx.createGain(); g.gain.value = vol;
    src.connect(f).connect(g).connect(this.out); src.start();
    return { f, g };
  }

  setMuted(m) {
    this.muted = m; localStorage.setItem('homo4-mute', m ? '1' : '0');
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.1);
  }

  // korte toon met een omhullende
  tone(freq, dur, vol, type = 'sine', slide = 0, when = 0) {
    const c = this.ctx, t = c.currentTime + when;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.02, dur / 3)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.out); o.start(t); o.stop(t + dur + 0.05);
  }
  // korte ruisstoot
  burst(freq, dur, vol, type = 'bandpass', when = 0, q = 1) {
    const c = this.ctx, t = c.currentTime + when;
    const s = c.createBufferSource(); s.buffer = this.noise;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.out); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }

  // elke frame: achtergrondgeluiden bijwerken
  // night: 0..1, move: snelheid, tall: in hoog gras, senses: zintuigen aan
  tick(dt, { night, move, tall, senses }) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.gust -= dt;
    if (this.gust < 0) { this.gust = 1.5 + Math.random() * 3; this.wind.g.gain.setTargetAtTime(0.03 + Math.random() * 0.07, now, 1.2); this.wind.f.frequency.setTargetAtTime(250 + Math.random() * 250, now, 1.5); }
    this.rustle.g.gain.setTargetAtTime(Math.min(1, move / 5) * (tall ? 0.09 : 0.025), now, 0.08);
    this.muffle.frequency.setTargetAtTime(senses ? 900 : 18000, now, 0.25);

    // vogels overdag
    this.chirpT -= dt;
    if (this.chirpT < 0 && night < 0.5) { this.chirpT = 1.5 + Math.random() * 5; this.bird(); }
    // in de verte roept af en toe een grotere vogel (zoals een neushoornvogel)
    this.callT -= dt;
    if (this.callT < 0 && night < 0.5) { this.callT = 25 + Math.random() * 30; for (let i = 0; i < 4; i++) this.tone(420 - i * 20, 0.18, 0.025, 'triangle', -60, i * 0.32); }
    // krekels, vooral 's avonds en 's nachts
    this.cricketT -= dt;
    if (this.cricketT < 0) {
      this.cricketT = 0.25 + Math.random() * 0.6;
      const v = 0.004 + night * 0.02, f = 4200 + Math.random() * 600;
      for (let i = 0; i < 3; i++) this.tone(f, 0.03, v, 'sine', 0, i * 0.045);
    }
  }

  bird() {
    const base = 2200 + Math.random() * 1600, n = 2 + Math.floor(Math.random() * 4), v = 0.012 + Math.random() * 0.02;
    for (let i = 0; i < n; i++) this.tone(base + (i % 2) * 400, 0.08 + Math.random() * 0.05, v, 'sine', (Math.random() - 0.3) * 900, i * 0.13);
  }

  step(tall) { if (this.ctx) this.burst(tall ? 1800 : 260, tall ? 0.12 : 0.07, tall ? 0.05 : 0.08, tall ? 'bandpass' : 'lowpass'); }
  pick() { if (!this.ctx) return; this.burst(2200, 0.15, 0.08); this.tone(520, 0.08, 0.03, 'triangle', 120, 0.05); }
  eat() { if (!this.ctx) return; for (let i = 0; i < 4; i++) this.burst(1400 + Math.random() * 800, 0.06, 0.09, 'bandpass', i * 0.13, 2); }
  crack() { if (!this.ctx) return; this.burst(900, 0.25, 0.35, 'bandpass', 0, 0.7); this.tone(180, 0.2, 0.15, 'triangle', -100); }
  bad() { if (!this.ctx) return; this.tone(220, 0.5, 0.06, 'sawtooth', -90); }
  good() { if (!this.ctx) return; [523, 659, 784].forEach((f, i) => this.tone(f, 0.25, 0.04, 'sine', 0, i * 0.09)); }
  discover() { if (!this.ctx) return; [587, 740, 880, 1175].forEach((f, i) => this.tone(f, 0.5, 0.045, 'sine', 0, i * 0.12)); }
  flee() {
    if (!this.ctx) return;
    this.burst(700, 0.35, 0.2, 'bandpass', 0, 1.5);   // snuiven van schrik
    for (let i = 0; i < 18; i++) this.burst(140, 0.06, 0.12 * (1 - i / 18), 'lowpass', 0.3 + i * 0.11 + Math.random() * 0.03);
  }
  flutter() { if (!this.ctx) return; for (let i = 0; i < 8; i++) this.burst(1200, 0.04, 0.06, 'bandpass', i * 0.035, 3); }
  sense(on) { if (this.ctx && on) this.tone(110, 0.6, 0.05, 'sine', 30); }
}
