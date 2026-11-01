import { Input } from './input.js';
import { Audio } from './audio.js';
import { Game } from './game.js';
import level11 from './levels/w1-1.js';
import level12 from './levels/w1-2.js';
import level13 from './levels/w1-3.js';
import level14 from './levels/w1-4.js';
import level21 from './levels/w2-1.js';
import level22 from './levels/w2-2.js';
import level23 from './levels/w2-3.js';
import level24 from './levels/w2-4.js';
import level31 from './levels/w3-1.js';
import level32 from './levels/w3-2.js';
import level33 from './levels/w3-3.js';
import level34 from './levels/w3-4.js';
import { SPECIES } from './species.js';
import { installPixel } from './pixelmode.js';
import { Cinema, hasIntro } from './cinema.js';
import { TitleScene, TH, plankBoard, logSlice } from './title.js';

// Ophogen bij elke publicatie (0.x tot de eerste complete versie 1.0).
export const VERSION = '0.29.0';

const LEVELS = [level11, level12, level13, level14, level21, level22, level23, level24, level31, level32, level33, level34];
const $ = id => document.getElementById(id);
const canvas = $('game');
const input = new Input(canvas);
const audio = new Audio();

const screens = ['title', 'pause', 'complete', 'gameover'];
function show(name) {
  for (const s of screens) { const el = $(s); el.classList.toggle('open', s === name); el.setAttribute('aria-hidden', String(s !== name)); }
  const btn = name && $(name).querySelector('button');
  if (btn && !input.touchMode) btn.focus({ preventScroll: true });
}

// Voortgang wordt op het apparaat bewaard
const SAVE_KEY = 'homo-v2-save';
const save = Object.assign({ unlocked: 1, met: [], best: {}, intros: [] }, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}'));
const store = () => localStorage.setItem(SAVE_KEY, JSON.stringify(save));

let current = 0;
const ui = {
  pause() { game.state = 'paused'; show('pause'); audio.play('click'); },
  complete(r) {
    const t = Math.round(r.time), mm = Math.floor(t / 60), ss = String(t % 60).padStart(2, '0');
    $('resBones').textContent = `${r.bones} / ${r.bonesMax}`;
    $('resArtifacts').textContent = `${r.artifacts} / 3`;
    $('resTime').textContent = `${mm}:${ss}`;
    $('resSpecies').textContent = `${r.def.species} · ${r.def.place}`;
    $('resFact').textContent = r.def.fact;
    $('resMet').hidden = $('resMetRow').hidden = !r.met.length;
    $('resMet').textContent = r.met.map(k => SPECIES[k].name).join(', ');
    save.unlocked = Math.max(save.unlocked, Math.min(LEVELS.length, current + 2));
    const best = save.best[r.def.id] || {};
    save.best[r.def.id] = { artifacts: Math.max(best.artifacts || 0, r.artifacts), bones: Math.max(best.bones || 0, r.bones) };
    store(); renderLevels();

    $('nextLevel').hidden = current + 1 >= LEVELS.length;
    $('soon').hidden = current + 1 < LEVELS.length;
    const nextDef = LEVELS[current + 1];
    $('soon').textContent = current + 1 >= LEVELS.length ? `Wereld ${r.def.world} voltooid! De volgende wereld komt binnenkort.` : '';
    $('nextLevel').textContent = nextDef && nextDef.world !== r.def.world ? `Naar wereld ${nextDef.world} ▶` : 'Volgende level ▶';
    show('complete');
  },
  gameOver() { show('gameover'); },
  met(k) { if (!save.met.includes(k)) { save.met.push(k); store(); } },
};

const game = new Game(canvas, input, audio, ui);
if (window.PIXEL_MODE) installPixel(game);   // v3: dezelfde game in pixel art
window.game = game; // handig voor testen
game.load(LEVELS[0]);
game.state = 'title';
audio.setAmbience('savanna');
show('title');

const cinema = new Cinema(audio);
window.cinema = cinema; // handig voor testen
const worldOf = L => +String(L.id).replace(/^w/, '').split('-')[0];
function startLevel(i, skipIntro) {
  current = i;
  audio.unlock();
  show(null);
  // Eerste keer in een nieuw hoofdstuk: eerst het introfilmpje
  const L = LEVELS[i], w = worldOf(L);
  if (!skipIntro && /-1$/.test(L.id) && hasIntro(w) && !save.intros.includes(w)) {
    save.intros.push(w); store(); tryFullscreen();
    cinema.play(w, () => startLevel(i, true));
    return;
  }
  game.start(LEVELS[i]);
  tryFullscreen();
}

function tryFullscreen() {
  if (!input.touchMode) return;
  const el = document.documentElement;
  if (!document.fullscreenElement && el.requestFullscreen) {
    el.requestFullscreen({ navigationUI: 'hide' }).then(() => screen.orientation?.lock?.('landscape').catch(() => {})).catch(() => {});
  }
}

const on = (id, fn) => $(id).addEventListener('click', e => { e.preventDefault(); audio.unlock(); audio.play('click'); fn(); });
on('play', () => startLevel(Math.min(save.unlocked, LEVELS.length) - 1));
on('intro', () => { const w = worldOf(LEVELS[Math.min(save.unlocked, LEVELS.length) - 1]); tryFullscreen(); cinema.play(hasIntro(w) ? w : 1, () => audio.playSong('title')); });

