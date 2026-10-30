import { TILE } from './config.js';
import { taper, taper as tp, mix, mix as mixA, eye, eye as eyeA, groundShadow, paintLight } from './art.js';

// Bewegende dingen waar je op kunt staan. Elk heeft:
//  x, top, w            standvlak
//  dx, dy               verplaatsing in de laatste stap (de speler beweegt mee)
//  standable()          kun je er nu op staan?
//  hazard()             optioneel gevaarlijk vak (bek van de krokodil)

// Drijvende boomstam: vaart heen en weer tussen twee kolommen.
export class Log {
  constructor(e) {
    this.w = (e.len || 3) * TILE;
    this.x1 = e.from * TILE; this.x2 = (e.to + 1) * TILE - this.w;
    this.x = this.x1 + (e.offset || 0) * (this.x2 - this.x1);
    this.dir = 1; this.speed = e.speed || 55;
    this.base = e.y - 3;      // e.y = bovenkant van de waterrij; het oppervlak ligt 8 lager
    this.top = this.base; this.dx = 0; this.dy = 0; this.t = Math.random() * 6;
  }
  standable() { return true; }
  update(dt) {
    this.t += dt;
    const ox = this.x, oy = this.top;
    this.x += this.dir * this.speed * dt;
    if (this.x > this.x2) { this.x = this.x2; this.dir = -1; }
    if (this.x < this.x1) { this.x = this.x1; this.dir = 1; }
    this.top = this.base + Math.sin(this.t * 2.2) * 1.5;
    this.dx = this.x - ox; this.dy = this.top - oy;
  }
  draw(c) {
    const x = this.x, y = this.top, w = this.w;
    c.fillStyle = '#3e2a1a'; c.beginPath(); c.roundRect(x, y, w, 16, 8); c.fill();
    c.fillStyle = '#7a5534'; c.beginPath(); c.roundRect(x + 2, y + 2, w - 4, 11, 6); c.fill();
    c.fillStyle = '#a07345'; c.fillRect(x + 8, y + 3, w - 16, 2);
    c.strokeStyle = '#4c3220'; c.lineWidth = 1;
    for (let i = 14; i < w - 10; i += 22) { c.beginPath(); c.moveTo(x + i, y + 6); c.lineTo(x + i + 10, y + 7); c.stroke(); }
    c.fillStyle = '#c99a62'; c.beginPath(); c.ellipse(x + w - 3, y + 8, 3, 6, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#7fae3e'; c.beginPath(); c.ellipse(x + w * 0.3, y - 1, 6, 2.5, -0.3, 0, Math.PI * 2); c.fill();
  }
}

// Krokodil: zwemt heen en weer; zijn rug is een vlot, maar de kop bijt.
// Waarschuwing: ogen omhoog en belletjes, dan gaat de bek open.
export class Croc {
  constructor(e) {
    this.w = 104;
    this.x1 = e.from * TILE; this.x2 = (e.to + 1) * TILE - this.w;
    this.x = this.x1 + (e.offset || 0) * (this.x2 - this.x1);
    this.dir = e.dir || 1; this.speed = e.speed || 42;
    this.base = e.y - 6;
    this.top = this.base; this.dx = 0; this.dy = 0;
    this.state = 'swim'; this.timer = 1.5 + (e.offset || 0) * 2; this.open = 0; this.t = 0;
  }
  standable() { return true; }
  // De bek zit aan de voorkant (in de zwemrichting) en is alleen gevaarlijk als hij open is.
  headX() { return this.dir > 0 ? this.x + this.w - 30 : this.x; }
  hazard() { return this.open > 0.35 ? { x: this.headX() - 4, y: this.top - 26, w: 38, h: 34 } : null; }
  scare(game) { if (this.state === 'warn' || this.state === 'snap') { this.state = 'stun'; this.timer = 2; game.fx.stars(this.headX() + 15, this.top - 8); } }
  update(dt, game) {
    this.t += dt; this.timer -= dt;
    const ox = this.x, oy = this.top;
    const moving = this.state === 'swim' || this.state === 'stun';
    if (moving) {
      this.x += this.dir * this.speed * dt;
      if (this.x > this.x2) { this.x = this.x2; this.dir = -1; }
      if (this.x < this.x1) { this.x = this.x1; this.dir = 1; }
    }
    if (this.state === 'swim' && this.timer <= 0) { this.state = 'warn'; this.timer = 0.8; game.audio.play('bubble'); }
    else if (this.state === 'warn' && this.timer <= 0) { this.state = 'snap'; this.timer = 0.9; game.audio.play('snap'); }
    else if ((this.state === 'snap' || this.state === 'stun') && this.timer <= 0) { this.state = 'swim'; this.timer = 2.4 + Math.random(); }
    const target = this.state === 'snap' ? 1 : this.state === 'warn' ? 0.2 : 0;
    this.open += (target - this.open) * Math.min(1, dt * 14);
    if (this.state === 'warn' && Math.random() < dt * 12) game.fx.bubble(this.headX() + 15, this.base + 6);
    this.top = this.base + Math.sin(this.t * 1.8) * 1.2;
    this.dx = this.x - ox; this.dy = this.top - oy;
  }
  draw(c, time) {
    c.save();
    c.translate(this.x + this.w / 2, this.top); c.scale(this.dir, 1);
    const o = '#172210', body = '#4f6e2c', light = '#7e9e48', belly = '#c8be7a';
    // Staart die zwiept
    const sw = Math.sin(time * 4 + this.t) * 4;
    c.fillStyle = o; tp(c, -42, 6, -76, 8 + sw, 14, 3); c.fill(); c.fillStyle = body; tp(c, -42, 6, -76, 8 + sw, 11, 1.6); c.fill();
    for (let i = 0; i < 5; i++) { const t = i / 5, x = -46 - t * 26, y = 2 + t * (sw * 0.8); c.fillStyle = light; c.beginPath(); c.moveTo(x - 2, y); c.lineTo(x, y - 4 + t * 2); c.lineTo(x + 2, y); c.fill(); }
    // Lijf met schubbenrijen
    const bodyP = () => { c.beginPath(); c.moveTo(-46, 10); c.bezierCurveTo(-46, -4, -20, -4, 0, -3); c.bezierCurveTo(16, -2, 26, 0, 30, 6); c.bezierCurveTo(26, 15, -20, 17, -46, 10); c.closePath(); };
    bodyP(); c.lineWidth = 1.2; c.strokeStyle = mixA(o, body, 0.3); c.stroke();
    const g = c.createLinearGradient(0, -4, 0, 16); g.addColorStop(0, light); g.addColorStop(0.5, body); g.addColorStop(1, mixA(body, o, 0.4));
    bodyP(); c.fillStyle = g; c.fill();
    c.save(); bodyP(); c.clip(); bodyP(); paintLight(c, -8, 5, 34, 10, mixA(light, '#ffffff', 0.3), mixA(body, o, 0.6), 0); c.restore();
    c.fillStyle = mixA(light, '#ffffff', 0.15);
    for (let i = -40; i < 22; i += 7) { c.beginPath(); c.moveTo(i - 3, -2); c.lineTo(i, -7); c.lineTo(i + 3, -2); c.closePath(); c.fill(); }
    c.strokeStyle = mixA(body, o, 0.5); c.lineWidth = 1; for (let i = -38; i < 24; i += 6) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, 10); c.stroke(); }
    // Onderkaak en bovenkaak die openklapt
    const a = this.open * 0.85;
    c.fillStyle = o; c.beginPath(); c.roundRect(24, 4, 34, 10, 5); c.fill();
    c.fillStyle = belly; c.beginPath(); c.roundRect(26, 5, 30, 7, 3.5); c.fill();
    if (this.open > 0.1) { c.fillStyle = '#b84a4a'; c.beginPath(); c.moveTo(27, 5); c.lineTo(27 + 30 * Math.cos(a), 5 - 30 * Math.sin(a)); c.lineTo(56, 5); c.closePath(); c.fill(); }
    c.save(); c.translate(26, 4); c.rotate(-a);
    const jaw = () => { c.beginPath(); c.moveTo(-4, 2); c.bezierCurveTo(-4, -10, 20, -10, 33, -3); c.quadraticCurveTo(35, 1, 31, 2); c.closePath(); };
    jaw(); c.lineWidth = 1.1; c.strokeStyle = mixA(o, body, 0.3); c.stroke();
    const jg = c.createLinearGradient(0, -9, 0, 2); jg.addColorStop(0, light); jg.addColorStop(1, body); jaw(); c.fillStyle = jg; c.fill();
    c.fillStyle = '#f4f0dc'; for (let i = 3; i < 30; i += 4.5) { c.beginPath(); c.moveTo(i, 1); c.lineTo(i + 1.6, 4.5); c.lineTo(i + 3.2, 1); c.fill(); }
    c.fillStyle = o; c.beginPath(); c.arc(31, -4, 1.2, 0, Math.PI * 2); c.fill();
    const eyeUp = this.state === 'warn' || this.state === 'snap' ? 5 : 0;
    c.fillStyle = o; c.beginPath(); c.ellipse(5, -8 - eyeUp, 6, 5, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = light; c.beginPath(); c.ellipse(5, -8 - eyeUp, 4.8, 3.8, 0, 0, Math.PI * 2); c.fill();
    eyeA(c, 5.5, -9 - eyeUp, 2.4, this.state === 'stun' ? '#ffffff' : '#e8cc30', this.state === 'stun' ? 0.2 : 1, this.state !== 'swim');
    c.restore();
    c.restore();
  }

}

