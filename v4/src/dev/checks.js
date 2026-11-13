// Automatische controles van de testmodus. Elke controle geeft regels terug: { lvl: 'fout' | 'let op' | 'ok', groep, tekst }.
// Een fout betekent: dit moet opgelost worden voordat het gebied of scenario als getest mag gelden.
import { ERAS, ERA, AREA } from '../eras/index.js';
import { SPECIES } from '../species.js';
import { ITEMS, DISCOVERIES } from '../items.js';
import { ITEM_ICON } from '../icons.js';
import { MODELS, TEXTURES } from '../assets.js';
import { MISSING } from '../rig.js';
import { settings, qualityNow } from '../engine/settings.js';

// Welke bewegingen het spel van elk model vraagt. Een model vervangen = deze lijst blijft de eis.
export const CLIPS = {
  hyena: ['Lunge', 'Run', 'Walk', 'Eat', 'Idle'],
  elephant: ['01_Idle', '02_Walk', '03_Run', '04_Eating', '05_Attack'],
  zebra: ['Gallop', 'Trot', 'Idle01', 'Eating'],
  sabre: ['Layout', 'Run', 'Trot', 'Stalker', 'Eating', 'Roaring', 'Growling'],
  leopard: ['Principal'], cobra: ['lie'], catfish: ['Animation'], gazelle: ['Animation'], vulture: ['Armature'],
  hominin: ['Walk_Loop', 'Jog_Fwd_Loop', 'Idle_Loop', 'Crouch_Idle_Loop', 'Interact', 'Punch_Jab', 'PickUp_Table', 'Spell_Simple_Shoot'],
};
// Grenzen voor een telefoon uit de middenklasse. Daarboven: eerst 'let op', dan 'fout'.
export const BUDGET = { calls: [260, 420], tris: [450000, 900000], fps: [45, 28], ms95: [28, 45] };

const pair = (v) => Array.isArray(v) && v.length >= 2 && Number.isFinite(v[0]) && Number.isFinite(v[1]);
const dummy = () => ({ state: { found: new Set(), hands: [null, null], rock: [null, null], bag: null }, has: () => false, carries: () => false, player: { pos: { x: 0, z: 0 } }, hyenas: { list: [] }, sabres: {}, group: { list: [] }, night: () => 0, dayP: () => 0, fire: () => null, herd: () => null });
// De missies van een gebied, ook als dat gebied nu niet geladen is (alleen om de lijst te lezen).
export function missionsOf(area) { try { return area.missions(dummy()); } catch (e) { return null; } }
export const allAreas = () => ERAS.flatMap((era) => (era.areas || []).map((area) => ({ era, area })));

