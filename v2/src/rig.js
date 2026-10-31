// Aanpak A: met de hand getekende vectorvormen per lichaamsdeel, bewogen door een skelet.
// Elk deel is een pad rond zijn eigen gewricht (oorsprong = gewricht, ledematen wijzen naar +y).
// Schaduw met harde vlakken: licht van linksboven, schaduw rechtsonder.

const P = d => new Path2D(d);

// ---------- Vormen (kijkrichting naar rechts, eenheden ~ 1/120 van de lengte) ----------
export const SHAPES = {
  // Romp vanaf het heupmidden: gebogen rug, borst, buik
  torso: P('M -12 6 C -19 -4 -21 -22 -16 -36 C -13 -45 -5 -51 5 -50 C 13 -49 18 -40 17 -29 C 16 -17 14 -7 10 1 C 6 8 -4 10 -12 6 Z'),
  // Kop vanaf de nek: kleine schedel, wenkbrauwboog, vooruitstekende snuit, geen kin
  head: P('M -10 -2 C -16 -8 -17 -23 -9 -30 C -3 -35 7 -34 12 -28 C 14 -26 17 -24 17 -21 C 18 -19 16 -18 15 -17 C 16 -14 18 -13 21 -11 C 24 -9 24 -5 21 -3 C 19 0 16 2 12 2 C 6 2 1 1 -2 3 C -5 4 -8 2 -10 -2 Z'),
  // Haar: één ruige massa met plukken, over schedel en nek
  hair: P('M -11 -1 L -14 -6 L -13 -9 L -17 -13 L -15 -16 L -18 -21 L -14 -23 L -14 -28 L -9 -29 L -7 -34 L -2 -32 L 2 -36 L 5 -32 L 10 -33 L 10 -29 L 14 -28 L 12 -25 L 8 -26 L 6 -23 L 3 -25 L 1 -21 L -3 -23 L -4 -18 L -7 -19 L -6 -13 L -9 -12 L -8 -6 Z'),
  upperArm: P('M -6 -2 C -9 6 -7 14 -4 22 L 4 22 C 6 14 7 5 5 -3 C 2 -6 -3 -6 -6 -2 Z'),
  foreArm: P('M -4 -1 C -6 7 -5 14 -3 20 L 3 20 C 5 14 6 7 5 -1 C 2 -3 -2 -3 -4 -1 Z'),
  // Hand: handpalm met gebogen vingers en losse duim
  hand: P('M -4 -1 C -6 3 -6 8 -3 11 C 0 13 4 12 5 9 C 6 6 6 3 4 0 C 1 -2 -2 -2 -4 -1 Z'),
  thumb: P('M 3 1 C 6 1 8 4 7 7 C 6 8 4 7 4 5 Z'),
  thigh: P('M -7 -1 C -9 7 -7 14 -4 20 L 4 20 C 6 14 8 6 6 -2 C 2 -5 -4 -5 -7 -1 Z'),
  // Scheen met kuit aan de achterkant
  shin: P('M -4 -1 C -8 4 -7 12 -3 20 L 2 20 C 3 13 4 6 4 -1 C 1 -3 -2 -3 -4 -1 Z'),
  // Voet: hiel achter, tenen vooruit, platte voetzool
  foot: P('M -4 -2 C -6 0 -6 4 -3 5 L 13 5 C 15 5 15 2 13 1 C 9 0 5 -1 2 -3 C 0 -4 -2 -4 -4 -2 Z'),
  // Huid om de heupen met franje
  wrap: P('M -13 -1 C -5 3 6 3 13 -3 L 14 4 L 12 7 L 13 10 L 9 10 L 8 13 L 4 11 L 1 14 L -2 11 L -5 13 L -7 10 L -11 11 L -11 7 L -14 5 Z'),
};

