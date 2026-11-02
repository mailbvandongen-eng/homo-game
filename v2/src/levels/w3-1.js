// Wereld 3 · Level 1: de krijtkust van Boxgrove. Je speelt Homo heidelbergensis.
// Hoofdidee: glad slik. Leren (slik zonder gevaar, dan één smalle geul), oefenen (bredere geulen, neushoorn),
// verrassing (na een stam landen op slik: meteen afremmen), finale (alles samen). Sporen van Homo antecessor.
export default {
  id: '3-1', world: 3, name: 'De krijtkust',
  species: 'Homo heidelbergensis', place: 'Boxgrove, Zuid-Engeland', era: 'circa 500.000 jaar geleden',
  theme: 'coast', music: 'coast', look: 'heidelbergensis', tool: 'axe', phys: { walk: 158, run: 255 },
  width: 232, height: 15,
  fact: 'Bij Boxgrove liggen honderden handbijlen en paardenbotten met snijsporen, zo’n 500.000 jaar oud. In een paardenschouderblad zit een gat dat mogelijk van een speer komt. Van de mensen zelf zijn een scheenbeen en een paar tanden gevonden.',
  build(b) {
    b.ent('start', 3, 3);
    const pit = (x1, x2) => { b.water(x1, x2, 3); b.ground(x1, x2, 1); };   // geul in het slik

    // 1 · LEREN: slik is glad. Eerst zonder gevaar, dan met één smalle geul.
    b.ground(0, 14);
    b.ent('tree', 6, 3, { scale: 1 });
    b.bones(8, 4, 3);
    b.mud(15, 30); b.bones(18, 4, 8);
    b.bump(22, 6, 'berry');
    b.ground(31, 36);
    b.ent('wolf', 35, 3);
    b.mud(37, 52); pit(43, 44); b.bones(42, 5, 4, { arc: 0.6 });

    // 2 · OEFENEN: voetsporen in het slik, bredere geulen, dan de neushoorn op vaste grond
    b.ground(53, 58);
    b.mud(59, 74);
    b.ent('meet', 62, 3, { species: 'antecessor', trace: true });
    b.ent('wolf', 66, 3);
    b.ent('artifact', 66, 7, { id: 'a1', name: 'Boxgrove-handbijl' });
    pit(70, 72); b.bones(69, 5, 5, { arc: 0.8 });
    b.ground(75, 99);
    b.ent('checkpoint', 77, 3);
    b.rock(82, 3, 2, 2); b.bones(82, 5, 2);            // schuilplek
    b.ent('rhino', 92, 3);                              // nieuw: de neushoorn stormt op je af
    b.crack(100, 3, 1, 3); b.rock(100, 6, 1, 2);
    b.ground(100, 122);
    b.rock(106, 3, 2, 3); b.bones(106, 7, 2);
    b.ent('wolf', 112, 3, { fast: true });
    b.ent('rhino', 118, 3, { dir: -1 });

    // 3 · VERRASSING: over de getijdegeul, en dan landen op slik: meteen afremmen voor de volgende geul
    b.stairs(125, 3, 2); b.rock(127, 3, 2, 2); b.bones(127, 6, 2);
    b.water(129, 142);
    b.ent('log', 130, 2, { from: 129, to: 136, len: 4, speed: 44 });
    b.rock(137, 0, 3, 3); b.bones(140, 5, 3, { arc: 0.6 });
    b.ent('vulture', 134, 3, { alt: 6 });
    b.mud(143, 152); b.bones(144, 4, 3);
    b.water(153, 161);
    b.ent('log', 154, 2, { from: 153, to: 161, len: 4, speed: 40 });
    b.ground(162, 180);
    b.ent('checkpoint', 164, 3);
    b.bump(167, 6, 'fig');

    // 4 · FINALE: snelle wolven, lang slik met brede geulen, een gier en een laatste neushoorn
    b.ent('wolf', 171, 3, { fast: true }); b.ent('wolf', 177, 3, { fast: true, dir: 1 });
    b.mud(181, 206);
    pit(187, 189); pit(196, 198);
    b.bones(186, 5, 5, { arc: 0.8 }); b.bones(195, 5, 5, { arc: 0.8 });
    b.ent('artifact', 188, 8, { id: 'a2', name: 'Paardenschouderblad' });
    b.ent('vulture', 193, 3, { alt: 6 });
    b.ground(207, 231);
    b.rock(210, 3, 2, 3); b.ent('artifact', 211, 8, { id: 'a3', name: 'Scheenbeen van Boxgrove' });
    b.ent('rhino', 217, 3);
    b.ent('tree', 224, 3, { scale: 1.1 });
    b.ent('finish', 226, 3);
  },
};
