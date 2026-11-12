import * as THREE from '../../lib/three.module.js';
import { $ } from '../engine/ui.js';

// Aanwijzingen voor de besturing: één tegelijk, op het moment dat je hem nodig hebt.
export function initHints(G) {
  const { state, player, things, hyenas, carcassNear, hiveNear } = G;
  // Geen handleiding vooraf: één aanwijzing tegelijk, op het moment dat je hem nodig hebt, en elk maar één keer (ook bij een volgend spel).
  const coarse = matchMedia('(pointer: coarse)').matches;
  const hintSeen = new Set(JSON.parse(localStorage.getItem('homo4-hints') || '[]'));
  const did = {}, hints = { did, playT: 0, moved: 0, get cur() { return hintCur; }, seen: hintSeen }; let hintCur = null, hintT = 0, hintGap = 1.5;
  const hintLast = new THREE.Vector3();
  const nearTurn = (r) => things.some((t) => t.kind === 'turn' && !t.gone && Math.hypot(t.x - player.pos.x, t.z - player.pos.z) < r);
  const HINTS = [
    { id: 'move', when: () => hints.playT < 40, done: () => hints.moved > 5, text: coarse ? 'Schuif met je linkerduim om te lopen. Veeg rechts om rond te kijken.' : 'Loop met WASD of de pijltjes. Sleep om rond te kijken.' },
    { id: 'cut', now: true, when: () => !!carcassNear() && (state.hands.includes('flake') || state.hands.includes('axe')), done: () => state.hands.includes('meat') || state.hands.includes('hide'), text: coarse ? 'Tik op Snijd.' : 'E: snijd met je afslag.' },
    { id: 'honey', now: true, when: () => !!hiveNear(3.6), done: () => state.hands.includes('honey'), text: coarse ? 'Tik op Pak.' : 'E: graai naar de honing.' },
    { id: 'turn', now: true, when: () => nearTurn(5), done: () => did.turn, text: (coarse ? 'Dubbeltik' : 'Dubbelklik') + ' op de platte steen om hem om te draaien.' },
    { id: 'throw', now: true, when: () => state.hands.includes('stone') && hyenas.list.some((h) => Math.hypot(h.x - player.pos.x, h.z - player.pos.z) < 30), done: () => did.throw, text: coarse ? 'Houd Gooi vast om te mikken. Schuif om te richten, laat los om te gooien.' : 'Houd E vast om te mikken, scrol voor de afstand, laat los om te gooien.' },
  ];
  function hintTick(dt) {
    if (!state.started || state.sleeping > 0 || state.collapsed > 0) return;
    hints.playT += dt; hints.moved += Math.min(2, Math.hypot(player.pos.x - hintLast.x, player.pos.z - hintLast.z)); hintLast.copy(player.pos);
    const close = (h) => { hintSeen.add(h.id); try { localStorage.setItem('homo4-hints', JSON.stringify([...hintSeen])); } catch (e) { /* privémodus */ } };
    // iets wat nu speelt (een nest, een platte steen, een hyena) gaat voor op een algemene aanwijzing; die komt later terug
    const urgent = hintCur && !hintCur.now && HINTS.find((h) => h.now && !hintSeen.has(h.id) && h.when() && !h.done());
    if (urgent) { hintCur = urgent; hintT = 0; $('hint').textContent = urgent.text; }
    if (hintCur) {
      hintT += dt;
      if (hintCur.done() || hintT > 14) { close(hintCur); hintCur = null; hintGap = 2.5; $('hint').classList.remove('on'); }
      return;
    }
    hintGap -= dt; if (hintGap > 0) return;
    for (const h of HINTS) {
      if (hintSeen.has(h.id) || !h.when()) continue;
      if (h.done()) { close(h); continue; }   // al vanzelf gedaan: dan hoeft het niet meer gezegd
      hintCur = h; hintT = 0; $('hint').textContent = h.text; $('hint').classList.add('on'); break;
    }
  }
  hints.hintTick = hintTick;
  return hints;
}