// Details: fijne lijnen binnen de vormen
const DETAILS = {
  head: [
    // wenkbrauwboog, oor, neus, mond, wangfold
    P('M 6 -19 C 10 -21 14 -21 16 -19'),
    P('M 18 -13 C 21 -12 22 -10 21 -9'),
    P('M 14 -5 C 17 -4 19 -4 21 -5'),
    P('M 8 -12 C 10 -10 12 -9 15 -9'),
  ],
  hand: [P('M -2 9 C 0 10 2 10 4 8'), P('M -3 6 C 0 7 2 7 5 5')],
  foot: [P('M 8 5 L 8 2'), P('M 11 5 L 11 2')],
  torso: [P('M 3 -40 C 8 -38 12 -34 14 -28'), P('M 2 -18 C 6 -16 9 -12 10 -8')],
};

// ---------- Kleuren ----------
export const LOOKS = {
  habilis: {
    outline: '#2a1a10',
    skin: ['#c48c5e', '#8a5634', '#ecc092'],   // basis, schaduw, licht
    fur: ['#7e5032', '#4a2c18', '#b07a4c'],
    hair: ['#3a2416', '#24160c', '#5e3c24'],
    hide: ['#a27a4a', '#76552e', '#c89e68'],
    iris: '#3a2412',
  },
};

// Teken een vorm met harde schaduwvlakken en een vaste buitenlijn.
function shaded(c, path, [base, dark, light], outline, k = 3.6, lw = 2.2) {
  c.save();
  c.clip(path);
  c.fillStyle = dark; c.fill(path);
  // Lichte vlak: deel dat niet bedekt wordt door de naar rechtsonder verschoven vorm
  c.save();
  const lightClip = new Path2D(); lightClip.rect(-500, -500, 1000, 1000); lightClip.addPath(path, new DOMMatrix().translate(k * 0.55, k * 0.55));
  c.fillStyle = base;
  const baseP = new Path2D(); baseP.addPath(path, new DOMMatrix().translate(-k, -k * 0.9)); c.fill(baseP);
  c.clip(lightClip, 'evenodd'); c.fillStyle = light; c.fill(path);
  c.restore();
  c.restore();
  c.lineJoin = 'round'; c.lineCap = 'round';
  c.strokeStyle = outline; c.lineWidth = lw; c.stroke(path);
}

function details(c, list, color, lw = 1) {
  c.strokeStyle = color; c.lineWidth = lw; c.lineCap = 'round';
  for (const d of list) c.stroke(d);
}

// ---------- Skelet en houdingen ----------
// Hoeken in radialen. Ledematen hangen standaard recht omlaag; positief = naar voren (rechts).
const BASE = { root: 0, lean: 0.12, neck: -0.05, sF: 0.1, eF: 0.35, wF: 0, sB: -0.05, eB: 0.3, wB: 0, hF: -0.02, kF: 0.05, aF: 0, hB: 0.06, kB: 0.05, aB: 0, breathe: 0 };

export function pose(name, t) {
  const p = { ...BASE };
  const s = Math.sin(t), c = Math.cos(t);
  if (name === 'idle') {
    p.breathe = Math.sin(t * 0.5) * 0.6; p.sF = 0.12 + Math.sin(t * 0.5) * 0.03; p.sB = -0.04 - Math.sin(t * 0.5) * 0.03; p.neck = -0.05 + Math.sin(t * 0.25) * 0.04;
  } else if (name === 'walk' || name === 'run') {
    const run = name === 'run' ? 1 : 0, amp = run ? 0.75 : 0.45;
    p.lean = 0.16 + run * 0.18;
    p.hF = s * amp; p.hB = -s * amp;
    p.kF = Math.max(0, -c) * (0.9 + run * 0.5) + 0.08; p.kB = Math.max(0, c) * (0.9 + run * 0.5) + 0.08;
    p.aF = -Math.max(0, -s) * 0.3; p.aB = -Math.max(0, s) * 0.3;
    p.sF = -s * (amp * 0.9) + 0.1; p.sB = s * (amp * 0.9) - 0.05; p.eF = 0.35 + run * 0.9 + Math.max(0, s) * 0.3; p.eB = 0.35 + run * 0.9 + Math.max(0, -s) * 0.3;
    p.root = -Math.abs(c) * (2 + run * 2); p.neck = -0.1 - run * 0.1;
  } else if (name === 'jump') {
    p.lean = 0.05; p.hF = 0.9; p.kF = 1.5; p.aF = 0.2; p.hB = -0.15; p.kB = 0.6; p.aB = 0.3; p.sF = 2.6; p.eF = 0.3; p.sB = -0.9; p.eB = 0.6; p.neck = -0.25; p.root = -6;
  } else if (name === 'fall') {
    p.lean = -0.05; p.hF = 0.4; p.kF = 0.4; p.hB = -0.3; p.kB = 0.3; p.sF = 1.9; p.eF = 0.6; p.sB = -1.5; p.eB = 0.5; p.neck = 0.1;
  } else if (name === 'throw') {
    const k = (Math.sin(t) + 1) / 2;   // 0 = naar achteren, 1 = gooien
    p.lean = 0.25 - k * 0.15; p.sF = -2.3 + k * 3.6; p.eF = 0.6 - k * 0.5; p.sB = 0.7 - k * 0.8; p.eB = 0.6; p.hF = 0.35; p.kF = 0.2; p.hB = -0.3; p.kB = 0.15;
  } else if (name === 'cheer') {
    const b = Math.abs(Math.sin(t * 2)); p.root = -b * 8; p.lean = -0.05; p.sF = 2.3 + Math.sin(t * 4) * 0.25; p.sB = -2.7 - Math.sin(t * 4) * 0.2; p.eF = -0.3; p.eB = -0.3; p.kF = 0.3 * b; p.kB = 0.3 * b; p.neck = -0.3;
  }
  return p;
}

