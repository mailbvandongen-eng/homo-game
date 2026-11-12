import * as THREE from '../lib/three.module.js';
import { height, blockers } from './world.js';
import { ICON } from './icons.js';

// Vuur. Je kunt het niet maken: je vindt het waar de bliksem insloeg, draagt het op een tak naar het kamp
// en houdt het daar in leven met hout. Dit bestand kent drie plekken:
// - de smeulende stam (source): daar vat een tak vlam
// - de kring van stenen bij het kamp (hearth): daar brandt het vuur, zolang er hout op ligt
// - dode bomen (wood): daar hak je takken af met een vuistbijl
// Tijden zijn in seconden speeltijd.
const BRANCH = 240;   // zo lang brandt één tak in het vuur
const MAX = 960;      // meer hout past er niet op
const EMBER = 200;    // zo lang blijft de as gloeien nadat de vlammen weg zijn
const TORCH = 170;    // zo lang brandt een tak in je hand
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

function softTex(inner, outer) {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 2, 32, 32, 31); g.addColorStop(0, inner); g.addColorStop(1, outer);
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const lam = (color) => new THREE.MeshLambertMaterial({ color, flatShading: true });

// Een rookpluim: wolkjes die opstijgen, groter en ijler worden en weer onderaan beginnen
class Smoke {
  constructor(scene, x, y, z, { n, rise, top, size, color, drift = 0.25, dense = 0.5 }) {
    this.x = x; this.y = y; this.z = z; this.rise = rise; this.top = top; this.size = size; this.drift = drift; this.dense = dense; this.k = 1;
    const tex = Smoke.tex || (Smoke.tex = softTex('rgba(255,255,255,0.9)', 'rgba(255,255,255,0)'));
    this.puffs = [];
    for (let i = 0; i < n; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color, transparent: true, depthWrite: false, opacity: 0 }));
      scene.add(s); this.puffs.push({ s, a: i / n, w: Math.random() * 6.28 });
    }
  }
  update(dt, t) {
    for (const p of this.puffs) {
      p.a = (p.a + dt * this.rise / this.top) % 1;
      const h = p.a * this.top, sway = h * this.drift;
      p.s.position.set(this.x - sway + Math.sin(t * 0.4 + p.w) * (0.2 + h * 0.04), this.y + h, this.z + sway * 0.25 + Math.cos(t * 0.3 + p.w) * (0.2 + h * 0.04));
      p.s.scale.setScalar(this.size * (0.35 + p.a * 1.4));
      p.s.material.opacity = this.k * Math.min(1, p.a * 6) * (1 - p.a) * this.dense;
      p.s.visible = p.s.material.opacity > 0.01;
    }
  }
}

// Vlammen: een paar kegels die flakkeren, met een gloed eromheen
function flames(size) {
  const g = new THREE.Group(), list = [];
  for (const [col, r, h, o] of [[0xff6a14, 0.26, 0.75, 0.85], [0xffa628, 0.18, 0.6, 0.9], [0xffe890, 0.1, 0.4, 1]]) {
    for (let i = 0; i < (o === 1 ? 1 : 2); i++) {
      const m = new THREE.Mesh(new THREE.ConeGeometry(r * size, h * size, 6), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: o, depthWrite: false, fog: false }));
      m.position.set((i - 0.5) * 0.16 * size * (o === 1 ? 0 : 1), h * size / 2, (i - 0.5) * 0.1 * size); m.userData = { h: h * size / 2, w: Math.random() * 6.28 };
      g.add(m); list.push(m);
    }
  }
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex('rgba(255,170,70,0.75)', 'rgba(255,120,30,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  glow.scale.setScalar(2.4 * size); glow.position.y = 0.35 * size; g.add(glow);
  g.userData = { list, glow };
  return g;
}
function flicker(g, t, k) {
  g.visible = k > 0.02;
  if (!g.visible) return;
  for (const m of g.userData.list) {
    const f = 0.8 + Math.sin(t * 11 + m.userData.w) * 0.14 + Math.sin(t * 23 + m.userData.w * 2) * 0.08;
    m.scale.set(0.6 + k * 0.4, k * f, 0.6 + k * 0.4); m.position.y = m.userData.h * k * f; m.rotation.y = t * 2 + m.userData.w;
  }
  g.userData.glow.material.opacity = 0.35 + k * 0.5 + Math.sin(t * 9) * 0.06;
}

