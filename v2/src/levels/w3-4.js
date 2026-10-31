// Wereld 3 · Level 4: de speren van Schöningen.
// Nieuw: de werpspeer. Hij verjaagt dieren en blijft steken in kleiwanden: dan kun je erop staan.
// Een kudde wilde paarden, en de eindbaas: de dolktandkat Homotherium.
export default {
  id: '3-4', world: 3, name: 'De speren van Schöningen',
  species: 'Homo heidelbergensis of vroege Neanderthaler', place: 'Schöningen, Duitsland', era: 'circa 300.000 – 200.000 jaar geleden',
  theme: 'lake', music: 'lake', look: 'heidelbergensis', tool: 'spear', phys: { walk: 158, run: 255 },
  width: 236, height: 17,
  boss: 'homotherium',
  arena: { x1: 196, x2: 222, trigger: 199, gate: 195, gateRows: [3, 4, 5, 6, 7, 8, 9, 10], exit: 223, exitRows: [3, 4, 5, 6, 7, 8, 9, 10], ceil: 15 },
  fact: 'In Schöningen zijn houten speren gevonden van ruim twee meter, tussen de botten van tientallen paarden: de oudste complete jachtwapens die we kennen. Lang werden ze op circa 300.000 jaar geschat; nieuw onderzoek uit 2025 komt uit op ongeveer 200.000 jaar. Ook een tand van de dolktandkat Homotherium is er gevonden.',
  build(b) {
    b.ent('start', 3, 3);
    b.ground(0, 30);
    b.ent('tree', 7, 3, { scale: 1 });
    b.bones(9, 4, 3);
    // A · Eerste kleiwand: gooi een speer erin en klim erop (staand gooien werkt ook: een trapje)
    b.clay(20, 3, 4, 5);
    b.bones(21, 9, 3);
    b.ground(24, 44, 8);
    b.ent('wolf', 34, 8);
    b.ground(45, 48, 6); b.ground(49, 60, 3);
    b.ent('artifact', 56, 6, { id: 'a1', name: 'Speerpunt' }); b.rock(55, 3, 2, 2);
    // B · Kudde wilde paarden langs het meer
    b.ent('checkpoint', 62, 3);
    b.ground(61, 104, 3);
    b.ent('stampede', 68, 3, { count: 10, every: 0.45, kind: 'horse' });
    b.rock(71, 3, 2, 3); b.clay(82, 3, 3, 4); b.rock(94, 3, 2, 3);
    b.bones(82, 8, 3);
    b.water(105, 116); b.ent('log', 106, 2, { from: 105, to: 116, len: 4, speed: 46 });
    b.ground(117, 140, 3);
    // C · Hoge kleiwand met twee treden
    b.ent('checkpoint', 119, 3);
    b.clay(126, 3, 3, 7);
    b.ground(129, 150, 10);
    b.bones(127, 11, 3);
    b.ent('wolf', 138, 10, { fast: true });
    b.ent('artifact', 144, 13, { id: 'a2', name: 'Werpstok' }); b.clay(144, 10, 1, 2);
    b.ground(151, 154, 7); b.ground(155, 190, 3);
    b.ent('stampede', 158, 3, { count: 6, every: 0.6, kind: 'horse' });
    b.clay(166, 3, 2, 5); b.bones(166, 9, 2);
    b.ent('fig', 175, 4);
    b.ent('artifact', 182, 8, { id: 'a3', name: 'Paardenbot met snijsporen' }); b.clay(181, 3, 3, 4);
    // D · Arena van de dolktandkat
    b.ent('checkpoint', 192, 3);
    b.ground(191, 235, 3);
    b.rock(201, 6, 2, 1); b.rock(216, 6, 2, 1);
    b.ent('boss', 218, 3);
    b.rock(223, 3, 1, 8);
    b.ent('tree', 228, 3, { scale: 1.1 });
    b.ent('finish', 226, 3);
  },
};
