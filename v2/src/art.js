// Gedeelde tekenhulp in "Rayman-stijl": ronde vormen, zacht licht van boven, taps toelopende ledematen.

// Mengt twee #rrggbb-kleuren; t = 0 geeft a, t = 1 geeft b.
export function mix(a, b, t) {
  const p = s => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
  const A = p(a), B = p(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

// Taps toelopend segment (dij, scheen, arm) als afgeronde vorm.
export function taper(c, x1, y1, x2, y2, w1, w2) {
  const a = Math.atan2(y2 - y1, x2 - x1), nx = -Math.sin(a), ny = Math.cos(a);
  c.beginPath();
  c.moveTo(x1 + nx * w1 / 2, y1 + ny * w1 / 2);
  c.lineTo(x2 + nx * w2 / 2, y2 + ny * w2 / 2);
  c.arc(x2, y2, w2 / 2, a + Math.PI / 2, a - Math.PI / 2, true);
  c.lineTo(x1 - nx * w1 / 2, y1 - ny * w1 / 2);
  c.arc(x1, y1, w1 / 2, a - Math.PI / 2, a + Math.PI / 2, true);
  c.closePath();
}

// Oog met wit, iris, pupil en glimlichtje. look: 1 = open, 0 = dicht.
export function eye(c, x, y, r, iris, open = 1, angry = false) {
  if (open < 0.15) { c.strokeStyle = '#2a1a12'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x - r, y); c.quadraticCurveTo(x, y + r * 0.5, x + r, y); c.stroke(); return; }
  c.fillStyle = '#fffaf0'; c.beginPath(); c.ellipse(x, y, r, r * open, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = iris; c.beginPath(); c.arc(x + r * 0.25, y, r * 0.62, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#120c08'; c.beginPath(); c.arc(x + r * 0.32, y, r * 0.34, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#ffffff'; c.beginPath(); c.arc(x + r * 0.05, y - r * 0.3, r * 0.22, 0, Math.PI * 2); c.fill();
  if (angry) { c.fillStyle = '#2a1a12'; c.beginPath(); c.moveTo(x - r * 1.2, y - r * 1.1); c.lineTo(x + r * 1.3, y - r * 0.2); c.lineTo(x + r * 1.3, y - r * 1.3); c.closePath(); c.fill(); }
}

// Zachte schaduw op de grond
export function groundShadow(c, x, y, w, alpha = 0.28) {
  const g = c.createRadialGradient(x, y, 1, x, y, w);
  g.addColorStop(0, `rgba(30,20,10,${alpha})`); g.addColorStop(1, 'rgba(30,20,10,0)');
  c.fillStyle = g; c.beginPath(); c.ellipse(x, y, w, w * 0.22, 0, 0, Math.PI * 2); c.fill();
}

// ------------------------------------------------------------------
// Viervoeters. Oorsprong = tussen de voeten op de grond, kijkrichting +x.
// o: { L, H, bodyH, slope, base, light, dark, belly, pattern, head, tail, mane, eye,
//      phase, stride, crouch, mouth, headDown, blink, angry, ears, scale }
// ------------------------------------------------------------------
export function quad(c, o, time) {
  const L = o.L, H = o.H, bh = o.bodyH, crouch = o.crouch || 0;
  const breathe = Math.sin(time * 3 + (o.seed || 0)) * 0.6 * (o.stride > 0.2 ? 0 : 1);
  const lift = Math.abs(Math.sin(o.phase)) * (o.stride || 0) * 2.2;
  const by = -(H * (1 - crouch * 0.45) + bh / 2) - lift + breathe * 0.3;
  const shX = L / 2, hipX = -L / 2, shY = by - (o.slope || 0) / 2, hipY = by + (o.slope || 0) / 2;
  const dark = o.dark, base = o.base, light = o.light;
  const leg = (x, y, ph, front, far) => {
    const sw = Math.sin(ph) * (o.stride || 0) * 0.75;
    const up = Math.max(0, Math.cos(ph)) * (o.stride || 0) * 0.9;
    const thigh = H * 0.58, shin = H * 0.62 + bh * 0.25;
    const a1 = sw + (front ? -0.05 : 0.18) - crouch * (front ? 0.5 : -0.5);
    const kx = x + Math.sin(a1) * thigh, ky = y + bh * 0.25 + Math.cos(a1) * thigh;
    const a2 = a1 + (front ? up * 0.9 + 0.05 : -(up * 0.9) - 0.35 - crouch * 0.6);
    let fx = kx + Math.sin(a2) * shin, fy = ky + Math.cos(a2) * shin;
    if (fy > 0) fy = 0;
    const col = far ? mix(base, dark, 0.45) : base;
    c.fillStyle = far ? mix(dark, '#000000', 0.2) : dark;
    taper(c, x, y + bh * 0.1, kx, ky, bh * 0.62 + 1.6, bh * 0.32 + 1.6); c.fill();
    taper(c, kx, ky, fx, fy, bh * 0.32 + 1.6, bh * 0.22 + 1.4); c.fill();
    c.fillStyle = col;
    taper(c, x, y + bh * 0.1, kx, ky, bh * 0.62, bh * 0.32); c.fill();
    taper(c, kx, ky, fx, fy, bh * 0.32, bh * 0.22); c.fill();
    c.fillStyle = far ? mix(dark, '#000000', 0.3) : dark;
    c.beginPath(); c.ellipse(fx + (front ? 1.5 : 1), fy - 1, bh * 0.24 + 1, 1.8, 0, 0, Math.PI * 2); c.fill();
  };
  const ph = o.phase;
  // Achterste poten (verder weg)
  leg(hipX + 2, hipY, ph + Math.PI, false, true);
  leg(shX - 3, shY, ph, true, true);
  // Staart
  drawTail(c, o, hipX, hipY, time);
  // Romp: rond lijf met borst en buik
  c.save();
  const bodyPath = () => {
    c.beginPath();
    c.moveTo(hipX - bh * 0.35, hipY - bh * 0.1);
    c.bezierCurveTo(hipX - bh * 0.3, hipY - bh * 0.75, hipX + L * 0.25, (hipY + shY) / 2 - bh * 0.72, shX - bh * 0.1, shY - bh * 0.62);
    c.bezierCurveTo(shX + bh * 0.55, shY - bh * 0.5, shX + bh * 0.7, shY + bh * 0.4, shX + bh * 0.15, shY + bh * 0.55);
    c.bezierCurveTo(shX - L * 0.25, by + bh * 0.85, hipX + L * 0.2, by + bh * 0.75, hipX - bh * 0.1, hipY + bh * 0.5);
    c.quadraticCurveTo(hipX - bh * 0.55, hipY + bh * 0.25, hipX - bh * 0.35, hipY - bh * 0.1);
    c.closePath();
  };
  bodyPath(); c.fillStyle = dark; c.lineWidth = 3; c.strokeStyle = dark; c.stroke();
  const g = c.createLinearGradient(0, by - bh, 0, by + bh * 0.8);
  g.addColorStop(0, light); g.addColorStop(0.45, base); g.addColorStop(1, mix(base, dark, 0.45));
  bodyPath(); c.fillStyle = g; c.fill();
  c.clip();
  if (o.belly) { c.fillStyle = o.belly; c.beginPath(); c.ellipse(0, by + bh * 0.62, L * 0.55, bh * 0.38, 0, 0, Math.PI * 2); c.fill(); }
  drawPattern(c, o, by, L, bh);
  c.restore();
  // Rand van licht langs de rug
  c.strokeStyle = mix(light, '#ffffff', 0.4); c.globalAlpha = 0.55; c.lineWidth = 1.4;
  c.beginPath(); c.moveTo(hipX, hipY - bh * 0.55); c.bezierCurveTo(hipX + L * 0.25, (hipY + shY) / 2 - bh * 0.7, shX - L * 0.1, shY - bh * 0.62, shX + bh * 0.1, shY - bh * 0.5); c.stroke();
  c.globalAlpha = 1;
  // Manen langs nek en rug
  if (o.mane && o.head !== 'lion') {
    c.fillStyle = o.mane;
    c.beginPath(); c.moveTo(shX - L * 0.45, shY - bh * 0.55);
    for (let i = 0; i <= 7; i++) { const t = i / 7, x = shX - L * 0.45 + t * (L * 0.5 + bh * 0.3), y = shY - bh * 0.6 - t * bh * 0.2; c.lineTo(x, y - 3 - (i % 2) * 3 - Math.sin(time * 6 + i) * 0.6); c.lineTo(x + 2, y + 1); }
    c.lineTo(shX + bh * 0.3, shY - bh * 0.3); c.closePath(); c.fill();
  }
  // Voorste poten
  leg(hipX + 4, hipY, ph, false, false);
  leg(shX - 1, shY, ph + Math.PI, true, false);
  // Kop
  const hd = (o.headDown || 0) + crouch * 0.6;
  const hx = shX + bh * 0.45 + (o.neck || 6), hy = shY - bh * 0.55 + hd * bh * 0.9 + Math.sin(o.phase * 2) * (o.stride || 0) * 1.2;
  drawHead(c, o, hx, hy, time);
}

function drawPattern(c, o, by, L, bh) {
  const p = o.pattern, s = o.seed || 1;
  if (!p) return;
  c.fillStyle = o.spot || '#3a2a18';
  if (p === 'spots' || p === 'rosettes') {
    for (let i = 0; i < 16; i++) {
      const x = -L * 0.6 + ((i * 37 + s * 13) % 100) / 100 * L * 1.25, y = by - bh * 0.45 + ((i * 53 + s * 7) % 100) / 100 * bh * 0.85, r = 1.4 + ((i * 17) % 10) / 10 * 1.6;
      if (p === 'rosettes') { for (let k = 0; k < 4; k++) { const a = k * 1.6 + i; c.beginPath(); c.arc(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.8, 0.85, 0, Math.PI * 2); c.fill(); } }
      else { c.beginPath(); c.ellipse(x, y, r, r * 0.8, 0, 0, Math.PI * 2); c.fill(); }
    }
  } else if (p === 'stripes') {
    c.globalAlpha = 0.6; c.lineWidth = 1.6; c.strokeStyle = o.spot;
    for (let i = -L * 0.5; i < L * 0.6; i += 5) { c.beginPath(); c.moveTo(i, by - bh * 0.8); c.quadraticCurveTo(i + 2, by, i - 1, by + bh * 0.5); c.stroke(); }
    c.globalAlpha = 1;
  } else if (p === 'bristle') {
    c.globalAlpha = 0.35; c.lineWidth = 1; c.strokeStyle = o.spot;
    for (let i = -L * 0.6; i < L * 0.6; i += 3) { c.beginPath(); c.moveTo(i, by - bh * 0.6); c.lineTo(i + 1.5, by - bh * 0.2); c.stroke(); }
    c.globalAlpha = 1;
  }
}

function drawTail(c, o, x, y, time) {
  const sway = Math.sin(time * (o.stride > 0.3 ? 9 : 3) + (o.seed || 0)) * 0.25;
  c.save(); c.translate(x - o.bodyH * 0.25, y - o.bodyH * 0.45); c.rotate(sway);
  const col = o.tailColor || o.base;
  if (o.tail === 'long' || o.tail === 'tuft') {
    c.strokeStyle = o.dark; c.lineWidth = o.bodyH * 0.3 + 2; c.lineCap = 'round';
    c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(-10, -2, -18, 6, -22, 14); c.stroke();
    c.strokeStyle = col; c.lineWidth = o.bodyH * 0.3;
    c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(-10, -2, -18, 6, -22, 14); c.stroke();
    if (o.tail === 'tuft') { c.fillStyle = o.tuft || o.dark; c.beginPath(); c.ellipse(-23, 16, 3.5, 5, 0.3, 0, Math.PI * 2); c.fill(); }
  } else if (o.tail === 'brush') {
    // Ruige staart: dik bij de aanzet, hangt naar achteren en omlaag
    const brush = () => { c.beginPath(); c.moveTo(0, -2); c.bezierCurveTo(-8, -6, -16, -2, -19, 8); c.bezierCurveTo(-20, 14, -14, 15, -12, 10); c.bezierCurveTo(-10, 4, -5, 3, 0, 3); c.closePath(); };
    brush(); c.lineWidth = 2.4; c.strokeStyle = o.dark; c.stroke(); brush(); c.fillStyle = col; c.fill();
    c.fillStyle = o.dark; c.globalAlpha = 0.5; c.beginPath(); c.ellipse(-16, 11, 3.5, 4, 0.4, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1;
  } else if (o.tail === 'whip') {
    c.strokeStyle = o.dark; c.lineWidth = 2; c.lineCap = 'round';
    c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-8, -10 - (o.stride > 0.3 ? 6 : 0), -6, -18 - (o.stride > 0.3 ? 4 : 0)); c.stroke();
    c.fillStyle = o.dark; c.beginPath(); c.ellipse(-6, -19, 2, 3.5, 0, 0, Math.PI * 2); c.fill();
  } else {
    c.strokeStyle = o.dark; c.lineWidth = 5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-7, 2, -9, 9); c.stroke();
    c.strokeStyle = col; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-7, 2, -9, 9); c.stroke();
  }
  c.restore();
}

function drawHead(c, o, x, y, time) {
  const s = o.headSize || 1, dark = o.dark, base = o.base, light = o.light;
  const blink = (Math.sin(time * 0.9 + (o.seed || 0) * 3) > 0.985) ? 0 : 1;
  const open = o.eyeOpen ?? blink;
  c.save(); c.translate(x, y); c.scale(s, s);
  const fillShape = (fn, col) => { fn(); c.lineWidth = 2.6; c.strokeStyle = dark; c.stroke(); fn(); c.fillStyle = col; c.fill(); };
  const grad = (y0, y1) => { const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, light); g.addColorStop(0.6, base); g.addColorStop(1, mix(base, dark, 0.35)); return g; };
  const mouth = o.mouth || 0;
  if (o.head === 'lion' && o.mane) {
    // Volle manen rond de kop
    // Volle, wollige manen: overlappende plukken
    const tuft = (col, R, r, off) => { c.fillStyle = col; for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2 + off, w = Math.sin(time * 3 + i) * 0.6; c.beginPath(); c.arc(-4 + Math.cos(a) * R + w, 1 + Math.sin(a) * R * 1.1, r, 0, Math.PI * 2); c.fill(); } };
    tuft(o.dark, 13.5, 7.5, 0); tuft(mix(o.mane, '#000000', 0.2), 12.5, 6.5, 0.2); tuft(o.mane, 10.5, 6, 0.1);
    c.fillStyle = mix(o.mane, '#ffd090', 0.25); c.beginPath(); c.arc(-6, -6, 4, 0, Math.PI * 2); c.fill();
  }
  // Oren
  const ear = (ex, ey, rot, w, h) => { c.save(); c.translate(ex, ey); c.rotate(rot); c.fillStyle = dark; c.beginPath(); c.ellipse(0, 0, w + 1.2, h + 1.2, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = base; c.beginPath(); c.ellipse(0, 0, w, h, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = o.earIn || mix(base, '#e8a090', 0.4); c.beginPath(); c.ellipse(0.5, 1, w * 0.5, h * 0.55, 0, 0, Math.PI * 2); c.fill(); c.restore(); };
  const H = o.head;
  if (H === 'hyena') { ear(-5, -10, -0.35, 4.2, 5.5); ear(1, -11, 0.15, 4.2, 5.5); }
  else if (H === 'dog') { ear(-4, -11, -0.15, 2.6, 6.5); ear(1, -12, 0.2, 2.6, 6.5); }
  else if (H === 'cat' || H === 'lion') { ear(-6, -9, -0.4, 3.2, 3.6); ear(1, -10.5, 0.2, 3.2, 3.6); }
  else if (H === 'pig') { ear(-4, -9, -0.6, 3, 5); }
  else if (H === 'gnu') { ear(-5, -6, -1.1, 2, 4.5); }
  // Schedel + snuit
  if (H === 'hyena' || H === 'dog') {
    const sn = H === 'dog' ? 15 : 12;
    fillShape(() => { c.beginPath(); c.moveTo(-9, 4); c.bezierCurveTo(-11, -8, -1, -11, 5, -8); c.bezierCurveTo(10, -6, sn, -3, sn + 2, 1); c.bezierCurveTo(sn + 3, 4, sn - 1, 6 + mouth * 3, 5, 7); c.bezierCurveTo(-1, 9, -7, 8, -9, 4); c.closePath(); }, grad(-10, 8));
    c.fillStyle = o.muzzle || mix(base, dark, 0.55); c.beginPath(); c.ellipse(sn - 2, 1, 5.5, 3.6, 0.1, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#1a120c'; c.beginPath(); c.ellipse(sn + 1.6, -0.6, 2.4, 1.8, 0, 0, Math.PI * 2); c.fill();
    if (mouth > 0.1) { c.fillStyle = '#5a1f18'; c.beginPath(); c.moveTo(3, 6); c.quadraticCurveTo(sn - 2, 7 + mouth * 6, sn + 1, 4); c.lineTo(sn - 2, 5); c.closePath(); c.fill(); c.fillStyle = '#f6f0e0'; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(6 + i * 3, 5.5); c.lineTo(7 + i * 3, 8 + mouth * 2); c.lineTo(8 + i * 3, 5.5); c.fill(); } }
    eye(c, 1, -3, 2.6, o.eye || '#d8a83a', open, o.angry);
  } else if (H === 'cat' || H === 'lion') {
    fillShape(() => { c.beginPath(); c.ellipse(0, -1, 9, 8, 0, 0, Math.PI * 2); }, grad(-9, 8));
    fillShape(() => { c.beginPath(); c.ellipse(7, 3, 5.5, 4.6, 0, 0, Math.PI * 2); }, o.muzzle || mix(base, '#fff2d8', 0.45));
    c.fillStyle = '#3a2016'; c.beginPath(); c.moveTo(9.5, 0.5); c.lineTo(12.5, 0.5); c.lineTo(11, 2.6); c.closePath(); c.fill();
    if (o.fangs) { c.fillStyle = '#f8f2e2'; c.beginPath(); c.moveTo(6.5, 6); c.lineTo(8, 16); c.lineTo(9.5, 6); c.closePath(); c.fill(); c.strokeStyle = dark; c.lineWidth = 0.8; c.stroke(); }
    if (mouth > 0.1) { c.fillStyle = '#5a1f18'; c.beginPath(); c.ellipse(8, 7, 4, 1.5 + mouth * 3, 0, 0, Math.PI * 2); c.fill(); }
    eye(c, 2.5, -3, 2.4, o.eye || '#d8c040', open, o.angry);
  } else if (H === 'pig') {
    fillShape(() => { c.beginPath(); c.moveTo(-9, -6); c.bezierCurveTo(-2, -12, 8, -8, 13, -2); c.bezierCurveTo(16, 2, 15, 7, 11, 8); c.bezierCurveTo(4, 10, -6, 8, -9, 3); c.closePath(); }, grad(-10, 9));
    fillShape(() => { c.beginPath(); c.ellipse(14, 3, 3.5, 4.2, 0, 0, Math.PI * 2); }, mix(base, '#e0b0a0', 0.4));
    c.fillStyle = '#2a1a14'; c.beginPath(); c.arc(14.5, 2, 0.9, 0, Math.PI * 2); c.arc(14.5, 4.5, 0.9, 0, Math.PI * 2); c.fill();
    c.fillStyle = mix(base, dark, 0.4); c.beginPath(); c.arc(4, 3, 2.4, 0, Math.PI * 2); c.arc(8, -1, 1.8, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#f6efdc'; c.lineWidth = 2.4; c.lineCap = 'round'; c.beginPath(); c.moveTo(10, 6); c.quadraticCurveTo(14, 3, 12, -3); c.stroke();
    eye(c, 1, -3, 2.1, o.eye || '#3a2010', open, o.angry);
  } else if (H === 'gnu') {
    fillShape(() => { c.beginPath(); c.moveTo(-6, -6); c.bezierCurveTo(0, -10, 6, -6, 14, 6); c.bezierCurveTo(16, 10, 12, 13, 8, 11); c.bezierCurveTo(2, 8, -6, 4, -6, -6); c.closePath(); }, grad(-9, 12));
    c.strokeStyle = '#e8e0cc'; c.lineWidth = 2.2; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-3, -6); c.quadraticCurveTo(-9, -10, -6, -15); c.moveTo(1, -7); c.quadraticCurveTo(6, -12, 3, -16); c.stroke();
    c.fillStyle = '#1e1c20'; c.beginPath(); c.ellipse(12, 9, 3.5, 3, 0.4, 0, Math.PI * 2); c.fill();
    eye(c, 2, -3, 1.8, '#3a2a20', open);
  }
  c.restore();
}

// ------------------------------------------------------------------
// Bladeren: een tros losse bladeren die elk apart in de wind bewegen.
// opts: { n, size, colors: [donker, midden, licht], time, seed, sway, flat, push }
// push: verschuiving door iets dat erlangs gaat (bijv. de speler)
// ------------------------------------------------------------------
// Windstoot: alle bladeren buigen mee (gezet door het spel)
export const WIND = { push: 0 };
const rnd = (a, b = 0) => { const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return n - Math.floor(n); };

export function leafCluster(c, cx, cy, rx, ry, o) {
  const n = o.n || 14, size = o.size || 8, cols = o.colors, t = o.time || 0, sd = o.seed || 0, sway = o.sway ?? 0.18;
  const wind = Math.sin(t * 1.1 + sd) * 0.6 + Math.sin(t * 2.3 + sd * 2) * 0.4;
  // Per kleurband één pad: donker (onder) eerst, licht (boven) laatst. Scheelt veel tekenwerk.
  for (let band = 0; band < 3; band++) {
    c.beginPath();
    for (let i = 0; i < n; i++) {
      const a = rnd(i, sd) * Math.PI * 2, d = Math.sqrt(rnd(i + 7, sd));
      const x = cx + Math.cos(a) * rx * d, y = cy + Math.sin(a) * ry * d;
      const depth = (y - (cy - ry)) / (2 * ry), b = depth > 0.62 ? 0 : depth > 0.3 ? 1 : 2;
      if (b !== band) continue;
      const rot = (o.flat ? 0 : (rnd(i + 3, sd) - 0.5) * 2.2) + Math.sin(t * (1.6 + rnd(i, 9) * 1.4) + i * 0.9 + sd) * sway + wind * sway * 0.8 + (o.push || 0) + WIND.push * (0.6 + rnd(i, 4) * 0.5);
      const s = size * (0.7 + rnd(i + 5, sd) * 0.6), cs = Math.cos(rot), sn = Math.sin(rot);
      // Bladvorm (spoel) in lokale coördinaten, gedraaid zonder save/restore
      const P = (lx, ly) => [x + lx * cs - ly * sn, y + lx * sn + ly * cs];
      const p0 = P(-s, 0), c1 = P(-s * 0.2, -s * 0.55), p1 = P(s, 0), c2 = P(-s * 0.2, s * 0.55);
      c.moveTo(p0[0], p0[1]); c.quadraticCurveTo(c1[0], c1[1], p1[0], p1[1]); c.quadraticCurveTo(c2[0], c2[1], p0[0], p0[1]);
    }
    c.fillStyle = band === 0 ? cols[0] : band === 1 ? cols[1] : cols[2];
    c.fill();
  }
}

// Varenblad / palmblad dat aan de voet vastzit en meebuigt
export function frond(c, x, y, len, angle, col, t, seed, push = 0) {
  const bend = Math.sin(t * 1.7 + seed) * 0.12 + push + WIND.push * 0.5;
  c.save(); c.translate(x, y); c.rotate(angle + bend);
  c.strokeStyle = mix(col, '#000000', 0.3); c.lineWidth = 1.6; c.lineCap = 'round';
  c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(len * 0.5, -len * 0.15 + bend * 20, len, len * 0.15); c.stroke();
  c.fillStyle = col;
  for (let k = 1; k < 9; k++) {
    const f = k / 9, px = len * f, py = -len * 0.15 * Math.sin(f * Math.PI) + f * f * len * 0.15 + bend * 20 * f, l = len * 0.24 * (1 - f * 0.6);
    for (const sgn of [-1, 1]) { c.save(); c.translate(px, py); c.rotate(sgn * (1.0 - f * 0.3) + Math.sin(t * 3 + k + seed) * 0.08); c.beginPath(); c.ellipse(l / 2, 0, l / 2, l * 0.16, 0, 0, Math.PI * 2); c.fill(); c.restore(); }
  }
  c.restore();
}