// ---------- Soorten: kop en lichaamsbouw ----------
const HEADS = {
  // Erectus / rudolfensis: hoger voorhoofd, grotere schedel, kortere snuit
  flat: P('M -10 -2 C -17 -8 -18 -25 -9 -32 C -3 -37 8 -36 13 -30 C 15 -28 16 -25 16 -22 C 17 -20 15 -19 15 -18 C 16 -15 17 -13 19 -11 C 21 -9 21 -6 19 -4 C 17 -1 14 2 11 2 C 6 2 1 1 -2 3 C -5 4 -8 2 -10 -2 Z'),
  // Paranthropus: lage schedel met kam, brede jukbeenderen, zware kaak
  robust: P('M -10 -1 C -16 -8 -16 -21 -9 -27 C -3 -31 7 -30 12 -25 C 14 -23 17 -21 17 -19 C 18 -17 16 -16 16 -15 C 18 -13 20 -11 22 -9 C 25 -6 24 -2 21 0 C 18 4 13 5 8 4 C 3 4 -1 3 -3 4 C -6 5 -9 3 -10 -1 Z'),
};
const CREST = P('M -9 -24 C -6 -33 2 -35 8 -28 C 3 -30 -3 -29 -9 -24 Z');
const HAIR_SHORT = P('M -11 -2 L -14 -7 L -15 -13 L -17 -18 L -15 -22 L -14 -28 L -9 -31 L -6 -35 L -1 -34 L 3 -36 L 7 -33 L 11 -33 L 12 -30 L 9 -29 L 5 -28 L 2 -29 L -1 -26 L -4 -27 L -5 -22 L -7 -21 L -7 -15 L -9 -13 L -8 -7 Z');

const lookCache = new WeakMap();
// Kleuren en vormen afleiden van het uiterlijk dat het spel gebruikt (vacht, huid, haar, kam, plat gezicht, lang)
export function rigLook(look) {
  let L = lookCache.get(look);
  if (L) return L;
  const tri = col => [col, mix(col, '#140a04', 0.38), mix(col, '#fff0d8', 0.3)];
  L = {
    outline: '#22140a',
    skin: tri(look.skin || '#c48c5e'), fur: tri(look.fur || '#7e5032'), hair: tri(look.hair || '#3a2416'),
    hide: ['#a27a4a', '#6e4e2a', '#c89e68'], iris: '#2e1a0c',
    head: look.crest ? 'robust' : look.flat ? 'flat' : 'habilis',
    legs: look.tall ? 1.22 : look.crest ? 0.92 : 1, arms: look.tall ? 0.94 : 1.04,
    hunch: look.tall ? 0.03 : look.crest ? 0.16 : 0.12,
  };
  lookCache.set(look, L);
  return L;
}

