// Toetsenbord, touch en gamecontroller samengevoegd tot één eenvoudige stand.
const KEYS = {
  left: ['arrowleft', 'a', 'q'],
  right: ['arrowright', 'd'],
  jump: [' ', 'arrowup', 'w', 'z'],
  throw: ['x', 'j', 'k', 'shift'],
  pause: ['escape', 'p'],
};

export const PAD_RADIUS = 46;   // hoe ver de joystick-knop kan uitslaan (css-pixels)
const PAD_DEAD = 12;             // dode zone rond het midden
const PAD_FOLLOW = 26;           // het midden blijft hooguit zo ver achter de duim

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pointers = new Map();     // pointerId -> {role, x, y}
    this.layout = null;            // touchknoppen in css-pixels, gezet door de game
    this.touchMode = matchMedia('(pointer: coarse)').matches;
    this.edges = { jump: false, throw: false, pause: false };
    this.prevPad = { jump: false, throw: false, pause: false };
    this.enabled = true;

    addEventListener('keydown', e => {
      const k = e.key.toLowerCase();
      if (Object.values(KEYS).some(list => list.includes(k)) && e.target === document.body) e.preventDefault();
      if (e.repeat) return;
      this.keys.add(k);
      if (KEYS.jump.includes(k)) this.edges.jump = true;
      if (KEYS.throw.includes(k)) this.edges.throw = true;
      if (KEYS.pause.includes(k)) this.edges.pause = true;
      this.touchMode = false;
    });
    addEventListener('keyup', e => this.keys.delete(e.key.toLowerCase()));
    addEventListener('blur', () => { this.keys.clear(); this.pointers.clear(); });

    const down = e => {
      if (e.pointerType === 'mouse' && !this.layout) return;
      if (e.pointerType !== 'mouse') this.touchMode = true;
      if (!this.touchMode) return;
      e.preventDefault();
      try { canvas.setPointerCapture(e.pointerId); } catch {}
      const role = this.roleAt(e.clientX, e.clientY);
      // Zwevende joystick: het midden ligt waar je duim neerkomt.
      this.pointers.set(e.pointerId, { role, x: e.clientX, y: e.clientY, ox: e.clientX, oy: e.clientY });
      if (role === 'jump') this.edges.jump = true;
      if (role === 'throw') this.edges.throw = true;
      if (role === 'pause') this.edges.pause = true;
    };
    const move = e => {
      const p = this.pointers.get(e.pointerId);
      if (!p) return;
      p.x = e.clientX; p.y = e.clientY;
      // Schuift de duim verder dan de rand, dan schuift het midden mee:
      // omkeren gaat zo altijd met een klein beweginkje.
      if (p.role === 'pad') {
        const max = PAD_FOLLOW, dx = p.x - p.ox;
        if (Math.abs(dx) > max) p.ox = p.x - Math.sign(dx) * max;
      }
    };
    const up = e => this.pointers.delete(e.pointerId);
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('lostpointercapture', up);
    canvas.addEventListener('contextmenu', e => e.preventDefault());
  }

  roleAt(x, y) {
    const L = this.layout;
    if (!L) return 'none';
    const near = (b, extra = 1) => Math.hypot(x - b.x, y - b.y) <= b.r * extra;
    if (near(L.pause, 1.4)) return 'pause';
    if (x < L.split) return 'pad';
    if (near(L.throw, 1.35)) return 'throw';
    return 'jump';   // de hele rechterkant is springen
  }

  key(name) { return KEYS[name].some(k => this.keys.has(k)); }

  // Leest de huidige stand; flanken (net ingedrukt) worden daarna gewist.
  read() {
    let left = this.key('left'), right = this.key('right');
    let jumpHeld = this.key('jump');
    const out = { left: false, right: false, jumpHeld: false, jump: this.edges.jump, throw: this.edges.throw, pause: this.edges.pause };
    this.edges.jump = this.edges.throw = this.edges.pause = false;

    for (const p of this.pointers.values()) {
      if (p.role === 'pad') {
        const dx = p.x - p.ox;
        if (dx < -PAD_DEAD) left = true; else if (dx > PAD_DEAD) right = true;
      }
      if (p.role === 'jump') jumpHeld = true;
    }

    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of pads) {
      if (!gp) continue;
      const ax = gp.axes[0] || 0;
      if (ax < -0.35 || gp.buttons[14]?.pressed) left = true;
      if (ax > 0.35 || gp.buttons[15]?.pressed) right = true;
      const j = !!(gp.buttons[0]?.pressed || gp.buttons[1]?.pressed);
      const t = !!(gp.buttons[2]?.pressed || gp.buttons[3]?.pressed);
      const s = !!gp.buttons[9]?.pressed;
      if (j) jumpHeld = true;
      if (j && !this.prevPad.jump) out.jump = true;
      if (t && !this.prevPad.throw) out.throw = true;
      if (s && !this.prevPad.pause) out.pause = true;
      this.prevPad = { jump: j, throw: t, pause: s };
      this.touchMode = false;
    }

    if (!this.enabled) return { left: false, right: false, jumpHeld: false, jump: false, throw: false, pause: out.pause };
    out.left = left && !right; out.right = right && !left; out.jumpHeld = jumpHeld;
    return out;
  }

  held(role) { for (const p of this.pointers.values()) if (p.role === role) return true; return false; }
  // Huidige duim op de joystick (voor het tekenen), of null
  pad() { for (const p of this.pointers.values()) if (p.role === 'pad') return p; return null; }
  padDir() { const p = this.pad(); if (!p) return 0; const dx = p.x - p.ox; return dx < -PAD_DEAD ? -1 : dx > PAD_DEAD ? 1 : 0; }
}
