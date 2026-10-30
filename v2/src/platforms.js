import { TILE } from './config.js';
import { taper, mix, eye, groundShadow } from './art.js';

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
    c.translate(this.x + this.w / 2, this.top);
    c.scale(this.dir, 1);
    const o = '#1d2a14', body = '#4f6b2e', light = '#7d9a48';
    // Staart
    c.fillStyle = body; c.beginPath(); c.moveTo(-50, 4); c.quadraticCurveTo(-64, 2 + Math.sin(time * 4) * 3, -74, 6); c.quadraticCurveTo(-60, 10, -44, 10); c.closePath(); c.fill();
    // Rug met schubben
    c.fillStyle = o; c.beginPath(); c.roundRect(-52, -2, 82, 18, 9); c.fill();
    c.fillStyle = body; c.beginPath(); c.roundRect(-50, 0, 78, 14, 7); c.fill();
    c.fillStyle = light;
    for (let i = -44; i < 24; i += 9) { c.beginPath(); c.moveTo(i, 1); c.lineTo(i + 4, -4); c.lineTo(i + 8, 1); c.closePath(); c.fill(); }
    // Kop: onderkaak blijft liggen, bovenkaak klapt open
    const a = this.open * 0.85;
    c.fillStyle = o; c.beginPath(); c.roundRect(24, 4, 30, 10, 4); c.fill();
    c.fillStyle = '#c9b77a'; c.beginPath(); c.roundRect(26, 5, 26, 6, 3); c.fill();
    c.save(); c.translate(26, 4); c.rotate(-a);
    c.fillStyle = o; c.beginPath(); c.roundRect(-4, -10, 34, 13, 5); c.fill();
    c.fillStyle = body; c.beginPath(); c.roundRect(-2, -8, 30, 9, 4); c.fill();
    if (this.open > 0.1) { c.fillStyle = '#f2eedc'; for (let i = 2; i < 28; i += 5) { c.beginPath(); c.moveTo(i, 1); c.lineTo(i + 2, 5); c.lineTo(i + 4, 1); c.closePath(); c.fill(); } }
    // Oog: komt omhoog als waarschuwing
    const eyeUp = this.state === 'warn' || this.state === 'snap' ? 5 : 0;
    c.fillStyle = o; c.beginPath(); c.arc(4, -10 - eyeUp, 5, 0, Math.PI * 2); c.fill();
    c.fillStyle = this.state === 'stun' ? '#fff' : '#f2d94e'; c.beginPath(); c.arc(4, -10 - eyeUp, 3.2, 0, Math.PI * 2); c.fill();
    if (this.state !== 'stun') { c.fillStyle = '#111'; c.fillRect(3.4, -12.5 - eyeUp, 1.3, 5); }
    c.restore();
    if (this.open > 0.1) { c.fillStyle = '#b34b4b'; c.beginPath(); c.moveTo(28, 5); c.lineTo(28 + 26 * Math.cos(a), 5 - 26 * Math.sin(a)); c.lineTo(52, 5); c.closePath(); c.fill(); }
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
    c.fillStyle = '#2e2530'; c.beginPath(); c.ellipse(-6, 18, 50, 22, 0, Math.PI, 0); c.fill();
    c.fillStyle = '#6d5a6e'; c.beginPath(); c.ellipse(-6, 18, 47, 19, 0, Math.PI, 0); c.fill();
    c.fillStyle = '#8f7a8c'; c.beginPath(); c.ellipse(-12, 6, 26, 6, 0, 0, Math.PI * 2); c.fill();
    // Kop met oren, ogen en neusgaten net boven water
    c.fillStyle = '#2e2530'; c.beginPath(); c.ellipse(36, 14, 18, 13, 0, Math.PI, 0); c.fill();
    c.fillStyle = '#7b6679'; c.beginPath(); c.ellipse(36, 14, 16, 11, 0, Math.PI, 0); c.fill();
    const ear = this.state === 'warn' ? Math.sin(time * 25) * 0.5 : 0;
    for (const ex of [28, 40]) { c.save(); c.translate(ex, 3); c.rotate(ear); c.fillStyle = '#5a4858'; c.beginPath(); c.ellipse(0, -2, 3, 4, 0, 0, Math.PI * 2); c.fill(); c.restore(); }
    c.fillStyle = '#fff'; c.beginPath(); c.arc(32, 8, 2.6, 0, Math.PI * 2); c.arc(42, 8, 2.6, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#1a1018'; c.beginPath(); c.arc(32.6, 8.4, 1.3, 0, Math.PI * 2); c.arc(42.6, 8.4, 1.3, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#4a3a48'; c.beginPath(); c.arc(48, 12, 1.6, 0, Math.PI * 2); c.arc(52, 12, 1.6, 0, Math.PI * 2); c.fill();
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
    body(); c.lineWidth = 3; c.strokeStyle = o; c.stroke();
    const g = c.createLinearGradient(0, -4, 0, 56); g.addColorStop(0, light); g.addColorStop(0.5, skin); g.addColorStop(1, mix(skin, o, 0.4));
    body(); c.fillStyle = g; c.fill();
    c.strokeStyle = mix(skin, o, 0.3); c.lineWidth = 1; for (let i = -40; i < 40; i += 9) { c.beginPath(); c.moveTo(i, 10); c.quadraticCurveTo(i + 3, 26, i - 1, 44); c.stroke(); }
    leg(-38, 0, false); leg(22, Math.PI / 2, false);
    // Kop met oor, slurf en lange slagtanden
    const head = () => { c.beginPath(); c.ellipse(56, 24, 19, 18, 0, 0, Math.PI * 2); };
    head(); c.lineWidth = 3; c.strokeStyle = o; c.stroke();
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
