import { FINDS } from '../items.js';
import { ERA } from '../eras/index.js';
import { $, showCard } from '../engine/ui.js';

// Twee bladen. 'Jouw boekje': wat jij in het spel hebt gedaan en ontdekt. 'Hoe zeker is dit?': wat de wetenschap weet
// over deze mensensoort, in vier treden, zodat je ziet wat vaststaat en wat wij voor het spel hebben ingevuld.
const STEPS = [
  ['vast', 'Vast', 'Dit weten we door vondsten: stenen, botten, sporen.'],
  ['aannemelijk', 'Aannemelijk', 'Dit volgt uit vondsten, maar niemand heeft het gezien.'],
  ['onzeker', 'Onzeker', 'Hierover zijn onderzoekers het niet eens, of er is geen bewijs.'],
  ['artistiek', 'Onze invulling', 'Dit hebben wij bedacht om er een spel van te maken.'],
];

export function initKnowledge(G, DISC) {
  const { state } = G;
  const tabs = (on) => `<div class="tabs"><button class="key${on === 0 ? ' on' : ''}" id="tabBook">Jouw boekje</button><button class="key${on === 1 ? ' on' : ''}" id="tabSure">Hoe zeker is dit?</button></div>`;
  function wire() { $('tabBook').onclick = journal; $('tabSure').onclick = knowledge; }
  function journal() {
    showCard(`<div class="eyebrow">Wat je weet</div>${tabs(0)}<h2>Missies</h2><ul>${G.missions.MISSIONS.map((m) => G.missions.mission.done.has(m.id) ? `<li>✓ ${m.title}</li>` : m.needs && !G.missions.mission.done.has(m.needs) ? '<li class="no">… nog niet aan de orde</li>' : `<li>${m.title}${G.missions.mission.cur === m ? ' (hier ben je mee bezig)' : ': ' + G.missions.NAMES[m.who] + ' roept je bij de slaapboom'}</li>`).join('')}</ul>
      <h3>Ontdekkingen</h3><ul>${DISC.map((d) => state.found.has(d.id) ? `<li>${d.text}</li>` : '<li class="no">… nog niet ontdekt</li>').join('')}</ul>
      <h3>Vondsten</h3><ul>${Object.entries(FINDS).map(([k, f]) => state.finds.has(k) ? `<li><b>${f.name}</b>: ${f.text}</li>` : '<li class="no">… ergens verstopt</li>').join('')}</ul>
      <p class="fine" style="margin-top:12px">${$('credits').innerHTML}</p>`);
    wire();
  }
  function knowledge() {
    showCard(`<div class="eyebrow">Wat je weet</div>${tabs(1)}<h2>${ERA.species}</h2>
      <p>${ERA.where}, ${ERA.when}. Hun werktuigen heten: ${ERA.tradition}.</p>
      ${STEPS.map(([k, name, what]) => `<h3 class="sure ${k}"><i></i>${name}</h3><p class="fine">${what}</p><ul>${(ERA.zeker[k] || []).map((x) => `<li>${x.charAt(0).toUpperCase() + x.slice(1)}.</li>`).join('')}</ul>`).join('')}
      <h3>Het lichaam in het spel</h3><p>${ERA.beeld.note}</p>`);
    wire();
  }
  return { journal, knowledge };
}
