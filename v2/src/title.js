// Startscherm "Oersprong": een levend oerwoud in pixelart met een houten bord als logo.
// Interne hoogte 180 pixels; de breedte volgt het scherm.

import { drawRig, rigLook, pose } from './rig.js';
import { SPECIES } from './species.js';

export const TH = 180;
const hash = (a, b = 0) => { const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return n - Math.floor(n); };
const INK = '#1c140c';

function ell(c, x, y, rx, ry, col) { c.fillStyle = col; for (let dy = -ry; dy <= ry; dy++) { const w = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry)))); c.fillRect(Math.round(x - w), Math.round(y + dy), w * 2 + 1, 1); } }
function leafBlob(c, x, y, r, cols, seed) {
  // Bladerkluwen: een paar overlappende bollen, licht van rechtsboven
  for (let i = 0; i < 6; i++) { const a = hash(i, seed) * 6.28, d = r * 0.55 * hash(i, seed + 1); ell(c, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7, Math.round(r * (0.5 + hash(i, seed + 2) * 0.3)), Math.round(r * (0.4 + hash(i, seed + 3) * 0.25)), cols[i % 2 ? 1 : 2]); }
  for (let i = 0; i < 4; i++) { const a = -0.8 + hash(i, seed + 5) * 1.2, d = r * 0.4; ell(c, x + Math.cos(a) * d, y - r * 0.25 + Math.sin(a) * d * 0.5, Math.round(r * 0.3), Math.round(r * 0.22), cols[0]); }
  c.fillStyle = cols[3]; for (let i = 0; i < r * 3; i++) c.fillRect(Math.round(x + (hash(i, seed + 7) - 0.5) * r * 1.6), Math.round(y + (hash(i, seed + 8) - 0.2) * r * 0.9), 1, 1);
}


// Pixelkunst bakken: fn(x,y) geeft een kleur of null; daarna een donkere rand eromheen
function bake(w, h, fn, outline = INK) {
  const cv = document.createElement('canvas'); cv.width = w + 2; cv.height = h + 2; const c = cv.getContext('2d');
  const g = []; for (let y = 0; y < h; y++) { g[y] = []; for (let x = 0; x < w; x++) g[y][x] = fn(x, y); }
  const at = (x, y) => x >= 0 && y >= 0 && x < w && y < h ? g[y][x] : null;
  for (let y = -1; y <= h; y++) for (let x = -1; x <= w; x++) { const v = at(x, y); if (v) { c.fillStyle = v; c.fillRect(x + 1, y + 1, 1, 1); } else if (outline && (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1))) { c.fillStyle = outline; c.fillRect(x + 1, y + 1, 1, 1); } }
  return cv;
}
const WOOD = ['#c99456', '#b07a40', '#9a6834', '#86582c', '#6e4624', '#55351a'];
// Eén plank: nerven, een knoest, rafelige uiteinden met splinters, afgebrokkelde hoeken
function plankPixel(x, y, w, h, seed, tint = 0) {
  const endL = Math.floor(hash(y, seed) * 3) + (y === 0 || y === h - 1 ? 2 : 0) + (hash(Math.floor(y / 2), seed + 5) > 0.75 ? 2 : 0);
  const endR = Math.floor(hash(y, seed + 9) * 3) + (y === 0 || y === h - 1 ? 2 : 0) + (hash(Math.floor(y / 2), seed + 6) > 0.75 ? 2 : 0);
  if (x < endL || x > w - 1 - endR) return null;
  const kx = 10 + Math.floor(hash(seed, 3) * (w - 20)), ky = Math.floor(h / 2), kd = Math.hypot((x - kx) * 0.6, y - ky);
  if (kd < 1.6) return WOOD[5]; if (kd < 2.6) return WOOD[3]; if (kd < 3.4 && (x + y) % 2) return WOOD[4];
  const grain = ((x * 0.07 + Math.sin(y * 0.9 + seed) * 0.5 + (kd < 7 ? 2 / (kd + 0.5) : 0)) % 1 + 1) % 1;
  let k = 1 + tint + (y === 0 ? -1 : y === 1 ? 0 : y >= h - 2 ? 2 : 1);
  if (grain < 0.07) k += 2; else if (grain < 0.13) k += 1;
  if (hash(x, y * 7 + seed) > 0.97) k += 1;
  if (x === endL || x === w - 1 - endR) k += 1;           // kopse kant iets donkerder
  return WOOD[Math.max(0, Math.min(5, k))];
}
// Bord van losse planken (rijen), elk met eigen lengte en verschuiving, kiertjes ertussen en spijkers
export function plankBoard(w, rows, rowH, seed = 1) {
  const H = rows * rowH + (rows - 1);
  const off = [...Array(rows)].map((_, r) => [Math.round((hash(r, seed) - 0.5) * 8), Math.round((hash(r, seed + 1) - 0.5) * 8)]);
  const cv = bake(w + 12, H, (x, y) => {
    const r = Math.floor(y / (rowH + 1)), yy = y - r * (rowH + 1);
    if (yy === rowH) return null;                                   // kier
    const [a, b] = off[r], x0 = 6 + a, x1 = w + 6 + b;
    if (x < x0 || x >= x1) return null;
    return plankPixel(x - x0, yy, x1 - x0, rowH, seed * 31 + r * 7, r % 2);
  });
  const c = cv.getContext('2d');
  for (let r = 0; r < rows; r++) for (const nx of [18, w - 12]) { const ny = 1 + r * (rowH + 1) + Math.floor(rowH / 2); c.fillStyle = INK; c.fillRect(nx, ny - 1, 3, 3); c.fillStyle = '#b8b8b0'; c.fillRect(nx, ny - 1, 2, 2); c.fillStyle = '#e8e8e0'; c.fillRect(nx, ny - 1, 1, 1); }
  return cv;
}
// Boomstamschijf met jaarringen en schors, met een pixelicoon erop (rijen van 0/1)
export function logSlice(icon, R = 9) {
  const D = R * 2 + 1;
  return bake(D, D, (x, y) => {
    const d = Math.hypot(x - R, y - R); if (d > R + 0.3) return null;
    const iy = y - (R - Math.floor(icon.length / 2)), ix = x - (R - Math.floor(icon[0].length / 2));
    if (iy >= 0 && iy < icon.length && ix >= 0 && ix < icon[0].length && icon[iy][ix] === '1') return '#3a2210';
    if (d > R - 1.6) return (x + y) % 3 ? '#5e3c20' : '#4a2e18';             // schors
    if (d > R - 2.4) return '#c08a50';
    const ring = (d * 0.9 + hash(Math.floor(Math.atan2(y - R, x - R) * 3), 1) * 0.6) % 2;
    return ring < 0.35 ? '#c8945a' : (x - y) > 2 ? '#e8c890' : '#f2d8a4';
  });
}


