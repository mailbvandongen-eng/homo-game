import { TILE } from './config.js';
import { moveBody } from './level.js';
import { Stalactite } from './enemies.js';

// Reuzenhyena (Pachycrocuta brevirostris): zo groot als een leeuw.
// Eerlijk patroon: altijd eerst een waarschuwing, daarna een herstelmoment waarin je kunt raken.
//  Fase 1: grommen → stormloop → knalt tegen de wand → versuft (spring erop!)
//  Fase 2: ook een sprong naar je toe; na de landing even versuft
//  Fase 3: sneller, en na een botsing vallen er stenen van het plafond (schaduw = waarschuwing)
export class GiantHyena {
  constructor(x, y, arena) {
    this.w = 84; this.h = 52;
    this.x = x - this.w / 2; this.y = y - this.h;
    this.vx = 0; this.vy = 0; this.dir = -1;
    this.arena = arena;            // {x1, x2} in pixels
    this.hits = 0; this.maxHits = 3;
    this.state = 'sleep'; this.timer = 0; this.t = 0;
    this.invuln = 0; this.active = false; this.gone = false; this.fleeing = false;
    this.stompable = true; this.isBoss = true;
    this.name = 'Reuzenhyena';
    this.title = 'REUZENHYENA · Pachycrocuta';
    this.rocks = true;
  }
  get cx() { return this.x + this.w / 2; }
  get phase() { return this.hits + 1; }
  hitbox() { return { x: this.x + 8, y: this.y + 10, w: this.w - 16, h: this.h - 10 }; }
  harmful() { return !this.fleeing && this.state !== 'sleep' && this.state !== 'dazed' && this.state !== 'hurt'; }
  vulnerable() { return this.state === 'dazed' && this.invuln <= 0; }

  wake(game) { this.state = 'roar'; this.timer = 1.4; game.audio.play('roar'); game.shake(8); }

  // Gestompt terwijl hij versuft is: raak!
  stomp(game) {
    if (!this.vulnerable()) return false;
    this.hits++; this.invuln = 1.2; game.audio.play('bosshit'); game.shake(6); game.fx.stars(this.cx, this.y + 10);
    if (this.hits >= this.maxHits) { this.state = 'flee'; this.fleeing = true; this.timer = 0; game.bossDefeated(this); }
    else {
      this.state = 'hurt'; this.timer = 0.9; this.vx = 0;
      // Na de tweede treffer valt er een vijg van een richel: een extra hartje voor de laatste fase
      if (this.hits === 2) { const fx = (this.arena.x1 + this.arena.x2) / 2; game.pickups.push({ type: 'fig', x: fx, y: this.y + this.h - 18, taken: false, pop: 0 }); game.fx.sparkle(fx, this.y + this.h - 18, '#ff9ccf'); }
    }
    return true;
  }
  // Een steen onderbreekt het grommen: dan staat hij even versuft
  scare(dir, game) {
    if (this.state === 'growl' || this.state === 'aim') { this.state = 'dazed'; this.timer = 1.1; game.fx.stars(this.cx, this.y + 6); game.audio.play('hit'); }
  }

