/* 02 群体游动：三条简单规则（分离、对齐、聚合）涌现出的群体运动 */
(function () {
  const D = window.Darkroom;
  const TAU = Math.PI * 2;

  D.sketches.boids = {
    id: 'boids',
    name: '群体游动',
    desc: '分离、对齐、聚合三条规则',
    hint: '鼠标是一只看不见的捕食者，群体会绕开它',
    settle: 300,
    params: [
      { key: 'count', label: '个体数', min: 40, max: 320, step: 10, def: 150 },
      { key: 'sep', label: '分离', min: 0, max: 3, step: 0.05, def: 1.15, digits: 2 },
      { key: 'ali', label: '对齐', min: 0, max: 3, step: 0.05, def: 1, digits: 2 },
      { key: 'coh', label: '聚合', min: 0, max: 3, step: 0.05, def: 0.9, digits: 2 },
      { key: 'speed', label: '航速', min: 0.5, max: 5, step: 0.1, def: 2.4, digits: 1 },
      { key: 'trail', label: '拖尾', min: 0.02, max: 0.6, step: 0.01, def: 0.1, digits: 2 },
      { key: 'size', label: '体型', min: 1, max: 6, step: 0.5, def: 2.5, digits: 1 }
    ],
    init(s) {
      s.boids = [];
      for (let i = 0; i < s.params.count; i++) {
        s.boids.push({
          x: s.rng() * s.w,
          y: s.rng() * s.h,
          vx: (s.rng() - 0.5) * 4,
          vy: (s.rng() - 0.5) * 4,
          c: s.pal.colors[Math.floor(s.rng() * s.pal.colors.length)]
        });
      }
    },
    frame(s, dt) {
      const { ctx, params, mouse } = s;
      const k = Math.min(dt, 50) / 16.667;
      const b = s.boids;
      const n = b.length;
      const R = 70;
      const R2 = R * R;

      while (n > params.count) { b.pop(); n--; }
      while (b.length < params.count) {
        b.push({
          x: s.rng() * s.w, y: s.rng() * s.h,
          vx: (s.rng() - 0.5) * 4, vy: (s.rng() - 0.5) * 4,
          c: s.pal.colors[Math.floor(s.rng() * s.pal.colors.length)]
        });
      }

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.fillStyle = D.rgba(s.pal.bg, params.trail);
      ctx.fillRect(0, 0, s.w, s.h);

      const maxV = params.speed;
      const fleeR = 150;

      for (let i = 0; i < b.length; i++) {
        const p = b[i];
        let sx = 0, sy = 0, ax = 0, ay = 0, cx = 0, cy = 0, nc = 0, na = 0;

        for (let j = 0; j < b.length; j++) {
          if (i === j) continue;
          const q = b[j];
          const dx = q.x - p.x;
          const dy = q.y - p.y;
          const d2 = dx * dx + dy * dy;
          if (d2 > R2 || d2 === 0) continue;
          const d = Math.sqrt(d2);
          nc++;
          cx += q.x; cy += q.y;
          ax += q.vx; ay += q.vy;
          if (d < 32) { sx -= dx / d; sy -= dy / d; na++; }
        }

        if (nc > 0) {
          ax /= nc; ay /= nc;
          p.vx += (ax - p.vx) * 0.05 * params.ali * k;
          p.vy += (ay - p.vy) * 0.05 * params.ali * k;
          const tx = cx / nc - p.x;
          const ty = cy / nc - p.y;
          const tl = Math.hypot(tx, ty) || 1;
          p.vx += (tx / tl) * 0.08 * params.coh * k;
          p.vy += (ty / tl) * 0.08 * params.coh * k;
        }
        if (na > 0) {
          p.vx += sx * 0.5 * params.sep * k;
          p.vy += sy * 0.5 * params.sep * k;
        }

        const mdx = p.x - mouse.x;
        const mdy = p.y - mouse.y;
        const md2 = mdx * mdx + mdy * mdy;
        if (md2 < fleeR * fleeR && md2 > 1) {
          const md = Math.sqrt(md2);
          const f = (1 - md / fleeR) * 2.2 * k;
          p.vx += (mdx / md) * f;
          p.vy += (mdy / md) * f;
        }

        const v = Math.hypot(p.vx, p.vy);
        if (v > maxV) { p.vx = (p.vx / v) * maxV; p.vy = (p.vy / v) * maxV; }

        p.x += p.vx * k;
        p.y += p.vy * k;
        if (p.x < 0) p.x += s.w; else if (p.x > s.w) p.x -= s.w;
        if (p.y < 0) p.y += s.h; else if (p.y > s.h) p.y -= s.h;
      }

      const size = params.size;
      for (let i = 0; i < b.length; i++) {
        const p = b[i];
        const v = Math.hypot(p.vx, p.vy) / maxV;
        const a = Math.atan2(p.vy, p.vx);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(a);
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = D.rgba(p.c, 1);
        ctx.beginPath();
        ctx.moveTo(size * 2.4, 0);
        ctx.lineTo(-size, size);
        ctx.lineTo(-size * 0.4, 0);
        ctx.lineTo(-size, -size);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    },
    pointer() {}
  };
})();
