/* 06 谐波玫瑰：一圈圈错开相位的玫瑰线，叠出呼吸的光 */
(function () {
  const D = window.Darkroom;
  const TAU = Math.PI * 2;

  D.sketches.harmonic = {
    id: 'harmonic',
    name: '谐波玫瑰',
    desc: '错开相位的玫瑰线叠成的光',
    hint: '移动鼠标可以让花心偏向指尖',
    settle: 260,
    params: [
      { key: 'petals', label: '花瓣数', min: 1, max: 12, step: 0.5, def: 5, digits: 1 },
      { key: 'curves', label: '曲线数', min: 1, max: 14, step: 1, def: 7 },
      { key: 'speed', label: '相位速度', min: 0.05, max: 2, step: 0.05, def: 0.5, digits: 2 },
      { key: 'points', label: '采样点', min: 60, max: 700, step: 20, def: 360 },
      { key: 'width', label: '线宽', min: 0.3, max: 3, step: 0.1, def: 1, digits: 1 },
      { key: 'fade', label: '余晖', min: 0.01, max: 0.2, step: 0.005, def: 0.045, digits: 3 }
    ],
    init(s) {
      s.cx = s.w / 2;
      s.cy = s.h / 2;
    },
    frame(s, dt) {
      const { ctx, params, mouse } = s;
      const k = Math.min(dt, 50) / 16.667;
      const cols = s.pal.colors;

      let cx = s.w / 2;
      let cy = s.h / 2;
      const dx = mouse.x - cx;
      const dy = mouse.y - cy;
      const md = Math.hypot(dx, dy);
      if (md > 1 && md < Math.min(s.w, s.h) * 0.6) {
        cx += dx * 0.08;
        cy += dy * 0.08;
      }
      s.cx = cx;
      s.cy = cy;

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.fillStyle = D.rgba(s.pal.bg, params.fade);
      ctx.fillRect(0, 0, s.w, s.h);

      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = params.width;
      const R = Math.min(s.w, s.h) * 0.4;
      const pts = Math.round(params.points);

      for (let c = 0; c < params.curves; c++) {
        const f = params.curves === 1 ? 0 : c / (params.curves - 1);
        const phase = s.t * 0.0006 * params.speed + c * 0.32;
        const col = cols[Math.floor(f * (cols.length - 1) + 0.001)];
        ctx.strokeStyle = D.rgba(col, 1);
        ctx.globalAlpha = 0.5 - f * 0.3;
        ctx.beginPath();
        for (let i = 0; i <= pts; i++) {
          const th = (i / pts) * TAU;
          const rr = R * Math.cos(params.petals * th + phase) * (0.75 + 0.25 * Math.sin(3 * th + phase * 0.6));
          const x = cx + rr * Math.cos(th);
          const y = cy + rr * Math.sin(th);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    },
    pointer() {}
  };
})();
