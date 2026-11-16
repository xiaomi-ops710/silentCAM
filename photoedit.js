'use strict';
/* =====================================================================
   写真編集(iOSの「写真」の編集に準拠: 調整 / フィルタ / 切り取り / ツール)
   ・プレビューは縮小画像で即時反映し、保存時は原寸で書き出す
   ・初回の保存前に原本を退避し、「元に戻す」で復元できる
   ===================================================================== */

/* ---PURE-START--- (DOMに依存しない処理。テストで直接読み込む) */
const PE_PRESETS = [
  ['none', 'オリジナル', {}],
  ['vivid', '鮮やか', { sat: 35, con: 12 }],
  ['vividW', '鮮やか(暖)', { sat: 35, con: 12, warm: 22 }],
  ['vividC', '鮮やか(冷)', { sat: 35, con: 12, warm: -22 }],
  ['dram', 'ドラマチック', { sat: -15, con: 30 }],
  ['dramW', 'ドラマチック(暖)', { sat: -15, con: 30, warm: 18 }],
  ['dramC', 'ドラマチック(冷)', { sat: -15, con: 30, warm: -18 }],
  ['mono', 'モノクロ', { sat: -100 }],
  ['silver', '銀塩調', { sat: -100, con: 15, b: -4 }],
  ['noir', 'ノワール', { sat: -100, con: 45, b: -8 }]
];
const PE_ADJ = [
  { k: 'auto', label: '自動', icon: 'auto_fix_high', g: 'adj', auto: true },
  { k: 'exposure', label: '露出', icon: 'exposure', g: 'adj', min: -2, max: 2, step: 0.1, fmt: v => (v >= 0 ? '+' : '') + v.toFixed(1) },
  { k: 'highlights', label: 'ハイライト', icon: 'brightness_high', g: 'adj', min: -100, max: 100 },
  { k: 'shadows', label: 'シャドウ', icon: 'brightness_low', g: 'adj', min: -100, max: 100 },
  { k: 'contrast', label: 'コントラスト', icon: 'contrast', g: 'adj', min: -100, max: 100 },
  { k: 'brightness', label: '明るさ', icon: 'light_mode', g: 'adj', min: -100, max: 100 },
  { k: 'saturation', label: '彩度', icon: 'palette', g: 'adj', min: -100, max: 100 },
  { k: 'warmth', label: '暖かさ', icon: 'wb_sunny', g: 'adj', min: -100, max: 100 }
];
const PE_TOOLS = [
  { k: 'sharpness', label: 'シャープネス', icon: 'details', g: 'tools', min: 0, max: 100 },
  { k: 'vignette', label: 'ビネット', icon: 'vignette', g: 'tools', min: 0, max: 100 },
  { k: 'noise', label: 'ノイズ低減', icon: 'grain', g: 'tools', min: 0, max: 100 },
  { k: 'scan', label: 'スキャン補正', icon: 'document_scanner', scan: true }
];
const PE_ANGLE = { k: 'angle', g: 'geo', label: '傾き', icon: 'straighten', min: -45, max: 45, step: 0.1, fmt: v => v.toFixed(1) + '°' };
const PE_ASPECTS = [['free', '自由'], ['1:1', '1:1'], ['4:3', '4:3'], ['3:2', '3:2'], ['16:9', '16:9'], ['orig', '原寸']];
const peClamp = (v, a, b) => Math.min(b, Math.max(a, v));
function peFmt(def, v) { return def.fmt ? def.fmt(v) : String(Math.round(v)); }
function peGet(def, p) { return def.g === 'geo' ? p[def.k] : ((p[def.g] && p[def.g][def.k]) || 0); }
function peSet(def, p, v) { if (def.g === 'geo') p[def.k] = v; else { p[def.g] = p[def.g] || {}; p[def.g][def.k] = v; } }
function peDefault() { return { rot: 0, flip: false, angle: 0, crop: { x: 0, y: 0, w: 1, h: 1 }, auto: false, filter: 'none', adj: {}, tools: {} }; }

