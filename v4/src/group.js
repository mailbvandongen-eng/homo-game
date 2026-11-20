import { ERA, AREA } from './eras/index.js';
import * as THREE from '../lib/three.module.js';
import { height, steep, blockers } from './world.js';
import { turn } from './animal.js';
import { Rig } from './rig.js';
import { BODY } from './hominin.js';
import { heldMesh } from './items.js';

// De slaapplek: hier wacht je groep. Overdag scharrelen ze er rond, 's nachts slapen ze er dicht bij elkaar.
export const HOME = AREA.home;   // de slaapboom van dit gebied
const WHO = ERA.group || [
  { id: 'tor', name: 'Tor', k: 0.99, spot: [2.6, 1.2], grey: true },
  { id: 'kem', name: 'Kem', k: 0.92, spot: [-2.2, 2.4], tint: 0xe8d2c0 },
  { id: 'ibo', name: 'Ibo', k: 0.6, spot: [0.9, -2.8], child: true },
];
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const RAD = Math.PI / 180, UP = new THREE.Vector3(0, 1, 0), tQ = new THREE.Quaternion(), tN = new THREE.Vector3();
// Liggen en zitten zijn opgenomen bewegingen van echte mensen (zie assets/CREDITS.md). Elke houding heeft drie delen:
// gaan liggen, blijven liggen en opstaan. De opname begint en eindigt staand op het nulpunt; het lijf ligt daar een stukje vandaan.
// off: waar de heup dan ligt (meters, bij een lijf van 1,6 m) · head: de kant waar het hoofd ligt · belly: de kant van de buik (graden)
const POSE = {
  side: { down: 'Sleep_Down', loop: 'Sleep_Side', up: 'Sleep_Rise', off: [0.01, -0.45], head: 171, belly: -97, slow: 0.16 },
  side2: { down: 'Sleep_Down2', loop: 'Sleep_Side2', up: 'Sleep_Rise2', off: [-0.25, -0.58], head: -160, belly: 110, slow: 0.12 },
  sit: { down: 'Sit_Down', loop: 'Sit_Ground', up: 'Sit_Stand', off: [0.13, -0.33], head: 0, belly: 0, slow: 0.14 },
};
const DOWN = ['settle', 'down', 'rest', 'up'];   // bezig met gaan liggen, liggen of opstaan
const NO_BITE = ['hide'];                        // wat je geeft maar niemand opeet
// Een ligplek: het lijf ligt met de heup op (x, z), het hoofd wijst naar 'to' (bij zitten: daar kijkt hij heen).
// Geeft terug waar hij moet gaan staan en welke kant hij dan op kijkt, zodat hij precies daar neerkomt.
function bedAt(x, z, to, pose, k) {
  const P = POSE[pose], yaw = to - P.head * RAD, s = BODY.height * k / 1.6, c = Math.cos(yaw), n = Math.sin(yaw);
  const e = 0.6, nx = (height(x - e, z) - height(x + e, z)) / (2 * e), nz = (height(x, z - e) - height(x, z + e)) / (2 * e);
  return { x: x - (P.off[0] * c + P.off[1] * n) * s, z: z - (-P.off[0] * n + P.off[1] * c) * s, yaw, pose: P, lx: x, lz: z, n: new THREE.Vector3(nx, 1, nz).normalize() };
}
// Op de zij, met de buik naar 'belly': links en rechts liggen is elk een eigen opname
const sideBed = (x, z, belly, left, k) => bedAt(x, z, left ? belly - 92 * RAD : belly + 90 * RAD, left ? 'side' : 'side2', k);
// Wijzen: de rechterarm strekt zich naar een plek in de verte. w (0..1) is hoe ver de arm al omhoog is.
const pA = new THREE.Vector3(), pB = new THREE.Vector3(), pC = new THREE.Vector3(), pU = new THREE.Vector3(), pV = new THREE.Vector3(), pQ = new THREE.Quaternion(), pI = new THREE.Quaternion();
function pointArm(R, at, w) {
  const up = R.bone('upperarm_r'), lo = R.bone('lowerarm_r'), hand = R.bone('hand_r');
  if (!up || !lo || !hand) return;
  up.getWorldPosition(pA); hand.getWorldPosition(pC);
  pU.subVectors(pC, pA).normalize(); pV.set(at.x - pA.x, 0, at.z - pA.z); pV.y = pV.length() * 0.1; pV.normalize();
  R.bendQ(up, pQ.setFromUnitVectors(pU, pV).slerp(pI.identity(), 1 - w));
  // en de elleboog recht
  up.getWorldPosition(pA); lo.getWorldPosition(pB); hand.getWorldPosition(pC);
  pU.subVectors(pC, pB).normalize(); pV.subVectors(pB, pA).normalize();
  R.bendQ(lo, pQ.setFromUnitVectors(pU, pV).slerp(pI.identity(), 1 - w * 0.85));
}

