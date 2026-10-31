// Demo: een stukje van level 1-1 volledig in pixel art (lage resolutie, vast palet, 1px omlijning, dithering).
import { drawPixel } from './pixel.js';

const H = 180;                  // interne hoogte in pixels
const TILE = 16;
const C = {
  ink: '#24160c',
  sky: ['#5ea8d0', '#78bcd8', '#98cede', '#bcdcd8', '#e6dcb0'],
  sun: ['#fff6d0', '#ffe8a0'],
  cloud: ['#ffffff', '#e2eef2', '#b8d2dc'],
  far: ['#94b4b0', '#a8c4bc'], mid: ['#8aa860', '#a2bc6c', '#6e8c4c'], near: ['#76984a', '#5e7e3c'],
  grass: ['#b4dc68', '#8cbc44', '#64962e', '#4a7424'],
  dirt: ['#b07a44', '#94643a', '#784e2e', '#5e3c24', '#d8b07a'],
  leaf: ['#2e4a1e', '#46702c', '#68983a', '#9cc458'], bark: ['#3a2618', '#5e3e24', '#8a603a'],
  tan: ['#e0bc80', '#b48c54', '#7c5a34'], spot: '#4a301a',
  rock: ['#d0c4a8', '#a89a7e', '#76694f'],
  bone: ['#fff8e6', '#d8cca8'],
};

