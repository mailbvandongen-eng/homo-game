// Het menu (rechtsboven) en de instellingen. Zolang het menu open is, staat het spel stil.
import { $ } from '../engine/ui.js';
import { ICON } from '../icons.js';
import { ERAS, AREA } from '../eras/index.js';
import { Save } from '../save.js';
import { settings, setSetting, onSetting, QUALITY, DEFAULTS, qualityNow } from '../engine/settings.js';

const SIZES = [[0.92, 'Klein'], [1, 'Gewoon'], [1.2, 'Groot']];

export function initMenu({ sound, renderer, world, journal, restart, goArea }) {
  const scr = $('menuScreen'), box = $('menuCard');
  const M = { open: false };
  function close() { M.open = false; scr.classList.remove('open'); }
  function show(html) { box.innerHTML = html; M.open = true; scr.classList.add('open'); }

  function main() {
    show(`<div class="eyebrow">Het spel staat stil</div><h2>Menu</h2>
      <div class="menu">
        ${window.__newV ? '<button class="key go" data-do="update" id="updateBtn">Nieuwe versie laden</button>' : ''}
        <button class="key${window.__newV ? '' : ' go'}" data-do="close">Verder spelen</button>
        <button class="key" data-do="journal" id="journalBtn">Wat je weet</button>
        <button class="key" data-do="areas" id="areasBtn">Kies een gebied</button>
        <button class="key" data-do="settings" id="settingsBtn">Instellingen</button>
        <button class="key" data-do="restart" id="restartBtn">Opnieuw beginnen</button>
      </div>`);
  }
  // alle speelbare gebieden, per mensensoort; je kiest vrij en gaat verder waar je daar was
  function areasView() {
    const slots = Save.slots();
    const line = (a) => { const d = slots[a.id]; return a === AREA ? 'hier ben je nu' : !d ? 'nog niet gespeeld' : `dag ${d.day || 1}${d.over ? ' · alles gedaan' : (d.missions || []).length ? ` · ${d.missions.length} ${d.missions.length === 1 ? 'missie' : 'missies'} gedaan` : ''}`; };
    show(`<div class="eyebrow">Menu</div><h2>Kies een gebied</h2>
      <div class="areas">${ERAS.filter((e) => e.playable).map((e) => `<div class="era"><span>${e.species}</span>${e.areas.filter((a) => a.playable).map((a) => `<button class="key area${a === AREA ? ' on' : ''}" data-era="${e.id}" data-area="${a.id}"><b>${a.name}</b><i>${line(a)}</i></button>`).join('')}</div>`).join('')}</div>
      <div class="row"><button class="key" data-do="main">Terug</button></div>`);
  }
  const pick = (key, cur, list) => `<div class="pick" data-key="${key}">${list.map(([v, name]) => `<button class="key${v === cur ? ' on' : ''}" data-v="${v}">${name}</button>`).join('')}</div>`;
  function settingsView() {
    const q = settings.quality;
    show(`<div class="eyebrow">Menu</div><h2>Instellingen</h2>
      <div class="set"><label for="setLook">Rondkijken</label><div class="slide"><span>langzaam</span><input type="range" id="setLook" min="0.4" max="2" step="0.1" value="${settings.look}"><span>snel</span></div></div>
      <div class="set"><label for="setVol">Geluid</label><div class="slide"><span>uit</span><input type="range" id="setVol" min="0" max="1" step="0.05" value="${settings.volume}"><span>hard</span></div></div>
      <div class="set"><label>Beeld</label>${pick('quality', q, [['auto', 'Vanzelf'], ...Object.entries(QUALITY).map(([k, v]) => [k, v.name])])}</div>
      <p class="fine" id="setQ">${q === 'auto' ? `Het spel kiest zelf. Nu: ${QUALITY[qualityNow()].name.toLowerCase()}.` : 'Hapert het spel? Kies dan een lagere stand.'}</p>
      <div class="set"><label>Knoppen</label>${pick('size', settings.size, SIZES)}</div>
      <div class="row"><button class="key go" data-do="main">Klaar</button><button class="key" data-do="defaults">Zoals het was</button></div>`);
    $('setLook').oninput = (e) => setSetting('look', +e.target.value);
    $('setVol').oninput = (e) => setSetting('volume', +e.target.value);
    $('setVol').onchange = () => sound.good && sound.good();   // even horen hoe hard het is
  }
  box.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.area) { if (b.dataset.area === AREA.id) close(); else { close(); goArea(b.dataset.era, b.dataset.area); } return; }
    const group = b.closest('.pick');
    if (group) { const k = group.dataset.key, v = b.dataset.v; setSetting(k, typeof DEFAULTS[k] === 'number' ? +v : v); settingsView(); return; }
    const act = b.dataset.do;
    if (act === 'close') close();
    else if (act === 'update') location.replace('./?v=' + window.__newV);   // je spel wordt bewaard bij het verlaten van de pagina
    else if (act === 'main') main();
    else if (act === 'settings') settingsView();
    else if (act === 'areas') areasView();
    else if (act === 'journal') { close(); journal(); }
    else if (act === 'restart') { close(); restart(); }
    else if (act === 'defaults') { for (const k of ['look', 'volume', 'quality', 'size']) setSetting(k, DEFAULTS[k]); settingsView(); }
  });
  scr.addEventListener('pointerdown', (e) => { if (e.target === scr) close(); });
  $('menuBtn').innerHTML = ICON.menu;
  $('menuBtn').onclick = () => (M.open ? close() : main());
  addEventListener('keydown', (e) => { if (e.code === 'Escape' || e.code === 'KeyP') { if (M.open) close(); else if (e.code === 'KeyP') main(); } });

  // ---------- de instellingen laten werken ----------
  function apply() {
    const q = QUALITY[qualityNow()];
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.pixels));
    renderer.setSize(innerWidth, innerHeight, false);
    world.sun.castShadow = q.shadow > 0;
    if (q.shadow && world.sun.shadow.mapSize.x !== q.shadow) {
      world.sun.shadow.mapSize.set(q.shadow, q.shadow);
      if (world.sun.shadow.map) { world.sun.shadow.map.dispose(); world.sun.shadow.map = null; }
    }
    sound.setVolume(settings.volume);
    document.documentElement.style.setProperty('--u', settings.size);
  }
  onSetting(apply); apply();
  M.close = close; M.main = main; M.areas = areasView; M.settings = settingsView; M.apply = apply;
  return M;
}
