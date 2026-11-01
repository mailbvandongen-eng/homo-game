// Handgemaakte pixel-viervoeters: één generator, per soort eigen bouw en kenmerken.
// Elk beeld (soort + houding + loopbeeld + bek open/dicht) wordt één keer gebakken en daarna hergebruikt.
const INK = '#1a0f08';
const dither = (x, y) => (x + y) % 2 === 0;
const inEll = (x, y, cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
const hash = (a, b) => { const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return n - Math.floor(n); };

// L lijflengte, bh lijfhoogte, leg beenlengte, slope hoeveel hoger de schouders zijn, hr kopstraal, sn snuitlengte
export const SPECS = {
  hyena:   { L: 16, bh: 9, leg: 7, slope: 4, hr: 4, sn: 4, snH: 3, ear: 'point', mane: true, tail: 'brush', pat: 'spots', col: ['#e0bc80', '#b48c54', '#7c5a34'], spot: '#4a301a', mcol: '#3a2414', eye: '#f0c040', lw: 2 },
  wolf:    { L: 17, bh: 7, leg: 8, slope: 1, hr: 3.5, sn: 5, snH: 2, ear: 'point', tail: 'bushy', belly: '#e0dad0', col: ['#c8c2b6', '#8c8780', '#5a5650'], eye: '#f2c84b', lw: 2 },
  warthog: { L: 15, bh: 10, leg: 5, slope: 1, hr: 5, sn: 5, snH: 4, ear: 'point', mane: true, tail: 'whip', tusk: true, pat: 'bristle', col: ['#a08a78', '#7d6858', '#54463a'], mcol: '#2e221a', eye: '#2a1a10', lw: 2 },
  leopard: { L: 20, bh: 7, leg: 6, slope: 0, hr: 3.5, sn: 2, snH: 2, ear: 'cat', tail: 'long', pat: 'rosette', belly: '#f4e2b8', col: ['#f2cf86', '#dcaa52', '#a07830'], spot: '#4a2e10', eye: '#e8d040', lw: 2 },
  sabre:   { L: 20, bh: 8, leg: 6, slope: 2, hr: 4, sn: 2, snH: 2, ear: 'cat', tail: 'stub', fang: 4, pat: 'spots', belly: '#e2c69a', col: ['#d8ac72', '#b88a52', '#7a5a34'], spot: '#8a6a40', eye: '#e8d040', lw: 3 },
  gnu:     { L: 18, bh: 9, leg: 10, slope: 4, hr: 3.5, sn: 5, snH: 3, ear: 'side', horn: 'curl', mane: true, tail: 'tuft', pat: 'stripes', col: ['#7c7a86', '#5c5a64', '#3a3840'], spot: '#2c2a30', mcol: '#1c1a1e', eye: '#2a1a10', lw: 2 },
  horse:   { L: 19, bh: 9, leg: 11, slope: 1, hr: 3.5, sn: 6, snH: 3, ear: 'point', mane: true, tail: 'tuft', belly: '#d8b88a', col: ['#c8955e', '#9a6a3c', '#6a4424'], mcol: '#3a2414', eye: '#2a1a10', lw: 2 },
  bear:    { L: 18, bh: 13, leg: 6, slope: 3, hr: 5, sn: 4, snH: 3, ear: 'round', tail: 'stub', pat: 'bristle', col: ['#9a7048', '#6a4a30', '#45301e'], mcol: '#3a2414', eye: '#2a1a10', lw: 4 },
  rhino:   { L: 24, bh: 13, leg: 6, slope: 1, hr: 5.5, sn: 6, snH: 4, ear: 'point', horn: 'rhino', tail: 'whip', pat: 'wrinkle', col: ['#b0aa9c', '#8a8478', '#5e5a50'], eye: '#2a1a10', lw: 4 },
  // Eindbazen
  ghyena:  { L: 44, bh: 26, leg: 18, slope: 14, hr: 11, sn: 11, snH: 8, ear: 'point', mane: true, tail: 'brush', pat: 'spots', col: ['#cfa468', '#a37a46', '#6a4a28'], spot: '#3a2614', mcol: '#24160a', eye: '#ff4a2a', lw: 5, scars: true },
  lion:    { L: 44, bh: 19, leg: 17, slope: 2, hr: 9, sn: 6, snH: 6, ear: 'none', lmane: true, tail: 'tuft', belly: '#ecd09a', col: ['#e8c07c', '#c9974e', '#8a6430'], mcol: '#6a3a18', eye: '#f2d36b', lw: 5 },
  homoth:  { L: 42, bh: 19, leg: 19, slope: 11, hr: 9, sn: 5, snH: 5, ear: 'cat', tail: 'stub', fang: 9, pat: 'spots', belly: '#dcc298', col: ['#d6b07c', '#b08a58', '#7a5a34'], spot: '#8a6a40', eye: '#e8c84a', lw: 5 },
};

function ramp(t, x, y, [l, m, d]) {
  if (t < 0.28) return l; if (t < 0.38) return dither(x, y) ? l : m;
  if (t < 0.66) return m; if (t < 0.76) return dither(x, y) ? m : d; return d;
}
const darken = (hex, k) => { const n = parseInt(hex.slice(1), 16); const f = c => Math.max(0, Math.round(((n >> c) & 255) * (1 - k))); return '#' + [16, 8, 0].map(c => f(c).toString(16).padStart(2, '0')).join(''); };

// pose: 'idle' | 'walk' | 'run' | 'crouch' | 'jump'; frame 0..3; mouth: 0 dicht, 1 open; eye: 'open' | 'angry' | 'closed'
function build(S, pose, frame, mouth, eyeMode) {
  const tailLen = S.tail === 'long' ? Math.round(S.L * 0.6) : S.tail === 'bushy' || S.tail === 'brush' ? Math.round(S.bh * 0.8) : 4;
  const pad = tailLen + 2, crouch = pose === 'crouch' ? 1 : 0, run = pose === 'run' ? 1 : 0, jump = pose === 'jump' ? 1 : 0;
  const W = Math.ceil(pad + S.bh * 0.5 + S.L + S.bh * 0.5 + S.hr * 2 + S.sn + 4);
  const H = Math.ceil(S.leg + S.bh + S.slope + S.hr * 2.6 + (S.horn === 'curl' ? 4 : 2) + (S.lmane ? S.hr * 0.6 : 0));
  const ground = H - 1;
  const legEff = Math.round(S.leg * (1 - 0.4 * crouch)) - (jump ? 2 : 0);
  const bob = run && frame % 2 ? -1 : 0;
  const hipB = ground - legEff + bob, hipT = hipB - S.bh;
  const shB = hipB - Math.round(S.slope * 0.4), shT = hipT - S.slope + Math.round(crouch * 2);
  const hipX = pad + Math.round(S.bh * 0.45), shX = hipX + S.L;
  const tone = S.col, far = S.col.map(c => darken(c, 0.32));
  // Kop
  const drop = crouch * S.hr * 0.9;
  const hx = shX + S.bh * 0.3 + S.hr * 0.5, hy = shT + S.hr * 0.5 + drop - (S.lmane ? 1 : 0);
  const snY = hy + S.hr * 0.25, snX0 = hx + S.hr * 0.4, snX1 = hx + S.hr + S.sn;
  // Poten: diagonaal ritme
  const amp = run || jump ? Math.max(2, S.leg * 0.35) : pose === 'walk' ? Math.max(1, S.leg * 0.22) : 0;
  const legs = [
    { x: hipX - 1, ph: 2, far: true, front: false }, { x: shX - 1, ph: 0, far: true, front: true },
    { x: hipX + 1, ph: 0, far: false, front: false }, { x: shX + 1, ph: 2, far: false, front: true },
  ];
  const legAt = (l, x, y) => {
    let off, lift;
    if (jump) { off = l.front ? amp : -amp; lift = 2; }
    else { const a = (frame + l.ph) * Math.PI / 2; off = Math.round(Math.sin(a) * amp); lift = amp ? Math.max(0, Math.round(Math.cos(a) * 1.5)) : 0; }
    const top = l.front ? shB - 2 : hipB - 2, bot = ground - lift;
    if (y < top || y > bot) return null;
    const k = (y - top) / Math.max(1, bot - top), xc = l.x + off * k;
    const w = (l.front ? S.lw : S.lw) * (1 - k * 0.25) + (y >= bot - 1 ? 1 : 0);
    if (Math.abs(x - xc - (y >= bot - 1 ? 0.5 : 0)) > w / 2) return null;
    const t = l.far ? far : tone;
    return y >= bot - 1 ? INK === t[2] ? t[2] : darken(t[2], 0.25) : x < xc ? t[1] : t[2];
  };
  const fn = (x, y) => {
    // --- Kop en wat erbij hoort ---
    const eyeX = Math.round(hx + S.hr * 0.25), eyeY = Math.round(hy - S.hr * 0.25);
    if (x === eyeX && y === eyeY && eyeMode !== 'closed') return S.eye;
    if (S.hr >= 7 && x === eyeX + 1 && y === eyeY && eyeMode !== 'closed') return S.eye;
    if (eyeMode === 'closed' && y === eyeY && Math.abs(x - eyeX) <= (S.hr >= 7 ? 1 : 0)) return INK;
    if (eyeMode === 'angry' && y === eyeY - 1 && x >= eyeX - 1 && x <= eyeX + 1) return INK;
    // Neus
    if (x >= Math.round(snX1) - 1 && x <= Math.round(snX1) && y >= Math.round(snY - S.snH / 2) && y <= Math.round(snY - S.snH / 2) + 1) return INK;
    // Hoorns
    if (S.horn === 'rhino') {
      const bx = Math.round(snX1 - 3), by = Math.round(snY - S.snH / 2);
      if (y < by && y >= by - 6 && x >= bx - (6 - (by - y)) * 0.4 && x <= bx + 1 - (by - y) * 0.2) return y < by - 3 ? '#f2ead6' : '#d8ccb0';
      const bx2 = Math.round(snX1 - 7);
      if (y < by && y >= by - 3 && Math.abs(x - bx2) <= (3 - (by - y)) * 0.5) return '#d8ccb0';
    }
    if (S.horn === 'curl') {
      const top = Math.round(hy - S.hr);
      for (const sgn of [-1, 1]) { const cx = Math.round(hx + sgn * 2); if ((y === top - 1 && (x === cx || x === cx + sgn)) || (y === top - 2 && x === cx + sgn * 2) || (y === top - 3 && x === cx + sgn)) return '#e8e0cc'; }
    }
    // Slagtanden en dolktanden
    if (S.tusk && ((x === Math.round(snX1) - 2 && y >= Math.round(snY) - 1 && y <= Math.round(snY) + 1) || (x === Math.round(snX1) - 1 && y === Math.round(snY) - 2))) return '#f6efdc';
    if (S.fang) { const fx = Math.round(hx + S.hr * 0.6); if ((x === fx || (S.fang > 6 && x === fx + 1)) && y > snY && y <= snY + S.fang) return y === Math.round(snY + S.fang) ? '#d8d0c0' : '#f8f2e2'; }
    // Bek: bovenkaak blijft, onderkaak zakt als de bek open is
    const jawGap = mouth ? Math.max(2, Math.round(S.snH * 0.7)) : 0;
    const inSnout = (yy) => x >= snX0 && x <= snX1 && Math.abs(yy - snY) <= S.snH / 2 - (x > snX1 - 2 ? 0.5 : 0);
    if (mouth) {
      const midY = Math.round(snY);
      if (x >= snX0 + 1 && x <= snX1 - 1 && y > midY && y <= midY + jawGap) return (y === midY + 1 || y === midY + jawGap) && x % 2 === 0 ? '#f4ecd6' : '#5a1210';
      if (inSnout(y - jawGap) && y > midY + jawGap) return y > midY + jawGap + 1 ? tone[2] : tone[1];
      if (inSnout(y) && y <= midY) return y < snY - S.snH / 2 + 1 ? tone[0] : tone[1];
    } else if (inSnout(y)) return y > snY + S.snH / 4 ? (S.belly && !S.pat ? S.belly : tone[2]) : y < snY - S.snH / 4 ? tone[0] : tone[1];
    // Oren
    const earX = Math.round(hx - S.hr * 0.3), earY = Math.round(hy - S.hr);
    if (S.ear === 'point') { const h = Math.max(2, Math.round(S.hr * 0.6)); if (y < earY + 1 && y >= earY - h && Math.abs(x - earX + (earY - y) * 0.3) <= (y - (earY - h)) * 0.5) return y < earY - h + 2 ? tone[2] : tone[1]; }
    if (S.ear === 'cat') { for (const ex of [earX - 1, earX + 2]) if (y >= earY - 2 && y <= earY && Math.abs(x - ex) <= (y - (earY - 2)) * 0.6) return tone[2]; }
    if (S.ear === 'round' && inEll(x, y, earX, earY, 1.6, 1.4)) return tone[2];
    if (S.ear === 'side' && y === earY + 1 && x >= earX - 3 && x <= earX - 1) return tone[2];
    // Schedel
    if (inEll(x, y, hx, hy, S.hr, S.hr * 0.9)) { const t = (y - (hy - S.hr)) / (S.hr * 1.8) + (x < hx - S.hr * 0.4 ? 0.15 : 0); return ramp(t, x, y, tone); }
    // Leeuwenmanen achter de kop
    if (S.lmane && inEll(x, y, hx - S.hr * 0.4, hy + S.hr * 0.2, S.hr * 1.6, S.hr * 1.5)) { const n = hash(Math.floor(x / 2), Math.floor(y / 2)); return n > 0.7 ? darken(S.mcol, 0.25) : n < 0.25 ? '#8a5428' : S.mcol; }
    // --- Voorste poten ---
    for (const l of legs) if (!l.far) { const c = legAt(l, x, y); if (c) return c; }
    // --- Lijf ---
    let inBody = false, top = 0, bot = 0;
    const t0 = Math.max(0, Math.min(1, (x - hipX) / (shX - hipX)));
    top = hipT + (shT - hipT) * t0; bot = hipB + (shB - hipB) * t0;
    if (x >= hipX && x <= shX) inBody = y >= top && y <= bot;
    else if (x < hipX) inBody = inEll(x, y, hipX, (hipT + hipB) / 2, S.bh * 0.5, S.bh / 2);
    else { const cy = (shT + shB) / 2, ry = (shB - shT) / 2; inBody = inEll(x, y, shX, cy, S.bh * 0.55, ry); top = shT; bot = shB; }
    if (inBody) {
      const t = (y - top) / Math.max(1, bot - top);
      if (S.belly && t > 0.72) return dither(x, y) && t < 0.8 ? tone[1] : S.belly;
      if (S.scars && x > shX - 6 && x < shX - 1 && Math.abs((y - top) - (x - (shX - 6))) < 1 && t < 0.6) return '#e0c090';
      if (S.pat === 'spots' && hash(Math.floor(x / 2), Math.floor(y / 2)) > 0.78 && t > 0.12 && t < 0.85) return S.spot;
      if (S.pat === 'rosette') { const cx = Math.floor(x / 4) * 4 + 2 + (Math.floor(y / 4) % 2) * 2, cy = Math.floor(y / 4) * 4 + 2; const d = Math.abs(x - cx) + Math.abs(y - cy); if (d === 2 && hash(cx, cy) > 0.25) return S.spot; }
      if (S.pat === 'stripes' && x % 3 === 0 && t < 0.8 && t > 0.1) return S.spot;
      if (S.pat === 'bristle' && (x * 5 + y * 3) % 7 === 0 && t < 0.6) return tone[2];
      if (S.pat === 'wrinkle' && x % 6 === 0 && t > 0.2 && t < 0.9) return tone[2];
      return ramp(t + (x < hipX ? 0.1 : 0), x, y, tone);
    }
    // Manen langs nek en rug (stekelig)
    if (S.mane) {
      const mx0 = shX - S.L * 0.55, mx1 = shX + S.bh * 0.35;
      if (x >= mx0 && x <= mx1) { const tt = hipT + (shT - hipT) * Math.max(0, Math.min(1, (x - hipX) / (shX - hipX))); const h = 1 + ((x * 3) % 4 === 0 ? 2 : (x % 2)) + (S.bh > 15 ? 2 : 0); if (y < tt && y >= tt - h) return S.mcol; }
    }
    // --- Achterste poten ---
    for (const l of legs) if (l.far) { const c = legAt(l, x, y); if (c) return c; }
    // --- Staart ---
    const tx = hipX - S.bh * 0.45, ty = hipT + 2;
    if (S.tail === 'brush' || S.tail === 'bushy') { const len = tailLen, dx = tx - x; if (dx >= 0 && dx <= len) { const cy = ty + dx * (S.tail === 'bushy' ? 0.7 : 0.55), w = 1 + Math.min(dx, len - dx) * 0.4; if (Math.abs(y - cy) <= w) return dx > len - 2 ? (S.tail === 'bushy' ? '#f0ece4' : S.mcol || tone[2]) : tone[S.tail === 'bushy' ? 1 : 2]; } }
    if (S.tail === 'long') { const dx = tx - x; if (dx >= 0 && dx <= tailLen) { const cy = ty + 2 + dx * 0.5 - Math.max(0, dx - tailLen * 0.6) * 1.6; if (Math.abs(y - cy) <= 0.8) return dx > tailLen - 2 ? INK : tone[1]; } }
    if (S.tail === 'tuft') { const dx = tx - x; if (dx >= 0 && dx <= 3 && Math.abs(y - (ty + dx * 1.5)) <= 0.6) return tone[1]; if (dx >= 3 && dx <= 5 && y >= ty + 5 && y <= ty + 9) return S.mcol || INK; }
    if (S.tail === 'whip') { const up = pose === 'run' ? 1 : 0; if (x === Math.round(tx) && (up ? (y <= ty && y >= ty - 5) : (y >= ty && y <= ty + 3))) return INK; if (up && Math.abs(x - tx) <= 1 && y === ty - 6) return INK; }
    if (S.tail === 'stub' && x >= tx - 2 && x <= tx && y >= ty && y <= ty + 1) return tone[2];
    return null;
  };
  return { fn, W, H, anchorX: Math.round((hipX + shX) / 2), headX: Math.round(hx), headY: Math.round(hy) };
}

// Sprite bakken: kleuren per pixel + automatische 1px omlijning
function bake(spec) {
  const { fn, W, H } = spec;
  const cv = document.createElement('canvas'); cv.width = W + 2; cv.height = H + 2;
  const c = cv.getContext('2d'), grid = [];
  for (let y = 0; y < H; y++) { grid[y] = []; for (let x = 0; x < W; x++) grid[y][x] = fn(x, y); }
  const at = (x, y) => (x >= 0 && y >= 0 && x < W && y < H) ? grid[y][x] : null;
  for (let y = -1; y <= H; y++) for (let x = -1; x <= W; x++) {
    const v = at(x, y);
    if (v) { c.fillStyle = v; c.fillRect(x + 1, y + 1, 1, 1); }
    else if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1)) { c.fillStyle = INK; c.fillRect(x + 1, y + 1, 1, 1); }
  }
  return { cv, anchorX: spec.anchorX + 1, H: H + 2, headX: spec.headX + 1, headY: spec.headY + 1 };
}

