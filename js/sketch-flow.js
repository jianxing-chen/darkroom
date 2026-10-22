/* 01 流场粒子：柏林噪声场里游走的笔触，拖尾堆积成地形图 */
(function () {
  const D = window.Darkroom;
  const TAU = Math.PI * 2;

  function spawn(s, p) {
    const { rng, pal } = s;
    const c = pal.colors[Math.floor(rng() * pal.colors.length)];
    p.x = rng() * s.w;
    p.y = rng() * s.h;
    p.px = p.x;
    p.py = p.y;
    p.col = c;
    p.a = 0.25 + rng() * 0.55;
    p.max = s.params.life * (0.5 + rng());
    p.life = p.max;
  }

  D.sketches.flow = {
    id: 'flow',
    name: '流场粒子',
    desc: '噪声风场中游走的笔触',
    hint: '移动鼠标可以推开粒子，点击播撒一团',
    settle: 420,
    params: [
      { key: 'count', label: '粒子数', min: 200, max: 4000, step: 50, def: 1400 },
      { key: 'scale', label: '风场尺度', min: 0.0004, max: 0.005, step: 0.0001, def: 0.0016, digits: 4 },
      { key: 'curl', label: '涡旋', min: 0.5, max: 4, step: 0.1, def: 2, digits: 1 },
      { key: 'speed', label: '流速', min: 0.2, max: 4, step: 0.1, def: 1.3, digits: 1 },
      { key: 'fade', label: '拖尾', min: 0.005, max: 0.25, step: 0.005, def: 0.035, digits: 3 },
      { key: 'width', label: '笔触', min: 0.3, max: 3, step: 0.1, def: 1, digits: 1 },
      { key: 'life', label: '寿命', min: 60, max: 600, step: 10, def: 240 }
    ],
    init(s) {
      s.parts = [];
      for (let i = 0; i < s.params.count; i++) {
        const p = {};
        spawn(s, p);
        s.parts.push(p);
      }
    },
    frame(s, dt) {
      const { ctx, params, mouse } = s;
      const k = Math.min(dt, 50) / 16.667;

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.fillStyle = D.rgba(s.pal.bg, params.fade);
      ctx.fillRect(0, 0, s.w, s.h);

      while (s.parts.length < params.count) {
        const p = {};
        spawn(s, p);
        s.parts.push(p);
      }
      while (s.parts.length > params.count) s.parts.pop();

      const sp = params.speed * k;
      const R = 130;
      ctx.lineWidth = params.width;
      ctx.lineCap = 'round';

      for (let i = 0; i < s.parts.length; i++) {
        const p = s.parts[i];
        const a = s.noise(p.x * params.scale, p.y * params.scale, s.t * 0.00018) * TAU * params.curl;
        let vx = Math.cos(a) * sp;
        let vy = Math.sin(a) * sp;

        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < R * R && d2 > 1) {
          const d = Math.sqrt(d2);
          const f = (1 - d / R) * 3.4 * k;
          vx += (dx / d) * f;
          vy += (dy / d) * f;
        }

        p.px = p.x;
        p.py = p.y;
        p.x += vx;
        p.y += vy;
        p.life -= k;

        let wrapped = false;
        if (p.x < 0) { p.x += s.w; wrapped = true; }
        else if (p.x > s.w) { p.x -= s.w; wrapped = true; }
        if (p.y < 0) { p.y += s.h; wrapped = true; }
        else if (p.y > s.h) { p.y -= s.h; wrapped = true; }

        if (p.life <= 0) {
          spawn(s, p);
          continue;
        }

        if (!wrapped) {
          ctx.globalAlpha = p.a * Math.min(1, p.life / 40);
          ctx.strokeStyle = D.rgba(p.col, 1);
          ctx.beginPath();
          ctx.moveTo(p.px, p.py);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    },
    pointer(s, x, y) {
      const { rng } = s;
      for (let i = 0; i < 90; i++) {
        const p = s.parts[Math.floor(rng() * s.parts.length)];
        if (!p) break;
        const a = rng() * TAU;
        const r = rng() * 55;
        p.x = x + Math.cos(a) * r;
        p.y = y + Math.sin(a) * r;
        p.px = p.x;
        p.py = p.y;
        p.life = p.max;
      }
    }
  };
})();
