// Instellingen van de speler: hoe snel je kijkt, hoe hard het geluid staat, hoe zwaar het beeld is en hoe groot de knoppen zijn.
// Los van de voortgang bewaard: opnieuw beginnen wist ze niet. De testmodus heeft een eigen plek.
import { DEV } from '../save.js';
const KEY = DEV ? 'homo-settings-dev' : 'homo-settings';
export const DEFAULTS = { look: 1, volume: 0.9, quality: 'auto', size: 1, zoom: 4 };
export const QUALITY = {
  // pixels: hoeveel schermpixels er hooguit getekend worden; shadow: maat van de schaduwkaart (0 = geen schaduw)
  laag: { name: 'Laag', pixels: 1, shadow: 0 },
  gewoon: { name: 'Gewoon', pixels: 1.5, shadow: 1024 },
  hoog: { name: 'Hoog', pixels: 2, shadow: 2048 },
};
const store = () => { try { return localStorage; } catch (e) { return null; } };
function read() {
  const s = store(), out = { ...DEFAULTS };
  if (!s) return out;
  try {
    const d = JSON.parse(s.getItem(KEY) || 'null');
    if (d) { for (const k in DEFAULTS) if (typeof d[k] === typeof DEFAULTS[k]) out[k] = d[k]; } else {
      // wat een eerdere versie los bewaarde, nemen we één keer over
      if (s.getItem('homo4-mute') === '1') out.volume = 0;
      const z = +s.getItem('homoV4zoom'); if (z) out.zoom = z;
    }
  } catch (e) { /* onleesbaar: de gewone waarden */ }
  if (!QUALITY[out.quality] && out.quality !== 'auto') out.quality = 'auto';
  return out;
}
export const settings = read();
const subs = [];
export function onSetting(fn) { subs.push(fn); }
export function setSetting(k, v, quiet) {
  if (!(k in DEFAULTS) || settings[k] === v) return;
  settings[k] = v;
  try { store()?.setItem(KEY, JSON.stringify(settings)); } catch (e) { /* geen opslag */ }
  if (!quiet) for (const fn of subs) fn(k, v);
}
// 'auto' kiest zelf: een telefoon of tablet krijgt 'gewoon', een computer 'hoog'. Loopt het spel te traag, dan zet de lus het een trap lager.
let autoLevel = typeof matchMedia !== 'undefined' && matchMedia('(pointer:coarse)').matches ? 'gewoon' : 'hoog';
export function qualityNow() { return settings.quality === 'auto' ? autoLevel : settings.quality; }
export function lowerAuto() {
  if (settings.quality !== 'auto' || autoLevel === 'laag') return false;
  autoLevel = autoLevel === 'hoog' ? 'gewoon' : 'laag';
  for (const fn of subs) fn('quality', 'auto');
  return true;
}