function checkConfig(out) {
  const add = (lvl, tekst) => out.push({ lvl, groep: 'Gebieden', tekst });
  const ids = new Set();
  for (const { era, area } of allAreas()) {
    const w = `${area.id || '?'}: `;
    if (!area.id || !area.name) add('fout', w + 'geen id of naam');
    if (ids.has(area.id)) add('fout', w + 'dit id bestaat twee keer'); ids.add(area.id);
    if (!area.playable) continue;
    if (!(area.ma <= era.ma[0] && area.ma >= era.ma[1])) add('fout', w + `${area.ma} miljoen jaar valt buiten ${era.species} (${era.ma.join('–')})`);
    for (const [k, ok] of [['home', area.home && Number.isFinite(area.home.x) && Number.isFinite(area.home.z)], ['start', pair(area.start)], ['carcass', area.carcass && Number.isFinite(area.carcass.x)],
      ['herd.at', area.herd && pair(area.herd.at)], ['zebras.at', area.zebras && pair(area.zebras.at)], ['sabres.lair', area.sabres && pair(area.sabres.lair)], ['leopard.tree', area.leopard && pair(area.leopard.tree)],
      ['giant.route', area.giant && Array.isArray(area.giant.route) && area.giant.route.length > 1], ['birds', Array.isArray(area.birds)], ['outro', area.outro && area.outro.title && Array.isArray(area.outro.text)], ['missions', typeof area.missions === 'function']]) {
      if (!ok) add('fout', w + `'${k}' ontbreekt of klopt niet`);
    }
    for (const id of area.fauna || []) {
      const s = SPECIES[id];
      if (!s) { add('fout', w + `onbekende diersoort '${id}'`); continue; }
      if (area.ma > s.ma[0] || area.ma < s.ma[1]) add('fout', w + `${s.name} (${s.latin}) leefde ${s.ma.join('–')} miljoen jaar geleden, niet ${area.ma}`);
      if (!s.regions.includes(area.region)) add('fout', w + `${s.name} (${s.latin}) kwam niet voor in ${area.region}`);
    }
    if (area.next && !allAreas().some((x) => x.area.id === area.next)) add('fout', w + `volgend gebied '${area.next}' bestaat niet`);
    if (area.next && !allAreas().some((x) => x.area.id === area.next && x.area.playable)) add('let op', w + `volgend gebied '${area.next}' is nog niet speelbaar`);
    const ms = missionsOf(area);
    if (!ms) { add('fout', w + 'de missielijst geeft een fout'); continue; }
    if (!ms.length) add('fout', w + 'geen missies');
    const who = new Set((era.group || [{ id: 'tor' }, { id: 'kem' }, { id: 'ibo' }]).map((g) => g.id)), mids = new Set(ms.map((m) => m.id));
    if (mids.size !== ms.length) add('fout', w + 'twee missies met hetzelfde id');
    for (const m of ms) {
      for (const k of ['id', 'who', 'title', 'ask', 'end', 'why']) if (typeof m[k] !== 'string' || !m[k]) add('fout', w + `missie '${m.id}': '${k}' ontbreekt`);
      if (typeof m.done !== 'function') add('fout', w + `missie '${m.id}': geen eindvoorwaarde (done)`);
      if (!Array.isArray(m.steps) || !m.steps.length || m.steps.some((s) => !s.t || typeof s.ok !== 'function')) add('fout', w + `missie '${m.id}': stappen ontbreken of zijn onvolledig`);
      if (!who.has(m.who)) add('fout', w + `missie '${m.id}': '${m.who}' zit niet in de groep van ${era.species}`);
      if (m.needs && !mids.has(m.needs)) add('fout', w + `missie '${m.id}': heeft '${m.needs}' nodig, maar die missie bestaat niet`);
    }
    add('ok', `${era.species} · ${area.name}: ${(area.fauna || []).length} soorten, ${ms.length} missies`);
  }
  for (const d of DISCOVERIES) if (d.era && !ERAS.some((e) => e.id === d.era)) add('fout', `ontdekking '${d.id}': onbekend tijdperk '${d.era}'`);
  for (const it of Object.keys(ITEMS)) { if (!ITEM_ICON[it]) add('let op', `voorwerp '${it}' heeft geen plaatje voor in je hand`); if (!ITEMS[it].name) add('fout', `voorwerp '${it}' heeft geen naam`); }
}

async function checkFiles(out) {
  const add = (lvl, tekst) => out.push({ lvl, groep: 'Bestanden', tekst });
  const files = new Set([...MODELS.map((n) => `assets/models/${n}.glb`), ...TEXTURES.map(([n]) => `assets/tex/${n}.webp`), 'assets/anims/hominin.json', 'assets/mpumalanga_veld_1k.hdr', 'assets/CREDITS.md']);
  for (const { area } of allAreas()) for (const n of area.models || []) files.add(`assets/models/${n}.glb`);
  let bad = 0;
  await Promise.all([...files].map((f) => fetch('./' + f, { method: 'HEAD' }).then((r) => { if (!r.ok) { bad++; add('fout', `${f} ontbreekt (${r.status})`); } }).catch(() => { bad++; add('fout', `${f} is niet op te halen`); })));
  if (!bad) add('ok', `${files.size} bestanden van alle gebieden zijn aanwezig`);
}

