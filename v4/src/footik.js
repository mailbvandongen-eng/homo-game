import * as THREE from '../lib/three.module.js';
import { surface } from './world.js';

// Voeten die het land volgen. De loopbeweging is gemaakt voor vlakke grond; hier zetten we daarna elke voet
// op de hoogte van de grond onder díé voet (een helling, een rand, een kei). Het bekken zakt mee met de laagste
// voet, het andere been buigt verder door. Op vlakke grond verandert er niets.
const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), T = new THREE.Vector3();
const u = new THREE.Vector3(), v = new THREE.Vector3(), n = new THREE.Vector3(), q = new THREE.Quaternion(), q0 = new THREE.Quaternion();
const UP = new THREE.Vector3(0, 1, 0), nrm = new THREE.Vector3();
const REACH = 0.42;   // zo veel hoger of lager mag een voet staan dan het midden van het lijf

export class FootIK {
  constructor(rig) {
    this.rig = rig;
    this.legs = ['l', 'r'].map((s) => ({ thigh: rig.bone('thigh_' + s), calf: rig.bone('calf_' + s), foot: rig.bone('foot_' + s), off: 0 }));
    this.ok = this.legs.every((l) => l.thigh && l.calf && l.foot);
    this.drop = 0; this.w = 0;
  }

  // on: staat hij op de grond (en niet in een beweging die de benen zelf stuurt)?
  update(dt, on, side) {
    if (!this.ok) return;
    const r = this.rig, root = r.root.position, k = 1 - Math.exp(-dt * 14);
    this.w += ((on ? 1 : 0) - this.w) * (1 - Math.exp(-dt * 10));
    // hoe hoog ligt de grond onder elke voet, vergeleken met het midden?
    let low = 0;
    for (const l of this.legs) {
      l.foot.getWorldPosition(C);
      const want = THREE.MathUtils.clamp(Math.max(surface(C.x, C.z), -0.9) - root.y, -REACH, REACH) * this.w;
      l.off += (want - l.off) * k;
      low = Math.min(low, l.off);
    }
    this.drop += (low - this.drop) * k;
    if (Math.abs(this.drop) < 0.004 && this.legs.every((l) => Math.abs(l.off) < 0.004)) { r.model.position.y = 0; return; }
    r.model.position.y = this.drop; r.model.updateMatrixWorld(true);
    for (const l of this.legs) {
      const lift = l.off - this.drop;
      l.foot.getWorldQuaternion(q0);
      if (lift > 0.004) {
        l.thigh.getWorldPosition(A); l.calf.getWorldPosition(B); l.foot.getWorldPosition(C);
        T.copy(C); T.y += lift;
        const l1 = A.distanceTo(B), l2 = B.distanceTo(C), d = THREE.MathUtils.clamp(A.distanceTo(T), Math.abs(l1 - l2) + 0.01, (l1 + l2) * 0.999);
        // de knie buigt om zijn eigen as (staat het been helemaal recht, dan om de zij-as van het lijf)
        u.subVectors(B, A).normalize(); v.subVectors(C, B).normalize(); n.crossVectors(u, v);
        if (n.lengthSq() < 1e-5) n.copy(side); else n.normalize();
        const now = Math.acos(THREE.MathUtils.clamp(u.dot(v), -1, 1)), need = Math.PI - Math.acos(THREE.MathUtils.clamp((l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2), -1, 1));
        r.bendQ(l.calf, q.setFromAxisAngle(n, need - now));
        // en het bovenbeen draait tot de voet op zijn plek staat
        l.foot.getWorldPosition(C);
        u.subVectors(C, A).normalize(); v.subVectors(T, A).normalize();
        r.bendQ(l.thigh, q.setFromUnitVectors(u, v));
      }
      // de voet zelf: zoals hij stond, gekanteld met de grond mee
      l.foot.getWorldPosition(C);
      const e = 0.18, gx = surface(C.x + e, C.z) - surface(C.x - e, C.z), gz = surface(C.x, C.z + e) - surface(C.x, C.z - e);
      nrm.set(-gx, 2 * e, -gz).normalize(); if (nrm.y < 0.75) nrm.lerp(UP, 0.5).normalize();   // tegen een keirand kantelt hij niet mee
      l.foot.getWorldQuaternion(q); q.invert().premultiply(q0);                                 // terug naar de oude stand
      r.bendQ(l.foot, q);
      r.bendQ(l.foot, q.setFromUnitVectors(UP, nrm).slerp(q0.identity(), 1 - this.w * 0.8));
    }
  }
}