const BARK = ['#a08a62', '#857252', '#6c5c42', '#544632', '#3c3224'];
// Oerwoudreus: taps toelopende, licht kromme stam met schorsgroeven, mos, een liaan eromheen en plankwortels
function treeTrunk(h, w, seed) {
  const W2 = w * 2 + 50, cx0 = W2 / 2;
  const half = y => w * (0.82 + 0.18 * y / h) + (y > h - 26 ? Math.pow(y - (h - 26), 1.55) * 0.42 : 0);
  const mid = y => cx0 + Math.sin(y * 0.022 + seed) * 3;
  return { cv: bake(W2, h, (x, y) => {
    const hw = half(y), u = (x - mid(y)) / hw;
    if (Math.abs(u) > 1) return null;
    // Plankwortels: ribbels met donkere spleten ertussen
    if (y > h - 26 && Math.abs(u) > 0.55 && (Math.floor((x - mid(y)) / 4) % 2 === 0) && hash(x, y) > 0.3) return BARK[4];
    let k = u > 0.45 ? 0 : u > 0 ? 1 : u > -0.55 ? 2 : 3;      // licht van rechtsboven
    const fx = x + Math.round(Math.sin(y * 0.13 + x * 0.7) * 1.2);
    if (fx % 5 === 0) k = Math.min(4, k + 1);                     // schorsgroeven
    if (hash(Math.floor(x / 2), Math.floor(y / 3) + seed) > 0.93) k = Math.min(4, k + 1);
    if (u < -0.35 && hash(Math.floor(x / 3), Math.floor(y / 4) + seed * 3) > 0.7) return (x + y) % 3 ? '#4e7a34' : '#6a9a44';   // mos
    const lv = ((y + x * 1.6 + seed * 37) % 46 + 46) % 46;        // liaan die om de stam draait
    if (y < h - 30 && lv < 2.2) return lv < 1 ? '#3e6a2a' : '#6a9e44';
    return BARK[k];
  }), ox: cx0, half, mid };
}
// Zijtak die uit de stam groeit: dik bij de stam, dun naar de punt, licht omhoog gebogen
function sideBranch(len, thick, seed) {
  const H2 = thick * 2 + 14;
  return bake(len, H2, (x, y) => {
    const q = 1 - x / len;                                         // 0 bij de stam (rechts), 1 bij de punt (links)
    const th = thick * (1 - q * 0.6) + (x > len - 6 ? (x - (len - 6)) * 0.8 : 0);   // kraag bij de stam
    const cy = H2 / 2 + 2 - Math.sin(q * Math.PI * 0.9) * 3;
    const d = y - cy;
    if (Math.abs(d) > th / 2) return null;
    const k = d < -th / 2 + 1.2 ? 0 : d < 0 ? 1 : d < th / 4 ? 2 : 3;
    if ((x * 3 + Math.round(d)) % 9 === 0) return BARK[Math.min(4, k + 1)];
    if (hash(Math.floor(x / 3), seed) > 0.9 && Math.abs(d) < th / 3) return BARK[4];
    return BARK[k];
  });
}