// 指定の比率(fr = 表示の横/縦)で、画像内に収まる最大の切り取り枠(正規化座標)
function aspectCrop(name, fr) {
  if (name === 'free') return { x: 0, y: 0, w: 1, h: 1 };
  let t;
  if (name === 'orig') t = fr;
  else { const [a, b] = name.split(':').map(Number); const v = a / b; t = fr >= 1 ? v : 1 / v; }
  const rN = t / fr;                       // 正規化座標での w / h
  let w = 1, h = 1;
  if (rN >= 1) h = 1 / rN; else w = rN;
  return { x: (1 - w) / 2, y: (1 - h) / 2, w, h };
}

// 切り取り枠のドラッグ(hd: 'move' または nw,n,ne,e,se,s,sw,w)
function cropDrag(c, hd, dx, dy) {
  let x = c.x, y = c.y, w = c.w, h = c.h;
  const M = 0.08;
  if (hd === 'move') { x = peClamp(x + dx, 0, 1 - w); y = peClamp(y + dy, 0, 1 - h); return { x, y, w, h }; }
  if (hd.includes('w')) { const nx = peClamp(x + dx, 0, x + w - M); w = x + w - nx; x = nx; }
  if (hd.includes('e')) w = peClamp(w + dx, M, 1 - x);
  if (hd.includes('n')) { const ny = peClamp(y + dy, 0, y + h - M); h = y + h - ny; y = ny; }
  if (hd.includes('s')) h = peClamp(h + dy, M, 1 - y);
  return { x, y, w, h };
}

// 傾きを補正した時に、回転後の画像で枠を覆うための拡大率
function fitScale(deg, W, H) {
  const t = Math.abs(deg) * Math.PI / 180;
  if (!t) return 1;
  const c = Math.cos(t), s = Math.sin(t);
  return Math.max(c + (W / H) * s, c + (H / W) * s);
}

// 3x3 平均(シャープネス・ノイズ低減用)
function boxBlur(data, w, h) {
  const n = w * h, R = new Float32Array(n), G = new Float32Array(n), B = new Float32Array(n);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let sr = 0, sg = 0, sb = 0, c = 0;
    for (let dy = -1; dy <= 1; dy++) {
      const yy = peClamp(y + dy, 0, h - 1);
      for (let dx = -1; dx <= 1; dx++) {
        const o = (yy * w + peClamp(x + dx, 0, w - 1)) * 4;
        sr += data[o]; sg += data[o + 1]; sb += data[o + 2]; c++;
      }
    }
    const i = y * w + x; R[i] = sr / c; G[i] = sg / c; B[i] = sb / c;
  }
  return [R, G, B];
}