  update(dt, game) {
    this.t += dt; this.timer -= dt; this.invuln = Math.max(0, this.invuln - dt);
    const p = game.player, speed = [0, 300, 340, 390][Math.min(3, this.phase)];
    const ground = () => { this.vy = Math.min(this.vy + 1900 * dt, 800); return moveBody(this, dt, game.map); };
    switch (this.state) {
      case 'sleep': ground(); break;
      case 'roar': this.vx = 0; ground(); if (this.timer <= 0) this.next(game); break;
      case 'stalk': {
        this.dir = Math.sign(p.cx - this.cx) || this.dir;
        this.vx = this.dir * 70; ground();
        if (this.timer <= 0) { this.state = this.phase >= 2 && Math.random() < 0.45 ? 'aim' : 'growl'; this.timer = this.phase >= 3 ? 0.7 : 0.85; game.audio.play('growl'); }
        break;
      }
      case 'growl':
        this.vx = 0; ground();
        if (Math.random() < dt * 18) game.fx.dust(this.cx - this.dir * 30, this.y + this.h, -this.dir, 1);
        if (this.timer <= 0) { this.state = 'charge'; this.timer = 4; }
        break;
      case 'charge': {
        this.vx = this.dir * speed;
        const r = ground();
        if (Math.random() < dt * 20) game.fx.dust(this.cx - this.dir * 30, this.y + this.h, -this.dir, 1);
        const hitWall = r.wall || this.x <= this.arena.x1 + 2 || this.x + this.w >= this.arena.x2 - 2;
        if (hitWall) {
          this.x = Math.max(this.arena.x1 + 2, Math.min(this.arena.x2 - 2 - this.w, this.x));
          this.state = 'dazed'; this.timer = this.phase >= 3 ? 1.6 : 2; this.vx = 0;
          game.shake(9); game.audio.play('crash'); game.fx.debris(this.cx + this.dir * 40, this.y + 10);
          if (this.phase >= 3 && this.rocks) this.dropRocks(game);
        } else if (this.timer <= 0) { this.state = 'stalk'; this.timer = 0.8; }
        break;
      }
      case 'aim':
        this.vx = 0; ground(); this.dir = Math.sign(p.cx - this.cx) || this.dir;
        if (this.timer <= 0) {
          const t = 0.85; this.vx = Math.max(-420, Math.min(420, (p.cx - this.cx) / t)); this.vy = -640;
          this.state = 'leap'; this.air = 0; game.audio.play('jump');
        }
        break;
      case 'leap': {
        this.air += dt;
        this.vy = Math.min(this.vy + 1500 * dt, 800);
        const r = moveBody(this, dt, game.map);
        this.x = Math.max(this.arena.x1 + 2, Math.min(this.arena.x2 - 2 - this.w, this.x));
        if (r.landed && this.air > 0.15) { this.state = 'dazed'; this.timer = 1.2; this.vx = 0; game.shake(7); game.fx.dust(this.cx, this.y + this.h, 0, 10); game.audio.play('crash'); }
        break;
      }
      case 'dazed': this.vx = 0; ground(); if (this.timer <= 0) { this.state = 'stalk'; this.timer = 0.9; } break;
      case 'hurt': this.vx = -this.dir * 60; ground(); if (this.timer <= 0) { this.state = 'roar'; this.timer = 0.8; game.audio.play('roar'); } break;
      case 'flee':
        // Verjaagd: rent de grot uit (de uitgang gaat open)
        this.dir = 1; this.vx = 380; this.x += this.vx * dt; this.vy = 0;
        if (this.x > this.arena.x2 + 400) this.gone = true;
        break;
    }
  }
  next(game) { this.state = 'stalk'; this.timer = 0.9; }

  dropRocks(game) {
    const p = game.player;
    const xs = [p.cx, p.cx + (Math.random() < 0.5 ? -1 : 1) * (110 + Math.random() * 60)];
    for (const x of xs) {
      const cx = Math.max(this.arena.x1 + 30, Math.min(this.arena.x2 - 30, x));
      const s = new Stalactite(cx, 0, { ceil: this.arena.ceil, falling: true });
      s.groundY = this.y + this.h; s.active = true;
      game.enemies.push(s);
    }
  }

