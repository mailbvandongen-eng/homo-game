import { Input } from './input.js';
import { Audio } from './audio.js';
import { Game } from './game.js';
import level11 from './levels/w1-1.js';

const LEVELS = [level11];
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
    $('nextLevel').hidden = current + 1 >= LEVELS.length;
    $('soon').hidden = current + 1 < LEVELS.length;
    show('complete');
  },
  gameOver() { show('gameover'); },
};

const game = new Game(canvas, input, audio, ui);
window.game = game; // handig voor testen
game.load(LEVELS[0]);
game.state = 'title';
show('title');

function startLevel(i) {
  current = i;
  audio.unlock();
  show(null);
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
on('play', () => startLevel(0));
on('resume', () => { show(null); game.state = 'play'; game.last = performance.now(); });
on('restart', () => startLevel(current));
on('toTitle', () => { show('title'); game.load(LEVELS[0]); game.state = 'title'; audio.playSong('title'); });
on('again', () => startLevel(current));
on('nextLevel', () => startLevel(current + 1));
on('retry', () => startLevel(current));

function syncAudioButtons() {
  for (const el of document.querySelectorAll('[data-toggle=music]')) el.textContent = audio.music ? '♫ Muziek aan' : '♫ Muziek uit';
  for (const el of document.querySelectorAll('[data-toggle=sfx]')) el.textContent = audio.sfx ? 'Geluid aan' : 'Geluid uit';
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
