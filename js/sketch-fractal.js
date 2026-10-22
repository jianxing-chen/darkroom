/* 04 递归分形：一棵会随风摆动的树，枝条角度由位置噪声决定 */
(function () {
  const D = window.Darkroom;

  D.sketches.fractal = {
    id: 'fractal',
    name: '递归分形',
    desc: '带风的递归树，每枝角度都由噪声定',
    hint: '点击换一棵树；把「风」调到 0 它就静止',
    settle: 3,
    structural: [],
    params: [
      { key: 'depth', label: '递归深度', min: 4, max: 11, step: 1, def: 9 },
      { key: 'angle', label: '分叉角', min: 5, max: 60, step: 1, def: 24 },
      { key: 'ratio', label: '长度比', min: 0.55, max: 0.85, step: 0.01, def: 0.74, digits: 2 },
      { key: 'branches', label: '分叉数', min: 2, max: 3, step: 1, def: 2 },
      { key: 'wind', label: '风', min: 0, max: 1, step: 0.05, def: 0.3, digits: 2 },
      { key: 'thick', label: '主干粗细', min: 1, max: 16, step: 0.5, def: 7 }
    ],
    init(s) {
      s.variant = 0;
      this.draw(s);
    },
    adjust(s) {
      this.draw(s);
    },
    draw(s) {
      const { ctx, params } = s;
      const maxDepth = Math.round(params.depth);
      const spread = (params.angle * Math.PI) / 180;
      const baseLen = Math.min(s.w, s.h) * 0.3;
      const levels = [];
      for (let d = 0; d <= maxDepth; d++) levels.push([]);
      let budget = 26000;

      function branch(x, y, ang, len, d) {
        if (d > maxDepth || budget <= 0 || len < 1.2) return;
        budget--;
        const jitter = s.noise(x * 0.011, y * 0.011, 3.3 + s.variant * 1.7) * 0.5;
        const sway = params.wind * s.noise(x * 0.004, y * 0.004, s.t * 0.00035) * 0.6;
        const a = ang + jitter + sway;
        const x2 = x + Math.cos(a) * len;
        const y2 = y + Math.sin(a) * len;
        levels[d].push(x, y, x2, y2);

        const n = Math.round(params.branches);
        const child = len * params.ratio * (0.9 + 0.2 * (s.noise(x2 * 0.02, y2 * 0.02, 7.7) + 0.5));
        if (n === 2) {
          branch(x2, y2, a - spread, child, d + 1);
          branch(x2, y2, a + spread, child, d + 1);
        } else {
          branch(x2, y2, a - spread, child, d + 1);
          branch(x2, y2, a, child, d + 1);
          branch(x2, y2, a + spread, child, d + 1);
        }
      }

      branch(s.w / 2, s.h * 0.97, -Math.PI / 2, baseLen, 0);

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.fillStyle = D.rgba(s.pal.bg, 1);
      ctx.fillRect(0, 0, s.w, s.h);
      ctx.lineCap = 'round';

      const cols = s.pal.colors;
      const c1 = cols[0];
      const c2 = cols[cols.length - 1];
      for (let d = 0; d <= maxDepth; d++) {
        const seg = levels[d];
        if (!seg.length) continue;
        const f = maxDepth === 0 ? 0 : d / maxDepth;
        ctx.strokeStyle = D.rgba(D.mix(c1, c2, f), 1);
        ctx.globalAlpha = 0.55 + 0.4 * (1 - f);
        ctx.lineWidth = Math.max(0.4, params.thick * Math.pow(1 - f, 1.5) + 0.3);
        ctx.beginPath();
        for (let i = 0; i < seg.length; i += 4) {
          ctx.moveTo(seg[i], seg[i + 1]);
          ctx.lineTo(seg[i + 2], seg[i + 3]);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      s.dirty = false;
    },
    frame(s) {
      if (s.dirty || s.params.wind > 0) this.draw(s);
    },
    pointer(s) {
      s.variant = (s.variant + 1) % 64;
      this.draw(s);
    }
  };
})();
