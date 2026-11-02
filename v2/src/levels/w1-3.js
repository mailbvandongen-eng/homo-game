// Wereld 1 · Level 3: het galerijbos langs de rivier bij het Turkanameer.
// Hoofdidee: de boomtoppen. Leren (takken als trap, verende tak), oefenen (bavianen, hangtak, luipaard),
// verrassing (lianen over de rivier), finale (alles samen hoog in de kruinen).
export default {
  id: '1-3', world: 1, name: 'Het galerijbos',
  species: 'Homo habilis', place: 'Koobi Fora, Turkanameer (Kenia)', era: 'circa 1,9 miljoen jaar geleden',
  theme: 'forest', music: 'forest',
  width: 216, height: 22,
  fact: 'Skeletten van Homo habilis hebben vrij lange, sterke armen. Waarschijnlijk klommen ze nog veel in bomen, om te eten, te schuilen of te slapen, al liepen ze op de grond rechtop.',
  build(b) {
    b.ent('start', 3, 3);
    b.ground(0, 111);

    // 1 · LEREN: takken zijn trappen. Boven is veilig, beneden prikken doorns en ligt een slang.
    b.ent('bigtree', 12, 3, { height: 12 });
    b.bones(5, 3, 3);
    b.branch(9, 5, 3); b.bones(9, 6, 3);
    b.branch(13, 8, 3); b.bones(13, 9, 3);
    b.branch(17, 11, 5); b.bones(17, 12, 4);
    b.branch(24, 11, 5); b.bones(24, 12, 4);
    b.thorns(20, 3, 2); b.ent('snake', 26, 3);
    b.bouncy(34, 2, 2);                                // verende tak: veilig uitproberen
    b.branch(36, 11, 4); b.bones(36, 12, 3);
    b.ent('artifact', 38, 14, { id: 'a1', name: 'Graafstok-steen' });   // alleen met de verende tak
    b.bump(44, 6, 'flint');

    // 2 · OEFENEN: bavianen gooien vruchten, een hangtak met een luipaard eronder
    b.branch(51, 5, 3); b.branch(54, 8, 3);
    b.ent('bigtree', 59, 3, { height: 10 });
    b.branch(57, 11, 7); b.bones(57, 12, 3);
    b.ent('baboon', 62, 12, { dir: -1 });               // nieuw: de baviaan
    b.bar(65, 14, 6); b.bones(65, 13, 6);               // nieuw: hand over hand
    b.ent('leopard', 68, 3, { range: 160 });            // nieuw: de luipaard wacht beneden
    b.ent('bigtree', 74, 3, { height: 10 });
    b.branch(72, 11, 5); b.bones(72, 12, 2);
    b.ent('baboon', 76, 12, { dir: -1 });
    b.branch(78, 8, 3); b.branch(82, 5, 3);
    b.ent('checkpoint', 86, 3);

    // 3 · VERRASSING: even rust bij Homo rudolfensis, dan slingeren aan lianen over de rivier
    b.ent('meet', 90, 3, { species: 'rudolfensis', offsets: [0, 42, 80], sizes: [1, 0.95, 0.72] });
    b.bump(99, 6, 'berry');
    b.ent('snake', 104, 3);
    b.ent('bigtree', 103, 3, { height: 11 });
    b.bouncy(110, 2, 2);
    b.water(112, 137);
    b.ent('liana', 115, 20, { len: 12 });
    b.rock(119, 0, 2, 3);
    b.ent('liana', 123, 20, { len: 14 });
    b.ent('artifact', 125, 11, { id: 'a2', name: 'Zeefsteen' });
    b.rock(127, 0, 2, 3);
    b.ent('liana', 131, 20, { len: 14 });
    b.rock(135, 0, 2, 3);
    b.bones(117, 10, 2); b.bones(129, 10, 2);
    b.ground(138, 215, 3);
    b.ent('checkpoint', 141, 3);

    // 4 · FINALE: hoog door de kruinen, met bavianen en een luipaard op de takken
    b.bump(143, 7, 'fig');
    b.branch(146, 5, 3); b.branch(150, 8, 3);
    b.ent('bigtree', 156, 3, { height: 10 });
    b.branch(154, 11, 6); b.bones(154, 12, 3);
    b.ent('baboon', 156, 12, { dir: -1 });
    b.ent('leopard', 159, 12, { range: 180 });
    b.bouncy(161, 11, 2);
    b.branch(164, 16, 5);
    b.ent('artifact', 165, 17, { id: 'a3', name: 'Notenkraker' });
    b.ent('baboon', 168, 17);
    b.ent('liana', 172, 21, { len: 4 });
    b.ent('bigtree', 178, 3, { height: 11 });
    b.branch(176, 12, 4); b.bones(176, 13, 3);
    b.branch(181, 9, 3); b.branch(185, 6, 3);
    b.thorns(165, 3, 3); b.ent('snake', 173, 3);       // wie valt, landt tussen doorns en een slang
    b.ent('hyena', 191, 3, { fast: true });
    b.ent('finish', 200, 3);
  },
};
