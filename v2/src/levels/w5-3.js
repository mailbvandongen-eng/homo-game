// Wereld 5 · Level 3: de mammoetsteppe bij Kostenki, aan de Don in Rusland.
// Nieuw: sapiens in de ijstijd, met genaaide kleren en hutten van mammoetbotten. Ontmoeting met de laatste Neanderthalers.
export default {
  id: '5-3', world: 5, name: 'Hutten van mammoetbot',
  species: 'Homo sapiens', place: 'Kostenki aan de Don, Rusland', era: 'circa 40.000 jaar geleden',
  theme: 'steppe', music: 'ice', look: 'sapiens', tool: 'spear', fire: true, cold: true, coldTime: 52, region: 'europe', phys: { walk: 158, run: 255 },
  width: 228, height: 15,
  fact: 'Bij Kostenki aan de rivier de Don woonden al zo\'n 40.000 jaar geleden mensen zoals wij. Later bouwden ze daar ronde hutten van honderden mammoetbotten. Met naalden van bot naaiden ze warme kleren van bont, en ze sneden beeldjes uit mammoetivoor. Zo hielden sapiens het uit op de ijskoude steppe.',
  build(b) {
    b.ent('start', 3, 3);
    b.ground(0, 28);
    b.ent('checkpoint', 8, 3);
    b.ent('tree', 13, 3, { scale: 0.9 });
    b.bones(16, 5, 3);
    b.bump(21, 6, 'berry');
    // A · IJsvlakte en wolven
    b.mud(29, 42); b.bones(31, 6, 6, { arc: 0.8 });
    b.ground(43, 70);
    b.ent('wolf', 54, 3);
    b.rock(60, 3, 2, 3); b.ent('artifact', 61, 8, { id: 'a1', name: 'Naald met oog' }); b.rock(61, 6, 1, 1);
    b.ent('checkpoint', 46, 3);
    // B · De bevroren Don met ijsschotsen
    b.water(71, 86);
    b.ent('log', 72, 2, { from: 71, to: 77, len: 3, speed: 36, ice: true });
    b.rock(78, 1, 4, 2); b.bones(78, 5, 4);
    b.ent('log', 83, 2, { from: 82, to: 86, len: 3, speed: 34, ice: true, offset: 0.5 });
    b.ground(87, 122);
    b.ent('checkpoint', 90, 3);
    // C · Ontmoeting met de laatste Neanderthalers
    b.ent('meet', 98, 3, { species: 'neanderthalensis', offsets: [0, 38, 72], sizes: [1, 0.96, 0.74] });
    b.ent('rhino', 116, 3, { skin: 'woolly' });
    b.rock(112, 3, 2, 3); b.bones(112, 7, 2);
    b.bump(108, 6, 'redcap');
    // D · Rendierkudde
    b.ground(123, 160);
    b.ent('checkpoint', 125, 3);
    b.ent('stampede', 130, 3, { count: 9, every: 0.5, kind: 'reindeer' });
    b.rock(133, 3, 2, 3); b.rock(145, 3, 2, 3); b.rock(157, 3, 2, 3);
    b.bones(133, 7, 2); b.bones(145, 7, 2); b.bones(157, 7, 2);
    // E · Meerijden op een wolharige mammoet
    b.ground(161, 227);
    b.ent('checkpoint', 163, 3);
    b.spring(167, 3); b.ent('mega', 170, 3, { from: 169, to: 189, speed: 36, kind: 'woolly' });
    b.bones(173, 10, 6);
    b.rock(189, 8, 2, 1); b.ent('artifact', 190, 10, { id: 'a2', name: 'Kraal van mammoetivoor' });
    b.ent('wolf', 198, 3); b.ent('wolf', 205, 3, { fast: true });
    b.rock(209, 3, 2, 3); b.ent('artifact', 210, 8, { id: 'a3', name: 'Venusbeeldje' }); b.rock(210, 6, 1, 1);
    b.bump(201, 6, 'shroom');
    b.ent('checkpoint', 212, 3);
    b.ent('finish', 218, 3);
  },
};
