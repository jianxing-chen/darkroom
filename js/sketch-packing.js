/* 03 圆堆积：贪心算法塞进尽可能多的圆，像一张密铺海报 */
(function () {
  const D = window.Darkroom;

  function fits(s, x, y, r) {
    const { w, h, params } = s;
    if (x - r < 4 || x + r > w - 4 || y - r < 4 || y + r > h - 4) return false;
    for (let i = 0; i < s.circles.length; i++) {
      const c = s.circles[i];
      const d = Math.hypot(c.x - x, c.y - y);
      if (d < c.r + r + params.gap) return false;
    }
    return true;
  }

  function place(s, seeds, bonus, opts) {
    const { rng, params, w, h, pal } = s;
    const cap = Math.max(params.count, s.circles.length) + (bonus || 0);
    const minR = opts && opts.minR != null ? opts.minR : params.minR;
    const gap = opts && opts.gap != null ? opts.gap : params.gap;
    let attempts = 0;
    const maxAttempts = 3000;
    while (s.circles.length < cap && attempts < maxAttempts) {
      attempts++;
      let x, y;
      if (seeds && attempts <= seeds.length * 30) {
        const p = seeds[(attempts - 1) % seeds.length];
        x = p.x + (rng() - 0.5) * 60;
        y = p.y + (rng() - 0.5) * 60;
      } else {
        x = rng() * w;
        y = rng() * h;
      }
      let r = Math.min(params.maxR, x - 4, w - x - 4, y - 4, h - y - 4);
      if (r < minR) continue;
      for (let i = 0; i < s.circles.length; i++) {
        const c = s.circles[i];
        r = Math.min(r, Math.hypot(c.x - x, c.y - y) - c.r - gap);
        if (r < minR) break;
      }
      if (r < minR) continue;
      s.circles.push({
        x, y,
        r: Math.max(1.5, r * (0.45 + rng() * 0.55)),
        c: pal.colors[Math.floor(rng() * pal.colors.length)],
        stroke: rng() < params.stroke,
        a: 0.2 + rng() * 0.55
      });
    }
    s.dirty = true;
  }

  D.sketches.packing = {
    id: 'packing',
    name: '圆堆积',
    desc: '贪心密铺出的圆点海报',
    hint: '在空白处点击，会从指尖开始长出一簇圆',
    settle: 3,
    structural: ['minR', 'maxR', 'gap', 'fill', 'stroke'],
    params: [
      { key: 'count', label: '圆的数量', min: 20, max: 900, step: 10, def: 260 },
      { key: 'minR', label: '最小半径', min: 2, max: 40, step: 1, def: 4 },
      { key: 'maxR', label: '最大半径', min: 20, max: 200, step: 5, def: 110 },
      { key: 'gap', label: '间隙', min: 0, max: 14, step: 1, def: 4 },
      { key: 'fill', label: '浓度', min: 0, max: 1, step: 0.05, def: 0.6, digits: 2 },
      { key: 'stroke', label: '描边比例', min: 0, max: 1, step: 0.05, def: 0.35, digits: 2 }
    ],
    init(s) {
      s.circles = [];
      place(s, null);
      this.draw(s);
    },
    adjust(s, key) {
      if (key === 'count') {
        if (s.circles.length > s.params.count) s.circles.length = s.params.count;
        else place(s, null, 0);
        this.draw(s);
      } else if (key === 'fill' || key === 'stroke') {
        this.draw(s);
      }
    },
    draw(s) {
      const { ctx, params } = s;
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.fillStyle = D.rgba(s.pal.bg, 1);
      ctx.fillRect(0, 0, s.w, s.h);
      ctx.lineWidth = 1.3;
      for (let i = 0; i < s.circles.length; i++) {
        const c = s.circles[i];
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        if (c.stroke) {
          ctx.globalAlpha = 0.75;
          ctx.strokeStyle = D.rgba(c.c, 1);
          ctx.stroke();
        } else {
          ctx.globalAlpha = c.a * params.fill;
          ctx.fillStyle = D.rgba(c.c, 1);
          ctx.fill();
          ctx.globalAlpha = 0.22 * params.fill;
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      s.dirty = false;
    },
    frame(s) {
      if (s.dirty) this.draw(s);
    },
    pointer(s, x, y) {
      // 点击时允许更小更挤的圆，才能从指缝里长出新的来
      place(s, [{ x, y }], 40, {
        minR: Math.max(2, s.params.minR * 0.35),
        gap: Math.max(1, s.params.gap * 0.35)
      });
      this.draw(s);
    }
  };
})();
