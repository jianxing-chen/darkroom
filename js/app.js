/* 暗房主程序：界面装配、动画循环、定影导出 */
(function () {
  const D = window.Darkroom;
  const $ = (id) => document.getElementById(id);

  const PALETTES = [
    { id: 'safelight', name: '安全灯', bg: [18, 15, 11], colors: [[255, 179, 71], [255, 123, 51], [232, 72, 43], [198, 45, 74], [140, 47, 94]] },
    { id: 'abyss', name: '深海', bg: [7, 13, 18], colors: [[14, 76, 92], [27, 138, 156], [70, 184, 169], [155, 224, 205], [232, 243, 224]] },
    { id: 'tundra', name: '苔原', bg: [16, 18, 14], colors: [[107, 127, 78], [168, 181, 115], [217, 200, 154], [138, 90, 59], [78, 91, 60]] },
    { id: 'sakura', name: '夜樱', bg: [14, 10, 18], colors: [[108, 59, 143], [176, 78, 138], [226, 115, 155], [242, 169, 196], [122, 92, 201]] }
  ];

  D.rgba = (c, a) => 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
  D.mix = (a, b, t) => [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t)
  ];

  const ORDER = ['flow', 'boids', 'packing', 'fractal', 'truchet', 'harmonic'];

  const canvas = $('canvas');
  const ctx = canvas.getContext('2d');
  const stage = $('stage');
  const modesEl = $('modes');
  const paramListEl = $('paramList');
  const paletteListEl = $('paletteList');
  const filmstripEl = $('filmstrip');
  const toastEl = $('toast');
  const fpsEl = $('fps');
  const seedInput = $('seedInput');
  const nowNameEl = $('nowName');
  const nowHintEl = $('nowHint');

  let W = 1, H = 1;
  let current = null;
  let currentId = ORDER[0];
  let params = {};
  let state = null;
  let paused = false;
  let seedStr = seedInput.value || '8421';
  let palIdx = 0;
  const mouse = { x: -1e4, y: -1e4 };

  /* ---------- 画布尺寸 ---------- */
  function resize() {
    const rect = stage.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, Math.round(rect.width));
    H = Math.max(1, Math.round(rect.height));
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* ---------- 状态 ---------- */
  function makeState(w, h, target, mouseObj) {
    const seed = D.seedToInt(seedStr);
    const rng = D.rng(seed);
    const noise = D.noise(rng);
    return {
      rng, noise, t: 0, w, h,
      params: Object.assign({}, params),
      pal: PALETTES[palIdx],
      mouse: mouseObj,
      clicks: 0,
      ctx: target
    };
  }

  function paintBg(s, alpha) {
    s.ctx.globalCompositeOperation = 'source-over';
    s.ctx.globalAlpha = 1;
    s.ctx.fillStyle = D.rgba(s.pal.bg, alpha);
    s.ctx.fillRect(0, 0, s.w, s.h);
  }

  function rebuild() {
    if (!current) return;
    state = makeState(W, H, ctx, mouse);
    paintBg(state, 1);
    current.init(state);
  }

  /* ---------- 界面：算法列表 ---------- */
  function renderModes() {
    modesEl.innerHTML = '';
    ORDER.forEach((id, i) => {
      const sk = D.sketches[id];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'mode';
      b.dataset.id = id;
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(id === currentId));
      b.innerHTML =
        '<span class="mode-idx">' + String(i + 1).padStart(2, '0') + '</span>' +
        '<span class="mode-body"><span class="mode-name">' + sk.name + '</span>' +
        '<span class="mode-desc">' + sk.desc + '</span></span>';
      b.addEventListener('click', () => select(id));
      modesEl.appendChild(b);
    });
  }

  function select(id) {
    if (!D.sketches[id]) return;
    currentId = id;
    current = D.sketches[id];
    params = {};
    current.params.forEach((p) => { params[p.key] = p.def; });
    Array.prototype.forEach.call(modesEl.children, (b) => {
      b.setAttribute('aria-selected', String(b.dataset.id === id));
    });
    nowNameEl.textContent = current.name;
    nowHintEl.textContent = current.hint;
    renderParams();
    rebuild();
  }

  /* ---------- 界面：参数滑杆 ---------- */
  function fmt(p, v) {
    return Number(v).toFixed(p.digits || 0);
  }

  function renderParams() {
    paramListEl.innerHTML = '';
    current.params.forEach((p) => {
      const row = document.createElement('div');
      row.className = 'param';

      const head = document.createElement('div');
      head.className = 'param-head';
      const lab = document.createElement('span');
      lab.className = 'param-label';
      lab.textContent = p.label;
      const val = document.createElement('span');
      val.className = 'param-val';
      val.textContent = fmt(p, params[p.key]);
      head.appendChild(lab);
      head.appendChild(val);

      const input = document.createElement('input');
      input.type = 'range';
      input.min = p.min;
      input.max = p.max;
      input.step = p.step;
      input.value = params[p.key];
      input.setAttribute('aria-label', p.label);
      input.addEventListener('input', () => {
        const v = parseFloat(input.value);
        params[p.key] = v;
        val.textContent = fmt(p, v);
        const structural = current.structural || [];
        if (structural.indexOf(p.key) !== -1) {
          rebuild();
        } else {
          state.params[p.key] = v;
          if (current.adjust) current.adjust(state, p.key);
        }
      });

      row.appendChild(head);
      row.appendChild(input);
      paramListEl.appendChild(row);
    });
  }

  /* ---------- 界面：相纸 ---------- */
  function renderPalettes() {
    paletteListEl.innerHTML = '';
    PALETTES.forEach((p, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'swatch' + (i === palIdx ? ' on' : '');
      b.setAttribute('aria-label', '配色 ' + p.name);
      b.setAttribute('aria-pressed', String(i === palIdx));
      const chips = p.colors.map((c) => '<i style="background:' + D.rgba(c, 1) + '"></i>').join('');
      b.innerHTML = '<span class="chips">' + chips + '</span><span class="swatch-name">' + p.name + '</span>';
      b.addEventListener('click', () => {
        palIdx = i;
        renderPalettes();
        rebuild();
      });
      paletteListEl.appendChild(b);
    });
  }

  /* ---------- 提示 ---------- */
  let toastTimer = 0;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
  }

  /* ---------- 定影导出 ---------- */
  function addThumb(src) {
    const film = document.createElement('div');
    film.className = 'film developing';
    const tw = window.innerWidth < 900 ? 62 : 92;
    const th = Math.max(46, Math.round((tw * H) / W));
    const c = document.createElement('canvas');
    c.width = tw * 2;
    c.height = th * 2;
    const cx2 = c.getContext('2d');
    const sr = src.width / src.height;
    const tr = tw / th;
    let sw, sh, sx, sy;
    if (sr > tr) { sh = src.height; sw = sh * tr; sx = (src.width - sw) / 2; sy = 0; }
    else { sw = src.width; sh = sw / tr; sx = 0; sy = (src.height - sh) / 2; }
    cx2.drawImage(src, sx, sy, sw, sh, 0, 0, c.width, c.height);
    c.style.width = tw + 'px';
    c.style.height = th + 'px';
    c.title = '点击查看大图';
    c.addEventListener('click', () => {
      const w2 = window.open();
      if (w2) w2.document.write('<img style="max-width:100%" src="' + c.toDataURL('image/png') + '">');
    });
    film.appendChild(c);
    filmstripEl.appendChild(film);
    while (filmstripEl.children.length > 4) filmstripEl.removeChild(filmstripEl.firstChild);
    requestAnimationFrame(() => requestAnimationFrame(() => film.classList.remove('developing')));
  }

  function exportPNG() {
    if (!current) return;
    const scale = 2;
    const off = document.createElement('canvas');
    off.width = Math.max(1, Math.round(W * scale));
    off.height = Math.max(1, Math.round(H * scale));
    const octx = off.getContext('2d');
    octx.setTransform(scale, 0, 0, scale, 0, 0);

    const st = makeState(W, H, octx, { x: -1e4, y: -1e4 });
    paintBg(st, 1);
    current.init(st);
    const settle = current.settle || 60;
    const dt = 16.667;
    for (let i = 0; i < settle; i++) {
      st.t += dt;
      current.frame(st, dt);
    }

    const finish = (blob) => {
      if (!blob) { toast('定影失败：这个浏览器无法导出画布'); return; }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'darkroom-' + currentId + '-' + seedStr + '.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      addThumb(off);
      toast('已定影 · ' + current.name + ' 存为了 PNG');
    };
    if (off.toBlob) off.toBlob(finish, 'image/png');
    else finish(null);
  }

  /* ---------- 操作 ---------- */
  function togglePause() {
    paused = !paused;
    document.body.classList.toggle('paused', paused);
    toast(paused ? '已暂停，按空格继续' : '继续显影');
  }

  function newSeed() {
    seedStr = String(Math.floor(1000 + Math.random() * 9000));
    seedInput.value = seedStr;
    rebuild();
    toast('换了张药方 · ' + seedStr);
  }

  function clearStage() {
    rebuild();
    toast('重新曝光');
  }

  function randomizeParams() {
    current.params.forEach((p) => {
      const steps = Math.round((p.max - p.min) / p.step);
      const v = p.min + Math.round(Math.random() * steps) * p.step;
      params[p.key] = Math.round(v * 1e4) / 1e4;
    });
    renderParams();
    rebuild();
    toast('参数已随机');
  }

  function resetParams() {
    current.params.forEach((p) => { params[p.key] = p.def; });
    renderParams();
    rebuild();
    toast('参数恢复默认');
  }

  function cyclePalette() {
    palIdx = (palIdx + 1) % PALETTES.length;
    renderPalettes();
    rebuild();
    toast('相纸 · ' + PALETTES[palIdx].name);
  }

  function toggleUI() {
    const hidden = document.body.classList.toggle('ui-hidden');
    toast(hidden ? '界面已隐藏，按 H 恢复' : '界面回来了');
  }

  function toggleFull() {
    const el = document.querySelector('.app');
    if (document.fullscreenElement) document.exitFullscreen();
    else if (el.requestFullscreen) el.requestFullscreen();
  }

  /* ---------- 事件 ---------- */
  $('btnSeed').addEventListener('click', newSeed);
  $('btnSave').addEventListener('click', exportPNG);
  $('btnRandom').addEventListener('click', randomizeParams);
  $('btnReset').addEventListener('click', resetParams);
  $('btnFull').addEventListener('click', toggleFull);
  $('btnHide').addEventListener('click', toggleUI);

  function commitSeed() {
    const v = (seedInput.value || '').trim() || '0';
    seedStr = v;
    rebuild();
    toast('药方 ' + v);
  }
  seedInput.addEventListener('change', commitSeed);
  seedInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { commitSeed(); seedInput.blur(); }
    e.stopPropagation();
  });

  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
  });
  canvas.addEventListener('pointerleave', () => { mouse.x = -1e4; mouse.y = -1e4; });
  canvas.addEventListener('pointerdown', (e) => {
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    if (current && current.pointer) current.pointer(state, x, y);
  });

  document.addEventListener('keydown', (e) => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;
    const k = e.key.toLowerCase();
    if (k >= '1' && k <= '6') {
      select(ORDER[parseInt(k, 10) - 1]);
    } else if (k === ' ') {
      e.preventDefault();
      togglePause();
    } else if (k === 'r') {
      newSeed();
    } else if (k === 's') {
      e.preventDefault();
      exportPNG();
    } else if (k === 'p') {
      cyclePalette();
    } else if (k === 'h') {
      toggleUI();
    } else if (k === 'f') {
      toggleFull();
    } else if (k === 'c') {
      clearStage();
    }
  });

  let resizeTimer = 0;
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const ow = W, oh = H;
      resize();
      if (Math.abs(ow - W) > 1 || Math.abs(oh - H) > 1) rebuild();
    }, 120);
  };
  if (window.ResizeObserver) new ResizeObserver(onResize).observe(stage);
  window.addEventListener('resize', onResize);

  /* ---------- 动画循环 ---------- */
  let last = 0;
  let fpsSmooth = 60;
  let fpsAcc = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    if (!last) last = now;
    let dt = now - last;
    last = now;
    if (dt > 60) dt = 60;
    if (dt < 0) dt = 0;

    if (!paused && state && current) {
      state.t += dt;
      current.frame(state, dt);
    }

    if (dt > 0) {
      fpsSmooth += (1000 / dt - fpsSmooth) * 0.08;
      fpsAcc += dt;
      if (fpsAcc > 500) {
        fpsAcc = 0;
        fpsEl.textContent = Math.round(fpsSmooth) + ' FPS';
      }
    }
  }

  /* ---------- 启动 ---------- */
  resize();
  renderModes();
  renderPalettes();
  select(ORDER[0]);
  requestAnimationFrame(loop);

  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    paused = true;
    document.body.classList.add('paused');
    setTimeout(() => toast('检测到系统减弱动效设置，动画已暂停，按空格继续'), 600);
  }

  window.DarkroomApp = {
    select, exportPNG, rebuild,
    state: () => state,
    sketches: D.sketches,
    palettes: PALETTES
  };
})();