// Houding uit de toestand van het spel
export function gamePose(st) {
  const p = { ...BASE };
  if (st.dead) { p.sF = 2.2; p.sB = -2.2; p.eF = 0.4; p.eB = 0.4; p.hF = 0.6; p.kF = 0.8; p.hB = -0.3; p.kB = 0.5; p.neck = 0.3; return p; }
  if (st.hang) {
    const w = st.hang;   // slingerhoeksnelheid
    p.lean = -w * 0.08; p.sF = 3.0; p.sB = 2.9; p.eF = 0.05; p.eB = 0.1; p.hF = 0.25 - w * 0.25; p.kF = 0.5; p.hB = -0.1 - w * 0.25; p.kB = 0.7; p.neck = -0.2; p.root = 0;
    return p;
  }
  if (st.cheer) return pose('cheer', st.time * 3 + st.seed);
  if (st.air) { const q = pose(st.vy < 0 ? 'jump' : 'fall', 0); q.root = 0; return applyThrow(q, st); }
  if (st.skid) { p.lean = -0.2; p.hF = 0.5; p.kF = 0.1; p.hB = 0.2; p.kB = 0.2; p.sF = 1.2; p.sB = 0.8; p.eF = 0.3; return applyThrow(p, st); }
  if (st.speed > 10) { const q = locomotion(st.phase, st.run); return applyThrow(q, st); }
  return applyThrow(pose('idle', st.time * 2 + st.seed), st);
}
function locomotion(ph, run) {
  const p = { ...BASE }, s = Math.sin(ph), c = Math.cos(ph), amp = 0.45 + run * 0.3;
  p.lean = 0.16 + run * 0.18;
  p.hF = s * amp; p.hB = -s * amp;
  p.kF = Math.max(0, -c) * (0.9 + run * 0.5) + 0.08; p.kB = Math.max(0, c) * (0.9 + run * 0.5) + 0.08;
  p.aF = -Math.max(0, -s) * 0.3; p.aB = -Math.max(0, s) * 0.3;
  p.sF = -s * amp * 0.9 + 0.1; p.sB = s * amp * 0.9 - 0.05; p.eF = 0.35 + run * 0.9 + Math.max(0, s) * 0.3; p.eB = 0.35 + run * 0.9 + Math.max(0, -s) * 0.3;
  p.root = -Math.abs(c) * (2 + run * 2); p.neck = -0.1 - run * 0.1;
  return p;
}
// Gooien of hakken: de voorste arm zwaait van achter naar voren
function applyThrow(p, st) {
  if (!(st.throwK > 0)) return p;
  const k = st.throwK;   // 0 = net begonnen, 1 = klaar
  const back = Math.min(1, k * 3), fwd = Math.max(0, (k - 0.3) / 0.7);
  p.sF = -2.2 * back * (1 - fwd) + 1.5 * fwd; p.eF = 0.6 - fwd * 0.4; p.lean += 0.12 * fwd;
  return p;
}

