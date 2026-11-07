// Eenvoudige icoontjes als SVG, zodat de knoppen geen tekst nodig hebben
const svg = (body, vb = 48) => `<svg viewBox="0 0 ${vb} ${vb}" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

export const ICON = {
  // een open hand: oppakken
  hand: svg('<path d="M17 25V11a3 3 0 0 1 6 0v12M23 22V8a3 3 0 0 1 6 0v14M29 22V10a3 3 0 0 1 6 0v16M17 24v-6a3 3 0 0 0-6 0v10c0 9 6 16 14 16h2c7 0 12-6 12-13V18a3 3 0 0 0-6 0"/>'),
  // een mond: proeven / eten
  mouth: svg('<path d="M6 24c6-7 12-9 18-5 6-4 12-2 18 5-6 9-12 12-18 12S12 33 6 24z"/><path d="M8 24h32"/>'),
  // een oog: bekijken
  eye: svg('<path d="M4 24c6-10 12-14 20-14s14 4 20 14c-6 10-12 14-20 14S10 34 4 24z"/><circle cx="24" cy="24" r="6"/>'),
  // neerleggen: een pijl naar beneden boven de grond
  drop: svg('<path d="M24 6v24M14 21l10 10 10-10M8 40h32"/>'),
  // kei op een bot: openslaan
  crack: svg('<path d="M10 14l8-6 10 2 4 8-6 6-10-1z"/><path d="M8 38h32M30 34l4-6M36 36l6-3M18 34l-3-5"/>'),
  // zintuigen: een oog met golfjes
  sense: svg('<path d="M10 24c4-7 9-10 14-10s10 3 14 10c-4 7-9 10-14 10s-10-3-14-10z"/><circle cx="24" cy="24" r="4"/><path d="M4 12c2-3 4-4 6-5M44 12c-2-3-4-4-6-5M4 36c2 3 4 4 6 5M44 36c-2 3-4 4-6 5"/>'),
  // sluipen: een gebogen figuurtje
  sneak: svg('<circle cx="31" cy="11" r="4"/><path d="M28 16c-6 2-11 6-13 11M15 27l-6 9M19 25l8 5 2 9M24 19l8 5"/>'),
  book: svg('<path d="M8 10c6-2 11-1 16 3 5-4 10-5 16-3v28c-6-2-11-1-16 3-5-4-10-5-16-3z"/><path d="M24 13v28"/>'),
  sound: svg('<path d="M8 19h7l10-8v26l-10-8H8z"/><path d="M31 18c3 3 3 9 0 12M36 13c6 6 6 16 0 22"/>'),
  mute: svg('<path d="M8 19h7l10-8v26l-10-8H8z"/><path d="M32 19l10 10M42 19L32 29"/>'),
  close: svg('<path d="M14 14l20 20M34 14L14 34"/>'),
};

// Plaatjes van de dingen zelf (gekleurd)
export const ITEM_ICON = {
  stone: '<svg viewBox="0 0 48 48"><path d="M8 30l6-14 14-5 12 7 2 14-12 7-16-1z" fill="#9a8a78" stroke="#3a3028" stroke-width="2.5" stroke-linejoin="round"/><path d="M16 18l10 4 12-3" stroke="#c8b8a4" stroke-width="2" fill="none"/></svg>',
  berry: '<svg viewBox="0 0 48 48"><path d="M24 6c-2 6-6 8-6 12" stroke="#4a6a2a" stroke-width="2.5" fill="none"/><path d="M24 8c6-4 12-2 14 2-6 2-10 1-14-2z" fill="#5e8a32"/>' + [[16, 22], [28, 22], [22, 30], [12, 32], [32, 32], [24, 40]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6.5" fill="#5a2a7a" stroke="#2a1430" stroke-width="2"/><circle cx="${x - 2}" cy="${y - 2}" r="1.6" fill="#b88ad8"/>`).join('') + '</svg>',
  redberry: '<svg viewBox="0 0 48 48"><path d="M24 6c-2 6-6 8-6 12" stroke="#4a6a2a" stroke-width="2.5" fill="none"/><path d="M24 8c6-4 12-2 14 2-6 2-10 1-14-2z" fill="#5e8a32"/>' + [[16, 22], [28, 22], [22, 30], [12, 32], [32, 32], [24, 40]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6.5" fill="#d8302a" stroke="#5a1410" stroke-width="2"/><circle cx="${x - 2}" cy="${y - 2}" r="1.8" fill="#ffb0a0"/>`).join('') + '</svg>',
  leaf: '<svg viewBox="0 0 48 48"><path d="M10 40C8 22 20 8 40 8c0 20-12 32-30 32z" fill="#3c6a2a" stroke="#1a3010" stroke-width="2.5"/><path d="M12 38L34 14M20 30l-2-8M26 24l6 1" stroke="#8ab86a" stroke-width="2" fill="none"/></svg>',
  bone: '<svg viewBox="0 0 48 48"><path d="M14 30l16-16" stroke="#3a3028" stroke-width="9" stroke-linecap="round"/><path d="M14 30l16-16" stroke="#e8dcc0" stroke-width="5" stroke-linecap="round"/><g fill="#e8dcc0" stroke="#3a3028" stroke-width="2.5"><circle cx="9" cy="31" r="5"/><circle cx="15" cy="37" r="5"/><circle cx="33" cy="11" r="5"/><circle cx="39" cy="17" r="5"/></g></svg>',
};
