import * as THREE from '../lib/three.module.js';

// Een model omvormen naar de maten van een andere soort, een jong of een ander lijf.
// Het model blijft hetzelfde bestand (dezelfde huid, dezelfde bewegingen); alleen de verhoudingen veranderen:
// langere of kortere botten, een smaller of breder lijf, een andere schedel. Dat gebeurt één keer bij het laden.
//
// Een vorm (shape) is een lijstje gegevens:
//   key:    naam, om het resultaat te bewaren
//   bones:  [[/naam/, [x, y, z]], ...]  hoeveel een bot groeit (en de huid eromheen), langs de assen van het model
//           in rust (x = opzij, y = omhoog, z = naar voren). Latere regels gaan voor.
//   reach:  [[/naam/, f], ...]  de afstand van een bot tot het bot waar het aan hangt, zonder dat de huid dikker
//           of dunner wordt (een slang korter maken en toch even dik laten)
//   sculpt: [{ bone, at: [x, y, z], r, move: [x, y, z], scale: [x, y, z] }, ...]  plaatselijk duwen of krimpen:
//           een bol met straal r rond een punt (gemeten vanaf het bot), met een zachte rand.
//           Met only: /naam/ alleen de huid die aan dat bot vastzit (de slagtand wel, de slurf ernaast niet).
//           Met to: [x, y, z] en by: de huid binnen r van de lijn at→to wordt langs die lijn uitgerekt (by = 2: twee keer zo lang)
//           Met pinch: de huid wordt naar de lijn toe geknepen, na die afstand tot een punt (hoorns laten verdwijnen)
//           Met wave: [x, y, z] en waves: de lijn krijgt een bocht (waves = 1: één boog, 2: een S, zoals de hoorns van een impala)
//   ground: { hip: /pelvis/, foot: /ball_l/ }  houdt de voeten op de grond als de benen langer of korter worden
const V = () => new THREE.Vector3();
const GEO = new Map();     // omgevormde vormen, per (oorspronkelijke vorm, sleutel)
const CLIPS = new Map();   // aangepaste bewegingen, per (beweging, sleutel)

function find(list, name) { let hit = null; for (const [re, v] of list) if (re.test(name)) hit = v; return hit; }

// Het plaatselijke duwen: geeft het nieuwe punt terug
function sculptPoint(p, ops, name) {
  for (const o of ops) {
    if (o.only && !o.only.test(name)) continue;
    if (o.u) {   // rekken langs een lijn: wat verder van het begin ligt, schuift verder op
      const dx = p.x - o.c.x, dy = p.y - o.c.y, dz = p.z - o.c.z, t = dx * o.u.x + dy * o.u.y + dz * o.u.z; if (t <= 0) continue;
      const d = Math.sqrt(Math.max(0, dx * dx + dy * dy + dz * dz - t * t)) / o.r; if (d >= 1) continue;
      const e = d < 0.6 ? 1 : 1 - (d - 0.6) / 0.4, f = e * e * (3 - 2 * e) * t * (o.by - 1);
      if (o.pinch) {   // naar de lijn toe knijpen: verderop steeds smaller, tot een punt
        const g = 1 - e * e * (3 - 2 * e) * Math.min(1, t / o.pinch);
        p.x = o.c.x + o.u.x * t + (dx - o.u.x * t) * g; p.y = o.c.y + o.u.y * t + (dy - o.u.y * t) * g; p.z = o.c.z + o.u.z * t + (dz - o.u.z * t) * g;
      }
      p.x += o.u.x * f; p.y += o.u.y * f; p.z += o.u.z * f;
      if (o.wave) { const w = e * e * (3 - 2 * e) * Math.sin(Math.PI * o.waves * Math.min(1.1, (t + f) / (o.len * o.by))); p.x += o.wave[0] * w; p.y += o.wave[1] * w; p.z += o.wave[2] * w; }
      continue;
    }
    const d2 = p.distanceToSquared(o.c) / (o.r * o.r); if (d2 >= 1) continue;
    const f = (1 - d2) * (1 - d2);
    if (o.scale) { p.x = o.c.x + (p.x - o.c.x) * (1 + (o.scale[0] - 1) * f); p.y = o.c.y + (p.y - o.c.y) * (1 + (o.scale[1] - 1) * f); p.z = o.c.z + (p.z - o.c.z) * (1 + (o.scale[2] - 1) * f); }
    if (o.move) { p.x += o.move[0] * f; p.y += o.move[1] * f; p.z += o.move[2] * f; }
  }
  return p;
}