export class Group {
  constructor(scene, A) {
    this.list = []; this.away = false; this.t = 0;
    this.forT = 25;      // tot de volgende zelf eten gaat zoeken
    this.point = null;   // { m, x, z }: dit groepslid wijst naar die plek (zie systems/missions.js)
    this.trek = null;    // { path, i, wait, line }: de groep loopt naar een nieuw kamp (zie systems/trek.js)
    for (const w of WHO) {
      // hetzelfde model als de hoofdpersoon, met een eigen lijf: een vrouw heeft smallere schouders en geen baard.
      // Het kind is een eigen model (een echt kinderlijf) aan hetzelfde skelet, zodat het alles kan wat de groten kunnen.
      const shape = BODY.shape && BODY.shape + (w.child ? '_child' : w.woman ? '_woman' : '');
      const rig = new Rig(A, w.child ? 'child' : 'hominin', { scale: BODY.height / 162 * w.k, shape, tall: BODY.height * w.k });
      rig.model.traverse((o) => {
        if (!o.isMesh) return;
        const hair = /beard|hair|transparency|short02|brow|lash/i.test(o.material.name);
        o.material = o.material.clone();
        if (hair && w.woman && /beard/i.test(o.material.name)) o.visible = false;
        else if (w.child) { if (/KidBody/.test(o.material.name)) o.material.color.setRGB(1.3, 1.22, 1.2); else if (/wrap/.test(o.material.name)) o.material.color.setRGB(0.72, 0.66, 0.6); }   // de huid van het kind bij die van de groten laten passen; de omslag is oud leer
        else if (hair && w.grey) o.material.color.setRGB(2.4, 2.4, 2.5);
        else if (!hair && w.tint) o.material.color.multiply(new THREE.Color(w.tint));
        else if (!hair && w.grey) o.material.color.multiplyScalar(0.86);
      });
      const m = { ...w, kind: 'member', rig, g: rig.root, x: HOME.x + w.spot[0], z: HOME.z + w.spot[1], yaw: Math.atan2(-w.spot[0], -w.spot[1]) + Math.PI, speed: 0, state: 'idle', t: 2 + this.list.length * 3, sick: 0, busy: 0, eatT: 0, lieW: 0, pointW: 0, able: !w.child && !w.grey };
      // wat hij draagt, zie je in zijn hand
      rig.root.updateMatrixWorld(true);
      const hb = rig.bone('hand_r'), mid = rig.bone('middle_01_r'); m.hold = new THREE.Group();
      if (hb) { m.hold.scale.setScalar(1 / hb.getWorldScale(new THREE.Vector3()).x); if (mid) m.hold.position.copy(hb.worldToLocal(mid.getWorldPosition(new THREE.Vector3()))); hb.add(m.hold); }
      // eten brengt hij met zijn linkerhand naar zijn mond
      const hl = rig.bone('hand_l'), midL = rig.bone('middle_01_l'); m.bit = new THREE.Group();
      if (hl) { m.bit.scale.copy(m.hold.scale); if (midL) m.bit.position.copy(hl.worldToLocal(midL.getWorldPosition(new THREE.Vector3()))); hl.add(m.bit); }
      scene.add(rig.root); this.list.push(m);
    }
    this.beds();
  }
  // De slaapplekken liggen vast. Eén houdt de wacht en zit rechtop; de anderen liggen op hun zij, het kind tegen een volwassene aan.
  // Is er een vuurplaats, dan liggen ze in een boog om het vuur, met de buik naar de warmte. Anders liggen ze bij de stam of op de open plek.
  beds(h) {
    const L = this.list, guard = L[1], child = L.find((m) => m.child), lie = L.filter((m) => m !== guard && m !== child);
    if (h) this.hearth = { x: h[0], z: h[1] };   // de vuurplaats verhuist mee met het kamp (zie systems/trek.js)
    const F = this.hearth || (AREA.fire && { x: AREA.fire.hearth[0], z: AREA.fire.hearth[1] });
    const trunk = !F && blockers.find((b) => !b.beast && dist(b, HOME) < 1.2);
    const dir = (a) => [Math.sin(a), Math.cos(a)];
    const plan = (a) => {
      const [ux, uz] = dir(a), [vx, vz] = dir(a + Math.PI / 2), out = [];
      if (F) {
        // om het vuur: a is het midden van de boog
        const R = 2.5, n = lie.length + 1, slots = [...lie.slice(0, 2), guard, ...lie.slice(2)];
        slots.forEach((m, i) => {
          const b = a + (i - (n - 1) / 2) * 52 * RAD, [dx, dz] = dir(b), x = F.x + dx * R, z = F.z + dz * R;
          if (m === guard) { out.push([m, bedAt(x, z, b + Math.PI, 'sit', m.k)]); return; }
          out.push([m, sideBed(x, z, b + Math.PI, i % 2 === 0, m.k)]);
          if (child && m === (lie.find((q) => q.woman) || lie[0])) out.push([child, sideBed(F.x + dx * (R - 0.45), F.z + dz * (R - 0.45), b + Math.PI, i % 2 === 0, child.k)]);
        });
      } else {
        // bij de stam: de waker zit er met zijn rug tegenaan en kijkt naar a; de anderen liggen links en rechts voor hem
        const r0 = trunk ? Math.min(trunk.r, 0.3) + 0.22 : 0, C = trunk || HOME, gx = C.x + ux * r0, gz = C.z + uz * r0;
        out.push([guard, bedAt(gx, gz, a, 'sit', guard.k)]);
        lie.forEach((m, i) => {
          const sg = i % 2 ? -1 : 1, w = 1.05 + Math.floor(i / 2) * 1.1, x = gx + ux * 1.1 + vx * sg * w, z = gz + uz * 1.1 + vz * sg * w, belly = a - sg * Math.PI / 2;
          out.push([m, sideBed(x, z, belly, sg > 0, m.k)]);
          if (child && i === 0) out.push([child, sideBed(x + ux * 0.2 - vx * sg * 0.45, z + uz * 0.2 - vz * sg * 0.45, belly, sg > 0, child.k)]);
        });
      }
      return out;
    };
    // de vlakste kant, vrij van stammen en keien, en niet in het water
    let best = null, bc = 1e9; const a0 = F ? Math.atan2(HOME.x - F.x, HOME.z - F.z) : 0;
    for (let i = 0; i < 16; i++) {
      const a = a0 + i * Math.PI / 8, P = plan(a); let c = F ? (1 - Math.cos(a - a0)) * 0.25 : 0;
      for (const [, b] of P) { c += steep(b.lx, b.lz) * 4 + (height(b.lx, b.lz) < 0.25 ? 9 : 0); for (const k of blockers) if (k !== trunk && !k.beast && !(F && dist(k, F) < 0.1) && dist(k, { x: b.lx, z: b.lz }) < k.r + 0.8) c += 9; }
      if (c < bc) { bc = c; best = P; }
    }
    for (const [m, b] of best) m.bed = b;
    // wie ziek is, zit overdag op zijn eigen plek op de grond
    for (const m of L) m.seat = bedAt(HOME.x + m.spot[0], HOME.z + m.spot[1], Math.atan2(-m.spot[0], -m.spot[1]), 'sit', m.k);
    this.guard = guard;
  }
  nearest(p) { let best = null, bd = 1e9; for (const m of this.list) { const d = dist(m, p); if (d < bd) { bd = d; best = m; } } return { m: best, d: bd }; }
  get sick() { return this.list.find((m) => m.sick > 0); }
  // Na een goede nacht loopt Kem een dag met je mee. Staat hij naast je, dan plukt of snijdt hij ook.
  startFollow() { const k = this.list[1]; if (k.sick > 0) return false; if (DOWN.includes(k.state)) k.after = 'follow'; else k.state = 'follow'; return true; }
  setCarry(m, it) { m.carry = it; m.hold.clear(); if (it) { const h = heldMesh(it); if (h) m.hold.add(h); } }
  // Jij snijdt vlees van een dier: wie kan lopen komt een lap halen en draagt hem naar het kamp.
  fetch(k, game) {
    if (k.fetch || k.meat <= 0 || game.night > 0.25 || dist(k, HOME) > 150) return;
    const m = this.list.filter((q) => q.able && q.sick <= 0 && !q.carry && (q.state === 'idle' || q.state === 'wander' || (q.state === 'out' && !q.job.kill))).sort((a, b) => dist(a, k) - dist(b, k))[0];
    if (!m || !game.dryPath(m, k)) return;
    k.fetch = m; m.state = 'out'; m.job = { x: k.x, z: k.z, kill: k }; m.t = 100;
  }
  // De groep breekt op en loopt in een rij naar het volgende kamp. Wie goed kan lopen gaat voorop, dan het kind, dan de oudste.
  // path: de punten waarlangs ze lopen (het laatste is het nieuwe kamp); fire: de voorste draagt gloeiend hout mee.
  startTrek(path, wait, fire, done) {
    const line = [...this.list].sort((a, b) => (a.able ? 0 : a.child ? 1 : 2) - (b.able ? 0 : b.child ? 1 : 2));
    for (const m of this.list) { if (m.job && m.job.kill && m.job.kill.fetch === m) m.job.kill.fetch = null; this.setCarry(m, null); m.own = false; m.state = 'trek'; m.busy = 0; }
    if (fire) this.setCarry(line[0], 'torch');
    this.trek = { path, i: 0, wait, wait0: wait, line, done }; this.away = false;
  }
  // iedereen staat meteen op zijn plek in het kamp (verdergaan na bewaren, of de groep die je na dagen terugvindt)
  settle() {
    this.trek = null; this.away = false;
    for (const m of this.list) { if (m.state === 'trek') this.setCarry(m, null); m.x = HOME.x + m.spot[0]; m.z = HOME.z + m.spot[1]; m.yaw = Math.atan2(-m.spot[0], -m.spot[1]) + Math.PI; m.speed = 0; m.state = 'idle'; m.t = 3; }
  }
  endTrek() {
    const T = this.trek; if (!T) return;
    this.trek = null; this.away = false;
    for (const m of this.list) { this.setCarry(m, null); m.state = 'toSpot'; }
    if (T.done) T.done();
  }
  helper(p) { const k = this.list[1]; return k.state === 'follow' && !k.carry && dist(k, p) < 9 ? k : null; }

