import * as THREE from '../lib/three.module.js';
import { SkeletonUtils } from '../lib/three-addons.js';
import { height, WALK, WIND, rng, mergeStatic } from './world.js';

const R = rng(99);

// Een zacht rond lichtvlekje of een sterretje als textuur
function dotTexture(star) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(star ? 0.12 : 0.35, 'rgba(255,250,230,0.8)'); grd.addColorStop(1, 'rgba(255,240,200,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  if (star) { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(32, 2); g.lineTo(35, 29); g.lineTo(62, 32); g.lineTo(35, 35); g.lineTo(32, 62); g.lineTo(29, 35); g.lineTo(2, 32); g.lineTo(29, 29); g.closePath(); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const STAR = dotTexture(true), DOT = dotTexture(false);

// ---------- glinsteringen bij dingen die je kunt pakken, en halo's bij de zintuigen ----------
export class Glints {
  constructor(scene, things) {
    this.items = [];
    for (const t of things) this.add(scene, t);
  }
  add(scene, t) {
    const glint = new THREE.Sprite(new THREE.SpriteMaterial({ map: STAR, color: 0xfff4d0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: DOT, color: 0xfff0b0, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, fog: false, toneMapped: false }));
    halo.renderOrder = 5;
    scene.add(glint, halo);
    this.items.push({ t, glint, halo, phase: this.items.length * 1.7 });
  }
  update(t, player, senses, known, k = 1) {
    for (const g of this.items) {
      const th = g.t, gone = th.gone || (th.bush && th.bush.left <= 0);
      const d = Math.hypot(th.x - player.pos.x, th.z - player.pos.z);
      const y = height(th.x, th.z) + (th.bush ? 0.9 : 0.35);
      // af en toe een korte schittering, alleen als je in de buurt bent
      const tw = Math.pow(Math.max(0, Math.sin(t * 1.3 + g.phase)), 14);
      // wat je missie nu vraagt, zie je van veel verder schitteren
      const far = th.wanted ? 60 : 16;
      g.glint.visible = !gone && d < far && !senses;
      g.glint.position.set(th.x, y, th.z);
      g.glint.scale.setScalar((0.25 + tw * 0.7) * (th.wanted ? 1 + Math.min(2.2, d / 14) : 1));
      g.glint.material.opacity = 0.2 + tw * 0.8;
      // zintuigen: alles in de buurt licht op; wat je al kent in zijn eigen kleur
      g.halo.visible = !gone && senses && d < 45;
      if (g.halo.visible) {
        const k = known.get(th.item);
        g.halo.material.color.set(k === 'good' ? 0x9cff8a : k === 'bad' ? 0xff6a5a : 0xfff0b0);
        g.halo.position.set(th.x, y, th.z);
        g.halo.scale.setScalar((th.bush ? 1.7 : 1.0) * (1 + Math.sin(t * 3 + g.phase) * 0.12));
        g.halo.material.opacity = 0.55 * k;
      }
    }
  }
}

// ---------- stofjes die in het zonlicht zweven ----------
export class Motes {
  constructor(scene) {
    const n = 220, p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { p[i * 3] = (R() - 0.5) * 40; p[i * 3 + 1] = R() * 8; p[i * 3 + 2] = (R() - 0.5) * 40; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    this.pts = new THREE.Points(g, new THREE.PointsMaterial({ map: DOT, size: 0.12, color: 0xffe8b0, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.pts.frustumCulled = false;
    scene.add(this.pts);
  }
  update(dt, t, focus, night) {
    const a = this.pts.geometry.attributes.position, p = a.array;
    for (let i = 0; i < a.count; i++) {
      let x = p[i * 3] + WIND.x * dt * 0.6 + Math.sin(t * 0.7 + i) * dt * 0.15, y = p[i * 3 + 1] + Math.sin(t * 0.5 + i * 2) * dt * 0.1, z = p[i * 3 + 2] + WIND.z * dt * 0.6;
      // blijf rond de speler
      if (x - focus.x > 20) x -= 40; if (x - focus.x < -20) x += 40;
      if (z - focus.z > 20) z -= 40; if (z - focus.z < -20) z += 40;
      const gy = height(x, z);
      if (y < gy + 0.2 || y > gy + 8) y = gy + 0.5 + R() * 6;
      p[i * 3] = x; p[i * 3 + 1] = y; p[i * 3 + 2] = z;
    }
    a.needsUpdate = true;
    this.pts.material.opacity = 0.55 * (1 - night * 0.8);
  }
}

// ---------- kleine vogeltjes op de grond die opvliegen als je eraan komt ----------
export class Birds {
  constructor(scene, spots) {
    const body = new THREE.MeshLambertMaterial({ color: 0x6a5a4a, flatShading: true }), wingM = new THREE.MeshLambertMaterial({ color: 0x8a4a2a, flatShading: true, side: THREE.DoubleSide });
    this.flocks = spots.map(([x, z]) => {
      const birds = [];
      for (let i = 0; i < 5; i++) {
        const g = new THREE.Group();
        const tmp = new THREE.Group();
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4), body); b.scale.set(0.8, 0.8, 1.4); tmp.add(b);
        const h = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), body); h.position.set(0, 0.05, 0.1); tmp.add(h);
        const bm = mergeStatic(tmp); bm.material = body; bm.castShadow = false; bm.receiveShadow = false; g.add(bm);   // lijf en kop in één stuk
        const wings = [];
        for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.1), wingM); w.position.x = s * 0.11; w.rotation.x = -Math.PI / 2; const piv = new THREE.Group(); piv.add(w); g.add(piv); wings.push(piv); }
        scene.add(g);
        birds.push({ g, wings, ox: (R() - 0.5) * 3, oz: (R() - 0.5) * 3, hop: R() * 5, yaw: R() * 6 });
      }
      return { x, z, birds, state: 'ground', t: 0, dir: new THREE.Vector3() };
    });
  }
  update(dt, t, player, sound) {
    for (const f of this.flocks) {
      const d = Math.hypot(player.pos.x - f.x, player.pos.z - f.z);
      if (f.state === 'ground' && d < (player.sneaking ? 3.5 : 7) && !player.hiddenFrom(f.x, f.z)) {
        f.state = 'fly'; f.t = 0; sound.from(f).flutter();
        f.dir.set(f.x - player.pos.x, 0, f.z - player.pos.z).normalize();
      }
      if (f.state === 'fly') {
        f.t += dt;
        if (f.t > 6) {
          // ergens verderop weer landen
          f.x = THREE.MathUtils.clamp(f.x + f.dir.x * 30, -WALK + 10, WALK - 10); f.z = THREE.MathUtils.clamp(f.z + f.dir.z * 30, -WALK + 10, WALK - 10);
          f.state = 'ground';
        }
      }
      const gy = height(f.x, f.z);
      // ver weg zie je ze toch niet: niet tekenen
      const show = d < 32;
      for (const b of f.birds) b.g.visible = show;
      if (!show) continue;
      for (const [i, b] of f.birds.entries()) {
        if (f.state === 'ground') {
          b.hop -= dt;
          if (b.hop < 0) { b.hop = 0.5 + R() * 2.5; b.ox += (R() - 0.5) * 0.4; b.oz += (R() - 0.5) * 0.4; b.yaw = R() * 6.28; }
          const x = f.x + b.ox, z = f.z + b.oz;
          b.g.position.set(x, height(x, z) + 0.06 + (b.hop > 0.35 ? 0 : Math.sin(b.hop / 0.35 * Math.PI) * 0.08), z);
          b.g.rotation.set(0, b.yaw, 0);
          b.wings.forEach((w, k) => { w.rotation.z = (k ? -1 : 1) * 1.2; });
        } else {
          const s = f.t, x = f.x + b.ox + f.dir.x * s * 5 + Math.sin(s * 2 + i) * 0.6, z = f.z + b.oz + f.dir.z * s * 5 + Math.cos(s * 2 + i) * 0.6;
          b.g.position.set(x, gy + Math.min(8, s * 3.5) + Math.sin(s * 4 + i) * 0.3, z);
          b.g.rotation.set(0, Math.atan2(f.dir.x, f.dir.z), 0);
          b.wings.forEach((w, k) => { w.rotation.z = (k ? -1 : 1) * Math.sin(t * 40 + i) * 0.9; });
        }
      }
    }
  }
}

