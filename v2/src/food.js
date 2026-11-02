// Eten uit de natuur. Vruchten vallen naar beneden, paddenstoelen en bloemen blijven staan.
// Wat het doet moet je ontdekken: proberen en onthouden, zoals de mensen van toen.
// effect: heart (+1 hartje), speed (sneller), jump (hoger springen), shield (vol energie: even onkwetsbaar),
//         drunk (gegist fruit: wankelen), dizzy (duizelig: links en rechts omgedraaid), random (bessen: goed óf fout)

export const FOODS = {
  fig:     { fall: true,  effect: 'heart' },
  date:    { fall: true,  effect: 'speed' },
  honey:   { fall: true,  effect: 'jump' },
  berry:   { fall: true,  effect: 'random' },
  ferment: { fall: true,  effect: 'drunk' },
  shroom:  { fall: false, effect: 'heart' },
  redcap:  { fall: false, effect: 'dizzy' },
  flower:  { fall: false, effect: 'shield' },
};

export const BUFF_TIME = { speed: 8, jump: 8, shield: 6, drunk: 7, dizzy: 6 };

export const EFFECT_TEXT = {
  heart: '+1 hartje', speed: 'Energie: sneller!', jump: 'Energie: hoger springen!', shield: 'Vol energie: even onkwetsbaar',
  drunk: 'Hik… je wordt dronken', dizzy: 'Bah! Je wordt duizelig', bones: 'lekker! +5',
};
export const GOOD = new Set(['heart', 'speed', 'jump', 'shield', 'bones']);

// Waar ben je? Bepaalt de naam (en in de levels: welke soorten er groeien)
function region(def) {
  if (def.look === 'heidelbergensis' || def.look === 'neanderthalensis') return 'europe';
  if (def.theme === 'dmanisi') return 'georgia';
  if (def.theme === 'java') return 'java';
  return 'africa';
}
export function foodName(type, def) {
  const r = region(def), eu = r === 'europe';
  switch (type) {
    case 'fig': return 'Wilde vijg';
    case 'date': return 'Wilde dadels';
    case 'honey': return 'Wilde honing';
    case 'berry': return 'Onbekende bessen';
    case 'ferment': return r === 'georgia' ? 'Gegiste wilde druiven' : eu ? 'Gegiste wilde appels' : r === 'java' ? 'Gegiste vrucht' : 'Gegiste marula';
    case 'shroom': return eu || r === 'georgia' ? 'Eekhoorntjesbrood' : 'Termietenzwam';
    case 'redcap': return 'Vliegenzwam';
    case 'flower': return eu ? 'Dovenetel (nectar)' : 'Aloëbloem (nectar)';
  }
  return type;
}

