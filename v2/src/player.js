import { TILE, PHYS, MAX_STONES } from './config.js';
import { moveBody, T } from './level.js';
import { taper, eye, mix, groundShadow } from './art.js';

export class Player {
  constructor(x, y, look = null) {
    this.w = 22; this.h = 44;
    // Uiterlijk (voor stamleden): vachtkleur, huid, haar en grootte
    this.look = { fur: '#8a5a39', skin: '#c18a5f', limb: '#a8744d', hair: '#5d3a25', size: 1, ...look };
    this.reset(x, y);
  }

  reset(x, y) {
    this.x = x - this.w / 2; this.y = y - this.h;
    this.vx = 0; this.vy = 0;
    this.face = 1;
    this.onGround = true;
    this.coyote = 0; this.buffer = 0;
    this.holdTime = 0;          // hoe lang je al dezelfde kant op loopt (voor rennen)
    this.jumping = false;
    this.invuln = 0;
    this.throwAnim = 0;
    this.anim = 0;
    this.sx = 1; this.sy = 1;   // vervorming bij springen en landen
    this.dead = false;
    this.deadT = 0;
    this.auto = 0;              // automatisch lopen (finish)
    this.hang = null;           // vastgegrepen liaan
    this.regrab = 0;
    this.cheer = 0;             // juichen bij de finish
  }

  get cx() { return this.x + this.w / 2; }
  get bottom() { return this.y + this.h; }
  get running() { return this.holdTime >= PHYS.runDelay && Math.abs(this.vx) > PHYS.walk * 0.9; }

  overlapsTile(cx, cy) {
    return this.x < (cx + 1) * TILE && this.x + this.w > cx * TILE && this.y < (cy + 1) * TILE && this.y + this.h > cy * TILE;
  }

