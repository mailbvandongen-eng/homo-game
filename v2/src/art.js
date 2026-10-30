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
  if (open < 0.15) { c.strokeStyle = 'rgba(30,18,10,0.8)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x - r, y); c.quadraticCurveTo(x, y + r * 0.45, x + r, y); c.stroke(); return; }
  const h = r * 0.72 * open;
  c.save();
  c.beginPath(); c.moveTo(x - r, y); c.quadraticCurveTo(x, y - h * 1.35, x + r, y - h * 0.1); c.quadraticCurveTo(x, y + h * 1.2, x - r, y); c.closePath();
  c.fillStyle = '#efe4cc'; c.fill(); c.clip();
  c.fillStyle = iris; c.beginPath(); c.arc(x + r * 0.22, y, r * 0.72, 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.arc(x + r * 0.22, y + r * 0.1, r * 0.72, Math.PI * 1.05, Math.PI * 1.95, true); c.fill();
  c.fillStyle = '#0c0806'; c.beginPath(); c.arc(x + r * 0.28, y, r * 0.38, 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(x - r, y - h * 1.4, r * 2, h * 0.5);
  c.restore();
  c.fillStyle = 'rgba(255,255,255,0.9)'; c.beginPath(); c.arc(x + r * 0.05, y - r * 0.22, r * 0.16, 0, Math.PI * 2); c.fill();
  c.strokeStyle = 'rgba(30,18,10,0.7)'; c.lineWidth = 0.9; c.beginPath(); c.moveTo(x - r, y); c.quadraticCurveTo(x, y - h * 1.35, x + r, y - h * 0.1); c.stroke();
  if (angry) { c.fillStyle = 'rgba(40,24,14,0.85)'; c.beginPath(); c.moveTo(x - r * 1.2, y - r * 1.0); c.lineTo(x + r * 1.3, y - r * 0.15); c.lineTo(x + r * 1.3, y - r * 1.1); c.closePath(); c.fill(); }
}

// Licht van linksboven (zoals bij de bomen): lichtvlek, kernschaduw en vachtstreepjes binnen het huidige pad
export function paintLight(c, x, y, w, h, light, dark, fur = 0, seed = 1) {
  const g = c.createRadialGradient(x - w * 0.35, y - h * 0.45, 1, x - w * 0.2, y - h * 0.2, Math.max(w, h) * 1.1);
  g.addColorStop(0, light + 'aa'); g.addColorStop(0.45, light + '22'); g.addColorStop(1, light + '00');
  c.fillStyle = g; c.fill();
  const s = c.createLinearGradient(0, y - h * 0.1, 0, y + h * 0.75);
  s.addColorStop(0, dark + '00'); s.addColorStop(1, dark + '88');
  c.fillStyle = s; c.fill();
  if (fur) {
    c.save(); c.clip(); c.lineWidth = 0.8; c.lineCap = 'round';
    for (let i = 0; i < fur; i++) {
      const fx = x - w + ((i * 37 + seed * 11) % 100) / 100 * w * 2, fy = y - h + ((i * 61 + seed * 7) % 100) / 100 * h * 2;
      const up = fy < y;
      c.strokeStyle = up ? light + '66' : dark + '55';
      c.beginPath(); c.moveTo(fx, fy); c.lineTo(fx - 2.6, fy + 1.6); c.stroke();
    }
    c.restore();
  }
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
    c.fillStyle = far ? mix(dark, base, 0.15) : mix(dark, base, 0.35);
    taper(c, x, y + bh * 0.1, kx, ky, bh * 0.62 + 0.9, bh * 0.32 + 0.9); c.fill();
    taper(c, kx, ky, fx, fy, bh * 0.32 + 0.9, bh * 0.22 + 0.8); c.fill();
    const lg = c.createLinearGradient(x - bh * 0.4, 0, x + bh * 0.4, 0);
    lg.addColorStop(0, far ? col : mix(col, light, 0.35)); lg.addColorStop(1, mix(col, dark, far ? 0.3 : 0.2));
    c.fillStyle = lg;
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
  bodyPath(); c.lineWidth = 1.3; c.strokeStyle = mix(dark, base, 0.25); c.stroke();
  const g = c.createLinearGradient(0, by - bh, 0, by + bh * 0.8);
  g.addColorStop(0, light); g.addColorStop(0.45, base); g.addColorStop(1, mix(base, dark, 0.45));
  bodyPath(); c.fillStyle = g; c.fill();
  c.clip();
  if (o.belly) { c.fillStyle = o.belly; c.globalAlpha = 0.7; c.beginPath(); c.ellipse(0, by + bh * 0.62, L * 0.55, bh * 0.38, 0, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1; }
  drawPattern(c, o, by, L, bh);
  bodyPath(); paintLight(c, 0, by, L * 0.7, bh * 0.8, light, mix(dark, '#000000', 0.2), 46, o.seed ? Math.floor(o.seed * 10) : 3);
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
    brush(); c.lineWidth = 1.1; c.strokeStyle = mix(o.dark, col, 0.3); c.stroke(); brush(); c.fillStyle = col; c.fill(); brush(); paintLight(c, -10, 4, 10, 8, o.light, o.dark, 12, 2);
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
  const fillShape = (fn, col) => { fn(); c.lineWidth = 1.1; c.strokeStyle = mix(dark, base, 0.2); c.stroke(); fn(); c.fillStyle = col; c.fill(); fn(); paintLight(c, 0, -2, 10, 8, light, mix(dark, '#000000', 0.2), 10, 5); };
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
  const ear = (ex, ey, rot, w, h) => { c.save(); c.translate(ex, ey); c.rotate(rot); c.fillStyle = mix(dark, base, 0.3); c.beginPath(); c.ellipse(0, 0, w + 0.7, h + 0.7, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = base; c.beginPath(); c.ellipse(0, 0, w, h, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = o.earIn || mix(base, '#e8a090', 0.4); c.beginPath(); c.ellipse(0.5, 1, w * 0.5, h * 0.55, 0, 0, Math.PI * 2); c.fill(); c.restore(); };
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

// ------------------------------------------------------------------
// Schilderachtige bomen: vertakte stam met schors en bladmassa's van
// honderden kleine blaadjes, licht van linksboven. Eén keer voorgetekend
// (gebakken) en daarna per bladmassa licht wiegend getekend.
// ------------------------------------------------------------------
export const TREE_PALETTES = {
  savanna: { bark: ['#3e2a1c', '#6a4a30', '#9a7450'], leaf: ['#22361c', '#34502a', '#4f7236', '#7a9a48', '#b4c870'] },
  forest: { bark: ['#24302a', '#435246', '#748a74'], leaf: ['#12302a', '#1f4a3c', '#33695a', '#5d9474', '#a6d0a0'] },
  java: { bark: ['#2a2a1e', '#4a4a34', '#7a7656'], leaf: ['#123a20', '#1e5a2c', '#2f7a3a', '#5aa04a', '#a6d47a'] },
  dmanisi: { bark: ['#33281e', '#5a4a38', '#8a7a62'], leaf: ['#25391e', '#38562a', '#557a36', '#86a64e', '#c4d68a'] },
};

const R2 = (a, b) => { const n = Math.sin(a * 91.7 + b * 47.3) * 24634.6345; return n - Math.floor(n); };

function hazeCol(col, haze, amt) { return amt > 0 ? mix(col, haze, amt) : col; }

export function bakeTree(spec, k) {
  const { kind, height: H, seed: sd } = spec;
  const pal = TREE_PALETTES[spec.palette] || TREE_PALETTES.savanna, hz = spec.haze || 0, hc = spec.hazeColor || '#c8d8d0';
  const bark = pal.bark.map(c => hazeCol(c, hc, hz)), leaf = pal.leaf.map(c => hazeCol(c, hc, hz));
  // 1. Takken laten groeien
  const segs = [], tips = [];
  const grow = (x, y, ang, len, w, depth, idx) => {
    const bend = (R2(idx, sd) - 0.5) * 0.35;
    const mx = x + Math.sin(ang + bend) * len * 0.5, my = y - Math.cos(ang + bend) * len * 0.5;
    const ex = x + Math.sin(ang) * len, ey = y - Math.cos(ang) * len;
    segs.push([x, y, mx, my, w, w * 0.82, depth]); segs.push([mx, my, ex, ey, w * 0.82, w * 0.65, depth]);
    if (depth === 0) { tips.push([ex, ey, w]); return; }
    const n = kind === 'acacia' ? 3 : 2 + (R2(idx, sd + 1) > 0.6 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const spread = kind === 'acacia' ? 0.75 : kind === 'jungle' ? 0.45 : 0.55;
      const a = ang + (i - (n - 1) / 2) * spread * (0.8 + R2(idx * 3 + i, sd) * 0.5) + (R2(idx + i, sd + 2) - 0.5) * 0.25;
      const l = len * (kind === 'acacia' ? 0.78 : 0.7) * (0.85 + R2(idx * 7 + i, sd) * 0.3);
      grow(ex, ey, kind === 'acacia' ? Math.max(-1.25, Math.min(1.25, a * 1.25)) : a, l, w * 0.62, depth - 1, idx * 4 + i + 1);
    }
  };
  const trunkLen = H * (kind === 'jungle' ? 0.55 : kind === 'acacia' ? 0.42 : 0.4);
  grow(0, 0, (R2(1, sd) - 0.5) * 0.12, trunkLen, H * (kind === 'acacia' ? 0.075 : 0.1), kind === 'acacia' ? 2 : 3, 1);
  // 2. Bladmassa's op de takuiteinden
  const masses = tips.map(([x, y, w], i) => {
    const r = H * (kind === 'acacia' ? 0.2 : kind === 'jungle' ? 0.2 : 0.17) * (0.8 + R2(i, sd + 5) * 0.45);
    return { x, y: y - r * (kind === 'acacia' ? 0.1 : 0.25), r, ry: kind === 'acacia' ? 0.42 : 0.78 };
  });
  // Extra massa's rond de kruin voor een volle vorm (niet bij acacia: die blijft luchtig)
  if (kind !== 'acacia' && masses.length) {
    const cx = masses.reduce((a, m) => a + m.x, 0) / masses.length, cy = Math.min(...masses.map(m => m.y));
    masses.push({ x: cx, y: cy + H * 0.06, r: H * 0.22, ry: 0.7 });
  }
  // Bounding box
  let minX = 0, maxX = 0, minY = 0;
  for (const s of segs) { minX = Math.min(minX, s[0] - s[4], s[2] - s[4]); maxX = Math.max(maxX, s[0] + s[4], s[2] + s[4]); minY = Math.min(minY, s[1], s[3]); }
  // 3. Stam en takken tekenen
  const pad = 12, rootW = H * 0.16;
  minX = Math.min(minX, -rootW); maxX = Math.max(maxX, rootW);
  const tw = Math.ceil((maxX - minX + pad * 2) * k), th = Math.ceil((-minY + pad * 2 + 6) * k);
  const trunk = document.createElement('canvas'); trunk.width = tw; trunk.height = th;
  const c = trunk.getContext('2d'); c.scale(k, k); c.translate(pad - minX, pad - minY);
  // Wortels
  // Wortels: vloeiend uitlopende voet
  const tw0 = segs[0][4];
  for (const [col, off] of [[bark[0], 1.2], [bark[1], 0]]) {
    c.fillStyle = col; c.beginPath();
    c.moveTo(-tw0 / 2 - off, -H * 0.14);
    c.bezierCurveTo(-tw0 / 2 - off, -H * 0.04, -rootW * 0.6, -1, -rootW - off, 3);
    c.lineTo(rootW + off, 3);
    c.bezierCurveTo(rootW * 0.6, -1, tw0 / 2 + off, -H * 0.04, tw0 / 2 + off, -H * 0.14);
    c.closePath(); c.fill();
  }
  // Eerst alle schaduwranden, dan alle vullingen, dan het licht: zo ontstaan geen naden bij de knikken
  for (const [x1, y1, x2, y2, w1, w2] of segs) { c.fillStyle = bark[0]; taper(c, x1 + 1, y1, x2 + 1, y2, w1 + 1.6, w2 + 1.6); c.fill(); }
  for (const [x1, y1, x2, y2, w1, w2] of segs) { c.fillStyle = bark[1]; taper(c, x1, y1, x2, y2, w1, w2); c.fill(); }
  c.globalAlpha = 0.5;
  for (const [x1, y1, x2, y2, w1, w2] of segs) { c.fillStyle = bark[2]; taper(c, x1 - w1 * 0.22, y1, x2 - w2 * 0.22, y2, w1 * 0.32, w2 * 0.28); c.fill(); }
  c.globalAlpha = 1;
  // Schorslijnen op de stam
  c.strokeStyle = bark[0]; c.globalAlpha = 0.5; c.lineWidth = 1;
  for (let i = 0; i < 7; i++) { const yy = -trunkLen * (0.1 + i * 0.12), xx = (R2(i, sd + 9) - 0.5) * H * 0.05; c.beginPath(); c.moveTo(xx - 2, yy); c.quadraticCurveTo(xx + 1, yy - 6, xx + 3, yy - 12); c.stroke(); }
  c.globalAlpha = 1;
  // 4. Bladmassa's los bakken (elk een eigen afbeelding zodat ze apart kunnen wiegen)
  const lx = -0.62, ly = -0.78;   // licht van linksboven
  const bakedMasses = masses.map((m, mi) => {
    const W = m.r * 2.6, Hh = m.r * 2.6 * m.ry + m.r * 0.5;
    const cv = document.createElement('canvas'); cv.width = Math.ceil(W * k); cv.height = Math.ceil(Hh * k);
    const mc = cv.getContext('2d'); mc.scale(k, k); mc.translate(W / 2, Hh / 2);
    const N = Math.max(55, Math.round(m.r * m.r * (kind === 'acacia' ? 0.2 : 0.28))), ls = Math.max(3.8, m.r * 0.18);
    const leaves = [];
    for (let i = 0; i < N; i++) {
      const a = R2(i, sd * 13 + mi) * Math.PI * 2, wob = 0.82 + 0.28 * Math.sin(a * 5 + mi + sd);
      const d = Math.sqrt(R2(i + 17, sd + mi)) * wob;
      const x = Math.cos(a) * m.r * d, y = Math.sin(a) * m.r * m.ry * d;
      const nx = x / m.r, ny = y / (m.r * m.ry);
      const light = (nx * lx + ny * ly) * 0.8 + (1 - d) * 0.15 + (R2(i, 77) - 0.5) * 0.35;
      const band = light < -0.35 ? 0 : light < 0 ? 1 : light < 0.35 ? 2 : light < 0.62 ? 3 : 4;
      leaves.push([x, y, band, R2(i + 3, sd) * Math.PI * 2, ls * (0.7 + R2(i + 9, sd) * 0.6) * (band === 0 ? 1.25 : 1)]);
    }
    for (let band = 0; band < 5; band++) {
      mc.beginPath();
      for (const [x, y, b, rot, s] of leaves) {
        if (b !== band) continue;
        const cs = Math.cos(rot), sn = Math.sin(rot), P = (u, v) => [x + u * cs - v * sn, y + u * sn + v * cs];
        const p0 = P(-s, 0), c1 = P(0, -s * 0.5), p1 = P(s, 0), c2 = P(0, s * 0.5);
        mc.moveTo(p0[0], p0[1]); mc.quadraticCurveTo(c1[0], c1[1], p1[0], p1[1]); mc.quadraticCurveTo(c2[0], c2[1], p0[0], p0[1]);
      }
      mc.fillStyle = leaf[band]; mc.fill();
    }
    return { cv, x: m.x - W / 2, y: m.y - Hh / 2, w: W, h: Hh, px: m.x, py: m.y + m.r * m.ry * 0.6 };
  });
  return { trunk, tx: minX - pad, ty: minY - pad, tw: tw / k, th: th / k, masses: bakedMasses, seed: sd };
}

// Gebakken boom tekenen: stam stil, bladmassa's wiegen elk apart (en buigen mee met de wind)
export function drawBakedTree(c, T, x, y, s, time) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.drawImage(T.trunk, T.tx, T.ty, T.tw, T.th);
  T.masses.forEach((m, i) => {
    const a = Math.sin(time * (0.9 + (i % 3) * 0.23) + T.seed + i * 1.7) * 0.035 + WIND.push * 0.09;
    c.save(); c.translate(m.px, m.py); c.rotate(a); c.drawImage(m.cv, m.x - m.px, m.y - m.py, m.w, m.h); c.restore();
  });
  c.restore();
}