  // Iets aan de groep geven. Geeft terug hoeveel de groep ervan opknapt (of null als ze het niet willen).
  give(it, game) {
    const s = game.state, sick = this.sick, kem = this.list[1];
    // wie het krijgt, komt overeind, pakt het aan en eet: het bitterblad is alleen voor de zieke, de onbekende bes voor wie hem proeft
    for (const m of it === 'leaf' ? [sick].filter(Boolean) : it === 'redberry' && !s.known.has('redberry') ? [kem] : this.list) m.food = it;
    if (it === 'roast') return { gain: 45, text: 'Gebraden vlees! Het is zo zacht dat zelfs Tor en Kleine Ibo het kunnen kauwen. Niemand zegt iets: iedereen eet.' };
    if (it === 'meat') return { gain: 30, text: 'Vlees! Iedereen komt erbij zitten. Kleine Ibo krijgt het eerste stuk.' };
    if (it === 'honey') return { gain: 40, text: 'Honing! Tor lacht zijn laatste tanden bloot. Iedereen likt zijn vingers af, Ibo het langst.' };
    if (it === 'hide') return { gain: 25, text: 'Tor spreidt de huid uit onder de boom en klopt erop. Vannacht ligt Ibo zacht en warm.' };
    if (it === 'waterbag') return { gain: 16, text: 'Tor drinkt met grote slokken. Dan gaat de zak rond: Kem, en Kleine Ibo, die er de laatste druppels uit knijpt.' };
    if (it === 'egg') return { gain: 15, text: 'Ibo tikt het ei open en slurpt het leeg. Hij kijkt je aan: nog een?' };
    if (it === 'bone') return { gain: 18, text: 'Tor legt het bot op een steen en kraakt het open. Het merg wordt eerlijk gedeeld.' };
    if (it === 'fish') return { gain: 28, text: 'Een vis! Kem ruikt eraan, Ibo steekt zijn vinger in de bek. Dan trekt Tor hem open: zacht, vet vlees voor iedereen.' };
    if (it === 'tuber') return { gain: 14, text: 'Tor kauwt de knol voor en geeft Ibo de helft. Taai, maar het vult.' };
    if (it === 'baobab') return { gain: 20, text: 'Tor slaat de harde schil stuk op een steen. Ibo zuigt op de witte brokken en trekt een zuur gezicht. Dan wil hij meer.' };
    if (it === 'fig') return { gain: 10, text: 'Een vijg! Ibo bijt hem doormidden en geeft de andere helft aan Kem.' };
    if (it === 'berry') return { gain: 8, text: 'Ibo propt de bessen in zijn mond en grijnst paars.' };
    if (it === 'leaf') {
      if (!sick) return { gain: null, text: 'Tor ruikt aan het blad en trekt een vies gezicht. Niemand heeft het nu nodig.' };
      sick.sick = 0; s.known.add('leaf'); game.discover('leaf');
      return { gain: 12, text: `${sick.name} kauwt op het bitterblad. Even later zakt de buikpijn.` };
    }
    if (it === 'redberry') {
      if (s.known.has('redberry')) return { gain: null, text: 'Je weet wat die rode bessen doen. Die geef je niet weg.' };
      kem.sick = 150; s.known.add('redberry'); game.discover('redberry');
      return { gain: -5, text: 'Kem eet de rode bessen op… en grijpt even later naar zijn buik. Hij is ziek! Bitterblad groeit bij het water.', bad: true };
    }
    return null;
  }