// 画素の補正(data は RGBA の Uint8ClampedArray。その場で書き換える)
function peApplyPixels(data, w, h, p) {
  const pr = (PE_PRESETS.find(x => x[0] === p.filter) || PE_PRESETS[0])[2];
  const A = p.adj || {}, T = p.tools || {};
  const n = w * h;
  let lo = 0, hi = 255;
  if (p.auto) {                                   // 自動: 上下0.5%を除いて明暗を伸ばす
    const hist = new Uint32Array(256);
    for (let i = 0; i < n; i++) { const o = i * 4; hist[(data[o] * 77 + data[o + 1] * 150 + data[o + 2] * 29) >> 8]++; }
    let acc = 0;
    for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc > n * 0.005) { lo = v; break; } }
    acc = 0;
    for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc > n * 0.005) { hi = v; break; } }
    if (hi - lo < 8) { lo = 0; hi = 255; }      // ほぼ単色の画像だけ伸ばさない
  }
  const k = 255 / Math.max(1, hi - lo);
  const sharp = T.sharpness || 0, noise = T.noise || 0, vig = T.vignette || 0;
  let bR = null, bG = null, bB = null;
  if (sharp || noise) { const b = boxBlur(data, w, h); bR = b[0]; bG = b[1]; bB = b[2]; }
  const ex = Math.pow(2, A.exposure || 0);
  const off = (A.brightness || 0) * 0.9 + (pr.b || 0);
  const con = 1 + ((A.contrast || 0) + (pr.con || 0)) / 100;
  const sf = Math.max(0, 1 + ((A.saturation || 0) + (pr.sat || 0)) / 100);
  const wm = ((A.warmth || 0) + (pr.warm || 0)) * 0.35;
  const hl = (A.highlights || 0) * 0.6, sh = (A.shadows || 0) * 0.6;
  const cx = w / 2, cy = h / 2, maxD = Math.hypot(cx, cy) || 1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, o = i * 4;
    let r = data[o], g = data[o + 1], b = data[o + 2];
    if (bR) {
      r += (r - bR[i]) * sharp / 100 * 1.4; g += (g - bG[i]) * sharp / 100 * 1.4; b += (b - bB[i]) * sharp / 100 * 1.4;
      r += (bR[i] - r) * noise / 100; g += (bG[i] - g) * noise / 100; b += (bB[i] - b) * noise / 100;
    }
    if (p.auto) { r = (r - lo) * k; g = (g - lo) * k; b = (b - lo) * k; }
    r = r * ex + off; g = g * ex + off; b = b * ex + off;
    if (hl || sh) {
      const L = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      const wh = peClamp((L - 0.5) * 2, 0, 1), ws = peClamp((0.5 - L) * 2, 0, 1);
      const d = hl * wh + sh * ws; r += d; g += d; b += d;
    }
    r = (r - 128) * con + 128; g = (g - 128) * con + 128; b = (b - 128) * con + 128;
    const Lg = 0.299 * r + 0.587 * g + 0.114 * b;
    r = Lg + (r - Lg) * sf; g = Lg + (g - Lg) * sf; b = Lg + (b - Lg) * sf;
    r += wm; b -= wm;
    if (vig) {
      const d = Math.hypot(x - cx, y - cy) / maxD, t = peClamp((d - 0.35) / 0.65, 0, 1);
      const m = 1 - vig / 100 * 0.8 * t * t * (3 - 2 * t);
      r *= m; g *= m; b *= m;
    }
    data[o] = peClamp(r, 0, 255); data[o + 1] = peClamp(g, 0, 255); data[o + 2] = peClamp(b, 0, 255);
  }
  return data;
}
/* ---PURE-END--- */

const PE = {
  item: null, src: null, sw: 0, sh: 0, prev: null, pw: 0, ph: 0,
  p: peDefault(), hist: [], hi: 0, tab: 'adjust', tool: null, busy: false,
  raf: 0, gKey: '', gCanvas: null, cd: null, lblEl: null, aspect: 'free', aspectIdx: 0
};
const pcanvas = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
const el = (t, c) => { const e = document.createElement(t); if (c) e.className = c; return e; };

// 幾何変換: 回転・反転・傾き補正(拡大して枠を覆う)。scale は解像度倍率
function geomCanvas(src, sw, sh, p, scale) {
  const quarter = (p.rot & 1) === 1;
  const RW = quarter ? sh : sw, RH = quarter ? sw : sh;
  const W = Math.max(1, Math.round(RW * scale)), H = Math.max(1, Math.round(RH * scale));
  const c = pcanvas(W, H), x = c.getContext('2d');
  const k = fitScale(p.angle, W, H);
  x.translate(W / 2, H / 2);
  x.rotate(p.angle * Math.PI / 180);
  x.scale(k * (p.flip ? -1 : 1), k);
  x.rotate((p.rot & 3) * Math.PI / 2);
  x.drawImage(src, -sw * scale / 2, -sh * scale / 2, sw * scale, sh * scale);
  return c;
}
function cropCanvas(F, c) {
  const sx = Math.round(c.x * F.width), sy = Math.round(c.y * F.height);
  const sw = Math.max(1, Math.round(c.w * F.width)), sh = Math.max(1, Math.round(c.h * F.height));
  const o = pcanvas(sw, sh);
  o.getContext('2d').drawImage(F, sx, sy, sw, sh, 0, 0, sw, sh);
  return o;
}
function colorize(C, p) {
  const x = C.getContext('2d'), id = x.getImageData(0, 0, C.width, C.height);
  peApplyPixels(id.data, C.width, C.height, p);
  x.putImageData(id, 0, 0);
  return C;
}
function renderFinal(src, sw, sh, p) { return colorize(cropCanvas(geomCanvas(src, sw, sh, p, 1), p.crop), p); }