  update(dt, input, game) {
    if (this.dead) {
      this.deadT += dt;
      if (this.deadT > 0.45) { this.vy = Math.min(this.vy + PHYS.gravDown * dt, PHYS.maxFall); this.y += this.vy * dt; }
      return;
    }
    const map = game.map;
    let dir = input.left ? -1 : input.right ? 1 : 0;
    if (this.auto) dir = this.auto;
    this.regrab = Math.max(0, this.regrab - dt);
    if (this.hang) return this.swing(dt, dir, input, game);

    // Rennen ontstaat vanzelf als je een richting vasthoudt.
    if (dir !== 0 && dir === Math.sign(this.vx || dir)) this.holdTime += dt; else if (this.onGround) this.holdTime = 0;
    const max = this.auto ? PHYS.walk * 0.8 : (this.holdTime >= PHYS.runDelay ? PHYS.run : PHYS.walk);

    if (dir !== 0) {
      this.face = dir;
      const turning = this.vx !== 0 && Math.sign(this.vx) !== dir;
      const a = !this.onGround ? PHYS.airAccel : turning ? PHYS.skid : PHYS.accel;
      const before = Math.abs(this.vx);
      this.vx += dir * a * dt;
      // Nooit sneller dan het maximum; zat je erboven (na rennen), dan rustig afremmen.
      const limit = Math.max(max, before - PHYS.friction * 0.5 * dt);
      if (Math.abs(this.vx) > limit) this.vx = Math.sign(this.vx) * limit;
      if (turning && this.onGround && Math.abs(this.vx) > 90) {
        this.skidding = true;
        if (Math.random() < 0.5) game.fx.dust(this.cx, this.bottom, -dir, 1);
      } else this.skidding = false;
    } else {
      this.skidding = false;
      const f = this.onGround ? PHYS.friction : PHYS.friction * 0.25;
      const s = Math.abs(this.vx) - f * dt;
      this.vx = s <= 0 ? 0 : Math.sign(this.vx) * s;
    }

    // Springen met buffer en coyote-tijd
    if (input.jump) this.buffer = PHYS.buffer; else this.buffer = Math.max(0, this.buffer - dt);
    this.coyote = this.onGround ? PHYS.coyote : Math.max(0, this.coyote - dt);
    if (this.buffer > 0 && this.coyote > 0 && !this.auto) {
      const speedBonus = Math.abs(this.vx) / PHYS.run * PHYS.runJumpBonus;
      this.vy = -(PHYS.jumpV + speedBonus);
      this.onGround = false; this.jumping = true;
      this.buffer = 0; this.coyote = 0;
      this.sx = 0.8; this.sy = 1.22;
      game.audio.play('jump');
      game.fx.dust(this.cx, this.bottom, 0, 4);
    }

    // Variabele springhoogte: loslaten = sneller terug.
    let g = PHYS.gravDown;
    if (this.vy < 0) g = (input.jumpHeld || !this.jumping) ? PHYS.gravUp : PHYS.gravCut;
    this.vy = Math.min(this.vy + g * dt, PHYS.maxFall);

    const wasGround = this.onGround;
    const vyBefore = this.vy;
    const r = moveBody(this, dt, map);

    // Hoekcorrectie: hoofd stoot net tegen een rand → schuif er langs.
    if (r.ceil && vyBefore < 0) {
      const left = r.headX * TILE, right = left + TILE;
      const nudge = 7;
      if (this.x + this.w - left <= nudge && !map.solidAt(r.headX - 1, r.headY)) { this.x = left - this.w; this.vy = vyBefore; }
      else if (right - this.x <= nudge && !map.solidAt(r.headX + 1, r.headY)) { this.x = right; this.vy = vyBefore; }
      else { game.hitHead(r.headX, r.headY); this.jumping = false; }
    }

    // Randhulp: net te laag tegen een rand aan? Dan stap je er alsnog op.
    if (r.wall && this.vy >= 0 && !r.landed) {
      const cx = r.wall > 0 ? Math.floor((this.x + this.w + 1) / TILE) : Math.floor((this.x - 1) / TILE);
      const cy = Math.floor((this.y + this.h - 1) / TILE), top = cy * TILE;
      if (this.y + this.h - top <= 18 && !map.solidAt(cx, cy - 1) && !map.solidAt(cx, cy - 2)) {
        this.y = top - this.h; this.x += r.wall * 3; this.vy = 0; r.landed = true; r.groundX = cx; r.groundY = cy;
      }
    }
    this.onGround = r.landed;
    if (r.landed) {
      this.jumping = false;
      const tile = map.get(r.groundX, r.groundY);
      if (tile === T.SPRING || tile === T.BOUNCY) {
        this.vy = -(tile === T.SPRING ? PHYS.springV : PHYS.branchV) * (input.jumpHeld ? 1.1 : 1);
        this.onGround = false; this.jumping = false;
        this.sx = 0.75; this.sy = 1.3;
        for (let k = -2; k <= 2; k++) if (map.get(r.groundX + k, r.groundY) === tile) map.bounce.set(map.idx(r.groundX + k, r.groundY), 0.45);
        game.audio.play('spring');
      } else {
        if (tile === T.CRUMBLE) map.touchCrumble(r.groundX, r.groundY);
        if (!wasGround) {
          const impact = Math.min(1, vyBefore / PHYS.maxFall);
          this.sx = 1 + 0.25 * impact; this.sy = 1 - 0.25 * impact;
          if (impact > 0.4) game.fx.dust(this.cx, this.bottom, 0, 3 + Math.round(impact * 4));
          if (impact > 0.25) game.audio.play('land');
        }
      }
    }

    if (this.onGround && Math.abs(this.vx) > 10) {
      const before = Math.floor(this.anim / Math.PI);
      this.anim += dt * Math.abs(this.vx) / 15;
      if (Math.floor(this.anim / Math.PI) !== before) game.audio.play('step');
      if (this.running && Math.random() < dt * 12) game.fx.dust(this.cx - this.face * 8, this.bottom, -this.face, 1);
    } else if (this.onGround) this.anim = 0;

    this.sx += (1 - this.sx) * Math.min(1, dt * 12);
    this.sy += (1 - this.sy) * Math.min(1, dt * 12);
    this.invuln = Math.max(0, this.invuln - dt);
    this.throwAnim = Math.max(0, this.throwAnim - dt);

    if (input.throw && !this.auto) game.throwStone();
  }

  // Slingeren aan een liaan: een slinger met lengte len rond het ophangpunt.
  grab(liana) {
    const len = liana.len;
    this.hang = liana; liana.held = true;
    // Neem de vaart mee in de slinger.
    liana.omega = (this.vx * Math.cos(liana.angle) - this.vy * Math.sin(liana.angle) * 0.3) / len;
    this.vx = 0; this.vy = 0; this.jumping = false; this.onGround = false;
    this.sx = 1.15; this.sy = 0.88;
  }