// ---------- losse onderdelen voor het oerwoud ----------
function crown(c, x, y, type, s, cols, seed) {
  const [l, m, d] = cols, R = v => Math.max(1, Math.round(v));
  if (type === 'umbrella') { ell(c, x, y, R(15 * s), R(4 * s), d); ell(c, x - R(2 * s), y - 1, R(13 * s), R(3 * s), m); ell(c, x + R(4 * s), y - R(2 * s), R(6 * s), R(2 * s), l); }
  else if (type === 'round') { for (let i = 0; i < 6; i++) ell(c, x + (hash(i, seed) - 0.5) * 14 * s, y + (hash(i, seed + 1) - 0.5) * 8 * s, R((5 + hash(i, seed + 2) * 4) * s), R((4 + hash(i, seed + 3) * 3) * s), i % 2 ? m : d); ell(c, x + R(3 * s), y - R(3 * s), R(4 * s), R(3 * s), l); }
  else if (type === 'column') { for (let k = 0; k < 5; k++) ell(c, x, y + k * 5 * s, R((4 + Math.sin(k * 1.3) * 1.2) * s), R(4 * s), k % 2 ? m : d); ell(c, x + 1, y - 1, R(2 * s), R(3 * s), l); }
  else if (type === 'palm') { for (let k = 0; k < 7; k++) { const a = -Math.PI + k * Math.PI / 6 + (hash(k, seed) - 0.5) * 0.3; for (let i = 0; i < 11 * s; i++) { c.fillStyle = i % 3 ? m : l; c.fillRect(Math.round(x + Math.cos(a) * i), Math.round(y + Math.sin(a) * i * 0.6 + i * i * 0.04 / s), 1, 1); if (i % 2) { c.fillStyle = d; c.fillRect(Math.round(x + Math.cos(a) * i), Math.round(y + Math.sin(a) * i * 0.6 + i * i * 0.04 / s) + 1, 1, 1); } } } }
  else if (type === 'pagoda') { for (let k = 0; k < 3; k++) { ell(c, x, y + k * 7 * s, R((5 + k * 4) * s), R(2 * s), d); ell(c, x - 1, y + k * 7 * s - 1, R((4 + k * 4) * s), R(1.2 * s), k ? m : l); } }
}
function cloud(c, x, y, w) { ell(c, x, y, w, 3, '#e8f6f4'); ell(c, x - w * 0.3, y - 2, Math.round(w * 0.5), 3, '#ffffff'); ell(c, x + w * 0.3, y - 3, Math.round(w * 0.4), 3, '#ffffff'); c.fillStyle = '#cfe8e6'; c.fillRect(x - w + 2, y + 2, w * 2 - 4, 1); }
// Reuzenkapokboom: brede grijze stam met plankwortels, holte, stekels, bromelia's en orchideeën
let _kapok = null;
function kapok() {
  if (_kapok) return _kapok;
  const W2 = 92, H2 = 158, cx = 45;
  const half = y => 8 + y * 0.03;
  _kapok = bake(W2, H2, (x, y) => {
    const dx = x - cx - Math.sin(y * 0.02) * 2, hw = half(y);
    // Plankwortels: drie vinnen aan elke kant
    // Plankwortels: holle, gebogen flenzen die uitwaaieren naar de grond
    const q = y > 92 ? (y - 92) / (H2 - 92) : 0, outL = hw + 38 * Math.pow(q, 2.2), outR = hw + 30 * Math.pow(q, 2.4);
    const edge = dx < 0 ? outL : outR;
    if (Math.abs(dx) > edge) return null;
    if (Math.abs(dx) > hw) {
      const r = (Math.abs(dx) - hw) / Math.max(1, edge - hw), lit = dx > 0;
      for (const f of [0.35, 0.7]) if (Math.abs(r - f * Math.pow(q, 0.3)) < 0.06) return lit ? '#c4c0b0' : '#9a9686';
      if (r > 0.92) return lit ? '#8a8676' : '#5e5a4e';
      return (Math.floor(r * 3) % 2 ? (lit ? '#a8a494' : '#7e7a6c') : (lit ? '#9c988a' : '#726e60'));
    }
    if (Math.hypot((dx + 1) * 1.2, y - 136) < 6) return Math.hypot((dx + 1) * 1.2, y - 136) < 4.5 ? '#1e140c' : '#3a2e22';   // holte
    const u = dx / hw; let col = u > 0.45 ? '#b6b2a2' : u > -0.1 ? '#a09c8c' : u > -0.6 ? '#8a8676' : '#726e60';
    if ((y * 3 + Math.round(dx)) % 17 === 0 && y < 90) return '#5e5a4e';                    // stekels
    if ((Math.round(dx * 2) + Math.floor(y / 9)) % 13 === 0) col = '#7a7668';
    if (u < -0.4 && hash(Math.floor(x / 3), Math.floor(y / 4)) > 0.72) return '#5e8a3e';      // mos
    return col;
  });
  const c = _kapok.getContext('2d');
  // Bromelia's (rozetten met een rood hart) en roze orchideetjes op de stam
  for (const [bx, by] of [[cx - 10, 66], [cx + 8, 92]]) { for (let k = -3; k <= 3; k++) { c.fillStyle = '#4e8a3a'; c.fillRect(bx + k * 2, by - Math.abs(k), 2, 1); c.fillRect(bx + k * 2 + (k > 0 ? 1 : 0), by - Math.abs(k) - 1, 1, 1); } c.fillStyle = '#e8402a'; c.fillRect(bx - 1, by - 3, 3, 3); c.fillStyle = '#ffb040'; c.fillRect(bx, by - 4, 1, 1); }
  for (const [ox, oy] of [[cx + 6, 48], [cx + 9, 52], [cx - 4, 110]]) { c.fillStyle = '#ff7ac8'; c.fillRect(ox, oy, 2, 2); c.fillStyle = '#ffe0f0'; c.fillRect(ox, oy, 1, 1); }
  return _kapok;
}
// Wurgvijg: een stam van ineengevlochten wortels met openingen ertussen
let _fig = null;
function strangler() {
  if (_fig) return _fig;
  const W2 = 60, H2 = 158, cx = 34, N = 5;
  const strand = (i, y) => cx + (i - 2) * 3.4 * (0.7 + y / H2 * 0.5) + Math.sin(y * 0.07 + i * 1.9) * 3 + (y > 120 ? (i - 2) * (y - 120) * 0.35 : 0);
  const cv = bake(W2, H2, (x, y) => {
    for (let i = 0; i < N; i++) { const d = x - strand(i, y); if (Math.abs(d) <= 1.8) { const k = d > 0.6 ? 0 : d > -0.6 ? 1 : 2; if ((y + i * 5) % 11 === 0) return '#5a4e38'; return ['#b8a882', '#9a8a68', '#7a6c50'][k]; } }
    return null;
  });
  _fig = { cv, ox: cx, edge: y => Math.min(...[0, 1, 2, 3, 4].map(i => strand(i, y))) - 1 };
  return _fig;
}
// Bladerdak bovenin: onregelmatige kluwens, grote hangende bladeren
function bakeCanopy(W) {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = 40; const c = cv.getContext('2d');
  for (let x = -10, i = 0; x < W + 20; i++) { x += 12 + hash(i, 300) * 22; leafBlob(c, x, -6 + hash(i, 301) * 10, 10 + Math.round(hash(i, 302) * 12), [['#5aa046', '#3e8a3a', '#2a6a2e', '#7ab85a'], ['#6ab04e', '#4a9a3e', '#2e7432', '#8ac862'], ['#4e9640', '#367e36', '#24602a', '#6aa850']][i % 3], 50 + i); }
  return cv;
}
function plant(c, x, y, kind, seed) {
  if (kind === 'fern') { for (let a = -5; a <= 5; a++) for (let s = 0; s < 13; s++) { c.fillStyle = s > 9 ? '#a8dc6a' : s % 2 ? '#4e9a34' : '#62ae40'; c.fillRect(Math.round(x + a * s * 0.5), Math.round(y - s * 1.0 + Math.abs(a) * s * 0.09), 1, 1); } }
  else if (kind === 'ear') { for (const [dx, h, d] of [[-5, 14, -1], [3, 18, 1], [-1, 11, 1]]) { c.fillStyle = '#3e7a2e'; c.fillRect(x + dx, y - h + 6, 1, h - 6); for (let k = 0; k < 9; k++) { const w = Math.round(Math.sin(k / 9 * Math.PI) * 4); c.fillStyle = k < 3 ? '#8ad05a' : '#5aa842'; c.fillRect(x + dx + d * 2 - w, y - h + k, w * 2 + 1, 1); } c.fillStyle = '#2e6a28'; c.fillRect(x + dx + d * 2, y - h + 1, 1, 7); } }
  else if (kind === 'flower') { for (let k = 0; k < 5; k++) { const fx = x - 5 + k * 2.5, fh = 5 + hash(k, seed) * 6; c.fillStyle = '#4e8a34'; c.fillRect(Math.round(fx), Math.round(y - fh), 1, Math.round(fh)); c.fillStyle = ['#ff5a5a', '#ffd34a', '#ff9ad0', '#ffffff', '#c86aff'][(k + seed) % 5]; c.fillRect(Math.round(fx) - 1, Math.round(y - fh) - 1, 3, 2); } }
  else { for (let k = 0; k < 9; k++) { const gx = x - 6 + k * 1.5, gh = 4 + hash(k, seed + 3) * 7; c.fillStyle = k % 2 ? '#7ac040' : '#5aa034'; for (let s = 0; s < gh; s++) c.fillRect(Math.round(gx + s * (k - 4) * 0.06), Math.round(y - s), 1, 1); } }
}
function banana(c, x, y, len, ang, flip, t) {
  const sw = Math.sin(t * 1.2) * 0.04;
  for (let i = 0; i < len; i++) {
    const a = ang + sw + i * 0.008, px = x + Math.cos(a) * i * flip, py = y + Math.sin(a) * i + i * i * 0.0045;
    const w = Math.round(Math.sin(Math.min(1, i / len * 1.15) * Math.PI) * 9);
    for (let k = -w; k <= w; k++) {
      if (k !== 0 && (i * 7 + k * 3) % 23 === 0 && Math.abs(k) > 3) continue;   // scheurtjes in het blad
      c.fillStyle = k === 0 ? '#c8ec8a' : Math.abs(k) === w ? '#2a5e24' : k < 0 ? ((i + k) % 5 === 0 ? '#5aa840' : '#6ab84a') : ((i - k) % 5 === 0 ? '#3e8a34' : '#4e9a3a');
      c.fillRect(Math.round(px - Math.sin(a) * k * flip * 0.9), Math.round(py + Math.cos(a) * k * 0.9), 1, 1);
    }
  }
}
function elephant(c, x, y, s, t) {
  const col = '#7a8a7e', dk = '#5e6e64', R = v => Math.max(1, Math.round(v * s));
  ell(c, x, y - R(8), R(9), R(5), col); ell(c, x - R(7), y - R(10), R(5), R(5), col);
  c.fillStyle = dk; ell(c, x - R(5), y - R(9), R(2), R(3), dk);
  for (const lx of [-6, -2, 4, 7]) { c.fillStyle = lx > 0 ? col : dk; c.fillRect(x + R(lx) - 1, y - R(4), R(2.2), R(4)); }
  const tr = Math.sin(t * 1.5) * 1; c.fillStyle = col; for (let i = 0; i < R(8); i++) c.fillRect(Math.round(x - R(11) - Math.min(1, i / 4) + (i > 5 ? tr : 0)), y - R(9) + i, R(1.6), 1);
  if (s > 0.8) { c.fillStyle = '#f4f0e0'; c.fillRect(x - R(11), y - R(6), 2, 1); }
  c.fillStyle = '#ffffff'; c.fillRect(x - R(13), y + 1, 3, 1);
}
function parrot(c, x, y, f) {
  c.fillStyle = '#8a9098'; c.fillRect(x, y, 5, 3); c.fillStyle = '#a8aeb6'; c.fillRect(x - 2, y, 3, 2); c.fillStyle = '#d83a2a'; c.fillRect(x + 5, y + 1, 3, 2);
  c.fillStyle = '#2a2a2a'; c.fillRect(x - 3, y + 1, 1, 1); c.fillStyle = '#6a7078'; if (f) c.fillRect(x + 1, y - 3, 3, 3); else c.fillRect(x + 1, y + 3, 3, 2);
}
function hornbill(c, x, y, t) {
  const bob = Math.floor(t * 0.8) % 4 === 0 ? 1 : 0;
  c.fillStyle = INK; c.fillRect(x - 1, y - 10, 10, 9); c.fillStyle = '#2a2a2e'; c.fillRect(x, y - 9, 8, 7); c.fillStyle = '#f4f0e8'; c.fillRect(x + 1, y - 4, 5, 2); c.fillRect(x + 8, y - 6, 4, 2);
  c.fillStyle = '#2a2a2e'; c.fillRect(x + 8, y - 8, 6, 3); c.fillStyle = '#f4f0e8'; c.fillRect(x + 13, y - 8, 1, 3);   // staart met witte punt
  c.fillStyle = '#2a2a2e'; c.fillRect(x - 3, y - 13 + bob, 5, 5); c.fillStyle = '#ffffff'; c.fillRect(x - 2, y - 12 + bob, 1, 1);
  c.fillStyle = '#f0c030'; c.fillRect(x - 9, y - 11 + bob, 7, 2); c.fillStyle = '#e06020'; c.fillRect(x - 9, y - 10 + bob, 3, 2); c.fillStyle = '#f8d850'; c.fillRect(x - 7, y - 13 + bob, 5, 2);   // snavel met helm
  c.fillStyle = '#c8a050'; c.fillRect(x + 2, y - 1, 1, 2); c.fillRect(x + 5, y - 1, 1, 2);
}
function colobus(c, x, y, ang, t) {
  // Hangt aan één arm; zwart lijf, witte mantel en een lange witte staart met pluim
  c.fillStyle = '#1e1e22'; c.fillRect(x - 1, y, 2, 5); c.fillRect(x - 3, y + 4, 6, 8); c.fillRect(x - 3, y + 1, 5, 4);
  c.fillStyle = '#f4f4ee'; c.fillRect(x - 4, y + 5, 1, 7); c.fillRect(x + 3, y + 5, 1, 7); c.fillRect(x - 3, y + 1, 1, 3); c.fillRect(x + 1, y + 1, 1, 3);
  c.fillStyle = '#3a3a3e'; c.fillRect(x - 2, y + 2, 3, 2);
  const sw = Math.sin(t * 2) * 2; c.fillStyle = '#1e1e22'; c.fillRect(x - 2, y + 12, 2, 4); c.fillRect(x + 1, y + 12, 2, 3);
  c.fillStyle = '#f4f4ee'; for (let i = 0; i < 16; i++) c.fillRect(Math.round(x + 2 + i * 0.3 - ang * i * 0.8 + Math.sin(i * 0.3 + t * 2) * (i / 16) * sw), y + 10 + i, 1, 1);
  ell(c, Math.round(x + 7 - ang * 13 + sw), y + 27, 2, 3, '#ffffff');
}