const cache = new Map();
export function animalSprite(kind, pose, frame, mouth, eye) {
  const key = kind + pose + frame + mouth + eye;
  let s = cache.get(key);
  if (!s) { s = bake(build(SPECS[kind], pose, frame, mouth, eye)); cache.set(key, s); }
  return s;
}

// Welke soort, houding, loopbeeld en gezichtsuitdrukking hoort bij de toestand van een dier in het spel
export function animalLook(e) {
  const n = e.constructor.name, st = e.state, t = e.t || 0;
  const walkF = (spd) => Math.floor(t * spd) % 4;
  switch (n) {
    case 'Hyena': return { kind: 'hyena', pose: e.fleeing ? 'run' : 'walk', frame: walkF(e.fleeing ? 14 : e.speed / 7), mouth: e.fleeing ? 1 : 0 };
    case 'Wolf': return { kind: 'wolf', pose: e.fleeing ? 'run' : 'walk', frame: walkF(e.fleeing ? 14 : e.speed / 6), mouth: e.fleeing ? 1 : 0 };
    case 'Warthog': case 'Rhino': {
      const kind = n === 'Rhino' ? 'rhino' : 'warthog';
      if (st === 'charge') return { kind, pose: 'run', frame: walkF(12), mouth: 0, eye: 'angry' };
      if (st === 'scrape') return { kind, pose: 'crouch', frame: walkF(10) % 2 ? 1 : 3, mouth: 0, eye: 'angry' };
      if (st === 'dazed') return { kind, pose: 'idle', frame: 0, mouth: 1, eye: 'closed', stars: true };
      return { kind, pose: e.fleeing ? 'run' : 'walk', frame: walkF(e.fleeing ? 14 : 5) };
    }
    case 'Leopard': case 'Sabre': {
      const kind = n === 'Sabre' ? 'sabre' : 'leopard';
      if (st === 'hide') return { kind, pose: 'crouch', frame: 0 };
      if (st === 'crouch') return { kind, pose: 'crouch', frame: 0, mouth: 1, eye: 'angry' };
      if (st === 'pounce') return { kind, pose: 'jump', frame: 0, mouth: 1, eye: 'angry' };
      if (st === 'recover') return { kind, pose: 'idle', frame: 0, eye: 'closed', stars: true };
      return { kind, pose: 'run', frame: walkF(14) };
    }
    case 'Gnu': return { kind: e.skin === 'horse' ? 'horse' : 'gnu', pose: 'run', frame: walkF(14) };
    case 'CaveBear': {
      if (st === 'rear') return { kind: 'bear', pose: 'idle', frame: 0, mouth: 1, eye: 'angry', rear: true };
      if (st === 'slam') return { kind: 'bear', pose: 'crouch', frame: 0, mouth: 1, eye: 'angry' };
      if (st === 'recover') return { kind: 'bear', pose: 'idle', frame: 0, eye: 'closed' };
      return { kind: 'bear', pose: e.fleeing ? 'run' : 'walk', frame: walkF(e.fleeing ? 12 : 4) };
    }
    case 'GiantHyena': case 'Lion': case 'Scimitar': {
      const kind = n === 'GiantHyena' ? 'ghyena' : n === 'Lion' ? 'lion' : 'homoth';
      const growl = st === 'growl' || st === 'aim' || st === 'roar';
      if (st === 'charge' || st === 'flee') return { kind, pose: 'run', frame: walkF(10), mouth: 1, eye: 'angry' };
      if (st === 'leap') return { kind, pose: 'jump', frame: 0, mouth: 1, eye: 'angry' };
      if (st === 'dazed') return { kind, pose: 'idle', frame: 0, mouth: 1, eye: 'closed', stars: true };
      if (growl) return { kind, pose: 'crouch', frame: 0, mouth: 1, eye: 'angry' };
      return { kind, pose: e.vx ? 'walk' : 'idle', frame: walkF(5), mouth: kind === 'ghyena' ? 1 : 0, eye: kind === 'ghyena' ? 'angry' : 'open' };
    }
  }
  return null;
}

