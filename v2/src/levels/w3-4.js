// Wereld 3 · Level 4: de speren van Schöningen.
// Hoofdidee: de werpspeer. Leren (speer in de klei, erop klimmen), oefenen (hoge wand: twee speren),
// verrassing (paarden, alleen kleiwanden: maak zelf je trapje), finale (de dolktandkat Homotherium).
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

    // 1 · LEREN: de werpspeer. Gooi hem in de kleiwand en klim erop. Speer een wolf van afstand.
    b.ground(0, 30);
    b.ent('tree', 7, 3, { scale: 1 });
    b.bones(9, 4, 3);
    b.bump(15, 6, 'honey');
    b.clay(20, 3, 4, 5); b.bones(21, 9, 3);
    b.ground(24, 44, 8);
    b.ent('wolf', 34, 8);
    b.ground(45, 48, 6); b.ground(49, 67, 3);
    b.rock(55, 3, 2, 2); b.ent('artifact', 56, 6, { id: 'a1', name: 'Speerpunt' });

    // 2 · OEFENEN: een hoge kleiwand (twee speren als trap), wolven, een gier en een stam over het meer
    b.ent('wolf', 60, 3, { fast: true });
    b.clay(66, 3, 2, 7); b.bones(66, 11, 2);
    b.ground(68, 84, 10);
    b.ent('vulture', 76, 10, { alt: 5 });
    b.bump(80, 13, 'berry');
    b.ground(85, 88, 7); b.ground(89, 100, 3);
    b.ent('checkpoint', 92, 3);
    b.water(101, 112); b.ent('log', 102, 2, { from: 101, to: 112, len: 4, speed: 46 });
    b.ground(113, 172, 3);

    // 3 · VERRASSING: wilde paarden, en alleen kleiwanden om te schuilen. Maak zelf je trapje!
    b.ent('sign', 115, 3, { text: 'Paarden! Speer in de klei, en erop' });
    b.ent('stampede', 119, 3, { count: 12, every: 0.45, kind: 'horse' });
    b.clay(122, 3, 2, 6); b.clay(135, 3, 2, 6); b.clay(148, 3, 2, 6); b.clay(161, 3, 2, 6);
    b.bones(122, 10, 2); b.bones(135, 10, 2); b.bones(161, 10, 2);
    b.ent('artifact', 148, 11, { id: 'a2', name: 'Werpstok' });

    // 4 · FINALE: twee snelle wolven, en dan de dolktandkat
    b.ground(173, 190);
    b.ent('wolf', 177, 3, { fast: true }); b.ent('wolf', 182, 3, { fast: true, dir: 1 });
    b.bump(179, 6, 'fig');
    b.clay(186, 3, 2, 6); b.ent('artifact', 187, 11, { id: 'a3', name: 'Paardenbot met snijsporen' });
    b.ent('checkpoint', 192, 3);
    b.ground(191, 235, 3);
    b.rock(201, 6, 2, 1); b.rock(216, 6, 2, 1);
    b.ent('boss', 218, 3);
    b.rock(223, 3, 1, 8);
    b.ent('tree', 228, 3, { scale: 1.1 });
    b.ent('finish', 226, 3);
  },
};
