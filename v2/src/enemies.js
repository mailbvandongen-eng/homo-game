import { TILE } from './config.js';
import { moveBody, groundBelow } from './level.js';

const GRAV = 1900;

class Enemy {
  constructor(x, y, w, h) {
    this.w = w; this.h = h;
    this.x = x - w / 2; this.y = y - h;
    this.vx = 0; this.vy = 0;
    this.dir = -1;
    this.active = false;
    this.fleeing = false; this.fleeT = 0;
    this.gone = false;
    this.t = Math.random() * 10;
    this.stompable = true;
  }
  get cx() { return this.x + this.w / 2; }
  hitbox() { return { x: this.x + 3, y: this.y + 3, w: this.w - 6, h: this.h - 3 }; }
  harmful() { return !this.fleeing; }

  // Dieren worden verjaagd, niet gedood: ze schrikken en rennen weg.
  scare(dir, game) {
    if (this.fleeing) return;
    this.fleeing = true; this.fleeT = 0;
    this.fleeDir = dir || -this.dir;
    this.dir = this.fleeDir;
    game.fx.stars(this.cx, this.y + 4);
  }
  updateFlee(dt) {
    this.fleeT += dt;
    if (this.fleeT < 0.18) return;              // even platgedrukt
    this.vx = this.fleeDir * 300;
    this.vy = Math.min(this.vy + GRAV * dt, 700);
    if (this.fleeT < 0.22) this.vy = -260;
    this.x += this.vx * dt; this.y += this.vy * dt;
    if (this.fleeT > 1.1) this.gone = true;
  }
  alpha() { return this.fleeing ? Math.max(0, 1 - Math.max(0, this.fleeT - 0.5) / 0.6) : 1; }
  squash() { return this.fleeing && this.fleeT < 0.18 ? 0.55 : 1; }

  walk(dt, game, speed, turnAtLedge = true) {
    this.vx = this.dir * speed;
    this.vy = Math.min(this.vy + GRAV * dt, 700);
    const r = moveBody(this, dt, game.map);
    if (r.wall) this.dir = -r.wall;
    if (turnAtLedge && r.landed) {
      const fx = this.dir > 0 ? this.x + this.w + 2 : this.x - 2;
      if (!groundBelow(game.map, fx, this.y + this.h)) this.dir *= -1;
    }
    return r;
  }
}

