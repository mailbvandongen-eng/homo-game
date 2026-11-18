import { ERA, AREA } from './eras/index.js';
import * as THREE from '../lib/three.module.js';
import { height } from './world.js';
import { turn } from './animal.js';
import { Rig } from './rig.js';
import { BODY } from './hominin.js';

// De slaapboom: hier wacht je groep. Overdag scharrelen ze rond de stam, 's nachts slapen ze er.
export const HOME = AREA.home;   // de slaapboom van dit gebied
const WHO = ERA.group || [
  { id: 'tor', name: 'Tor', k: 0.99, spot: [2.6, 1.2], grey: true },
  { id: 'kem', name: 'Kem', k: 0.92, spot: [-2.2, 2.4], tint: 0xe8d2c0 },
  { id: 'ibo', name: 'Ibo', k: 0.6, spot: [0.9, -2.8], child: true, tint: 0xfff0e0 },
];
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
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
    this.point = null;   // { m, x, z }: dit groepslid wijst naar die plek (zie systems/missions.js)
    for (const w of WHO) {
      // hetzelfde model als de hoofdpersoon, met een eigen lijf: een kind heeft een groot hoofd en korte benen,
      // een vrouw smallere schouders en geen baard
      const shape = BODY.shape && BODY.shape + (w.child ? '_child' : w.woman ? '_woman' : '');
      const rig = new Rig(A, 'hominin', { scale: BODY.height / 162 * w.k, shape, tall: BODY.height * w.k });
      rig.model.traverse((o) => {
        if (!o.isMesh) return;
        const hair = /beard|hair|transparency/i.test(o.material.name);
        o.material = o.material.clone();
        if (hair && (w.child || (w.woman && /beard/i.test(o.material.name)))) o.visible = false;
        else if (hair && w.grey) o.material.color.setRGB(2.4, 2.4, 2.5);
        else if (!hair && w.tint) o.material.color.multiply(new THREE.Color(w.tint));
        else if (!hair && w.grey) o.material.color.multiplyScalar(0.86);
      });
      const m = { ...w, kind: 'member', rig, g: rig.root, x: HOME.x + w.spot[0], z: HOME.z + w.spot[1], yaw: Math.atan2(-w.spot[0], -w.spot[1]) + Math.PI, speed: 0, state: 'idle', t: 2 + this.list.length * 3, sick: 0, busy: 0, pointW: 0 };
      scene.add(rig.root); this.list.push(m);
    }
  }
  nearest(p) { let best = null, bd = 1e9; for (const m of this.list) { const d = dist(m, p); if (d < bd) { bd = d; best = m; } } return { m: best, d: bd }; }
  get sick() { return this.list.find((m) => m.sick > 0); }
  // Na een goede nacht loopt Kem een dag met je mee. Staat hij naast je, dan plukt of snijdt hij ook.
  startFollow() { const k = this.list[1]; if (k.sick > 0) return false; k.state = 'follow'; return true; }
  helper(p) { const k = this.list[1]; return k.state === 'follow' && !k.carry && dist(k, p) < 9 ? k : null; }

  // Iets aan de groep geven. Geeft terug hoeveel de groep ervan opknapt (of null als ze het niet willen).
  give(it, game) {
    const s = game.state, sick = this.sick, kem = this.list[1];
    for (const m of this.list) m.busy = 2.5;
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
    // kom je van ver terug, dan rent de kleinste je tegemoet
    if (dHome > 32) this.away = true;
    const greet = this.away && dHome < 17 && night < 0.6;
    if (greet) { this.away = false; game.event('home'); }
    for (const m of this.list) {
      const d = dist(m, p) || 0.01, sx = HOME.x + m.spot[0], sz = HOME.z + m.spot[1];
      m.t -= dt; m.busy = Math.max(0, m.busy - dt);
      if (m.sick > 0) { m.sick -= dt; if (m.sick <= 0) game.murmur(`${m.name} is weer opgeknapt. Maar het duurde lang…`, 5); }
      let tx = 0, tz = 0, spd = 0, face = null;
      // wijzen doet hij als je bij hem staat, en alleen naar iets dat niet al voor je voeten ligt
      const P = this.point, pt = P && P.m === m && m.state === 'idle' && m.busy <= 0 && m.sick <= 0 && d < 8 && Math.hypot(P.x - p.x, P.z - p.z) > 3 ? P : null;
      const sleepy = night > 0.6;
      if (m.carry && dist(m, HOME) < 11) { game.event('kemgift', m.carry); m.carry = null; }
      if (greet && m.child && m.sick <= 0) { m.state = 'greet'; m.t = 8; }
      switch (m.state) {
        case 'idle':
          if (sleepy || m.sick > 0) { m.state = 'toSpot'; break; }
          if (d < 6 || (m.calling && d < 30)) face = p;
          if (pt) { face = pt; m.t = Math.max(m.t, 1.5); }   // hij wijst: daar moet je zijn
          if (m.t < 0 && m.busy <= 0 && d > 3 && !m.calling) { const a = Math.random() * 6.28, r = 2.5 + Math.random() * 4; m.goal = { x: HOME.x + Math.cos(a) * r, z: HOME.z + Math.sin(a) * r }; m.state = 'wander'; m.t = 9; }
          break;
        case 'wander': {
          const gd = dist(m, m.goal);
          if (gd < 0.5 || m.t < 0 || sleepy || m.calling || (P && P.m === m && d < 8)) { m.state = 'idle'; m.t = 4 + Math.random() * 9; m.fuss = Math.random() < 0.4; } else { tx = (m.goal.x - m.x) / gd; tz = (m.goal.z - m.z) / gd; spd = 1.1 * m.k; }
          break;
        }
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
          const gd = Math.hypot(sx - m.x, sz - m.z);
          if (gd < 0.4) m.state = 'rest'; else { tx = (sx - m.x) / gd; tz = (sz - m.z) / gd; spd = (gd > 8 ? 4.6 : 1.1) * m.k; }
          break;
        }
        case 'rest':   // slapen, of ziek op de grond zitten
          if (!sleepy && m.sick <= 0) { m.state = 'idle'; m.t = 2 + Math.random() * 4; }
          break;
      }
      m.speed += (spd - m.speed) * (1 - Math.exp(-dt * 6));
      if (spd > 0) m.yaw = turn(m.yaw, Math.atan2(tx, tz), dt * 5);
      else if (face) m.yaw = turn(m.yaw, Math.atan2(face.x - m.x, face.z - m.z), dt * 3);
      m.x += Math.sin(m.yaw) * m.speed * dt; m.z += Math.cos(m.yaw) * m.speed * dt;
      m.g.position.set(m.x, height(m.x, m.z), m.z); m.g.rotation.y = m.yaw;
      m.g.rotation.z = m.calling === 'shiver' && m.speed < 0.2 ? Math.sin(performance.now() * 0.046) * 0.018 : 0;
      const R = m.rig;
      if (m.state === 'rest' && sleepy) R.freeze('Death01', 0.97);
      else if (m.state === 'rest') R.play('Crouch_Idle_Loop', { fade: 0.5 });
      else if (m.speed > 2) R.play('Jog_Fwd_Loop', { fade: 0.25, speed: m.speed / (3 * m.k) });
      else if (m.speed > 0.2) R.play('Walk_Loop', { fade: 0.3, speed: m.speed / (1.25 * m.k) });
      else if (m.busy > 0) R.play('Interact', { fade: 0.25 });
      else if (m.calling === 'shiver') R.play('Crouch_Idle_Loop', { fade: 0.6 });   // ineengedoken van de kou
      else if (game.state.group < 15) R.play('Crouch_Idle_Loop', { fade: 0.6 });   // hongerig en slap
      else R.play(m.fuss && !pt ? 'Interact' : 'Idle_Loop', { fade: 0.5, speed: m.fuss && !pt ? 0.5 : 1 });
      R.update(dt);
      const aimed = pt && Math.abs(Math.atan2(Math.sin(Math.atan2(pt.x - m.x, pt.z - m.z) - m.yaw), Math.cos(Math.atan2(pt.x - m.x, pt.z - m.z) - m.yaw))) < 0.5;
      m.pointW += ((aimed ? 1 : 0) - m.pointW) * (1 - Math.exp(-dt * 4));
      if (m.pointW > 0.02 && (pt || m.pointAt)) { if (pt) m.pointAt = { x: pt.x, z: pt.z }; pointArm(R, m.pointAt, m.pointW); }
    }
  }
}
