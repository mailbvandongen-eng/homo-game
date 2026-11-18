// De schermlaag: tekens in beeld en de kaart (menu en kennisblad). Weet niets van het spel zelf.
import { ERA, AREA } from '../eras/index.js';
import { ICON } from '../icons.js';
export const $ = (id) => document.getElementById(id);
document.body.classList.add('era-' + ERA.id);   // de vensters volgen het tijdperk (zie index.html)
// Een later tijdperk heeft een andere groep: namen uit oudere teksten worden hier vervangen (zie 'words' in het tijdperkbestand).
// Een gebied kan daar zijn eigen woorden bij zetten (het kamp ligt niet overal onder een boom).
const WORDS = [...(ERA.words || []), ...(AREA.words || [])].map(([a, b]) => [new RegExp('\\b' + a + '\\b', 'g'), b]);
export const say = (s) => (s ? WORDS.reduce((t, [a, b]) => t.replace(a, b), s) : s);

let signT = 0;
// Het spel vertelt niets in woorden: wat er gebeurt, zie en hoor je. Wat vroeger een melding was, wordt alleen nog
// onzichtbaar bijgehouden (in #toast en window.__said), zodat de tests kunnen nagaan wat er gebeurd is.
function log(text) { const t = say(text) || ''; $('toast').textContent = t; (window.__said = window.__said || []).push(t); if (window.__said.length > 60) window.__said.shift(); }
export function toast(text) { log(text); }
// Een teken dat even bovenin verschijnt: een plaatje, nooit een woord.
export function sign(html, sec = 2.2, cls = '') { $('sign').innerHTML = html; $('sign').className = 'hud on ' + cls; signT = sec; }
// iets dat vaak gebeurt (het woord erbij is alleen voor de tests)
export function note(icon, word, sec = 2.2) { log(word); sign(ICON[icon], sec); }
// dit heb je nodig en heb je niet: het teken van het ding in een lege, kloppende kring
export function need(icon, text) { log(text); sign(ICON[icon], 2.6, 'need'); }
export function title(eyebrow, text, sub) { log([eyebrow, text, sub].filter(Boolean).join(' · ')); }
export function closeCard() { $('cardScreen').classList.remove('open'); }
export function showCard(html) { $('card').classList.remove('wide'); $('card').onpointerdown = null; $('card').innerHTML = say(html); $('cardScreen').classList.add('open'); }
$('cardScreen').addEventListener('pointerdown', closeCard);

export function uiTick(dt) {
  if (signT > 0) { signT -= dt; if (signT <= 0) $('sign').classList.remove('on'); }
}