  update(dt, game) {
    const p = game.player.pos, night = game.night, dHome = dist(p, HOME);
    this.t += dt;
    // kom je van ver terug, dan rent de kleinste je tegemoet
    if (dHome > 32) this.away = true;
    const T = this.trek; if (T) { T.wait -= dt; this.forT = 20; }
    const greet = !T && this.away && dHome < 17 && night < 0.6;
    if (greet) { this.away = false; game.event('home'); }
    // overdag zoekt wie kan lopen zelf eten in de buurt: om de beurt gaat er één op pad
    this.forT -= dt;
    if (this.forT < 0) {
      this.forT = 6;
      const busy = this.list.some((m) => m.state === 'out' || m.state === 'gather' || (m.own && m.carry));
      if (!busy && night < 0.2 && game.danger < 0.5 && game.state.group < 92) {
        const can = this.list.filter((m) => m.able && m.state === 'idle' && m.sick <= 0 && m.busy <= 0 && m.eatT <= 0 && !m.carry && !(m.calling && dist(m, p) < 12) && !(this.point && this.point.m === m && dHome < 14));
        const m = can[Math.floor(Math.random() * can.length)], spot = m && game.foodSpot();
        if (spot) { m.state = 'out'; m.job = spot; m.t = 70; this.forT = 28 + Math.random() * 24; }
      }
    }
    for (const m of this.list) {
      const d = dist(m, p) || 0.01, R = m.rig;
      m.t -= dt; m.busy = Math.max(0, m.busy - dt);
      // eten gekregen: wie staat, pakt het aan en eet; wie ligt, komt eerst overeind
      if (m.food && !DOWN.includes(m.state)) {
        if (d < 14) { m.busy = NO_BITE.includes(m.food) ? 3 : 1.5; m.eatT = NO_BITE.includes(m.food) ? 0 : 6; m.bite = m.food; }
        m.food = null;
      }
      if (m.eatT > 0) {
        m.eatT -= dt;
        if (m.eatT <= 0) { m.bit.clear(); m.bite = null; } else if (m.busy <= 0 && m.bite) { const h = heldMesh(m.bite); if (h) m.bit.add(h); m.bite = null; }
      }
      if (m.sick > 0) { m.sick -= dt; if (m.sick <= 0) game.murmur(`${m.name} is weer opgeknapt. Maar het duurde lang…`, 5); }
      let tx = 0, tz = 0, spd = 0, face = null;
      // wijzen doet hij als je bij hem staat, en alleen naar iets dat niet al voor je voeten ligt
      const P = this.point; let pt = P && P.m === m && m.state === 'idle' && m.busy <= 0 && m.sick <= 0 && d < 8 && Math.hypot(P.x - p.x, P.z - p.z) > 3 ? P : null;
      const sleepy = night > 0.6, eating = m.busy > 0 || m.eatT > 0;
      // waar hij nu hoort te liggen of te zitten: 's nachts op zijn slaapplek, ziek op zijn eigen plek
      const B = sleepy ? m.bed : m.sick > 0 ? m.seat : null;
      if (m.carry && m.state !== 'trek' && dist(m, HOME) < (m.own ? 5 : 11)) { game.event(m.own ? 'gift' : 'kemgift', m.carry); this.setCarry(m, null); m.own = false; }
      if (greet && m.child && m.sick <= 0 && !DOWN.includes(m.state)) { m.state = 'greet'; m.t = 8; }
      switch (m.state) {
        case 'trek': {
          const n = T.line.indexOf(m), end = T.path[T.path.length - 1];
          if (T.wait > 0) { face = { x: end[0], z: end[1] }; if (!n && T.wait < T.wait0 - 1.2) pt = face; break; }   // nog even: ze kijken waar ze heen gaan, en de voorste wijst de weg
          if (!n) {
            // de voorste loopt de punten af, en houdt in als de rij uit elkaar valt
            const q = T.path[T.i], gd = Math.hypot(q[0] - m.x, q[1] - m.z), last = T.line[T.line.length - 1];
            if (gd < (T.i === T.path.length - 1 ? 3 : 2.2)) { if (++T.i >= T.path.length) { this.endTrek(); break; } }
            else { tx = (q[0] - m.x) / gd; tz = (q[1] - m.z) / gd; spd = dist(m, last) > 5 + T.line.length * 2.6 ? 0.7 : 1.85; }
          } else {
            const a = T.line[n - 1], gd = dist(m, a) || 0.01;
            if (gd > 2.1) { tx = (a.x - m.x) / gd; tz = (a.z - m.z) / gd; spd = Math.min(3.2, 0.5 + (gd - 2.1) * 1.6); } else face = { x: end[0], z: end[1] };
          }
          break;
        }
        case 'idle':
          if (B && !eating) { m.state = 'toSpot'; break; }
          if (d < 6 || eating || (m.calling && d < 30)) face = p;
          if (pt) { face = pt; m.t = Math.max(m.t, 1.5); }   // hij wijst: daar moet je zijn
          if (m.t < 0 && !eating && d > 3 && !m.calling) { const a = Math.random() * 6.28, r = 2.5 + Math.random() * 4; m.goal = { x: HOME.x + Math.cos(a) * r, z: HOME.z + Math.sin(a) * r }; m.state = 'wander'; m.t = 9; }
          break;
        case 'wander': {
          const gd = dist(m, m.goal);
          if (gd < 0.5 || m.t < 0 || sleepy || m.calling || (P && P.m === m && d < 8)) { m.state = 'idle'; m.t = 4 + Math.random() * 9; m.fuss = Math.random() < 0.4; } else { tx = (m.goal.x - m.x) / gd; tz = (m.goal.z - m.z) / gd; spd = 1.1 * m.k; }
          break;
        }
        case 'out': {   // op pad: naar een struik of boom met eten, of naar het dier waar jij staat te snijden
          const J = m.job, gd = dist(m, J);
          if (night > 0.25 || m.sick > 0 || m.t < 0 || (game.danger > 0.6 && !J.kill)) { m.state = 'toSpot'; break; }
          if (gd > (J.kill ? 1.9 : 1.3)) { tx = (J.x - m.x) / gd; tz = (J.z - m.z) / gd; spd = (J.kill ? 4.2 : 2.9) * m.k; } else { m.state = 'gather'; m.t = J.kill ? 3.2 : 2.4; }
          break;
        }
        case 'gather':   // plukken, rapen of snijden; daarna ermee naar het kamp
          face = m.job;
          if (m.t < 0) { const it = game.groupTake(m.job); if (it) { this.setCarry(m, it); m.own = true; } m.state = 'toSpot'; }
          break;
        case 'greet':
          if (d < 2.4 || m.t < 0) { m.state = 'idle'; m.t = 6; } else { tx = (p.x - m.x) / d; tz = (p.z - m.z) / d; spd = 3.4 * m.k; }
          break;
        case 'follow':
          if (night > 0.45 || m.sick > 0) { m.state = 'toSpot'; if (dist(m, HOME) > 20) game.murmur('Het wordt donker. Kem loopt terug naar de slaapboom.', 4); break; }
          if (game.danger > 0.55 && dist(m, HOME) > 15) { m.state = 'toSpot'; game.murmur('Kem schrikt en rent terug naar de slaapboom!', 4); break; }
          if (m.busy > 0) { face = p; break; }   // hij staat stil: hij heeft iets gezien
          if (d > 2.6) { tx = (p.x - m.x) / d; tz = (p.z - m.z) / d; spd = Math.min(6.4, 1 + (d - 2.6) * 1.6); } else face = p;
          break;
        case 'toSpot': {
          const G = B || m.seat, gd = dist(m, G);
          if (gd < 0.3) { if (B) { m.state = 'settle'; m.at = B; } else { m.state = 'idle'; m.t = 2 + Math.random() * 4; } } else { tx = (G.x - m.x) / gd; tz = (G.z - m.z) / gd; spd = (gd > 8 ? 4.6 : 1.1) * m.k; }
          break;
        }
        case 'settle': {   // hij staat op zijn plek en draait zich goed
          const A = m.at; m.yaw = turn(m.yaw, A.yaw, dt * 3); m.x += (A.x - m.x) * Math.min(1, dt * 4); m.z += (A.z - m.z) * Math.min(1, dt * 4);
          if (B !== A) { m.state = 'idle'; m.t = 1; break; }
          if (Math.abs(Math.atan2(Math.sin(A.yaw - m.yaw), Math.cos(A.yaw - m.yaw))) < 0.06) { m.x = A.x; m.z = A.z; m.yaw = A.yaw; m.state = 'down'; m.len = m.t = R.actions[A.pose.down].getClip().duration; R.play(A.pose.down, { fade: 0.4, once: true }); }
          break;
        }
        case 'down':   // hij gaat liggen (of zitten)
          if (m.t < 0) { m.state = 'rest'; m.lag = null; }
          break;
        case 'rest': {   // slapen, de wacht houden, of ziek op de grond zitten
          if (m.food) m.wake = true;
          if (B === m.at && !m.wake) { m.lag = null; break; }
          // opstaan doen ze niet allemaal tegelijk
          if (m.lag == null) m.lag = m.wake ? Math.random() * 0.8 : this.list.indexOf(m) * 2.2 + Math.random() * 2;
          m.lag -= dt;
          if (m.lag < 0) { m.state = 'up'; m.wake = false; m.len = m.t = R.actions[m.at.pose.up].getClip().duration / 1.25; R.play(m.at.pose.up, { fade: 0.5, once: true, speed: 1.25 }); }
          break;
        }
        case 'up':
          if (m.t < 0) { m.state = m.after || 'idle'; m.after = null; m.t = 1 + Math.random() * 3; }
          break;
      }
      m.speed += (spd - m.speed) * (1 - Math.exp(-dt * 6));
      if (spd > 0) m.yaw = turn(m.yaw, Math.atan2(tx, tz), dt * 5);
      else if (face) m.yaw = turn(m.yaw, Math.atan2(face.x - m.x, face.z - m.z), dt * 3);
      m.x += Math.sin(m.yaw) * m.speed * dt; m.z += Math.cos(m.yaw) * m.speed * dt;
      // onderweg lopen ze om bomen en keien heen
      if (m.state === 'trek') for (const b of blockers) { const bd = Math.hypot(m.x - b.x, m.z - b.z), r = b.r + 0.45; if (b.r > 0 && bd < r && bd > 0.001) { m.x = b.x + (m.x - b.x) / bd * r; m.z = b.z + (m.z - b.z) / bd * r; } }
      // Wie ligt, ligt met zijn hele lijf op de grond: op een helling helt hij mee.
      const A = m.at, lw = m.state === 'rest' ? 1 : m.state === 'down' ? 1 - Math.max(0, m.t) / m.len : m.state === 'up' ? Math.max(0, m.t) / m.len : 0;
      m.lieW = lw;
      let y = height(m.x, m.z);
      m.g.quaternion.setFromAxisAngle(UP, m.yaw);
      if (lw > 0) {
        const N = A.n, flat = height(A.lx, A.lz) + (N.x * (A.lx - m.x) + N.z * (A.lz - m.z)) / N.y;
        y += (flat - y) * lw; m.g.quaternion.premultiply(tQ.setFromUnitVectors(UP, tN.copy(UP).lerp(N, lw).normalize()));
      }
      m.g.position.set(m.x, y, m.z);
      if (m.calling === 'shiver' && m.speed < 0.2 && !lw) m.g.rotateZ(Math.sin(performance.now() * 0.046) * 0.018);
      if (m.state === 'down' || m.state === 'up') { /* de beweging is gestart bij de overgang en loopt één keer */ }
      else if (m.state === 'rest') R.play(A.pose.loop, { fade: 0.8, speed: A.pose.slow });
      else if (m.speed > 2 * Math.min(1, m.k * 1.3)) R.play('Jog_Fwd_Loop', { fade: 0.25, speed: m.speed / (3 * m.k) });
      else if (m.speed > 0.2) R.play('Walk_Loop', { fade: 0.3, speed: m.speed / (1.25 * m.k) });
      else if (m.busy > 0 || m.state === 'gather') R.play('Interact', { fade: 0.25 });
      else if (m.eatT > 0) R.play('Consume', { fade: 0.3 });   // hij eet wat hij kreeg
      else if (m.calling === 'shiver') R.play('Crouch_Idle_Loop', { fade: 0.6 });   // ineengedoken van de kou
      else if (game.state.group < 15) R.play('Crouch_Idle_Loop', { fade: 0.6 });   // hongerig en slap
      else R.play(m.fuss && !pt ? 'Interact' : 'Idle_Loop', { fade: 0.5, speed: m.fuss && !pt ? 0.5 : 1 });
      R.update(dt);
      // de waker kijkt in het donker langzaam om zich heen
      if (m === this.guard && m.state === 'rest' && sleepy) R.bend(R.bone('head'), UP, Math.sin(this.t * 0.33) * 0.6 + Math.sin(this.t * 0.11) * 0.25);
      const aimed = pt && Math.abs(Math.atan2(Math.sin(Math.atan2(pt.x - m.x, pt.z - m.z) - m.yaw), Math.cos(Math.atan2(pt.x - m.x, pt.z - m.z) - m.yaw))) < 0.5;
      m.pointW += ((aimed ? 1 : 0) - m.pointW) * (1 - Math.exp(-dt * 4));
      if (m.pointW > 0.02 && (pt || m.pointAt)) { if (pt) m.pointAt = { x: pt.x, z: pt.z }; pointArm(R, m.pointAt, m.pointW); }
    }
  }
}
