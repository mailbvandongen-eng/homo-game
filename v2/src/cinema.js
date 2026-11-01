// Introfilmpjes per hoofdstuk: pixelart-scènes met ondertitels en muziek.
// Tik = volgende scène, "Overslaan" = hele film overslaan.

const H = 180;   // interne hoogte in pixels; de breedte volgt het scherm

// ---------- kleine pixelhulpjes ----------
const hash = (a, b = 0) => { const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return n - Math.floor(n); };
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = k => k * k * (3 - 2 * k);
const seg = (k, a, b) => clamp((k - a) / (b - a));
function disc(c, x, y, r, col) { c.fillStyle = col; for (let dy = -r; dy <= r; dy++) { const w = Math.floor(Math.sqrt(r * r - dy * dy)); c.fillRect(Math.round(x - w), Math.round(y + dy), w * 2 + 1, 1); } }
function ell(c, x, y, rx, ry, col) { c.fillStyle = col; for (let dy = -ry; dy <= ry; dy++) { const w = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry)))); c.fillRect(Math.round(x - w), Math.round(y + dy), w * 2 + 1, 1); } }
function bands(c, W, cols, y0 = 0, y1 = H) { c.fillStyle = cols[cols.length - 1]; c.fillRect(0, y1, W, H); const h = (y1 - y0) / cols.length; cols.forEach((col, i) => { c.fillStyle = col; c.fillRect(0, Math.floor(y0 + i * h), W, Math.ceil(h) + 1); if (i) { c.fillStyle = cols[i - 1]; for (let x = i % 2; x < W; x += 2) c.fillRect(x, Math.floor(y0 + i * h), 1, 1); } }); }
function stars(c, W, t, n, seed = 1, k = 1) { for (let i = 0; i < n * k; i++) { const x = Math.floor(hash(i, seed) * W), y = Math.floor(hash(i, seed + 7) * H), tw = Math.sin(t * (2 + hash(i, 3) * 3) + i) > 0.6; c.fillStyle = tw ? '#ffffff' : hash(i, 9) > 0.7 ? '#9fb8ff' : '#6a7090'; c.fillRect(x, y, 1, 1); } }
function globe(c, x, y, r, t, f) { for (let dy = -r; dy <= r; dy++) { const w = Math.floor(Math.sqrt(r * r - dy * dy)); for (let dx = -w; dx <= w; dx++) { const col = f(dx / r, dy / r, t); if (col) { c.fillStyle = col; c.fillRect(x + dx, y + dy, 1, 1); } } } }
// Simpele "ruis" voor continenten en wolken
const noise = (x, y) => Math.sin(x * 3.1 + Math.sin(y * 2.3)) * 0.5 + Math.sin(y * 4.7 + Math.sin(x * 1.7) * 2) * 0.35 + Math.sin((x + y) * 7.3) * 0.15;
function ground(c, W, y, cols, amp = 4, freq = 0.05, seed = 0) { for (let x = 0; x < W; x++) { const h = Math.round(y + Math.sin(x * freq + seed) * amp + Math.sin(x * freq * 2.7 + seed) * amp * 0.4); c.fillStyle = cols[0]; c.fillRect(x, h, 1, 1); c.fillStyle = cols[1]; c.fillRect(x, h + 1, 1, H); } }
function acacia(c, x, y, s, col) { c.fillStyle = col; c.fillRect(x, y - 14 * s, Math.max(1, s), 14 * s); c.fillRect(x - 3 * s, y - 16 * s, 2 * s, 1); c.fillRect(x + 2 * s, y - 15 * s, 2 * s, 1); ell(c, x, y - 17 * s, 11 * s, 2.5 * s, col); }
// Op dubbele grootte tekenen (blijft pixelscherp)
function globeGlow(c, x, y, r, k) { for (let i = 4; i > 0; i--) disc(c, x, y, Math.round(r * i / 4 + 2), ['#ff5010', '#ff8020', '#ffc050', '#fff4c0'][4 - i]); }
function big(c, x, y, sc, fn) { c.save(); c.translate(Math.round(x), Math.round(y)); c.scale(sc, sc); fn(); c.restore(); }
// Mens van opzij (silhouet), loopfase f; lang = erectus
function walker(c, x, y, f, col, tall = 1, stoop = 0) {
  c.fillStyle = col; const h = Math.round(14 * tall), s = Math.sin(f) * 3;
  c.fillRect(x - 1 + stoop, y - h - 4, 3, 3);                       // hoofd
  c.fillRect(x, y - h - 1, 2, Math.round(h * 0.55));              // romp
  const hip = y - Math.round(h * 0.45);
  for (const d of [1, -1]) { const fx = Math.round(x + 1 + s * d); for (let i = 0; i <= Math.round(h * 0.45); i++) c.fillRect(Math.round(x + 1 + (fx - x - 1) * i / (h * 0.45)), hip + i, 1, 1); }
  for (const d of [1, -1]) { const hx = Math.round(x + 1 - s * d * 0.8); for (let i = 0; i <= 5; i++) c.fillRect(Math.round(x + 1 + (hx - x - 1) * i / 5), y - h + i, 1, 1); }
}


// ---------- dieren voor de films (voeten op 0,0; kijken naar rechts) ----------
function taperLine(c, x1, y1, x2, y2, w1, w2, col) { c.fillStyle = col; const n = Math.max(2, Math.ceil(Math.hypot(x2 - x1, y2 - y1))); for (let i = 0; i <= n; i++) { const q = i / n, w = w1 + (w2 - w1) * q; c.fillRect(Math.round(x1 + (x2 - x1) * q - w / 2), Math.round(y1 + (y2 - y1) * q - w / 2), Math.max(1, Math.round(w)), Math.max(1, Math.round(w))); } }
const DINO = {
  rex(c, f, P) {   // Tyrannosaurus
    const [d, m, l] = P, st = Math.sin(f) * 2;
    taperLine(c, -8, -27, -44, -22, 11, 2, d); taperLine(c, -8, -28, -40, -24, 8, 1, m);
    taperLine(c, -3, -24, -4 + st, -2, 8, 4, d); c.fillStyle = d; c.fillRect(-6 + st, -2, 8, 2);
    ell(c, -2, -28, 14, 9, d); ell(c, -2, -29, 13, 7, m); ell(c, -2, -33, 10, 3, l);
    taperLine(c, 3, -24, 4 - st, -2, 9, 5, m); c.fillStyle = m; c.fillRect(2 - st, -2, 9, 2);
    taperLine(c, 9, -32, 14, -38, 9, 8, m);
    c.fillStyle = d; c.fillRect(11, -46, 18, 9); c.fillStyle = m; c.fillRect(12, -45, 16, 6); c.fillStyle = l; c.fillRect(13, -45, 12, 2);
    c.fillStyle = d; c.fillRect(13, -37, 15, 3); c.fillStyle = '#f4ecd8'; for (let x = 14; x < 28; x += 3) c.fillRect(x, -38, 1, 1);
    c.fillStyle = '#ffd040'; c.fillRect(17, -44, 2, 2); c.fillStyle = '#000'; c.fillRect(18, -44, 1, 1);
    c.fillStyle = d; c.fillRect(10, -26, 4, 1); c.fillRect(13, -26, 1, 3);
  },
  trike(c, f, P) {   // Triceratops
    const [d, m, l] = P, st = Math.sin(f) * 1.5;
    taperLine(c, -14, -14, -34, -9, 7, 2, d);
    for (const [lx, ph] of [[-10, 0], [8, 1]]) { c.fillStyle = d; c.fillRect(lx + Math.round(st * (ph ? 1 : -1)), -8, 5, 8); }
    ell(c, 0, -14, 18, 10, d); ell(c, 0, -15, 17, 8, m); ell(c, -2, -20, 13, 3, l);
    for (const [lx, ph] of [[-14, 1], [12, 0]]) { c.fillStyle = m; c.fillRect(lx + Math.round(st * (ph ? 1 : -1)), -8, 6, 8); c.fillStyle = d; c.fillRect(lx + Math.round(st * (ph ? 1 : -1)), -1, 6, 1); }
    ell(c, 19, -18, 7, 11, d); ell(c, 19, -18, 6, 10, '#a86a3a'); c.fillStyle = '#d89a5a'; for (let a = 0; a < 6; a++) c.fillRect(Math.round(19 + Math.cos(a - 2.6) * 6), Math.round(-18 + Math.sin(a - 2.6) * 10), 2, 2);
    c.fillStyle = d; c.fillRect(22, -16, 11, 8); c.fillStyle = m; c.fillRect(23, -15, 9, 6); c.fillStyle = d; c.fillRect(32, -12, 3, 3);
    taperLine(c, 25, -17, 38, -26, 3, 1, '#efe4c8'); taperLine(c, 30, -14, 34, -18, 2, 1, '#efe4c8');
    c.fillStyle = '#000'; c.fillRect(27, -14, 1, 1);
  },
  sauro(c, f, P) {   // Alamosaurus (sauropode)
    const [d, m, l] = P, st = Math.sin(f) * 2;
    taperLine(c, -18, -32, -60, -24, 12, 2, d);
    for (const lx of [-14, 12]) { c.fillStyle = d; c.fillRect(lx - Math.round(st), -24, 8, 24); }
    ell(c, 0, -32, 24, 13, d); ell(c, 0, -33, 23, 11, m); ell(c, -2, -40, 18, 3, l);
    for (const lx of [-18, 8]) { c.fillStyle = m; c.fillRect(lx + Math.round(st), -24, 9, 24); c.fillStyle = d; c.fillRect(lx + Math.round(st), -2, 9, 2); }
    for (let i = 0; i <= 30; i++) { const q = i / 30, x = 18 + q * 26, y = -38 - Math.sin(q * 1.4) * 40, w = 9 - q * 5; c.fillStyle = m; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(w)); c.fillStyle = l; c.fillRect(Math.round(x), Math.round(y), Math.round(w), 1); }
    c.fillStyle = d; c.fillRect(42, -81, 10, 5); c.fillStyle = m; c.fillRect(43, -80, 8, 3); c.fillStyle = '#000'; c.fillRect(46, -80, 1, 1);
  },
  hadro(c, f, P) {   // Edmontosaurus (eendenbekdino)
    const [d, m, l] = P, st = Math.sin(f) * 2;
    taperLine(c, -6, -22, -34, -18, 9, 2, d);
    taperLine(c, -2, -18, -3 + st, -1, 7, 4, d);
    ell(c, 0, -22, 12, 8, d); ell(c, 0, -23, 11, 6, m); ell(c, -1, -27, 8, 2, l);
    taperLine(c, 3, -18, 3 - st, -1, 8, 4, m); c.fillStyle = m; c.fillRect(1 - st, -2, 7, 2);
    c.fillStyle = m; c.fillRect(8, -16, 7, 2); c.fillRect(14, -16, 1, 6);
    taperLine(c, 8, -26, 16, -36, 6, 5, m);
    c.fillStyle = d; c.fillRect(13, -40, 12, 6); c.fillStyle = m; c.fillRect(14, -39, 10, 4); c.fillStyle = '#c8b080'; c.fillRect(24, -37, 4, 3);
    c.fillStyle = '#000'; c.fillRect(17, -38, 1, 1);
  },
  ankylo(c, f, P) {   // Ankylosaurus
    const [d, m, l] = P, st = Math.sin(f) * 1.2;
    taperLine(c, -14, -9, -32, -8, 5, 2, d); c.fillStyle = d; ell(c, -34, -8, 4, 3, d);
    for (const lx of [-10, 8]) { c.fillStyle = d; c.fillRect(lx + Math.round(st), -5, 5, 5); }
    ell(c, 0, -10, 16, 7, d); ell(c, 0, -11, 15, 6, m);
    c.fillStyle = l; for (let x = -12; x < 14; x += 4) c.fillRect(x, -16 + (x % 8 ? 0 : 1), 2, 2);
    c.fillStyle = d; for (let x = -12; x < 14; x += 5) c.fillRect(x, -9, 1, 1);
    c.fillStyle = d; c.fillRect(14, -12, 8, 6); c.fillStyle = m; c.fillRect(15, -11, 6, 4); c.fillStyle = '#000'; c.fillRect(19, -10, 1, 1);
  },
};
function dinoAt(c, kind, x, y, f, fall, dark, flip = 1) {
  const P = [['#3a4428', '#5e6c38', '#8a9a52'], ['#4a3a2a', '#7a5e3e', '#a8865a'], ['#3e4a50', '#66747c', '#8e9ca4'], ['#4a4030', '#7a6a48', '#a89870'], ['#3a3426', '#6a5a3a', '#8e7e58']][{ rex: 0, trike: 1, sauro: 2, hadro: 3, ankylo: 4 }[kind]];
  const col = dark > 0 ? P.map(h => mixHex(h, '#1a120e', dark)) : P;
  // Omvallen: door de poten zakken en op de zij gaan liggen (poten verdwijnen achter het lijf)
  const legH = { rex: 22, trike: 7, sauro: 22, hadro: 16, ankylo: 4 }[kind];
  c.save(); c.beginPath(); c.rect(-9999, -9999, 99999, 9999 + y + 2); c.clip();
  c.translate(Math.round(x), Math.round(y + fall * legH)); c.scale(flip, 1 - fall * 0.25); c.rotate(fall * (kind === 'sauro' ? 0.12 : 0.3)); DINO[kind](c, f, col); c.restore();
}
function mixHex(a, b, k) { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), A = p(a), B = p(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join(''); }