// ---------- Tekenen ----------
// Oorsprong: tussen de voeten op de grond. scale = 1 geeft een figuur van ~120 eenheden hoog.
export function drawRig(c, look, p, opts = {}) {
  const L = typeof look === 'string' ? (LOOKS[look] ? { ...LOOKS[look], head: 'habilis', legs: 1, arms: 1, hunch: 0.12 } : rigLook({})) : look;
  const O = L.outline, ls = L.legs || 1, as = L.arms || 1;
  c.save();
  c.translate(0, -44 * ls + p.root);
  c.rotate(p.lean + ((L.hunch ?? 0.12) - 0.12));
  const breath = 1 + p.breathe * 0.012;

  const arm = (s, e, w, far) => {
    c.save(); c.translate(2, -42); c.rotate(-s);
    const tone = far ? darker(L.fur) : L.fur, skin = far ? darker(L.skin) : L.skin;
    c.save(); c.scale(1, as); shaded(c, SHAPES.upperArm, tone, O, 4); c.restore();
    c.translate(0, 21 * as); c.rotate(-e);
    c.save(); c.scale(1, as); shaded(c, SHAPES.foreArm, tone, O); c.restore();
    // Vachtplukjes op de onderarm
    c.fillStyle = tone[1]; c.beginPath(); c.moveTo(-4, 6); c.lineTo(-6.5, 9); c.lineTo(-3.6, 10); c.closePath(); c.fill();
    c.translate(0, 19 * as); c.rotate(-w);
    if (!far) drawTool(c, opts.tool, O, opts.time || 0, s + e + w - p.lean - ((L.hunch ?? 0.12) - 0.12));
    shaded(c, SHAPES.hand, skin, O, 1.6, 1.8); shaded(c, SHAPES.thumb, skin, O, 1, 1.4);
    details(c, DETAILS.hand, O, 0.9);
    c.restore();
  };
  const leg = (h, k, a, far, x) => {
    c.save(); c.translate(x, 2); c.rotate(-h);
    const tone = far ? darker(L.fur) : L.fur, skin = far ? darker(L.skin) : L.skin;
    c.save(); c.scale(1, ls); shaded(c, SHAPES.thigh, tone, O, 4); c.restore();
    c.translate(0, 19 * ls); c.rotate(k);
    c.save(); c.scale(1, ls); shaded(c, SHAPES.shin, tone, O); c.restore();
    // Knie: de dij loopt over het gewricht door (geen naad)
    c.save(); c.rotate(-k); c.translate(0, -19 * ls); c.scale(1, ls); c.clip(new Path2D('M -9 12 L 9 12 L 9 21 L -9 21 Z')); shaded(c, SHAPES.thigh, tone, O, 4); c.restore();
    c.translate(0, 19 * ls); c.rotate(-(p.lean - h + k) - a);
    shaded(c, SHAPES.foot, skin, O, 1.6, 1.8);
    details(c, DETAILS.foot, O, 0.8);
    c.restore();
  };

  arm(p.sB, p.eB, p.wB, true);
  leg(p.hB, p.kB, p.aB, true, -3);
  // Romp
  c.save(); c.scale(breath, breath);
  shaded(c, SHAPES.torso, L.fur, O, 5.5, 2.4);
  c.save(); c.clip(SHAPES.torso);
  c.fillStyle = L.skin[0]; c.fill(new Path2D('M 6 -44 C 13 -42 16 -34 15 -26 C 14 -16 12 -8 8 -1 C 4 -6 2 -16 3 -28 C 3 -36 4 -41 6 -44 Z'));
  c.fillStyle = L.skin[1]; c.fill(new Path2D('M 15 -26 C 14 -16 12 -8 8 -1 C 7 -6 8 -14 10 -22 C 12 -25 13 -26 15 -26 Z'));
  // Vachtstructuur: hoekige plukjes in de schaduwtint
  c.fillStyle = L.fur[1];
  for (const [x, y] of [[-12, -30], [-9, -22], [-13, -14], [-6, -36], [-8, -8], [-4, -16]]) { c.beginPath(); c.moveTo(x, y); c.lineTo(x - 3, y + 4); c.lineTo(x + 1, y + 2.5); c.closePath(); c.fill(); }
  c.fillStyle = L.fur[2];
  for (const [x, y] of [[-10, -38], [-14, -26], [-5, -42]]) { c.beginPath(); c.moveTo(x, y); c.lineTo(x - 2.6, y + 3.5); c.lineTo(x + 1, y + 2); c.closePath(); c.fill(); }
  c.restore();
  details(c, DETAILS.torso, darker(L.fur)[1], 1);
  // Ruige vachtrand langs de rug
  c.fillStyle = L.fur[1];
  for (let i = 0; i < 6; i++) { const y = -38 + i * 6.5, x = -16.5 + Math.abs(i - 2) * 0.6; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 3.5, y + 2); c.lineTo(x + 0.5, y + 3.5); c.closePath(); c.fill(); }
  c.restore();
  shaded(c, SHAPES.wrap, L.hide, O, 2, 1.8);
  c.strokeStyle = L.hide[1]; c.lineWidth = 1; c.beginPath(); c.moveTo(-10, 4); c.quadraticCurveTo(0, 7, 11, 2); c.stroke();
  leg(p.hF, p.kF, p.aF, false, 4);
  drawHead(c, L, p, opts);
  arm(p.sF, p.eF, p.wF, false);
  c.restore();
}