// Pixelletters 5x7 voor het logo
const FONT = {
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
};
function logo(word, px = 3) {
  const cw = 5 * px, gap = px, W = word.length * (cw + gap) - gap + 6, H = 7 * px + 7;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
  const cells = []; [...word].forEach((ch, i) => FONT[ch].forEach((row, ry) => [...row].forEach((b, rx) => { if (b === '1') cells.push([3 + i * (cw + gap) + rx * px, 2 + ry * px, ry]); })));
  // Dikke donkere rand + schaduw, dan de letters met een verloop van zonnig geel naar oranje
  c.fillStyle = '#3a1e0c'; for (const [x, y] of cells) c.fillRect(x - 2, y - 1, px + 4, px + 4);
  c.fillStyle = INK; for (const [x, y] of cells) c.fillRect(x - 1, y - 1, px + 2, px + 2);
  const grad = ['#fff4a8', '#ffe46a', '#ffd040', '#ffb830', '#ff9a28', '#f07c20', '#d8601a'];
  for (const [x, y, ry] of cells) { c.fillStyle = grad[ry]; c.fillRect(x, y, px, px); }
  c.fillStyle = '#ffffffb0'; for (const [x, y, ry] of cells) if (ry === 0) c.fillRect(x, y, px, 1);
  return cv;
}

