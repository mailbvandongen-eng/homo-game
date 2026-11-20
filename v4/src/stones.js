import * as THREE from '../lib/three.module.js';
import { SkeletonUtils } from '../lib/three-addons.js';
import { variantsOf } from './assets.js';
import { height } from './world.js';

// Platte stenen. Je kantelt er een over zijn rand: hij valt ondersteboven naast zijn plek, en wat eronder zat komt bloot te liggen.
// Larven kronkelen en je eet ze één voor één op. Een schorpioen steekt en loopt daarna weg.
// 's Nachts kruipt er weer iets onder: de volgende ochtend ligt elke steen terug en kun je opnieuw kijken.
const R = 0.4, GRUB = 0.17, SCORP = 0.3;   // halve steen; lengte van een larve en van de schorpioen (iets groter dan echt, anders zie je ze niet)
const ROLL = () => (Math.random() < 0.72 ? 'grubs' : 'scorpion');

export class FlatStones {
  constructor(scene, A, fx) {
    this.scene = scene; this.A = A; this.fx = fx; this.turning = []; this.shown = []; this.list = [];
    const v = variantsOf(A.models.namaqualand_boulder_05)[0];
    this.slab = v; this.k = (R * 2.1) / Math.max(v.size.x, v.size.z);
    this.mats = v.parts.map((p) => Object.assign(p.mat.clone(), { color: new THREE.Color(0xb3a796) }));
    const g = variantsOf(A.models.grub)[0];
    this.grub = g; this.grubLong = Math.max(g.size.x, g.size.z);
    const box = new THREE.Box3().setFromObject(A.models.scorpion);
    this.scorpK = SCORP / Math.max(box.max.x - box.min.x, box.max.z - box.min.z);
    this.clips = Object.fromEntries((A.anims.scorpion || []).map((c) => [c.name, c]));
  }
  // een gescande kei, platgedrukt tot een plaat; het draaipunt ligt in het midden
  mesh(x, z) {
    const g = new THREE.Group(), inner = new THREE.Group(), v = this.slab, k = this.k, ky = 0.15 / v.size.y;
    v.parts.forEach((p, i) => { const m = new THREE.Mesh(p.geo, this.mats[i]); m.castShadow = true; m.receiveShadow = true; inner.add(m); });
    inner.scale.set(k, ky, k); inner.position.y = -0.075; inner.rotation.y = x; g.add(inner); g.userData.inner = inner;
    g.position.set(x, height(x, z) + 0.05, z); g.rotation.set(0.05, 0, 0.04);
    this.scene.add(g);
    return g;
  }
  add(t) { t.home = { x: t.x, z: t.z }; this.list.push(t); }
  // dir 1: omkantelen, dir -1: terug op zijn plek
  turn(t, player) {
    // hij valt van je af: de steen zelf blijft liggen zoals hij lag, alleen de kantelrichting draait mee
    const m = t.mesh, inner = m.userData.inner, yaw = Math.atan2(t.z - player.z, -(t.x - player.x));
    inner.rotation.y += m.rotation.y - yaw; m.rotation.y = yaw;
    this.turning.push({ t, m, q: 0, dir: 1, shown: false, px: player.x, pz: player.z });
  }
  reveal(q) {
    const t = q.t, x = t.home.x, z = t.home.z, y = height(x, z);
    if (t.under === 'grubs') {
      const n = 5, items = [];
      for (let i = 0; i < n; i++) {
        const g = new THREE.Group(), a = i * 2.2 + x, d = 0.05 + 0.055 * i, s = GRUB / this.grubLong;
        for (const p of this.grub.parts) g.add(new THREE.Mesh(p.geo, p.mat));
        g.scale.setScalar(s); g.position.set(x + Math.cos(a) * d, y + 0.005, z + Math.sin(a) * d); g.rotation.y = a * 1.7;
        this.scene.add(g); items.push({ g, ry: g.rotation.y, s, ph: i * 1.9 });
      }
      this.shown.push({ kind: 'grubs', items, age: 0, eaten: 0, t });
    } else if (t.under === 'scorpion') {
      const m = SkeletonUtils.clone(this.A.models.scorpion), g = new THREE.Group();
      m.scale.setScalar(this.scorpK); m.traverse((o) => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = true; } });
      g.add(m); g.position.set(x, y + 0.01, z);
      const face = Math.atan2(q.px - x, q.pz - z); g.rotation.y = face;   // hij keert zich naar je hand
      this.scene.add(g);
      const mixer = new THREE.AnimationMixer(m), sting = this.clips.Defend && mixer.clipAction(this.clips.Defend), walk = this.clips.Walk && mixer.clipAction(this.clips.Walk);
      if (sting) { sting.setLoop(THREE.LoopOnce); sting.clampWhenFinished = true; sting.timeScale = 1.3; sting.play(); }
      this.shown.push({ kind: 'scorpion', g, mixer, sting, walk, age: 0, stung: false, face, x, z, t });
    }
  }
  update(dt, t) {
    for (let i = this.turning.length - 1; i >= 0; i--) {
      const q = this.turning[i], m = q.m, h = q.t.home; q.q = Math.min(1, q.q + dt / (q.dir > 0 ? 0.9 : 0.7));
      const u = q.dir > 0 ? q.q : 1 - q.q;
      const a = Math.PI * (u < 0.5 ? 0.9 * u : 0.45 + 2.2 * (u - 0.5) ** 2), yaw = m.rotation.y;   // traag optillen, dan valt hij
      const k = R * (Math.cos(a) - 1);
      m.position.x = h.x + Math.cos(yaw) * k; m.position.z = h.z - Math.sin(yaw) * k;
      m.position.y = height(m.position.x, m.position.z) + 0.05 + R * Math.sin(a);
      m.rotation.z = 0.04 + a;
      if (q.dir > 0 && !q.shown && q.q > 0.4) { q.shown = true; this.reveal(q); }
      if (q.q >= 1) { this.turning.splice(i, 1); this.fx.thud(q.t); }
    }
    for (let i = this.shown.length - 1; i >= 0; i--) {
      const s = this.shown[i]; s.age += dt;
      if (s.kind === 'grubs') {
        // ze kronkelen; na een tel pak je ze één voor één
        for (const it of s.items) if (it.g.visible) { it.g.rotation.y = it.ry + Math.sin(t * 7 + it.ph) * 0.35; it.g.scale.set(it.s, it.s, it.s * (1 + 0.12 * Math.sin(t * 9 + it.ph))); }
        const due = Math.floor((s.age - 1.4) / 0.4) + 1;
        while (s.eaten < Math.min(due, s.items.length)) { s.items[s.eaten].g.visible = false; s.eaten++; this.fx.grub(s.t, s.eaten === 1, s.eaten === s.items.length); }
        if (s.eaten >= s.items.length) { for (const it of s.items) this.scene.remove(it.g); this.shown.splice(i, 1); }
      } else {
        s.mixer.update(dt);
        if (!s.stung && s.age > 0.35) { s.stung = true; this.fx.sting(s.t); }
        if (s.age > 1.1) {
          // weg van jou, steeds dieper het gras in
          if (!s.walking) { s.walking = true; if (s.walk) { s.walk.play(); if (s.sting) s.walk.crossFadeFrom(s.sting, 0.2); } s.g.rotation.y = s.face + Math.PI; }
          const v = 0.9, w = s.age - 1.1, dir = s.face + Math.PI + Math.sin(w * 3) * 0.25;
          s.g.rotation.y = dir; s.x += Math.sin(dir) * v * dt; s.z += Math.cos(dir) * v * dt;
          const fade = Math.max(0, 1 - Math.max(0, w - 3.2) / 0.8);
          s.g.position.set(s.x, height(s.x, s.z) + 0.01 - (1 - fade) * 0.08, s.z); s.g.scale.setScalar(Math.max(0.001, fade));
          if (fade <= 0) { this.scene.remove(s.g); this.shown.splice(i, 1); }
        }
      }
    }
  }
  // de nacht is om: elke gekantelde steen ligt weer, met iets nieuws eronder. Een vondst ligt er maar één keer.
  newDay() {
    for (const t of this.list) {
      if (!t.gone) continue;
      t.gone = false; t.under = ROLL();
      this.turning.push({ t, m: t.mesh, q: 0, dir: -1, shown: true });
    }
  }
}
