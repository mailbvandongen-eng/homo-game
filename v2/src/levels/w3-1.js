// Wereld 3 · Level 1: de krijtkust van Boxgrove. Je speelt Homo heidelbergensis.
// Nieuw: glibberig slik (je glijdt door), neushoorns die op je af stormen. Sporen van Homo antecessor.
export default {
  id: '3-1', world: 3, name: 'De krijtkust',
  species: 'Homo heidelbergensis', place: 'Boxgrove, Zuid-Engeland', era: 'circa 500.000 jaar geleden',
  theme: 'coast', music: 'coast', look: 'heidelbergensis', tool: 'axe', phys: { walk: 158, run: 255 },
  width: 232, height: 15,
  fact: 'Bij Boxgrove liggen honderden handbijlen en paardenbotten met snijsporen, zo’n 500.000 jaar oud. In een paardenschouderblad zit een gat dat mogelijk van een speer komt. Van de mensen zelf zijn een scheenbeen en een paar tanden gevonden.',
  build(b) {
    b.ent('start', 3, 3);
    b.ground(0, 14);
    b.ent('tree', 6, 3, { scale: 1 });
    b.bones(8, 4, 3);
    // A · Eerste slik: je glijdt door, dus spring op tijd
    b.mud(15, 34);
    b.water(22, 24, 3); b.ground(22, 24, 1);
    b.bones(21, 5, 5, { arc: 0.6 });
    b.water(30, 31, 3); b.ground(30, 31, 1);
    b.ground(35, 48);
    b.ent('wolf', 42, 3);
    // B · Voetsporen in het slik
    b.mud(49, 66);
    b.ent('meet', 58, 3, { species: 'antecessor', trace: true });
    b.ent('artifact', 62, 6, { id: 'a1', name: 'Boxgrove-handbijl' });
    b.ground(67, 90);
    b.ent('checkpoint', 70, 3);
    // C · De neushoorn op de vlakte, met rotsen als schuilplek
    b.rock(76, 3, 2, 2);
    b.ent('rhino', 86, 3);
    b.crack(91, 3, 1, 3); b.rock(91, 6, 1, 2);
    b.ground(91, 118);
    b.rock(98, 3, 2, 3); b.bones(98, 7, 2);
    b.ent('fig', 104, 4);
    b.ent('rhino', 112, 3, { dir: -1 });
    b.ent('tree', 108, 3, { scale: 1.1 });
    // D · Krijtrotsen en een getijdegeul
    b.stairs(119, 3, 4);
    b.ground(119, 126, 3); b.rock(119, 3, 4, 1); b.rock(123, 3, 4, 4);
    b.bones(124, 8, 3);
    b.water(127, 142);
    b.ent('log', 128, 2, { from: 127, to: 136, len: 4, speed: 44 });
    b.rock(137, 0, 2, 3);
    b.ent('log', 140, 2, { from: 139, to: 142, len: 3, speed: 30 });
    b.ground(143, 168);
    b.ent('checkpoint', 146, 3);
    b.ent('wolf', 154, 3, { fast: true }); b.ent('wolf', 160, 3, { fast: true, dir: 1 });
    // E · Lang slik met kuilen en een tweede neushoorn
    b.mud(169, 196);
    b.water(175, 177, 3); b.ground(175, 177, 1);
    b.water(184, 186, 3); b.ground(184, 186, 1);
    b.ent('artifact', 185, 7, { id: 'a2', name: 'Paardenschouderblad' });
    b.ground(197, 231);
    b.ent('rhino', 204, 3);
    b.rock(200, 3, 2, 3);
    b.ent('artifact', 201, 8, { id: 'a3', name: 'Scheenbeen van Boxgrove' });
    b.ent('tree', 212, 3, { scale: 1.1 });
    b.ent('finish', 214, 3);
  },
};
