// Controle op tijd en plaats: elk dier in een gebied moet in dat tijdperk en dat werelddeel geleefd hebben.
// Draaien: node tools/check-eras.mjs
import { ERAS } from '../v4/src/eras/index.js';
import { SPECIES } from '../v4/src/species.js';

let bad = 0;
const fail = (m) => { bad++; console.log('FOUT  ' + m); };
const TREDEN = ['vast', 'aannemelijk', 'onzeker', 'artistiek'];
for (const [id, s] of Object.entries(SPECIES)) {
  if (!['vast', 'aannemelijk'].includes(s.zeker)) fail(`soort ${id}: 'zeker' ontbreekt of is onbekend`);
  if (!['reconstructie', 'verwant', 'aangepast', 'vervanger'].includes(s.beeld) || !s.beeldNote) fail(`soort ${id}: 'beeld' en 'beeldNote' moeten zeggen hoe goed het model past`);
  else if (s.beeld === 'vervanger') console.log(`let op  ${s.name} (${s.latin}): vervangend model. ${s.beeldNote}`);
}
for (const era of ERAS) {
  if (!era.areas) continue;
  for (const t of TREDEN) if (!era.zeker || !Array.isArray(era.zeker[t]) || !era.zeker[t].length) fail(`${era.species}: de kennisbasis mist de trede '${t}'`);
  if (!era.beeld) fail(`${era.species}: 'beeld' ontbreekt`); else if (era.beeld.past === 'vervanger') console.log(`let op  ${era.species}: vervangend model. ${era.beeld.note}`);
  for (const area of era.areas) {
    if (area.ma > era.ma[0] || area.ma < era.ma[1]) fail(`${area.id}: ${area.ma} mln jaar valt buiten ${era.species} (${era.ma.join('–')})`);
    for (const id of area.fauna || []) {
      const s = SPECIES[id];
      if (!s) { fail(`${area.id}: onbekende soort '${id}'`); continue; }
      if (area.ma > s.ma[0] || area.ma < s.ma[1]) fail(`${area.id}: ${s.name} (${s.latin}) leefde ${s.ma.join('–')} mln jaar geleden, niet ${area.ma}`);
      if (!s.regions.includes(area.region)) fail(`${area.id}: ${s.name} (${s.latin}) kwam niet voor in ${area.region}`);
    }
    if (area.playable) {
      const ids = area.missions({ state: {}, hyenas: { list: [] } }).map((m) => m.id);
      console.log(`ok    ${era.species} · ${area.name}: ${(area.fauna || []).length} soorten, missies: ${ids.join(', ')}`);
    }
  }
}
console.log(bad ? `${bad} fout(en)` : 'Alles klopt.');
process.exit(bad ? 1 : 0);