  swing(dt, dir, input, game) {
    const L = this.hang, len = L.len;
    // Zwaartekracht op de slinger, plus zelf "pompen" met links/rechts
    L.omega += (-(1700 / len) * Math.sin(L.angle) + dir * 2.6) * dt;
    L.omega *= 1 - 0.2 * dt;
    L.angle = Math.max(-1.25, Math.min(1.25, L.angle + L.omega * dt));
    if (dir) this.face = dir; else if (Math.abs(L.omega) > 0.3) this.face = Math.sign(L.omega);
    const hx = L.ax + Math.sin(L.angle) * len, hy = L.ay + Math.cos(L.angle) * len;
    this.x = hx - this.w / 2; this.y = hy + 9;   // handen precies aan de liaan
    this.anim += dt * 4;
    this.sx += (1 - this.sx) * Math.min(1, dt * 12); this.sy += (1 - this.sy) * Math.min(1, dt * 12);
    this.invuln = Math.max(0, this.invuln - dt);
    if (input.jump) {
      // Loslaten: snelheid langs de slingerbaan plus een sprong omhoog
      const tv = L.omega * len;
      let vx = tv * Math.cos(L.angle) + this.face * 70;
      if (vx * this.face < 205) vx = this.face * 205;   // altijd een fatsoenlijke zwaai in de kijkrichting
      this.vx = Math.max(-PHYS.run * 1.3, Math.min(PHYS.run * 1.3, vx));
      this.vy = Math.min(0, -tv * Math.sin(L.angle)) - PHYS.lianaJump;
      this.holdTime = PHYS.runDelay;
      L.held = false; this.hang = null; this.regrab = 0.35; this.jumping = true;
      this.sx = 0.8; this.sy = 1.2;
      game.audio.play('jump');
    }
  }

  bounceOff(held) {
    this.vy = -(held ? PHYS.stompBounceHeld : PHYS.stompBounce);
    this.onGround = false; this.jumping = true;
    this.sx = 0.85; this.sy = 1.15;
  }

