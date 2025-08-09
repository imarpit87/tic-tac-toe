export class Confetti {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.running = false;
    this.resize = this.resize.bind(this);
    this.lastTs = 0;
    window.addEventListener('resize', this.resize);
    this.resize();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.floor(window.innerWidth * dpr);
    this.canvas.height = Math.floor(window.innerHeight * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  emitBurst(count = 120) {
    const colors = ['#f39c12', '#e74c3c', '#9b59b6', '#3498db', '#2ecc71', '#f1c40f'];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * window.innerWidth,
        y: -10,
        vx: (Math.random() - 0.5) * 6,
        vy: Math.random() * 2 + 2,
        g: 0.06 + Math.random() * 0.04,
        size: 6 + Math.random() * 6,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 0,
        maxLife: 240 + Math.random() * 200
      });
    }
    if (!this.running) this.start();
  }

  start() {
    this.running = true;
    this.lastTs = performance.now();
    requestAnimationFrame(this.loop.bind(this));
  }

  stop() { this.running = false; }

  loop(ts) {
    if (!this.running) return;
    const dt = Math.min(32, ts - this.lastTs);
    this.lastTs = ts;
    this.update(dt);
    this.draw();
    requestAnimationFrame(this.loop.bind(this));
  }

  update(dt) {
    for (const p of this.particles) {
      p.vy += p.g * (dt / 16);
      p.x += p.vx * (dt / 16);
      p.y += p.vy * (dt / 16);
      p.rot += p.vr * (dt / 16);
      p.life += dt;
    }
    this.particles = this.particles.filter(p => p.y < window.innerHeight + 40 && p.life < p.maxLife);
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    for (const p of this.particles) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
      ctx.restore();
    }
  }
}