function checkLoaded(out, A, scene) {
  const add = (lvl, tekst) => out.push({ lvl, groep: 'Modellen en bewegingen', tekst });
  let bad = 0;
  for (const [n, root] of Object.entries(A.models)) {
    let meshes = 0, noTex = 0;
    root.traverse((o) => {
      if (!o.isMesh) return; meshes++;
      for (const m of [].concat(o.material)) if (m.map && !(m.map.image && (m.map.image.width || m.map.image.videoWidth))) noTex++;
    });
    if (!meshes) { bad++; add('fout', `model '${n}' bevat geen vorm`); }
    if (noTex) { bad++; add('fout', `model '${n}': ${noTex} textuur(en) zonder beeld`); }
  }
  for (const [n, need] of Object.entries(CLIPS)) {
    if (!A.models[n]) { if (MODELS.includes(n) || (AREA.models || []).includes(n)) { bad++; add('fout', `model '${n}' is niet geladen`); } continue; }   // een model van een ander gebied hoeft hier niet geladen te zijn
    const have = (A.anims[n] || []).map((c) => c.name);
    for (const c of need) if (!have.some((h) => h === c || h.includes(c))) { bad++; add('fout', `'${n}' mist de beweging '${c}' (aanwezig: ${have.join(', ') || 'geen'})`); }
  }
  for (const [n, t] of Object.entries(A.tex)) if (!(t.image && t.image.width)) { bad++; add('fout', `textuur '${n}' heeft geen beeld`); }
  for (const m of MISSING) { bad++; add('fout', `gevraagd tijdens het spelen maar niet gevonden: ${m}`); }
  let nan = 0; scene.traverse((o) => { if (!Number.isFinite(o.position.x + o.position.y + o.position.z)) nan++; });
  if (nan) { bad++; add('fout', `${nan} voorwerp(en) in de wereld hebben geen geldige plek (NaN)`); }
  if (!bad) add('ok', `${Object.keys(A.models).length} modellen, ${Object.keys(A.tex).length} texturen en alle gevraagde bewegingen kloppen`);
}

function checkSave(out, G, normalBefore) {
  const add = (lvl, tekst) => out.push({ lvl, groep: 'Bewaren', tekst });
  try {
    localStorage.setItem('homo-dev-probe', '1'); localStorage.removeItem('homo-dev-probe');
  } catch (e) { add('fout', 'de browser laat niets bewaren (privémodus of opslag vol)'); return; }
  try {
    const snap = G.snapshot(), back = JSON.parse(JSON.stringify(snap));
    const miss = ['era', 'area', 'day', 'food', 'health', 'group', 'hands', 'known', 'found', 'missions'].filter((k) => back[k] === undefined);
    if (miss.length) add('fout', 'in het bewaarde spel ontbreekt: ' + miss.join(', '));
    else if (back.era !== ERA.id || back.area !== AREA.id) add('fout', 'het bewaarde spel wijst naar een ander gebied dan je speelt');
    else add('ok', `bewaren en teruglezen klopt (${JSON.stringify(snap).length} tekens)`);
  } catch (e) { add('fout', 'bewaren geeft een fout: ' + e.message); }
  const now = localStorage.getItem('homo-save');
  if (now !== normalBefore) add('fout', 'het gewone bewaarde spel is veranderd tijdens het testen');
  else add('ok', 'het gewone bewaarde spel is niet aangeraakt' + (now ? '' : ' (er is er geen)'));
}

export function checkScenario(sc) {
  const bad = [], found = allAreas().find((x) => x.area.id === sc.area);
  if (!sc.id || !sc.name) bad.push('geen id of naam');
  if (!found) return [...bad, `gebied '${sc.area}' bestaat niet`];
  if (!found.area.playable) bad.push(`gebied '${sc.area}' is niet speelbaar`);
  const ms = (missionsOf(found.area) || []).map((m) => m.id);
  if (sc.mission && !ms.includes(sc.mission)) bad.push(`missie '${sc.mission}' bestaat niet in ${sc.area}`);
  for (const id of sc.done || []) if (!ms.includes(id)) bad.push(`missie '${id}' (klaar) bestaat niet in ${sc.area}`);
  for (const it of [...(sc.hands || []), ...(sc.bag || [])]) if (it && !ITEMS[it]) bad.push(`voorwerp '${it}' bestaat niet`);
  if (sc.hands && sc.hands.length !== 2) bad.push('handen: precies twee plekken');
  if (sc.bag && sc.bag.length > 5) bad.push('draagvel: hooguit vijf plekken');
  if (Array.isArray(sc.found)) for (const id of sc.found) if (!DISCOVERIES.some((d) => d.id === id)) bad.push(`ontdekking '${id}' bestaat niet`);
  if (typeof sc.pos === 'string' && !placesOf(found.area).some((p) => p.name === sc.pos)) bad.push(`plek '${sc.pos}' bestaat niet in ${sc.area}`);
  for (const k of ['food', 'health', 'group']) if (sc[k] !== undefined && !(sc[k] >= 0 && sc[k] <= 100)) bad.push(`${k} moet tussen 0 en 100 liggen`);
  if (sc.time !== undefined && !(sc.time >= 0 && sc.time < 1)) bad.push('time moet tussen 0 en 1 liggen');
  return bad;
}

