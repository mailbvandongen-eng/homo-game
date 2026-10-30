// Wereld 1 · Level 4: de grot van de reuzenhyena.
// Nieuw: duisternis met lichtbundels, vallende stalactieten, vleermuizen, druipsteen,
// en de eindbaas Pachycrocuta. Buiten wacht de eerste ontmoeting met Homo erectus.
export default {
  id: '1-4', world: 1, name: 'De grot van de reuzenhyena',
  species: 'Homo habilis', place: 'Oost-Afrika', era: 'circa 1,7 miljoen jaar geleden',
  theme: 'cave', music: 'cave',
  width: 206, height: 15,
  dark: { from: 6, to: 181 },
  outside: { from: 181 },
  finishScene: 'shelter',
  fact: 'De reuzenhyena Pachycrocuta was zo groot als een leeuw. Snijsporen op botten laten zien dat vroege mensen vlees van karkassen haalden, terwijl ook hyena\'s en grote katten daarop uit waren. Buiten zag je Homo erectus: met die soort speel je in wereld 2.',
  // Bossarena: kolommen in tegels; gate gaat dicht achter je, exit gaat open na de overwinning
  arena: { x1: 144, x2: 172, trigger: 147, gate: 143, gateRows: [3, 4, 5, 6, 7, 8, 9, 10], exit: 173, exitRows: [3, 4, 5, 6, 7, 8, 9, 10], ceil: 11 },
  build(b) {
    b.ent('start', 3, 3);
    // Plafond van de grot
    b.rock(0, 11, 181, 4);

    // A · De gang in: druipsteen dat valt, vleermuizen
    b.ground(0, 48, 3);
    b.ent('light', 4, 11);
    b.bones(8, 4, 4);
    b.ent('stalactite', 18, 11); b.ent('stalactite', 23, 11); b.ent('stalactite', 28, 11);
    b.ent('light', 21, 11);
    b.bump(26, 6, 'fig');
    b.ent('bat', 34, 3, { alt: 4 });
    b.rock(37, 3, 2, 2); b.rock(40, 3, 3, 4);
    b.ent('artifact', 41, 8, { id: 'a1', name: 'Hakmes' });
    b.ent('bat', 44, 3, { alt: 5 });
    b.ent('light', 45, 11);
    // Brokkelbrug over een diepe spleet
    b.crumble(49, 2, 8); b.bones(49, 4, 8);
    b.ground(57, 75, 3);

    // B · Kamer met druipsteenputten
    b.ent('checkpoint', 60, 3);
    b.ent('stalactite', 70, 11);
    b.ground(76, 80, 1); b.thorns(76, 1, 5);
    b.ground(81, 100, 3);
    b.rock(84, 3, 2, 2); b.rock(88, 3, 2, 4);
    b.ent('bat', 90, 3, { alt: 5 });
    b.ent('light', 86, 11);
    b.bump(93, 6, 'flint');
    b.ent('stalactite', 96, 11);

    // C · Ondergrondse beek met stapstenen (en druipsteen erboven)
    b.water(101, 118);
    b.rock(102, 1, 3, 2); b.rock(106, 1, 3, 2); b.rock(110, 1, 3, 2); b.rock(114, 1, 5, 2);
    b.ent('stalactite', 107, 11); b.ent('stalactite', 115, 11);
    b.ent('artifact', 111, 7, { id: 'a2', name: 'Snijsteen' });
    b.ent('bat', 113, 3, { alt: 5 });
    b.ent('light', 110, 11);
    b.ground(119, 172, 3);

    // D · Rust voor het gevecht
    b.ent('checkpoint', 124, 3);
    b.ent('fig', 128, 4);
    b.ent('light', 127, 11);
    b.rock(133, 3, 1, 2); b.rock(135, 3, 2, 5);
    b.ent('artifact', 136, 8, { id: 'a3', name: 'Slagsteen' });
    b.ent('flint', 139, 4);

    // E · Arena van de reuzenhyena
    b.rock(149, 6, 2, 1); b.rock(166, 6, 2, 1);
    b.ent('light', 152, 11); b.ent('light', 164, 11);
    b.ent('boss', 168, 3);
    b.rock(173, 3, 1, 8);          // uitgang, gaat open na de overwinning

    // F · Naar buiten, het daglicht in
    b.ground(173, 205, 3);
    b.ent('meet', 186, 3, { species: 'erectus', offsets: [0, 46, 92], sizes: [1, 0.96, 0.8] });
    b.ent('finish', 191, 3);
  },
};
