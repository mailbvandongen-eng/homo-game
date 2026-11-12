// De schermlaag: meldingen, de grote titel en de kaart. Weet niets van het spel zelf.
export const $ = (id) => document.getElementById(id);

let toastTimer = 0, titleT = 0;
export function toast(text, sec = 4) { $('toast').textContent = text; $('toast').classList.add('on'); toastTimer = sec; }
export function title(eyebrow, text, sub, sec = 3.4) {
  $('titleE').textContent = eyebrow; $('titleH').textContent = text; $('titleS').textContent = sub || '';
  const el = $('title'); el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); titleT = sec;
}
export function closeCard() { $('cardScreen').classList.remove('open'); }
export function showCard(html) { $('card').classList.remove('wide'); $('card').onpointerdown = null; $('card').innerHTML = html; $('cardScreen').classList.add('open'); }
$('cardScreen').addEventListener('pointerdown', closeCard);

export function uiTick(dt) {
  if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) $('toast').classList.remove('on'); }
  if (titleT > 0) { titleT -= dt; if (titleT <= 0) $('title').classList.remove('on'); }
  $('hint').style.visibility = titleT > 0 ? 'hidden' : '';
}