/* ---------- 表示 ---------- */
function previewGeom() {
  const p = PE.p, key = [p.rot, p.flip, p.angle].join('|');
  if (!PE.gCanvas || key !== PE.gKey) { PE.gKey = key; PE.gCanvas = geomCanvas(PE.prev, PE.pw, PE.ph, p, 1); }
  return PE.gCanvas;
}
function schedulePaint() { if (!PE.raf) PE.raf = requestAnimationFrame(() => { PE.raf = 0; paintPreview(); }); }
function paintPreview() {
  if (!PE.prev) return;
  const F = previewGeom();
  let C;
  if (PE.tab === 'crop') { C = pcanvas(F.width, F.height); C.getContext('2d').drawImage(F, 0, 0); }   // 切り取り中は全体を表示
  else C = cropCanvas(F, PE.p.crop);
  colorize(C, PE.p);
  const cv = $('#pe-canvas'); cv.width = C.width; cv.height = C.height;
  cv.getContext('2d').drawImage(C, 0, 0);
  layoutWrap();
}
function layoutWrap() {
  const st = $('#pe-stage'), cv = $('#pe-canvas'), wrap = $('#pe-wrap');
  if (!cv.width || !st.clientWidth) return;
  const aw = st.clientWidth - 24, ah = st.clientHeight - 12, ar = cv.width / cv.height;
  let w = aw, h = aw / ar;
  if (h > ah) { h = ah; w = ah * ar; }
  wrap.style.width = Math.floor(w) + 'px'; wrap.style.height = Math.floor(h) + 'px';
  placeCrop();
}
function placeCrop() {
  const c = $('#pe-crop'), on = PE.tab === 'crop';
  c.hidden = !on; if (!on) return;
  const k = PE.p.crop;
  Object.assign(c.style, { left: k.x * 100 + '%', top: k.y * 100 + '%', width: k.w * 100 + '%', height: k.h * 100 + '%' });
}

/* ---------- 履歴 ---------- */
function commitPE() {
  const s = JSON.stringify(PE.p);
  if (PE.hist[PE.hi] !== s) {
    PE.hist = PE.hist.slice(0, PE.hi + 1); PE.hist.push(s);
    if (PE.hist.length > 60) PE.hist.shift();
    PE.hi = PE.hist.length - 1;
  }
  renderBar2();
}
function undoPE(d) {
  const ni = peClamp(PE.hi + d, 0, PE.hist.length - 1);
  if (ni === PE.hi) return;
  PE.hi = ni; PE.p = JSON.parse(PE.hist[ni]); renderAll();
}

