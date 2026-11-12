// De testmodus. Alleen geladen met ?dev=1; een gewone speler ziet en laadt hier niets van.
// - kies direct een gebied, een missie of een scenario (de lijsten komen uit de geregistreerde gebieden en test_scenarios.json)
// - stel in waar je staat, hoe laat het is, wat je draagt, hoe het met je gaat en wat je al kunt
// - alles wordt bewaard op een eigen plek ('homo-save-dev'): het echte spel van een speler blijft onaangeroerd
// - automatische controles zeggen hardop wat er ontbreekt of niet klopt
import { ERAS, ERA, AREA } from '../eras/index.js';
import { ITEMS, ROCKS, DISCOVERIES } from '../items.js';
import { Save } from '../save.js';
import { runChecks, checkScenario, missionsOf, placesOf, allAreas } from './checks.js';

const CSS = `
#devBtn{position:fixed;z-index:60;left:50%;top:calc(var(--sat) + 4px);transform:translateX(-50%);pointer-events:auto;font:700 10px/1 system-ui;letter-spacing:.18em;padding:7px 12px;border:0;border-radius:3px;background:#ffc94a;color:#0c0f12;cursor:pointer;touch-action:manipulation}
#devBtn.bad{background:#ef4b4b;color:#fff}
#devStat{position:fixed;z-index:59;left:50%;top:calc(var(--sat) + 30px);transform:translateX(-50%);pointer-events:none;font:600 10px/1.3 ui-monospace,Menlo,monospace;color:#f4f2ec;text-shadow:0 1px 2px #000,0 0 6px #000;white-space:nowrap;text-align:center}
#devPanel{position:fixed;inset:0;z-index:70;display:none;flex-direction:column;background:#0c0f12f5;color:#f4f2ec;font:14px/1.45 system-ui,sans-serif;pointer-events:auto;touch-action:pan-y;user-select:text;-webkit-user-select:text}
#devPanel.open{display:flex}
#devPanel header{display:flex;gap:6px;align-items:center;padding:calc(var(--sat) + 8px) calc(var(--sar) + 10px) 8px calc(var(--sal) + 10px);border-bottom:1px solid #f4f2ec2e;flex-wrap:wrap}
#devPanel header b{letter-spacing:.16em;font-size:12px;margin-right:auto;text-transform:uppercase}
#devPanel .tab,#devPanel .b{font:700 11px/1 system-ui;letter-spacing:.12em;text-transform:uppercase;padding:11px 12px;border:0;border-radius:3px;background:#f4f2ec1c;color:#f4f2ec;cursor:pointer;touch-action:manipulation}
#devPanel .tab.on,#devPanel .b.go{background:#f4f2ec;color:#0c0f12}
#devPanel .b.warn{background:#ef4b4b;color:#fff}
#devPanel main{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;touch-action:pan-y;padding:12px calc(var(--sar) + 12px) calc(var(--sab) + 30px) calc(var(--sal) + 12px)}
#devPanel section{display:none}#devPanel section.on{display:block}
#devPanel h3{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#f4f2ec99;margin:18px 0 6px}
#devPanel h3:first-child{margin-top:0}
#devPanel .area{border:1px solid #f4f2ec2e;border-radius:4px;padding:10px;margin:0 0 8px}
#devPanel .area.cur{border-color:#ffc94a}
#devPanel .area .n{font-weight:700}#devPanel .area .s{color:#f4f2ec99;font-size:12px;margin-bottom:8px}
#devPanel .row{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:0 0 8px}
#devPanel label{display:flex;gap:6px;align-items:center;font-size:13px}
#devPanel label.w{min-width:min(100%,290px)}
#devPanel label span{min-width:92px;color:#f4f2ecc0}
#devPanel select,#devPanel input[type=number]{font:inherit;background:#1a1f24;color:#f4f2ec;border:1px solid #f4f2ec2e;border-radius:3px;padding:8px;min-width:0;max-width:100%}
#devPanel input[type=range]{flex:1;min-width:120px}
#devPanel input[type=checkbox]{width:20px;height:20px}
#devPanel .chk{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:4px 10px}
#devPanel .res{padding:5px 0 5px 10px;border-left:3px solid #8fd694;margin:0 0 4px;font-size:13px}
#devPanel .res.fout{border-color:#ef4b4b;background:#ef4b4b1c}#devPanel .res.let{border-color:#ffc94a}
#devPanel .fine{color:#f4f2ec99;font-size:12px}
#devPanel .err{color:#ff8f8f}
`;

