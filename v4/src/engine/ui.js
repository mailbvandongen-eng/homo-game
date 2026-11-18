// De schermlaag: meldingen, de grote titel en de kaart. Weet niets van het spel zelf.
import { ERA, AREA } from '../eras/index.js';
import { ICON } from '../icons.js';
export const $ = (id) => document.getElementById(id);
document.body.classList.add('era-' + ERA.id);   // de vensters volgen het tijdperk (zie index.html)
// Een later tijdperk heeft een andere groep: namen uit oudere teksten worden hier vervangen (zie 'words' in het tijdperkbestand).
// Een gebied kan daar zijn eigen woorden bij zetten (het kamp ligt niet overal onder een boom).
const WORDS = [...(ERA.words || []), ...(AREA.words || [])].map(([a, b]) => [new RegExp('\\b' + a + '\\b', 'g'), b]);
export const say = (s) => (s ? WORDS.reduce((t, [a, b]) => t.replace(a, b), s) : s);

let toastTimer = 0, titleT = 0;
export function toast(text, sec = 4) { $('toast').textContent = say(text); $('toast').classList.remove('note'); $('toast').classList.add('on'); toastTimer = sec; }
// Een korte melding voor iets dat vaak gebeurt: een teken en één of twee woorden.
export function note(icon, word, sec = 2.2) { $('toast').innerHTML = ICON[icon] + '<span></span>'; $('toast').lastChild.textContent = say(word); $('toast').classList.add('on', 'note'); toastTimer = sec; }
export function title(eyebrow, text, sub, sec = 3.4) {
  $('titleE').textContent = eyebrow; $('titleH').textContent = say(text); $('titleS').textContent = say(sub) || '';
  const el = $('title'); el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); titleT = sec;
}
export function closeCard() { $('cardScreen').classList.remove('open'); }
export function showCard(html) { $('card').classList.remove('wide'); $('card').onpointerdown = null; $('card').innerHTML = say(html); $('cardScreen').classList.add('open'); }
$('cardScreen').addEventListener('pointerdown', closeCard);

export function uiTick(dt) {
  if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) $('toast').classList.remove('on'); }
  if (titleT > 0) { titleT -= dt; if (titleT <= 0) $('title').classList.remove('on'); }
  $('hint').style.visibility = titleT > 0 ? 'hidden' : '';
}
