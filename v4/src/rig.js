import * as THREE from '../lib/three.module.js';
import { SkeletonUtils } from '../lib/three-addons.js';

// Een dier met botten en animaties uit een geladen model.
// - play('Walk') speelt een animatie (zachte overgang); speed maakt hem sneller of trager
// - bend(bot, as, hoek) draait een bot extra bovenop de animatie, om een as in de wereld
//   (zo laten we poten lopen bij een model dat alleen stil kan staan)
const tmpQ = new THREE.Quaternion(), tmpQ2 = new THREE.Quaternion(), tmpV = new THREE.Vector3();

export class Rig {
  // facing: hoe ver het model gedraaid moet worden zodat het naar +z kijkt; size: gewenste lengte of hoogte
  constructor(A, name, { scale, facing = 0 }) {
    this.root = new THREE.Group();
    this.model = SkeletonUtils.clone(A.models[name]);
    this.model.scale.setScalar(scale); this.model.rotation.y = facing;
    this.root.add(this.model);
    this.bones = {};
    this.model.traverse((o) => {
      if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; }
      if (o.isBone) this.bones[o.name] = o;
    });
    this.mixer = new THREE.AnimationMixer(this.model);
    this.actions = {};
    for (const clip of A.anims[name] || []) this.actions[clip.name] = this.mixer.clipAction(clip);
    this.current = null;
  }
  // een bot zoeken op (een stukje van) zijn naam
  bone(part) { return this.bones[part] || Object.values(this.bones).find((b) => b.name.includes(part)); }
  action(part) { const k = Object.keys(this.actions).find((n) => n.includes(part)); return k && this.actions[k]; }

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
  update(dt) { this.mixer.update(dt); this.model.updateMatrixWorld(true); }

  // extra draaiing om een as in de wereld, na de animatie
  bend(b, worldAxis, angle) {
    if (!b || !angle) return;
    b.parent.getWorldQuaternion(tmpQ).invert();
    tmpV.copy(worldAxis).applyQuaternion(tmpQ).normalize();
    tmpQ2.setFromAxisAngle(tmpV, angle);
    b.quaternion.premultiply(tmpQ2);
    b.updateMatrixWorld(true);
  }
  // de zij-as van het dier in de wereld (om deze as zwaaien de poten naar voren en achteren)
  side(out = new THREE.Vector3()) { return out.set(1, 0, 0).applyQuaternion(this.root.getWorldQuaternion(tmpQ)); }
}