// Megalodon (Otodus megalodon), naar rechts; x,y = punt van de snuit; L = lengte in pixels
function megalodon(c, x, y, L, mouth, ph) {
  const top = '#4e5c68', mid = '#66747e', belly = '#e0e4e6', ink = '#1e262c';
  const hAt = u => u < 0.1 ? L * (0.022 + (0.1 - u) * 0.1) : L * 0.112 * Math.pow(Math.sin(Math.PI * Math.min(1, (u - 0.1) / 0.92)), 0.55);
  const yc = u => y + Math.sin(ph - u * 3) * (1 - u) * (1 - u) * L * 0.035;
  const X = u => Math.round(x - (1 - u) * L);
  const jaw = Math.round(mouth * L * 0.07);
  // Staartvin (halvemaanvormig) en kleine vinnen achter
  const tu = 0.02, tx = X(tu), ty = yc(tu);
  for (let i = 0; i <= 18; i++) { const q = i / 18; c.fillStyle = top; c.fillRect(Math.round(tx - q * L * 0.13), Math.round(ty - q * L * 0.2), 3, Math.max(1, Math.round((1 - q) * L * 0.03))); c.fillStyle = mid; c.fillRect(Math.round(tx - q * L * 0.1), Math.round(ty + q * L * 0.13), 3, Math.max(1, Math.round((1 - q) * L * 0.025))); }
  // Lijf, kolom voor kolom: donkere rug, lichte buik
  for (let i = 0; i <= L; i++) {
    const u = i / L, h = hAt(u), cy = yc(u), xx = Math.round(x - L + i);
    const y0 = Math.round(cy - h), y1 = Math.round(cy + h * 0.85), split = Math.round(cy + h * 0.1 + Math.sin(u * 30) * 1.5);
    c.fillStyle = ink; c.fillRect(xx, y0 - 1, 1, y1 - y0 + 2);
    c.fillStyle = top; c.fillRect(xx, y0, 1, split - y0);
    c.fillStyle = mid; c.fillRect(xx, y0, 1, 2);
    c.fillStyle = belly; c.fillRect(xx, split, 1, y1 - split);
    if ((xx + split) % 2 === 0) { c.fillStyle = top; c.fillRect(xx, split, 1, 1); }
    // Open bek: onderkaak zakt omlaag
    if (u > 0.8 && jaw > 0) { const open = Math.round(jaw * (u - 0.8) / 0.2); c.fillStyle = '#5a1a1e'; c.fillRect(xx, split, 1, open + 1); c.fillStyle = belly; c.fillRect(xx, split + open, 1, Math.max(1, y1 - split)); c.fillStyle = ink; c.fillRect(xx, split + open + Math.max(1, y1 - split), 1, 1);
      if (i % 3 === 0) { c.fillStyle = '#ffffff'; c.fillRect(xx, split, 1, 2); c.fillRect(xx, split + open - 1, 1, 2); } }
  }
  // Rugvin, borstvin, tweede rugvin, aarsvin
  const fin = (u0, u1, apexU, apexDy, up, col) => { for (let i = Math.round(u0 * L); i <= Math.round(u1 * L); i++) { const u = i / L, base = up ? yc(u) - hAt(u) : yc(u) + hAt(u) * 0.8; const q = u < apexU ? (u - u0) / (apexU - u0) : (u1 - u) / (u1 - apexU); const len = Math.round(apexDy * L * Math.max(0, q)); c.fillStyle = ink; c.fillRect(Math.round(x - L + i), up ? base - len - 1 : base, 1, len + 1); c.fillStyle = col; c.fillRect(Math.round(x - L + i), up ? base - len : base, 1, len); } };
  fin(0.48, 0.64, 0.5, 0.11, true, top);
  fin(0.2, 0.26, 0.21, 0.03, true, top);
  fin(0.2, 0.25, 0.21, 0.025, false, mid);
  fin(0.58, 0.74, 0.6, 0.1, false, mid);
  // Kieuwspleten en oog
  c.fillStyle = '#3a4650'; for (let k = 0; k < 5; k++) { const u = 0.7 + k * 0.022, xx = X(u); c.fillRect(xx, Math.round(yc(u) - hAt(u) * 0.5), 1, Math.round(hAt(u) * 0.9)); }
  const eu = 0.9, ex = X(eu), ey = Math.round(yc(eu) - hAt(eu) * 0.35); c.fillStyle = '#000'; c.fillRect(ex, ey, 3, 2); c.fillStyle = '#ffffff'; c.fillRect(ex + 1, ey, 1, 1);
}
// Tiktaalik: platte kop met ogen bovenop, schubben, vinpoten met een 'pols', staart met vinzoom
function tiktaalik(c, f) {
  const back = '#4e5028', side = '#7e7e40', belly = '#c4ba84', ink = '#22200e';
  const push = Math.sin(f), lift = Math.max(0, push) * 1.5;
  // Staart met vinzoom
  for (let i = 0; i <= 26; i++) { const x = -i, h = Math.max(1, 6 - i * 0.2), yc = -6 + lift * 0.2 + Math.sin(f * 0.7 + i * 0.25) * (i / 26) * 2; c.fillStyle = ink; c.fillRect(x, Math.round(yc - h - 1), 1, Math.round(h * 2 + 2)); c.fillStyle = side; c.fillRect(x, Math.round(yc - h), 1, Math.round(h * 2)); if (i > 8) { c.fillStyle = '#9a8a50'; c.fillRect(x, Math.round(yc - h - 3), 1, 2); c.fillRect(x, Math.round(yc + h + 1), 1, 2); } }
  // Lijf: plat, breder naar voren
  for (let i = 0; i <= 34; i++) { const x = i, h = 6 + Math.sin(i / 34 * Math.PI * 0.8) * 3, yc = -7 - lift * (i / 34); c.fillStyle = ink; c.fillRect(x, Math.round(yc - h - 1), 1, Math.round(h * 2 + 2)); c.fillStyle = back; c.fillRect(x, Math.round(yc - h), 1, Math.round(h)); c.fillStyle = side; c.fillRect(x, Math.round(yc - 2), 1, 3); c.fillStyle = belly; c.fillRect(x, Math.round(yc + 1), 1, Math.round(h - 1));
    if ((i + Math.round(yc)) % 3 === 0) { c.fillStyle = '#6a6a34'; c.fillRect(x, Math.round(yc - h + 2 + (i % 2) * 2), 1, 1); } }
  // Platte kop zoals van een krokodil, ogen bovenop
  const hy = -9 - lift;
  for (let i = 0; i <= 16; i++) { const x = 34 + i, h = 6 - i * 0.22; c.fillStyle = ink; c.fillRect(x, Math.round(hy - h - 1), 1, Math.round(h * 2 + 2)); c.fillStyle = back; c.fillRect(x, Math.round(hy - h), 1, Math.round(h)); c.fillStyle = belly; c.fillRect(x, Math.round(hy), 1, Math.round(h)); }
  c.fillStyle = ink; c.fillRect(38, Math.round(hy) + 1, 13, 1);
  c.fillStyle = back; c.fillRect(39, Math.round(hy) - 8, 4, 3); c.fillStyle = '#ffd040'; c.fillRect(40, Math.round(hy) - 8, 2, 2); c.fillStyle = '#000'; c.fillRect(41, Math.round(hy) - 8, 1, 1);
  // Vinpoten: schouder, 'elleboog', pols die op de modder steunt
  for (const [sx, ph, near] of [[30, 0, false], [28, Math.PI, true]]) {
    const p = Math.sin(f + ph), ex = sx + 4 + p * 2, ey = -3, wx = sx + 7 + p * 4, wy = 0;
    taperLine(c, sx, -6 - lift, ex, ey, 4, 3, near ? side : back); taperLine(c, ex, ey, wx, wy, 3, 2, near ? side : back);
    c.fillStyle = '#9a8a50'; for (let k = 0; k < 4; k++) c.fillRect(Math.round(wx) + k, wy - 1 + (k % 2), 1, 2);
  }
  taperLine(c, 6, -3, 10, 0, 3, 2, side);
}