// model: een verse kopie van een geladen model (nog niet verplaatst of geschaald). Geeft terug wat er veranderd is.
export function applyShape(model, spec) {
  model.updateMatrixWorld(true);
  const nodes = [], byName = {};
  model.traverse((o) => { nodes.push(o); if (o.isBone) byName[o.name] = o; });
  const bone = (re) => nodes.find((o) => o.isBone && re.test(o.name));
  const info = new Map();
  for (const n of nodes) {
    const W = n.matrixWorld.clone(), o = V().setFromMatrixPosition(W);
    const own = n.isBone ? find(spec.bones || [], n.name) : null;
    info.set(n, { W, o, o1: o.clone(), o2: o.clone(), s: own || null, f: (n.isBone && find(spec.reach || [], n.name)) || 1 });
  }
  // wat geen eigen maat heeft, groeit mee met waar het aan hangt? Nee: alleen tussenstukken zonder eigen plek (geen bot) erven
  for (const n of nodes) { const I = info.get(n); if (!I.s) I.s = !n.isBone && n.parent && info.get(n.parent) ? info.get(n.parent).s : [1, 1, 1]; }

  // 1. plaatselijk duwen (in het oorspronkelijke model)
  const ops = (spec.sculpt || []).map((s) => {
    const b = bone(s.bone); if (!b) throw new Error('vorm ' + spec.key + ': bot ontbreekt ' + s.bone);
    const c = info.get(b).o.clone().add(V().fromArray(s.at));
    const line = s.to ? info.get(b).o.clone().add(V().fromArray(s.to)).sub(c) : null;
    return { c, r: s.r, move: s.move, scale: s.scale, only: s.only, root: b, by: s.by === undefined ? 1 : s.by, u: line && line.clone().normalize(), len: line ? line.length() : 0, wave: s.wave, waves: s.waves || 1, pinch: s.pinch };
  });
  if (ops.length) {
    const under = new Set(); for (const o of ops) o.root.traverse((c) => { if (c !== o.root) under.add(c); });
    for (const n of under) sculptPoint(info.get(n).o1, ops, n.name);
  }
  // 2. botten langer, korter, dikker, dunner: de plek van elk onderdeel opnieuw uitrekenen vanaf de wortel
  let k = 1, hip = null;
  const place = () => {
    for (const n of nodes) {   // traverse gaat van boven naar beneden: de ouder is altijd al geweest
      const I = info.get(n), P = n.parent && info.get(n.parent);
      if (!P) continue;
      if (n === hip) { I.o2.copy(I.o1).multiplyScalar(k); continue; }
      I.o2.copy(I.o1).sub(P.o1).multiply(V().fromArray(P.s)).multiplyScalar(I.f).add(P.o2);
    }
  };
  place();
  if (spec.ground) {
    hip = bone(spec.ground.hip); const foot = bone(spec.ground.foot);
    if (!hip || !foot) throw new Error('vorm ' + spec.key + ': heup of voet ontbreekt');
    const was = info.get(hip).o.y - info.get(foot).o.y, now = info.get(hip).o2.y - info.get(foot).o2.y;
    const sole = info.get(foot).o.y;   // zo hoog zit het voetbot boven de grond; dat blijft zo
    k = (now + sole * (spec.ground.sole || 1)) / (was + sole);
    place();
  }
  // 3. de vorm zelf (één keer per soort; daarna delen alle dieren van die soort hem)
  const meshes = nodes.filter((o) => o.isSkinnedMesh);
  let top = -Infinity, low = Infinity;
  for (const m of meshes) {
    const id = m.geometry.uuid + '|' + spec.key;
    let hit = GEO.get(id);
    if (!hit) {
      const bones = m.skeleton.bones, C = bones.map((b, j) => info.get(b).W.clone().multiply(m.skeleton.boneInverses[j]).multiply(m.bindMatrix));
      const Cn = C.map((c) => new THREE.Matrix3().getNormalMatrix(c));
      const g = m.geometry.clone(), pos = g.attributes.position, nor = g.attributes.normal, si = g.attributes.skinIndex, sw = g.attributes.skinWeight;
      const inv = m.bindMatrix.clone().invert(), invN = new THREE.Matrix3().getNormalMatrix(inv);
      const p = V(), q = V(), n = V(), nn = V(), acc = V(), t = V(), a = V(), b = V(), e1 = V(), e2 = V();
      const J = [0, 0, 0, 0], Wt = [0, 0, 0, 0];
      let hi = -Infinity, lo = Infinity;
      for (let i = 0; i < pos.count; i++) {
        let sum = 0;
        for (let c = 0; c < 4; c++) { J[c] = si.getComponent(i, c); Wt[c] = sw.getComponent(i, c); sum += Wt[c]; }
        if (sum <= 0) { Wt[0] = 1; sum = 1; }
        // rustpunt in de ruimte van het model
        p.set(0, 0, 0); n.set(0, 0, 0);
        for (let c = 0; c < 4; c++) {
          if (!Wt[c]) continue;
          p.addScaledVector(q.fromBufferAttribute(pos, i).applyMatrix4(C[J[c]]), Wt[c] / sum);
          if (nor) n.addScaledVector(q.fromBufferAttribute(nor, i).applyMatrix3(Cn[J[c]]), Wt[c] / sum);
        }
        n.normalize();
        if (ops.length) {
          let best = 0; for (let c = 1; c < 4; c++) if (Wt[c] > Wt[best]) best = c;
          const name = bones[J[best]].name;
          // de normaal meedraaien: twee raaklijnen meeduwen en opnieuw kruisen
          if (nor) {
            e1.set(1, 0, 0); if (Math.abs(n.x) > 0.9) e1.set(0, 1, 0);
            a.crossVectors(n, e1).normalize(); b.crossVectors(n, a);
            const eps = 0.002 * (ops[0].r || 1);
            e1.copy(p).addScaledVector(a, eps); e2.copy(p).addScaledVector(b, eps);
            sculptPoint(e1, ops, name); sculptPoint(e2, ops, name); sculptPoint(p, ops, name);
            nn.crossVectors(e1.sub(p), e2.sub(p)); if (nn.lengthSq() > 0) n.copy(nn.normalize());
          } else sculptPoint(p, ops, name);
        }
        acc.set(0, 0, 0); nn.set(0, 0, 0);
        for (let c = 0; c < 4; c++) {
          if (!Wt[c]) continue;
          const I = info.get(bones[J[c]]), s = I.s;
          t.copy(p).sub(I.o1); t.x *= s[0]; t.y *= s[1]; t.z *= s[2]; t.add(I.o2);
          acc.addScaledVector(t, Wt[c] / sum);
          nn.x += n.x / s[0] * Wt[c]; nn.y += n.y / s[1] * Wt[c]; nn.z += n.z / s[2] * Wt[c];
        }
        if (acc.y > hi) hi = acc.y; if (acc.y < lo) lo = acc.y;
        acc.applyMatrix4(inv); pos.setXYZ(i, acc.x, acc.y, acc.z);
        if (nor) { nn.applyMatrix3(invN).normalize(); nor.setXYZ(i, nn.x, nn.y, nn.z); }
      }
      pos.needsUpdate = true; if (nor) nor.needsUpdate = true;
      g.boundingBox = null; g.boundingSphere = null;
      hit = { g, hi, lo }; GEO.set(id, hit);
    }
    m.geometry = hit.g; top = Math.max(top, hit.hi); low = Math.min(low, hit.lo);
  }
  // 4. het skelet op zijn nieuwe plek
  const track = new Map();   // per onderdeel: hoe een verplaatsing uit een beweging meeverandert
  const M = new THREE.Matrix4(), Pinv = new THREE.Matrix4();
  for (const n of nodes) {
    const I = info.get(n); I.W2 = I.W.clone().setPosition(I.o2);
  }
  for (const n of nodes) {
    const I = info.get(n), P = n.parent && info.get(n.parent); if (!P || n === model) continue;
    if (I.o2.distanceToSquared(I.o) < 1e-12 && P.o2.distanceToSquared(P.o) < 1e-12 && P.s.every((x) => x === 1) && I.f === 1) continue;
    Pinv.copy(P.W2).invert(); M.multiplyMatrices(Pinv, I.W2);
    const old = n.position.clone(); n.position.setFromMatrixPosition(M);
    // verplaatsing in een beweging: p' = A·p + b
    const R = new THREE.Matrix3().setFromMatrix4(P.W), Ri = R.clone().invert();
    const sc = n === hip ? [k, k, k] : P.s.map((x) => x * I.f);
    const A = Ri.clone().multiply(new THREE.Matrix3().set(sc[0], 0, 0, 0, sc[1], 0, 0, 0, sc[2])).multiply(R);
    const bq = n.position.clone().sub(old.clone().applyMatrix3(A));
    track.set(n.name, { A, b: bq });
  }
  for (const m of meshes) {
    const sk = m.skeleton;
    sk.boneInverses = sk.bones.map((b) => info.get(b).W2.clone().invert());
    if (sk.boneTexture) { sk.boneTexture.dispose(); sk.boneTexture = null; }
  }
  model.updateMatrixWorld(true);
  return { key: spec.key, track, top, low, height: top - low };
}

// Bewegingen die een onderdeel verplaatsen (de heup die op en neer gaat) moeten mee met de nieuwe maten.
export function shapeClips(clips, shaped) {
  return clips.map((clip) => {
    const id = clip.uuid + '|' + shaped.key;
    let out = CLIPS.get(id);
    if (!out) {
      let changed = false;
      const tracks = clip.tracks.map((t) => {
        const m = /^(.*)\.position$/.exec(t.name), T = m && shaped.track.get(m[1]);
        if (!T) return t;
        const c = t.clone(), v = c.values, p = V();
        for (let i = 0; i < v.length; i += 3) { p.set(v[i], v[i + 1], v[i + 2]).applyMatrix3(T.A).add(T.b); v[i] = p.x; v[i + 1] = p.y; v[i + 2] = p.z; }
        changed = true; return c;
      });
      out = changed ? new THREE.AnimationClip(clip.name, clip.duration, tracks, clip.blendMode) : clip;
      CLIPS.set(id, out);
    }
    return out;
  });
}