export class TitleScene {
  constructor() { this.logo = logo('OERSPRONG'); this.homDy = 9; }
  // Statische achtergrond (lucht, bergen, waterval-rots, bossen in de mist) één keer voorbakken
  bakeBack(W) {
    const H = TH, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
    const sky = ['#4fb6c8', '#5ebecc', '#74c8cc', '#8ed2c8', '#acdcc0', '#cce4ac', '#e8e6a0'];
    const bh = Math.ceil(116 / sky.length);
    sky.forEach((col, i) => { c.fillStyle = col; c.fillRect(0, i * bh, W, bh + 1); if (i) { c.fillStyle = sky[i - 1]; for (let x = i % 2; x < W; x += 2) c.fillRect(x, i * bh, 1, 1); } });
    c.fillStyle = sky[sky.length - 1]; c.fillRect(0, sky.length * bh, W, H);
    // Verre bergrug met een paar toppen
    for (let x = 0; x < W; x++) { const y = Math.round(92 - Math.max(0, 18 - Math.abs(x - W * 0.62) * 0.25) - Math.sin(x * 0.031) * 6 - Math.sin(x * 0.087 + 2) * 3); c.fillStyle = '#a6cfc4'; c.fillRect(x, y, 1, H); c.fillStyle = '#bcdcd0'; c.fillRect(x, y, 1, 1); }
    // Verre bomen: elke boom een eigen soort, maat en kleur
    this.forest(c, W, 112, 0.7, [['#b2dac6', '#a0cfba', '#8ec2ac'], ['#aad6c0', '#98cab4', '#86bca6']], 101, 1, 22);
    // Mistband
    for (let y = 100; y < 120; y++) { c.globalAlpha = 0.45 * (1 - Math.abs(y - 110) / 10); c.fillStyle = '#e4f2e6'; c.fillRect(0, y, W, 1); } c.globalAlpha = 1;
    // Rotswand met de waterval (links) en de poel eronder
    const fx = Math.round(W * 0.23);
    for (let x = fx - 22; x < fx + 22; x++) {
      const top = Math.round(60 + Math.abs(x - fx) * 0.35 + Math.sin(x * 0.7) * 2 + hash(x, 4) * 2);
      for (let y = top; y < 126; y++) { const u = (x - fx) / 22, k = u > 0.3 ? 2 : u > -0.3 ? 1 : 0, crack = (x * 3 + Math.floor(y / 5) * 7) % 11 === 0;
        c.fillStyle = crack ? '#5e6a60' : ['#9aa89a', '#84928a', '#6e7c72'][k]; c.fillRect(x, y, 1, 1); }
      c.fillStyle = '#6aa04a'; c.fillRect(x, top - 1, 1, 3); if (hash(x, 9) > 0.6) { c.fillStyle = '#4e8a3a'; c.fillRect(x, top + 2, 1, 2 + Math.floor(hash(x, 10) * 6)); }
    }
    // Middenbos: donkerder en groter, met open plek bij de waterval
    this.forest(c, W, 128, 1, [['#7cba8a', '#68a878', '#569866'], ['#86c088', '#6eae76', '#5a9a64']], 202, 1.25, 30, [fx - 30, fx + 46]);
    return cv;
  }
  // Rij bomen met wisselende soorten: parasol, bol, zuil, palm, etage
  forest(c, W, base, s, palettes, seed, hs, gap, skip) {
    const types = ['umbrella', 'round', 'column', 'palm', 'pagoda', 'round', 'umbrella', 'column'];
    for (let x = -10, i = 0; x < W + 20; i++) {
      x += gap * 0.5 + hash(i, seed) * gap;
      if (skip && x > skip[0] && x < skip[1]) continue;
      const type = types[Math.floor(hash(i, seed + 1) * types.length)], h = Math.round((18 + hash(i, seed + 2) * 30) * hs), sc = s * (0.75 + hash(i, seed + 3) * 0.6);
      const cols = palettes[i % palettes.length], by = base + Math.round(Math.sin(x * 0.05) * 2), lean = (hash(i, seed + 4) - 0.5) * 6;
      c.fillStyle = cols[2]; for (let y = 0; y < h; y++) c.fillRect(Math.round(x + lean * y / h), by - y, type === 'palm' ? 1 : 2, 1);
      crown(c, Math.round(x + lean), by - h, type, sc, cols, i + seed);
    }
    c.fillStyle = palettes[0][2]; for (let x = 0; x < W; x++) { const y = base + Math.round(Math.sin(x * 0.05) * 2); c.fillRect(x, y, 1, TH - y); }
  }
  // Voorgrond die niet beweegt: kapokboom, wurgvijg, grond, omgevallen stam
  bakeFront(W) {
    const H = TH, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
    // Grond
    for (let x = 0; x < W; x++) { const y = 148 + Math.round(Math.sin(x * 0.07) * 2 + Math.sin(x * 0.19)); c.fillStyle = '#8acc48'; c.fillRect(x, y, 1, 1); c.fillStyle = '#62a83a'; c.fillRect(x, y + 1, 1, 3); c.fillStyle = '#7a5434'; c.fillRect(x, y + 4, 1, H); c.fillStyle = '#5e3e26'; if (hash(x, 3) > 0.8) c.fillRect(x, y + 7 + (x % 5), 1, 1); }
    c.drawImage(kapok(), Math.round(W * 0.07) - 45, -4);
    const fig = treeTrunk(158, 8, 2); fig.edge = y => fig.mid(y) - fig.half(y); c.drawImage(fig.cv, Math.round(W * 0.92) - fig.ox, -4); this.figX = Math.round(W * 0.92) - fig.ox; this.fig = fig;
    // Omgevallen stam met paddenstoelen en mos
    const lx = Math.round(W * 0.16), ly = 146;
    c.drawImage(bake(54, 11, (x, y) => { if (x > 50) return (Math.hypot(x - 51, y - 5) < 2 ? '#c09060' : '#a87a48'); const k = y < 2 ? 0 : y < 5 ? 1 : y < 8 ? 2 : 3; if (y < 2 && hash(x >> 1, 2) > 0.4) return '#6aa04a'; if ((x * 5 + y) % 13 === 0) return BARK[4]; return BARK[k]; }), lx, ly - 4);
    for (const [ox, oy] of [[12, 3], [20, 5], [34, 2]]) { c.fillStyle = INK; c.fillRect(lx + ox - 1, ly + oy - 1, 7, 3); c.fillStyle = '#e88a2a'; c.fillRect(lx + ox, ly + oy - 1, 5, 2); c.fillStyle = '#ffc060'; c.fillRect(lx + ox, ly + oy - 1, 5, 1); }
    for (const ox of [6, 44]) { c.fillStyle = '#f4ecd8'; c.fillRect(lx + ox, ly - 7, 1, 3); ell(c, lx + ox, ly - 8, 2, 1, '#c84a3a'); }
    // Verschillende planten: varens, olifantsoren, bloeiende struikjes
    const plants = [[0.3, 'fern'], [0.36, 'ear'], [0.62, 'flower'], [0.68, 'fern'], [0.83, 'ear'], [0.5, 'grass'], [0.44, 'flower'], [0.26, 'grass'], [0.75, 'grass']];
    plants.forEach(([px, kind], i) => plant(c, Math.round(W * px), 150, kind, i));
    return cv;
  }
  draw(c, W, t) {
    const H = TH;
    if (this.bakedW !== W) { this.bakedW = W; this.back = this.bakeBack(W); this.front = this.bakeFront(W); this.canopy = bakeCanopy(W); }
    c.drawImage(this.back, 0, 0);
    // Zon en drijvende wolken
    const sx = Math.round(W * 0.7), sy = 24;
    ell(c, sx, sy, 18, 18, '#fff2b8'); ell(c, sx, sy, 13, 13, '#fff8d8'); ell(c, sx, sy, 9, 9, '#ffffff');
    for (let i = 0; i < 3; i++) { const x = Math.round(((hash(i, 5) * W + t * (1.5 + i)) % (W + 60)) - 30), y = 34 + i * 9; cloud(c, x, y, 10 + i * 4); }
    // Waterval en poel
    const fx = Math.round(W * 0.23);
    for (let x = fx - 3; x <= fx + 3; x++) for (let y = 62; y < 124; y++) { const v = ((y - t * 70 + x * 5) % 9 + 9) % 9; c.fillStyle = v < 2 ? '#ffffff' : v < 5 ? '#d8f0f8' : '#a8d8ec'; c.fillRect(x, y, 1, 1); }
    ell(c, fx + 6, 128, 34, 5, '#4a9ab0'); ell(c, fx + 6, 127, 32, 3, '#6ab4c4');
    for (let i = 0; i < 4; i++) { const r = ((t * 8 + i * 8) % 30); c.fillStyle = '#c8ecf4'; c.fillRect(Math.round(fx - r), 127, 2, 1); c.fillRect(Math.round(fx + r), 127, 2, 1); }
    for (let i = 0; i < 16; i++) { const a = hash(i, 7) * 3.14, d = ((t * 12 + i * 3) % 10); c.fillStyle = '#ffffffc0'; c.fillRect(Math.round(fx + Math.cos(a) * d * 1.4), Math.round(124 - Math.sin(a) * d * 0.8), 1, 1); }
    // Olifanten die drinken (moeder en kalf)
    elephant(c, fx + 28, 126, 1, t); elephant(c, fx + 40, 126, 0.65, t + 1);
    // Zonnestralen
    c.globalAlpha = 0.14 + Math.sin(t * 0.7) * 0.04; c.fillStyle = '#fff6c8';
    for (const [x0, w0] of [[0.42, 5], [0.55, 8], [0.66, 4], [0.8, 6]]) for (let y = 14; y < 150; y++) c.fillRect(Math.round(W * x0 - y * 0.4), y, w0 + Math.round(y * 0.05), 1);
    c.globalAlpha = 1;
    c.drawImage(this.front, 0, 0);
    // Wurgvijg-tak met de habilis (achterste been achter de tak)
    const by = 96, F = this.fig, trunkX = this.figX + Math.round(F.edge(by + 4)), bx0 = Math.round(W * 0.64);
    if (!this.branch || this.branchLen !== trunkX - bx0 + 4) { this.branchLen = trunkX - bx0 + 4; this.branch = sideBranch(this.branchLen, 8, 4); }
    const hx = Math.round(W * 0.78);
    this.hominin(c, hx, by, t, true);
    c.drawImage(this.branch, bx0, by - Math.round(this.branch.height / 2) + 1);
    leafBlob(c, bx0 + 2, by - 4, 9, ['#8ac860', '#62a84a', '#447a36', '#a8dc78'], 9);
    this.hominin(c, hx, by, t, false);
    // Franjeaap aan een liaan
    const ax = Math.round(W * 0.19), ay = 8, ang = Math.sin(t * 1.3) * 0.4, len = 38, mx = Math.round(ax + Math.sin(ang) * len), my = Math.round(ay + Math.cos(ang) * len);
    for (let i = 0; i <= len; i++) { c.fillStyle = '#3e6a2a'; c.fillRect(Math.round(ax + Math.sin(ang) * i), Math.round(ay + Math.cos(ang) * i), 1, 1); if (i % 7 === 3) { c.fillStyle = '#7ab85a'; c.fillRect(Math.round(ax + Math.sin(ang) * i) + 1, Math.round(ay + Math.cos(ang) * i), 2, 1); } }
    colobus(c, mx, my, ang, t);
    // Vlinders: elk een andere soort
    [['#3a6ad8', '#9ad0ff'], ['#ffb020', '#3a2a10'], ['#ffffff', '#8ad0ff'], ['#e83a3a', '#2a1a10'], ['#9aff6a', '#2a4a1a']].forEach(([a1, a2], i) => {
      const x = Math.round((hash(i, 41) * W + Math.sin(t * 0.5 + i * 2) * 40 + t * (3 + i)) % W), y = Math.round(104 + hash(i, 42) * 36 + Math.sin(t * 2.2 + i * 3) * 7), f = Math.floor(t * 9 + i) % 2;
      c.fillStyle = a1; c.fillRect(x - 2 + f, y - 1, 2 - f, 2); c.fillRect(x + 1, y - 1, 2 - f, 2); c.fillStyle = a2; c.fillRect(x - 2 + f, y + 1, 1, 1); c.fillRect(x + 2 - f, y + 1, 1, 1); c.fillStyle = INK; c.fillRect(x, y - 1, 1, 3);
    });
    // Bananenbladeren op de voorgrond, wiegend
    banana(c, -4, 176, 58, -1.05, 1, t); banana(c, 6, 180, 46, -0.55, 1, t + 1); banana(c, W + 4, 172, 54, -1.1, -1, t + 2);
    // Bladerdak met hangende lianen en bloemen
    c.drawImage(this.canopy, 0, 0);
    for (let i = 0; i < 5; i++) { const x0 = Math.round(W * (0.03 + i * 0.21) + hash(i, 61) * 26), len2 = 24 + Math.round(hash(i, 62) * 46); for (let y = 8; y < len2; y++) { const x = Math.round(x0 + Math.sin(t * 0.9 + i + y * 0.04) * (y / len2) * 3); c.fillStyle = '#3e6a2a'; c.fillRect(x, y, 1, 1); if (y % 5 === 0) { c.fillStyle = '#7ab85a'; c.fillRect(x + (y % 10 ? 1 : -2), y, 2, 1); } if (i % 2 && y === len2 - 1) { c.fillStyle = '#ff6aa0'; c.fillRect(x - 1, y, 3, 2); c.fillStyle = '#ffd0e0'; c.fillRect(x, y, 1, 1); } } }
    // Bord van losse planken met het logo, aan twee lianen, schommelt een beetje
    const L = this.logo; if (!this.board) this.board = plankBoard(L.width + 26, 3, 14, 3);
    const B = this.board, cx = Math.round(W / 2), sw = Math.sin(t * 1.1) * 1.2, top = 24;
    c.save(); c.translate(cx, 0); c.rotate(sw * 0.012);
    for (const d of [-1, 1]) { const ax2 = d * (B.width / 2 - 20); for (let y = 0; y < top + 6; y++) { c.fillStyle = '#3e6a2a'; c.fillRect(Math.round(ax2 + Math.sin(y * 0.3) * 0.6), y, 2, 1); } c.fillStyle = '#7ab85a'; for (let y = 3; y < top; y += 6) c.fillRect(ax2 + 2, y, 2, 1); c.fillStyle = '#2e5220'; c.fillRect(ax2 - 2, top + 2, 6, 2); }
    c.drawImage(B, Math.round(-B.width / 2), top);
    c.drawImage(L, Math.round(-L.width / 2), top + Math.round((B.height - L.height) / 2) + 1);
    c.restore();
  }
  // De habilis uit het spel: zit op de tak met bungelende benen en zwaait
  hominin(c, x, y, t, back) {
    const f = Math.floor(t * 10), key = back ? 'homB' : 'homC';
    if (this[key + 'F'] !== f) {
      this[key + 'F'] = f;
      const S = 64, cv = this[key] || (this[key] = document.createElement('canvas')); cv.width = S; cv.height = S;
      const g = cv.getContext('2d', { willReadFrequently: true });
      // Schrijlings op de tak: billen erop, benen hangen aan weerszijden naar beneden, één hand op de tak
      const p = pose('idle', t); p.root = 0; p.lean = 0.08; p.neck = -0.12 + Math.sin(t * 0.8) * 0.05;
      const sw = Math.sin(t * 2) * 0.2; p.hF = 1.4; p.kF = 1.35 + sw; p.aF = -0.1; p.hB = 1.3; p.kB = 1.25 - sw; p.aB = -0.1;
      p.sB = 0.3; p.eB = 0.3; p.sF = 2.6 + Math.sin(t * 7) * 0.25; p.eF = -0.4;
      g.save(); g.translate(S / 2, S - 6); g.scale(-0.33, 0.33);
      drawRig(g, rigLook(SPECIES.habilis.look || {}), p, { time: t, mouth: 'open', part: back ? 'backLeg' : null, noBackLeg: !back });
      g.restore();
      const img = g.getImageData(0, 0, S, S), d = img.data;
      for (let i = 0; i < d.length; i += 4) { if (d[i + 3] >= 140) { d[i + 3] = 255; for (let k = 0; k < 3; k++) d[i + k] = Math.round(d[i + k] / 14) * 14; } else d[i + 3] = 0; }
      // Donkere rand eromheen, zoals bij de figuren in het spel
      const sol = i => d[i * 4 + 3] === 255, out = [];
      for (let yy = 0; yy < S; yy++) for (let xx = 0; xx < S; xx++) { const i = yy * S + xx; if (sol(i)) continue; if ((xx > 0 && sol(i - 1)) || (xx < S - 1 && sol(i + 1)) || (yy > 0 && sol(i - S)) || (yy < S - 1 && sol(i + S))) out.push(i); }
      for (const i of out) { d[i * 4] = 26; d[i * 4 + 1] = 15; d[i * 4 + 2] = 8; d[i * 4 + 3] = 255; }
      g.putImageData(img, 0, 0);
    }
    // Heup (44 eenheden boven de voeten, schaal 0,33) net boven de bovenkant van de tak
    const legs = rigLook(SPECIES.habilis.look || {}).legs || 1, hipY = 64 - 6 - 44 * legs * 0.33;
    c.drawImage(back ? this.homB : this.homC, Math.round(x - 32), Math.round(y - hipY - 5));
  }
}
export { hash, ell, bake, crown, cloud, leafBlob };
