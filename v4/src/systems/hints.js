import * as THREE from '../../lib/three.module.js';
import { $ } from '../engine/ui.js';
import { ICON } from '../icons.js';

// De besturing leer je zonder woorden: een vinger doet voor wat je duim moet doen, op de plek waar je het doet.
// Eén gebaar tegelijk, op het moment dat je het nodig hebt, en elk maar één keer (ook bij een volgend spel).
export function initHints(G) {
  const { state, player, things, hyenas, carcassNear, hiveNear } = G;
  const coarse = matchMedia('(pointer: coarse)').matches || !!window.__coarse;   // met muis en toetsen is er niets voor te doen
  const hintSeen = new Set(JSON.parse(localStorage.getItem('homo4-hints') || '[]'));
  const did = {}, hints = { did, playT: 0, moved: 0, looked: 0, get cur() { return hintCur; }, seen: hintSeen }; let hintCur = null, hintT = 0, hintGap = 1.5, lastYaw = null;
  const hintLast = new THREE.Vector3(), v3 = new THREE.Vector3();
  const el = $('hint'); el.innerHTML = `<i></i>${ICON.finger}<b></b>`;
  const turnStone = (r) => things.find((t) => t.kind === 'turn' && !t.gone && Math.hypot(t.x - player.pos.x, t.z - player.pos.z) < r);
  // waar de vingertop staat, in beeldpunten
  const frac = (fx, fy) => () => [innerWidth * fx, innerHeight * fy];
  const onBtn = () => { const r = $('doBtn').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  const onJoy = () => { const r = $('joyHint').getBoundingClientRect(); return r.width ? [r.left + r.width / 2, r.top + r.height / 2] : [innerWidth * 0.16, innerHeight * 0.72]; };
  const onStone = () => { const t = turnStone(8); if (!t) return null; v3.set(t.x, t.y !== undefined ? t.y : 0, t.z); if (t.mesh) t.mesh.getWorldPosition(v3); v3.project(G.camera); return v3.z > 1 ? null : [(v3.x + 1) / 2 * innerWidth, (1 - v3.y) / 2 * innerHeight]; };
  // g = het gebaar (zie index.html, #hint.g-…); icon = wat het gebaar oplevert, klein erbij
  const HINTS = [
    { id: 'move', g: 'move', at: onJoy, when: () => hints.playT < 40, done: () => hints.moved > 5 },
    { id: 'look', g: 'look', at: frac(0.7, 0.45), when: () => hintSeen.has('move'), done: () => hints.looked > 0.6 },
    { id: 'jump', g: 'tap', icon: 'jump', at: frac(0.72, 0.42), when: () => hintSeen.has('look'), done: () => did.jump },
    { id: 'sneak', g: 'down', icon: 'sneak', at: frac(0.18, 0.4), when: () => hintSeen.has('jump'), done: () => player.sneaking },
    { id: 'cut', g: 'tap', now: true, at: onBtn, when: () => !!carcassNear() && (state.hands.includes('flake') || state.hands.includes('axe')), done: () => state.hands.includes('meat') || state.hands.includes('hide') },
    { id: 'honey', g: 'tap', now: true, at: onBtn, when: () => !!hiveNear(3.6), done: () => state.hands.includes('honey') },
    { id: 'turn', g: 'tap2', now: true, at: onStone, when: () => !!turnStone(5), done: () => did.turn },
    { id: 'throw', g: 'hold', now: true, at: onBtn, when: () => state.hands.includes('stone') && hyenas.list.some((h) => Math.hypot(h.x - player.pos.x, h.z - player.pos.z) < 30), done: () => did.throw },
  ];
  function show(h) {
    hintCur = h; hintT = 0;
    el.className = 'hud on g-' + h.g; el.lastChild.innerHTML = h.icon ? ICON[h.icon] : '';
  }
  function hide() { hintCur = null; el.className = 'hud'; }
  function hintTick(dt) {
    if (!state.started || state.sleeping > 0 || state.collapsed > 0) return;
    hints.playT += dt; hints.moved += Math.min(2, Math.hypot(player.pos.x - hintLast.x, player.pos.z - hintLast.z)); hintLast.copy(player.pos);
    if (lastYaw !== null) hints.looked += Math.min(0.5, Math.abs(G.camYaw - lastYaw)); lastYaw = G.camYaw;
    if (!coarse) return;
    const close = (h) => { hintSeen.add(h.id); try { localStorage.setItem('homo4-hints', JSON.stringify([...hintSeen])); } catch (e) { /* privémodus */ } };
    // iets wat nu speelt (een nest, een platte steen, een hyena) gaat voor op een algemeen gebaar; dat komt later terug
    const urgent = hintCur && !hintCur.now && HINTS.find((h) => h.now && !hintSeen.has(h.id) && h.when() && !h.done());
    if (urgent) show(urgent);
    if (hintCur) {
      hintT += dt;
      const p = hintCur.at();
      if (p) { el.style.left = p[0] + 'px'; el.style.top = p[1] + 'px'; }
      el.style.visibility = p && !$('cardScreen').classList.contains('open') ? '' : 'hidden';
      if (hintCur.done() || hintT > 14 || (hintCur.now && !hintCur.when())) { if (hintCur.done() || hintT > 14) close(hintCur); hide(); hintGap = 2.5; }
      return;
    }
    hintGap -= dt; if (hintGap > 0) return;
    for (const h of HINTS) {
      if (hintSeen.has(h.id) || !h.when()) continue;
      if (h.done()) { close(h); continue; }   // al vanzelf gedaan: dan hoeft het niet meer voorgedaan
      show(h); break;
    }
  }
  hints.hintTick = hintTick;
  return hints;
}