function drawHead(c, L, p, opts) {
  const O = L.outline, kind = L.head;
  const head = kind === 'flat' ? HEADS.flat : kind === 'robust' ? HEADS.robust : SHAPES.head;
  c.save(); c.translate(3, -50); c.rotate(p.neck);
  shaded(c, head, L.skin, O, 3.6, 2.2);
  // Diepe oogkas onder de wenkbrauwboog
  c.save(); c.clip(head); c.fillStyle = L.skin[1];
  c.beginPath(); c.moveTo(5, -19); c.bezierCurveTo(9, -20, 14, -20, 17, -18); c.bezierCurveTo(14, -15, 9, -14, 5, -16); c.closePath(); c.fill();
  if (kind === 'robust') { c.beginPath(); c.ellipse(9, -9, 6, 4, 0.2, 0, Math.PI * 2); c.fill(); }   // brede jukbeenderen
  // Lichtvlek op het voorhoofd
  c.fillStyle = L.skin[2]; c.beginPath(); c.ellipse(4, -25, 5, 2.4, -0.3, 0, Math.PI * 2); c.fill();
  c.restore();
  shaded(c, kind === 'flat' ? HAIR_SHORT : SHAPES.hair, L.hair, O, 2, 1.8);
  // Schedelkam (Paranthropus) steekt boven het haar uit
  if (kind === 'robust') { c.save(); c.translate(0, -3); c.scale(1.15, 1.25); shaded(c, CREST, [mix(L.skin[0], L.hair[0], 0.5), L.hair[0], L.skin[0]], O, 1.4, 1.6); c.restore(); }
  // Oor
  c.fillStyle = L.skin[0]; c.beginPath(); c.ellipse(-3, -14, 3.6, 4.6, 0.1, 0, Math.PI * 2); c.fill(); c.strokeStyle = O; c.lineWidth = 1.6; c.stroke();
  c.strokeStyle = L.skin[1]; c.lineWidth = 1; c.beginPath(); c.arc(-2.6, -14, 2, -1.2, 1.6); c.stroke();
  // Oog met ooglid
  const open = opts.eyes === 'closed' ? 0 : opts.blink ? 0.15 : 1;
  if (open < 0.2) {
    c.strokeStyle = O; c.lineWidth = 1.4; c.beginPath(); c.moveTo(8.5, -16.5); c.quadraticCurveTo(11.5, -15.4, 14.5, -16.6); c.stroke();
  } else {
    c.save(); c.beginPath(); c.moveTo(8.5, -16.5); c.quadraticCurveTo(11.5, -18.4, 14.5, -16.6); c.quadraticCurveTo(11.5, -15.2, 8.5, -16.5); c.closePath();
    c.fillStyle = '#eee0c6'; c.fill(); c.clip(); c.fillStyle = L.iris; c.beginPath(); c.arc(12.3, -16.6, 1.7, 0, Math.PI * 2); c.fill(); c.fillStyle = '#000'; c.beginPath(); c.arc(12.5, -16.6, 0.85, 0, Math.PI * 2); c.fill(); c.restore();
    c.strokeStyle = O; c.lineWidth = 1.5; c.beginPath(); c.moveTo(8.2, -16.4); c.quadraticCurveTo(11.5, -18.8, 14.8, -16.7); c.stroke();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(12, -17.2, 0.45, 0, Math.PI * 2); c.fill();
  }
  // Neus
  const nx = kind === 'flat' ? 18 : 20;
  c.fillStyle = L.skin[1]; c.beginPath(); c.ellipse(nx, -10, 1.3, 0.9, 0.3, 0, Math.PI * 2); c.fill();
  c.strokeStyle = O; c.lineWidth = 1.1; c.lineCap = 'round';
  c.beginPath(); c.moveTo(6, -19); c.bezierCurveTo(10, -21, 14, -21, 16, -19); c.stroke();
  c.beginPath(); c.moveTo(nx - 2, -13); c.bezierCurveTo(nx + 1, -12, nx + 2, -10, nx + 1, -9); c.stroke();
  // Mond: dicht, open (juichen/pijn) of kauwend
  if (opts.mouth === 'open') { c.fillStyle = '#4a1c12'; c.beginPath(); c.ellipse(nx - 3, -4, 3.2, 2.4, 0, 0, Math.PI * 2); c.fill(); c.stroke(); }
  else { const chew = opts.chew ? Math.sin(opts.time * 8) * 0.8 : 0; c.beginPath(); c.moveTo(nx - 6, -5 + chew); c.bezierCurveTo(nx - 3, -4 + chew, nx - 1, -4, nx + 1, -5); c.stroke(); }
  c.beginPath(); c.moveTo(8, -12); c.bezierCurveTo(10, -10, 12, -9, nx - 5, -9); c.stroke();
  // Baardstoppels langs de kaak
  c.fillStyle = L.hair[0]; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(-1 + i * 3, 2); c.lineTo(0 + i * 3, 4.5); c.lineTo(1.5 + i * 3, 1.8); c.fill(); }
  c.restore();
}