// Alle plekken met een naam in een gebiedsbestand: zo komt de lijst met startplekken vanzelf uit de gegevens.
export function placesOf(area) {
  const out = [];
  const walk = (v, name, depth) => {
    if (v == null || depth > 2 || /crocs$/.test(name)) return;   // krokodillen staan als [x, afstand het meer in]: geen plek
    if (pair(v)) { out.push({ name, x: v[0], z: v[1] }); return; }
    if (Array.isArray(v)) { v.slice(0, 8).forEach((e, i) => { if (pair(e)) out.push({ name: `${name} ${i + 1}`, x: e[0], z: e[1] }); }); return; }
    if (typeof v === 'object') {
      if (Number.isFinite(v.x) && Number.isFinite(v.z)) { out.push({ name, x: v.x, z: v.z }); return; }
      for (const k of Object.keys(v)) walk(v[k], name ? `${name}.${k}` : k, depth + 1);
    }
  };
  for (const k of Object.keys(area)) if (!['look', 'outro', 'missions', 'models', 'fauna', 'riverStones', 'leaves'].includes(k)) walk(area[k], k, 0);
  return out;
}

// Meet een paar seconden hoe zwaar het beeld is.
export function measure(renderer, sec = 3) {
  return new Promise((done) => {
    const times = []; let last = performance.now(), calls = 0, tris = 0; const t0 = last;
    const step = () => {
      const now = performance.now(); times.push(now - last); last = now;
      calls = Math.max(calls, renderer.info.render.calls); tris = Math.max(tris, renderer.info.render.triangles);
      if (now - t0 < sec * 1000) requestAnimationFrame(step);
      else {
        times.shift(); times.sort((a, b) => a - b);
        const avg = times.reduce((a, b) => a + b, 0) / Math.max(1, times.length);
        done({ fps: 1000 / avg, ms95: times[Math.floor(times.length * 0.95)] || avg, calls, tris, geo: renderer.info.memory.geometries, tex: renderer.info.memory.textures });
      }
    };
    requestAnimationFrame(step);
  });
}
function checkPerf(out, p) {
  const add = (lvl, tekst) => out.push({ lvl, groep: 'Prestaties', tekst });
  const grade = (v, [warn, bad], lower) => ((lower ? v < bad : v > bad) ? 'fout' : (lower ? v < warn : v > warn) ? 'let op' : 'ok');
  add(grade(p.calls, BUDGET.calls), `${p.calls} tekenopdrachten per beeld (grens ${BUDGET.calls.join(' / ')})`);
  add(grade(p.tris, BUDGET.tris), `${Math.round(p.tris / 1000)} duizend driehoeken per beeld (grens ${BUDGET.tris.map((v) => v / 1000).join(' / ')})`);
  // een testbrowser zonder beeldscherm is traag: daar zegt de snelheid niets
  const lab = navigator.webdriver;
  add(lab ? 'ok' : grade(p.fps, BUDGET.fps, true), `${p.fps.toFixed(0)} beelden per seconde, traagste beelden ${p.ms95.toFixed(0)} ms` + (lab ? ' (testbrowser: telt niet)' : ''));
  add('ok', `${p.geo} vormen en ${p.tex} texturen in het geheugen`);
}