// ---------- Sprite-bakker: masker + kleur per pixel, daarna automatisch een omlijning ----------
function bake(w, h, fn, outline = C.ink) {
  const cv = document.createElement('canvas'); cv.width = w + 2; cv.height = h + 2;
  const c = cv.getContext('2d');
  const grid = [];
  for (let y = 0; y < h; y++) { grid[y] = []; for (let x = 0; x < w; x++) grid[y][x] = fn(x, y); }
  const at = (x, y) => (x >= 0 && y >= 0 && x < w && y < h) ? grid[y][x] : null;
  for (let y = -1; y <= h; y++) for (let x = -1; x <= w; x++) {
    const v = at(x, y);
    if (v) { c.fillStyle = v; c.fillRect(x + 1, y + 1, 1, 1); }
    else if (outline && (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1))) { c.fillStyle = outline; c.fillRect(x + 1, y + 1, 1, 1); }
  }
  return cv;
}
const dither = (x, y) => (x + y) % 2 === 0;
const inEll = (x, y, cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
// Drie tinten met een dither-overgang: t = 0 (licht) .. 1 (donker)
function ramp(t, x, y, [l, m, d]) {
  if (t < 0.3) return l; if (t < 0.4) return dither(x, y) ? l : m;
  if (t < 0.68) return m; if (t < 0.78) return dither(x, y) ? m : d; return d;
}

// Hyena: 4 loopbeelden, 26x16
function hyenaFrame(f) {
  const legOff = [[0, 1, 0, -1], [1, 0, -1, 0], [0, -1, 0, 1], [-1, 0, 1, 0]][f];
  return bake(28, 17, (x, y) => {
    // poten (achter donkerder)
    const legs = [[5, 0, true], [8, 1, false], [17, 2, true], [20, 3, false]];
    for (const [lx, i, back] of legs) { const ox = lx + legOff[i]; if (y >= 10 && y <= 15 && x >= ox && x <= ox + 1 + (y === 15 ? 1 : 0)) return back ? C.tan[2] : (y === 15 ? C.ink : C.tan[1]); }
    // staart
    if ((x === 2 && y === 6) || (x === 1 && y === 7) || (x === 1 && y === 8) || (x === 0 && y === 9) || (x === 1 && y === 9)) return C.tan[2];
    // lijf: hoge schouders, aflopende rug
    const top = 6 - (x - 3) * 0.22, bottom = 11;
    if (x >= 3 && x <= 19 && y >= top && y <= bottom) {
      const t = (y - top) / (bottom - top);
      const spot = ((x * 7 + y * 3) % 11 === 0 || (x * 5 + y * 9) % 13 === 0) && t > 0.15 && t < 0.85;
      return spot ? C.spot : ramp(t, x, y, C.tan);
    }
    // manen
    if (y >= 2 && y <= 4 && x >= 12 && x <= 18 && (x + y) % 2 === 0 && y >= 6 - (x - 3) * 0.22 - 2) return C.spot;
    // kop en snuit
    if (inEll(x, y, 21, 6, 3.6, 3)) { if (x === 22 && y === 5) return '#f0c040'; return ramp((y - 3) / 6, x, y, C.tan); }
    if (x >= 23 && x <= 26 && y >= 6 && y <= 8) return x === 26 && y === 6 ? C.ink : (y === 8 ? C.tan[2] : C.tan[1]);
    // oren
    if ((x === 18 || x === 19) && y >= 1 && y <= 3) return y === 1 ? C.tan[2] : C.tan[1];
    return null;
  });
}

function acacia() {
  return bake(64, 48, (x, y) => {
    // stam en takken
    const trunk = (x >= 30 && x <= 33 && y >= 22) || (y >= 14 && y < 24 && Math.abs(x - (31 - (24 - y) * 1.2)) < 1.4) || (y >= 12 && y < 24 && Math.abs(x - (33 + (24 - y) * 1.5)) < 1.4);
    if (trunk && y < 47) return x <= 31 || x < 31 - (24 - y) * 1.2 + 1 ? C.bark[2] : x >= 33 ? C.bark[0] : C.bark[1];
    // platte kruin: drie lagen bladmassa
    for (const [cx, cy, rx, ry] of [[18, 11, 15, 5], [44, 9, 17, 5.5], [31, 7, 14, 4.5]]) {
      if (inEll(x, y, cx, cy, rx, ry)) {
        const t = (y - (cy - ry)) / (2 * ry), n = ((x * 13 + y * 7) % 5) / 10;
        const tone = t + n * 0.4 - 0.1;
        return tone < 0.25 ? C.leaf[3] : tone < 0.5 ? C.leaf[2] : tone < 0.8 ? (dither(x, y) ? C.leaf[1] : C.leaf[2]) : C.leaf[1];
      }
    }
    return null;
  });
}
function bush() { return bake(22, 10, (x, y) => inEll(x, y, 7, 6, 7, 5) || inEll(x, y, 15, 6, 6, 4.5) ? ramp(y / 10 + ((x * 3) % 4) / 20, x, y, [C.leaf[3], C.leaf[2], C.leaf[1]]) : null); }
function rock() { return bake(34, 20, (x, y) => (inEll(x, y, 12, 12, 11.5, 8.5) || inEll(x, y, 23, 13, 10.5, 7.5)) ? ((x * 5 + y * 3) % 17 === 0 ? C.rock[2] : ramp((y + (x > 22 ? 4 : 0)) / 20 + (x < 6 ? -0.15 : 0), x, y, C.rock)) : null); }
function bone() { return bake(9, 4, (x, y) => ((x <= 1 || x >= 7) ? true : (y === 1 || y === 2)) ? (y === 0 ? C.bone[0] : C.bone[y >= 3 ? 1 : 0]) : null); }
function cloud(w) { return bake(w, 12, (x, y) => (inEll(x, y, w * 0.3, 7, w * 0.25, 4.5) || inEll(x, y, w * 0.55, 5, w * 0.24, 5.5) || inEll(x, y, w * 0.78, 7.5, w * 0.2, 4)) ? (y > 8 ? C.cloud[2] : y > 6 ? (dither(x, y) ? C.cloud[1] : C.cloud[2]) : y > 3 ? C.cloud[1] : C.cloud[0]) : null, null); }

// Grastegel (bovenkant) en aardetegel, 16x16
function grassTile(seed) {
  return bake(16, 16, (x, y) => {
    const h = 3 + ((x * 7 + seed) % 3 === 0 ? 1 : 0);
    if (y < h) return y === 0 ? C.grass[0] : y === 1 ? C.grass[1] : (dither(x, y) ? C.grass[1] : C.grass[2]);
    if (y === h) return C.grass[3];
    if (y === h + 1 && x % 3 === seed % 3) return C.grass[3];
    if ((x * 11 + y * 5 + seed) % 23 === 0) return C.dirt[4];
    if ((x * 3 + y * 7 + seed) % 17 === 0) return C.dirt[3];
    return y < 9 ? C.dirt[0] : y < 13 ? (dither(x, y) ? C.dirt[0] : C.dirt[1]) : C.dirt[1];
  }, null);
}
function dirtTile(seed, deep) {
  return bake(16, 16, (x, y) => {
    if ((x * 11 + y * 5 + seed) % 19 === 0) return C.dirt[4];
    if ((x * 3 + y * 7 + seed) % 13 === 0) return C.dirt[3];
    return deep ? (dither(x, y) && y < 6 ? C.dirt[1] : C.dirt[2]) : (y < 8 ? C.dirt[1] : dither(x, y) ? C.dirt[1] : C.dirt[2]);
  }, null);
}

// ---------- Mini-level ----------
const W_TILES = 70, GROUND = 9;       // grond begint op rij 9 (van boven), 180/16 ≈ 11 rijen in beeld
const solid = new Set();
const setSolid = (x, y) => solid.add(x + ',' + y);
for (let x = 0; x < W_TILES; x++) for (let y = GROUND; y < 12; y++) setSolid(x, y);
for (let x = 30; x <= 31; x++) setSolid(x, GROUND - 1);   // rotsblokje als opstapje
const isSolid = (tx, ty) => tx < 0 || tx >= W_TILES || solid.has(tx + ',' + ty);

const S = {};
function build() {
  S.hy = [0, 1, 2, 3].map(hyenaFrame);
  S.acacia = acacia(); S.bush = bush(); S.rock = rock(); S.bone = bone();
  S.cloudA = cloud(40); S.cloudB = cloud(28);
  S.grass = [0, 1, 2, 3].map(grassTile); S.dirt = [0, 1, 2].map(s => dirtTile(s, false)); S.deep = [0, 1].map(s => dirtTile(s, true));
}

// Speler en hyena
const P = { x: 40, y: GROUND * TILE, vx: 0, vy: 0, ground: true, face: 1, anim: 0, hurt: 0 };
const Y = { x: 48 * TILE, y: GROUND * TILE, dir: -1, t: 0, flee: 0 };
const bones = [12, 13, 14, 22, 23, 30.5, 31.5, 40, 41, 42].map(tx => ({ x: tx * TILE + 4, y: (tx === 30.5 || tx === 31.5 ? GROUND - 2 : GROUND - 1) * TILE + 4, got: false }));
let score = 0, camX = 0, keys = new Set(), touch = { l: false, r: false, j: false }, jumpEdge = false;

function update(dt) {
  const left = keys.has('arrowleft') || keys.has('a') || touch.l, right = keys.has('arrowright') || keys.has('d') || touch.r;
  const dir = left ? -1 : right ? 1 : 0;
  const acc = P.ground ? 500 : 340;
  if (dir) { P.vx += dir * acc * dt; P.face = dir; } else { const f = 560 * dt; P.vx = Math.abs(P.vx) <= f ? 0 : P.vx - Math.sign(P.vx) * f; }
  P.vx = Math.max(-82, Math.min(82, P.vx));
  if (jumpEdge && P.ground) { P.vy = -235; P.ground = false; }
  jumpEdge = false;
  const jumpHeld = keys.has(' ') || keys.has('arrowup') || keys.has('w') || touch.j;
  P.vy += (P.vy < 0 && jumpHeld ? 600 : 1150) * dt; P.vy = Math.min(P.vy, 360);
  // botsingen (horizontaal, dan verticaal); voeten op P.y, breedte 10, hoogte 24
  P.x += P.vx * dt;
  const hw = 5;
  for (const side of [-1, 1]) { const tx = Math.floor((P.x + side * hw) / TILE); for (let ty = Math.floor((P.y - 23) / TILE); ty <= Math.floor((P.y - 1) / TILE); ty++) if (isSolid(tx, ty) && Math.sign(P.vx) === side) { P.x = side > 0 ? tx * TILE - hw : (tx + 1) * TILE + hw; P.vx = 0; } }
  P.y += P.vy * dt; P.ground = false;
  const ty = Math.floor(P.y / TILE);
  if (P.vy >= 0 && (isSolid(Math.floor((P.x - hw + 1) / TILE), ty) || isSolid(Math.floor((P.x + hw - 1) / TILE), ty))) { P.y = ty * TILE; P.vy = 0; P.ground = true; }
  if (P.ground && Math.abs(P.vx) > 5) P.anim += dt * Math.abs(P.vx) / 9; else if (P.ground) P.anim = 0;
  P.hurt = Math.max(0, P.hurt - dt);
  // hyena patrouilleert; erop springen = schrikt en rent weg
  Y.t += dt;
  if (Y.flee > 0) { Y.flee += dt; Y.x += Y.dir * 120 * dt; if (Y.flee > 3) { Y.flee = 0; Y.x = 58 * TILE; Y.dir = -1; } }
  else {
    Y.x += Y.dir * 28 * dt;
    if (Y.x < 34 * TILE || Y.x > 60 * TILE) Y.dir *= -1;
    const dx = P.x - Y.x, dy = P.y - Y.y;
    if (Math.abs(dx) < 15 && dy > -16 && dy <= 2) {
      if (P.vy > 0 && dy < -6) { Y.flee = 0.01; Y.dir = Math.sign(Y.x - P.x) || 1; P.vy = -190; }
      else if (P.hurt <= 0) { P.hurt = 1.2; P.vx = -Math.sign(dx || 1) * -1 * 0 - Math.sign(Y.x - P.x) * 110; P.vy = -140; }
    }
  }
  for (const b of bones) if (!b.got && Math.abs(P.x - (b.x + 4)) < 9 && P.y - 26 < b.y + 4 && P.y > b.y) { b.got = true; score++; }
  camX = Math.max(0, Math.min(W_TILES * TILE - cv.width, P.x - cv.width * 0.4));
}

// ---------- Tekenen ----------
const cv = document.getElementById('pix'), c = cv.getContext('2d');
function resize() {
  const scale = Math.max(1, innerHeight / H);
  cv.height = H; cv.width = Math.round(innerWidth / scale);
  cv.style.width = innerWidth + 'px'; cv.style.height = innerHeight + 'px';
  c.imageSmoothingEnabled = false;
}
addEventListener('resize', resize);

function hash(a, b = 0) { const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return n - Math.floor(n); }
function ridge(off, base, amp, freq, cols, seed) {
  for (let x = 0; x < cv.width; x++) {
    const wx = x + off, h = Math.round(base - (Math.sin(wx * freq + seed) * 0.6 + Math.sin(wx * freq * 2.7 + seed) * 0.25 + 0.85) * amp);
    c.fillStyle = cols[0]; c.fillRect(x, h, 1, H - h);
    c.fillStyle = cols[1]; c.fillRect(x, h, 1, 1);
  }
}
function draw(time) {
  const Wd = cv.width, cx = Math.round(camX);
  // Lucht in banden met dither-overgangen
  const bands = C.sky, bh = 22;
  for (let i = 0; i < bands.length; i++) { c.fillStyle = bands[i]; c.fillRect(0, i * bh, Wd, bh + 1); }
  c.fillStyle = C.sky[4]; c.fillRect(0, bands.length * bh, Wd, H);
  for (let i = 1; i < bands.length; i++) { c.fillStyle = bands[i]; for (let x = 0; x < Wd; x += 2) c.fillRect(x + (i % 2), i * bh - 1, 1, 1); c.fillStyle = bands[i - 1]; for (let x = 1; x < Wd; x += 2) c.fillRect(x, i * bh, 1, 1); }
  // Zon met ringen
  const sx = Math.round(Wd * 0.78 - cx * 0.02), sy = 34;
  c.fillStyle = C.sun[1]; for (let a = 0; a < 16; a++) { const r = 15; c.fillRect(sx + Math.round(Math.cos(a / 16 * 6.28) * r), sy + Math.round(Math.sin(a / 16 * 6.28) * r), 1, 1); }
  c.fillStyle = C.sun[0]; for (let y = -9; y <= 9; y++) { const w = Math.round(Math.sqrt(81 - y * y)); c.fillRect(sx - w, sy + y, w * 2, 1); }
  // Wolken
  for (let i = 0; i < 5; i++) { const span = Wd + 60, x = Math.round(((hash(i) * span * 3 - cx * 0.08 - time * (2 + i)) % span + span) % span) - 40; c.drawImage(i % 2 ? S.cloudA : S.cloudB, x, 14 + Math.round(hash(i, 2) * 40)); }
  // Heuvels: ver, midden met acaciasilhouetten, dichtbij met struiken
  ridge(Math.round(cx * 0.15), 118, 26, 0.02, C.far, 3);
  ridge(Math.round(cx * 0.35), 132, 14, 0.035, [C.mid[0], C.mid[1]], 7);
  for (let i = Math.floor(cx * 0.35 / 90) - 1; i < (cx * 0.35 + Wd) / 90 + 1; i++) {
    const x = Math.round(i * 90 + hash(i, 4) * 40 - cx * 0.35), y = 126 - Math.round(hash(i, 5) * 6);
    c.fillStyle = C.mid[2]; c.fillRect(x + 6, y - 10, 2, 10); c.fillRect(x, y - 13, 15, 3); c.fillRect(x + 2, y - 15, 10, 2);
  }
  ridge(Math.round(cx * 0.6), 146, 6, 0.06, C.near, 11);
  for (let i = Math.floor(cx * 0.6 / 70) - 1; i < (cx * 0.6 + Wd) / 70 + 1; i++) c.drawImage(S.bush, Math.round(i * 70 + hash(i, 6) * 30 - cx * 0.6), 134 + Math.round(hash(i, 7) * 4));
  // Speelveld
  c.save(); c.translate(-cx, 0);
  for (const tx of [6, 25, 52]) c.drawImage(S.acacia, tx * TILE - 32, GROUND * TILE - 48);
  for (let tx = Math.floor(cx / TILE); tx <= (cx + Wd) / TILE; tx++) for (let ty = 0; ty < 12; ty++) {
    if (!isSolid(tx, ty) || tx < 0) continue;
    const top = !isSolid(tx, ty - 1) || (ty === GROUND && tx >= 30 && tx <= 31), s = (tx * 7 + ty) % 4;
    if (tx >= 30 && tx <= 31 && ty === GROUND - 1) continue;
    c.drawImage(top ? S.grass[s] : ty > GROUND + 1 ? S.deep[s % 2] : S.dirt[s % 3], tx * TILE - 1, ty * TILE - 1);
  }
  c.drawImage(S.rock, 30 * TILE - 2, GROUND * TILE - 21);
  for (const b of bones) if (!b.got) c.drawImage(S.bone, b.x, b.y + Math.round(Math.sin(time * 3 + b.x) * 1.2));
  // Hyena
  const hf = S.hy[Math.floor(Y.t * (Y.flee ? 14 : 6)) % 4];
  c.save(); c.translate(Math.round(Y.x), Math.round(Y.y)); if (Y.dir < 0) c.scale(-1, 1);
  if (Y.flee) c.globalAlpha = Math.max(0, 1 - Y.flee / 2);
  c.drawImage(hf, -14, -16); c.restore();
  // Speler (pixel.js habilis)
  if (!(P.hurt > 0 && Math.floor(time * 14) % 2)) {
    const anim = !P.ground ? (P.vy < 0 ? 'jump' : 'fall') : Math.abs(P.vx) > 5 ? 'walk' : 'idle';
    c.save(); c.translate(Math.round(P.x), Math.round(P.y)); if (P.face < 0) c.scale(-1, 1);
    drawPixel(c, anim, anim === 'walk' ? P.anim : time * 1.6, { blink: (time % 4) < 0.12 }); c.restore();
  }
  c.restore();
  // Voorgrond-gras (donker silhouet) en score
  c.fillStyle = '#2c4418';
  for (let i = Math.floor(cx * 1.3 / 6) - 1; i < (cx * 1.3 + Wd) / 6 + 1; i++) { if (hash(i, 9) < 0.5) continue; const x = Math.round(i * 6 - cx * 1.3), h = 3 + Math.round(hash(i, 3) * 6); c.fillRect(x, H - h, 1, h); c.fillRect(x + 1, H - h + 2, 1, h - 2); }
  c.drawImage(S.bone, 6, 6); c.fillStyle = C.ink; c.fillRect(18, 6, 15, 7); c.fillStyle = '#fff6dc';
  digits(String(score).padStart(2, '0'), 19, 7);
}
// Minimaal pixel-lettertype voor de score
const FONT = { 0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111', 4: '101101111001001', 5: '111100111001111', 6: '111100111101111', 7: '111001001001001', 8: '111101111101111', 9: '111101111001111' };
function digits(s, x, y) { for (const ch of s) { const g = FONT[ch]; for (let i = 0; i < 15; i++) if (g[i] === '1') c.fillRect(x + (i % 3), y + Math.floor(i / 3), 1, 1); x += 4; } }

// ---------- Invoer ----------
addEventListener('keydown', e => { const k = e.key.toLowerCase(); if ([' ', 'arrowup', 'w'].includes(k) && !keys.has(k)) jumpEdge = true; keys.add(k); if ([' ', 'arrowup', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault(); });
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
const pts = new Map();
function syncTouch() { touch.l = touch.r = touch.j = false; for (const p of pts.values()) { if (p.x < innerWidth * 0.25) touch.l = true; else if (p.x < innerWidth * 0.5) touch.r = true; else touch.j = true; } }
cv.addEventListener('pointerdown', e => { pts.set(e.pointerId, { x: e.clientX }); if (e.clientX >= innerWidth * 0.5) jumpEdge = true; syncTouch(); });
cv.addEventListener('pointermove', e => { if (pts.has(e.pointerId)) { pts.get(e.pointerId).x = e.clientX; syncTouch(); } });
for (const ev of ['pointerup', 'pointercancel']) cv.addEventListener(ev, e => { pts.delete(e.pointerId); syncTouch(); });

build(); resize();
let last = performance.now();
function loop(now) { const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now; update(dt); draw(now / 1000); requestAnimationFrame(loop); }
requestAnimationFrame(loop);
window.demo = { P, Y, get camX() { return camX; } };
