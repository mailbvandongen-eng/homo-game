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
          if (this.phase >= 3) this.dropRocks(game);
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