// Knoppen: bestaan ze, zijn ze groot genoeg voor een duim, staan ze in beeld en niet over elkaar heen?
function checkControls(out) {
  const add = (lvl, tekst) => out.push({ lvl, groep: 'Bediening', tekst });
  const ids = ['menuBtn', 'doBtn', 'sneakBtn', 'jumpBtn', 'hand0', 'hand1'];
  const miss = ids.filter((id) => !document.getElementById(id));
  if (miss.length) { add('fout', 'knop ontbreekt: ' + miss.join(', ')); return; }
  let bad = 0;
  const box = ids.map((id) => [id, document.getElementById(id).getBoundingClientRect()]);
  for (const [id, r] of box) {
    if (r.width < 44 || r.height < 44) { bad++; add('fout', `${id} is te klein voor een duim (${Math.round(r.width)} × ${Math.round(r.height)})`); }
    if (r.left < 0 || r.top < 0 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1) { bad++; add('fout', `${id} valt buiten beeld`); }
  }
  for (let i = 0; i < box.length; i++) for (let j = i + 1; j < box.length; j++) {
    const a = box[i][1], b = box[j][1];
    if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) { bad++; add('fout', `${box[i][0]} en ${box[j][0]} liggen over elkaar`); }
  }
  const S = settings;
  if (!(S.look >= 0.4 && S.look <= 2) || !(S.volume >= 0 && S.volume <= 1) || !['auto', 'laag', 'gewoon', 'hoog'].includes(S.quality)) { bad++; add('fout', 'een instelling heeft een waarde die niet kan: ' + JSON.stringify(S)); }
  if (!bad) add('ok', `${ids.length} knoppen in beeld, groot genoeg en los van elkaar; beeld: ${S.quality === 'auto' ? 'vanzelf (' + qualityNow() + ')' : S.quality}`);
}

export async function runChecks({ G, A, renderer, scenarios, scenarioError, errors, normalBefore }) {
  const out = [];
  const guard = async (groep, fn) => { try { await fn(); } catch (e) { out.push({ lvl: 'fout', groep, tekst: 'de controle zelf liep vast: ' + e.message }); } };
  await guard('Gebieden', () => checkConfig(out));
  await guard('Bestanden', () => checkFiles(out));
  await guard('Modellen en bewegingen', () => checkLoaded(out, A, G.scene));
  await guard('Bewaren', () => checkSave(out, G, normalBefore));
  await guard('Bediening', () => checkControls(out));
  await guard('Scenario\'s', () => {
    if (scenarioError) { out.push({ lvl: 'fout', groep: 'Scenario\'s', tekst: scenarioError }); return; }
    let bad = 0; const seen = new Set();
    for (const sc of scenarios) {
      const b = checkScenario(sc); if (seen.has(sc.id)) b.push('dit id bestaat twee keer'); seen.add(sc.id);
      for (const t of b) { bad++; out.push({ lvl: 'fout', groep: 'Scenario\'s', tekst: `${sc.id || '?'}: ${t}` }); }
    }
    if (!bad) out.push({ lvl: 'ok', groep: 'Scenario\'s', tekst: `${scenarios.length} scenario's kloppen met de gebieden, missies en voorwerpen` });
  });
  await guard('Kennis en modellen', () => {
    const add = (lvl, tekst) => out.push({ lvl, groep: 'Kennis en modellen', tekst });
    for (const t of ['vast', 'aannemelijk', 'onzeker', 'artistiek']) if (!ERA.zeker || !(ERA.zeker[t] || []).length) add('fout', `${ERA.species}: de kennisbasis mist de trede '${t}'`);
    if (ERA.beeld && ERA.beeld.past === 'vervanger') add('let op', `${ERA.species}: vervangend model. ${ERA.beeld.note}`);
    for (const id of AREA.fauna || []) {
      const sp = SPECIES[id]; if (!sp) continue;
      if (!sp.beeld) add('fout', `${sp.name}: er staat niet bij hoe goed het model past`);
      else if (sp.beeld === 'vervanger') add('let op', `${sp.name} (${sp.latin}): vervangend model. ${sp.beeldNote}`);
    }
    if (!out.some((r) => r.groep === 'Kennis en modellen' && r.lvl === 'fout')) add('ok', 'vier treden van zekerheid ingevuld; bij elk dier staat hoe goed het model past');
  });
  await guard('Prestaties', async () => checkPerf(out, await measure(renderer)));
  if (errors.length) for (const e of errors.slice(-8)) out.push({ lvl: 'fout', groep: 'Fouten tijdens het spelen', tekst: e });
  else out.push({ lvl: 'ok', groep: 'Fouten tijdens het spelen', tekst: 'geen' });
  return out;
}
