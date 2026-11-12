// De schermlaag: meldingen, de grote titel en de kaart. Weet niets van het spel zelf.
import { ERA } from '../eras/index.js';
export const $ = (id) => document.getElementById(id);
// Een later tijdperk heeft een andere groep: namen uit oudere teksten worden hier vervangen (zie 'words' in het tijdperkbestand)
const WORDS = (ERA.words || []).map(([a, b]) => [new RegExp('\\b' + a + '\\b', 'g'), b]);
export const say = (s) => (s ? WORDS.reduce((t, [a, b]) => t.replace(a, b), s) : s);

let toastTimer = 0, titleT = 0;
export function toast(text, sec = 4) { $('toast').textContent = say(text); $('toast').classList.add('on'); toastTimer = sec; }
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