  draw(c, time) {
    const blink = this.invuln > 0 && Math.floor(time * 14) % 2 === 0;
    if (blink) return;
    c.save();
    c.translate(Math.round(this.cx), Math.round(this.y + this.h));
    c.scale(this.dir, 1);
    const o = '#22180f', coat = '#9c7a4c', spot = '#4e3820';
    const charging = this.state === 'charge', low = this.state === 'growl' || this.state === 'aim';
    const ph = this.t * (charging ? 22 : 7);
    if (this.state === 'leap') c.rotate(Math.max(-0.3, Math.min(0.3, this.vy / 2000)));
    if (this.state === 'dazed') c.rotate(Math.sin(time * 8) * 0.05);
    // Poten
    for (const [lx, off] of [[-30, 0], [-22, Math.PI], [20, Math.PI / 2], [28, Math.PI * 1.5]]) {
      const s = (this.vx !== 0 ? Math.sin(ph + off) : 0) * (charging ? 9 : 5);
      c.strokeStyle = o; c.lineWidth = 9; c.lineCap = 'round';
      c.beginPath(); c.moveTo(lx, -26); c.lineTo(lx + s, -2); c.stroke();
      c.strokeStyle = '#7d6040'; c.lineWidth = 5;
      c.beginPath(); c.moveTo(lx, -26); c.lineTo(lx + s, -2); c.stroke();
    }
    // Romp: hoge schouders
    c.fillStyle = o;
    c.beginPath(); c.moveTo(-40, -24); c.quadraticCurveTo(-38, -40, -18, -40); c.quadraticCurveTo(8, -54, 30, -50);
    c.quadraticCurveTo(44, -44, 40, -24); c.quadraticCurveTo(0, -14, -40, -24); c.fill();
    c.fillStyle = coat;
    c.beginPath(); c.moveTo(-37, -25); c.quadraticCurveTo(-35, -37, -18, -37); c.quadraticCurveTo(8, -50, 29, -47);
    c.quadraticCurveTo(41, -42, 37, -25); c.quadraticCurveTo(0, -17, -37, -25); c.fill();
    c.fillStyle = spot;
    for (const [sx, sy] of [[-26, -30], [-14, -36], [-2, -31], [8, -41], [18, -35], [-20, -26], [26, -40]]) { c.beginPath(); c.arc(sx, sy, 2.8, 0, Math.PI * 2); c.fill(); }
    // Manen
    c.fillStyle = '#3d2a17';
    c.beginPath(); c.moveTo(4, -50); for (let i = 0; i < 6; i++) { c.lineTo(8 + i * 5, -58 - (i % 2) * 4); c.lineTo(10 + i * 5, -51); } c.lineTo(36, -46); c.closePath(); c.fill();
    // Kop
    const hy = low ? -30 : -40;
    c.fillStyle = o; c.beginPath(); c.ellipse(46, hy, 15, 13, 0.25, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(58, hy + 6, 10, 7, 0.2, 0, Math.PI * 2); c.fill();
    c.fillStyle = coat; c.beginPath(); c.ellipse(46, hy, 13, 11, 0.25, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#4a3523'; c.beginPath(); c.ellipse(58, hy + 6, 8, 5.4, 0.2, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#1a1009'; c.beginPath(); c.arc(65, hy + 5, 2.6, 0, Math.PI * 2); c.fill();
    if (low || charging || this.state === 'roar') {
      c.fillStyle = '#5a1f18'; c.beginPath(); c.ellipse(57, hy + 12, 7, 4, 0.2, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#f2eedc'; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(51 + i * 3.5, hy + 9); c.lineTo(52.5 + i * 3.5, hy + 13); c.lineTo(54 + i * 3.5, hy + 9); c.fill(); }
    }
    c.fillStyle = '#5c4129'; c.beginPath(); c.ellipse(38, hy - 13, 5, 7, -0.3, 0, Math.PI * 2); c.ellipse(46, hy - 14, 5, 7, 0.2, 0, Math.PI * 2); c.fill();
    const red = low || charging || this.state === 'aim';
    c.fillStyle = this.state === 'dazed' ? '#fff' : red ? '#ff5a3a' : '#f2d36b';
    c.beginPath(); c.arc(50, hy - 3, 3, 0, Math.PI * 2); c.fill();
    if (this.state !== 'dazed') { c.fillStyle = '#1b120b'; c.beginPath(); c.arc(51, hy - 3, 1.4, 0, Math.PI * 2); c.fill(); }
    c.restore();
    if (this.state === 'dazed') {
      c.fillStyle = '#ffe27a';
      for (let i = 0; i < 4; i++) { const a = time * 5 + i * 1.6; c.beginPath(); c.arc(this.cx + Math.cos(a) * 22, this.y - 6 + Math.sin(a) * 5, 3, 0, Math.PI * 2); c.fill(); }
      // Pijl: hier kun je op springen
      c.fillStyle = `rgba(255,236,160,${0.6 + Math.sin(time * 8) * 0.3})`;
      c.beginPath(); c.moveTo(this.cx, this.y - 18); c.lineTo(this.cx - 8, this.y - 30); c.lineTo(this.cx + 8, this.y - 30); c.closePath(); c.fill();
    }
  }
}

// Leeuw (Wonderwerk, wereld 2): sneller, springt vaker; schrikt van vuur.
// Een zwaai met de fakkel tijdens het grommen of mikken laat hem schrikken (versuft).
export class Lion extends GiantHyena {
  constructor(x, y, arena) {
    super(x, y, arena);
    this.w = 88; this.h = 54; this.title = 'LEEUW · Panthera leo'; this.rocks = false;
  }
  update(dt, game) {
    // Na een treffer vaker springen
    if (this.state === 'stalk' && this.timer <= dt && this.phase >= 2) { this.state = Math.random() < 0.6 ? 'aim' : 'growl'; this.timer = 0.8; game.audio.play('growl'); return; }
    super.update(dt, game);
  }
  draw(c, time) {
    const blink = this.invuln > 0 && Math.floor(time * 14) % 2 === 0;
    if (blink) return;
    c.save(); c.translate(Math.round(this.cx), Math.round(this.y + this.h)); c.scale(this.dir, 1);
    const o = '#2a1a0c', coat = '#c9974e', mane = '#6a3e1c', charging = this.state === 'charge', low = this.state === 'growl' || this.state === 'aim';
    const ph = this.t * (charging ? 22 : 7);
    if (this.state === 'leap') c.rotate(Math.max(-0.3, Math.min(0.3, this.vy / 2000)));
    if (this.state === 'dazed') c.rotate(Math.sin(time * 8) * 0.05);
    for (const [lx, off] of [[-30, 0], [-22, Math.PI], [22, Math.PI / 2], [30, Math.PI * 1.5]]) {
      const s = (this.vx !== 0 ? Math.sin(ph + off) : 0) * (charging ? 9 : 5);
      c.strokeStyle = o; c.lineWidth = 9; c.lineCap = 'round'; c.beginPath(); c.moveTo(lx, -26); c.lineTo(lx + s, -2); c.stroke();
      c.strokeStyle = coat; c.lineWidth = 6; c.beginPath(); c.moveTo(lx, -26); c.lineTo(lx + s, -2); c.stroke();
    }
    c.strokeStyle = coat; c.lineWidth = 4; c.beginPath(); c.moveTo(-38, -34); c.quadraticCurveTo(-54, -30, -56, -16 + Math.sin(time * 3) * 3); c.stroke();
    c.fillStyle = o; c.beginPath(); c.arc(-56, -14 + Math.sin(time * 3) * 3, 4, 0, Math.PI * 2); c.fill();
    c.fillStyle = o; c.beginPath(); c.ellipse(0, -34, 42, 17, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = coat; c.beginPath(); c.ellipse(0, -34, 40, 15.5, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#e0b878'; c.beginPath(); c.ellipse(0, -26, 30, 6, 0, 0, Math.PI * 2); c.fill();
    const hy = low ? -34 : -44;
    c.fillStyle = mane; c.beginPath(); c.ellipse(38, hy + 2, 22, 22, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#8a5428'; c.beginPath(); c.ellipse(40, hy, 17, 17, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = o; c.beginPath(); c.ellipse(48, hy + 2, 13, 12, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = coat; c.beginPath(); c.ellipse(48, hy + 2, 11.5, 10.5, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#e0b878'; c.beginPath(); c.ellipse(56, hy + 7, 6, 5, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#3a2210'; c.beginPath(); c.arc(60, hy + 4, 2.4, 0, Math.PI * 2); c.fill();
    if (low || charging || this.state === 'roar') { c.fillStyle = '#5a1f18'; c.beginPath(); c.ellipse(56, hy + 12, 6, 4, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = '#f2eedc'; c.fillRect(52, hy + 9, 2, 4); c.fillRect(58, hy + 9, 2, 4); }
    const red = low || charging || this.state === 'aim';
    c.fillStyle = this.state === 'dazed' ? '#fff' : red ? '#ff7a3a' : '#f2d36b'; c.beginPath(); c.arc(51, hy - 2, 2.6, 0, Math.PI * 2); c.fill();
    if (this.state !== 'dazed') { c.fillStyle = '#1b120b'; c.beginPath(); c.arc(52, hy - 2, 1.2, 0, Math.PI * 2); c.fill(); }
    c.restore();
    if (this.state === 'dazed') {
      c.fillStyle = '#ffe27a';
      for (let i = 0; i < 4; i++) { const a = time * 5 + i * 1.6; c.beginPath(); c.arc(this.cx + Math.cos(a) * 22, this.y - 6 + Math.sin(a) * 5, 3, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = `rgba(255,236,160,${0.6 + Math.sin(time * 8) * 0.3})`;
      c.beginPath(); c.moveTo(this.cx, this.y - 18); c.lineTo(this.cx - 8, this.y - 30); c.lineTo(this.cx + 8, this.y - 30); c.closePath(); c.fill();
    }
  }
}

// ------------------------------------------------------------------
// Nieuwe tekeningen voor de eindbazen (gedeelde motor in art.js)
// ------------------------------------------------------------------
import { quad, groundShadow } from './art.js';

function bossPose(b) {
  const st = b.state, charging = st === 'charge', low = st === 'growl' || st === 'aim';
  return {
    phase: b.t * (charging ? 20 : 7), stride: charging ? 1 : b.vx !== 0 ? 0.6 : 0,
    headDown: low ? 0.5 : 0, crouch: low ? 0.35 : 0, angry: low || charging || st === 'aim',
    mouth: low || charging || st === 'roar' ? 0.9 : 0, eyeOpen: st === 'dazed' ? 0.15 : undefined,
  };
}
function bossExtras(b, c, time) {
  if (b.state === 'dazed') {
    c.fillStyle = '#ffe27a';
    for (let i = 0; i < 4; i++) { const a = time * 5 + i * 1.6; c.beginPath(); c.arc(b.cx + Math.cos(a) * 22, b.y - 6 + Math.sin(a) * 5, 3, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = `rgba(255,236,160,${0.6 + Math.sin(time * 8) * 0.3})`;
    c.beginPath(); c.moveTo(b.cx, b.y - 18); c.lineTo(b.cx - 8, b.y - 30); c.lineTo(b.cx + 8, b.y - 30); c.closePath(); c.fill();
  }
}
// Reuzenhyena als echt monster: massieve schouderbult, lage kop, grommende bek vol tanden
import { cel, INK, taper as tpr } from './art.js';
GiantHyena.prototype.draw = function (c, time) {
  if (this.invuln > 0 && Math.floor(time * 14) % 2 === 0) return;
  groundShadow(c, this.cx, this.y + this.h, 62, 0.4);
  const st = this.state, charging = st === 'charge', low = st === 'growl' || st === 'aim';
  const snarl = charging || low || st === 'roar' ? 1 : 0.38 + Math.sin(time * 3) * 0.06;
  const mouth = st === 'roar' ? 1 + Math.sin(time * 30) * 0.05 : snarl;
  const ph = this.t * (charging ? 16 : 6), stride = charging ? 1 : this.vx !== 0 ? 0.55 : 0;
  const breathe = Math.sin(time * (low ? 9 : 2.5)) * (low ? 1.5 : 1);
  const C = { base: '#a37a46', dark: '#5c3e20', light: '#cfa468', spot: '#3a2614', mane: '#2a1a0c' };
  c.save(); c.translate(Math.round(this.cx), Math.round(this.y + this.h));
  c.scale(this.dir * 0.72, 0.72);
  if (st === 'leap') c.rotate(Math.max(-0.3, Math.min(0.3, this.vy / 2000)));
  if (st === 'dazed') c.rotate(Math.sin(time * 8) * 0.05);
  const by = -Math.abs(Math.sin(ph)) * stride * 3 + breathe * 0.4;
  c.translate(0, by);
  // Poten: dik, met klauwen
  const leg = (x, y, phase, front, far) => {
    const sw = Math.sin(phase) * stride * 0.7, up = Math.max(0, Math.cos(phase)) * stride;
    const kx = x + Math.sin(sw) * 20 + (front ? 2 : -4), ky = y + (front ? 26 : 22) - up * 6;
    const fx = kx + (front ? 2 : 6) + Math.sin(sw) * 6, fy = -2 - up * 8;
    const b = far ? '#7a5a34' : C.base, d = far ? '#3e2814' : C.dark, l = far ? '#9a764a' : C.light;
    cel(c, () => tpr(c, kx, ky, fx, fy, front ? 11 : 8, front ? 8 : 6.5), b, d, l, 2.2, 2.2);
    cel(c, () => tpr(c, x, y, kx, ky, front ? 20 : 18, front ? 12 : 9), b, d, l, 3, 2.2);
    c.fillStyle = INK; c.beginPath(); c.ellipse(fx + 3, fy, 9, 4.2, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = far ? '#5a4024' : '#7a5632'; c.beginPath(); c.ellipse(fx + 3, fy - 0.8, 7.4, 2.8, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#e8dcc0'; for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(fx + 7 + k * 2.4, fy - 1); c.lineTo(fx + 10 + k * 2.4, fy + 2); c.lineTo(fx + 8 + k * 2.4, fy + 1); c.closePath(); c.fill(); }
  };
  leg(-30, -30, ph + Math.PI + 0.6, false, true);
  leg(20, -46, ph + 0.6, true, true);
  // Korte, ruige staart
  cel(c, () => { c.beginPath(); c.moveTo(-40, -32); c.bezierCurveTo(-50, -34, -58, -26, -56, -16); c.bezierCurveTo(-52, -14, -48, -20, -44, -24); c.closePath(); }, C.mane, '#120a04', '#4a3018', 1.5, 2);
  // Romp: hoge gespierde schouderbult, aflopende rug, smalle heupen
  const body = () => { c.beginPath(); c.moveTo(-40, -28); c.bezierCurveTo(-42, -42, -28, -48, -12, -56); c.bezierCurveTo(0, -70, 14, -82, 28, -80);
    c.bezierCurveTo(42, -78, 48, -64, 46, -48); c.bezierCurveTo(44, -32, 38, -22, 26, -18); c.bezierCurveTo(10, -14, -12, -16, -28, -18); c.bezierCurveTo(-36, -19, -40, -22, -40, -28); c.closePath(); };
  cel(c, body, C.base, C.dark, C.light, 6, 0);
  c.save(); body(); c.clip();
  c.fillStyle = C.spot;
  for (const [x, y, r] of [[-30, -32, 3.4], [-20, -40, 4], [-8, -36, 3.8], [2, -50, 4.4], [12, -40, 4], [-14, -26, 3], [24, -58, 3.6], [32, -40, 3.4], [-2, -26, 2.8], [16, -64, 3.4], [36, -28, 3]]) { c.beginPath(); c.ellipse(x, y, r * 1.2, r, 0.3, 0, Math.PI * 2); c.fill(); }
  // Littekens
  c.strokeStyle = '#d8b88a'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(4, -56); c.lineTo(14, -46); c.moveTo(8, -58); c.lineTo(17, -49); c.stroke();
  // Buik en spierlijn in de schaduw
  c.fillStyle = C.dark; c.globalAlpha = 0.5; c.beginPath(); c.ellipse(0, -15, 34, 6, 0, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1;
  c.strokeStyle = C.dark; c.lineWidth = 1.6; c.beginPath(); c.moveTo(30, -64); c.quadraticCurveTo(22, -44, 30, -26); c.stroke();
  c.restore();
  body(); c.lineJoin = 'round'; c.lineWidth = 2.6; c.strokeStyle = INK; c.stroke();
  // Borstelige manen over nek en schouders
  c.fillStyle = C.mane;
  c.beginPath(); c.moveTo(-14, -47);
  for (let i = 0; i <= 12; i++) { const t = i / 12, x = -14 + t * 58, y = -56 - Math.sin(t * Math.PI * 0.9) * 26 + t * 6, h = 7 + Math.sin(i * 2.3) * 3 + (low ? 4 : 0); c.lineTo(x - 2, y - h - Math.sin(time * 8 + i) * 0.8); c.lineTo(x + 2, y); }
  c.lineTo(44, -60); c.lineTo(-12, -50); c.closePath(); c.fill(); c.lineWidth = 1.6; c.strokeStyle = INK; c.stroke();
  leg(-24, -28, ph + Math.PI, false, false);
  leg(28, -44, ph, true, false);
  // Kop: groot, laag en vooruit
  const hd = low ? 10 : charging ? 6 : 2;
  c.save(); c.translate(44, -50 + hd); c.scale(1.3, 1.3); c.rotate(low ? 0.2 : charging ? 0.12 : 0.04);
  // Onderkaak (draait open)
  c.save(); c.translate(2, 4); c.rotate(mouth * 0.42);
  c.fillStyle = '#4a1210'; c.beginPath(); c.moveTo(2, -2); c.lineTo(38, -2); c.lineTo(36, 6); c.lineTo(2, 6); c.closePath(); c.fill();
  c.fillStyle = '#f4ecd6';
  for (let i = 0; i < 6; i++) { const x = 10 + i * 4.6, h = i === 4 ? 8 : 3.5; c.beginPath(); c.moveTo(x, 1); c.lineTo(x + 1.6, 1 - h); c.lineTo(x + 3.2, 1); c.closePath(); c.fill(); }
  cel(c, () => { c.beginPath(); c.moveTo(-2, 0); c.lineTo(38, 1); c.bezierCurveTo(41, 3, 40, 8, 35, 9); c.lineTo(2, 10); c.bezierCurveTo(-3, 9, -4, 3, -2, 0); c.closePath(); }, C.base, C.dark, C.light, 2, 2.2);
  c.restore();
  // Mondholte
  c.fillStyle = '#3a0c0a'; c.beginPath(); c.moveTo(6, 2); c.lineTo(40, 0); c.lineTo(38, 6 + mouth * 14); c.lineTo(6, 6 + mouth * 6); c.closePath(); c.fill();
  c.fillStyle = '#9a2a30'; c.beginPath(); c.ellipse(20, 6 + mouth * 8, 10, 3 + mouth * 2, 0.15, 0, Math.PI * 2); c.fill();
  // Schedel en snuit met opgetrokken lip
  const skull = () => { c.beginPath(); c.moveTo(-10, -2); c.bezierCurveTo(-12, -18, 2, -26, 16, -24); c.bezierCurveTo(26, -22, 32, -16, 38, -12); c.bezierCurveTo(46, -10, 48, -4, 44, -1);
    c.lineTo(40, 1 - snarl * 2); c.bezierCurveTo(30, 2 - snarl * 4, 18, 4 - snarl * 3, 8, 5); c.bezierCurveTo(0, 6, -8, 6, -10, -2); c.closePath(); };
  cel(c, skull, C.base, C.dark, C.light, 3.4, 2.6);
  // Tandvlees en bovenste tanden met grote hoektand
  c.fillStyle = '#c0505a'; c.beginPath(); c.moveTo(12, 3 - snarl * 2); c.quadraticCurveTo(28, 0 - snarl * 4, 41, 0 - snarl * 1.5); c.lineTo(40, 2); c.quadraticCurveTo(26, 4, 12, 5); c.closePath(); c.fill();
  c.fillStyle = '#f6eed8'; c.strokeStyle = INK; c.lineWidth = 0.9;
  for (let i = 0; i < 6; i++) { const x = 13 + i * 4.6, h = i === 4 ? 11 : 4; c.beginPath(); c.moveTo(x, 3); c.lineTo(x + 1.7, 3 + h); c.lineTo(x + 3.4, 3); c.closePath(); c.fill(); if (i === 4) c.stroke(); }
  // Kwijl
  if (snarl > 0.5) { const d = (time * 1.5) % 1; c.fillStyle = 'rgba(230,240,255,0.75)'; c.beginPath(); c.ellipse(30, 10 + d * 14, 1.3, 2.4 + d * 2, 0, 0, Math.PI * 2); c.fill(); }
  // Neus en snuitrimpels
  c.fillStyle = INK; c.beginPath(); c.ellipse(44, -6, 4, 3.2, 0.2, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#5a5a5a'; c.beginPath(); c.ellipse(43, -7.2, 1.4, 0.8, 0.2, 0, Math.PI * 2); c.fill();
  c.strokeStyle = INK; c.lineWidth = 1.3; c.lineCap = 'round';
  for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(26 + k * 4, -16 + k); c.quadraticCurveTo(28 + k * 4, -13 + k, 27 + k * 4, -10 + k); c.stroke(); }
  // Oog: klein, rood gloeiend, onder een boze rimpel
  const glow = c.createRadialGradient(16, -14, 0.5, 16, -14, 7); glow.addColorStop(0, 'rgba(255,90,50,0.7)'); glow.addColorStop(1, 'rgba(255,90,50,0)');
  if (st !== 'dazed') { c.fillStyle = glow; c.beginPath(); c.arc(16, -14, 7, 0, Math.PI * 2); c.fill(); }
  c.fillStyle = st === 'dazed' ? '#f0e6d0' : '#ff4a2a'; c.beginPath(); c.ellipse(16, -14, 3.6, 2.2, -0.15, 0, Math.PI * 2); c.fill();
  if (st !== 'dazed') { c.fillStyle = '#ffd27a'; c.beginPath(); c.arc(16.6, -14.2, 1, 0, Math.PI * 2); c.fill(); }
  c.fillStyle = INK; c.beginPath(); c.moveTo(9, -19); c.lineTo(22, -15); c.lineTo(21, -19); c.quadraticCurveTo(14, -22, 9, -19); c.fill();
  // Kleine oren, plat naar achteren
  cel(c, () => { c.beginPath(); c.moveTo(-2, -20); c.quadraticCurveTo(-16, -30, -18, -20); c.quadraticCurveTo(-10, -16, -2, -16); c.closePath(); }, C.dark, '#2a1a0c', C.base, 1.2, 1.8);
  c.restore();
  c.restore();
  bossExtras(this, c, time);
};
Lion.prototype.draw = function (c, time) {
  if (this.invuln > 0 && Math.floor(time * 14) % 2 === 0) return;
  groundShadow(c, this.cx, this.y + this.h, 58, 0.35);
  c.save(); c.translate(Math.round(this.cx), Math.round(this.y + this.h));
  c.scale(this.dir * 1.85, 1.85);
  if (this.state === 'leap') c.rotate(Math.max(-0.3, Math.min(0.3, this.vy / 2000)));
  if (this.state === 'dazed') c.rotate(Math.sin(time * 8) * 0.05);
  const p = bossPose(this);
  quad(c, { seed: 7, L: 30, H: 11, bodyH: 13, slope: 1, neck: 3, headSize: 1.15,
    base: '#c9974e', light: '#e8c07c', dark: '#2e1c0c', belly: '#e8c890', head: 'lion', mane: '#7a4a22',
    tail: 'tuft', tuft: '#4a2a12', eye: p.angry ? '#ff7a3a' : '#f2d36b', ...p }, time);
  c.restore();
  bossExtras(this, c, time);
};