// Nijlpaard: komt boven (je kunt op zijn rug staan) en zakt na waarschuwing weer onder.
export class Hippo {
  constructor(e) {
    this.w = 92; this.x = e.x - this.w / 2;
    this.surface = e.y + 8; this.up = this.surface - 22; this.down = this.surface + 26;
    this.top = this.down; this.dx = 0; this.dy = 0;
    this.state = 'down'; this.timer = e.delay ?? 1; this.t = 0;
  }
  standable() { return this.top < this.surface - 6; }
  update(dt, game) {
    this.t += dt; this.timer -= dt;
    const oy = this.top;
    if (this.state === 'down' && this.timer <= 0) { this.state = 'rise'; game.fx.bubble(this.x + this.w / 2, this.surface); }
    else if (this.state === 'rise') { this.top -= 90 * dt; if (this.top <= this.up) { this.top = this.up; this.state = 'up'; this.timer = 2.8; } }
    else if (this.state === 'up' && this.timer <= 0) { this.state = 'warn'; this.timer = 0.9; game.audio.play('bubble'); }
    else if (this.state === 'warn') { if (Math.random() < dt * 14) game.fx.bubble(this.x + Math.random() * this.w, this.surface + 2); if (this.timer <= 0) this.state = 'sink'; }
    else if (this.state === 'sink') { this.top += 70 * dt; if (this.top >= this.down) { this.top = this.down; this.state = 'down'; this.timer = 1.5; } }
    this.top += this.state === 'up' ? Math.sin(this.t * 2) * 0.05 : 0;
    this.dx = 0; this.dy = this.top - oy;
  }
  draw(c, time) {
    const x = this.x, y = this.top, w = this.w;
    const wob = this.state === 'warn' ? Math.sin(time * 30) * 1.5 : 0;
    c.save(); c.translate(x + w / 2 + wob, y);
    const o = '#2a2028', body = '#7a6674', light = '#a8909c', pink = '#d89aa0';
    const back = () => { c.beginPath(); c.ellipse(-6, 20, 50, 23, 0, Math.PI, 0); c.closePath(); };
    back(); c.lineWidth = 1.2; c.strokeStyle = mixA(o, body, 0.3); c.stroke();
    const g = c.createLinearGradient(0, -4, 0, 20); g.addColorStop(0, light); g.addColorStop(1, body); back(); c.fillStyle = g; c.fill();
    back(); paintLight(c, -6, 10, 46, 14, mixA(light, '#ffffff', 0.35), mixA(body, o, 0.5), 0);
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.ellipse(-16, 3, 20, 3.5, -0.05, 0, Math.PI * 2); c.fill();
    // Kop met roze wangen, neusgaten en oren die wiebelen
    const head = () => { c.beginPath(); c.ellipse(36, 15, 19, 14, 0, Math.PI, 0); c.closePath(); };
    head(); c.lineWidth = 1.2; c.strokeStyle = mixA(o, body, 0.3); c.stroke(); head(); c.fillStyle = g; c.fill(); head(); paintLight(c, 36, 8, 18, 10, mixA(light, '#ffffff', 0.35), mixA(body, o, 0.5), 0);
    c.fillStyle = pink; c.globalAlpha = 0.55; c.beginPath(); c.ellipse(46, 13, 6, 3, 0, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1;
    const ear = this.state === 'warn' ? Math.sin(time * 25) * 0.5 : Math.sin(time * 2) * 0.15;
    for (const ex of [26, 38]) { c.save(); c.translate(ex, 2); c.rotate(ear); c.fillStyle = o; c.beginPath(); c.ellipse(0, -2, 3.6, 4.6, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = pink; c.beginPath(); c.ellipse(0, -2, 2, 3, 0, 0, Math.PI * 2); c.fill(); c.restore(); }
    eyeA(c, 31, 7, 3, '#3a2010', this.state === 'sink' ? 0.3 : 1); eyeA(c, 41, 7, 3, '#3a2010', this.state === 'sink' ? 0.3 : 1);
    c.fillStyle = o; c.beginPath(); c.ellipse(50, 10, 1.6, 1.2, 0, 0, Math.PI * 2); c.ellipse(54, 10, 1.6, 1.2, 0, 0, Math.PI * 2); c.fill();
    c.restore();
  }

}

// Stegodon (Java): een uitgestorven slurfdier dat rustig heen en weer loopt; je kunt op zijn rug meerijden
export class Stegodon extends Log {
  constructor(e) {
    super({ ...e, len: 4 });
    this.w = 116; this.x2 = (e.to + 1) * TILE - this.w;
    this.x = this.x1 + (e.offset || 0) * (this.x2 - this.x1);
    this.speed = e.speed || 45;
    this.base = e.y - 76;   // e.y = maaiveld
  }
  update(dt) { super.update(dt); this.top = this.base + Math.abs(Math.sin(this.t * 4)) * -1.5; }
  draw(c, time) {
    const x = this.x, y = this.top, w = this.w, d = this.dir;
    groundShadow(c, x + w / 2, y + 78, 62, 0.25);
    c.save(); c.translate(x + w / 2, y); c.scale(d, 1);
    const o = '#2a2420', skin = '#857a70', light = '#aaa094', ph = this.t * 4;
    const leg = (lx, off, far) => {
      const s = Math.sin(ph + off) * 6;
      c.fillStyle = o; taper(c, lx, 34, lx + s * 0.5, 74, 17, 14); c.fill();
      c.fillStyle = far ? mix(skin, o, 0.35) : skin; taper(c, lx, 34, lx + s * 0.5, 74, 14, 11); c.fill();
      c.fillStyle = mix(skin, '#ffffff', 0.25); c.beginPath(); c.ellipse(lx + s * 0.5, 76, 7, 2.5, 0, 0, Math.PI * 2); c.fill();
    };
    leg(-22, Math.PI, true); leg(38, Math.PI * 1.5, true);
    const body = () => { c.beginPath(); c.ellipse(0, 26, 57, 30, 0, 0, Math.PI * 2); };
    body(); c.lineWidth = 1.3; c.strokeStyle = mixA(o, skin, 0.3); c.stroke();
    const g = c.createLinearGradient(0, -4, 0, 56); g.addColorStop(0, light); g.addColorStop(0.5, skin); g.addColorStop(1, mix(skin, o, 0.4));
    body(); c.fillStyle = g; c.fill();
    body(); paintLight(c, -4, 18, 52, 26, mix(light, '#ffffff', 0.3), mix(skin, o, 0.5), 60, 3);
    c.strokeStyle = mix(skin, o, 0.3); c.lineWidth = 1; for (let i = -40; i < 40; i += 9) { c.beginPath(); c.moveTo(i, 10); c.quadraticCurveTo(i + 3, 26, i - 1, 44); c.stroke(); }
    leg(-38, 0, false); leg(22, Math.PI / 2, false);
    // Kop met oor, slurf en lange slagtanden
    const head = () => { c.beginPath(); c.ellipse(56, 24, 19, 18, 0, 0, Math.PI * 2); };
    head(); c.lineWidth = 1.3; c.strokeStyle = mixA(o, skin, 0.3); c.stroke();
    const hg = c.createLinearGradient(40, 6, 70, 42); hg.addColorStop(0, light); hg.addColorStop(1, skin); head(); c.fillStyle = hg; c.fill();
    c.fillStyle = mix(skin, o, 0.25); c.beginPath(); c.ellipse(44, 26, 11, 15, -0.2, 0, Math.PI * 2); c.fill();
    c.strokeStyle = o; c.lineWidth = 10; c.lineCap = 'round'; c.beginPath(); c.moveTo(68, 32); c.quadraticCurveTo(80, 54 + Math.sin(ph) * 4, 72, 72); c.stroke();
    c.strokeStyle = skin; c.lineWidth = 7; c.beginPath(); c.moveTo(68, 32); c.quadraticCurveTo(80, 54 + Math.sin(ph) * 4, 72, 72); c.stroke();
    c.strokeStyle = o; c.lineWidth = 7; c.beginPath(); c.moveTo(62, 40); c.quadraticCurveTo(90, 54, 99, 34); c.stroke();
    c.strokeStyle = '#f6eedc'; c.lineWidth = 4.5; c.beginPath(); c.moveTo(62, 40); c.quadraticCurveTo(90, 54, 99, 34); c.stroke();
    eye(c, 61, 18, 2.6, '#3a2a1a', 1);
    c.restore();
  }

}

export const PLATFORM_TYPES = { log: Log, croc: Croc, hippo: Hippo, stegodon: Stegodon };