// ---------------- Hyena: loopt heen en weer, erop springen verjaagt hem ----------------
export class Hyena extends Enemy {
  constructor(x, y, o = {}) { super(x, y, 38, 26); this.speed = o.fast ? 85 : 55; this.dir = o.dir || -1; }
  update(dt, game) {
    this.t += dt;
    if (this.fleeing) return this.updateFlee(dt);
    this.walk(dt, game, this.speed);
  }
  draw(c, time) {
    c.save(); c.globalAlpha = this.alpha();
    c.translate(Math.round(this.cx), Math.round(this.y + this.h));
    c.scale(this.dir, this.squash());
    const ph = this.t * this.speed / 9, o = '#2d2117';
    const legs = [[-11, 0], [-6, Math.PI], [9, Math.PI * 0.5], [14, Math.PI * 1.5]];
    for (const [lx, off] of legs) {
      const s = this.fleeing ? Math.sin(time * 30 + off) : Math.sin(ph + off);
      c.strokeStyle = o; c.lineWidth = 4.5; c.lineCap = 'round';
      c.beginPath(); c.moveTo(lx, -12); c.lineTo(lx + s * 4, -1); c.stroke();
      c.strokeStyle = '#9c7748'; c.lineWidth = 2.2;
      c.beginPath(); c.moveTo(lx, -12); c.lineTo(lx + s * 4, -1); c.stroke();
    }
    // Romp: hoge schouders, aflopende rug
    c.fillStyle = o;
    c.beginPath(); c.moveTo(-18, -12); c.quadraticCurveTo(-17, -20, -8, -19); c.quadraticCurveTo(4, -25, 13, -24);
    c.quadraticCurveTo(20, -21, 18, -12); c.quadraticCurveTo(0, -6, -18, -12); c.fill();
    c.fillStyle = '#b8935c';
    c.beginPath(); c.moveTo(-16, -12.5); c.quadraticCurveTo(-15, -18, -8, -17.5); c.quadraticCurveTo(4, -23, 12, -22.5);
    c.quadraticCurveTo(18, -20, 16.5, -12.5); c.quadraticCurveTo(0, -8, -16, -12.5); c.fill();
    c.fillStyle = '#5b3f25';
    for (const [sx, sy] of [[-10, -15], [-4, -18], [2, -14], [7, -19], [-12, -11.5], [11, -16]]) { c.beginPath(); c.arc(sx, sy, 1.6, 0, Math.PI * 2); c.fill(); }
    // Manen
    c.fillStyle = '#4a321e';
    c.beginPath(); c.moveTo(2, -23); c.lineTo(6, -27); c.lineTo(9, -24); c.lineTo(12, -28); c.lineTo(15, -23); c.closePath(); c.fill();
    // Staart
    c.strokeStyle = '#4a321e'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(-17, -15); c.quadraticCurveTo(-23, -14 + Math.sin(time * 6) * 2, -24, -9); c.stroke();
    // Kop
    c.fillStyle = o;
    c.beginPath(); c.ellipse(21, -21, 7.5, 6.5, 0.2, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(27, -18, 5.5, 3.6, 0.15, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#b8935c';
    c.beginPath(); c.ellipse(21, -21, 6, 5, 0.2, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#4a3523';
    c.beginPath(); c.ellipse(27, -18, 4.2, 2.6, 0.15, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#2b1d12'; c.beginPath(); c.arc(31, -18.5, 1.6, 0, Math.PI * 2); c.fill();
    // Oren
    c.fillStyle = '#6c4c2c';
    c.beginPath(); c.ellipse(17, -28, 3, 4.2, -0.3, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(21, -28.5, 3, 4.2, 0.2, 0, Math.PI * 2); c.fill();
    // Oog
    c.fillStyle = this.fleeing ? '#fff' : '#f2d36b';
    c.beginPath(); c.arc(23.5, -22.5, 1.7, 0, Math.PI * 2); c.fill();
    if (!this.fleeing) { c.fillStyle = '#1b120b'; c.beginPath(); c.arc(24, -22.5, 0.8, 0, Math.PI * 2); c.fill(); }
    c.restore();
  }
}

// ---------------- Slang: verstopt in het gras; niet op springen, wel overheen ----------------
export class Snake extends Enemy {
  constructor(x, y, o = {}) {
    super(x, y, 30, 16);
    this.stompable = false;
    this.state = 'idle'; this.timer = 0; this.cool = 0; this.dir = o.dir || -1;
    this.reach = 0;
  }
  hitbox() {
    const extra = this.reach * 30;
    return { x: this.x + 3 + (this.dir < 0 ? -extra : 0), y: this.y + 2 - this.reach * 6, w: this.w - 6 + extra, h: this.h - 2 + this.reach * 6 };
  }
  update(dt, game) {
    this.t += dt;
    if (this.fleeing) return this.updateFlee(dt);
    const p = game.player, dx = p.cx - this.cx, dy = p.bottom - (this.y + this.h);
    this.cool = Math.max(0, this.cool - dt);
    if (this.state === 'idle') {
      this.reach = Math.max(0, this.reach - dt * 4);
      if (Math.abs(dx) < 160) this.dir = Math.sign(dx) || this.dir;
      if (Math.abs(dx) < 110 && Math.abs(dy) < 50 && this.cool <= 0) { this.state = 'warn'; this.timer = 0.45; game.audio.play('hiss'); }
    } else if (this.state === 'warn') {
      this.timer -= dt;
      if (this.timer <= 0) { this.state = 'strike'; this.timer = 0.28; }
    } else if (this.state === 'strike') {
      this.timer -= dt;
      this.reach = Math.min(1, this.reach + dt * 9);
      if (this.timer <= 0) { this.state = 'idle'; this.cool = 1.1; }
    }
  }
  draw(c, time) {
    c.save(); c.globalAlpha = this.alpha();
    c.translate(Math.round(this.cx), Math.round(this.y + this.h));
    c.scale(this.dir, this.squash());
    const o = '#1f2a14', body = '#6f8a33', belly = '#c9c26a';
    // Opgerolde lus
    c.fillStyle = o; c.beginPath(); c.ellipse(-3, -5, 14, 6, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = body; c.beginPath(); c.ellipse(-3, -5, 12, 4.6, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#3f5520';
    for (let i = -12; i < 8; i += 5) { c.beginPath(); c.ellipse(i, -6, 1.8, 1.2, 0, 0, Math.PI * 2); c.fill(); }
    // Hals en kop
    const raise = this.state === 'warn' ? 1 : this.state === 'strike' ? 0.6 : 0.35 + Math.sin(time * 3 + this.t) * 0.08;
    const shake = this.state === 'warn' ? Math.sin(time * 50) * 1.2 : 0;
    const hx = 6 + this.reach * 30, hy = -8 - raise * 12;
    c.lineCap = 'round';
    c.strokeStyle = o; c.lineWidth = 7.5;
    c.beginPath(); c.moveTo(4, -5); c.quadraticCurveTo(10 + this.reach * 10, -6 - raise * 10, hx + shake, hy); c.stroke();
    c.strokeStyle = body; c.lineWidth = 5;
    c.beginPath(); c.moveTo(4, -5); c.quadraticCurveTo(10 + this.reach * 10, -6 - raise * 10, hx + shake, hy); c.stroke();
    c.fillStyle = o; c.beginPath(); c.ellipse(hx + 3 + shake, hy, 6.5, 4.6, 0.15, 0, Math.PI * 2); c.fill();
    c.fillStyle = body; c.beginPath(); c.ellipse(hx + 3 + shake, hy, 5, 3.3, 0.15, 0, Math.PI * 2); c.fill();
    c.fillStyle = belly; c.beginPath(); c.ellipse(hx + 3 + shake, hy + 2, 3.5, 1.2, 0.1, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#f5e46a'; c.beginPath(); c.arc(hx + 4.5 + shake, hy - 1.3, 1.4, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#111'; c.fillRect(hx + 4.3 + shake, hy - 2.3, 0.7, 2);
    // Tong
    if (this.state !== 'idle' || Math.sin(time * 4 + this.t * 3) > 0.8) {
      c.strokeStyle = '#c4384a'; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(hx + 8 + shake, hy + 0.5); c.lineTo(hx + 12 + shake, hy + 0.5); c.lineTo(hx + 14 + shake, hy - 1); c.moveTo(hx + 12 + shake, hy + 0.5); c.lineTo(hx + 14 + shake, hy + 2); c.stroke();
    }
    // Ratelende staart bij waarschuwing
    c.strokeStyle = body; c.lineWidth = 3;
    c.beginPath(); c.moveTo(-15, -5); c.quadraticCurveTo(-21, -7, -22 + shake, -12); c.stroke();
    c.restore();
  }
}

// ---------------- Gier: cirkelt, waarschuwt met krijsen en duikt ----------------
export class Vulture extends Enemy {
  constructor(x, y, o = {}) {
    super(x, y - (o.alt ?? 4) * TILE, 36, 20);
    this.homeX = this.x; this.homeY = this.y;
    this.state = 'circle'; this.timer = 0; this.cool = 1;
  }
  update(dt, game) {
    this.t += dt;
    if (this.fleeing) { this.fleeT += dt; this.y -= 220 * dt; this.x += this.fleeDir * 160 * dt; if (this.fleeT > 1.3) this.gone = true; return; }
    const p = game.player;
    this.cool = Math.max(0, this.cool - dt);
    if (this.state === 'circle') {
      const tx = this.homeX + Math.sin(this.t * 0.9) * 60, ty = this.homeY + Math.sin(this.t * 1.8) * 10;
      this.dir = Math.cos(this.t * 0.9) >= 0 ? 1 : -1;
      this.x += (tx - this.x) * Math.min(1, dt * 3); this.y += (ty - this.y) * Math.min(1, dt * 3);
      const dx = p.cx - this.cx;
      if (this.cool <= 0 && Math.abs(dx) < 190 && p.y > this.y + 30 && !p.dead) {
        this.state = 'warn'; this.timer = 0.65; this.dir = Math.sign(dx) || 1;
        game.audio.play('screech');
      }
    } else if (this.state === 'warn') {
      this.timer -= dt; this.y -= 30 * dt;
      if (this.timer <= 0) {
        // Duik naar waar de speler nu staat (niet bijsturen: eerlijk te ontwijken).
        const tx = p.cx, ty = p.y + p.h * 0.4, dx = tx - this.cx, dy = ty - (this.y + this.h / 2), d = Math.hypot(dx, dy) || 1;
        this.vx = dx / d * 340; this.vy = dy / d * 340; this.dir = Math.sign(this.vx) || this.dir;
        this.state = 'dive'; this.timer = d / 340 + 0.15;
      }
    } else if (this.state === 'dive') {
      this.timer -= dt; this.x += this.vx * dt; this.y += this.vy * dt;
      if (this.timer <= 0) { this.state = 'climb'; }
    } else if (this.state === 'climb') {
      const dx = this.homeX - this.x, dy = this.homeY - this.y, d = Math.hypot(dx, dy);
      if (d < 6) { this.state = 'circle'; this.cool = 1.6; this.t = 0; }
      else { this.x += dx / d * 150 * dt; this.y += dy / d * 150 * dt; this.dir = Math.sign(dx) || this.dir; }
    }
  }
  draw(c, time) {
    c.save(); c.globalAlpha = this.alpha();
    c.translate(Math.round(this.cx), Math.round(this.y + this.h / 2));
    c.scale(this.dir * 1.25, 1.25);
    const o = '#1d1612';
    const diving = this.state === 'dive';
    const flap = diving ? -0.9 : this.state === 'warn' ? Math.sin(time * 26) : Math.sin(time * 7 + this.t);
    if (diving) c.rotate(Math.atan2(this.vy, Math.abs(this.vx)) * 0.6);
    // Vleugels
    const wing = (side) => {
      c.save(); c.scale(1, side);
      c.fillStyle = side > 0 ? '#3b2c22' : '#4f3b2c';
      c.beginPath(); c.moveTo(-9, -2); c.quadraticCurveTo(-6, -16 - flap * 12, 2, -24 - flap * 16); c.lineTo(4, -17 - flap * 12); c.lineTo(9, -21 - flap * 14); c.lineTo(9, -13 - flap * 9); c.lineTo(13, -14 - flap * 9); c.lineTo(7, -3); c.closePath();
      c.fill(); c.restore();
    };
    if (!diving) wing(-1);
    c.fillStyle = o; c.beginPath(); c.ellipse(0, 0, 14, 7, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#5a4433'; c.beginPath(); c.ellipse(0, 0, 12.5, 5.6, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#efe6d2'; c.beginPath(); c.ellipse(9, -2, 4, 3.4, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#d58c78'; c.lineWidth = 3; c.lineCap = 'round';
    c.beginPath(); c.moveTo(10, -3); c.quadraticCurveTo(15, -7, 17, -3); c.stroke();
    c.fillStyle = '#d9b45b'; c.beginPath(); c.moveTo(18, -4); c.lineTo(23, -1); c.lineTo(17, -1); c.closePath(); c.fill();
    c.fillStyle = '#111'; c.beginPath(); c.arc(17, -4.5, 0.9, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#3b2c22'; c.beginPath(); c.moveTo(-12, -1); c.lineTo(-20, -3); c.lineTo(-19, 3); c.closePath(); c.fill();
    wing(1);
    if (this.state === 'warn') { c.fillStyle = '#ffdf70'; c.font = 'bold 14px system-ui'; c.scale(this.dir, 1); c.fillText('!', -2, -22); }
    c.restore();
  }
}

// ---------------- Wrattenzwijn: schraapt met de hoef en stormt dan op je af ----------------
export class Warthog extends Enemy {
  constructor(x, y, o = {}) { super(x, y, 42, 28); this.state = 'walk'; this.timer = 0; this.cool = 0.8; this.dir = o.dir || -1; }
  update(dt, game) {
    this.t += dt;
    if (this.fleeing) return this.updateFlee(dt);
    const p = game.player, dx = p.cx - this.cx, dy = p.bottom - (this.y + this.h);
    this.cool = Math.max(0, this.cool - dt);
    if (this.state === 'walk') {
      this.walk(dt, game, 38);
      if (this.cool <= 0 && Math.abs(dx) < 240 && Math.abs(dy) < 40 && !p.dead) {
        this.dir = Math.sign(dx) || this.dir; this.state = 'scrape'; this.timer = 0.8;
        game.audio.play('snort');
      }
    } else if (this.state === 'scrape') {
      this.timer -= dt; this.walk(dt, game, 0);
      if (Math.random() < dt * 14) game.fx.dust(this.cx - this.dir * 14, this.y + this.h, -this.dir, 1);
      if (this.timer <= 0) { this.state = 'charge'; this.timer = 1.6; }
    } else if (this.state === 'charge') {
      this.timer -= dt;
      const r = this.walk(dt, game, 280, true);
      if (Math.random() < dt * 20) game.fx.dust(this.cx - this.dir * 18, this.y + this.h, -this.dir, 1);
      if (r.wall || this.timer <= 0 || Math.sign(this.vx) !== this.dir) { this.state = 'dazed'; this.timer = 1; if (r.wall) { game.fx.stars(this.cx, this.y); game.shake(4); } }
    } else if (this.state === 'dazed') {
      this.timer -= dt; this.walk(dt, game, 0);
      if (this.timer <= 0) { this.state = 'walk'; this.cool = 1.4; }
    }
  }
  draw(c, time) {
    c.save(); c.globalAlpha = this.alpha();
    c.translate(Math.round(this.cx), Math.round(this.y + this.h));
    c.scale(this.dir, this.squash());
    const o = '#211814', charge = this.state === 'charge';
    const speed = charge ? 28 : this.state === 'walk' ? 8 : this.state === 'scrape' ? 0 : 0;
    const ph = this.t * speed;
    const legs = [[-12, 0], [-7, Math.PI], [10, Math.PI * 0.5], [15, Math.PI * 1.5]];
    for (const [lx, off] of legs) {
      let s = Math.sin(ph + off) * (charge ? 6 : 3);
      if (this.state === 'scrape' && lx === 15) s = Math.sin(time * 18) * 6;
      c.strokeStyle = o; c.lineWidth = 5; c.lineCap = 'round';
      c.beginPath(); c.moveTo(lx, -12); c.lineTo(lx + s, -1); c.stroke();
    }
    c.save();
    if (charge) c.rotate(0.08);
    if (this.state === 'dazed') c.rotate(Math.sin(time * 10) * 0.05);
    // Romp
    c.fillStyle = o; c.beginPath(); c.ellipse(0, -16, 20, 12, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#7a6656'; c.beginPath(); c.ellipse(0, -16, 18, 10.4, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#5f4e42'; c.beginPath(); c.ellipse(-2, -12, 15, 5, 0, 0, Math.PI * 2); c.fill();
    // Manen
    c.fillStyle = '#3b2b20';
    c.beginPath(); c.moveTo(-14, -24); for (let i = 0; i < 7; i++) { c.lineTo(-12 + i * 4, -29 - (i % 2) * 3); c.lineTo(-10 + i * 4, -25); } c.lineTo(14, -22); c.closePath(); c.fill();
    // Staart
    c.strokeStyle = o; c.lineWidth = 2;
    c.beginPath(); c.moveTo(-19, -20); c.lineTo(-22, charge ? -36 : -24); c.stroke();
    if (charge) { c.fillStyle = o; c.beginPath(); c.ellipse(-22, -37, 2, 3, 0, 0, Math.PI * 2); c.fill(); }
    // Kop
    c.fillStyle = o; c.beginPath(); c.ellipse(21, -14, 10, 9, 0.1, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#7a6656'; c.beginPath(); c.ellipse(21, -14, 8.5, 7.5, 0.1, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#9b8473'; c.beginPath(); c.ellipse(28, -10, 5, 4.5, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#3b2b20'; c.beginPath(); c.arc(30.5, -10, 1.1, 0, Math.PI * 2); c.fill();
    // Wratten en slagtanden
    c.fillStyle = '#6a574a'; c.beginPath(); c.arc(18, -10, 2.2, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#f2e9d4'; c.lineWidth = 2.2;
    c.beginPath(); c.moveTo(25, -8); c.quadraticCurveTo(29, -12, 27, -17); c.stroke();
    c.fillStyle = this.state === 'scrape' || charge ? '#ff6b4a' : '#1a120d';
    c.beginPath(); c.arc(22, -17, 1.6, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#4a3a2e'; c.beginPath(); c.ellipse(15, -23, 2.6, 4, -0.4, 0, Math.PI * 2); c.fill();
    c.restore();
    if (this.state === 'dazed') {
      c.fillStyle = '#ffe27a';
      for (let i = 0; i < 3; i++) { const a = time * 5 + i * 2.1; c.beginPath(); c.arc(12 + Math.cos(a) * 9, -32 + Math.sin(a) * 3, 2, 0, Math.PI * 2); c.fill(); }
    }
    c.restore();
  }
}

// ---------------- Baviaan: zit op een tak en gooit vruchten (waarschuwt eerst met een opgeheven arm) ----------------
export class Baboon extends Enemy {
  constructor(x, y, o = {}) { super(x, y, 30, 30); this.state = 'sit'; this.timer = 0; this.cool = 1 + Math.random(); this.dir = o.dir || -1; }
  update(dt, game) {
    this.t += dt;
    if (this.fleeing) return this.updateFlee(dt);
    this.walk(dt, game, 0);
    const p = game.player, dx = p.cx - this.cx, dy = p.y - this.y;
    this.cool = Math.max(0, this.cool - dt);
    if (this.state === 'sit') {
      if (Math.abs(dx) < 280) this.dir = Math.sign(dx) || this.dir;
      if (this.cool <= 0 && Math.abs(dx) < 260 && Math.abs(dx) > 40 && dy > -120 && !p.dead) { this.state = 'aim'; this.timer = 0.65; game.audio.play('chatter'); }
    } else if (this.state === 'aim') {
      this.timer -= dt;
      if (this.timer <= 0) {
        // Boog naar waar de speler nu staat, vliegtijd 0,9 s
        const t = 0.9, g = 1100, tx = p.cx, ty = p.y + 10, sx = this.cx + this.dir * 8, sy = this.y - 4;
        game.projectiles.push({ kind: 'fruit', x: sx - 6, y: sy - 6, w: 12, h: 12, vx: (tx - sx) / t, vy: (ty - sy - 0.5 * g * t * t) / t, g, life: 2.5, spin: 0 });
        this.state = 'sit'; this.cool = 2.2; this.throwT = 0.25;
      }
    }
    this.throwT = Math.max(0, (this.throwT || 0) - dt);
  }
  draw(c, time) {
    c.save(); c.globalAlpha = this.alpha();
    c.translate(Math.round(this.cx), Math.round(this.y + this.h));
    c.scale(this.dir, this.squash());
    const o = '#2a2118', fur = '#8d7a52', face = '#5e4a3a';
    // Staart
    c.strokeStyle = fur; c.lineWidth = 3.5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-10, -6); c.quadraticCurveTo(-22, -10, -18, 4 + Math.sin(time * 3) * 2); c.stroke();
    // Lijf (zittend)
    c.fillStyle = o; c.beginPath(); c.ellipse(-2, -12, 13, 13, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = fur; c.beginPath(); c.ellipse(-2, -12, 11.5, 11.5, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#a8946a'; c.beginPath(); c.ellipse(-8, -18, 7, 6, 0, 0, Math.PI * 2); c.fill();
    // Arm: omhoog bij mikken
    const arm = this.state === 'aim' ? -2.6 + Math.sin(time * 20) * 0.1 : this.throwT > 0 ? 1.2 : 0.3;
    c.save(); c.translate(6, -18); c.rotate(arm);
    c.strokeStyle = o; c.lineWidth = 5.5; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 12); c.stroke();
    c.strokeStyle = fur; c.lineWidth = 3.5; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 12); c.stroke();
    if (this.state === 'aim') { c.fillStyle = '#e8902e'; c.beginPath(); c.arc(0, 14, 4.5, 0, Math.PI * 2); c.fill(); }
    c.restore();
    // Kop met lange snuit
    c.fillStyle = o; c.beginPath(); c.ellipse(9, -26, 8, 7.5, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = fur; c.beginPath(); c.ellipse(9, -26, 6.8, 6.4, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = face; c.beginPath(); c.ellipse(15, -24, 6, 3.6, 0.15, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#1b120b'; c.beginPath(); c.arc(17.5, -24.5, 1.1, 0, Math.PI * 2); c.fill();
    c.fillStyle = this.fleeing ? '#fff' : '#f0d070'; c.beginPath(); c.arc(11, -28, 1.5, 0, Math.PI * 2); c.fill();
    c.restore();
  }
}

// ---------------- Luipaard: ligt op de loer (staart zwiept, ogen lichten op) en springt dan ----------------
export class Leopard extends Enemy {
  constructor(x, y, o = {}) { super(x, y, 44, 22); this.state = 'hide'; this.timer = 0; this.cool = 0.5; this.dir = o.dir || -1; this.range = o.range || 220; }
  update(dt, game) {
    this.t += dt;
    if (this.fleeing) return this.updateFlee(dt);
    const p = game.player, dx = p.cx - this.cx, dy = p.bottom - (this.y + this.h);
    this.cool = Math.max(0, this.cool - dt);
    if (this.state === 'hide') {
      this.walk(dt, game, 0);
      if (Math.abs(dx) < this.range * 1.3) this.dir = Math.sign(dx) || this.dir;
      if (this.cool <= 0 && Math.abs(dx) < this.range && dy < 60 && dy > -200 && !p.dead) { this.state = 'crouch'; this.timer = 0.75; game.audio.play('growl'); }
    } else if (this.state === 'crouch') {
      this.walk(dt, game, 0); this.timer -= dt;
      if (this.timer <= 0) {
        // Sprong naar waar de speler nu is (niet bijsturen)
        const t = 0.75; this.vx = Math.max(-360, Math.min(360, (p.cx - this.cx) / t)); this.vy = -520;
        this.dir = Math.sign(this.vx) || this.dir; this.state = 'pounce'; this.air = 0;
      }
    } else if (this.state === 'pounce') {
      this.air += dt;
      this.vy = Math.min(this.vy + 1500 * dt, 700);
      const r = moveBody(this, dt, game.map);
      if ((r.landed && this.air > 0.1) || this.air > 2) { this.state = 'recover'; this.timer = 1.1; this.vx = 0; game.fx.dust(this.cx, this.y + this.h, 0, 5); }
    } else if (this.state === 'recover') {
      this.walk(dt, game, 0); this.timer -= dt;
      if (this.timer <= 0) { this.state = 'hide'; this.cool = 1.8; }
    }
  }
  draw(c, time) {
    c.save(); c.globalAlpha = this.alpha();
    c.translate(Math.round(this.cx), Math.round(this.y + this.h));
    c.scale(this.dir, this.squash());
    const o = '#2a1d10', coat = '#d9a64a', low = this.state === 'hide' || this.state === 'crouch';
    if (this.state === 'pounce') c.rotate(Math.max(-0.35, Math.min(0.35, this.vy / 1500)));
    const bodyY = low ? -9 : -13, crouch = this.state === 'crouch' ? Math.sin(time * 30) * 0.8 : 0;
    // Staart
    c.strokeStyle = coat; c.lineWidth = 3.5; c.lineCap = 'round';
    const tw = this.state === 'hide' ? Math.sin(time * 4) * 6 : this.state === 'crouch' ? Math.sin(time * 14) * 8 : 0;
    c.beginPath(); c.moveTo(-20, bodyY); c.quadraticCurveTo(-32, bodyY - 4 + tw, -36, bodyY - 12 + tw); c.stroke();
    // Poten
    c.strokeStyle = o; c.lineWidth = 4.5;
    for (const lx of [-14, -8, 10, 15]) { c.beginPath(); c.moveTo(lx, bodyY + 2); c.lineTo(lx + (this.state === 'pounce' ? (lx > 0 ? 7 : -7) : 0), -1); c.stroke(); }
    // Romp met rozetten
    c.fillStyle = o; c.beginPath(); c.ellipse(0, bodyY + crouch, 23, 9, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = coat; c.beginPath(); c.ellipse(0, bodyY + crouch, 21, 7.6, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#5a3a14';
    for (let i = -16; i < 16; i += 6) { c.beginPath(); c.arc(i, bodyY - 2 + (i % 4 ? 2 : 0), 1.8, 0, Math.PI * 2); c.fill(); }
    // Kop
    const hy = bodyY - 4 + (low ? 2 : 0);
    c.fillStyle = o; c.beginPath(); c.ellipse(23, hy, 8, 7, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = coat; c.beginPath(); c.ellipse(23, hy, 6.8, 5.8, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#5a3a14'; c.beginPath(); c.ellipse(19, hy - 7, 2.4, 3, -0.3, 0, Math.PI * 2); c.ellipse(25, hy - 7, 2.4, 3, 0.3, 0, Math.PI * 2); c.fill();
    const glow = this.state === 'crouch' || this.state === 'pounce';
    c.fillStyle = glow ? '#ffe45a' : '#c9b04a'; c.beginPath(); c.arc(26, hy - 1, glow ? 2 : 1.4, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#3a2410'; c.beginPath(); c.arc(30, hy + 2, 1.2, 0, Math.PI * 2); c.fill();
    if (this.state === 'recover') { c.fillStyle = '#ffe27a'; for (let i = 0; i < 3; i++) { const a = time * 5 + i * 2.1; c.beginPath(); c.arc(20 + Math.cos(a) * 8, hy - 14 + Math.sin(a) * 3, 1.8, 0, Math.PI * 2); c.fill(); } }
    c.restore();
  }
}

// ---------------- Vleermuis: fladdert rond en duikt kort naar je toe ----------------
export class Bat extends Enemy {
  constructor(x, y, o = {}) { super(x, y - (o.alt ?? 3) * TILE, 22, 14); this.homeX = this.x; this.homeY = this.y; this.state = 'fly'; this.timer = 0; this.cool = Math.random() * 2; }
  update(dt, game) {
    this.t += dt;
    if (this.fleeing) { this.fleeT += dt; this.y -= 160 * dt; if (this.fleeT > 1) this.gone = true; return; }
    const p = game.player; this.cool = Math.max(0, this.cool - dt);
    if (this.state === 'fly') {
      this.x += ((this.homeX + Math.sin(this.t * 1.6) * 40) - this.x) * Math.min(1, dt * 4);
      this.y += ((this.homeY + Math.sin(this.t * 4.2) * 8) - this.y) * Math.min(1, dt * 4);
      this.dir = Math.cos(this.t * 1.6) >= 0 ? 1 : -1;
      if (this.cool <= 0 && Math.abs(p.cx - this.cx) < 130 && p.y > this.y && !p.dead) { this.state = 'warn'; this.timer = 0.45; game.audio.play('squeak'); }
    } else if (this.state === 'warn') {
      this.timer -= dt;
      if (this.timer <= 0) { const dx = p.cx - this.cx, dy = p.y + 14 - this.y, d = Math.hypot(dx, dy) || 1; this.vx = dx / d * 240; this.vy = dy / d * 240; this.state = 'dive'; this.timer = Math.min(1, d / 240 + 0.1); this.dir = Math.sign(this.vx) || 1; }
    } else if (this.state === 'dive') {
      this.timer -= dt; this.x += this.vx * dt; this.y += this.vy * dt;
      if (this.timer <= 0) this.state = 'back';
    } else if (this.state === 'back') {
      const dx = this.homeX - this.x, dy = this.homeY - this.y, d = Math.hypot(dx, dy);
      if (d < 5) { this.state = 'fly'; this.cool = 1.8; } else { this.x += dx / d * 120 * dt; this.y += dy / d * 120 * dt; }
    }
  }
  draw(c, time) {
    c.save(); c.globalAlpha = this.alpha();
    c.translate(Math.round(this.cx), Math.round(this.y + this.h / 2)); c.scale(this.dir, 1);
    const f = this.state === 'warn' ? Math.sin(time * 40) : Math.sin(time * 18 + this.t);
    c.fillStyle = '#3a2e3a';
    for (const s of [-1, 1]) { c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(s * 8, -8 - f * 6, s * 15, -2 - f * 8); c.lineTo(s * 11, 2); c.lineTo(s * 7, -1); c.lineTo(s * 4, 3); c.closePath(); c.fill(); }
    c.fillStyle = '#4c3c4a'; c.beginPath(); c.ellipse(0, 1, 5, 5.5, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.moveTo(-3, -3); c.lineTo(-4, -8); c.lineTo(-1, -4); c.moveTo(3, -3); c.lineTo(4, -8); c.lineTo(1, -4); c.fill();
    c.fillStyle = this.state === 'warn' || this.state === 'dive' ? '#ff6a5a' : '#f2e2a0'; c.beginPath(); c.arc(-1.6, 0, 1, 0, Math.PI * 2); c.arc(1.6, 0, 1, 0, Math.PI * 2); c.fill();
    c.restore();
  }
}

// ---------------- Stalactiet: trilt als je eronder komt en valt dan ----------------
export class Stalactite extends Enemy {
  constructor(x, y, o = {}) {
    super(x, y, 18, 30);
    this.y = o.ceil ?? y;     // hangt aan het plafond (bovenkant)
    this.stompable = false; this.immune = true;
    this.state = o.falling ? 'shake' : 'hang'; this.timer = o.falling ? 0.7 : 0;
    this.shadow = !!o.falling;
  }
  scare() {}
  harmful() { return this.state === 'fall'; }
  update(dt, game) {
    this.t += dt;
    const p = game.player;
    if (this.state === 'hang') {
      if (Math.abs(p.cx - this.cx) < 46 && p.y > this.y && !p.dead) { this.state = 'shake'; this.timer = 0.5; game.audio.play('crack'); }
    } else if (this.state === 'shake') {
      this.timer -= dt;
      if (this.timer <= 0) { this.state = 'fall'; this.vy = 0; }
    } else if (this.state === 'fall') {
      this.vy = Math.min(this.vy + 1800 * dt, 800);
      const r = moveBody(this, dt, game.map);
      if (r.landed) { this.gone = true; game.fx.debris(this.cx, this.y + this.h); game.audio.play('crumble'); }
    }
  }
  draw(c, time) {
    if (this.shadow && this.state === 'shake') {
      // Schaduw op de grond: hier valt een rotsblok
      c.fillStyle = `rgba(0,0,0,${0.25 + Math.sin(time * 20) * 0.1})`;
      c.beginPath(); c.ellipse(this.cx, this.groundY ?? this.y + 200, 16, 4, 0, 0, Math.PI * 2); c.fill();
    }
    const shake = this.state === 'shake' ? Math.sin(time * 70) * 1.5 : 0;
    c.save(); c.translate(Math.round(this.cx + shake), Math.round(this.y));
    c.fillStyle = '#4a4036'; c.beginPath(); c.moveTo(-10, 0); c.lineTo(10, 0); c.lineTo(1, 31); c.closePath(); c.fill();
    c.fillStyle = '#8a7b66'; c.beginPath(); c.moveTo(-8, 0); c.lineTo(6, 0); c.lineTo(0.5, 26); c.closePath(); c.fill();
    c.fillStyle = '#b3a386'; c.beginPath(); c.moveTo(-6, 0); c.lineTo(-2, 0); c.lineTo(0, 16); c.closePath(); c.fill();
    c.restore();
  }
}

export const ENEMY_TYPES = { hyena: Hyena, snake: Snake, vulture: Vulture, warthog: Warthog, baboon: Baboon, leopard: Leopard, bat: Bat, stalactite: Stalactite };