// ---------- de film van wereld 1: van de oerknal tot de eerste mens ----------
const W1 = [
  { when: '13,8 miljard jaar geleden', title: 'De oerknal', text: 'Alles begon met de oerknal. Ruimte, tijd, licht en energie ontstonden tegelijk, en het heelal dijde razendsnel uit.', dur: 8, chord: [38, 45, 50, 57], sfx: [[0.14, 'crash'], [0.16, 'roar']],
    draw(c, W, t, k) {
      c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
      const cx = W / 2, cy = H / 2;
      if (k < 0.14) { const r = Math.round(seg(k, 0, 0.14) * 2); disc(c, cx, cy, r, '#ffffff'); return; }
      const e = seg(k, 0.14, 1), fl = 1 - seg(k, 0.14, 0.3);
      for (let i = 0; i < 520; i++) {
        const a = hash(i) * Math.PI * 2, sp = 0.2 + hash(i, 2) * 1.1, d = ease(e) * sp * W * 0.7 + 2;
        const col = d < 30 ? '#ffffff' : d < 70 ? '#fff0a0' : d < 120 ? '#ffb050' : hash(i, 5) > 0.5 ? '#c05050' : '#7080ff';
        c.fillStyle = col; c.fillRect(Math.round(cx + Math.cos(a) * d), Math.round(cy + Math.sin(a) * d * 0.8), 1, 1);
      }
      if (fl > 0) { c.globalAlpha = fl; c.fillStyle = '#ffffff'; c.fillRect(0, 0, W, H); c.globalAlpha = 1; }
    } },
  { when: 'circa 13,5 miljard jaar geleden', title: 'De eerste sterren', text: 'Uit enorme wolken waterstof en helium ontstonden de eerste sterren. Ze klonterden samen tot sterrenstelsels, zoals onze Melkweg.', dur: 8, chord: [41, 48, 52, 57],
    draw(c, W, t, k) {
      c.fillStyle = '#04030c'; c.fillRect(0, 0, W, H);
      for (let i = 0; i < 900; i++) { const x = hash(i, 11) * W, y = hash(i, 12) * H, n = noise(x / 60, y / 50); if (n > 0.35 - k * 0.3) { c.fillStyle = n > 0.7 ? '#3a2a5e' : '#1c1838'; c.fillRect(Math.floor(x), Math.floor(y), 2, 2); } }
      stars(c, W, t, 160, 3, ease(k));
      // Spiraalstelsel dat zich vormt
      const cx = W * 0.62, cy = H * 0.45, rot = t * 0.15;
      for (let i = 0; i < 600 * ease(seg(k, 0.25, 1)); i++) {
        const arm = i % 2, r = hash(i, 21) * 46, a = arm * Math.PI + r * 0.11 + rot + (hash(i, 22) - 0.5) * 0.5;
        c.fillStyle = r < 8 ? '#fff6d0' : r < 20 ? '#d8c8ff' : '#8090d8'; c.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r * 0.45), 1, 1);
      }
      disc(c, cx, cy, 3, '#fffbe8');
    } },
  { when: '4,6 miljard jaar geleden', title: 'De zon en de aarde', text: 'In een uithoek van de Melkweg ontstond onze zon. Om haar heen draaide een schijf van gas, stof en steen. Daaruit groeiden de planeten, ook de aarde.', dur: 8, chord: [43, 50, 55, 59],
    draw(c, W, t, k) {
      c.fillStyle = '#05040e'; c.fillRect(0, 0, W, H); stars(c, W, t, 90, 5);
      const cx = W / 2, cy = H / 2;
      for (let i = 0; i < 1400; i++) { const r = 18 + hash(i, 31) * 90, a = hash(i, 32) * Math.PI * 2 + t * (12 / r); c.fillStyle = hash(i, 33) > 0.6 ? '#a07040' : hash(i, 33) > 0.3 ? '#7a5030' : '#c09060'; c.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r * 0.28), 1, 1); }
      for (let r = 16; r > 0; r -= 4) disc(c, cx, cy, r + 2, ['#ffe080', '#ffd050', '#ffb030', '#ff9020'][Math.floor(r / 4) % 4]);
      disc(c, cx, cy, 9, '#fff6c0');
      // De jonge aarde groeit
      const a = t * 0.25 + 2, ex = cx + Math.cos(a) * 62, ey = cy + Math.sin(a) * 62 * 0.28;
      disc(c, ex, ey, Math.round(1 + ease(k) * 4), '#d06030'); c.fillStyle = '#ffa050'; c.fillRect(Math.round(ex) - 1, Math.round(ey) - 1, 1, 1);
    } },
  { when: 'circa 4,5 miljard jaar geleden', title: 'Een botsing maakt de maan', text: 'Waarschijnlijk botste een planeet zo groot als Mars op de jonge, gloeiende aarde. Van het puin dat de ruimte in vloog, werd de maan.', dur: 8, chord: [40, 47, 52, 55], sfx: [[0.42, 'crash']],
    draw(c, W, t, k) {
      c.fillStyle = '#04040c'; c.fillRect(0, 0, W, H); stars(c, W, t, 120, 6);
      const ex = W * 0.42, ey = H * 0.55;
      globe(c, ex, ey, 40, t, (u, v, t) => { const n = noise(u * 3 + t * 0.2, v * 3); return u + v < -0.6 ? '#ff9a40' : n > 0.3 ? '#ffb040' : n > -0.2 ? '#d05020' : '#8a2a14'; });
      const hit = 0.42;
      if (k < hit) { const p = ease(k / hit), tx = W * 0.95 - p * (W * 0.95 - ex - 38), ty = H * 0.05 + p * (ey - 16 - H * 0.05); globe(c, Math.round(tx), Math.round(ty), 13, t, (u, v) => u + v < -0.5 ? '#c0a080' : '#806048'); }
      else {
        const e = seg(k, hit, 1);
        for (let i = 0; i < 260; i++) { const a = -0.9 + hash(i, 41) * 1.6, d = 30 + e * (20 + hash(i, 42) * 70), x = ex + Math.cos(a) * d * 1.2, y = ey + Math.sin(a) * d * 0.6; c.fillStyle = hash(i, 43) > 0.5 ? '#ffb050' : '#a06040'; c.fillRect(Math.round(x), Math.round(y), 1, 1); }
        if (e > 0.4) { const m = seg(e, 0.4, 1); disc(c, Math.round(ex + 80), Math.round(ey - 36), Math.round(2 + m * 6), m > 0.7 ? '#c8c4bc' : '#b07050'); }
        const fl = 1 - seg(k, hit, hit + 0.12); if (fl > 0) { c.globalAlpha = fl; c.fillStyle = '#fff4c0'; c.fillRect(0, 0, W, H); c.globalAlpha = 1; }
      }
    } },
  { when: '4,4 – 4 miljard jaar geleden', title: 'De oceanen', text: 'De aarde koelde af. Waterdamp werd regen, en het regende heel, heel lang. Zo ontstonden de oceanen.', dur: 7, chord: [45, 52, 57, 60],
    draw(c, W, t, k) {
      c.fillStyle = '#03040c'; c.fillRect(0, 0, W, H); stars(c, W, t, 100, 7);
      const e = ease(k);
      globe(c, W / 2, H / 2, 58, t, (u, v, t) => {
        if (u * u + v * v > 0.94 && u + v < 0) return '#9fd0ff';
        const n = noise(u * 2.4 + t * 0.05, v * 2.4), cl = noise(u * 4 - t * 0.12, v * 5 + 3);
        if (cl > 0.55 + (1 - e) * 0.2) return '#f2f6ff';
        if (n > 0.55 - e * 0.1) return e > 0.6 ? '#7a6a50' : '#c05020';
        return e < 0.35 ? (n > 0 ? '#e06a28' : '#8a2a14') : e < 0.6 ? (n > 0 ? '#5a5a6a' : '#3a4a6a') : (u + v < -0.3 ? '#3a7ac8' : '#1e4c9a');
      });
    } },
  { when: 'minstens 3,5 miljard jaar geleden', title: 'Het eerste leven', text: 'In de zee ontstond het eerste leven: piepkleine cellen. Sommige bacteriën bouwden kussens van kalk, stromatolieten, en maakten zuurstof. Zonder hen zou jij geen lucht hebben.', dur: 9, chord: [48, 55, 59, 64],
    draw(c, W, t, k) {
      bands(c, W, ['#2a7ab0', '#22689e', '#1c588a', '#164a78', '#103c66', '#0c3058']);
      c.fillStyle = '#ffffff22'; for (let i = 0; i < 6; i++) { const x = (i * 70 + t * 6) % (W + 60) - 30; for (let y = 0; y < 120; y++) c.fillRect(Math.round(x + y * 0.35), y, 3, 1); }
      ground(c, W, 150, ['#b09060', '#806848'], 3, 0.03);
      for (let i = 0; i < 7; i++) { const x = 20 + i * (W / 7) + hash(i) * 20, w = 12 + hash(i, 2) * 10, h = 10 + hash(i, 3) * 14; for (let y = 0; y < h; y++) { const ww = Math.round(w * Math.sqrt(1 - (y / h) ** 2)); c.fillStyle = y % 3 === 0 ? '#5a6a40' : y % 3 === 1 ? '#6e7e4a' : '#4c5a36'; c.fillRect(Math.round(x - ww), 150 - y, ww * 2, 1); } }
      for (let i = 0; i < 60; i++) { const x = (hash(i, 51) * W + Math.sin(t + i) * 4), y = (hash(i, 52) * 130 + t * 3) % 140; c.fillStyle = '#7cd08a'; c.fillRect(Math.round(x), Math.round(y), 1, 1); }
      for (let i = 0; i < 20; i++) { const x = 20 + hash(i, 61) * (W - 40), y = 150 - ((t * (10 + hash(i, 62) * 10) + hash(i, 63) * 150) % 150); c.fillStyle = '#bfe8ff'; c.fillRect(Math.round(x), Math.round(y), 1, 1); c.fillRect(Math.round(x) + 1, Math.round(y) - 1, 1, 1); }
    } },
  { when: '538 miljoen jaar geleden', title: 'De Cambrische explosie', text: 'Opeens kwamen er veel meer soorten dieren, met schalen, ogen en poten. Trilobieten kropen over de bodem. Anomalocaris was toen de grootste jager.', dur: 8, chord: [50, 57, 62, 66],
    draw(c, W, t, k) {
      bands(c, W, ['#2a80a8', '#226e96', '#1c5e84', '#164e72', '#104060']);
      ground(c, W, 148, ['#c0a070', '#8a7050'], 2, 0.04);
      for (let i = 0; i < 9; i++) { const x = 15 + i * W / 9, h = 8 + hash(i, 4) * 12; c.fillStyle = '#c87850'; c.fillRect(Math.round(x), 148 - h, 3, h); c.fillStyle = '#e09a60'; c.fillRect(Math.round(x) - 1, 148 - h, 5, 2); }
      for (let i = 0; i < 6; i++) {   // trilobieten
        const x = ((hash(i, 71) * W + t * (4 + i)) % (W + 20)) - 10, y = 150 + (i % 3) * 6;
        c.fillStyle = '#3a2e24'; c.fillRect(Math.round(x) - 5, y - 3, 11, 5); c.fillStyle = '#8a7058'; c.fillRect(Math.round(x) - 4, y - 2, 9, 3); c.fillStyle = '#b09070'; c.fillRect(Math.round(x) + 3, y - 2, 2, 3); c.fillStyle = '#5a4838'; for (let s = -3; s < 3; s += 2) c.fillRect(Math.round(x) + s, y - 2, 1, 3);
      }
      const ax = Math.round(((t * 14) % (W + 80)) - 40), ay = Math.round(70 + Math.sin(t) * 8);   // Anomalocaris
      // Zwemflappen langs het lijf, golvend
      for (let i = 0; i < 9; i++) { const fx = ax - 16 + i * 3.4, wv = Math.round(Math.sin(t * 8 - i * 0.8) * 2); c.fillStyle = '#7a3036'; c.fillRect(Math.round(fx), ay - 6 + wv, 3, 3); c.fillRect(Math.round(fx), ay + 4 - wv, 3, 3); c.fillStyle = '#e0807a'; c.fillRect(Math.round(fx), ay - 5 + wv, 2, 1); c.fillRect(Math.round(fx), ay + 5 - wv, 2, 1); }
      ell(c, ax - 2, ay, 17, 4, '#5a2830'); ell(c, ax - 2, ay, 16, 3, '#c05a5a'); c.fillStyle = '#e88a80'; c.fillRect(ax - 14, ay - 2, 22, 1);
      c.fillStyle = '#5a2830'; for (let i = -14; i < 12; i += 3) c.fillRect(ax + i, ay - 2, 1, 5);
      // Staartwaaier
      c.fillStyle = '#a04a4a'; c.fillRect(ax - 24, ay - 4, 5, 2); c.fillRect(ax - 24, ay + 2, 5, 2); c.fillRect(ax - 21, ay - 1, 3, 2);
      // Kop met steelogen en twee gebogen grijparmen
      ell(c, ax + 15, ay, 4, 3, '#b05050');
      c.fillStyle = '#3a1a1e'; c.fillRect(ax + 13, ay - 6, 1, 3); c.fillRect(ax + 13, ay - 7, 2, 2); c.fillStyle = '#fff'; c.fillRect(ax + 14, ay - 7, 1, 1);
      const cl = Math.round(Math.sin(t * 3) * 1.5);
      c.fillStyle = '#d07060'; for (let i = 0; i < 8; i++) { const yy = ay + 2 + Math.round(Math.sin(i / 7 * Math.PI) * -3) + Math.round(i * 0.9) + cl; c.fillRect(ax + 18 + i, yy, 2, 2); if (i % 2) { c.fillStyle = '#5a2830'; c.fillRect(ax + 18 + i, yy + 2, 1, 1); c.fillStyle = '#d07060'; } }
    } },
  { when: '445 miljoen jaar geleden', title: 'Uitsterven: de eerste grote ramp', text: 'Een ijstijd liet de zeespiegel zakken en het water afkoelen. Ongeveer 85 van de 100 soorten verdwenen: de eerste van vijf grote massa-extincties.', dur: 8, chord: [38, 45, 48, 53], extinct: true,
    draw(c, W, t, k) {
      bands(c, W, ['#5a8aa8', '#4a7896', '#3c6884', '#305872', '#244860']);
      ground(c, W, 148, ['#a09078', '#706050'], 2, 0.04);
      for (let i = 0; i < 6; i++) { if (hash(i, 81) < k * 1.2) continue; const x = 20 + hash(i, 71) * (W - 40), y = 150 + (i % 3) * 6; c.fillStyle = '#8a7058'; c.fillRect(Math.round(x) - 4, y - 2, 9, 3); }
      const ice = Math.round(ease(k) * 50); c.fillStyle = '#e8f4ff'; for (let x = 0; x < W; x++) { const h = ice + Math.round(Math.sin(x * 0.2) * 3 + hash(x) * 3); c.fillRect(x, 0, 1, h); }
      c.fillStyle = '#b8d8f0'; for (let x = 0; x < W; x += 7) c.fillRect(x, ice + 2, 1, 4 + Math.round(hash(x, 3) * 8));
    } },
  { when: '375 miljoen jaar geleden', title: 'Naar het land', text: 'Planten groeiden op het land, en daarna kropen de eerste vissen met poten uit het water, zoals Tiktaalik. Rond die tijd volgde de tweede massa-extinctie, maar het leven ging door.', dur: 9, chord: [45, 52, 57, 61],
    draw(c, W, t, k) {
      bands(c, W, ['#8ac0d8', '#a8d0dc', '#c8dccc'], 0, 110);
      c.fillStyle = '#3a7aa0'; c.fillRect(0, 110, W * 0.45, H); c.fillStyle = '#5a9ac0'; for (let x = 0; x < W * 0.45; x += 5) c.fillRect(x, 110 + ((x / 5 + Math.floor(t * 2)) % 3), 3, 1);
      for (let x = Math.floor(W * 0.4); x < W; x++) { const h = 110 - Math.max(0, (x - W * 0.4) * 0.08); c.fillStyle = '#7a6a48'; c.fillRect(x, Math.round(h), 1, H); c.fillStyle = '#5a7a34'; c.fillRect(x, Math.round(h), 1, 2); }
      for (let i = 0; i < 12; i++) { const x = Math.round(W * 0.5 + i * W * 0.04), h = 10 + hash(i, 5) * 16; c.fillStyle = '#3e6a2a'; c.fillRect(x, 108 - h, 1, h); for (let y = 0; y < h; y += 3) { c.fillRect(x - 2, 108 - h + y, 2, 1); c.fillRect(x + 1, 108 - h + y + 1, 2, 1); } }
      big(c, Math.round(W * 0.26 + ease(k) * W * 0.18), 113 - Math.round(ease(k) * 3), 2, () => tiktaalik(c, t * 3));   // Tiktaalik kruipt de modder op
    } },
  { when: '252 miljoen jaar geleden', title: 'De Grote Sterfte', text: 'Reusachtige vulkaanuitbarstingen in Siberië warmden de aarde op en maakten de zee zuur. Ongeveer 9 van de 10 zeesoorten stierven uit: de ergste ramp ooit.', dur: 9, chord: [36, 43, 46, 51], sfx: [[0.1, 'roar']], extinct: true,
    draw(c, W, t, k) {
      bands(c, W, ['#2a0c0c', '#4a1410', '#6e2014', '#8a3018', '#a04020'], 0, 120);
      for (let v = 0; v < 3; v++) { const vx = W * (0.2 + v * 0.3), top = 70 + v * 8; for (let y = top; y < 125; y++) { const w = (y - top) * 1.2 + 3; c.fillStyle = '#2a1a14'; c.fillRect(Math.round(vx - w), y, Math.round(w * 2), 1); }
        for (let i = 0; i < 30; i++) { const ph = (t * 0.6 + hash(i, v) ) % 1, x = vx + (hash(i, v + 9) - 0.5) * 30 * ph, y = top - ph * 70; c.fillStyle = ph < 0.3 ? '#ffb040' : '#4a3a34'; c.fillRect(Math.round(x), Math.round(y), 2, 2); }
        c.fillStyle = '#ff7a20'; for (let y = top; y < 125; y += 2) c.fillRect(Math.round(vx + Math.sin(y * 0.3 + t) * 2), y, 1, 2); }
      ground(c, W, 125, ['#3a1a10', '#1a0c08'], 2, 0.05);
      c.fillStyle = '#ff6a1a'; for (let x = 0; x < W; x += 3) if (noise(x / 30, t * 0.2) > 0.4) c.fillRect(x, 127 + Math.round(hash(x) * 20), 2, 1);
      c.fillStyle = '#ffffff20'; for (let i = 0; i < 80; i++) c.fillRect(Math.round(hash(i, 91) * W), Math.round((hash(i, 92) * H + t * 15) % H), 1, 1);
    } },
  { when: '230 – 66 miljoen jaar geleden', title: 'De tijd van de dinosaurussen', text: 'Na de Grote Sterfte kwamen de dinosaurussen. Ze heersten zo’n 165 miljoen jaar, van kleine renners tot reuzen van 30 meter. In de lucht vlogen pterosauriërs.', dur: 9, chord: [43, 50, 55, 62],
    draw(c, W, t, k) {
      bands(c, W, ['#6ab0d8', '#86c0dc', '#a6d0d8', '#c8dcc8'], 0, 130);
      ell(c, W * 0.3, 132, 90, 18, '#5a8a50'); ell(c, W * 0.8, 134, 110, 22, '#4e7a44');
      ground(c, W, 140, ['#5a8a34', '#3e6224'], 2, 0.06);
      for (let i = 0; i < 10; i++) { const x = Math.round(hash(i, 3) * W), y = 142; c.fillStyle = '#2e5a24'; for (let a = -3; a <= 3; a++) for (let s = 0; s < 8; s++) c.fillRect(x + a * s * 0.6, y - s * 0.9 - Math.abs(a), 1, 1); }
      // Sauropode die rustig loopt
      const sx = Math.round(W * 0.15 + t * 4), sy = 140, st = Math.floor(t * 2) % 2;
      c.fillStyle = '#4a5048'; ell(c, sx, sy - 22, 22, 10, '#4a5048'); c.fillStyle = '#4a5048';
      for (let i = 0; i < 26; i++) c.fillRect(sx + 16 + i, sy - 28 - Math.round(i * 1.4), 4, 4);
      c.fillRect(sx + 40, sy - 66, 8, 4);
      for (let i = 0; i < 26; i++) c.fillRect(sx - 20 - i, sy - 22 + Math.round(i * 0.4), 3, 2);
      for (const lx of [-14, -6, 8, 15]) c.fillRect(sx + lx + (st && lx % 2 ? 1 : 0), sy - 14, 5, 14);
      // Pterosauriërs
      for (let i = 0; i < 3; i++) { const px = (W - (t * 20 + i * 70) % (W + 40)), py = 30 + i * 12 + Math.sin(t * 3 + i) * 3, f = Math.floor(t * 6 + i) % 2; c.fillStyle = '#3a2a24'; c.fillRect(Math.round(px) - 6, Math.round(py) + (f ? -2 : 1), 6, 1); c.fillRect(Math.round(px), Math.round(py), 3, 2); c.fillRect(Math.round(px) + 3, Math.round(py) + (f ? -2 : 1), 6, 1); c.fillRect(Math.round(px) - 2, Math.round(py) - 1, 2, 1); }
    } },
  { when: '66 miljoen jaar geleden', title: 'De inslag', text: 'Een planetoïde van zo’n 10 kilometer sloeg in bij Chicxulub, in Mexico. Een schokgolf, branden en daarna jarenlang stof voor de zon. Driekwart van alle soorten verdween, ook Tyrannosaurus, Triceratops en de reuzen. Alleen de vogels bleven over: zij zijn de nakomelingen van de dinosaurussen.', dur: 12, chord: [37, 44, 49, 52], sfx: [[0.3, 'crash'], [0.32, 'roar'], [0.45, 'crash']], extinct: true,
    draw(c, W, t, k) {
      const hit = 0.3, after = seg(k, hit, 1);
      bands(c, W, after > 0 ? ['#4a1a10', '#7a3014', '#a04818', '#6a3420'] : ['#6ab0d8', '#86c0dc', '#a6d0d8', '#c8dcc8'], 0, 140);
      if (after === 0) { ell(c, W * 0.3, 136, 90, 14, '#5a8a50'); ell(c, W * 0.85, 138, 110, 18, '#4e7a44'); }
      ground(c, W, 140, after > 0 ? ['#4a3a24', '#2a2016'] : ['#5a8a34', '#3e6224'], 2, 0.06);
      if (after === 0) for (let i = 0; i < 8; i++) { const x = Math.round(hash(i, 3) * W), y = 142; c.fillStyle = '#2e5a24'; for (let a = -3; a <= 3; a++) for (let s2 = 0; s2 < 8; s2++) c.fillRect(Math.round(x + a * s2 * 0.6), Math.round(y - s2 * 0.9 - Math.abs(a)), 1, 1); }
      // De planetoïde
      if (k < hit) {
        const p = k / hit, x = W * 0.02 + p * W * 0.85, y = 6 + p * 120;
        for (let i = 0; i < 46; i++) { const q = i / 46; c.fillStyle = q < 0.15 ? '#ffffff' : q < 0.45 ? '#ffd060' : '#ff7020'; c.fillRect(Math.round(x - i * 2.4), Math.round(y - i * 1.8), Math.max(1, 4 - Math.floor(q * 4)), 2); }
        disc(c, x, y, 3, '#ffffff');
      } else {
        // Vuurbal en schokgolf vanaf de horizon rechts
        const fx = W * 0.88, r = after * W * 1.2;
        globeGlow(c, fx, 138, Math.max(0, 40 - after * 30), after);
        for (let i = 0; i < 220; i++) { const a = Math.PI + hash(i, 101) * Math.PI, d = r * (0.55 + hash(i, 102) * 0.45); c.fillStyle = hash(i, 103) > 0.5 ? '#6a4a34' : '#ff9030'; c.fillRect(Math.round(fx + Math.cos(a) * d), Math.round(138 + Math.sin(a) * d * 0.35), 2, 2); }
        c.fillStyle = '#ff7020'; for (let x = 0; x < W; x += 2) if (x > fx - r && hash(x, 5) > 0.75) c.fillRect(x, 136 + Math.round(hash(x, 6) * 4), 2, 3);
      }
      // Dino's: eerst rustig, dan kijken ze op; als de schokgolf ze bereikt vallen ze om
      const herd = [['sauro', 0.12, 1], ['rex', 0.36, 1], ['trike', 0.5, -1], ['hadro', 0.62, 1], ['ankylo', 0.74, -1], ['hadro', 0.28, -1]];
      herd.forEach(([kind, px, flip], i) => {
        const x = W * px, reach = hit + 0.06 + (0.88 - px) * 0.22;   // de golf komt van rechts
        const fall = ease(seg(k, reach, reach + 0.12)), walk = k < reach ? t * 4 + i : 0;
        dinoAt(c, kind, x, 142, walk, fall, seg(k, reach, reach + 0.3) * 0.7, flip);
      });
      // Pterosauriërs vluchten
      for (let i = 0; i < 2; i++) { const px = W * 0.7 - (t * 30 + i * 60) % (W + 60), py = 30 + i * 14 + Math.sin(t * 4 + i) * 3, f2 = Math.floor(t * 8 + i) % 2; c.fillStyle = '#2a1e18'; c.fillRect(Math.round(px) - 8, Math.round(py) + (f2 ? -3 : 1), 8, 1); c.fillRect(Math.round(px), Math.round(py), 4, 2); c.fillRect(Math.round(px) + 4, Math.round(py) + (f2 ? -3 : 1), 8, 1); c.fillRect(Math.round(px) - 3, Math.round(py) - 1, 3, 1); }
      if (k >= hit) {
        const fl = 1 - seg(k, hit, hit + 0.1); if (fl > 0) { c.globalAlpha = fl; c.fillStyle = '#fff8e0'; c.fillRect(0, 0, W, H); c.globalAlpha = 1; }
        // Daarna: stof en duisternis, as die valt
        const dusk = seg(k, 0.75, 1); c.globalAlpha = dusk * 0.6; c.fillStyle = '#140c08'; c.fillRect(0, 0, W, H); c.globalAlpha = 1;
        c.fillStyle = '#8a7a6a'; for (let i = 0; i < 90 * dusk; i++) c.fillRect(Math.round(hash(i, 91) * W), Math.round((hash(i, 92) * H + t * 12) % H), 1, 1);
      }
    } },
  { when: '23 – 3,6 miljoen jaar geleden', title: 'Mioceen en Plioceen: Megalodon', text: 'Zoogdieren werden groot. In de zee jaagde Megalodon, een haai van zo’n 15 meter (sommige schattingen zeggen meer), met tanden zo groot als een hand. Hij joeg op walvissen en beet eerst in de staart of de vinnen. Op het land, in Afrika, leefden steeds meer soorten mensapen.', dur: 12, chord: [41, 48, 53, 56], sfx: [[0.55, 'crash'], [0.56, 'roar']],
    draw(c, W, t, k) {
      bands(c, W, ['#3a98c4', '#2c84b2', '#2272a0', '#1a628e', '#14527c', '#0e446a', '#0a3658']);
      c.fillStyle = '#ffffff16'; for (let i = 0; i < 6; i++) { const x = (i * 90 + t * 5) % (W + 60) - 30; for (let y = 0; y < 120; y++) c.fillRect(Math.round(x + y * 0.3), y, 4, 1); }
      c.fillStyle = '#9fd0ff40'; for (let i = 0; i < 30; i++) c.fillRect(Math.round(hash(i, 5) * W), Math.round((hash(i, 6) * 150 + t * 4) % 150), 1, 1);
      const L = Math.min(260, W * 0.55), px = L / 15;   // pixels per meter
      // Walvis (Mioceen, ±7 m): zwemt rustig, schiet weg na de beet
      const bite = 0.55, hitK = seg(k, bite, 1);
      const wl = Math.round(7 * px), wx = Math.round(W * 0.42 + t * 6 + ease(hitK) * W * 0.25), wy = 70 + Math.round(Math.sin(t * 0.8) * 2) - Math.round(hitK * 10);
      const jerk = k > bite && k < bite + 0.08 ? Math.round(Math.sin(t * 60) * 2) : 0;
      ell(c, wx + jerk, wy, Math.round(wl / 2), Math.round(wl * 0.12), '#24323e'); ell(c, wx + jerk, wy + 2, Math.round(wl / 2) - 2, Math.round(wl * 0.09), '#3e4e5c');
      ell(c, wx + jerk - 4, wy + Math.round(wl * 0.09), Math.round(wl * 0.35), 2, '#8a96a0');
      c.fillStyle = '#24323e'; const fl = Math.round(Math.sin(t * 3) * 3); c.fillRect(wx + jerk - Math.round(wl / 2) - 12, wy - 7 + fl, 6, 14); c.fillRect(wx + jerk - Math.round(wl / 2) - 6, wy - 2 + Math.round(fl / 2), 7, 4);
      taperLine(c, wx + jerk + 10, wy + 6, wx + jerk + 2, wy + 14, 4, 2, '#2e3c48');
      c.fillStyle = '#000'; c.fillRect(wx + jerk + Math.round(wl / 2) - 12, wy, 2, 1);
      // Megalodon: komt van links, versnelt, opent de bek en bijt in de staart
      const approach = ease(seg(k, 0, bite)), snoutX = Math.round(-L * 0.2 + approach * (wx - Math.round(wl / 2) + 8 + L * 0.2)) + (k > bite ? Math.round(ease(hitK) * W * 0.12) : 0);
      const mouth = seg(k, bite - 0.15, bite - 0.02) * (1 - seg(k, bite + 0.06, bite + 0.2) * 0.7);
      megalodon(c, snoutX, wy + 16 - Math.round(hitK * 4), L, mouth, t * 5);
      // Bloedwolkje en belletjes bij de beet
      if (k > bite) { const e = seg(k, bite, bite + 0.4), bx = wx - Math.round(wl / 2) - 4, by = wy + 6; for (let i = 0; i < 40 * (1 - e * 0.5); i++) { const a = hash(i, 7) * 6.28, d = e * (6 + hash(i, 8) * 22); c.fillStyle = i % 3 ? '#8a1e22' : '#b02a2a'; c.fillRect(Math.round(bx + Math.cos(a) * d), Math.round(by + Math.sin(a) * d * 0.6), 2, 2); }
        c.fillStyle = '#d8f0ff'; for (let i = 0; i < 12; i++) c.fillRect(Math.round(bx + (hash(i, 9) - 0.5) * 30), Math.round(by - e * 50 * hash(i, 10)), 1, 1); }
      // Ter vergelijking: een mens op dezelfde schaal (in het Mioceen leefden nog geen mensen)
      const ry = H - 10, rx = 12;
      c.fillStyle = '#0a2a40c0'; c.fillRect(rx - 6, ry - Math.round(1.7 * px) - 14, Math.round(L) + 70, Math.round(1.7 * px) + 22);
      c.fillStyle = '#fff6dc'; c.fillRect(rx, ry, Math.round(L), 1); for (let m = 0; m <= 15; m += 5) c.fillRect(rx + Math.round(m * px), ry - 2, 1, 4);
      c.font = '7px monospace'; c.fillText('Megalodon ±15 m', rx, ry - 4);
      const hx = rx + Math.round(L) + 18, hh = Math.round(1.7 * px);
      c.fillStyle = '#f0c8a0'; c.fillRect(hx - 1, ry - hh, 3, 3); c.fillStyle = '#2e6aa0'; c.fillRect(hx - 2, ry - hh + 3, 5, Math.round(hh * 0.4)); c.fillStyle = '#3a3030'; c.fillRect(hx - 2, ry - hh + 3 + Math.round(hh * 0.4), 2, hh - 3 - Math.round(hh * 0.4)); c.fillRect(hx + 1, ry - hh + 3 + Math.round(hh * 0.4), 2, hh - 3 - Math.round(hh * 0.4));
      c.fillStyle = '#fff6dc'; c.fillText('mens 1,7 m', hx + 6, ry - 2);
    } },
  { when: '7 – 3 miljoen jaar geleden', title: 'Rechtop lopen', text: 'Zo’n 7 miljoen jaar geleden gingen onze voorouders en die van de chimpansee elk hun eigen weg. In Laetoli liepen 3,66 miljoen jaar geleden al wezens rechtop: hun voetsporen liggen er nog. Lucy leefde 3,2 miljoen jaar geleden.', dur: 10, chord: [45, 52, 57, 64],
    draw(c, W, t, k) {
      bands(c, W, ['#f0a860', '#f4c080', '#f6d8a0', '#e8dcb0'], 0, 130);
      disc(c, W * 0.8, 92, 14, '#fff0c0');
      ell(c, W * 0.5, 132, W * 0.6, 12, '#b89a5a');
      ground(c, W, 136, ['#c8a050', '#9a7a3a'], 1, 0.04);
      acacia(c, Math.round(W * 0.18), 136, 2, '#4a3a24'); acacia(c, Math.round(W * 0.88), 136, 1, '#5a4a30');
      const x = Math.round(W * 0.2 + k * W * 0.55);
      c.fillStyle = '#7a5a30'; for (let fx = Math.round(W * 0.2); fx < x - 6; fx += 7) c.fillRect(fx, 146 + ((fx / 7) % 2 ? 0 : 2), 2, 1);
      big(c, x, 150, 2, () => { walker(c, 0, 0, t * 6, '#3a2414', 0.8, 1); walker(c, 9, 0, t * 6 + 1, '#3a2414', 0.65, 1); });
    } },
  { when: 'vanaf 2,6 miljoen jaar geleden', title: 'De ijstijden beginnen', text: 'Het klimaat werd kouder en wisselvalliger. Aan de polen groeide ijs, en ijstijden en warme tijden wisselden elkaar af. In Afrika werd het droger, met meer open grasland.', dur: 8, chord: [40, 47, 52, 59],
    draw(c, W, t, k) {
      c.fillStyle = '#03040c'; c.fillRect(0, 0, W, H); stars(c, W, t, 100, 8);
      const ice = 0.55 - (Math.sin(t * 1.6) * 0.5 + 0.5) * 0.35 * ease(k) - ease(k) * 0.1;
      globe(c, W / 2, H / 2, 60, t, (u, v, t) => {
        if (Math.abs(v) > ice + 0.35 + noise(u * 3, v) * 0.08) return '#eef6ff';
        const lon = u + t * 0.08, n = noise(lon * 2.2, v * 2.4), cl = noise(lon * 4 - t * 0.1, v * 5 + 3);
        if (cl > 0.62) return '#f2f6ff';
        if (n > 0.3) return Math.abs(v) < 0.3 ? '#c8a860' : '#5a8a40';
        return u + v < -0.3 ? '#3a7ac8' : '#1e4c9a';
      });
    } },
  { when: 'circa 2,8 – 2,4 miljoen jaar geleden', title: 'De eerste mens', text: 'In Oost-Afrika verscheen een nieuw soort mensaap, met een groter brein en handen die stenen werktuigen maakten: Homo, de eerste mens. Hier begint jouw reis.', dur: 9, chord: [48, 55, 60, 64],
    draw(c, W, t, k) {
      bands(c, W, ['#5a8ac0', '#8aaccc', '#e0b888', '#f0c890'], 0, 130);
      disc(c, W * 0.3, 128, 16, '#ffe0a0');
      ground(c, W, 134, ['#a08a4a', '#6a5a30'], 2, 0.03);
      acacia(c, Math.round(W * 0.75), 134, 2, '#2a2014');
      big(c, Math.round(W * 0.48), 152, 2, () => {
      // Habilis die een steen bewerkt: vonkjes
      const x = 0, y = 0;
      c.fillStyle = '#2a1a10'; c.fillRect(x - 3, y - 16, 6, 6); c.fillRect(x - 4, y - 10, 8, 8); c.fillRect(x - 5, y - 2, 10, 2);
      const hit = Math.floor(t * 2.5) % 2; c.fillRect(x + 4, y - 10 + (hit ? 0 : -3), 6, 2); c.fillStyle = '#6a6a70'; c.fillRect(x + 9, y - 11 + (hit ? 0 : -3), 3, 3); c.fillRect(x + 8, y - 4, 4, 3);
      if (hit) { c.fillStyle = '#ffe080'; for (let i = 0; i < 5; i++) c.fillRect(x + 10 + Math.round(hash(i, Math.floor(t * 5)) * 8), y - 6 - Math.round(hash(i, 2 + Math.floor(t * 5)) * 6), 1, 1); }
      });
    } },
];