/* ---------- 部品 ---------- */
function lblText(def) {
  if (def.auto) return PE.p.auto ? '自動' : '自動 オフ';
  return `${def.label}  ${peFmt(def, peGet(def, PE.p))}`;
}
function lbl(text) { const l = el('div', 'pe-lbl'); l.textContent = text; return l; }
function circleBtn(def, on, fn) {
  const b = el('button', 'pe-c' + (on ? ' on' : ''));
  b.setAttribute('aria-label', def.label);
  b.innerHTML = `<span class="ms">${def.icon}</span>`;
  b.onclick = fn;
  return b;
}
function iconBtn(icon, label, fn, disabled) {
  const b = el('button'); b.setAttribute('aria-label', label); b.title = label;
  b.innerHTML = `<span class="ms">${icon}</span>`; b.onclick = fn; b.disabled = !!disabled;
  return b;
}
function buildRuler(box, def) {
  const r = el('div', 'pe-ruler'), t = el('div', 'pe-ticks');
  r.appendChild(t); r.appendChild(el('i', 'pe-mark'));
  const span = def.max - def.min, mid = def.min + span / 2;
  const pos = () => { t.style.transform = `translateX(${-(peGet(def, PE.p) - mid) / span * 400}px)`; };
  let st = null;
  r.addEventListener('pointerdown', e => { st = { x: e.clientX, v: peGet(def, PE.p) }; r.setPointerCapture(e.pointerId); e.preventDefault(); });
  r.addEventListener('pointermove', e => {
    if (!st) return;
    let v = peClamp(st.v + (e.clientX - st.x) * span / 400, def.min, def.max);
    const s = def.step || 1; v = Number((Math.round(v / s) * s).toFixed(2));
    peSet(def, PE.p, v); pos();
    if (PE.lblEl) PE.lblEl.textContent = lblText(def);
    schedulePaint();
  });
  const end = () => { if (!st) return; st = null; commitPE(); };
  r.addEventListener('pointerup', end); r.addEventListener('pointercancel', end);
  pos(); box.appendChild(r);
}
function buildStrip(box) {
  const F = previewGeom(), strip = el('div', 'pe-strip');
  PE_PRESETS.forEach(([id]) => {
    const t = pcanvas(76, 76 * F.height / F.width);
    t.getContext('2d').drawImage(F, 0, 0, t.width, t.height);
    colorize(t, { ...PE.p, filter: id, adj: {}, tools: {}, auto: false });
    const b = el('button', 'pe-th' + (PE.p.filter === id ? ' sel' : ''));
    b.appendChild(t);
    b.onclick = () => { PE.p.filter = id; commitPE(); renderAll(); };
    strip.appendChild(b);
  });
  box.appendChild(strip);
}

/* ---------- ツール欄 ---------- */
function renderTool() {
  const box = $('#pe-tool'); box.innerHTML = ''; PE.lblEl = null;
  const p = PE.p;
  if (PE.tab === 'filter') {
    box.appendChild(lbl(PE_PRESETS.find(x => x[0] === p.filter)[1]));
    buildStrip(box);
    return;
  }
  if (PE.tab === 'crop') {
    const l = lbl(lblText(PE_ANGLE)); PE.lblEl = l; box.appendChild(l);
    const row = el('div', 'pe-circles');
    row.appendChild(circleBtn(PE_ANGLE, PE.tool === 'angle', () => { PE.tool = PE.tool === 'angle' ? null : 'angle'; renderTool(); }));
    box.appendChild(row);
    if (PE.tool === 'angle') buildRuler(box, PE_ANGLE);
    return;
  }
  const defs = PE.tab === 'adjust' ? PE_ADJ : PE_TOOLS;
  const cur = defs.find(d => d.k === PE.tool && !d.scan && !d.auto) || null;
  const l = lbl(cur ? lblText(cur) : (p.auto && PE.tab === 'adjust' ? '自動' : ' '));
  PE.lblEl = l; box.appendChild(l);
  const row = el('div', 'pe-circles');
  defs.forEach(d => row.appendChild(circleBtn(d, d.auto ? p.auto : PE.tool === d.k, () => onCircle(d))));
  box.appendChild(row);
  if (cur) buildRuler(box, cur);
}
function onCircle(d) {
  if (d.auto) { PE.p.auto = !PE.p.auto; commitPE(); renderAll(); return; }
  if (d.scan) { const it = PE.item; closePhotoEdit(); openEditor(it); return; }
  PE.tool = PE.tool === d.k ? null : d.k;
  renderTool();
}

