// Startscherm "Oersprong": een levend oerwoud in pixelart met een houten bord als logo.
// Interne hoogte 180 pixels; de breedte volgt het scherm.

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
  constructor() { this.logo = logo('OERSPRONG'); }
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
    const trunk = (x, w, col, dark) => { c.fillStyle = col; c.fillRect(x - w, 0, w * 2, 150); c.fillStyle = dark; c.fillRect(x + w - 3, 0, 3, 150); for (let y = 6; y < 150; y += 9) c.fillRect(x - w + 2 + (y % 3), y, 1, 4); for (const d of [-1, 1]) for (let i = 0; i < 12; i++) { c.fillStyle = col; c.fillRect(x + d * (w + i), 150 - 12 + i, 1, 12 - i); } };
    trunk(Math.round(W * 0.12), 6, '#4e6a3a', '#3a5230'); trunk(Math.round(W * 0.9), 7, '#4e6a3a', '#3a5230');
    for (const [x, y, r, s] of [[0.12, 22, 26, 1], [0.3, 12, 20, 2], [0.9, 18, 28, 3], [0.68, 8, 18, 4]]) leafBlob(c, W * x, y, r, ['#7ab85a', '#5a9a46', '#3e7a38', '#9ccc6a'], s);
    // Grond met varens en bloemen
    for (let x = 0; x < W; x++) { const y = 148 + Math.round(Math.sin(x * 0.07) * 2 + Math.sin(x * 0.19) * 1); c.fillStyle = '#8acc48'; c.fillRect(x, y, 1, 1); c.fillStyle = '#62a83a'; c.fillRect(x, y + 1, 1, 3); c.fillStyle = '#7a5434'; c.fillRect(x, y + 4, 1, H); c.fillStyle = '#5e3e26'; if ((x * 7) % 5 === 0) c.fillRect(x, y + 8 + (x % 4), 1, 1); }
    for (let i = 0; i < 9; i++) { const x = Math.round(hash(i, 21) * W), y = 150, sway = Math.round(Math.sin(t * 1.5 + i) * 1); for (let a = -4; a <= 4; a++) for (let s = 0; s < 10; s++) { c.fillStyle = s > 6 ? '#9ad45a' : '#4e9a34'; c.fillRect(Math.round(x + a * s * 0.55 + sway * s / 10), Math.round(y - s * 1.1 + Math.abs(a) * 0.9), 1, 1); } }
    for (let i = 0; i < 14; i++) { const x = Math.round(hash(i, 31) * W), y = 147 + Math.round(hash(i, 32) * 3), col = ['#ff6a6a', '#ffd34a', '#ffffff', '#ff9ad0'][i % 4]; c.fillStyle = '#3e7a28'; c.fillRect(x, y, 1, 3); c.fillStyle = col; c.fillRect(x - 1, y - 1, 3, 1); c.fillRect(x, y - 2, 1, 3); c.fillStyle = '#ffb020'; c.fillRect(x, y - 1, 1, 1); }
    // Paddenstoeltjes
    for (const [px, col] of [[0.22, '#d84a3a'], [0.58, '#c88a4a']]) { const x = Math.round(W * px); c.fillStyle = '#f4ecd8'; c.fillRect(x, 145, 2, 4); ell(c, x + 1, 145, 3, 2, col); c.fillStyle = '#fff'; c.fillRect(x, 144, 1, 1); }
    // Tak met de habilis die zwaait
    const bx0 = Math.round(W * 0.66), by = 96;
    c.fillStyle = '#5a3c24'; c.fillRect(Math.round(W * 0.9) - 8, by, -(Math.round(W * 0.9) - 8 - bx0), 5); c.fillStyle = '#7a5434'; c.fillRect(bx0, by, Math.round(W * 0.9) - 8 - bx0, 2);
    leafBlob(c, bx0 + 4, by - 2, 9, ['#8ac860', '#62a84a', '#447a36', '#a8dc78'], 9);
    this.hominin(c, Math.round(W * 0.78), by, t);
    // Vlinders en vogels
    for (let i = 0; i < 4; i++) { const x = Math.round((hash(i, 41) * W + Math.sin(t * 0.6 + i) * 30 + t * 6) % W), y = Math.round(100 + hash(i, 42) * 40 + Math.sin(t * 2 + i * 3) * 6), f = Math.floor(t * 10 + i) % 2, col = ['#ffd34a', '#7ad0ff', '#ff8ac0', '#ffffff'][i]; c.fillStyle = col; c.fillRect(x - 1 - f, y, 1 + f, 2 - f); c.fillRect(x + 1, y, 1 + f, 2 - f); c.fillStyle = INK; c.fillRect(x, y, 1, 2); }
    for (let i = 0; i < 3; i++) { const x = Math.round((W + 40) - ((t * (14 + i * 4) + i * 120) % (W + 80))), y = 40 + i * 9 + Math.round(Math.sin(t * 3 + i) * 2), f = Math.floor(t * 6 + i) % 2; c.fillStyle = '#2a3a2a'; c.fillRect(x - 3, y + (f ? -1 : 0), 3, 1); c.fillRect(x, y, 1, 1); c.fillRect(x + 1, y + (f ? -1 : 0), 3, 1); }
    // Grote bladeren op de voorgrond (links en rechts onder), wiegen mee
    const frond = (x, y, len, ang, flip) => { const sw = Math.sin(t * 1.3 + x) * 0.05; for (let i = 0; i < len; i++) { const a = ang + sw + i * 0.012 * flip, px = x + Math.cos(a) * i * flip, py = y - Math.sin(a) * i + i * i * 0.006; const w = Math.round(Math.sin(i / len * Math.PI) * 7); for (let k = -w; k <= w; k++) { c.fillStyle = Math.abs(k) < 1 ? '#a8dc78' : (k + i) % 4 === 0 ? '#2e6a2a' : k < 0 ? '#4e9a3a' : '#3a7e32'; c.fillRect(Math.round(px + k * 0.35 * flip), Math.round(py + k * 0.9), 1, 1); } } };
    frond(-4, 176, 60, 0.9, 1); frond(-6, 168, 48, 0.5, 1); frond(W + 4, 176, 60, 0.9, -1); frond(W + 6, 166, 44, 0.45, -1);
    // Bladerdak bovenin als lijst, met hangende lianen
    for (let i = 0; i * 26 < W + 30; i++) leafBlob(c, i * 26 + (i % 2) * 8, -4 + (i % 3) * 3, 16, ['#5aa046', '#3e8a3a', '#2a6a2e', '#7ab85a'], 50 + i);
    for (let i = 0; i < 6; i++) { const x0 = Math.round(W * (0.05 + i * 0.18) + hash(i, 61) * 20), len = 30 + Math.round(hash(i, 62) * 50); for (let y = 6; y < len; y++) { const x = Math.round(x0 + Math.sin(t * 0.9 + i + y * 0.04) * (y / len) * 3); c.fillStyle = '#3e6a2a'; c.fillRect(x, y, 1, 1); if (y % 5 === 0) { c.fillStyle = '#7ab85a'; c.fillRect(x + (y % 10 ? 1 : -2), y, 2, 1); } } }
    // Houten bord met het logo, aan twee lianen, schommelt een beetje
    const L = this.logo, bw = L.width + 16, bhh = L.height + 12, cx = Math.round(W / 2), sw = Math.sin(t * 1.1) * 1.2, top = 26;
    c.save(); c.translate(cx, 0); c.rotate(sw * 0.012);
    c.fillStyle = '#3e6a2a'; for (const d of [-1, 1]) { const ax = d * (bw / 2 - 12); for (let y = 0; y < top; y++) c.fillRect(Math.round(ax + Math.sin(y * 0.3) * 0.6), y, 2, 1); c.fillStyle = '#7ab85a'; for (let y = 3; y < top; y += 6) c.fillRect(ax + 2, y, 2, 1); c.fillStyle = '#3e6a2a'; }
    const x0 = -bw / 2;
    c.fillStyle = INK; c.fillRect(x0 - 1, top - 1, bw + 2, bhh + 2);
    for (let i = 0; i < 3; i++) { const y = top + Math.round(i * bhh / 3), h = Math.round(bhh / 3); c.fillStyle = ['#a8743e', '#9a6836', '#8c5c30'][i]; c.fillRect(x0, y, bw, h); c.fillStyle = '#c08a50'; c.fillRect(x0, y, bw, 1); c.fillStyle = '#5e3c20'; c.fillRect(x0, y + h - 1, bw, 1); for (let k = 0; k < 6; k++) c.fillRect(Math.round(x0 + hash(k, i) * bw), y + 2 + (k % 3), 4 + (k % 3), 1); }
    c.fillStyle = '#5e3c20'; for (const d of [-1, 1]) { c.fillRect(d * (bw / 2 - 12), top + 2, 2, 2); }
    c.drawImage(L, Math.round(-L.width / 2), top + 6);
    c.restore();
  }
  // Kleine habilis die op de tak zit en zwaait
  hominin(c, x, y, t) {
    const fur = '#7a4e2e', dark = '#4e301a', skin = '#c48c5e', wave = Math.sin(t * 6) > 0;
    c.fillStyle = INK; c.fillRect(x - 5, y - 21, 11, 10); c.fillRect(x - 6, y - 12, 12, 12);
    c.fillStyle = fur; c.fillRect(x - 5, y - 11, 10, 10); c.fillStyle = dark; c.fillRect(x + 2, y - 11, 3, 10);
    c.fillStyle = '#3a2416'; c.fillRect(x - 4, y - 20, 9, 4); c.fillStyle = skin; c.fillRect(x - 3, y - 17, 8, 6); c.fillStyle = dark; c.fillRect(x - 4, y - 17, 9, 1);
    c.fillStyle = '#fff'; c.fillRect(x - 1, y - 15, 2, 1); c.fillRect(x + 2, y - 15, 2, 1); c.fillStyle = INK; c.fillRect(x, y - 15, 1, 1); c.fillRect(x + 3, y - 15, 1, 1); c.fillRect(x, y - 12, 4, 1);
    // Benen bungelen over de tak
    const sw = Math.round(Math.sin(t * 2) * 1); c.fillStyle = fur; c.fillRect(x - 4, y, 3, 6 + sw); c.fillRect(x + 1, y, 3, 6 - sw); c.fillStyle = skin; c.fillRect(x - 5, y + 6 + sw, 4, 2); c.fillRect(x + 1, y + 6 - sw, 4, 2);
    // Arm die zwaait
    c.fillStyle = fur; if (wave) { c.fillRect(x + 5, y - 16, 2, 7); c.fillStyle = skin; c.fillRect(x + 5, y - 19, 3, 3); } else { c.fillRect(x + 5, y - 13, 2, 5); c.fillRect(x + 7, y - 17, 2, 5); c.fillStyle = skin; c.fillRect(x + 7, y - 20, 3, 3); }
    c.fillStyle = fur; c.fillRect(x - 7, y - 9, 2, 8);
  }
}