// ---------- wereld 2: Homo erectus ----------
// Wereldkaart (vereenvoudigd), coördinaten in lengte- en breedtegraden
const LAND = [
  [[-17, 15], [-16, 22], [-10, 30], [-5, 36], [10, 37], [20, 32], [32, 31], [35, 28], [43, 12], [51, 12], [42, -1], [40, -15], [35, -24], [28, -33], [18, -34], [12, -17], [13, -5], [9, 4], [-8, 5], [-15, 10]],
  [[-10, 36], [-9, 43], [-2, 44], [-5, 48], [2, 51], [8, 54], [10, 58], [5, 62], [30, 66], [60, 66], [150, 66], [150, 60], [140, 50], [135, 43], [122, 40], [121, 31], [117, 24], [110, 20], [106, 10], [100, 13], [103, 1], [98, 8], [95, 16], [90, 22], [80, 15], [77, 8], [72, 20], [66, 25], [57, 25], [56, 27], [50, 30], [48, 29], [52, 24], [56, 24], [59, 22], [52, 16], [45, 13], [43, 15], [39, 22], [35, 28], [34, 31], [36, 36], [28, 37], [26, 40], [23, 36], [21, 40], [19, 42], [15, 40], [16, 38], [12, 44], [8, 44], [3, 43], [-1, 37]],
  [[95, 5], [98, 4], [106, -3], [106, -6], [114, -7], [114, -8.5], [105, -7], [101, -3], [95, 2]],
  [[109, 1], [117, 7], [119, 1], [116, -4], [110, -3]],
  [[-5, 50], [1, 51], [0, 54], [-3, 58], [-6, 57]],
];
function mapScene(c, W, t, k, route, col = '#f6c94c') {
  bands(c, W, ['#1e4c7a', '#245888', '#1e4c7a']);
  c.fillStyle = '#2a5e92'; for (let y = 0; y < H; y += 6) for (let x = (y / 6) % 2 * 3; x < W; x += 6) c.fillRect(x, y, 1, 1);
  const sc = Math.min(W / 175, H / 110), ox = W / 2 - 65 * sc, oy = H / 2;
  const P = (lon, lat) => [ox + lon * sc, oy - (lat - 10) * sc];
  for (const poly of LAND) {
    c.fillStyle = '#5a4a2a'; c.beginPath(); poly.forEach(([x, y], i) => { const [px, py] = P(x, y); i ? c.lineTo(px + 1, py + 1) : c.moveTo(px + 1, py + 1); }); c.closePath(); c.fill();
    c.fillStyle = '#a8925a'; c.beginPath(); poly.forEach(([x, y], i) => i ? c.lineTo(...P(x, y)) : c.moveTo(...P(x, y))); c.closePath(); c.fill();
  }
  // Route met stippen
  const pts = route.map(([x, y]) => P(x, y)); let total = 0; const L = []; for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); L.push(d); total += d; }
  const done = ease(Math.min(1, k * 1.3)) * total; let left = done; c.fillStyle = col;
  for (let i = 1; i < pts.length && left > 0; i++) { const d = Math.min(left, L[i - 1]); for (let s = 0; s < d; s += 4) { const q = s / L[i - 1]; c.fillRect(Math.round(pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * q), Math.round(pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * q), 2, 2); } left -= L[i - 1]; }
  let acc = 0; pts.forEach(([x, y], i) => { if (i) acc += L[i - 1]; if (acc <= done) disc(c, x, y, 2, '#ffffff'); });
}
const W2 = [
  { when: 'circa 1,9 miljoen jaar geleden', title: 'Een nieuwe mens', text: 'In Afrika verscheen Homo erectus: lang, met lange benen en een groter brein. Gebouwd om ver te lopen en te rennen, ook in de hitte.', dur: 8, chord: [43, 50, 55, 59],
    draw(c, W, t, k) {
      bands(c, W, ['#78b4d8', '#a0c8d8', '#e8d8a8'], 0, 130); disc(c, W * 0.15, 40, 10, '#fff4c0');
      ground(c, W, 136, ['#c8a050', '#9a7a3a'], 1, 0.04);
      acacia(c, Math.round(W * 0.7), 136, 2, '#5a4a30');
      for (let i = 0; i < 3; i++) big(c, Math.round((W * 0.1 + t * 22 + i * 30) % (W + 60)) - 30, 152, 2, () => walker(c, 0, 0, t * 9 + i, '#3a2414', 1.25));
    } },
  { when: '1,8 miljoen jaar geleden en later', title: 'Afrika uit', text: 'Homo erectus was de eerste mens die Afrika verliet. Zijn sporen liggen in Dmanisi in Georgië, in China en op Java.', dur: 8, chord: [45, 52, 57, 61],
    draw(c, W, t, k) { mapScene(c, W, t, k, [[36, 3], [38, 12], [34, 30], [44, 41], [70, 32], [90, 25], [103, 15], [108, -2], [111, -7]]); } },
  { when: 'minstens 1 miljoen jaar geleden', title: 'Vuur', text: 'Ergens in deze tijd leerden mensen vuur te gebruiken. De oudste breed aanvaarde sporen liggen in de Wonderwerk-grot in Zuid-Afrika. Vuur gaf warmte, licht, bescherming en gekookt eten.', dur: 9, chord: [41, 48, 53, 57],
    draw(c, W, t, k) {
      bands(c, W, ['#0a0c1c', '#121630', '#1a1e3a']); stars(c, W, t, 120, 9);
      ground(c, W, 140, ['#2a2018', '#1a140e'], 1, 0.04);
      big(c, Math.round(W / 2), 150, 2, () => {
      const x = 0, y = 0;
      c.globalAlpha = 0.25 + Math.sin(t * 9) * 0.05; disc(c, x, y - 6, 26, '#ff9a40'); c.globalAlpha = 1;
      c.fillStyle = '#4a3020'; c.fillRect(x - 8, y - 2, 16, 2);
      for (let i = 0; i < 14; i++) { const h = 4 + hash(i, Math.floor(t * 10)) * 10; c.fillStyle = i % 3 ? '#ff8a20' : '#ffd060'; c.fillRect(x - 6 + i, Math.round(y - 2 - h), 1, Math.round(h)); }
      for (let i = 0; i < 8; i++) { const ph = (t * 0.7 + hash(i)) % 1; c.fillStyle = '#ffd080'; c.fillRect(Math.round(x + Math.sin(i + t) * 6), Math.round(y - 14 - ph * 40), 1, 1); }
      for (const [dx, f] of [[-26, 1], [24, -1], [-40, 1]]) { c.fillStyle = '#1a0c06'; c.fillRect(x + dx - 3, y - 14, 6, 6); c.fillRect(x + dx - 4, y - 8, 8, 8); c.fillStyle = '#c86a30'; c.fillRect(x + dx + (f > 0 ? 3 : -4), y - 13, 1, 4); }
      });
    } },
];