// Pixelversie: teken het dier op pixelcoördinaten (PS = pixels per wereldeenheid)
export function drawAnimal(c, e, PS, time) {
  const L = animalLook(e);
  if (!L) return false;
  if (e.isBoss && e.invuln > 0 && Math.floor(time * 14) % 2 === 0) return true;
  const s = animalSprite(L.kind, L.pose, L.frame, L.mouth || 0, L.eye || 'open');
  const bx = Math.round(e.cx * PS), by = Math.round((e.y + e.h) * PS);
  c.save();
  c.globalAlpha = e.alpha ? e.alpha() : 1;
  // Zachte schaduw op de grond
  if (!e.fleeing) { c.fillStyle = '#00000033'; const w = Math.round(s.cv.width * 0.35); c.fillRect(bx - w, by - 1, w * 2, 2); }
  c.translate(bx, by);
  const dir = e.dir || 1;
  c.scale(dir, e.squash ? e.squash() : 1);
  if (L.rear) { c.translate(-s.anchorX * 0.4, 0); c.rotate(-0.85); }
  c.drawImage(s.cv, -s.anchorX, -s.H + 1);
  c.restore();
  if (L.stars) {
    const hx = bx + dir * (s.headX - s.anchorX), hy = by - s.H + s.headY - 6;
    for (let i = 0; i < 3; i++) { const a = time * 5 + i * 2.1, x = Math.round(hx + Math.cos(a) * 7), y = Math.round(hy + Math.sin(a) * 2); c.fillStyle = '#ffe27a'; c.fillRect(x, y - 1, 1, 3); c.fillRect(x - 1, y, 3, 1); }
  }
  if (e.isBoss && e.state === 'dazed') { const x = bx, y = by - s.H - 10 + Math.round(Math.sin(time * 8) * 2); c.fillStyle = '#ffe27a'; for (let k = 0; k < 4; k++) c.fillRect(x - 3 + k, y + k, 7 - k * 2, 1); }
  return true;
}