// Gereedschap in de voorste hand (de hand wijst omlaag, +y)
function drawTool(c, tool, O, time, undo = 0) {
  if (tool === 'stone') {
    c.fillStyle = '#6c6a64'; c.beginPath(); c.ellipse(1, 8, 4.2, 3.6, 0.3, 0, Math.PI * 2); c.fill(); c.strokeStyle = O; c.lineWidth = 1.4; c.stroke();
    c.fillStyle = '#a8a49a'; c.beginPath(); c.ellipse(0, 7, 1.6, 1, 0.3, 0, Math.PI * 2); c.fill();
  } else if (tool === 'spear') {
    // Lange houten speer (Schöningen): punt omhoog en naar voren
    c.save(); c.rotate(undo + Math.PI - 0.5);
    c.strokeStyle = O; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, -30); c.lineTo(0, 62); c.stroke();
    c.strokeStyle = '#b08850'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, -30); c.lineTo(0, 62); c.stroke();
    c.fillStyle = '#e0c48a'; c.beginPath(); c.moveTo(-2.4, 58); c.lineTo(0, 70); c.lineTo(2.4, 58); c.closePath(); c.fill();
    c.restore();
  } else if (tool === 'axe') {
    // Handbijl: druppelvormige, aan twee kanten bewerkte steen
    const axe = new Path2D('M 1 4 C 9 8 11 18 3 27 C -5 18 -6 9 1 4 Z');
    shaded(c, axe, ['#c4ad82', '#8a7656', '#ecdcb4'], O, 2, 1.6);
    c.strokeStyle = '#8a7656'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(2, 9); c.lineTo(0, 14); c.lineTo(3, 19); c.lineTo(1, 23); c.stroke();
  } else if (tool === 'torch') {
    // Fakkel: tak met vlam, altijd rechtop (draaiing van de arm ongedaan maken)
    c.save(); c.rotate(undo + Math.PI + 0.25);
    c.strokeStyle = O; c.lineWidth = 5.5; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, -10); c.lineTo(0, 22); c.stroke();
    c.strokeStyle = '#6a4228'; c.lineWidth = 3.5; c.beginPath(); c.moveTo(0, -10); c.lineTo(0, 22); c.stroke();
    const f = Math.sin(time * 18) * 2.5;
    const g = c.createRadialGradient(0, 30, 2, 0, 30, 34); g.addColorStop(0, 'rgba(255,200,90,0.5)'); g.addColorStop(1, 'rgba(255,160,60,0)');
    c.fillStyle = g; c.beginPath(); c.arc(0, 30, 34, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#ff6a1a'; c.beginPath(); c.moveTo(-7, 20); c.quadraticCurveTo(-6 + f, 36, 0, 46); c.quadraticCurveTo(6 + f, 36, 7, 20); c.closePath(); c.fill();
    c.fillStyle = '#ffd25a'; c.beginPath(); c.moveTo(-3.5, 21); c.quadraticCurveTo(-2 + f, 30, 0, 36); c.quadraticCurveTo(2 + f, 30, 3.5, 21); c.closePath(); c.fill();
    c.restore();
  }
}

function darker([b, d, l]) { return [mix(b, '#1a1008', 0.28), mix(d, '#1a1008', 0.3), mix(l, '#1a1008', 0.28)]; }
function mix(a, b, t) {
  const p = s => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
  const A = p(a), B = p(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