// ---------- wereld 3: Homo heidelbergensis ----------
const W3 = [
  { when: '800.000 – 300.000 jaar geleden', title: 'Kou en warmte', text: 'IJstijden en warme tijden wisselden elkaar steeds af. In een warme tijd was Europa bos en grasland met olifanten en neushoorns; in een ijstijd lag er sneeuw en ijs.', dur: 8, chord: [40, 47, 52, 55],
    draw(c, W, t, k) {
      const cold = Math.sin(t * 1.2) * 0.5 + 0.5;
      bands(c, W, cold > 0.5 ? ['#8aa0b8', '#a8b8c8', '#c8d0d8'] : ['#6ab0d8', '#90c4d8', '#c0dcd0'], 0, 130);
      ground(c, W, 136, cold > 0.5 ? ['#f0f4f8', '#c8d0d8'] : ['#6a9a40', '#4a7230'], 2, 0.04);
      for (let i = 0; i < 6; i++) { const x = Math.round(20 + i * W / 6), h = 18 + hash(i) * 10; c.fillStyle = '#3a2a1a'; c.fillRect(x, 136 - h, 2, h); ell(c, x + 1, 136 - h, 6, 9, cold > 0.5 ? '#e8eef4' : '#3e6a2a'); }
      if (cold > 0.5) { c.fillStyle = '#ffffff'; for (let i = 0; i < 70; i++) c.fillRect(Math.round(hash(i, 31) * W), Math.round((hash(i, 32) * H + t * 20) % H), 1, 1); }
    } },
  { when: 'circa 600.000 jaar geleden', title: 'Een mens met een groot brein', text: 'Uit Afrika kwam een nieuwe mens naar Europa: Homo heidelbergensis. Zijn brein was bijna zo groot als het onze. Uit deze groep kwamen later de Neanderthalers voort.', dur: 8, chord: [43, 50, 55, 62],
    draw(c, W, t, k) { mapScene(c, W, t, k, [[40, 10], [34, 30], [26, 40], [12, 45], [-3, 42], [0, 51], [11, 52]], '#9cf27a'); } },
  { when: 'circa 300.000 – 200.000 jaar geleden', title: 'Jagen met speren', text: 'In Schöningen in Duitsland zijn houten speren gevonden, tussen de botten van wilde paarden. Ze behoren tot de oudste complete jachtwapens ter wereld.', dur: 9, chord: [45, 52, 57, 60],
    draw(c, W, t, k) {
      bands(c, W, ['#7ab4d0', '#a0c8d4', '#d0dcc0'], 0, 128);
      c.fillStyle = '#5a8aa8'; c.fillRect(0, 128, W, 6);
      ground(c, W, 134, ['#7a9a48', '#5a7a34'], 1, 0.04);
      for (let i = 0; i < 4; i++) big(c, Math.round((W * 0.55 + i * 40 + t * 26) % (W + 80)) - 40, 152, 2, () => { const x = 0, y = 0, st = Math.floor(t * 8 + i) % 2; c.fillStyle = '#6a4a2a'; c.fillRect(x - 6, y - 10, 13, 6); c.fillRect(x + 6, y - 14, 3, 6); c.fillRect(x + 8, y - 15, 4, 3); c.fillStyle = '#3a2a1a'; c.fillRect(x + 5, y - 15, 2, 5); c.fillRect(x - 7, y - 9, 1, 4); c.fillStyle = '#6a4a2a'; for (const lx of [-5, -2, 3, 5]) c.fillRect(x + lx + (st && lx > 0 ? 1 : 0), y - 4, 1, 4); });
      for (let i = 0; i < 2; i++) big(c, Math.round(W * 0.12 + t * 22 + i * 30), 152, 2, () => { walker(c, 0, 0, t * 8 + i, '#3a2414', 1.15); c.fillStyle = '#8a6a3a'; for (let s2 = 0; s2 < 18; s2++) c.fillRect(-6 + s2, -16 + Math.round(s2 * 0.15), 1, 1); });
    } },
];

