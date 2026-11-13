// Geluid van de savanne, helemaal opgewekt in de browser (geen geluidsbestanden).
// Wind, krekels, vogels, ritselend gras, voetstappen en korte geluidjes bij wat je doet.
import { settings } from './engine/settings.js';

export class Sound {
  constructor() { this.ctx = null; this.volume = settings.volume; }

  start() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain(); this.master.gain.value = this.volume;
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
    // spanning: een lage, zwevende dreun die aanzwelt als er gevaar is, en een hartslag
    this.drone = ctx.createGain(); this.drone.gain.value = 0;
    const df = ctx.createBiquadFilter(); df.type = 'lowpass'; df.frequency.value = 160; this.droneF = df;
    for (const f of [55, 55.7, 82.1]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(df); o.start(); }
    df.connect(this.drone).connect(this.out);
    this.heartT = 0; this.motifT = 25; this.danger = 0;
  }

  loop(freq, type, q, vol) {
    const src = this.ctx.createBufferSource(); src.buffer = this.noise; src.loop = true;
    const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = this.ctx.createGain(); g.gain.value = vol;
    src.connect(f).connect(g).connect(this.out); src.start();
    return { f, g };
  }

  // hoe hard alles klinkt (0 = stil, 1 = voluit); komt uit de instellingen
  setVolume(v) {
    this.volume = v;
    if (this.ctx) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.1);
  }

  // korte toon met een omhullende
  tone(freq, dur, vol, type = 'sine', slide = 0, when = 0, dest = this.out) {
    const c = this.ctx, t = c.currentTime + when;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.02, dur / 3)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest); o.start(t); o.stop(t + dur + 0.05);
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
  // danger: 0..1, hoe dichtbij het gevaar is
  tick(dt, { night, move, tall, senses, danger = 0 }) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.danger = danger;
    this.drone.gain.setTargetAtTime(danger < 0.15 ? 0 : 0.05 + danger * 0.16, now, 0.6);
    this.droneF.frequency.setTargetAtTime(120 + danger * 260, now, 0.5);
    // de hartslag gaat sneller naarmate het gevaar dichterbij is
    this.heartT -= dt;
    if (danger > 0.3 && this.heartT < 0) {
      this.heartT = 1.05 - danger * 0.6;
      this.tone(62, 0.13, 0.25 * danger, 'sine', -18); this.tone(54, 0.16, 0.18 * danger, 'sine', -14, 0.17);
    }
    // is alles rustig, dan klinkt af en toe een zacht wijsje (zoals een duimpiano)
    this.motifT -= dt;
    if (danger > 0.1) this.motifT = Math.max(this.motifT, 18);
    else if (this.motifT < 0 && night < 0.5) { this.motifT = 45 + Math.random() * 40; this.motif(); }
    this.gust -= dt;
    if (this.gust < 0) { this.gust = 1.5 + Math.random() * 3; this.wind.g.gain.setTargetAtTime(0.03 + Math.random() * 0.07, now, 1.2); this.wind.f.frequency.setTargetAtTime(250 + Math.random() * 250, now, 1.5); }
    this.rustle.g.gain.setTargetAtTime(Math.min(1, move / 5) * (tall ? 0.09 : 0.025), now, 0.08);
    this.muffle.frequency.setTargetAtTime(senses ? 900 : 18000, now, 0.25);

    // vogels overdag
    this.chirpT -= dt;
    if (this.chirpT < 0 && night < 0.5 && danger < 0.45) { this.chirpT = 1.5 + Math.random() * 5; this.bird(); }
    // in de verte roept af en toe een grotere vogel (zoals een neushoornvogel)
    this.callT -= dt;
    if (this.callT < 0 && night < 0.5) { this.callT = 25 + Math.random() * 30; for (let i = 0; i < 4; i++) this.tone(420 - i * 20, 0.18, 0.025, 'triangle', -60, i * 0.32); }
    // krekels, vooral 's avonds en 's nachts
    this.cricketT -= dt;
    if (this.cricketT < 0) {
      this.cricketT = 0.25 + Math.random() * 0.6;
      // bij groot gevaar vallen ze stil
      const v = (0.004 + night * 0.02) * (danger > 0.45 ? 0.15 : 1), f = 4200 + Math.random() * 600;
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
  // Een korte menselijke klank zonder woorden. Een stem is een zoemende stemband (zaagtand, licht bevend) met daarachter
  // een mondholte die bepaalde tonen versterkt (formanten). 'hm' = mond dicht, door de neus, tevreden omhoog en weer omlaag.
  // 'ugh' = mond open, kort en rauw, zakkend, met wat adem erachteraan.
  voice(kind, v = 1) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime + 0.02, ugh = kind === 'ugh';
    const dur = ugh ? 0.34 : 0.5, base = (ugh ? 128 : 118) * (0.96 + Math.random() * 0.08);
    const src = c.createGain(), o = c.createOscillator(); o.type = 'sawtooth';
    const f = o.frequency;
    if (ugh) { f.setValueAtTime(base * 1.1, t); f.exponentialRampToValueAtTime(base * 0.62, t + dur); }
    else { f.setValueAtTime(base * 0.94, t); f.linearRampToValueAtTime(base * 1.16, t + dur * 0.4); f.linearRampToValueAtTime(base * 0.86, t + dur); }
    // een stem is nooit strak: een lichte beving, en bij 'ugh' een kraak in de keel
    const vib = c.createOscillator(), vg = c.createGain(); vib.frequency.value = ugh ? 31 : 5.5; vg.gain.value = ugh ? 9 : 2.2;
    vib.connect(vg).connect(f); vib.start(t); vib.stop(t + dur + 0.1);
    o.connect(src); o.start(t); o.stop(t + dur + 0.1);
    // adem: een beetje ruis door dezelfde mond
    const n = c.createBufferSource(), ng = c.createGain(); n.buffer = this.noise;
    ng.gain.setValueAtTime(ugh ? 0.05 : 0.02, t); if (ugh) ng.gain.linearRampToValueAtTime(0.16, t + dur);
    n.connect(ng).connect(src); n.start(t, Math.random()); n.stop(t + dur + 0.1);
    const env = c.createGain(), peak = (ugh ? 0.075 : 0.06) * v;
    env.gain.setValueAtTime(0.0001, t); env.gain.exponentialRampToValueAtTime(peak, t + (ugh ? 0.035 : 0.09));
    env.gain.setValueAtTime(peak, t + dur * 0.55); env.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.06);
    // mondholte: [toon, scherpte, sterkte]
    const mouth = ugh ? [[620, 6, 1], [1180, 8, 0.5], [2400, 9, 0.16]] : [[260, 5, 1], [1050, 7, 0.1], [2200, 8, 0.04]];
    for (const [fr, q, g] of mouth) {
      const b = c.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = fr; b.Q.value = q;
      const bg = c.createGain(); bg.gain.value = g * 3;
      src.connect(b).connect(bg).connect(env);
    }
    env.connect(this.out);
  }
  bad() { if (!this.ctx) return; this.tone(220, 0.5, 0.06, 'sawtooth', -90); }
  good() { if (!this.ctx) return; [523, 659, 784].forEach((f, i) => this.tone(f, 0.25, 0.04, 'sine', 0, i * 0.09)); }
  discover() { if (!this.ctx) return; [587, 740, 880, 1175].forEach((f, i) => this.tone(f, 0.5, 0.045, 'sine', 0, i * 0.12)); }
  flee() {
    if (!this.ctx) return;
    this.burst(700, 0.35, 0.2, 'bandpass', 0, 1.5);   // snuiven van schrik
    for (let i = 0; i < 18; i++) this.burst(140, 0.06, 0.12 * (1 - i / 18), 'lowpass', 0.3 + i * 0.11 + Math.random() * 0.03);
  }
  flutter() { if (!this.ctx) return; for (let i = 0; i < 8; i++) this.burst(1200, 0.04, 0.06, 'bandpass', i * 0.035, 3); }
  // hyena: een stijgend "woe-oep" in de verte
  whoop() { if (!this.ctx) return; this.tone(260, 0.7, 0.07, 'triangle', 380); this.tone(300, 0.6, 0.04, 'sine', 420, 0.05); }
  // hyena: hoog, snel gegiechel
  giggle() { if (!this.ctx) return; const b = 700 + Math.random() * 200; for (let i = 0; i < 7; i++) this.tone(b + (i % 2) * 140, 0.07, 0.035, 'sawtooth', -60, i * 0.085); }
  yelp() { if (!this.ctx) return; this.tone(900, 0.25, 0.08, 'triangle', -500); this.tone(700, 0.3, 0.05, 'triangle', -400, 0.2); }
  // diep gegrom van een grote kat
  growl() { if (!this.ctx) return; this.burst(120, 0.8, 0.25, 'lowpass', 0, 2); this.tone(70, 0.8, 0.08, 'sawtooth', -10); }
  // alarmroep van vogels: scherp en herhaald
  alarm() { if (!this.ctx) return; for (let i = 0; i < 6; i++) this.tone(3200 - (i % 2) * 400, 0.06, 0.05, 'square', -300, i * 0.16); }
  bite() { if (!this.ctx) return; this.burst(500, 0.18, 0.4, 'bandpass', 0, 0.8); this.tone(160, 0.25, 0.12, 'sawtooth', -80); }
  whoosh() { if (!this.ctx) return; this.burst(1500, 0.3, 0.1, 'bandpass', 0, 0.6); }
  thud() { if (!this.ctx) return; this.burst(200, 0.15, 0.25, 'lowpass'); }
  knap() { if (!this.ctx) return; this.burst(3000, 0.08, 0.3, 'highpass'); this.burst(1800, 0.12, 0.2, 'bandpass', 0.05, 2); }
  // een paar zachte tonen uit een vijftonige ladder
  motif(base = 293.7, n = 5 + Math.floor(Math.random() * 3)) {
    if (!this.ctx) return;
    const scale = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3, 2, 9 / 4];
    let k = 2 + Math.floor(Math.random() * 3), t = 0;
    for (let i = 0; i < n; i++) {
      k = Math.max(0, Math.min(scale.length - 1, k + Math.floor(Math.random() * 5) - 2));
      const f = base * scale[k];
      this.tone(f, 0.9, 0.035, 'triangle', 0, t); this.tone(f * 2.01, 0.25, 0.012, 'sine', 0, t);
      t += Math.random() < 0.3 ? 0.56 : 0.28;
    }
  }
  // thuiskomen: een warm, stijgend loopje
  home() { if (!this.ctx) return; [293.7, 367, 440, 587].forEach((f, i) => { this.tone(f, 1.1, 0.04, 'triangle', 0, i * 0.2); this.tone(f * 2.01, 0.3, 0.012, 'sine', 0, i * 0.2); }); }
  // een grote kat brult
  roar(v = 1) {
    if (!this.ctx) return;
    this.burst(170, 1.3, 0.5 * v, 'lowpass', 0, 3); this.burst(420, 0.9, 0.12 * v, 'bandpass', 0.05, 2);
    this.tone(92, 1.2, 0.2 * v, 'sawtooth', -40); this.tone(61, 1.3, 0.16 * v, 'sawtooth', -18, 0.05);
  }
  // zebra's: een hoog, hikkend geblaf
  bray() { if (!this.ctx) return; for (let i = 0; i < 5; i++) { this.tone(520, 0.14, 0.06, 'square', 420, i * 0.24); this.tone(900, 0.08, 0.04, 'sawtooth', -300, i * 0.24 + 0.14); } }
  // er gebeurt iets groots in de verte
  sting() { if (!this.ctx) return; this.tone(98, 2.2, 0.12, 'sawtooth', -30); this.tone(147, 2.0, 0.07, 'triangle', -40, 0.1); this.burst(90, 1.5, 0.25, 'lowpass', 0, 1); }
  // rustig ademen: slapen
  sleep() { if (!this.ctx) return; [392, 330, 293.7, 220].forEach((f, i) => this.tone(f, 1.6, 0.04, 'sine', 0, i * 0.5)); }
  // een slang sist
  hiss(v = 1) { if (!this.ctx) return; this.burst(5200, 0.8, 0.1 * v, 'highpass'); this.burst(3400, 0.5, 0.05 * v, 'bandpass', 0.1, 2); }
  // bijen
  buzz(v = 1) { if (!this.ctx) return; this.tone(190 + Math.random() * 30, 0.5, 0.02 * v, 'sawtooth', 25); this.tone(385, 0.45, 0.008 * v, 'square', -30); }
  // een grote vogel krijst
  squawk(v = 1) { if (!this.ctx) return; this.tone(1500, 0.16, 0.06 * v, 'sawtooth', -700); this.tone(1100, 0.22, 0.05 * v, 'square', -500, 0.17); }
  // mensachtigen schreeuwen
  shout(v = 1) { if (!this.ctx) return; this.tone(330, 0.3, 0.07 * v, 'sawtooth', 160); this.tone(420, 0.35, 0.06 * v, 'sawtooth', -120, 0.32); this.tone(300, 0.25, 0.05 * v, 'triangle', 200, 0.5); }
  // de reus: een voetstap, een diep gerommel uit zijn buik, en zijn trompet
  stomp(v = 1) { if (!this.ctx) return; this.burst(70, 0.3, 0.5 * v, 'lowpass', 0, 1.5); this.tone(48, 0.28, 0.14 * v, 'sine', -18); }
  rumble(v = 1) { if (!this.ctx) return; this.tone(38, 2.4, 0.11 * v, 'sawtooth', 9); this.tone(57, 2.2, 0.06 * v, 'triangle', -6, 0.15); this.burst(60, 2.2, 0.2 * v, 'lowpass', 0, 2); }
  trumpet(v = 1) { if (!this.ctx) return; this.tone(420, 0.25, 0.07 * v, 'sawtooth', 330); this.tone(760, 1.0, 0.09 * v, 'sawtooth', -230, 0.22); this.tone(1130, 0.9, 0.04 * v, 'square', -340, 0.24); this.burst(900, 1.1, 0.14 * v, 'bandpass', 0.2, 3); }
  // je eigen lijf en je groep laten van zich horen
  belly() { if (!this.ctx) return; this.tone(74, 0.45, 0.1, 'sawtooth', -22); this.tone(52, 0.7, 0.09, 'sawtooth', 26, 0.4); this.burst(160, 0.5, 0.08, 'lowpass', 0.3, 2); }
  cry(v = 1) { if (!this.ctx) return; for (let i = 0; i < 3; i++) { this.tone(640, 0.45, 0.035 * v, 'triangle', -190, i * 0.6); this.tone(960, 0.4, 0.015 * v, 'sine', -280, i * 0.6); } }
  // iemand van de groep roept je, uit de richting waar die staat (pan: -1 links .. 1 rechts)
  call(pan = 0, child = false, v = 1) {
    if (!this.ctx) return;
    let d = this.out;
    if (this.ctx.createStereoPanner) { d = this.ctx.createStereoPanner(); d.pan.value = Math.max(-1, Math.min(1, pan)); d.connect(this.out); }
    if (child) { this.tone(720, 0.2, 0.07 * v, 'triangle', 260, 0, d); this.tone(900, 0.2, 0.07 * v, 'triangle', 220, 0.26, d); this.tone(760, 0.34, 0.06 * v, 'triangle', -230, 0.52, d); }
    else { this.tone(250, 0.34, 0.1 * v, 'sawtooth', 170, 0, d); this.tone(420, 0.5, 0.09 * v, 'sawtooth', -140, 0.34, d); this.tone(500, 0.3, 0.03 * v, 'sine', -120, 0.36, d); }
  }
  // een missie begint: twee doffe slagen op een holle stam en een open klank
  mission() { if (!this.ctx) return; this.burst(110, 0.3, 0.5, 'lowpass', 0, 2); this.burst(110, 0.3, 0.4, 'lowpass', 0.22, 2); this.tone(196, 1.4, 0.07, 'triangle', 0, 0.44); this.tone(293.7, 1.4, 0.05, 'triangle', 0, 0.44); }
  sense(on) { if (this.ctx && on) this.tone(110, 0.6, 0.05, 'sine', 30); }
}
