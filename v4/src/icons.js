import { SHAPES } from './iconshapes.js';

// Alle tekens in het spel komen uit één set: game-icons.net (CC BY 3.0, zie assets/CREDITS.md). Gevulde vormen, één stijl.
// De vormen zelf staan in iconshapes.js (gemaakt met /root/tools/homo-assets/iconwork/gen.py); hier krijgen ze alleen kleur.
const gi = (k) => `<svg viewBox="0 0 512 512" fill="currentColor"><path d="${SHAPES[k]}"/></svg>`;

// Tekens op knoppen: de kleur volgt de knop
export const ICON = Object.fromEntries(Object.keys(SHAPES).map((k) => [k, gi(k)]));

// Plaatjes van de dingen zelf: dezelfde vormen, in de kleur van het ding en met een donkere rand
const TINT = {
  stone: '#a89a88', berry: '#7a4a9c', redberry: '#d8402e', leaf: '#5e8a3a', flake: '#c2b29a', meat: '#b8463a', bone: '#e8dcc0', egg: '#efe4c8',
  hide: '#e4dac6', branch: '#9a7650', pouch: '#c9a48c', waterbag: '#b88f78', stick: '#b08a5a', tuber: '#c09a6c', fish: '#8a8a80', axe: '#8a8a96',
  torch: '#f0a030', roast: '#9a5e34', honey: '#e8a020', fig: '#8a5a8a', nut: '#a8794a', marula: '#d8c060', baobab: '#b8a078', marrow: '#e8dcc0',
};
export const ITEM_ICON = Object.fromEntries(Object.entries(TINT).map(([k, c]) => [k,
  `<svg viewBox="-20 -20 552 552"><path d="${SHAPES[k]}" fill="${c}" stroke="#241a12" stroke-width="30" stroke-linejoin="round" paint-order="stroke"/></svg>`]));
