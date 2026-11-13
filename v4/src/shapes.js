// De vormen: hoe een model wordt omgevormd naar een soort, een jong of een ander lijf (zie shape.js).
// Assen: x = opzij, y = omhoog, z = naar voren, in de maten van het model zelf.
const HEAD = /^head|^CC_Base|^neck_02/;
const LEG = { hip: /^pelvis/, foot: /^ball_l/ };
// Een kind: groot hoofd, korte benen en armen, smal lijf. Een vrouw: smallere schouders, bredere heupen.
const CHILD = [[/^(thigh|calf)/, [0.9, 0.86, 0.9]], [/^(upperarm|lowerarm)/, [0.9, 0.9, 0.9]], [/^spine|^clavicle/, [0.9, 0.96, 0.92]], [HEAD, [1.3, 1.3, 1.3]]];
const WOMAN = [[/^clavicle/, [0.9, 1, 1]], [/^spine_03/, [0.93, 1, 0.95]], [/^spine_01|^pelvis/, [1.05, 1, 1.03]]];

// Homo habilis: klein, korte benen, lange armen, een kleine hersenpan en een gezicht dat naar voren steekt.
const HABILIS = {
  bones: [
    [/^(thigh|calf)/, [0.95, 0.88, 0.95]],
    [/^upperarm/, [1.06, 0.95, 0.95]], [/^lowerarm/, [1.16, 0.95, 0.95]], [/^hand|^(index|middle|ring|pinky|thumb)/, [1.08, 1, 1]],
  ],
  sculpt: [
    { bone: /^head/, at: [0, 13, 0], r: 14, scale: [0.86, 0.78, 0.84] },     // hersenpan: kleiner en lager
    { bone: /^head/, at: [0, 3.5, 9], r: 8, move: [0, -0.4, 2.4] },          // mond en kaak naar voren
    { bone: /^head/, at: [0, 9.5, 9], r: 4.5, move: [0, 0, 0.9] },           // wenkbrauwboog
  ],
};
// Homo erectus: lang en slank, lange benen, smal lijf, een lange lage schedel met een zware wenkbrauwboog.
const ERECTUS = {
  bones: [
    [/^thigh/, [0.92, 1.08, 0.92]], [/^calf/, [0.92, 1.14, 0.92]],
    [/^spine|^clavicle/, [0.9, 1, 0.9]],
    [/^upperarm/, [1.0, 0.92, 0.92]], [/^lowerarm/, [1.06, 0.92, 0.92]],
  ],
  sculpt: [
    { bone: /^head/, at: [0, 14, -1], r: 14, scale: [0.93, 0.82, 1.04] },    // lager en langer
    { bone: /^head/, at: [0, 9.5, 9], r: 4.5, move: [0, 0, 1.1] },
    { bone: /^head/, at: [0, 3.5, 9], r: 7, move: [0, 0, 1.0] },
  ],
};
const kind = (key, base, ...extra) => ({ key, bones: [...base.bones, ...extra.flat()], sculpt: base.sculpt, ground: LEG });

// De reuzenolifant Palaeoloxodon recki, omgevormd uit een Afrikaanse olifant: hogere poten, een hoge schedel
// met een wal over het voorhoofd, kleinere oren en lange, vrijwel rechte slagtanden.
const LEGS_E = /humerus|forearm|elbow_hlp|triceps|wrist_hlp|femur|tibia|knee_hlp|hams|ankle_hlp/;
const RECKI = {
  key: 'recki',
  bones: [[LEGS_E, [1, 1.14, 1]], [/DEF-ear/, [0.82, 0.82, 0.82]]],
  sculpt: [
    { bone: /DEF-head/, at: [0, 0.36, 0.12], r: 0.42, move: [0, 0.12, 0.02] },    // hoge schedel
    { bone: /DEF-head/, at: [0, 0.3, 0.3], r: 0.24, move: [0, 0.03, 0.08] },      // de wal over het voorhoofd
    { bone: /DEF-head/, at: [0.21, -0.2, 0.4], to: [0.33, -0.36, 0.82], r: 0.16, by: 2.3, only: /DEF-head/ },    // slagtand links
    { bone: /DEF-head/, at: [-0.21, -0.2, 0.4], to: [-0.33, -0.36, 0.82], r: 0.16, by: 2.3, only: /DEF-head/ },  // slagtand rechts
  ],
  ground: { hip: /DEF-pelvis/, foot: /pad_hindL/ },
};

// De impala, omgevormd uit een gazelle: lange hoorns in de vorm van een lier (eerst naar buiten en naar achteren,
// dan weer naar binnen en omhoog). Alleen de ram heeft hoorns; de ooi en het jong zijn hoornloos.
// (Het hoofd van het model staat in rust een beetje scheef; daarom staan de twee hoorns apart beschreven.)
const HORNS = [{ x: 1, at: [0.25, 0.51, 0.67], to: [0.65, 1.76, 0.01], low: [0.16, 0.21, 0.83] }, { x: -1, at: [-0.34, 0.56, 0.52], to: [-0.37, 1.86, -0.18], low: [-0.34, 0.25, 0.68] }];
const IMPALA = { key: 'impala', sculpt: HORNS.map((h) => ({ bone: /^Head/, only: /^Head/, at: h.at, to: h.to, r: 0.3, by: 1.3, wave: [h.x * 0.17, 0, -0.1], waves: 1.6 })) };
const HORNLESS = { key: 'hornless', sculpt: HORNS.map((h) => ({ bone: /^Head/, only: /^Head/, at: h.low, to: h.to, r: 0.36, by: 0.04, pinch: 0.3 })) };

// De pofadder, omgevormd uit een cobra: kort en dik, een brede platte kop, geen kap, en een eigen huid
// (zandbruin met donkere V-banden; gemaakt uit de huid van de cobra, zie assets/CREDITS.md).
const PUFFADDER = {
  key: 'puffadder', skin: 'puffadder',
  bones: [[/Hips|Spine|Tail_0[1-3]/, [1.7, 1.35, 1.7]], [/Tail_0[45]/, [1.35, 1.2, 1.35]], [/Neck|Head/, [1.3, 1.3, 1.3]]],
  // het lijf korter; nek, kap en kop blijven in verhouding (de kap ligt gevouwen in de nek en kreukt als je hem inkort)
  reach: [[/Spine|Tail_0[1-4]/, 0.36], [/Tail_0[5-7]/, 0.5], [/Neck_01/, 0.6]],
};

export const SHAPES = {
  puffadder: PUFFADDER,
  impala: IMPALA, hornless: HORNLESS,
  recki: RECKI,
  habilis: kind('habilis', HABILIS), habilis_woman: kind('habilis_woman', HABILIS, WOMAN), habilis_child: kind('habilis_child', HABILIS, CHILD),
  erectus: kind('erectus', ERECTUS), erectus_woman: kind('erectus_woman', ERECTUS, WOMAN), erectus_child: kind('erectus_child', ERECTUS, CHILD),
};