// Levelkeuze op het titelscherm
function renderLevels() {
  const box = $('levels'); box.innerHTML = '';
  LEVELS.forEach((L, i) => {
    const b = document.createElement('button');
    b.className = 'chip'; b.disabled = i >= save.unlocked;
    const art = save.best[L.id]?.artifacts || 0;
    b.innerHTML = `<b>${L.id}</b> ${L.name}${i < save.unlocked ? ` <span>${'◆'.repeat(art)}${'◇'.repeat(3 - art)}</span>` : ' · op slot'}`;
    b.addEventListener('click', e => { e.preventDefault(); audio.unlock(); audio.play('click'); startLevel(i); });
    box.appendChild(b);
  });
  $('play').textContent = save.unlocked > 1 ? `▶ Verder: ${LEVELS[Math.min(save.unlocked, LEVELS.length) - 1].id}` : '▶ Spelen';
}
renderLevels();
// Startscherm Oersprong (pixelversie): levend oerwoud, houten knoppen en boomschijven
const oerCv = $('oerCanvas');
if (oerCv) {
  const scene = new TitleScene(), oc = oerCv.getContext('2d');
  document.querySelectorAll('button.plank').forEach((b, i) => { b.style.backgroundImage = `url(${plankBoard(64, 1, 18, 5 + i * 4).toDataURL()})`; });
  const ICONS = {
    music: ['0001111', '0001001', '0001001', '0001001', '0111011', '1111111', '0110110'],
    sound: ['0001000', '0011010', '1111001', '1111101', '1111001', '0011010', '0001000'],
    film: ['1111111', '1010101', '1111111', '1000001', '1011001', '1000001', '1111111'],
    update: ['0111100', '1000010', '1000111', '1000010', '1000000', '1000001', '0111110'],
  };
  document.querySelectorAll('button.log').forEach(el => { el.style.backgroundImage = `url(${logSlice(ICONS[el.dataset.icon]).toDataURL()})`; });
  const loop = now => {
    if ($('title').classList.contains('open')) { const W = Math.max(240, Math.round(TH * innerWidth / innerHeight)); if (oerCv.width !== W) { oerCv.width = W; oerCv.height = TH; } scene.draw(oc, W, now / 1000); }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  on('levelsBtn', () => { $('levelPanel').hidden = !$('levelPanel').hidden; });
  on('levelsClose', () => { $('levelPanel').hidden = true; });
}
on('resume', () => { show(null); game.state = 'play'; game.last = performance.now(); });
on('restart', () => startLevel(current));
on('toTitle', () => { show('title'); game.load(LEVELS[0]); game.state = 'title'; audio.playSong('title'); });
on('again', () => startLevel(current));
on('nextLevel', () => startLevel(current + 1));
on('retry', () => startLevel(current));

// Nieuwste versie laden: alle spelbestanden vers ophalen en dan herstarten.
// (Handig in volledig scherm, waar de browser geen verversknop toont.)
async function update() {
  const files = new Set([location.href.split('?')[0]]);
  for (const e of performance.getEntriesByType('resource')) if (/\.(js|svg|json)(\?|$)/.test(e.name)) files.add(e.name);
  try { await Promise.all([...files].map(f => fetch(f, { cache: 'reload' }))); } catch {}
  location.reload();
}
for (const el of document.querySelectorAll('[data-update]')) el.addEventListener('click', e => { e.preventDefault(); if (el.dataset.icon) el.classList.add('busy'); else el.textContent = '↻ Bezig…'; update(); });
$('version').textContent = 'versie ' + VERSION + (window.PIXEL_MODE ? ' · pixel' : ' · getekend');

function syncAudioButtons() {
  for (const el of document.querySelectorAll('[data-toggle=music]')) { if (el.dataset.icon) el.classList.toggle('off', !audio.music); else el.textContent = audio.music ? '♫ Muziek aan' : '♫ Muziek uit'; }
  for (const el of document.querySelectorAll('[data-toggle=sfx]')) { if (el.dataset.icon) el.classList.toggle('off', !audio.sfx); else el.textContent = audio.sfx ? 'Geluid aan' : 'Geluid uit'; }
}
for (const el of document.querySelectorAll('[data-toggle]')) el.addEventListener('click', e => {
  e.preventDefault(); audio.unlock();
  if (el.dataset.toggle === 'music') audio.setMusic(!audio.music); else audio.setSfx(!audio.sfx);
  syncAudioButtons(); audio.play('click');
});
syncAudioButtons();

// Uitleg op het titelscherm passend bij het apparaat
$('howTouch').hidden = !input.touchMode;
$('howKeys').hidden = input.touchMode;

// Pauzeren als de app naar de achtergrond gaat
document.addEventListener('visibilitychange', () => { if (document.hidden && (game.state === 'play' || game.state === 'intro')) ui.pause(); });

function loop(now) { game.frame(now); requestAnimationFrame(loop); }
requestAnimationFrame(loop);