/* ---------- 上段のカプセル・タブ ---------- */
function renderBar2() {
  const L = $('#pe-left'), R = $('#pe-right');
  L.innerHTML = ''; R.innerHTML = '';
  $('#pe-title').textContent = { adjust: '調整', filter: 'フィルタ', crop: '切り取り', tools: 'ツール' }[PE.tab];
  const full = { x: 0, y: 0, w: 1, h: 1 };
  if (PE.tab === 'crop') {
    L.append(
      iconBtn('flip', 'フリップ', () => {
        const c = PE.p.crop; PE.p.flip = !PE.p.flip; PE.p.crop = { ...c, x: 1 - c.x - c.w };
        commitPE(); renderAll();
      }),
      iconBtn('rotate_90_degrees_ccw', '回転', () => { PE.p.rot = (PE.p.rot + 1) % 4; PE.p.crop = { ...full }; commitPE(); renderAll(); })
    );
    R.append(
      iconBtn('aspect_ratio', 'アスペクト比', () => {
        PE.aspectIdx = (PE.aspectIdx + 1) % PE_ASPECTS.length;
        const name = PE_ASPECTS[PE.aspectIdx][0];
        PE.aspect = name;
        PE.p.crop = aspectCrop(name, previewGeom().width / previewGeom().height);
        commitPE(); renderAll();
      }),
      iconBtn('restart_alt', 'リセット', () => {
        Object.assign(PE.p, { rot: 0, flip: false, angle: 0, crop: { ...full } });
        PE.aspect = 'free'; PE.aspectIdx = 0; commitPE(); renderAll();
      })
    );
  } else {
    L.append(
      iconBtn('undo', '取り消す', () => undoPE(-1), PE.hi === 0),
      iconBtn('redo', 'やり直す', () => undoPE(1), PE.hi >= PE.hist.length - 1)
    );
    R.append(iconBtn('settings_backup_restore', '元に戻す', peRevert, !(PE.item && PE.item.edited)));
  }
}
function renderTabs() {
  const tabs = $$('#pe-tabs button');
  tabs.forEach(b => b.classList.toggle('on', b.dataset.t === PE.tab));
  const on = tabs.find(b => b.dataset.t === PE.tab), tri = $('#pe-tabs .tri');
  if (on && tri) tri.style.left = (on.offsetLeft + on.offsetWidth / 2 - 4) + 'px';
}
function renderAll() { paintPreview(); renderBar2(); renderTabs(); renderTool(); }

/* ---------- 切り取り枠のドラッグ ---------- */
(function wireCrop() {
  const c = $('#pe-crop');
  c.addEventListener('pointerdown', e => {
    const hd = e.target.dataset && e.target.dataset.h;
    if (!hd) return;
    e.preventDefault(); c.setPointerCapture(e.pointerId);
    const r = $('#pe-wrap').getBoundingClientRect();
    PE.cd = { hd, x: e.clientX, y: e.clientY, c0: { ...PE.p.crop }, W: r.width, H: r.height };
  });
  c.addEventListener('pointermove', e => {
    const d = PE.cd; if (!d) return;
    PE.p.crop = cropDrag(d.c0, d.hd, (e.clientX - d.x) / d.W, (e.clientY - d.y) / d.H);
    PE.aspect = 'free'; placeCrop();
  });
  const end = () => { if (!PE.cd) return; PE.cd = null; commitPE(); };
  c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end);
})();

