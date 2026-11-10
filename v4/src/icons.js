// Eenvoudige icoontjes als SVG, zodat de knoppen geen tekst nodig hebben
const svg = (body, vb = 48) => `<svg viewBox="0 0 ${vb} ${vb}" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

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
  // gooien: een arm met een boog
  throw: svg('<circle cx="38" cy="10" r="5"/><path d="M8 40c4-16 14-26 26-28" stroke-dasharray="4 5"/><path d="M6 44l8-10 6 4"/>'),
  // afslag slaan: twee stenen met een vonk ertussen
  knap: svg('<path d="M6 30l5-9 9-2 4 7-5 7-9 0z"/><path d="M42 18l-5 9-9 2-4-7 5-7 9 0z"/><path d="M24 20l2-6M28 24l6-2M22 26l-4 4"/>'),
  // snijden: een scherpe afslag
  cut: svg('<path d="M8 36L30 8l10 6-24 26z"/><path d="M12 40c8 2 18 2 28-2"/>'),
  // omdraaien: een pijl in een boog
  turn: svg('<path d="M10 30c0-10 8-16 16-16h8"/><path d="M28 8l7 6-7 6"/><path d="M8 38h32"/>'),
  // slaan: een vuist
  strike: svg('<path d="M14 22c0-4 2-6 5-6s4 2 4 5M23 20c0-4 2-6 5-6s4 2 4 5M32 20c0-3 2-5 4-5s4 2 4 5v8c0 9-6 15-14 15h-2c-7 0-12-5-12-12v-6c0-3 2-5 4-5s4 2 4 5"/><path d="M4 12l5 4M8 6l3 6M2 20h6"/>'),
  // springen: een figuurtje dat opspringt boven een boog
  jump: svg('<circle cx="26" cy="9" r="4"/><path d="M26 14v12M26 18l-8 4M26 18l8-3M26 26l-6 8M26 26l7 6"/><path d="M8 44c6-6 26-6 32 0" stroke-dasharray="3 5"/>'),
  // ruilen: twee pijlen
  swap: svg('<path d="M8 18h28l-7-7M40 30H12l7 7"/>'),
  book: svg('<path d="M8 10c6-2 11-1 16 3 5-4 10-5 16-3v28c-6-2-11-1-16 3-5-4-10-5-16-3z"/><path d="M24 13v28"/>'),
  sound: svg('<path d="M8 19h7l10-8v26l-10-8H8z"/><path d="M31 18c3 3 3 9 0 12M36 13c6 6 6 16 0 22"/>'),
  mute: svg('<path d="M8 19h7l10-8v26l-10-8H8z"/><path d="M32 19l10 10M42 19L32 29"/>'),
  // geven: een open hand met iets erop
  give: svg('<path d="M6 32c6-3 10-3 14 0l8 2c3 1 3 4 0 4l-8-1"/><path d="M28 36l12-5c3-1 4 2 2 4l-14 8c-4 2-8 2-12 0l-10-4"/><circle cx="26" cy="15" r="7"/><path d="M26 4v2M36 9l-2 1M16 9l2 1"/>'),
  // slapen: een maansikkel
  sleep: svg('<path d="M34 8a17 17 0 1 0 6 26A14 14 0 0 1 34 8z"/><path d="M8 10h6l-6 7h6M18 4h4l-4 5h4"/>'),
  close: svg('<path d="M14 14l20 20M34 14L14 34"/>'),
};

// Plaatjes van de dingen zelf (gekleurd)
export const ITEM_ICON = {
  stone: '<svg viewBox="0 0 48 48"><path d="M8 30l6-14 14-5 12 7 2 14-12 7-16-1z" fill="#9a8a78" stroke="#3a3028" stroke-width="2.5" stroke-linejoin="round"/><path d="M16 18l10 4 12-3" stroke="#c8b8a4" stroke-width="2" fill="none"/></svg>',
  berry: '<svg viewBox="0 0 48 48"><path d="M24 6c-2 6-6 8-6 12" stroke="#4a6a2a" stroke-width="2.5" fill="none"/><path d="M24 8c6-4 12-2 14 2-6 2-10 1-14-2z" fill="#5e8a32"/>' + [[16, 22], [28, 22], [22, 30], [12, 32], [32, 32], [24, 40]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6.5" fill="#5a2a7a" stroke="#2a1430" stroke-width="2"/><circle cx="${x - 2}" cy="${y - 2}" r="1.6" fill="#b88ad8"/>`).join('') + '</svg>',
  redberry: '<svg viewBox="0 0 48 48"><path d="M24 6c-2 6-6 8-6 12" stroke="#4a6a2a" stroke-width="2.5" fill="none"/><path d="M24 8c6-4 12-2 14 2-6 2-10 1-14-2z" fill="#5e8a32"/>' + [[16, 22], [28, 22], [22, 30], [12, 32], [32, 32], [24, 40]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6.5" fill="#d8302a" stroke="#5a1410" stroke-width="2"/><circle cx="${x - 2}" cy="${y - 2}" r="1.8" fill="#ffb0a0"/>`).join('') + '</svg>',
  leaf: '<svg viewBox="0 0 48 48"><path d="M10 40C8 22 20 8 40 8c0 20-12 32-30 32z" fill="#3c6a2a" stroke="#1a3010" stroke-width="2.5"/><path d="M12 38L34 14M20 30l-2-8M26 24l6 1" stroke="#8ab86a" stroke-width="2" fill="none"/></svg>',
  flake: '<svg viewBox="0 0 48 48"><path d="M8 34L30 8l12 8-8 22z" fill="#b8a890" stroke="#3a3028" stroke-width="2.5" stroke-linejoin="round"/><path d="M14 32l18-20" stroke="#e8dcc8" stroke-width="2"/></svg>',
  meat: '<svg viewBox="0 0 48 48"><path d="M8 28c-2-10 6-18 16-18s18 6 16 16-10 14-20 12S9 34 8 28z" fill="#a83a32" stroke="#3a1410" stroke-width="2.5"/><path d="M14 26c2-6 8-9 14-8" stroke="#e8c8b0" stroke-width="3.5" fill="none" stroke-linecap="round"/><ellipse cx="30" cy="27" rx="4" ry="3" fill="#e8dcc0" stroke="#3a1410" stroke-width="2"/></svg>',
  bone: '<svg viewBox="0 0 48 48"><path d="M14 30l16-16" stroke="#3a3028" stroke-width="9" stroke-linecap="round"/><path d="M14 30l16-16" stroke="#e8dcc0" stroke-width="5" stroke-linecap="round"/><g fill="#e8dcc0" stroke="#3a3028" stroke-width="2.5"><circle cx="9" cy="31" r="5"/><circle cx="15" cy="37" r="5"/><circle cx="33" cy="11" r="5"/><circle cx="39" cy="17" r="5"/></g></svg>',
  egg: '<svg viewBox="0 0 48 48"><path d="M24 6c8 0 14 12 14 21s-6 15-14 15-14-6-14-15S16 6 24 6z" fill="#efe4c8" stroke="#3a3028" stroke-width="2.5"/><g fill="#9a7c58"><circle cx="19" cy="20" r="1.8"/><circle cx="28" cy="16" r="1.4"/><circle cx="30" cy="28" r="2"/><circle cx="20" cy="32" r="1.5"/><circle cx="25" cy="24" r="1.2"/></g></svg>',
  honey: '<svg viewBox="0 0 48 48"><path d="M8 14l12-6 20 6v18l-12 8-20-8z" fill="#e8a020" stroke="#4a2c08" stroke-width="2.5" stroke-linejoin="round"/><g fill="#8a5408"><circle cx="16" cy="20" r="3"/><circle cx="25" cy="18" r="3"/><circle cx="34" cy="21" r="3"/><circle cx="20" cy="28" r="3"/><circle cx="30" cy="29" r="3"/></g><path d="M34 34c0 4 1 6 3 8 2-2 3-4 3-8" fill="#f8c040" stroke="#4a2c08" stroke-width="2"/></svg>',
};
