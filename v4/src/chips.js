import * as THREE from '../lib/three.module.js';
import { surface } from './world.js';
import { ROCKS } from './items.js';

// Splinters die van de kern springen als je erop slaat. Ze vliegen weg, tollen, vallen op de grond en blijven even liggen.
const GEO = new THREE.TetrahedronGeometry(1, 0);
const mats = {};
const mat = (type) => mats[type] || (mats[type] = new THREE.MeshLambertMaterial({ color: new THREE.Color(ROCKS[type].tint).multiplyScalar(type === 'quartz' ? 0.8 : 0.62), flatShading: true }));

export class Chips {
  constructor(scene) { this.scene = scene; this.list = []; }
  // at: waar de stenen elkaar raken · away: de kant waar de slag heen ging · big: de afslag zelf springt los · dust: de kei valt in gruis
  burst(at, away, type = 'lava', big = false, dust = false) {
    const n = dust ? 9 : big ? 4 : 2 + (Math.random() < 0.5 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(GEO, mat(ROCKS[type] ? type : 'lava')), s = dust ? 0.012 + Math.random() * 0.02 : i === 0 && big ? 0.04 : 0.009 + Math.random() * 0.014;
      m.scale.set(s, s * 0.3, s * 1.5); m.position.copy(at);
      m.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      const v = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.5, Math.random() - 0.5).multiplyScalar(dust ? 0.9 : 1.3).addScaledVector(away, dust ? 0.4 : 1.1 + Math.random() * 1.2);
      v.y += dust ? 0.3 : 0.9 + Math.random() * 0.8;
      this.scene.add(m);
      this.list.push({ m, v, spin: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(26), t: 0, down: false });
    }
  }
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const c = this.list[i], p = c.m.position; c.t += dt;
      if (!c.down) {
        c.v.y -= 9.8 * dt; p.addScaledVector(c.v, dt);
        c.m.rotation.x += c.spin.x * dt; c.m.rotation.y += c.spin.y * dt; c.m.rotation.z += c.spin.z * dt;
        const g = surface(p.x, p.z) + 0.006;
        if (p.y <= g) { p.y = g; c.down = true; c.t = 0; c.m.rotation.x = 0; c.m.rotation.z = 0; }
      } else if (c.t > 9) {
        // na een poos zakken ze weg in het stof
        c.m.scale.multiplyScalar(Math.max(0, 1 - dt * 2.5));
        if (c.t > 10.5) { this.scene.remove(c.m); this.list.splice(i, 1); }
      }
    }
  }
}