// Vectortekening rond (0,0); wordt in de pixelversie gepixeld
export function drawFood(c, type) {
  const O = '#2a1a10';
  const blob = (x, y, rx, ry, fill, a = 0) => { c.beginPath(); c.ellipse(x, y, rx, ry, a, 0, Math.PI * 2); c.fillStyle = O; c.fill(); c.beginPath(); c.ellipse(x, y, rx - 1.4, ry - 1.4, a, 0, Math.PI * 2); c.fillStyle = fill; c.fill(); };
  const leaf = (x, y, a, col = '#5e8a32') => { c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = O; c.beginPath(); c.ellipse(0, 0, 5.5, 2.8, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = col; c.beginPath(); c.ellipse(0, 0, 4.2, 1.7, 0, 0, Math.PI * 2); c.fill(); c.restore(); };
  if (type === 'date') {
    c.strokeStyle = O; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -9); c.lineTo(0, -3); c.moveTo(0, -6); c.lineTo(-5, -1); c.moveTo(0, -6); c.lineTo(5, -1); c.stroke();
    blob(-5, 2, 3.4, 5, '#c4581e'); blob(5, 2, 3.4, 5, '#d8742a'); blob(0, 4, 3.6, 5.2, '#e08a30');
    c.fillStyle = '#ffd08a'; c.fillRect(-1, 0, 1.5, 2.5);
  } else if (type === 'honey') {
    c.beginPath(); c.moveTo(-9, -6); c.lineTo(9, -6); c.lineTo(8, 5); c.lineTo(-8, 5); c.closePath(); c.fillStyle = O; c.fill();
    c.fillStyle = '#e8a420'; c.fillRect(-7.5, -4.5, 15, 8);
    c.fillStyle = '#b8720e'; for (let r = 0; r < 2; r++) for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(-5.5 + k * 3.8 + (r % 2) * 1.9, -2 + r * 3.6, 1.2, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = '#ffd66a'; c.fillRect(-7, -4.5, 6, 1.5);
    c.fillStyle = O; c.beginPath(); c.ellipse(3, 8, 2.2, 3.4, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = '#f0b42c'; c.beginPath(); c.ellipse(3, 8, 1.2, 2.3, 0, 0, Math.PI * 2); c.fill();
  } else if (type === 'berry') {
    c.strokeStyle = O; c.lineWidth = 1.6; c.beginPath(); c.moveTo(0, -9); c.lineTo(0, -4); c.stroke();
    leaf(5, -8, -0.5);
    for (const [x, y] of [[-4, -1], [3, -1], [0, 3], [-5, 5], [5, 5], [0, 8]]) blob(x, y, 3.4, 3.4, '#5a2a6a');
    c.fillStyle = '#b89ad0'; for (const [x, y] of [[-5, -2], [2, -2], [-1, 2]]) c.fillRect(x, y, 1.4, 1.4);
  } else if (type === 'ferment') {
    blob(0, 1, 8, 7.5, '#c8b24a');
    c.fillStyle = '#7a5a28'; for (const [x, y, r] of [[-3, -1, 2.4], [3, 3, 2], [2, -3, 1.4], [-2, 4, 1.2]]) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = '#ece0a0'; c.fillRect(-5, -4, 2, 2);
    // Vliegje en luchtbelletjes
    c.fillStyle = O; c.fillRect(8, -9, 2, 2); c.fillStyle = '#d8e8f0'; c.fillRect(7, -10, 1.5, 1); c.fillRect(10, -10, 1.5, 1);
    c.strokeStyle = '#ffffffaa'; c.lineWidth = 1; c.beginPath(); c.arc(-7, -9, 1.5, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.arc(-4, -12, 1, 0, Math.PI * 2); c.stroke();
  } else if (type === 'shroom') {
    c.fillStyle = O; c.fillRect(-4.5, -2, 9, 11); c.fillStyle = '#efe4c8'; c.fillRect(-3, -1, 6, 9); c.fillStyle = '#cbbc98'; c.fillRect(1, -1, 2, 9);
    c.beginPath(); c.moveTo(-10, 0); c.quadraticCurveTo(-9, -10, 0, -10); c.quadraticCurveTo(9, -10, 10, 0); c.closePath(); c.fillStyle = O; c.fill();
    c.beginPath(); c.moveTo(-8.5, -1.2); c.quadraticCurveTo(-7.5, -8.8, 0, -8.8); c.quadraticCurveTo(7.5, -8.8, 8.5, -1.2); c.closePath(); c.fillStyle = '#8a5a2e'; c.fill();
    c.fillStyle = '#b07a44'; c.fillRect(-5, -7, 5, 2);
  } else if (type === 'redcap') {
    c.fillStyle = O; c.fillRect(-3.5, -2, 7, 11); c.fillStyle = '#f4efe2'; c.fillRect(-2, -1, 4, 9); c.fillStyle = '#e4dccc'; c.fillRect(-3, 3, 6, 1.5);
    c.beginPath(); c.moveTo(-10, 0); c.quadraticCurveTo(-9, -11, 0, -11); c.quadraticCurveTo(9, -11, 10, 0); c.closePath(); c.fillStyle = O; c.fill();
    c.beginPath(); c.moveTo(-8.5, -1.2); c.quadraticCurveTo(-7.5, -9.8, 0, -9.8); c.quadraticCurveTo(7.5, -9.8, 8.5, -1.2); c.closePath(); c.fillStyle = '#d42a1e'; c.fill();
    c.fillStyle = '#fff6e8'; for (const [x, y] of [[-5, -4], [0, -7], [4, -4], [-1, -3], [6, -1.5], [-6.5, -1.5]]) c.fillRect(x, y, 2, 2);
  } else if (type === 'flower') {
    c.strokeStyle = O; c.lineWidth = 2.6; c.beginPath(); c.moveTo(0, 10); c.lineTo(0, -2); c.stroke();
    c.strokeStyle = '#4e8a2e'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(0, 10); c.lineTo(0, -2); c.stroke();
    leaf(-4, 6, 0.5, '#4e8a2e'); leaf(4, 3, -0.5, '#4e8a2e');
    for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2 - Math.PI / 2; blob(Math.cos(a) * 4.5, -6 + Math.sin(a) * 4.5, 3.2, 3.2, k % 2 ? '#f2a03a' : '#f6c04a'); }
    blob(0, -6, 2.4, 2.4, '#c8521e');
  }
}