// ---------- vlinders bij de struiken ----------
// Drie soorten. Elk is een scan van een echte, geprepareerde vlinder, vastgemaakt aan het skelet van een geanimeerde monarchvlinder
// (zie assets/CREDITS.md): vliegen, landen, zitten en opvliegen zijn de bewegingen van dat model, niet van ons.
// Ze fladderen om hun struik en gaan er af en toe op zitten. Kom je dichtbij, dan vliegen ze op.
// Alleen de vlinders dicht bij je krijgen een model: verder weg zie je ze toch niet.
const KINDS = [['bf_monarch', 0.15], ['bf_citrus', 0.19], ['bf_witje', 0.12]];   // model en spanwijdte (ruim twee keer echt: anders zie je ze niet)
const BF_SPAN = 3.27, BF_MAX = 10;   // spanwijdte van het model zelf · zoveel vlinders tegelijk
const BF_CLIPS = { fly: 'Flight_Loop', land: 'Landing_InPlace', sit: 'Perched_Idle', up: 'Takeoff_InPlace' };
export class Butterflies {
  // spots: [x, z, struik]: de vlinder zoekt een echt takje of blad van die struik om op te zitten; vindt hij niets, dan zit hij op de grond ernaast
  constructor(scene, spots, A) {
    this.list = []; this.scene = scene; this.A = A; this.shown = 0; this.lastT = 0;
    const ray = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0), from = new THREE.Vector3();
    for (const [x, z, g] of spots) {
      if (g) g.updateMatrixWorld(true);
      for (let k = 0; k < 2; k++) {
        const a = R() * 6.28, ground = { x: x + Math.cos(a) * 0.7, z: z + Math.sin(a) * 0.7 };
        let perch = { ...ground, y: height(ground.x, ground.z) + 0.02 };
        for (let i = 0; g && i < 8; i++) {
          const px = x + (R() - 0.5) * 0.7, pz = z + (R() - 0.5) * 0.7;
          ray.set(from.set(px, height(x, z) + 4, pz), down);
          const hit = ray.intersectObject(g, true)[0];
          if (hit && hit.point.y > height(px, pz) + 0.25) { perch = { x: px, y: hit.point.y + 0.015, z: pz }; break; }
        }
        this.list.push({ x, z, perch, kind: this.list.length % KINDS.length, ph: R() * 10, sp: 0.6 + R() * 0.5, sit: 0, k: 0, t: 4 + R() * 14, px: x, py: 0, pz: z, yaw: R() * 6.28, e: null });
      }
    }
    // de bewegingen horen bij het skelet: alle soorten delen ze
    const all = A.anims[KINDS[0][0]] || [];
    this.clips = Object.fromEntries(Object.entries(BF_CLIPS).map(([k, n]) => [k, all.find((c) => c.name.includes(n))]));
    for (const [name] of KINDS) A.models[name].traverse((o) => { if (o.isMesh) { o.material.side = THREE.DoubleSide; o.material.roughness = 1; o.material.metalness = 0; } });
    this.free = KINDS.map(() => []); this.near = [];
  }
  // een model uit de voorraad, of een nieuw
  take(kind) {
    const e = this.free[kind].pop(); if (e) { e.g.visible = true; return e; }
    const [name, span] = KINDS[kind], m = SkeletonUtils.clone(this.A.models[name]), g = new THREE.Group();
    m.rotation.y = Math.PI / 2; m.scale.setScalar(span / BF_SPAN); g.add(m); this.scene.add(g);   // de kop van het model wijst naar +x, in het spel naar -z
    m.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
    const mixer = new THREE.AnimationMixer(m), acts = {};
    for (const [k, c] of Object.entries(this.clips)) if (c) { acts[k] = mixer.clipAction(c); if (k === 'land' || k === 'up') { acts[k].setLoop(THREE.LoopOnce); acts[k].clampWhenFinished = true; } }
    return { g, mixer, acts, cur: null, ct: 0 };
  }
  play(e, name, fade = 0.15) {
    if (e.cur === name || !e.acts[name]) return;
    const a = e.acts[name], old = e.acts[e.cur]; a.reset().play();
    if (old && fade) a.crossFadeFrom(old, fade); else if (old) old.stop();
    e.cur = name; e.ct = 0;
  }
  update(t, night, focus) {
    const dt = Math.min(0.1, Math.max(0, t - this.lastT)); this.lastT = t;
    const near = this.near; near.length = 0;
    if (night < 0.5) for (const b of this.list) {
      const far = Math.abs(b.x - focus.x) + Math.abs(b.z - focus.z);
      if (far > 40) continue;
      // vliegen en zitten wisselen elkaar af; wie te dichtbij komt, jaagt de vlinder op
      b.t -= dt;
      const close = Math.hypot(b.px - focus.x, b.pz - focus.z) < 1.6;
      if (b.sit > 0 && (b.t <= 0 || close)) { b.sit = 0; b.t = 9 + R() * 14; }
      else if (b.sit === 0 && b.t <= 0 && !close) { b.sit = 0.01; b.t = 6 + R() * 9; }
      const s = t * b.sp + b.ph;
      const fx = b.x + Math.sin(s * 0.9) * 1.6 + Math.sin(s * 2.3) * 0.4, fz = b.z + Math.cos(s * 0.7) * 1.6, fy = height(fx, fz) + 0.8 + Math.sin(s * 3.1) * 0.35;
      // k: 0 = op zijn vliegbaan, 1 = op zijn zitplek; hij glijdt ernaartoe en er weer vandaan
      b.k = b.sit > 0 ? Math.min(1, b.k + dt / 1.6) : Math.max(0, b.k - dt / 1.1);
      if (b.sit > 0) b.sit = Math.max(0.01, b.k);
      const landed = b.sit >= 1, k = b.k * b.k * (3 - 2 * b.k);
      const x = fx + (b.perch.x - fx) * k, y = fy + (b.perch.y - fy) * k, z = fz + (b.perch.z - fz) * k;
      if (!landed && dt > 0 && Math.hypot(x - b.px, z - b.pz) > 0.001) b.yaw = Math.atan2(b.px - x, b.pz - z);
      b.px = x; b.py = y; b.pz = z; b.d = Math.hypot(x - focus.x, z - focus.z);
      if (b.d < 30) near.push(b);
    }
    // de dichtstbijzijnde krijgen een model, de rest geeft het zijne terug
    near.sort((p, q) => p.d - q.d); near.length = Math.min(near.length, BF_MAX);
    for (const b of this.list) if (b.e && !near.includes(b)) { b.e.g.visible = false; b.e.mixer.stopAllAction(); b.e.cur = null; this.free[b.kind].push(b.e); b.e = null; }
    for (const b of near) {
      const landed = b.sit >= 1, fresh = !b.e, e = b.e || (b.e = this.take(b.kind));
      if (fresh) this.play(e, landed ? 'sit' : 'fly', 0);
      else if (b.sit === 0) { if (e.cur === 'sit' || e.cur === 'land') this.play(e, 'up', 0.08); else if (e.cur === 'up' && e.ct > 0.55) this.play(e, 'fly', 0.12); }
      else if (b.k > 0.7 && e.cur === 'fly') this.play(e, 'land', 0.2);
      else if (e.cur === 'land' && e.ct > 1.3) this.play(e, 'sit', 0.25);
      else if (e.cur === 'up') this.play(e, 'fly', 0.12);
      e.ct += dt; e.mixer.update(dt * (e.cur === 'fly' ? 0.8 + b.sp * 0.3 : 1));
      e.g.position.set(b.px, b.py, b.pz); e.g.rotation.set(0.15 * (1 - b.k), b.yaw, 0, 'YXZ');
    }
    this.shown = near.length;
  }
}