export class Fire {
  constructor(scene, cfg, dayLen) {
    this.dayLen = dayLen; this.fuel = 0; this.ember = 0; this.torchT = 0; this.lastP = null; this.told = {}; this.t = 0; this.wasLit = false;
    this.source = cfg.source; this.S = { x: cfg.source[0], z: cfg.source[1] }; this.H = { x: cfg.hearth[0], z: cfg.hearth[1] };
    const sy = height(this.S.x, this.S.z), hy = height(this.H.x, this.H.z);

    // de smeulende stam: zwartgeblakerde grond, een omgevallen verkoolde boom, gloed en een hoge rookpluim
    const burnt = new THREE.Mesh(new THREE.CircleGeometry(8, 20), new THREE.MeshLambertMaterial({ map: softTex('rgba(40,34,30,0.95)', 'rgba(40,34,30,0)'), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    burnt.rotation.x = -Math.PI / 2; burnt.position.set(this.S.x, sy + 0.06, this.S.z); scene.add(burnt);
    const char = lam(0x16120f), src = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.42, 4.6, 7), char); trunk.rotation.z = Math.PI / 2 - 0.08; trunk.position.y = 0.36; src.add(trunk);
    const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.5, 1.1, 7), char); stump.position.set(-2.9, 0.5, 0.3); src.add(stump);
    for (const [x, r, l] of [[1.4, 0.9, 1.6], [0.2, -0.8, 1.3], [1.9, -0.5, 1.1]]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.11, l, 5), char); b.position.set(x, 0.75, r * 0.4); b.rotation.set(r, 0, 0.5); src.add(b); }
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xff4a10, fog: false });
    for (const x of [-0.9, 0.1, 0.9]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 4), glowMat); e.scale.set(1.6, 0.5, 1); e.position.set(x, 0.62, 0.12); src.add(e); }
    this.srcFlame = flames(1.1); this.srcFlame.position.set(0.1, 0.6, 0.1); src.add(this.srcFlame);
    src.position.set(this.S.x, sy, this.S.z); src.rotation.y = 0.7; src.traverse((o) => { if (o.isMesh && o.material === char) o.castShadow = true; }); scene.add(src);
    blockers.push({ x: this.S.x, z: this.S.z, r: 0.9 });
    this.srcSmoke = new Smoke(scene, this.S.x, sy + 0.8, this.S.z, { n: 26, rise: 2.6, top: 55, size: 9, color: 0x4a4642, drift: 0.3, dense: 0.8 });
    this.srcLight = new THREE.PointLight(0xff6a20, 0, 14, 2); this.srcLight.position.set(this.S.x, sy + 1.2, this.S.z); scene.add(this.srcLight);

    // de kring van stenen bij het kamp
    const ring = new THREE.Group(), stone = lam(0x8a8078);
    for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28, s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16 + (i % 3) * 0.02, 0), stone); s.position.set(Math.cos(a) * 0.72, 0.07, Math.sin(a) * 0.72); s.rotation.set(i, i * 2, 0); s.castShadow = true; ring.add(s); }
    const ash = new THREE.Mesh(new THREE.CircleGeometry(0.66, 14), new THREE.MeshLambertMaterial({ color: 0x2a2623, polygonOffset: true, polygonOffsetFactor: -2 })); ash.rotation.x = -Math.PI / 2; ash.position.y = 0.03; ring.add(ash);
    this.logs = new THREE.Group();
    for (let i = 0; i < 4; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.85, 5), lam(0x2c2018)); l.rotation.set(Math.PI / 2 - 0.35, i * 1.57 + 0.4, 0); l.position.y = 0.16; this.logs.add(l); }
    ring.add(this.logs);
    this.coals = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 5), new THREE.MeshBasicMaterial({ color: 0xff4a10, fog: false })); this.coals.scale.y = 0.25; this.coals.position.y = 0.08; ring.add(this.coals);
    this.flame = flames(1.25); this.flame.position.y = 0.1; ring.add(this.flame);
    ring.position.set(this.H.x, hy, this.H.z); scene.add(ring);
    blockers.push({ x: this.H.x, z: this.H.z, r: 0.75, top: hy + 0.3 });
    this.smoke = new Smoke(scene, this.H.x, hy + 1, this.H.z, { n: 8, rise: 1.6, top: 12, size: 2.6, color: 0x9a948c });
    this.light = new THREE.PointLight(0xff8a3a, 0, 30, 1.6); this.light.position.set(this.H.x, hy + 1.1, this.H.z); scene.add(this.light);
    this.torchLight = new THREE.PointLight(0xff9a48, 0, 20, 1.6); scene.add(this.torchLight);

    // dode bomen: omgevallen, grijs en droog
    this.wood = [];
    const grey = lam(0x8c8478);
    for (const [x, z] of cfg.wood) {
      const g = new THREE.Group(), y = height(x, z);
      const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.34, 4.2, 7), grey); tr.rotation.z = Math.PI / 2 - 0.1; tr.position.y = 0.32; g.add(tr);
      for (const [bx, r, l] of [[1.3, 0.8, 1.9], [0.5, -0.9, 1.6], [1.8, -0.3, 1.4], [-0.4, 0.5, 1.2], [1.0, 0.1, 2.1]]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.08, l, 5), grey); b.position.set(bx, 0.3 + l * 0.36, r * 0.5); b.rotation.set(r * 0.8, 0, 0.35 - r * 0.3); g.add(b); }
      g.position.set(x, y, z); g.rotation.y = x * 0.37; g.traverse((o) => { if (o.isMesh) o.castShadow = true; }); scene.add(g);
      blockers.push({ x, z, r: 0.7 });
      this.wood.push({ x, z, cool: 0 });
    }

    // de berg aan de horizon: een vulkaan met een rookpluim. Te ver om heen te lopen; hij hoort bij het landschap.
    if (cfg.volcano) {
      const [vx, vz] = cfg.volcano;
      // onderaan lost hij op in de nevel, naar boven wordt hij donker; de kraterrand is grillig
      this.volMat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false });
      const geo = new THREE.CylinderGeometry(20, 240, 220, 16, 5, true), pos = geo.attributes.position, col = [];
      for (let i = 0; i < pos.count; i++) {
        const k = (pos.getY(i) + 110) / 220, a = Math.atan2(pos.getZ(i), pos.getX(i));
        if (k > 0.99) pos.setY(i, pos.getY(i) + Math.sin(a * 3) * 7 + Math.sin(a * 7) * 3);
        else if (k > 0.1) { const w = 1 + Math.sin(a * 5 + k * 4) * 0.07; pos.setX(i, pos.getX(i) * w); pos.setZ(i, pos.getZ(i) * w); }
        const c = 1 - 0.55 * Math.pow(k, 0.7) + Math.sin(a * 9) * 0.03 * k; col.push(c, c * 0.95, c * 0.92);
      }
      geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      const cone = new THREE.Mesh(geo, this.volMat); cone.position.set(vx, 90, vz); scene.add(cone);
      this.volSmoke = new Smoke(scene, vx, 198, vz, { n: 10, rise: 3.5, top: 140, size: 90, color: 0x6a645e, drift: 0.5 });
      for (const p of this.volSmoke.puffs) p.s.material.fog = false;
    }
    this.scene = scene;
  }

  get lit() { return this.fuel > 0; }
  get state() { return this.fuel > 0 ? 'lit' : this.ember > 0 ? 'ember' : 'cold'; }
  // warm genoeg om de kou van de nacht niet te voelen
  warm(p) { return this.lit && dist(p, this.H) < 14; }
  lookTargets() {
    return [{ look: 'firesource', x: this.S.x, z: this.S.z, fire: 'source' }, { look: this.fuel > 0 ? 'hearthlit' : this.ember > 0 ? 'hearthember' : 'hearth', x: this.H.x, z: this.H.z, fire: 'hearth' },
      ...this.wood.map((w) => ({ look: 'deadwood', x: w.x, z: w.z, fire: 'wood', wood: w }))];
  }
  // Wat kun je hier nu doen met wat je in je handen hebt? Geeft het icoon terug, of null.
  canUse(t, s) {
    const H = s.hands, has = (it) => H.includes(it);
    if (t.fire === 'source') return has('branch') || has('stick') ? ICON.fire : null;
    if (t.fire === 'wood') return has('axe') ? ICON.chop : ICON.hand;
    if (has('torch')) return ICON.fire;
    if (this.lit && has('meat')) return ICON.fire;
    if (has('branch') || has('stick')) return ICON.fire;
    return null;
  }
  use(t, game) {
    if (t.fire === 'source') return this.kindle(game);
    if (t.fire === 'wood') return this.chop(t.wood, game);
    const H = game.state.hands;
    if (H.includes('torch')) return this.lightHearth(game);
    if (this.lit && H.includes('meat')) return this.roast(game);
    return this.feed(game);
  }
  // de knop: sta je ernaast met het goede ding in je hand, dan doet hij het
  action(game) {
    const p = game.player.pos, s = game.state, H = s.hands;
    const run = (t, speed = 1.6) => () => game.player.playOnce('Interact', { speed, at: 0.5, onAt: () => this.use(t, game) });
    const T = this.lookTargets();
    if (dist(p, this.S) < 3.6 && this.canUse(T[0], s)) return { mode: 'fire', icon: ICON.fire, run: run(T[0]) };
    if (dist(p, this.H) < 3 && this.canUse(T[1], s) && !(this.state === 'cold' && !H.includes('torch'))) return { mode: 'fire', icon: ICON.fire, run: run(T[1]) };
    const w = H.includes('axe') && T.find((x) => x.wood && dist(p, x) < 3);
    if (w) return { mode: 'chop', icon: ICON.chop, run: run(w, 1.3) };
    return null;
  }

  // een tak in de gloed houden
  kindle(game) {
    const s = game.state, i = s.hands.indexOf('branch') >= 0 ? s.hands.indexOf('branch') : s.hands.indexOf('stick');
    if (i < 0) { game.toast('Je steekt je hand uit… Heet! Zo krijg je het niet mee.', 4); game.sound.bad(); return; }
    s.hands[i] = 'torch'; this.torchT = TORCH; this.told.low = false; game.renderHands(); game.sound.whoosh();
    game.toast(s.found.has('torch') ? 'De tak vat vlam. Lopen!' : 'Je houdt de tak in de gloed. Hij rookt, knettert… en dan brandt hij! Nu snel terug, voor hij op is.', 6);
    s.known.add('torch'); game.discover('torch');
  }
  // met de brandende tak het vuur in de kring aansteken
  lightHearth(game) {
    const s = game.state, i = s.hands.indexOf('torch'); if (i < 0) return;
    s.hands[i] = null; game.renderHands(); game.sound.whoosh();
    const first = !s.found.has('hearth');
    this.fuel = Math.min(MAX, this.fuel + 200); this.ember = 0;
    game.toast(first ? 'Je legt de brandende tak in de kring van stenen. De vlammen grijpen om zich heen. Vuur! Iedereen komt kijken.' : 'Het vuur brandt weer in de kring van stenen.', 7);
    if (first) s.group = Math.min(100, s.group + 20);
    setTimeout(() => game.sound.good(), 700);
    game.discover('hearth');
  }
  // hout op het vuur
  feed(game) {
    const s = game.state, i = s.hands.indexOf('branch') >= 0 ? s.hands.indexOf('branch') : s.hands.indexOf('stick');
    if (i < 0) return;
    if (this.state === 'cold') { game.toast('Je legt de tak op de koude as. Er gebeurt niets. Vuur komt niet vanzelf.', 5); return; }
    if (this.fuel >= MAX - 20) { game.toast('Er ligt genoeg op. Meer hout verstikt het vuur.', 4); return; }
    const revive = this.fuel <= 0;
    s.hands[i] = null; game.renderHands(); game.sound.crack();
    this.fuel = Math.min(MAX, this.fuel + BRANCH); this.ember = 0; this.told.small = false;
    if (revive) { game.toast('Je legt de tak op de gloeiende as en blaast. Rook… en dan een vlam. Het vuur is terug!', 6); game.discover('ember'); }
    else game.toast(this.fuel > 500 ? 'De vlammen slaan hoog op. Dit brandt de hele nacht.' : 'Het hout knettert. Het vuur brandt weer feller.', 4);
    game.discover('feed');
  }
  // vlees boven het vuur
  roast(game) {
    const s = game.state, i = s.hands.indexOf('meat'); if (i < 0 || !this.lit) return;
    s.hands[i] = 'roast'; game.renderHands(); game.sound.hiss(0.6);
    game.toast(s.found.has('roast') ? 'Het vlees sist en kleurt bruin.' : 'Je houdt het vlees boven de vlammen. Het sist, het vet druipt, en het ruikt… Iedereen kijkt op.', 6);
    s.known.add('roast'); game.discover('roast');
  }
  // een tak van een dode boom hakken
  chop(w, game) {
    const s = game.state;
    if (!s.hands.includes('axe')) {
      game.sound.bad();
      game.toast(s.hands.includes('flake') ? 'Je zaagt met de afslag over de tak. Hij is te klein: je komt er niet doorheen.' : 'Je hangt met je hele gewicht aan een tak. Hij buigt, maar breekt niet. Dit hout is te taai voor je handen.', 5);
      return;
    }
    if (w.cool > 0) return;
    w.cool = 0.8; game.sound.crack(); setTimeout(() => game.sound.thud(), 250);
    if (!game.giveHand('branch')) return;
    game.toast(s.found.has('chop') ? 'Tak!' : 'Drie klappen met de vuistbijl en de tak is los. Droog hout: dat brandt goed.', 4);
    s.known.add('axe'); game.discover('chop');
  }

  // 's ochtends: brandt het nog?
  morning(game, dayP) {
    const before = this.wasLit;
    this.advance(game, dayP);
    if (!before && !this.lit) return;
    const s = game.state;
    if (this.lit) {
      s.health = Math.min(100, s.health + 10); s.group = Math.min(100, s.group + 6);
      setTimeout(() => { game.toast('Het vuur brandt nog. Niemand heeft het koud gehad, en geen dier kwam dichtbij.', 6); game.discover('keep'); }, 4200);
    } else {
      s.group = Math.max(0, s.group - 8);
      const ember = this.ember > 0;
      setTimeout(() => { game.sound.bad(); game.toast(ember ? 'Het vuur is uit. Maar onder de as gloeit het nog: snel een tak erop!' : 'Het vuur is vannacht uitgegaan. De as is koud. Het moet opnieuw gehaald worden.', 7); }, 4200);
    }
  }
  // de tijd die verstreken is (ook als je sliep) vreet aan het hout
  advance(game, dayP) {
    const el = this.lastP === null || !game.state.started ? 0 : ((dayP - this.lastP + 1) % 1) * this.dayLen;
    this.lastP = dayP;
    if (el <= 0) return;
    if (this.fuel > 0) {
      const left = this.fuel - el;
      // overdag houdt de groep het zelf aan de praat met sprokkelhout; 's nachts slaapt iedereen
      if (game.night < 0.3 && game.state.group > 15 && !game.state.lost) this.fuel = Math.max(Math.min(this.fuel, 120), left);
      else if (left > 0) this.fuel = left;
      else { this.fuel = 0; this.ember = Math.max(0, EMBER + left); }
    } else if (this.ember > 0) this.ember = Math.max(0, this.ember - el);
    if (game.state.hands.includes('torch')) {
      this.torchT -= el;
      if (this.torchT <= 0 || game.player.pos.y < -0.5) {
        const wet = this.torchT > 0;
        for (const i of [0, 1]) if (game.state.hands[i] === 'torch') game.state.hands[i] = null;
        game.renderHands(); game.sound.hiss(0.5);
        game.toast(wet ? 'Het water slaat over de vlam. Sssst. Uit.' : 'De tak is opgebrand tot aan je vingers. Je laat hem vallen. Het vuur is weg.', 6);
      } else if (this.torchT < 45 && !this.told.low) { this.told.low = true; game.toast('De vlam kruipt naar je hand. Schiet op!', 4); }
    }
  }

  snapshot() { return { fuel: Math.round(this.fuel), ember: Math.round(this.ember) }; }
  restore(d) { this.torchT = 90; if (!d) return; this.fuel = Math.max(0, Math.min(MAX, +d.fuel || 0)); this.ember = Math.max(0, Math.min(EMBER, +d.ember || 0)); this.lastP = null; }

  update(dt, game, dayP) {
    this.t += dt; const t = this.t, s = game.state, p = game.player.pos;
    this.wasLit = this.lit;
    if (s.sleeping <= 0) this.advance(game, dayP);
    for (const w of this.wood) w.cool = Math.max(0, w.cool - dt);
    // het vuur in de kring
    const k = this.fuel > 0 ? 0.35 + 0.65 * Math.min(1, this.fuel / 500) : 0;
    this.level = this.level === undefined ? k : this.level + (k - this.level) * Math.min(1, dt * 2);
    flicker(this.flame, t, this.level);
    this.coals.visible = this.fuel > 0 || this.ember > 0; this.logs.visible = this.coals.visible;
    this.coals.material.color.setHex(this.fuel > 0 ? 0xff5a14 : 0xb02a08);
    const fl = 0.85 + Math.sin(t * 9) * 0.08 + Math.sin(t * 21) * 0.07;
    this.light.intensity = (this.level * 26 + (this.fuel <= 0 && this.ember > 0 ? 1.5 : 0)) * fl * (0.35 + 0.65 * game.night);
    this.smoke.k = this.fuel > 0 ? 0.8 : this.ember > 0 ? 0.35 : 0; this.smoke.update(dt, t);
    if (this.fuel > 0 && this.fuel < 110 && game.night > 0.3 && !this.told.small && dist(p, this.H) < 30) { this.told.small = true; game.toast('Het vuur wordt klein. Er moet hout op.', 5); }
    // de smeulende stam
    flicker(this.srcFlame, t, 0.55 + Math.sin(t * 0.7) * 0.2);
    this.srcLight.intensity = 9 * fl * (0.3 + 0.7 * game.night);
    this.srcSmoke.update(dt, t);
    if (this.volSmoke) { this.volSmoke.update(dt, t); if (this.scene.fog) this.volMat.color.copy(this.scene.fog.color); }
    // de brandende tak: licht om je heen, en hyena's die terugdeinzen
    const torch = s.hands.includes('torch');
    this.torchLight.intensity = torch ? 14 * fl * (0.3 + 0.7 * game.night) : 0;
    if (torch) {
      this.torchLight.position.set(p.x, p.y + 1.7, p.z);
      for (const h of game.hyenas.list) {
        if (dist(h, p) < 10 && ['curious', 'windup', 'rush'].includes(h.state)) {
          h.state = 'retreat'; h.t = 6; game.sound.yelp();
          if (!s.found.has('scare')) { game.toast('De hyena ziet de vlam en deinst terug!', 4); game.discover('scare'); }
        }
      }
    }
  }
}
