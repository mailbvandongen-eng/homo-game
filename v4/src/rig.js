import * as THREE from '../lib/three.module.js';
import { SkeletonUtils } from '../lib/three-addons.js';

// Een dier met botten en animaties uit een geladen model.
// - play('Walk') speelt een animatie (zachte overgang); speed maakt hem sneller of trager
// - bend(bot, as, hoek) draait een bot extra bovenop de animatie, om een as in de wereld
//   (zo laten we poten lopen bij een model dat alleen stil kan staan)
const tmpQ = new THREE.Quaternion(), tmpQ2 = new THREE.Quaternion(), tmpV = new THREE.Vector3();

// Wat het spel vroeg maar het model niet heeft (een beweging of een bot). De testmodus (?dev=1) laat dit zien,
// zodat een ontbrekende beweging nooit ongemerkt blijft.
export const MISSING = new Set();
const SPHERES = new Map();   // per model: de bol om elk onderdeel
const RIGS = [];

// Kleine onderdelen (tanden, ogen, wimpers) zie je van ver niet: die tekenen we alleen dichtbij.
export function rigDetail(cam) {
  for (const r of RIGS) {
    if (!r.small.length) continue;
    const e = r.root.matrixWorld.elements, near = Math.hypot(e[12] - cam.x, e[13] - cam.y, e[14] - cam.z) < 14;
    if (near !== r.near) { r.near = near; for (const o of r.small) o.visible = near; }
  }
}

export class Rig {
  // facing: hoe ver het model gedraaid moet worden zodat het naar +z kijkt; size: gewenste lengte of hoogte
  constructor(A, name, { scale, facing = 0 }) {
    this.root = new THREE.Group();
    this.model = SkeletonUtils.clone(A.models[name]);
    this.model.scale.setScalar(scale); this.model.rotation.y = facing;
    this.root.add(this.model);
    this.bones = {}; this.small = []; this.near = true; RIGS.push(this);
    const meshes = [];
    this.model.traverse((o) => {
      if (o.isMesh) {
        // tanden, ogen, wimpers en losse haarkaartjes geven geen zichtbare schaduw: die slaan we over
        const mn = [].concat(o.material)[0].name || '';
        o.castShadow = !/Teeth|Tongue|Eye|Lash|Tear|Occlusion|Cornea|Beard|Cards|Brow|Transparency/i.test(mn); o.receiveShadow = true; meshes.push(o);
        if (/Teeth|Tongue|Eye|Lash|Tear|Occlusion|Cornea|Ojos/i.test(mn)) this.small.push(o);
      }
      if (o.isBone) this.bones[o.name] = o;
    });
    this.name = name;
    // Een dier buiten beeld hoeft niet getekend te worden. De bol om het dier is ruim genomen,
    // zodat het ook liggend, springend of met gestrekte poten nooit te vroeg verdwijnt.
    let spheres = SPHERES.get(name);
    if (!spheres) {
      this.root.updateMatrixWorld(true);
      spheres = meshes.map((o) => {
        if (o.isSkinnedMesh) { o.skeleton.update(); o.computeBoundingSphere(); } else { o.geometry.computeBoundingSphere(); o.boundingSphere = o.geometry.boundingSphere.clone(); }
        const sp = o.boundingSphere.clone(); sp.radius = sp.radius * 2 + 0.2 / scale; return sp;
      });
      SPHERES.set(name, spheres);
    }
    meshes.forEach((o, i) => { if (o.isSkinnedMesh) o.boundingSphere = spheres[i].clone(); else o.frustumCulled = false; });
    this.mixer = new THREE.AnimationMixer(this.model);
    this.actions = {};
    for (const clip of A.anims[name] || []) this.actions[clip.name] = this.mixer.clipAction(clip);
    this.current = null;
    this.bent = new Map();
  }
  // een bot zoeken op (een stukje van) zijn naam
  bone(part) {
    // three.js haalt tekens als . en : uit de namen ("hand.R" wordt "handR"); zoek daarom op dezelfde manier
    const p = THREE.PropertyBinding.sanitizeNodeName(part);
    const b = this.bones[p] || Object.values(this.bones).find((o) => o.name.includes(p));
    if (!b) { console.warn('bot niet gevonden:', part); MISSING.add(`${this.name}: bot '${part}'`); }
    return b;
  }
  action(part) {
    const k = this.actions[part] ? part : Object.keys(this.actions).find((n) => n.includes(part));
    if (!k) MISSING.add(`${this.name}: beweging '${part}'`);
    return k && this.actions[k];
  }

  play(part, { fade = 0.3, speed = 1, once = false } = {}) {
    const a = this.action(part); if (!a) return;
    a.timeScale = speed;
    if (this.current === a) return;
    a.reset(); a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat); a.clampWhenFinished = once; a.enabled = true;
    a.setEffectiveWeight(1);
    if (this.current) a.crossFadeFrom(this.current, fade, false); else a.fadeIn(fade);
    a.play(); this.current = a;
  }
  // zet de animatie stil op een bepaald moment (0..1)
  freeze(part, at) { const a = this.action(part); if (!a) return; this.play(part, { fade: 0.2 }); a.time = a.getClip().duration * at; a.timeScale = 0; }
  update(dt) {
    // botten die we zelf draaien eerst terugzetten: anders stapelt de extra draaiing zich op bij botten zonder animatie
    for (const [b, q] of this.bent) b.quaternion.copy(q);
    this.mixer.update(dt); this.model.updateMatrixWorld(true);
  }

  // extra draaiing om een as in de wereld, na de animatie
  bend(b, worldAxis, angle) {
    if (!b || !angle) return;
    if (!this.bent.has(b)) this.bent.set(b, b.quaternion.clone());
    b.parent.getWorldQuaternion(tmpQ).invert();
    tmpV.copy(worldAxis).applyQuaternion(tmpQ).normalize();
    tmpQ2.setFromAxisAngle(tmpV, angle);
    b.quaternion.premultiply(tmpQ2);
    b.updateMatrixWorld(true);
  }
  // als bend, maar met een hele draaiing (in de wereld) in één keer
  bendQ(b, q) {
    if (!b) return;
    if (!this.bent.has(b)) this.bent.set(b, b.quaternion.clone());
    b.parent.getWorldQuaternion(tmpQ);
    tmpQ2.copy(tmpQ).invert().multiply(q).multiply(tmpQ);
    b.quaternion.premultiply(tmpQ2);
    b.updateMatrixWorld(true);
  }
  // de zij-as van het dier in de wereld (om deze as zwaaien de poten naar voren en achteren)
  side(out = new THREE.Vector3()) { return out.set(1, 0, 0).applyQuaternion(this.root.getWorldQuaternion(tmpQ)); }
}