const el = (tag, attrs = {}, html = '') => { const e = document.createElement(tag); Object.assign(e, attrs); if (html) e.innerHTML = html; return e; };
// de dag loopt van 0 (zonsopgang) tot 1; vanaf 0,72 valt de nacht
const TIMES = [['Zonsopgang', 0.02], ['Ochtend', 0.12], ['Middag', 0.36], ['Namiddag', 0.55], ['Schemer', 0.7], ['Nacht', 0.86]];

export async function initDev({ G, A, devFlags, renderer, height, makeCloak, dropCloak }) {
  const { state, player, group } = G, { mission, MISSIONS } = G.missions;
  const normalBefore = localStorage.getItem('homo-save');   // om te bewijzen dat het echte spel onaangeroerd blijft
  const errors = [];
  const noteError = (m) => { if (errors[errors.length - 1] !== m) errors.push(m); btn.classList.add('bad'); };
  devFlags.onError = (e) => noteError((e && e.stack ? e.stack.split('\n').slice(0, 2).join(' ') : String(e)).slice(0, 300));
  addEventListener('error', (e) => noteError(`${e.message} (${(e.filename || '').split('/').pop()}:${e.lineno})`));
  addEventListener('unhandledrejection', (e) => noteError('belofte afgewezen: ' + (e.reason && e.reason.message || e.reason)));

  document.head.append(el('style', { textContent: CSS }));
  const btn = el('button', { id: 'devBtn', textContent: 'TEST' }), stat = el('div', { id: 'devStat' }), panel = el('div', { id: 'devPanel' });
  document.body.append(btn, stat, panel);
  // niets van wat je in het paneel doet mag bij het spel aankomen
  for (const ev of ['pointerdown', 'pointermove', 'pointerup', 'touchstart', 'touchmove', 'wheel', 'keydown', 'keyup', 'click']) {
    panel.addEventListener(ev, (e) => e.stopPropagation());
    btn.addEventListener(ev, (e) => e.stopPropagation());
  }

  // ---------- scenario's ----------
  let scenarios = [], scenarioError = '';
  try {
    const r = await fetch('./test_scenarios.json', { cache: 'no-store' });
    if (!r.ok) throw new Error('test_scenarios.json ontbreekt (' + r.status + ')');
    const j = await r.json();
    if (!Array.isArray(j.scenarios)) throw new Error('test_scenarios.json: de lijst "scenarios" ontbreekt');
    scenarios = j.scenarios;
  } catch (e) { scenarioError = e.message; noteError(e.message); }

  // ---------- een instelling toepassen ----------
  const places = placesOf(AREA);
  const placeXZ = (pos) => {
    if (Array.isArray(pos)) return pos;
    const p = places.find((q) => q.name === pos); return p ? [p.x, p.z] : null;
  };
  function moveTo(pos) {
    const p = placeXZ(pos); if (!p) return false;
    player.pos.set(p[0] + 1.5, height(p[0] + 1.5, p[1] + 1.5), p[1] + 1.5); player.vel.set(0, 0, 0); G.stopWalk(); return true;
  }
  // Zet het spel in de gevraagde stand. Wat niet in de instelling staat, blijft zoals het is.
  function apply(c) {
    const bad = checkScenario({ id: 'nu', name: 'nu', area: AREA.id, ...c });
    if (bad.length) { noteError('Instelling klopt niet: ' + bad.join('; ')); return false; }
    for (const k of ['food', 'health', 'group']) if (c[k] !== undefined) state[k] = c[k];
    if (c.health > 0) { state.collapsed = 0; state.lost = false; }
    if (c.sick !== undefined) state.sick = c.sick;
    if (c.dry !== undefined) { state.day = Math.max(state.day, c.dry + 1); state.rainDay = state.day - 1 - c.dry; G.season(); }
    if (c.time !== undefined) { G.dayP = c.time; if (G.fire) G.fire.lastP = null; }
    if (c.hands) {
      c.hands.forEach((it, i) => { state.hands[i] = it || null; state.rock[i] = it === 'stone' ? { type: (c.rocks && c.rocks[i]) || 'lava', hits: 0 } : null; });
      G.renderHands();
    }
    if (c.bag !== undefined) {
      state.bag = c.bag ? [0, 1, 2, 3, 4].map((k) => (c.bag[k] ? { it: c.bag[k], rock: c.bag[k] === 'stone' ? { type: 'lava', hits: 0 } : null } : null)) : null;
      G.renderBag();
    }
    if (c.cloak !== undefined) { state.cloak = !!c.cloak; if (c.cloak) makeCloak(); else dropCloak(); }
    if (c.found !== undefined) {
      state.found = new Set(c.found === 'all' ? DISCOVERIES.map((d) => d.id) : c.found);
    }
    if (c.known !== undefined) state.known = new Set(c.known === 'all' ? Object.keys(ITEMS) : c.known);
    if (c.fire && G.fire) { if (c.fire.built) { G.fire.ring = G.fire.need; G.fire.showRing(); } G.fire.restore({ ring: G.fire.ring, ...c.fire }); }
    if (c.done !== undefined || c.mission !== undefined) {
      if (c.done !== undefined) mission.done = new Set(c.done);
      mission.over = false; mission.endT = 0; mission.cur = null; mission.giver = null;
      const cur = c.mission && MISSIONS.find((m) => m.id === c.mission);
      if (cur) {
        if (cur.needs) mission.done.add(cur.needs);
        mission.done.delete(cur.id); mission.cur = cur; mission.giver = group.list.find((g) => g.id === cur.who); mission.startT = 9; mission.shown = -1;
        if (cur.onStart) cur.onStart();
      }
    }
    if (c.predators !== undefined) devFlags.noPred = !c.predators;
    if (c.timeStop !== undefined) devFlags.noTime = !!c.timeStop;
    if (c.hunger !== undefined) devFlags.noHunger = !c.hunger;
    if (c.pos !== undefined && !moveTo(c.pos)) noteError('Plek niet gevonden: ' + c.pos);
    return true;
  }
  // Een ander gebied (of een schoon begin): bewaar de instelling op de testplek en bouw de wereld opnieuw op.
  function launch(c) {
    const bad = checkScenario({ id: c.id || 'keuze', name: c.name || 'keuze', ...c });
    if (bad.length) { noteError('Kan niet starten: ' + bad.join('; ')); render(); return; }
    const era = ERAS.find((e) => (e.areas || []).some((a) => a.id === c.area));
    window.__nosave = 1;
    Save.write({ era: era.id, area: c.area, day: 1, dayP: 0.12, food: 70, health: 100, group: 55, dev: c });
    location.replace(location.pathname + '?dev=1');
  }
  function reset() {
    window.__nosave = 1; Save.clear(); localStorage.removeItem('homo-dev-last');
    location.replace(location.pathname + '?dev=1');
  }

  // ---------- het paneel ----------
  let tab = 'gebied', results = null, running = false, lastName = localStorage.getItem('homo-dev-last') || '';
  const opt = (v, t, sel) => `<option value="${v}"${sel ? ' selected' : ''}>${t}</option>`;
  const itemOpts = (cur) => opt('', '— leeg —', !cur) + Object.keys(ITEMS).map((it) => opt(it, ITEMS[it].name, it === cur)).join('');
  function render() {
    const tabs = [['gebied', 'Gebied en missie'], ['stand', 'Instellingen'], ['scen', 'Scenario\'s'], ['check', 'Controles']];
    const nBad = results ? results.filter((r) => r.lvl === 'fout').length : 0;
    let h = `<header><b>Testmodus · ${AREA.name}</b>${tabs.map(([id, t]) => `<button class="tab${tab === id ? ' on' : ''}" data-tab="${id}">${t}${id === 'check' && (nBad || errors.length) ? ' (' + (nBad || errors.length) + ')' : ''}</button>`).join('')}<button class="b go" data-do="close">Terug naar het spel</button></header><main>`;

    // gebieden en missies: rechtstreeks uit de geregistreerde tijdperken
    h += `<section class="${tab === 'gebied' ? 'on' : ''}">`;
    for (const era of ERAS) {
      h += `<h3>${era.species} · ${era.tradition || ''}</h3>`;
      if (!era.areas) { h += '<p class="fine">Nog niet gebouwd.</p>'; continue; }
      for (const a of era.areas) {
        const ms = a.playable ? missionsOf(a) || [] : [];
        h += `<div class="area${a.id === AREA.id ? ' cur' : ''}"><div class="n">${a.name}${a.id === AREA.id ? ' — hier ben je nu' : ''}</div><div class="s">${a.id} · ${a.ma} miljoen jaar geleden · ${a.region}${a.playable ? '' : ' · nog niet speelbaar'}</div>`;
        if (a.playable) h += `<div class="row"><button class="b go" data-area="${a.id}">Start dit gebied</button>${ms.map((m) => `<button class="b" data-area="${a.id}" data-mission="${m.id}">Missie: ${m.title}</button>`).join('')}</div>`;
        h += '</div>';
      }
    }
    h += '<p class="fine">Een gebied of missie starten begint schoon: dag 1, volle maag, lege handen. Stel daarna bij onder Instellingen, of gebruik een scenario.</p></section>';

    // instellingen van het gebied waar je nu bent
    h += `<section class="${tab === 'stand' ? 'on' : ''}"><h3>Waar en wanneer</h3><div class="row">
      <label class="w"><span>Plek</span><select id="dvPlace">${places.map((p) => opt(p.name, `${p.name} (${Math.round(p.x)}, ${Math.round(p.z)})`)).join('')}</select></label><button class="b" data-do="goto">Ga erheen</button></div>
      <div class="row"><label class="w"><span>Tijdstip</span><select id="dvTime">${TIMES.map(([t, v]) => opt(v, t, Math.abs(G.dayP - v) < 0.04)).join('')}</select></label><button class="b" data-do="time">Zet tijd</button>
      <label><input type="checkbox" id="dvStop"${devFlags.noTime ? ' checked' : ''}>Tijd staat stil</label></div>
      <div class="row"><label class="w"><span>Weer</span><select id="dvDry">${[0, 1, 2, 3, 4].map((d) => opt(d, d ? `${d} dag${d > 1 ? 'en' : ''} droog` : 'Net geregend', d === state.day - 1 - state.rainDay)).join('')}</select></label><button class="b" data-do="dry">Zet weer</button></div>
      <p class="fine">Weer bestaat nu alleen als droogte: hoe langer droog, hoe leger de struiken rond het kamp. Regen, wind en storm zijn nog niet gebouwd.</p>
      <h3>Lijf en groep</h3>
      ${[['food', 'Voeding'], ['health', 'Gezondheid'], ['group', 'Groep']].map(([k, t]) => `<div class="row"><label class="w"><span>${t}</span><input type="range" min="0" max="100" id="dv_${k}" value="${Math.round(state[k])}"><b id="dv_${k}v">${Math.round(state[k])}</b></label></div>`).join('')}
      <div class="row"><label><input type="checkbox" id="dvHunger"${devFlags.noHunger ? ' checked' : ''}>Geen honger</label><label><input type="checkbox" id="dvPred"${devFlags.noPred ? ' checked' : ''}>Roofdieren staan stil</label></div>
      <h3>Handen en draagvel</h3><div class="row">
      ${[0, 1].map((i) => `<label><span>${i ? 'Rechts' : 'Links'}</span><select id="dvH${i}">${itemOpts(state.hands[i])}</select></label><select id="dvR${i}" aria-label="Soort kei">${Object.keys(ROCKS).map((r) => opt(r, ROCKS[r].name, state.rock[i] && state.rock[i].type === r)).join('')}</select>`).join('')}</div>
      <div class="row"><label><input type="checkbox" id="dvBag"${state.bag ? ' checked' : ''}>Draagvel</label>${[0, 1, 2, 3, 4].map((k) => `<select id="dvB${k}" aria-label="Plek ${k + 1} in het draagvel">${itemOpts(state.bag && state.bag[k] && state.bag[k].it)}</select>`).join('')}</div>
      <div class="row"><label><input type="checkbox" id="dvCloak"${state.cloak ? ' checked' : ''}>Huid om je schouders</label></div>
      <h3>Missies in dit gebied</h3>
      <div class="row"><label class="w"><span>Bezig met</span><select id="dvMis">${opt('', '— geen —', !mission.cur)}${MISSIONS.map((m) => opt(m.id, m.title, mission.cur === m)).join('')}</select></label></div>
      <div class="chk">${MISSIONS.map((m) => `<label><input type="checkbox" data-done="${m.id}"${mission.done.has(m.id) ? ' checked' : ''}>${m.title} klaar</label>`).join('')}</div>
      <h3>Wat je al weet en kunt <button class="b" data-do="allFound">Alles</button> <button class="b" data-do="noFound">Niets</button></h3>
      <div class="chk">${DISCOVERIES.map((d) => `<label title="${d.text.replace(/"/g, '&quot;')}"><input type="checkbox" data-found="${d.id}"${state.found.has(d.id) ? ' checked' : ''}>${d.id}</label>`).join('')}</div>
      <div class="row" style="margin-top:18px"><button class="b go" data-do="apply">Pas toe</button><button class="b warn" data-do="reset">Alles terug naar standaard</button></div>
      <p class="fine">Standaard = het testspel wissen en dit gebied schoon beginnen. Je echte bewaarde spel blijft altijd staan.</p></section>`;

    // scenario's
    h += `<section class="${tab === 'scen' ? 'on' : ''}">`;
    if (scenarioError) h += `<p class="err">${scenarioError}</p>`;
    for (const sc of scenarios) {
      const bad = checkScenario(sc), area = allAreas().find((x) => x.area.id === sc.area);
      h += `<div class="area${sc.name === lastName ? ' cur' : ''}"><div class="n">${sc.name}</div><div class="s">${area ? area.area.name : sc.area}${sc.note ? ' · ' + sc.note : ''}</div>`;
      h += bad.length ? `<p class="err">Dit scenario klopt niet: ${bad.join('; ')}</p>` : `<div class="row"><button class="b go" data-scen="${sc.id}">Start</button></div>`;
      h += '</div>';
    }
    h += '<p class="fine">Scenario\'s staan in v4/test_scenarios.json. Een nieuw scenario toevoegen is een blok in dat bestand; het verschijnt hier vanzelf.</p></section>';

    // controles
    h += `<section class="${tab === 'check' ? 'on' : ''}"><div class="row"><button class="b go" data-do="check">${running ? 'Bezig…' : 'Controleer opnieuw'}</button><button class="b" data-do="copy">Kopieer verslag</button></div>`;
    if (results) {
      const groups = [...new Set(results.map((r) => r.groep))];
      for (const g of groups) h += `<h3>${g}</h3>` + results.filter((r) => r.groep === g).map((r) => `<div class="res ${r.lvl === 'let op' ? 'let' : r.lvl}"><b>${r.lvl === 'ok' ? 'Goed' : r.lvl === 'fout' ? 'Fout' : 'Let op'}</b> · ${r.tekst.replace(/</g, '&lt;')}</div>`).join('');
    } else h += '<p class="fine">De controles lopen…</p>';
    h += '</section></main>';
    panel.innerHTML = h;
    for (const k of ['food', 'health', 'group']) { const r = panel.querySelector('#dv_' + k); r.oninput = () => { panel.querySelector(`#dv_${k}v`).textContent = r.value; }; }
  }
  const val = (id) => panel.querySelector('#' + id).value, on = (id) => panel.querySelector('#' + id).checked;
  const readForm = () => ({
    food: +val('dv_food'), health: +val('dv_health'), group: +val('dv_group'),
    hands: [val('dvH0') || null, val('dvH1') || null], rocks: [val('dvR0'), val('dvR1')],
    bag: on('dvBag') ? [0, 1, 2, 3, 4].map((k) => val('dvB' + k) || null) : null, cloak: on('dvCloak'),
    mission: val('dvMis') || null, done: [...panel.querySelectorAll('[data-done]')].filter((c) => c.checked).map((c) => c.dataset.done),
    found: [...panel.querySelectorAll('[data-found]')].filter((c) => c.checked).map((c) => c.dataset.found),
    predators: !on('dvPred'), hunger: !on('dvHunger'), timeStop: on('dvStop'),
  });
  async function check() {
    if (running) return;
    running = true; if (panel.classList.contains('open')) render();
    results = await runChecks({ G, A, renderer, scenarios, scenarioError, errors, normalBefore });
    running = false;
    btn.classList.toggle('bad', results.some((r) => r.lvl === 'fout'));
    if (panel.classList.contains('open')) render();
  }
  const report = () => `Homo game testverslag · ${AREA.id} · ${new Date().toISOString()}\n` + (results || []).map((r) => `[${r.lvl}] ${r.groep}: ${r.tekst}`).join('\n');
  panel.addEventListener('click', (e) => {
    const t = e.target.closest('button'); if (!t) return;
    const d = t.dataset;
    if (d.tab) { tab = d.tab; render(); }
    else if (d.area) { localStorage.removeItem('homo-dev-last'); launch({ area: d.area, mission: d.mission || undefined }); }
    else if (d.scen) { const sc = scenarios.find((s) => s.id === d.scen); localStorage.setItem('homo-dev-last', sc.name); launch(sc); }
    else if (d.do === 'close') panel.classList.remove('open');
    else if (d.do === 'goto') { moveTo(val('dvPlace')); panel.classList.remove('open'); }
    else if (d.do === 'time') { apply({ time: +val('dvTime'), timeStop: on('dvStop') }); panel.classList.remove('open'); }
    else if (d.do === 'dry') { apply({ dry: +val('dvDry') }); render(); }
    else if (d.do === 'allFound' || d.do === 'noFound') panel.querySelectorAll('[data-found]').forEach((c) => { c.checked = d.do === 'allFound'; });
    else if (d.do === 'apply') { if (apply(readForm())) panel.classList.remove('open'); else { tab = 'check'; render(); } }
    else if (d.do === 'reset') reset();
    else if (d.do === 'check') check();
    else if (d.do === 'copy') { const txt = report(); (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).catch(() => { window.prompt('Kopieer het verslag:', txt); }); }
  });
  btn.addEventListener('click', () => { render(); panel.classList.add('open'); });

  // ---------- regel met meetwaarden ----------
  let frames = 0, t0 = performance.now(), fps = 0;
  const tick = () => {
    frames++; const now = performance.now();
    if (now - t0 > 500) {
      fps = frames * 1000 / (now - t0); frames = 0; t0 = now;
      const tm = TIMES.reduce((b, x) => (Math.abs(x[1] - G.dayP) < Math.abs(b[1] - G.dayP) ? x : b))[0].toLowerCase();
      stat.textContent = `${fps.toFixed(0)} b/s · ${renderer.info.render.calls} opdr · ${Math.round(renderer.info.render.triangles / 1000)}k · ${player.pos.x.toFixed(0)}, ${player.pos.z.toFixed(0)} · ${tm}${lastName ? ' · ' + lastName : ''}${errors.length ? ' · ' + errors.length + ' FOUT' : ''}`;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  // ---------- begin: de bewaarde testinstelling toepassen, daarna alles controleren ----------
  const saved = Save.read();
  if (saved && saved.dev) apply(saved.dev);
  window.__dev = { apply, launch, reset, check, report, scenarios, errors, places, results: () => results, flags: devFlags, ready: false };
  await check();
  window.__dev.ready = true;
}
