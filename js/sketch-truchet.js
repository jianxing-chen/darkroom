/* 05 特鲁谢瓷砖：随机朝向的四分之一圆弧，接成一张迷宫织物 */
(function () {
  const D = window.Darkroom;

  D.sketches.truchet = {
    id: 'truchet',
    name: '特鲁谢瓷砖',
    desc: '随机弧线接成的迷宫织物',
    hint: '点击重新洗一遍牌；网格越小越细密',
    settle: 3,
    structural: ['cell'],
    params: [
      { key: 'cell', label: '网格边长', min: 14, max: 96, step: 2, def: 44 },
      { key: 'width', label: '线宽', min: 1, max: 10, step: 0.5, def: 3, digits: 1 },
      { key: 'arcs', label: '重弧比例', min: 0, max: 1, step: 0.05, def: 0.55, digits: 2 },
      { key: 'dots', label: '圆点比例', min: 0, max: 1, step: 0.05, def: 0.2, digits: 2 },
      { key: 'shift', label: '换色频率', min: 0, max: 1, step: 0.05, def: 0.35, digits: 2 }
    ],
    init(s) {
      this.shuffle(s);
      this.draw(s);
    },
    adjust(s) {
      this.draw(s);
    },
    shuffle(s) {
      const { rng, params } = s;
      const cell = params.cell;
      s.cols = Math.ceil(s.w / cell) + 1;
      s.rows = Math.ceil(s.h / cell) + 1;
      s.tiles = [];
      for (let i = 0; i < s.cols; i++) {
        for (let j = 0; j < s.rows; j++) {
          s.tiles.push({
            i, j,
            t: rng() < 0.5 ? 0 : 1,
            cRoll: rng(),
            c2Roll: rng(),
            dotRoll: rng(),
            doubleRoll: rng()
          });
        }
      }
      s.dirty = true;
    },
    draw(s) {
      const { ctx, params, pal, cols, rows } = s;
      const cell = params.cell;
      const r = cell / 2;
      const n = pal.colors.length;

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.fillStyle = D.rgba(pal.bg, 1);
      ctx.fillRect(0, 0, s.w, s.h);

      const paths = pal.colors.map(() => []);
      const inner = pal.colors.map(() => []);
      const dots = [];

      for (let k = 0; k < s.tiles.length; k++) {
        const t = s.tiles[k];
        const x = t.i * cell;
        const y = t.j * cell;

        // 换色频率低时颜色沿对角线平滑铺开，高时变成随机彩点
        const grad = Math.min(n - 1, Math.floor(((t.i + t.j) / Math.max(1, cols + rows - 2)) * n));
        const c = t.cRoll < params.shift ? Math.min(n - 1, Math.floor(t.cRoll * n)) : grad;
        const c2 = t.c2Roll < params.shift ? Math.min(n - 1, Math.floor(t.c2Roll * n)) : (grad + 1) % n;
        const double = t.doubleRoll < params.arcs;

        if (t.t === 0) {
          paths[c].push(x, y, r, 0, Math.PI / 2);
          paths[c].push(x + cell, y + cell, r, Math.PI, Math.PI * 1.5);
          if (double) {
            inner[c2].push(x, y, r * 0.62, 0, Math.PI / 2);
            inner[c2].push(x + cell, y + cell, r * 0.62, Math.PI, Math.PI * 1.5);
          }
        } else {
          paths[c].push(x + cell, y, r, Math.PI / 2, Math.PI);
          paths[c].push(x, y + cell, r, Math.PI * 1.5, Math.PI * 2);
          if (double) {
            inner[c2].push(x + cell, y, r * 0.62, Math.PI / 2, Math.PI);
            inner[c2].push(x, y + cell, r * 0.62, Math.PI * 1.5, Math.PI * 2);
          }
        }
        if (t.dotRoll < params.dots) dots.push(x + cell / 2, y + cell / 2, cell * 0.12, c2);
      }

      ctx.lineCap = 'round';
      const strokeGroup = (segs, alpha, lw) => {
        for (let c = 0; c < n; c++) {
          const seg = segs[c];
          if (!seg.length) continue;
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = D.rgba(pal.colors[c], 1);
          ctx.lineWidth = lw;
          ctx.beginPath();
          for (let i = 0; i < seg.length; i += 5) {
            const cx = seg[i], cy = seg[i + 1], rr = seg[i + 2], a0 = seg[i + 3], a1 = seg[i + 4];
            // arc() 会从当前点拉一条直线到弧的起点，先 moveTo 才能避免弧之间被串起来
            ctx.moveTo(cx + rr * Math.cos(a0), cy + rr * Math.sin(a0));
            ctx.arc(cx, cy, rr, a0, a1);
          }
          ctx.stroke();
        }
      };

      strokeGroup(inner, 0.45, params.width * 0.6);
      strokeGroup(paths, 0.9, params.width);

      for (let i = 0; i < dots.length; i += 4) {
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = D.rgba(pal.colors[dots[i + 3]], 1);
        ctx.beginPath();
        ctx.arc(dots[i], dots[i + 1], dots[i + 2], 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      s.dirty = false;
    },
    frame(s) {
      if (s.dirty) this.draw(s);
    },
    pointer(s) {
      this.shuffle(s);
      this.draw(s);
    }
  };
})();
