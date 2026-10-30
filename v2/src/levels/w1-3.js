// Wereld 1 · Level 3: het galerijbos langs de rivier bij het Turkanameer.
// Nieuw: een route door de boomtoppen (takken, lianen, verende takken), bavianen die vruchten gooien,
// luipaarden die op de loer liggen. Ontmoeting met Homo rudolfensis.
export default {
  id: '1-3', world: 1, name: 'Het galerijbos',
  species: 'Homo habilis', place: 'Koobi Fora, Turkanameer (Kenia)', era: 'circa 1,9 miljoen jaar geleden',
  theme: 'forest', music: 'forest',
  width: 216, height: 22,
  fact: 'Skeletten van Homo habilis hebben vrij lange, sterke armen. Waarschijnlijk klommen ze nog veel in bomen, om te eten, te schuilen of te slapen, al liepen ze op de grond rechtop.',
  build(b) {
    b.ent('start', 3, 3);
    b.ground(0, 111);

    // A · Omhoog de boomtoppen in
    b.ent('bigtree', 11, 3, { height: 12 });
    b.bones(5, 3, 3);
    b.branch(8, 5, 3); b.bones(8, 6, 3);
    b.branch(12, 8, 3); b.bones(12, 9, 3);
    b.branch(16, 11, 6); b.bones(17, 12, 4);
    b.ent('liana', 25, 19, { len: 4 });

    // B · Kronenpad met bavianen; beneden een gevaarlijker bodemroute
    b.ent('bigtree', 31, 3, { height: 10 });
    b.branch(29, 11, 5);
    b.ent('baboon', 32, 12);
    b.bouncy(35, 11, 2);
    b.branch(38, 15, 4); b.bones(38, 16, 2);
    b.ent('artifact', 41, 16, { id: 'a1', name: 'Graafstok-steen' });
    b.branch(39, 11, 4);
    b.ent('liana', 46, 19, { len: 4 });
    b.ent('bigtree', 52, 3, { height: 10 });
    b.branch(50, 11, 5);
    b.ent('baboon', 53, 12, { dir: -1 });
    b.ent('liana', 58, 19, { len: 4 });
    b.ent('bigtree', 65, 3, { height: 10 });
    b.branch(62, 11, 6); b.bones(62, 12, 5);
    b.branch(69, 8, 3); b.branch(73, 5, 3);

    // bodemroute
    b.ent('snake', 22, 3);
    b.thorns(30, 3, 2);
    b.ent('fig', 36, 4);
    b.ent('leopard', 43, 3);
    b.thorns(48, 3, 2);
    b.ent('flint', 58, 4);
    b.ent('hyena', 64, 3);

    // C · Open plek aan de rivier: ontmoeting
    b.ent('checkpoint', 77, 3);
    b.ent('meet', 84, 3, { species: 'rudolfensis', offsets: [0, 42, 80], sizes: [1, 0.95, 0.72] });
    b.ent('tree', 92, 3, { scale: 1 });
    b.ent('snake', 98, 3);
    b.ent('bigtree', 103, 3, { height: 11 });
    b.bones(104, 4, 4);

    // D · Over de rivier slingeren (een krokodil is je reddingsvlot als je valt)
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

    // E · Tweede kronenpad met een luipaard in de boom
    b.ent('checkpoint', 142, 3);
    b.branch(146, 5, 3); b.branch(150, 8, 3);
    b.ent('bigtree', 156, 3, { height: 10 });
    b.branch(154, 11, 6); b.bones(154, 12, 3);
    b.ent('leopard', 159, 12, { range: 180 });
    b.bouncy(161, 11, 2);
    b.branch(164, 16, 5);
    b.ent('artifact', 165, 17, { id: 'a3', name: 'Notenkraker' });
    b.ent('baboon', 168, 17);
    b.ent('liana', 172, 21, { len: 4 });
    b.ent('bigtree', 178, 3, { height: 11 });
    b.branch(176, 12, 4); b.bones(176, 13, 3);
    b.branch(181, 9, 3); b.branch(185, 6, 3);
    // bodemroute
    b.thorns(165, 3, 3);
    b.ent('snake', 173, 3);
    b.ent('fig', 182, 4);

    // F · Naar de groep bij de rotsen aan de bosrand
    b.ent('finish', 196, 3);
  },
};
