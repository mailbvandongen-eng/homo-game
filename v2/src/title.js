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
  draw(c, W, t) {
    const H = TH;
    // Lucht: fris turquoise naar warm geel bij de horizon
    const sky = ['#4fb6c8', '#62c2cc', '#7ccccc', '#9ad6c8', '#bce0bc', '#dce6a8', '#f2e49a'];
    const bh = Math.ceil(110 / sky.length);
    sky.forEach((col, i) => { c.fillStyle = col; c.fillRect(0, i * bh, W, bh + 1); if (i) { c.fillStyle = sky[i - 1]; for (let x = i % 2; x < W; x += 2) c.fillRect(x, i * bh, 1, 1); } });
    c.fillStyle = sky[sky.length - 1]; c.fillRect(0, sky.length * bh, W, H);
    // Zon met gloed rechtsboven
    const sx = Math.round(W * 0.8), sy = 26;
    ell(c, sx, sy, 20, 20, '#fff2b8'); ell(c, sx, sy, 15, 15, '#fff8d8'); ell(c, sx, sy, 11, 11, '#ffffff');
    // Heuvels in de mist
    for (const [base, amp, col, f, sp] of [[104, 10, '#8cc4a8', 0.02, 0.01], [114, 8, '#6aae88', 0.035, 0.02]]) for (let x = 0; x < W; x++) { const y = Math.round(base - Math.sin((x + t * sp * 60) * f) * amp - Math.sin(x * f * 2.3 + 1) * amp * 0.4); c.fillStyle = col; c.fillRect(x, y, 1, H - y); }
    // Olifant die in de verte voorbijsjokt
    const ex = Math.round(((t * 4) % (W + 80)) - 40), ey = 112;
    c.fillStyle = '#5e9a7c'; ell(c, ex, ey - 7, 9, 5, '#5e9a7c'); ell(c, ex + 9, ey - 9, 4, 4, '#5e9a7c'); c.fillRect(ex + 12, ey - 8, 2, 7);
    for (const lx of [-6, -2, 3, 6]) c.fillRect(ex + lx + (Math.floor(t * 2) % 2 && lx > 0 ? 1 : 0), ey - 3, 2, 4); c.fillStyle = '#f4f0e0'; c.fillRect(ex + 12, ey - 6, 3, 1);
    // Bomen in de verte, in de mist
    for (let i = 0; i < 7; i++) { const x = Math.round(W * (0.08 + i * 0.14) + hash(i, 71) * 20), h = 30 + hash(i, 72) * 20, y = 116; c.fillStyle = '#7ab49a'; c.fillRect(x, y - h, 2, h); ell(c, x + 1, y - h, 9 + Math.round(hash(i, 73) * 5), 5, '#7ab49a'); ell(c, x - 3, y - h + 4, 6, 3, '#86bca2'); }
    // Zonnestralen door het bladerdak
    c.globalAlpha = 0.16 + Math.sin(t * 0.7) * 0.04; c.fillStyle = '#fff6c8';
    for (let i = 0; i < 5; i++) { const x0 = W * (0.35 + i * 0.13); for (let y = 10; y < 150; y++) c.fillRect(Math.round(x0 - y * 0.45), y, 6 + Math.round(y * 0.06), 1); }
    c.globalAlpha = 1;
    // Middenlaag: reuzenbomen met plankwortels
    if (!this.trunks) this.trunks = [treeTrunk(156, 6, 1), treeTrunk(156, 8, 2)];
    const T1 = this.trunks[0], T2 = this.trunks[1];
    c.drawImage(T1.cv, Math.round(W * 0.12 - T1.ox), -2); c.drawImage(T2.cv, Math.round(W * 0.9 - T2.ox), -2);
    for (const [x, y, r, s] of [[0.12, 22, 26, 1], [0.3, 12, 20, 2], [0.9, 18, 28, 3], [0.68, 8, 18, 4]]) leafBlob(c, W * x, y, r, ['#7ab85a', '#5a9a46', '#3e7a38', '#9ccc6a'], s);
    // Grond met varens en bloemen
    for (let x = 0; x < W; x++) { const y = 148 + Math.round(Math.sin(x * 0.07) * 2 + Math.sin(x * 0.19) * 1); c.fillStyle = '#8acc48'; c.fillRect(x, y, 1, 1); c.fillStyle = '#62a83a'; c.fillRect(x, y + 1, 1, 3); c.fillStyle = '#7a5434'; c.fillRect(x, y + 4, 1, H); c.fillStyle = '#5e3e26'; if ((x * 7) % 5 === 0) c.fillRect(x, y + 8 + (x % 4), 1, 1); }
    for (let i = 0; i < 9; i++) { const x = Math.round(hash(i, 21) * W), y = 150, sway = Math.round(Math.sin(t * 1.5 + i) * 1); for (let a = -4; a <= 4; a++) for (let s = 0; s < 10; s++) { c.fillStyle = s > 6 ? '#9ad45a' : '#4e9a34'; c.fillRect(Math.round(x + a * s * 0.55 + sway * s / 10), Math.round(y - s * 1.1 + Math.abs(a) * 0.9), 1, 1); } }
    for (let i = 0; i < 14; i++) { const x = Math.round(hash(i, 31) * W), y = 147 + Math.round(hash(i, 32) * 3), col = ['#ff6a6a', '#ffd34a', '#ffffff', '#ff9ad0'][i % 4]; c.fillStyle = '#3e7a28'; c.fillRect(x, y, 1, 3); c.fillStyle = col; c.fillRect(x - 1, y - 1, 3, 1); c.fillRect(x, y - 2, 1, 3); c.fillStyle = '#ffb020'; c.fillRect(x, y - 1, 1, 1); }
    // Paddenstoeltjes
    for (const [px, col] of [[0.22, '#d84a3a'], [0.58, '#c88a4a']]) { const x = Math.round(W * px); c.fillStyle = '#f4ecd8'; c.fillRect(x, 145, 2, 4); ell(c, x + 1, 145, 3, 2, col); c.fillStyle = '#fff'; c.fillRect(x, 144, 1, 1); }
    // Tak met de habilis die zwaait
    const by = 96, trunkX = Math.round(W * 0.9 - T2.ox + T2.mid(by + 2) - T2.half(by + 2)), bx0 = Math.round(W * 0.64);
    if (!this.branch || this.branchLen !== trunkX - bx0 + 4) { this.branchLen = trunkX - bx0 + 4; this.branch = sideBranch(this.branchLen, 8, 4); }
    const hx = Math.round(W * 0.78);
    this.hominin(c, hx, by, t, true);                               // achterste been, achter de tak
    c.drawImage(this.branch, bx0, by - Math.round(this.branch.height / 2) + 1);
    leafBlob(c, bx0 + 2, by - 4, 9, ['#8ac860', '#62a84a', '#447a36', '#a8dc78'], 9);
    leafBlob(c, bx0 + 22, by - 7, 5, ['#8ac860', '#62a84a', '#447a36', '#a8dc78'], 12);
    this.hominin(c, hx, by, t, false);
    // Vlinders en vogels
    for (let i = 0; i < 4; i++) { const x = Math.round((hash(i, 41) * W + Math.sin(t * 0.6 + i) * 30 + t * 6) % W), y = Math.round(100 + hash(i, 42) * 40 + Math.sin(t * 2 + i * 3) * 6), f = Math.floor(t * 10 + i) % 2, col = ['#ffd34a', '#7ad0ff', '#ff8ac0', '#ffffff'][i]; c.fillStyle = col; c.fillRect(x - 1 - f, y, 1 + f, 2 - f); c.fillRect(x + 1, y, 1 + f, 2 - f); c.fillStyle = INK; c.fillRect(x, y, 1, 2); }
    for (let i = 0; i < 3; i++) { const x = Math.round((W + 40) - ((t * (14 + i * 4) + i * 120) % (W + 80))), y = 40 + i * 9 + Math.round(Math.sin(t * 3 + i) * 2), f = Math.floor(t * 6 + i) % 2; c.fillStyle = '#2a3a2a'; c.fillRect(x - 3, y + (f ? -1 : 0), 3, 1); c.fillRect(x, y, 1, 1); c.fillRect(x + 1, y + (f ? -1 : 0), 3, 1); }
    // Grote bladeren op de voorgrond (links en rechts onder), wiegen mee
    const frond = (x, y, len, ang, flip) => { const sw = Math.sin(t * 1.3 + x) * 0.05; for (let i = 0; i < len; i++) { const a = ang + sw + i * 0.012 * flip, px = x + Math.cos(a) * i * flip, py = y - Math.sin(a) * i + i * i * 0.006; const w = Math.round(Math.sin(i / len * Math.PI) * 7); for (let k = -w; k <= w; k++) { c.fillStyle = Math.abs(k) < 1 ? '#a8dc78' : (k + i) % 4 === 0 ? '#2e6a2a' : k < 0 ? '#4e9a3a' : '#3a7e32'; c.fillRect(Math.round(px + k * 0.35 * flip), Math.round(py + k * 0.9), 1, 1); } } };
    frond(-4, 176, 60, 0.9, 1); frond(-6, 168, 48, 0.5, 1); frond(W + 4, 176, 60, 0.9, -1); frond(W + 6, 166, 44, 0.45, -1);
    // Bladerdak bovenin als lijst, met hangende lianen
    for (let i = 0; i * 26 < W + 30; i++) leafBlob(c, i * 26 + (i % 2) * 8, -4 + (i % 3) * 3, 16, ['#5aa046', '#3e8a3a', '#2a6a2e', '#7ab85a'], 50 + i);
    for (let i = 0; i < 6; i++) { const x0 = Math.round(W * (0.05 + i * 0.18) + hash(i, 61) * 20), len = 30 + Math.round(hash(i, 62) * 50); for (let y = 6; y < len; y++) { const x = Math.round(x0 + Math.sin(t * 0.9 + i + y * 0.04) * (y / len) * 3); c.fillStyle = '#3e6a2a'; c.fillRect(x, y, 1, 1); if (y % 5 === 0) { c.fillStyle = '#7ab85a'; c.fillRect(x + (y % 10 ? 1 : -2), y, 2, 1); } } }
    // Bord van losse planken met het logo, aan twee lianen, schommelt een beetje
    const L = this.logo; if (!this.board) this.board = plankBoard(L.width + 26, 3, 14, 3);
    const B = this.board, cx = Math.round(W / 2), sw = Math.sin(t * 1.1) * 1.2, top = 24;
    c.save(); c.translate(cx, 0); c.rotate(sw * 0.012);
    for (const d of [-1, 1]) { const ax = d * (B.width / 2 - 20); for (let y = 0; y < top + 6; y++) { c.fillStyle = '#3e6a2a'; c.fillRect(Math.round(ax + Math.sin(y * 0.3) * 0.6), y, 2, 1); } c.fillStyle = '#7ab85a'; for (let y = 3; y < top; y += 6) c.fillRect(ax + 2, y, 2, 1); c.fillStyle = '#2e5220'; c.fillRect(ax - 2, top + 2, 6, 2); }
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
