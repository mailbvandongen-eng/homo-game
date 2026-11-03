// Wereld 5 · Level 4: de Chauvet-grot in Frankrijk.
// Nieuw: met de fakkel langs grotschilderingen. Eindbaas: de holenhyena. Buiten wacht het kampvuur.
export default {
  id: '5-4', world: 5, name: 'De Chauvet-grot',
  species: 'Homo sapiens', place: 'Chauvet-grot, Ardèche (Frankrijk)', era: 'circa 36.000 jaar geleden',
  theme: 'cave', music: 'cave', look: 'sapiens', tool: 'torch', fire: true, cold: true, coldTime: 44, region: 'europe', phys: { walk: 158, run: 255 },
  width: 212, height: 15,
  dark: { from: 14, to: 182 },
  outside: { from: 184 },
  outsideTheme: 'steppe',
  shelters: [[14, 182]],
  boss: 'cavehyena',
  arena: { x1: 150, x2: 176, trigger: 153, gate: 149, gateRows: [3, 4, 5, 6, 7, 8, 9, 10], exit: 177, exitRows: [3, 4, 5, 6, 7, 8, 9, 10], ceil: 11 },
  fact: 'In 1994 ontdekten drie grotonderzoekers de Chauvet-grot. Op de wanden staan meer dan 400 dieren: holenleeuwen, mammoeten, neushoorns, paarden en beren, getekend met houtskool en rode oker. Ze zijn zo\'n 36.000 jaar oud en behoren tot de oudste kunst ter wereld. Op de grond liggen schedels van holenberen en de voetsporen van een kind.',
  build(b) {
    b.ent('start', 3, 3);
    b.rock(12, 11, 172, 4);
    b.ground(0, 40);
    b.ent('light', 13, 11);
    // A · De grot in
    b.bones(18, 4, 4);
    b.ent('bat', 23, 3, { alt: 4 }); b.ent('stalactite', 27, 11);
    b.ent('hyena', 34, 3);
    b.rock(38, 3, 2, 2);
    b.crumble(41, 2, 6); b.bones(41, 4, 6);
    b.ground(47, 86);
    b.ent('stalactite', 56, 11); b.ent('stalactite', 60, 11);
    b.rock(66, 3, 2, 3); b.ent('artifact', 67, 8, { id: 'a1', name: 'Handafdruk van oker' });
    b.ent('bat', 72, 3, { alt: 5 });
    b.bump(78, 6, 'shroom');
    b.ent('bear', 82, 3);
    b.bump(85, 6, 'berry');
    // B · De zaal met schilderingen en een ondergrondse poel
    b.ent('light', 92, 11); b.ent('light', 100, 11);
    b.water(87, 98);
    b.rock(88, 1, 3, 2); b.rock(92, 1, 3, 2); b.rock(96, 1, 2, 2);
    b.ground(99, 148);
    b.ent('checkpoint', 103, 3);
    b.ent('stalactite', 112, 11); b.ent('stalactite', 116, 11);
    b.rock(120, 3, 2, 2); b.rock(123, 5, 2, 2); b.ent('artifact', 124, 9, { id: 'a2', name: 'Schedel van een holenbeer' });
    b.ent('hyena', 132, 3, { fast: true });
    b.bump(128, 6, 'berry');
    // C · Rust voor het gevecht
    b.ent('checkpoint', 140, 3);
    b.ent('light', 141, 11);
    b.rock(144, 3, 1, 2); b.ent('artifact', 144, 7, { id: 'a3', name: 'Houtskool van een fakkel' });
    // D · Arena van de holenhyena
    b.ground(149, 176, 3);
    b.rock(155, 6, 2, 1); b.rock(170, 6, 2, 1);
    b.ent('light', 158, 11); b.ent('light', 168, 11);
    b.ent('boss', 172, 3);
    b.rock(177, 3, 1, 8);
    // E · Naar buiten, naar het kampvuur
    b.ground(177, 211);
    // Extra vijanden: de moeilijkheid stijgt per wereld
    b.ent('bat', 110, 3, { alt: 5 }); b.ent('hyena', 60, 3);
    b.ent('finish', 196, 3);
  },
};