/* ---------- 開く・閉じる・保存・元に戻す ---------- */
function closePhotoEdit() {
  hide($('#pedit'));
  if (PE.src && PE.src.close) PE.src.close();
  PE.src = null; PE.prev = null; PE.item = null; PE.gCanvas = null; PE.gKey = '';
}
async function openPhotoEdit(it) {
  if (!it || it.type !== 'photo') return;
  const blob = await DB.blob(it.id);
  if (!blob) return toast('画像を読み込めません');
  let bmp;
  try { bmp = await createImageBitmap(blob); } catch (_) { return toast('この画像は編集できません'); }
  if (PE.src && PE.src.close) PE.src.close();
  PE.item = it; PE.src = bmp; PE.sw = bmp.width; PE.sh = bmp.height;
  const k = Math.min(1, 1000 / Math.max(bmp.width, bmp.height));
  PE.pw = Math.max(1, Math.round(bmp.width * k)); PE.ph = Math.max(1, Math.round(bmp.height * k));
  PE.prev = pcanvas(PE.pw, PE.ph); PE.prev.getContext('2d').drawImage(bmp, 0, 0, PE.pw, PE.ph);
  PE.p = peDefault(); PE.hist = [JSON.stringify(PE.p)]; PE.hi = 0;
  PE.tab = 'adjust'; PE.tool = null; PE.gCanvas = null; PE.gKey = ''; PE.aspect = 'free'; PE.aspectIdx = 0;
  show($('#pedit'));
  renderAll();
}
function putRecord(meta, blob, orig, delOrig) {
  return new Promise((res, rej) => {
    const t = DB.db.transaction(['meta', 'blobs'], 'readwrite');
    t.objectStore('meta').put(meta);
    if (blob) t.objectStore('blobs').put({ id: meta.id, blob });
    if (orig) t.objectStore('blobs').put({ id: 'o' + meta.id, blob: orig });
    if (delOrig) t.objectStore('blobs').delete('o' + meta.id);
    t.oncomplete = () => res();
    t.onerror = t.onabort = () => rej(t.error || new Error('保存に失敗'));
  });
}
async function afterRecordChange(id) {
  await refreshGallery(); refreshLastThumb();
  vList = visibleItems();
  const k = vList.findIndex(i => i.id === id);
  vIdx = k >= 0 ? k : clamp(vIdx, 0, Math.max(0, vList.length - 1));
  await loadViewer(0);
}
async function peSave() {
  if (PE.busy || !PE.src) return;
  PE.busy = true; toast('書き出し中…', 60000);
  try {
    await sleep(30);
    const it = PE.item, full = renderFinal(PE.src, PE.sw, PE.sh, PE.p);
    const type = it.mime === 'image/png' ? 'image/png' : 'image/jpeg';
    const blob = await new Promise(r => full.toBlob(r, type, Math.max(cfg.quality, 0.95)));
    if (!blob) throw new Error('書き出しに失敗しました');
    const thumb = await makeThumb(full, { sx: 0, sy: 0, sw: full.width, sh: full.height });
    const orig = it.edited ? null : await DB.blob(it.id);     // 初回の編集時だけ原本を退避
    await putRecord({ ...it, w: full.width, h: full.height, size: blob.size, mime: type, thumb, edited: true }, blob, orig, false);
    closePhotoEdit();
    await afterRecordChange(it.id);
    toast('写真を保存しました');
  } catch (e) { toast('保存に失敗しました: ' + (e.message || e), 4000); }
  PE.busy = false;
}
async function peRevert() {
  const it = PE.item;
  if (!it || !it.edited) return;
  if (!(await dialog({ title: '元に戻す', text: '編集前の写真に戻します。編集内容は失われます。', ok: '元に戻す' }))) return;
  try {
    const orig = await new Promise((res, rej) => {
      const r = DB.db.transaction('blobs').objectStore('blobs').get('o' + it.id);
      r.onsuccess = () => res(r.result && r.result.blob); r.onerror = () => rej(r.error);
    });
    if (!orig) throw new Error('元の写真がありません');
    const bmp = await createImageBitmap(orig);
    const thumb = await makeThumb(bmp, { sx: 0, sy: 0, sw: bmp.width, sh: bmp.height });
    const w = bmp.width, h = bmp.height; if (bmp.close) bmp.close();
    await putRecord({ ...it, w, h, size: orig.size, mime: orig.type || it.mime, thumb, edited: false }, orig, null, true);
    closePhotoEdit();
    await afterRecordChange(it.id);
    toast('編集前の写真に戻しました');
  } catch (e) { toast('元に戻せませんでした: ' + (e.message || e), 4000); }
}

/* ---------- 配線 ---------- */
$$('#pe-tabs button').forEach(b => b.onclick = () => {
  PE.tab = b.dataset.t; PE.tool = PE.tab === 'crop' ? 'angle' : null;
  renderAll();
});
$('#pe-cancel').onclick = async () => {
  if (PE.hi > 0 && !(await dialog({ title: '編集を破棄', text: '保存していない変更を破棄しますか？', ok: '破棄' }))) return;
  closePhotoEdit();
};
$('#pe-done').onclick = peSave;
window.addEventListener('resize', () => { if (PE.item) layoutWrap(); });
$('#v-edit').innerHTML = '<span class="ms">tune</span>';
$('#v-edit').onclick = () => { const it = vList[vIdx]; if (it && it.type === 'photo') openPhotoEdit(it); };
