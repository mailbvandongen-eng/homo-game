// Invoer en camera. Toetsen, de stuurduim (links), de kijkvinger (rechts), knijpen om te zoomen, en waar de camera hangt.
// Twee gebaren met je lijf: kort omlaag vegen met de stuurduim (bukken) en omhoog (opstaan). Een tik meldt ook met welke vinger.
// Weet niets van het spel: wat een tik of een toets betekent, bepaalt main.js.
import * as THREE from '../../lib/three.module.js';
import { height, blockers } from '../world.js';
import { settings, setSetting } from './settings.js';

export const ZOOM = [2.2, 10];
const clampZoom = (d) => THREE.MathUtils.clamp(d, ...ZOOM);

export function initControls({ canvas, camera, clock, player, tap, wheel, swipe }) {
  const keys = new Set();
  addEventListener('keydown', (e) => { if (!e.repeat) keys.add(e.code); });
  addEventListener('keyup', (e) => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());   // wissel je van venster, dan blijft er geen toets 'hangen'

  // De camera hangt dicht achter je schouder. Met twee vingers (of het muiswiel) zoom je in en uit; dat wordt onthouden.
  const cam = { yaw: Math.PI, pitch: 0.26, dist: clampZoom(settings.zoom), turnTo: null, override: null, shake: 0 };
  const joy = { id: null, ox: 0, oy: 0, x: 0, y: 0, t0: 0, moved: 0 };
  const look = { id: null, lx: 0, ly: 0, last: -9, sx: 0, sy: 0, t0: 0, moved: 0 };
  const pinch = { id: null, x: 0, y: 0, d0: 1, z0: 1 };
  function setZoom(d) { cam.dist = clampZoom(d); setSetting('zoom', +cam.dist.toFixed(2), true); }

  const ring = document.querySelector('#joy .ring'), knob = document.querySelector('#joy .knob'), hint = document.getElementById('joyHint');
  const JOY_R = 60, DEAD = 0.12;
  // Een veeg is kort en snel en gaat vooral recht omhoog of omlaag. Zolang een duim die omlaag gaat nog een veeg kan zijn,
  // loop je niet achteruit: anders doe je bij elke buk eerst een stap terug.
  const FLICK_MS = 260, FLICK_PX = 34;
  const flicking = () => joy.id !== null && joy.flick && joy.dy > 0 && performance.now() - joy.t0 < FLICK_MS;
  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' && e.clientX < innerWidth * 0.45 && joy.id === null) {
      Object.assign(joy, { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: 0, y: 0, t0: e.timeStamp, moved: 0, flick: true, dy: 0 });
      ring.style.left = knob.style.left = e.clientX + 'px'; ring.style.top = knob.style.top = e.clientY + 'px';
      hint.style.display = 'none';
    } else if (look.id === null) {
      Object.assign(look, { id: e.pointerId, lx: e.clientX, ly: e.clientY, sx: e.clientX, sy: e.clientY, t0: e.timeStamp, moved: 0 });
    } else if (pinch.id === null && e.pointerType !== 'mouse') {
      // een tweede vinger erbij: knijpen om te zoomen
      Object.assign(pinch, { id: e.pointerId, x: e.clientX, y: e.clientY, d0: Math.max(20, Math.hypot(e.clientX - look.lx, e.clientY - look.ly)), z0: cam.dist });
      look.moved = 99;
    }
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerId === joy.id) {
      let dx = e.clientX - joy.ox, dy = e.clientY - joy.oy; const d = Math.hypot(dx, dy);
      joy.moved = Math.max(joy.moved, d); joy.dy = dy;
      if (d > 12 && Math.abs(dy) < Math.abs(dx) * 1.5) joy.flick = false;   // schuin of opzij: dat is sturen
      if (joy.moved > 10 && !flicking()) ring.style.display = knob.style.display = 'block';
      if (d > JOY_R) { dx *= JOY_R / d; dy *= JOY_R / d; }
      // een klein dood midden: een rustende duim laat je niet wegdrijven
      const m = Math.min(1, d / JOY_R), k = m < DEAD ? 0 : (m - DEAD) / (1 - DEAD) / (m || 1);
      joy.x = dx / JOY_R * k; joy.y = dy / JOY_R * k;
      knob.style.left = joy.ox + dx + 'px'; knob.style.top = joy.oy + dy + 'px';
    } else if (pinch.id !== null && (e.pointerId === look.id || e.pointerId === pinch.id)) {
      if (e.pointerId === look.id) { look.lx = e.clientX; look.ly = e.clientY; } else { pinch.x = e.clientX; pinch.y = e.clientY; }
      setZoom(pinch.z0 * pinch.d0 / Math.max(20, Math.hypot(pinch.x - look.lx, pinch.y - look.ly)));
      look.last = clock.elapsedTime;
    } else if (e.pointerId === look.id) {
      look.moved = Math.max(look.moved, Math.hypot(e.clientX - look.sx, e.clientY - look.sy));
      cam.yaw -= (e.clientX - look.lx) * 0.006 * settings.look;
      cam.pitch = THREE.MathUtils.clamp(cam.pitch + (e.clientY - look.ly) * 0.003 * settings.look, 0.04, 0.95);
      look.lx = e.clientX; look.ly = e.clientY; look.last = clock.elapsedTime;
    }
  });
  const endPointer = (e) => {
    // kort tikken zonder te schuiven = iets aantikken
    // de tijd van de aanraking zelf (niet het moment van verwerken): zo telt een tik ook als het beeld even hapert
    const isTap = (o) => o.moved < 16 && e.timeStamp - o.t0 < 400;   // een duim rolt altijd een paar pixels
    if (e.pointerId === joy.id) {
      const quick = e.timeStamp - joy.t0 < FLICK_MS + 60;
      if (isTap(joy) && e.type === 'pointerup') tap(e.clientX, e.clientY, { touch: true, look: false });
      else if (joy.flick && quick && Math.abs(joy.dy) >= FLICK_PX && e.type === 'pointerup' && swipe) swipe(joy.dy > 0 ? 'down' : 'up');
      joy.id = null; joy.x = joy.y = 0; ring.style.display = knob.style.display = 'none';
    }
    if (e.pointerId === pinch.id) pinch.id = null;
    if (e.pointerId === look.id) {
      if (isTap(look) && e.type === 'pointerup') tap(e.clientX, e.clientY, { touch: e.pointerType !== 'mouse', look: true });
      look.id = null;
      // de andere vinger van het knijpen kijkt verder rond
      if (pinch.id !== null) { Object.assign(look, { id: pinch.id, lx: pinch.x, ly: pinch.y, sx: pinch.x, sy: pinch.y, moved: 99 }); pinch.id = null; }
    }
  };
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); if (!wheel(e.deltaY)) setZoom(cam.dist * Math.exp(e.deltaY * 0.0012)); }, { passive: false });
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);

  // waar de duim of de toetsen heen wijzen: [opzij, vooruit/achteruit, hoe hard (0..1)]
  function stick() {
    let ix = joy.x, iy = joy.y;
    if (flicking()) ix = iy = 0;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) ix -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) ix += 1;
    if (keys.has('KeyW') || keys.has('ArrowUp')) iy -= 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) iy += 1;
    let mag = Math.min(1, Math.hypot(ix, iy));
    if (joy.id === null && mag > 0) mag = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 1 : 0.6;
    return [ix, iy, mag];
  }

  const target = new THREE.Vector3(), pos = new THREE.Vector3();
  function place(dt, t, sick) {
    if (cam.turnTo) {
      const d = Math.atan2(cam.turnTo.x - player.pos.x, cam.turnTo.z - player.pos.z) - cam.yaw;
      cam.yaw += Math.atan2(Math.sin(d), Math.cos(d)) * Math.min(1, dt * 3.5); cam.turnTo.t -= dt;
      if (cam.turnTo.t <= 0 || look.id !== null) cam.turnTo = null;
    }
    // camera hoog achter de speler; draait langzaam mee als je loopt
    if (player.speed > 1 && t - look.last > 1.2 && look.id === null && !cam.turnTo) {
      let d = player.yaw - cam.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
      cam.yaw += d * dt * 0.9 * Math.min(1, player.speed / 3);
    }
    // dichtbij schuift de camera opzij, zodat je over je schouder de vlakte in kijkt
    const dist = cam.dist, up = 1.0, near = THREE.MathUtils.clamp((6.5 - dist) / 3.5, 0, 1);
    const sx = -Math.cos(cam.yaw) * 0.55 * near, sz = Math.sin(cam.yaw) * 0.55 * near, ahead = 2.2 + near * 3.5;
    target.set(player.pos.x + sx + Math.sin(cam.yaw) * ahead, player.pos.y + up, player.pos.z + sz + Math.cos(cam.yaw) * ahead);
    pos.set(player.pos.x + sx - Math.sin(cam.yaw) * Math.cos(cam.pitch) * dist, player.pos.y + up + Math.sin(cam.pitch) * dist, player.pos.z + sz - Math.cos(cam.yaw) * Math.cos(cam.pitch) * dist);
    pos.y = Math.max(pos.y, height(pos.x, pos.z) + 1.2 - near * 0.5);
    // niet midden in een boomstam of rots gaan staan
    for (const b of blockers) {
      if (b.top || b.beast) continue;
      const dx = pos.x - b.x, dz = pos.z - b.z, d = Math.hypot(dx, dz), min = b.r + 1.2;
      if (d < min && d > 0.001) { pos.x = b.x + dx / d * min; pos.z = b.z + dz / d * min; }
    }
    // zit er grond of een rots tussen jou en de camera? Dan schuift de camera naar voren
    let clear = 1;
    const hx = player.pos.x, hy = player.pos.y + 1.2, hz = player.pos.z;
    for (let k = 1; k <= 10; k++) {
      const f = k / 10, x = hx + (pos.x - hx) * f, y = hy + (pos.y - hy) * f, z = hz + (pos.z - hz) * f;
      let blocked = y < height(x, z) + 0.4;
      if (!blocked) for (const b of blockers) if (b.top && y < b.top + 0.3 && Math.hypot(x - b.x, z - b.z) < b.r + 0.4) { blocked = true; break; }
      if (blocked) { clear = Math.max(0.25, (k - 1) / 10); break; }
    }
    if (clear < 1) pos.set(hx + (pos.x - hx) * clear, hy + (pos.y - hy) * clear + (1 - clear) * 1.5, hz + (pos.z - hz) * clear);
    if (sick) { pos.x += Math.sin(t * 1.3) * 0.25; pos.y += Math.sin(t * 0.9) * 0.15; }
    camera.position.lerp(pos, 1 - Math.exp(-dt * 6));
    if (cam.override) { camera.position.copy(cam.override.pos); target.copy(cam.override.look); }   // alleen voor tests
    if (cam.shake > 0) { cam.shake -= dt; camera.position.x += (Math.random() - 0.5) * cam.shake * 0.6; camera.position.y += (Math.random() - 0.5) * cam.shake * 0.6; }
    camera.lookAt(target);
    // dichtbij schuift het beeld wat omhoog: zo sta je vrij van de knoppen en zie je meer grond voor je voeten
    camera.setViewOffset(innerWidth, innerHeight, 0, Math.round(innerHeight * 0.14 * near), innerWidth, innerHeight);
  }
  return { keys, joy, look, cam, setZoom, stick, place };
}
