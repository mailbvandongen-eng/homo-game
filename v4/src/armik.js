import * as THREE from '../lib/three.module.js';

// Een arm die zijn hand naar een plek in de wereld brengt (schouder en elleboog rekenen we terug vanuit de hand).
// Zelfde aanpak als de voeten in footik.js: eerst de elleboog buigen tot de afstand klopt, dan de bovenarm draaien
// tot de hand op zijn plek is. Daarna draait de arm om de lijn schouder-hand tot de elleboog de goede kant op wijst.
const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), T = new THREE.Vector3(), O = new THREE.Vector3();
const u = new THREE.Vector3(), v = new THREE.Vector3(), n = new THREE.Vector3(), e = new THREE.Vector3(), p = new THREE.Vector3();
const q = new THREE.Quaternion();

export class ArmIK {
  // grip: het punt in de hand dat op het doel moet komen (de steen in de handpalm), palm: de richting uit de handpalm (in het handbot)
  constructor(rig, s, grip, palm) {
    this.rig = rig; this.grip = grip; this.palm = palm;
    this.upper = rig.bone('upperarm_' + s); this.lower = rig.bone('lowerarm_' + s); this.hand = rig.bone('hand_' + s);
    this.ok = !!(this.upper && this.lower && this.hand);
  }

  // target: waar de steen in de hand moet komen · pole: de kant waar de elleboog heen wijst · face: waar de handpalm heen kijkt
  // w: 0 = de arm doet wat de beweging zegt, 1 = helemaal naar het doel
  reach(target, pole, face, w) {
    if (!this.ok || w <= 0.001) return;
    const r = this.rig;
    for (let pass = 0; pass < 3; pass++) {
      // de handpalm kijkt naar waar hij heen moet
      if (face) {
        v.copy(this.palm).applyQuaternion(this.hand.getWorldQuaternion(q)).normalize();
        q.setFromUnitVectors(v, face); if (w < 1) q.slerp(ID, 1 - w);
        r.bendQ(this.hand, q);
      }
      // de elleboog naar zijn kant draaien, om de lijn van schouder naar hand
      this.upper.getWorldPosition(A); this.lower.getWorldPosition(B); this.hand.getWorldPosition(C);
      u.subVectors(C, A).normalize();
      e.subVectors(B, A); e.addScaledVector(u, -e.dot(u));
      p.copy(pole).addScaledVector(u, -pole.dot(u));
      if (e.lengthSq() > 1e-6 && p.lengthSq() > 1e-6) {
        e.normalize(); p.normalize();
        r.bendQ(this.upper, q.setFromAxisAngle(u, Math.atan2(n.crossVectors(e, p).dot(u), e.dot(p)) * w));
      }
      // de pols moet zo staan dat het punt in de handpalm op het doel komt
      this.lower.getWorldPosition(B); this.hand.getWorldPosition(C); this.grip.getWorldPosition(O).sub(C);
      T.copy(target).sub(O).lerp(C, 1 - w);
      const l1 = A.distanceTo(B), l2 = B.distanceTo(C), d = THREE.MathUtils.clamp(A.distanceTo(T), Math.abs(l1 - l2) + 0.01, (l1 + l2) * 0.999);
      u.subVectors(B, A).normalize(); v.subVectors(C, B).normalize(); n.crossVectors(u, v);
      if (n.lengthSq() < 1e-5) n.crossVectors(u, pole); n.normalize();
      const now = Math.acos(THREE.MathUtils.clamp(u.dot(v), -1, 1)), need = Math.PI - Math.acos(THREE.MathUtils.clamp((l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2), -1, 1));
      r.bendQ(this.lower, q.setFromAxisAngle(n, need - now));
      this.hand.getWorldPosition(C);
      u.subVectors(C, A).normalize(); v.subVectors(T, A).normalize();
      r.bendQ(this.upper, q.setFromUnitVectors(u, v));
    }
  }
}
const ID = new THREE.Quaternion();
