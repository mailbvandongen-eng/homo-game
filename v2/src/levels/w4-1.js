// Wereld 4 · Level 1: de mammoetsteppe. Je speelt een Neanderthaler.
// Nieuw: kou (warm blijven bij het vuur), glad ijs, een rendierkudde, de wolharige neushoorn en meerijden op een wolharige mammoet.
export default {
  id: '4-1', world: 4, name: 'De mammoetsteppe',
  species: 'Neanderthaler (Homo neanderthalensis)', place: 'De Krim en de steppe van Oost-Europa', era: 'circa 60.000 jaar geleden',
  theme: 'steppe', music: 'ice', look: 'neanderthalensis', tool: 'spear', fire: true, cold: true, coldTime: 48, phys: { walk: 152, run: 245 },
  width: 224, height: 15,
  fact: 'In de ijstijd lag over Europa en Azië een droge, koude grasvlakte: de mammoetsteppe. Er leefden wolharige mammoeten, wolharige neushoorns, rendieren, wilde paarden en bizons. Neanderthalers overleefden er met vuur, kleding van huiden en slimme jacht.',
  build(b) {
    b.ent('start', 3, 3);
    b.ground(0, 30);
    b.ent('sign', 5, 3, { text: 'Koud! Blijf bij het vuur' });
    b.ent('tree', 14, 3, { scale: 0.9 });
    b.bones(12, 5, 3);
    // A · Eerste ijsvlakte: je glijdt door
    b.mud(18, 29); b.bones(20, 6, 6, { arc: 0.8 });
    b.ground(34, 62);
    b.ent('wolf', 46, 3);
    b.rock(41, 3, 2, 2); b.ent('artifact', 42, 7, { id: 'a1', name: 'Levallois-punt' }); b.rock(42, 5, 1, 1);
    b.bump(37, 6, 'berry'); b.bump(57, 6, 'redcap');
    // B · IJs met een wolharige neushoorn; rotsen om op te schuilen
    b.mud(63, 82);
    b.rock(66, 3, 2, 3); b.bones(66, 7, 2);
    b.ent('rhino', 76, 3, { skin: 'woolly' });
    b.ground(83, 126);
    b.ent('checkpoint', 85, 3);
    // C · Rendierkudde: spring op de rotsen
    b.ent('stampede', 90, 3, { count: 9, every: 0.5, kind: 'reindeer' });
    b.rock(93, 3, 2, 3); b.rock(105, 3, 2, 3); b.rock(117, 3, 2, 3);
    b.bones(93, 7, 2); b.bones(105, 7, 2); b.bones(117, 7, 2);
    b.ent('tree', 111, 3, { scale: 1 });
    // D · De wolharige mammoet: de termietenheuvel is hier een sneeuwbult die je lanceert
    b.ground(127, 152);
    b.spring(128, 3); b.ent('mega', 131, 3, { from: 130, to: 150, speed: 36, kind: 'woolly' });
    b.bones(134, 10, 6);
    b.rock(150, 8, 2, 1); b.ent('artifact', 151, 10, { id: 'a2', name: 'Berkenpek (lijm)' });
    b.ent('checkpoint', 155, 3);
    b.ground(153, 158);
    // E · Bevroren meer met ijsschotsen
    b.water(159, 174);
    b.ent('log', 160, 2, { from: 159, to: 164, len: 3, speed: 34, ice: true });
    b.rock(165, 1, 4, 2); b.bones(165, 5, 4);
    b.ent('log', 170, 2, { from: 169, to: 174, len: 3, speed: 36, ice: true, offset: 0.6 });
    b.ground(175, 223);
    b.ent('wolf', 184, 3); b.ent('wolf', 192, 3, { fast: true });
    b.rock(196, 3, 2, 3); b.ent('artifact', 197, 8, { id: 'a3', name: 'Schraper voor huiden' }); b.rock(197, 6, 1, 1);
    b.bump(188, 6, 'shroom');
    // Extra vijanden: de moeilijkheid stijgt per wereld
    b.ent('wolf', 24, 3); b.ent('hyena', 120, 3); b.ent('wolf', 146, 3, { fast: true }); b.ent('rhino', 203, 3, { skin: 'woolly' });
    b.ent('finish', 210, 3);
  },
};