// ---------- sporen, wind en geur: alleen zichtbaar met je zintuigen ----------
export class Senses {
  constructor(scene) {
    // hoefafdrukken van de kudde
    this.max = 500; this.n = 0;
    const geo = new THREE.CircleGeometry(0.09, 6); geo.rotateX(-Math.PI / 2);
    this.prints = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0xfff0b0, transparent: true, opacity: 0.85, depthWrite: false, fog: false, toneMapped: false }), this.max);
    this.prints.count = 0; this.prints.frustumCulled = false; this.prints.visible = false; this.prints.renderOrder = 4;
    scene.add(this.prints);
    this.dummy = new THREE.Object3D(); this.last = new Map();

    // windstreepjes rond de speler
    const n = 90, p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { p[i * 3] = (R() - 0.5) * 30; p[i * 3 + 1] = R() * 3; p[i * 3 + 2] = (R() - 0.5) * 30; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    this.wind = new THREE.Points(g, new THREE.PointsMaterial({ map: DOT, size: 0.35, color: 0xd8f0ff, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, toneMapped: false }));
    this.wind.frustumCulled = false; this.wind.visible = false; scene.add(this.wind);

    // geur die van het karkas met de wind mee drijft
    const sn = 120, sp = new Float32Array(sn * 3);
    this.scentAge = new Float32Array(sn).map(() => R() * 12);
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    this.scent = new THREE.Points(sg, new THREE.PointsMaterial({ map: DOT, size: 1.1, color: 0xc8e070, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, toneMapped: false }));
    this.scent.frustumCulled = false; this.scent.visible = false; scene.add(this.scent);
  }

  // elke 1,5 m een afdruk achterlaten
  track(id, x, z, yaw) {
    const l = this.last.get(id);
    if (l && Math.hypot(l[0] - x, l[1] - z) < 1.5) return;
    this.last.set(id, [x, z]);
    const i = this.n++ % this.max;
    for (let k = 0; k < 1; k++) {
      this.dummy.position.set(x, height(x, z) + 0.04, z); this.dummy.rotation.set(0, yaw, 0); this.dummy.scale.set(1, 1, 1.4); this.dummy.updateMatrix();
      this.prints.setMatrixAt(i, this.dummy.matrix);
    }
    this.prints.count = Math.min(this.n, this.max); this.prints.instanceMatrix.needsUpdate = true;
  }

  update(dt, t, on, focus, source, k = 1) {
    on = on || k > 0.02;
    this.prints.visible = this.wind.visible = this.scent.visible = on;
    if (!on) return;
    this.prints.material.opacity = (0.42 + Math.sin(t * 3) * 0.1) * k; this.wind.material.opacity = 0.45 * k; this.scent.material.opacity = 0.32 * k;
    const a = this.wind.geometry.attributes.position, p = a.array;
    for (let i = 0; i < a.count; i++) {
      let x = p[i * 3] + WIND.x * dt * 6, z = p[i * 3 + 2] + WIND.z * dt * 6;
      if (x - focus.x > 15) x -= 30; if (x - focus.x < -15) x += 30;
      if (z - focus.z > 15) z -= 30; if (z - focus.z < -15) z += 30;
      p[i * 3] = x; p[i * 3 + 2] = z; p[i * 3 + 1] = height(x, z) + 0.6 + (i % 5) * 0.4 + Math.sin(t * 2 + i) * 0.15;
    }
    a.needsUpdate = true;
    const s = this.scent.geometry.attributes.position, sp = s.array;
    for (let i = 0; i < s.count; i++) {
      this.scentAge[i] += dt; if (this.scentAge[i] > 12) this.scentAge[i] = 0;
      const age = this.scentAge[i], spread = age * 0.5;
      const x = source.x + WIND.x * age * 3.5 + Math.sin(i * 7.1 + t * 0.5) * spread, z = source.z + WIND.z * age * 3.5 + Math.cos(i * 3.3 + t * 0.4) * spread;
      sp[i * 3] = x; sp[i * 3 + 1] = height(x, z) + 0.5 + age * 0.15; sp[i * 3 + 2] = z;
    }
    s.needsUpdate = true;
  }
}