const CHAPTERS = {
  1: { title: 'Hoofdstuk 1', sub: 'De eerste mens · Homo habilis', scenes: W1 },
  2: { title: 'Hoofdstuk 2', sub: 'De lange benen · Homo erectus', scenes: W2 },
  3: { title: 'Hoofdstuk 3', sub: 'Het grote brein · Homo heidelbergensis', scenes: W3 },
};
export const hasIntro = w => !!CHAPTERS[w];

// ---------- de speler ----------
const CSS = `
#cine{position:fixed;inset:0;z-index:20;background:#000;display:none;touch-action:manipulation;user-select:none;-webkit-user-select:none}
#cine.open{display:block}
#cine canvas{position:absolute;left:0;top:0;width:100%;image-rendering:pixelated;image-rendering:crisp-edges}
#cine .cap{position:absolute;left:0;right:0;bottom:0;min-height:96px;box-sizing:border-box;background:#000;border-top:2px solid #f6c94c44;padding:8px max(20px,env(safe-area-inset-right)) max(10px,env(safe-area-inset-bottom)) max(20px,env(safe-area-inset-left));color:#fff6dc;font:500 clamp(12px,1.9vw,17px)/1.35 system-ui,sans-serif;transition:opacity .4s}
#cine .cap>div{max-width:900px;margin:0 auto}
#cine .when{color:#f6c94c;font-weight:800;letter-spacing:.08em;text-transform:uppercase;font-size:.72em}
#cine .ttl{font-weight:800;font-size:1.15em;margin:2px 0 3px}
#cine .skip{position:absolute;top:max(10px,env(safe-area-inset-top));right:max(12px,env(safe-area-inset-right));background:#0b1614b0;color:#fff6dc;border:1px solid #fff6dc55;border-radius:999px;padding:8px 14px;font:700 14px system-ui,sans-serif}
#cine .hint{position:absolute;top:max(14px,env(safe-area-inset-top));left:max(14px,env(safe-area-inset-left));color:#fff6dc88;font:600 12px system-ui,sans-serif}
#cine .chap{position:absolute;inset:0;display:grid;place-content:center;text-align:center;color:#fff6dc;font-family:system-ui,sans-serif;opacity:0;transition:opacity .8s;pointer-events:none}
#cine .chap b{display:block;color:#f6c94c;font-size:clamp(14px,2.4vw,20px);letter-spacing:.3em;text-transform:uppercase}
#cine .chap span{display:block;font-size:clamp(26px,5.5vw,52px);font-weight:900;margin-top:6px;text-shadow:0 3px 0 #000}
`;

