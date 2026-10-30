// Kleine visuele effecten: stof, sterretjes, glinsters en brokstukken.
export class Fx {
  constructor() { this.parts = []; this.texts = []; }
  add(p) { if (this.parts.length < 300) this.parts.push(p); }

  dust(x, y, dir = 0, n = 3) {
    for (let i = 0; i < n; i++) this.add({ kind: 'dust', x: x + (Math.random() - 0.5) * 10, y: y - 2, vx: dir * (30 + Math.random() * 40) + (Math.random() - 0.5) * 50, vy: -20 - Math.random() * 40, life: 0.45, max: 0.45, r: 3 + Math.random() * 3, g: 60 });
  }
  stars(x, y) {
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; this.add({ kind: 'star', x, y, vx: Math.cos(a) * 130, vy: Math.sin(a) * 130 - 40, life: 0.5, max: 0.5, r: 3, g: 300 }); }
  }
  sparkle(x, y, color = '#fff2a8') {
    for (let i = 0; i < 8; i++) { const a = Math.random() * Math.PI * 2, s = 40 + Math.random() * 80; this.add({ kind: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.4, max: 0.4, r: 2, g: 0, color }); }
  }
  debris(x, y) {
    for (let i = 0; i < 6; i++) this.add({ kind: 'rock', x: x + (Math.random() - 0.5) * 24, y: y + (Math.random() - 0.5) * 16, vx: (Math.random() - 0.5) * 120, vy: -80 - Math.random() * 120, life: 1, max: 1, r: 3 + Math.random() * 4, g: 1500, rot: Math.random() * 6 });
  }
  bubble(x, y) { this.add({ kind: 'bubble', x: x + (Math.random() - 0.5) * 16, y, vx: 0, vy: -30 - Math.random() * 20, life: 0.6, max: 0.6, r: 1.5 + Math.random() * 2, g: 0 }); }
  splash(x, y, n = 12) {
    for (let i = 0; i < n; i++) this.add({ kind: 'drop', x: x + (Math.random() - 0.5) * 20, y, vx: (Math.random() - 0.5) * 160, vy: -120 - Math.random() * 200, life: 0.6, max: 0.6, r: 2 + Math.random() * 2, g: 900 });
  }
  text(x, y, str, color = '#fff6d0') { this.texts.push({ x, y, str, color, life: 0.9 }); }

  update(dt) {
    for (const p of this.parts) { p.life -= dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.rot !== undefined) p.rot += dt * 8; }
    this.parts = this.parts.filter(p => p.life > 0);
    for (const t of this.texts) { t.life -= dt; t.y -= 40 * dt; }
    this.texts = this.texts.filter(t => t.life > 0);
  }

  draw(c) {
    for (const p of this.parts) {
      const a = p.life / p.max;
      c.globalAlpha = Math.min(1, a * 1.5);
      if (p.kind === 'dust') { c.fillStyle = '#e8d6ae'; c.beginPath(); c.arc(p.x, p.y, p.r * (1.6 - a * 0.6), 0, Math.PI * 2); c.fill(); }
      else if (p.kind === 'star') { star(c, p.x, p.y, 4.5, '#ffe27a'); }
      else if (p.kind === 'spark') { c.fillStyle = p.color; c.fillRect(p.x - 1.5, p.y - 1.5, 3, 3); }
      else if (p.kind === 'bubble') { c.strokeStyle = '#e8ffff'; c.lineWidth = 1; c.beginPath(); c.arc(p.x, p.y, p.r, 0, Math.PI * 2); c.stroke(); }
      else if (p.kind === 'drop') { c.fillStyle = '#bfeaf0'; c.beginPath(); c.arc(p.x, p.y, p.r, 0, Math.PI * 2); c.fill(); }
      else if (p.kind === 'rock') { c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillStyle = '#9b7d55'; c.fillRect(-p.r / 2, -p.r / 2, p.r, p.r); c.restore(); }
    }
    c.globalAlpha = 1;
    c.font = 'bold 11px system-ui, sans-serif'; c.textAlign = 'center';
    for (const t of this.texts) {
      c.globalAlpha = Math.min(1, t.life * 2);
      c.fillStyle = '#2a1c12'; c.fillText(t.str, t.x + 1, t.y + 1);
      c.fillStyle = t.color; c.fillText(t.str, t.x, t.y);
    }
    c.globalAlpha = 1; c.textAlign = 'left';
  }
}

export function star(c, x, y, r, color) {
  c.fillStyle = color; c.beginPath();
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  c.closePath(); c.fill();
}