  // ---------- tekenen ----------
  // Rayman-achtige stijl: grote kop met expressieve ogen, taps toelopende ledematen, licht van boven.
  draw(c, time) {
    if (this.invuln > 0 && !this.dead && Math.floor(time * 16) % 2 === 0) return;
    const L = this.look, air = !this.onGround && !this.cheer, hanging = !!this.hang;
    if (!air && !this.dead && !hanging) groundShadow(c, this.cx, this.bottom, 15 * L.size, 0.3);
    c.save();
    c.translate(Math.round(this.cx), Math.round(this.bottom - (this.hop || 0)));
    if (L.size !== 1) c.scale(L.size, L.size);
    if (this.dead) { c.translate(0, -22); c.rotate(Math.min(this.deadT * 6, Math.PI)); c.translate(0, 22); }
    c.scale(this.face * this.sx, this.sy);

    const speed = Math.abs(this.vx), moving = !air && speed > 10;
    const runAmt = Math.min(1, Math.max(0, (speed - PHYS.walk * 0.7) / (PHYS.run - PHYS.walk * 0.7)));
    const ph = this.anim, swing = moving ? 0.55 + 0.35 * runAmt : 0;
    const bob = moving ? -Math.abs(Math.sin(ph)) * (1.5 + runAmt * 1.6) : Math.sin(time * 2.4) * 0.7;
    let lean = moving ? 0.1 + runAmt * 0.2 : 0.04;
    if (this.skidding) lean = -0.22;
    if (air) lean = this.vy < 0 ? 0.1 : -0.04;
    if (hanging) lean = -this.hang.omega * 0.08;
    c.translate(0, bob);

    const outline = '#2c1d15', fur = L.fur, skin = L.skin, limbBack = L.limb, hair = L.hair;
    const tall = L.tall ? 1.12 : 1;
    // Ledematen: dik bij de aanzet, smaller naar de pols/enkel
    const seg = (x1, y1, x2, y2, w1, w2, col) => {
      c.fillStyle = outline; taper(c, x1, y1, x2, y2, w1 + 2.6, w2 + 2.6); c.fill();
      c.fillStyle = col; taper(c, x1, y1, x2, y2, w1, w2); c.fill();
    };
    const leg = (side) => {
      const hip = [side * 3, -21 * tall];
      let a, bend;
      if (hanging) { a = side * 0.15 - this.hang.omega * 0.25 + Math.sin(this.anim + side) * 0.1; bend = 0.25; }
      else if (air) { if (this.vy < 0) { a = side > 0 ? 0.9 : -0.25; bend = side > 0 ? 1.4 : 0.4; } else { a = side > 0 ? 0.35 : -0.3; bend = 0.35; } }
      else if (this.skidding) { a = 0.55; bend = 0.15; }
      else if (moving) { const sn = Math.sin(ph + (side > 0 ? 0 : Math.PI)); a = sn * swing; bend = Math.max(0, Math.cos(ph + (side > 0 ? 0 : Math.PI))) * (0.9 + runAmt * 0.6); }
      else { a = side * 0.08; bend = 0.05; }
      const l1 = 11 * tall, l2 = 11 * tall;
      const knee = [hip[0] + Math.sin(a) * l1, hip[1] + Math.cos(a) * l1];
      const foot = [knee[0] + Math.sin(a - bend) * l2, knee[1] + Math.cos(a - bend) * l2];
      const col = side > 0 ? skin : limbBack;
      seg(hip[0], hip[1], knee[0], knee[1], 7.5, 5.2, col);
      seg(knee[0], knee[1], foot[0], foot[1], 5.2, 3.6, col);
      // Voet
      c.fillStyle = outline; c.beginPath(); c.ellipse(foot[0] + 3, foot[1] - 0.5, 6, 3, 0.05, 0, Math.PI * 2); c.fill();
      c.fillStyle = side > 0 ? mix(skin, outline, 0.25) : mix(limbBack, outline, 0.3); c.beginPath(); c.ellipse(foot[0] + 3, foot[1] - 0.9, 4.6, 1.9, 0.05, 0, Math.PI * 2); c.fill();
    };
    const arm = (side) => {
      const sh = [side * 2 + 1, -35 * tall];
      let a, bend;
      if (hanging) { a = Math.PI - 0.12 * side; bend = 0; }
      else if (this.cheer) { a = Math.PI - 0.45 * side + Math.sin(time * 9 + side + this.x) * 0.35; bend = 0.3 * side; }
      else if (this.throwAnim > 0 && side > 0) { const t = 1 - this.throwAnim / 0.25; a = -2.2 + t * 3.6; bend = -0.3; }
      else if (air) { if (this.vy < 0) { a = side > 0 ? 2.5 : -0.9; bend = side > 0 ? 0.3 : -0.4; } else { a = side > 0 ? 1.9 : -1.6; bend = 0.2; } }
      else if (this.skidding) { a = 1.2; bend = -0.3; }
      else if (moving) { a = Math.sin(ph + (side > 0 ? Math.PI : 0)) * swing * 0.9; bend = -0.35 - runAmt * 0.7; }
      else { a = 0.1 * side + Math.sin(time * 2.4) * 0.03; bend = -0.15; }
      const l = 9.5 * tall;
      const elbow = [sh[0] + Math.sin(a) * l, sh[1] + Math.cos(a) * l];
      const hand = [elbow[0] + Math.sin(a - bend) * l, elbow[1] + Math.cos(a - bend) * l];
      const col = side > 0 ? skin : limbBack;
      seg(sh[0], sh[1], elbow[0], elbow[1], 6, 4.4, col);
      seg(elbow[0], elbow[1], hand[0], hand[1], 4.4, 3.4, col);
      c.fillStyle = outline; c.beginPath(); c.arc(hand[0], hand[1], 3.6, 0, Math.PI * 2); c.fill();
      c.fillStyle = mix(col, '#ffe0c0', 0.15); c.beginPath(); c.arc(hand[0], hand[1], 2.5, 0, Math.PI * 2); c.fill();
      this.drawTool(c, side, hand, a, bend, hanging, time);
    };

    arm(-1); leg(-1);
    c.save(); c.translate(0, -21 * tall); c.rotate(lean); c.translate(0, 21 * tall);
    // Romp: peervorm met vacht, buik en licht van boven
    const ty = -29 * tall;
    const torso = () => { c.beginPath(); c.moveTo(-8, ty - 9); c.bezierCurveTo(-13, ty - 3, -12, ty + 9, -6, ty + 12); c.bezierCurveTo(0, ty + 14, 9, ty + 12, 10, ty + 5); c.bezierCurveTo(11, ty - 4, 7, ty - 12, 0, ty - 12); c.bezierCurveTo(-4, ty - 12, -6, ty - 11, -8, ty - 9); c.closePath(); };
    torso(); c.lineWidth = 2.8; c.strokeStyle = outline; c.stroke();
    const tg = c.createLinearGradient(-10, ty - 12, 8, ty + 12); tg.addColorStop(0, mix(fur, '#ffffff', 0.18)); tg.addColorStop(0.55, fur); tg.addColorStop(1, mix(fur, outline, 0.4));
    torso(); c.fillStyle = tg; c.fill();
    c.fillStyle = mix(skin, '#ffe8c8', 0.2); c.beginPath(); c.ellipse(4, ty + 1, 4.6, 7, 0.15, 0, Math.PI * 2); c.fill();
    // Vachtplukjes op de rug
    c.strokeStyle = mix(fur, outline, 0.5); c.lineWidth = 1.2; c.lineCap = 'round';
    for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-9 + i * 0.5, ty - 6 + i * 4); c.lineTo(-12, ty - 4 + i * 4); c.stroke(); }
    // Lendendoek van huid
    c.fillStyle = '#5e3f22'; c.beginPath(); c.moveTo(-8, ty + 7); c.quadraticCurveTo(1, ty + 11, 10, ty + 7); c.lineTo(9, ty + 14); c.quadraticCurveTo(3, ty + 17, -1, ty + 15); c.quadraticCurveTo(-5, ty + 17, -7, ty + 13); c.closePath(); c.fill();
    c.fillStyle = '#8a6238'; c.beginPath(); c.moveTo(-6, ty + 8); c.quadraticCurveTo(1, ty + 11, 8, ty + 8); c.lineTo(8, ty + 10); c.quadraticCurveTo(1, ty + 13, -6, ty + 10); c.closePath(); c.fill();
    this.drawHead(c, -45 * tall, time, outline, skin, limbBack, hair);
    c.restore();
    leg(1); arm(1);
    c.restore();
  }

  drawHead(c, hy, time, outline, skin, limbBack, hair) {
    const L = this.look;
    // Knipperen af en toe
    this.blinkT = (this.blinkT ?? 2 + Math.random() * 3) - 1 / 60;
    if (this.blinkT < -0.12) this.blinkT = 2.5 + Math.random() * 3.5;
    const blink = this.blinkT < 0 ? 0.05 : 1;
    const flat = L.flat, mz = flat ? 7 : 9.5;
    // Kop: ronde schedel + snuit, met contour
    const skull = () => { c.beginPath(); c.ellipse(1.5, hy, flat ? 10.5 : 10, flat ? 10 : 9.4, 0, 0, Math.PI * 2); };
    const muzzle = () => { c.beginPath(); c.ellipse(mz, hy + 4.5, flat ? 5.5 : 6.6, 5, 0.12, 0, Math.PI * 2); };
    c.lineWidth = 2.8; c.strokeStyle = outline; skull(); c.stroke(); muzzle(); c.stroke();
    const hg = c.createLinearGradient(-8, hy - 10, 8, hy + 10); hg.addColorStop(0, mix(skin, '#ffffff', 0.18)); hg.addColorStop(1, mix(skin, outline, 0.25));
    skull(); c.fillStyle = hg; c.fill();
    muzzle(); c.fillStyle = mix(skin, '#ffe0b8', 0.3); c.fill();
    // Oor
    c.fillStyle = outline; c.beginPath(); c.ellipse(-4, hy + 1, 3.4, 4.4, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = limbBack; c.beginPath(); c.ellipse(-4, hy + 1, 2.3, 3.3, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = mix(limbBack, '#d08070', 0.3); c.beginPath(); c.ellipse(-3.6, hy + 1.4, 1.1, 1.8, 0, 0, Math.PI * 2); c.fill();
    // Haar: plukken die meewiegen
    const sw = Math.sin(time * 3 + this.x * 0.01) * 0.8 + (this.vx || 0) * -0.004;
    c.fillStyle = hair;
    c.beginPath(); c.moveTo(-8, hy + 4); c.quadraticCurveTo(-11, hy - 8, 0, hy - 10.5); c.quadraticCurveTo(9, hy - 11, 11, hy - 4);
    c.lineTo(5, hy - 4.5); c.quadraticCurveTo(0, hy - 3.5, -2, hy + 2); c.quadraticCurveTo(-5, hy - 1, -8, hy + 4); c.closePath(); c.fill();
    for (let i = 0; i < 2; i++) { c.beginPath(); c.moveTo(-5 + i * 5, hy - 9.5); c.quadraticCurveTo(-7 + i * 5 + sw, hy - 13.5, -9.5 + i * 5 + sw * 1.5, hy - 12); c.lineTo(-3 + i * 5, hy - 9); c.fill(); }
    c.fillStyle = mix(hair, '#ffffff', 0.15); c.beginPath(); c.ellipse(1, hy - 8.5, 4, 1.4, -0.1, 0, Math.PI * 2); c.fill();
    if (L.crest) {
      c.fillStyle = outline; c.beginPath(); c.moveTo(-8, hy - 4); c.quadraticCurveTo(-2, hy - 19, 8, hy - 10); c.lineTo(6, hy - 5); c.closePath(); c.fill();
      c.fillStyle = mix(skin, outline, 0.4); c.beginPath(); c.moveTo(-6, hy - 5); c.quadraticCurveTo(-1, hy - 16, 6, hy - 9); c.lineTo(5, hy - 6); c.closePath(); c.fill();
    }
    // Wenkbrauwboog
    c.fillStyle = mix(skin, outline, 0.45); c.beginPath(); c.ellipse(7, hy - 2.6, 5.6, 1.9, 0.1, 0, Math.PI * 2); c.fill();
    // Groot oog met glans
    const scared = this.dead || this.invuln > 1;
    eye(c, 7.4, hy + 0.8, 2.9, '#5a3a20', scared ? 1 : blink);
    // Neus en mond
    c.fillStyle = mix(skin, outline, 0.55); c.beginPath(); c.ellipse(mz + (flat ? 4 : 5), hy + 2.6, 1.6, 1.1, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#5a2e1e'; c.lineWidth = 1.3; c.lineCap = 'round'; c.beginPath();
    if (this.cheer) { c.fillStyle = '#5a2a1c'; c.ellipse(mz + 1.5, hy + 7, 2.8, 2.3, 0, 0, Math.PI * 2); c.fill(); }
    else if (scared) { c.arc(mz + 1.5, hy + 7, 1.6, 0, Math.PI * 2); c.stroke(); }
    else if (L.crest) { const chew = Math.sin(this.anim * 6) * 1.2; c.moveTo(mz - 1, hy + 7 + chew); c.lineTo(mz + 4, hy + 6.5 + chew); c.stroke(); }
    else { c.moveTo(mz - 1.5, hy + 6.5); c.quadraticCurveTo(mz + 1.5, hy + 8, mz + 4.5, hy + 6); c.stroke(); }
  }

  // Handbijl of fakkel in de voorste hand
  drawTool(c, side, hand, a, bend, hanging, time) {
    if (side < 0 || hanging) return;
    if (this.tool === 'axe') {
      c.save(); c.translate(hand[0], hand[1]); c.rotate(a - bend + Math.PI);
      c.fillStyle = '#3a3226'; c.beginPath(); c.moveTo(0, -2); c.quadraticCurveTo(6.5, 3, 1, 15); c.quadraticCurveTo(-5.5, 3, 0, -2); c.fill();
      c.fillStyle = '#c4ad82'; c.beginPath(); c.moveTo(0, -1); c.quadraticCurveTo(5, 3, 1, 13); c.quadraticCurveTo(-4, 3, 0, -1); c.fill();
      c.fillStyle = '#ecdcb4'; c.beginPath(); c.moveTo(0, 1); c.lineTo(2.2, 4.5); c.lineTo(0, 8); c.closePath(); c.fill();
      c.restore();
    } else if (this.tool === 'torch') {
      c.save(); c.translate(hand[0], hand[1]); c.rotate(this.throwAnim > 0 ? 0.9 : 0.25);
      c.strokeStyle = '#4a2f1a'; c.lineWidth = 3.2; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 4); c.lineTo(0, -14); c.stroke();
      const f = Math.sin(time * 18) * 1.5;
      const gl = c.createRadialGradient(0, -20, 1, 0, -20, 18); gl.addColorStop(0, 'rgba(255,200,90,0.55)'); gl.addColorStop(1, 'rgba(255,160,60,0)');
      c.fillStyle = gl; c.beginPath(); c.arc(0, -20, 18, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#ff7a22'; c.beginPath(); c.moveTo(-4.5, -13); c.quadraticCurveTo(-3 + f, -23, 0, -28); c.quadraticCurveTo(3 + f, -23, 4.5, -13); c.closePath(); c.fill();
      c.fillStyle = '#ffe07a'; c.beginPath(); c.moveTo(-2, -14); c.quadraticCurveTo(-1 + f, -19, 0, -22); c.quadraticCurveTo(1 + f, -19, 2, -14); c.closePath(); c.fill();
      c.restore();
    } else if (this.throwAnim > 0.12) {
      c.fillStyle = '#8d8778'; c.beginPath(); c.arc(hand[0], hand[1], 3.2, 0, Math.PI * 2); c.fill();
    }
  }
}

function line(c, pts) { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.stroke(); }