export class Cinema {
  constructor(audio) {
    this.audio = audio;
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    const el = this.el = document.createElement('div'); el.id = 'cine';
    el.innerHTML = '<canvas></canvas><div class="hint">Tik voor de volgende scène</div><button class="skip">Overslaan ▶▶</button><div class="cap"><div class="when"></div><div class="ttl"></div><div class="txt"></div></div><div class="chap"><b></b><span></span></div>';
    document.body.appendChild(el);
    this.cv = el.querySelector('canvas'); this.c = this.cv.getContext('2d');
    this.cap = el.querySelector('.cap');
    el.querySelector('.skip').addEventListener('click', e => { e.stopPropagation(); this.finish(); });
    el.addEventListener('pointerdown', e => { if (e.target.closest('.skip')) return; this.next(); });
    addEventListener('keydown', e => { if (!this.on) return; e.preventDefault(); if (e.key === 'Escape') this.finish(); else this.next(); }, true);
  }
  play(world, done) {
    const ch = CHAPTERS[world]; if (!ch) return done();
    this.ch = ch; this.done = done; this.i = -1; this.on = true; this.el.classList.add('open');
    this.audio.stopSong?.();
    this.el.querySelector('.chap b').textContent = ch.title; this.el.querySelector('.chap span').textContent = ch.sub;
    this.next();
    const loop = now => { if (!this.on) return; this.frame(now / 1000); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
  next() {
    if (!this.on) return;
    if (this.i >= this.ch.scenes.length) return this.finish();
    this.i++; this.t0 = null; this.fired = new Set();
    const s = this.ch.scenes[this.i];
    if (!s) { this.cap.style.opacity = 0; this.el.querySelector('.chap').style.opacity = 1; this.music([48, 55, 60, 64, 67], 4); return; }
    this.cap.style.opacity = 1; this.el.querySelector('.chap').style.opacity = 0;
    this.cap.querySelector('.when').textContent = s.when; this.cap.querySelector('.ttl').textContent = s.title; this.cap.querySelector('.txt').textContent = s.text;
    this.music(s.chord, s.dur);
  }
  music(chord, dur) {
    const a = this.audio, c = a.ctx; if (!c || !a.musicGain) return;
    const t = c.currentTime + 0.05;
    a.pad(chord.map(n => n + 12), t, dur + 1.5, 0.06, a.musicGain);
    a.bass?.(440 * Math.pow(2, (chord[0] - 69) / 12), t, dur + 1, 0.22, a.musicGain);
  }
  frame(now) {
    if (this.t0 == null) this.t0 = now;
    const t = now - this.t0, cv = this.cv;
    const capH = this.cap.style.opacity === '0' ? 0 : this.cap.offsetHeight, viewH = Math.max(120, innerHeight - capH);
    if (this.viewH !== viewH) { this.viewH = viewH; cv.style.height = viewH + 'px'; }
    const Wd = Math.max(240, Math.round(H * innerWidth / viewH));
    if (cv.width !== Wd || cv.height !== H) { cv.width = Wd; cv.height = H; }
    const c = this.c, s = this.ch.scenes[this.i];
    if (!s) {   // titelkaart van het hoofdstuk
      c.fillStyle = '#000'; c.fillRect(0, 0, Wd, H); stars(c, Wd, t, 60, 12, Math.min(1, t));
      if (t > 3.6) this.finish();
      return;
    }
    const k = Math.min(1, t / s.dur);
    s.draw(c, Wd, t, k);
    for (const [at, name] of s.sfx || []) if (k >= at && !this.fired.has(at)) { this.fired.add(at); this.audio.play(name); }
    // Zachte overgang in en uit
    const fade = Math.min(1, t / 0.5, (s.dur + 0.6 - t) / 0.6);
    if (fade < 1) { c.globalAlpha = 1 - Math.max(0, fade); c.fillStyle = '#000'; c.fillRect(0, 0, Wd, H); c.globalAlpha = 1; }
    if (t > s.dur + 0.6) this.next();
  }
  finish() {
    if (!this.on) return;
    this.on = false; this.el.classList.remove('open');
    const d = this.done; this.done = null; d && d();
  }
}
