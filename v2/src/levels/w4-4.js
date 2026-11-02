// Wereld 4 · Level 4: de laatste kust van Gibraltar.
// Hier was het milder: een van de laatste plekken waar Neanderthalers leefden. Ontmoeting met Homo sapiens.
// Eindbaas: de holenleeuw.
export default {
  id: '4-4', world: 4, name: 'De laatste kust',
  species: 'Neanderthaler (Homo neanderthalensis)', place: 'Gibraltar (Gorham’s Cave)', era: 'circa 42.000 jaar geleden',
  theme: 'coast', music: 'coast', look: 'neanderthalensis', tool: 'spear', fire: true, phys: { walk: 152, run: 245 },
  width: 236, height: 17,
  boss: 'cavelion',
  arena: { x1: 196, x2: 222, trigger: 199, gate: 195, gateRows: [3, 4, 5, 6, 7, 8, 9, 10], exit: 223, exitRows: [3, 4, 5, 6, 7, 8, 9, 10], ceil: 15 },
  fact: 'In Gorham’s Cave op Gibraltar leefden Neanderthalers tot ongeveer 40.000 jaar geleden, misschien nog iets langer. Ze aten vis, schelpdieren, zeehonden en vogels. In de grotvloer krasten ze een kruisjespatroon: misschien een van de oudste tekeningen ter wereld.',
  build(b) {
    b.ent('start', 3, 3);
    b.ground(0, 26);
    b.ent('tree', 8, 3, { scale: 1 });
    b.bones(10, 4, 3);
    b.bump(16, 6, 'berry');
    // A · Rotsen in de branding
    b.water(27, 43, 2);
    b.rock(29, 1, 3, 3); b.rock(34, 1, 3, 4); b.rock(39, 1, 3, 3);
    b.bones(29, 6, 3); b.bones(34, 7, 3); b.bones(39, 6, 3);
    b.ground(44, 72);
    b.ent('vulture', 55, 9);
    b.ent('checkpoint', 50, 3);
    b.rock(60, 3, 2, 3); b.ent('artifact', 61, 8, { id: 'a1', name: 'Krassen in de grotvloer' });
    // B · De kalksteenrots: klimmen
    b.climb(73, 3, 1, 7, 'rock'); b.ground(74, 96, 10);
    b.ent('wolf', 86, 10);
    b.bump(80, 13, 'shroom');
    b.crumble(97, 9, 4); b.ground(101, 104, 7); b.ground(105, 140, 3);
    b.ent('checkpoint', 108, 3);
    // C · Ontmoeting met Homo sapiens
    b.ent('meet', 116, 3, { species: 'sapiens', offsets: [0, 38, 74], sizes: [1, 1, 0.75] });
    b.ent('hyena', 132, 3);
    b.water(141, 152); b.ent('log', 142, 2, { from: 141, to: 152, len: 3, speed: 48 });
    b.ground(153, 194);
    b.ent('checkpoint', 156, 3);
    b.ent('boulder', 168, 12, { every: 2.2 });
    b.rock(172, 3, 2, 2); b.rock(174, 5, 2, 2); b.ent('artifact', 175, 9, { id: 'a2', name: 'Veer van een raaf' });
    b.ent('artifact', 186, 7, { id: 'a3', name: 'Schelp met oker' }); b.rock(185, 3, 3, 3);
    b.bump(162, 6, 'honey');
    // D · Arena van de holenleeuw
    b.ent('checkpoint', 192, 3);
    b.ground(191, 235, 3);
    b.rock(201, 6, 2, 1); b.rock(216, 6, 2, 1);
    b.ent('boss', 218, 3);
    b.rock(223, 3, 1, 8);
    b.ent('finish', 226, 3);
  },
};
