// Aanpak B: handgemaakte pixel art. Elk teken is één pixel; stukken worden per animatiebeeld samengesteld.
export const PAL = {
  o: '#24160c', // omlijning
  H: '#3a2416', h: '#5e3c24', // haar
  S: '#c48c5e', s: '#8e5a36', L: '#e8b888', // huid
  F: '#7e5032', f: '#52321c', G: '#a8744a', // vacht
  W: '#efe2c8', E: '#140a04', M: '#5a2618', // oog, mond
  D: '#a27a4a', d: '#6e4e2a', // huid om de heupen
};
// Achterste ledematen donkerder
// Voorste arm iets lichter, zodat hij loskomt van de romp
const NEAR = { F: '#a06a42', f: '#704628', G: '#c8925e' };
const FAR = { F: '#5c3a22', f: '#3a2212', G: '#7e5032', S: '#9a6a44', s: '#6e4228', L: '#b88a60' };

const HEAD = [
  '....oooooo....',
  '..ooHHHhHHoo..',
  '.oHHhHHHHHHHo.',
  '.oHHHHHHsssso.',
  'oHHHSsSSWESSo.',
  'oHHHSSsSSSSSSo',
  '.oHHSSSSSSSSso',
  '.oHHsSSSSMMMSo',
  '..oHssSSSSSSo.',
  '...oooossooo..',
];
const TORSO = [
  '...ooFFFFoo.',
  '..oFFFFFFLLo',
  '.oGFFFFFFLLo',
  '.oGFFFFFfLLo',
  'oGFFFFFFfLSo',
  'oGFFFFFffSSo',
  'oFFFFFFffSo.',
  '.oFFFFfffSo.',
  '.oDDDDDDDDo.',
  '.oDdDDdDDdo.',
  '..odo.odo.o.',
];
const ARM = {
  down: ['oFFo', 'oFFo', 'oGfo', 'oFfo', 'oFFo', 'oFfo', 'oSSo', 'oSso', '.oo.'],
  fwd: ['oFFo...', 'oGFFo..', '.oFfFo.', '..oFfFo', '...oFSo', '...oSSo', '....oo.'],
  back: ['...oFFo', '..oFFGo', '.oFfFo.', 'oFfFo..', 'oSFo...', 'oSSo...', '.oo....'],
  up: ['.oo.', 'oSso', 'oSSo', 'oFfo', 'oFFo', 'oFfo', 'oGfo', 'oFFo', 'oFFo'],
};
const LEG = {
  stand: ['oFFo..', 'oFFo..', 'oGfo..', 'oFfo..', '.oFFo.', '.ofFo.', '.oSSSo', '.oSSSSo', '..ooooo'],
  fwd: ['oFFo...', '.oFFo..', '..oGfo.', '..oFfo.', '..oFfo.', '..oFFo.', '..oSSSo', '..oSSSSo', '...ooooo'],
  back: ['..oFFo', '.oFFo.', 'oGfo..', 'oFfo..', 'oFFo..', 'ofFo..', 'oSSo..', 'oSSSo.', '.ooo..'],
  bent: ['oFFFo..', 'oGFFFo.', '.ooFfFo', '...oFFo', '..oSSo.', '.oSSSo.', '.ooo...'],
};

// Plaatsing (in pixels, linksboven van de figuur): kop, romp, schouders en heupen
const BODY = { head: [5, 0], torso: [3, 9], shF: [11, 10], shB: [6, 10], hipF: [8, 18], hipB: [5, 18] };

function piece(c, rows, x, y, far, flip, near) {
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch === '.') continue;
      c.fillStyle = (far && FAR[ch]) || (near && NEAR[ch]) || PAL[ch];
      c.fillRect(x + (flip ? row.length - 1 - i : i), y + r, 1, 1);
    }
  }
}

// Animatiebeelden: welke arm- en beenstand, en een kleine op-en-neer beweging
export const FRAMES = {
  idle: [{ aF: 'down', aB: 'down', lF: 'stand', lB: 'stand', y: 0 }, { aF: 'down', aB: 'down', lF: 'stand', lB: 'stand', y: 0, breathe: 1 }],
  walk: [
    { aF: 'back', aB: 'fwd', lF: 'fwd', lB: 'back', y: 0 },
    { aF: 'down', aB: 'down', lF: 'stand', lB: 'stand', y: -1 },
    { aF: 'fwd', aB: 'back', lF: 'back', lB: 'fwd', y: 0 },
    { aF: 'down', aB: 'down', lF: 'stand', lB: 'stand', y: -1 },
  ],
  jump: [{ aF: 'up', aB: 'back', lF: 'bent', lB: 'back', y: -3 }],
  fall: [{ aF: 'up', aB: 'up', lF: 'stand', lB: 'back', y: -2 }],
  throw: [{ aF: 'up', aB: 'fwd', lF: 'fwd', lB: 'back', y: 0 }, { aF: 'fwd', aB: 'back', lF: 'fwd', lB: 'back', y: 0 }],
  cheer: [{ aF: 'up', aB: 'up', lF: 'stand', lB: 'stand', y: 0 }, { aF: 'up', aB: 'up', lF: 'stand', lB: 'stand', y: -3 }],
};

// Teken één beeld. Oorsprong: midden-onder (tussen de voeten). Figuur is ~22 x 28 pixels.
export function drawPixel(c, anim, t, opts = {}) {
  const fr = FRAMES[anim][Math.floor(t) % FRAMES[anim].length];
  c.save();
  c.imageSmoothingEnabled = false;
  c.translate(-10, -28 + (fr.y || 0));
  const legY = fr.lF === 'bent' ? 2 : 0;
  // Achterkant
  piece(c, ARM[fr.aB], BODY.shB[0] - (fr.aB === 'back' ? 3 : fr.aB === 'fwd' ? 0 : 1), BODY.shB[1] - (fr.aB === 'up' ? 8 : 0), true);
  piece(c, LEG[fr.lB], BODY.hipB[0] - (fr.lB === 'back' ? 2 : 0), BODY.hipB[1] + legY, true);
  // Romp (ademt: 1 pixel hoger)
  piece(c, TORSO, BODY.torso[0], BODY.torso[1] - (fr.breathe ? 1 : 0), false);
  piece(c, LEG[fr.lF], BODY.hipF[0] - (fr.lF === 'back' ? 2 : 0), BODY.hipF[1] + legY, false);
  piece(c, HEAD, BODY.head[0], BODY.head[1] - (fr.breathe ? 1 : 0), false);
  if (opts.blink) { c.fillStyle = PAL.S; c.fillRect(BODY.head[0] + 8, BODY.head[1] + 4, 2, 1); }
  // Voorste arm
  const ax = BODY.shF[0] - (fr.aF === 'back' ? 3 : fr.aF === 'fwd' ? 0 : 1), ay = BODY.shF[1] - (fr.aF === 'up' ? 8 : 0);
  piece(c, ARM[fr.aF], ax, ay, false, false, true);
  if (opts.stone && fr.aF === 'up') { c.fillStyle = '#6c6a64'; c.fillRect(ax + 1, ay - 2, 2, 2); }
  c.restore();
}
