'use strict';
/* =====================================================================
   iOS 風カメラの組み立て(iPhone / iPad)
   ・上部のアイコン行(フラッシュ・比率・連写・タイマー・露出・フォーマット)
   ・ズームの長押しで出る目盛りのダイヤル
   ・「…」のツールシート(参照画像と同じ9項目)。長押しで従来の機能
   ・写真のスタイル(保存時に画素を補正)
   ・iPad の右側の操作列(ビデオ: 解像度・FPS / 写真: ライブ・タイマー)
   ===================================================================== */
const IOS_UI = document.documentElement.classList.contains('ios');
const IPAD_UI = document.documentElement.classList.contains('ipad');
const mk = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const svgI = name => svgIcon(name);

/* ---- 解像度表示(上部・右の列で共通に使う2行の表示) ---- */
const baseResChip = updateResChip;
window.updateResChip = function () {
  if (!IOS_UI) return baseResChip();
  const el = $('#chip-res'); if (!el) return;
  el.innerHTML = resHtml();
};
function resHtml() {
  if (isVideoMode()) {
    const r = { 2160: '4K', 1080: 'FHD', 720: 'HD' }[cfg.videoRes] || 'FHD';
    return `<b>${r}</b><small>${Math.round(Number(cfg.fps) || 30)}</small>`;
  }
  const r = { max: 'MAX', '4k': '4K', fhd: 'FHD' }[cfg.photoRes] || 'MAX';
  return `<b>${cfg.fmt === 'png' ? 'PNG' : 'JPEG'}</b><small>${r}</small>`;
}

/* ---- フラッシュ(トーチ) ---- */
let torchOn = false;
async function setTorch(on) {
  const caps = (track && track.getCapabilities) ? track.getCapabilities() : {};
  if (!caps.torch) { toast('この端末・ブラウザではフラッシュを使えません', 2600); return; }
  try { await track.applyConstraints({ advanced: [{ torch: on }] }); torchOn = on; }
  catch (_) { toast('フラッシュを切り替えられませんでした', 2600); }
  syncTop();
}

/* ---- 写真のスタイル(保存時に画素を補正) ---- */
const STYLES = [['standard', '標準'], ['vivid', '鮮やか'], ['rich', 'リッチコントラスト'], ['warm', '暖かい'], ['cool', '冷たい']];
const STYLE_PARAMS = {
  vivid: { filter: 'vivid' },
  rich: { adj: { contrast: 28, highlights: -12, shadows: 10 } },
  warm: { adj: { warmth: 30 } },
  cool: { adj: { warmth: -30 } }
};
function styleLabel() { return (STYLES.find(s => s[0] === (cfg.style || 'standard')) || STYLES[0])[1]; }
function applyStyleCanvas(c) {    // app.js の encodeAndSave から呼ぶ
  const sp = STYLE_PARAMS[cfg.style];
  if (!sp || typeof peApplyPixels !== 'function') return;
  const x = c.getContext('2d'), id = x.getImageData(0, 0, c.width, c.height);
  peApplyPixels(id.data, c.width, c.height, { filter: 'none', adj: {}, tools: {}, auto: false, ...sp });
  x.putImageData(id, 0, 0);
}

/* ---- 未対応の機能(Webアプリからは制御できない) ---- */
const UNSUPPORTED = {
  depth: '被写界深度はWebアプリから調整できません',
  night: 'ナイトモードはWebアプリでは使えません'
};

/* ---- 共通の操作 ---- */
function cycleAspectCam() {
  const o = ['full', '3:2', '16:9', '1:1', 'a4'];
  applyCap('aspect', o[(o.indexOf(cfg.aspect) + 1) % o.length]);
  syncTop(); syncTiles();
}
function cycleStyle() {
  const i = STYLES.findIndex(s => s[0] === (cfg.style || 'standard'));
  cfg.style = STYLES[(i + 1) % STYLES.length][0]; saveCfg();
  toast(`スタイル: ${styleLabel()}`, 1600);
  syncTop(); syncTiles();
}
function openExposure() {
  $('#tiles .ex-slot').classList.add('open');
  openSheet('tiles');
}
const ACT = {
  flash: () => setTorch(!torchOn),
  aspect: cycleAspectCam,
  action: () => $('#btn-burst').click(),
  timer: () => $('#btn-timer').click(),
  exposure: openExposure,
  style: cycleStyle,
  histo: () => { $('#capmenu input[data-key=histo]').click(); syncTiles(); },
  depth: () => toast(UNSUPPORTED.depth, 2600),
  night: () => toast(UNSUPPORTED.night, 2600),
  format: () => { closeSheet('tiles'); openFmt(); },
  // 長押し「…」の機能シート
  burst: () => $('#btn-burst').click(),
  auto: () => { const o = ['off', 'page', 'interval']; applyCap('auto', o[(o.indexOf(cfg.auto) + 1) % o.length]); syncTiles(); },
  zebra: () => { $('#capmenu input[data-key=zebra]').click(); syncTiles(); },
  grid: () => { $('#btn-grid').click(); syncTiles(); },
  level: () => { $('#btn-level').click(); syncTiles(); },
  peak: () => { $('#btn-peak').click(); syncTiles(); },
  dim: () => { $('#btn-dim').click(); syncTiles(); },
  settings: () => { closeSheet('tiles2'); $('#btn-settings').click(); }
};

/* ---- 「…」のツールシート/* ---- 「…」のツールシート(参照画像の9項目) ---- */
const MAIN_TILES = [
  ['flash', 'フラッシュ', 'flashOff'], ['histo', 'ヒストグラム', 'histo'], ['aspect', 'アスペクト比', 'aspect169'],
  ['timer', 'タイマー', 'timerOff'], ['exposure', '露出', 'exposure'], ['style', 'スタイル', 'style'],
  ['depth', '被写界深度', 'depthOff'], ['night', 'ナイトモード', 'nightOff'], ['format', '解像度', null]
];
const SECOND_TILES = [
  ['burst', '連写', 'action'], ['auto', '自動撮影', 'timer'], ['zebra', '白飛び警告', 'style'],
  ['grid', 'グリッド', 'aspect169'], ['level', '水準器', 'flip'], ['peak', 'ピント確認', 'depth'],
  ['dim', '画面の暗さ', 'nightOff'], ['settings', '設定', 'more']
];
function buildTiles() {
  const grid = $('#tiles .tile-grid');
  grid.innerHTML = MAIN_TILES.map(([act, label]) => `<button class="tile" data-act="${act}"><span class="tc"></span><em>${label}</em></button>`).join('');
  grid.addEventListener('click', e => { const b = e.target.closest('.tile'); if (b && ACT[b.dataset.act]) ACT[b.dataset.act](); });
  // 長押し「…」: 従来の機能を並べたシート
  const s2 = mk('section', 'scrim sheetwrap'); s2.id = 'tiles2'; s2.hidden = true;
  s2.innerHTML = `<div class="ios-sheet"><div class="grab"></div><div class="fmt-top"><button class="cbtn" id="tiles2-close" aria-label="閉じる"><span class="ms">close</span></button><b>機能</b><span style="width:40px"></span></div><div class="tile-grid">${SECOND_TILES.map(([act, label, icon]) => `<button class="tile" data-act="${act}"><span class="tc">${svgI(icon)}</span><em>${label}</em></button>`).join('')}</div></div>`;
  document.body.appendChild(s2);
  s2.addEventListener('click', e => { if (e.target === s2) closeSheet('tiles2'); const b = e.target.closest('.tile'); if (b && ACT[b.dataset.act]) ACT[b.dataset.act](); });
  $('#tiles2-close').onclick = () => closeSheet('tiles2');
  $('#tl-edit') && $('#tl-edit').remove();   // 本家には「編集」ボタンが無いので外す
  $('#tiles').addEventListener('click', e => { if (e.target.id === 'tiles') closeSheet('tiles'); });
  $('#fmt').addEventListener('click', e => { if (e.target.id === 'fmt') closeSheet('fmt'); });
  $('#fmt-close').onclick = () => closeSheet('fmt');
  wireCapLong();
}
// 「…」を長押しすると機能シート、短く押すとツールシート
let capT = 0, capLong = false;
function wireCapLong() {
  const cap = $('#btn-cap');
  cap.addEventListener('pointerdown', () => { capLong = false; capT = setTimeout(() => { capLong = true; openSheet('tiles2'); }, 450); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => cap.addEventListener(t, () => clearTimeout(capT)));
  cap.onclick = () => { if (capLong) { capLong = false; return; } openSheet('tiles'); };
}
function syncTiles() {
  if (!$('#tiles .tile-grid').children.length) return;
  const st = {
    flash: torchOn, aspect: cfg.aspect !== 'full', timer: cfg.timer > 0,
    exposure: $('#tiles .ex-slot').classList.contains('open'), style: (cfg.style || 'standard') !== 'standard'
  };
  const ICON = { flash: torchOn ? 'flashOn' : 'flashOff', timer: cfg.timer > 0 ? 'timer' : 'timerOff', aspect: 'aspect169' };
  $$('#tiles .tile').forEach(b => {
    const act = b.dataset.act, def = MAIN_TILES.find(t => t[0] === act);
    const tc = b.querySelector('.tc');
    if (act === 'format') tc.innerHTML = `<span class="fmtTxt">${resHtml()}</span>`;
    else tc.innerHTML = svgI(ICON[act] || (def && def[2]) || 'more');
    b.classList.toggle('on', !!st[act]);
    b.classList.toggle('dim', act === 'depth' || act === 'night');
    if (act === 'timer') b.querySelector('em').textContent = cfg.timer ? `タイマー ${cfg.timer}秒` : 'タイマー';
    if (act === 'aspect') b.querySelector('em').textContent = cfg.aspect === 'full' ? 'アスペクト比' : `比率 ${cfg.aspect}`;
  });
}
function openSheet(id) { if (id === 'tiles') syncTiles(); show($('#' + id)); }
function closeSheet(id) { hide($('#' + id)); }

/* ---- 上部のアイコン行(iPhone) ---- */
const TOP_ITEMS = ['flash', 'aspect', 'action', 'timer', 'ev', 'fmt'];
function buildTop() {
  const t = mk('div', 'topicons'); t.id = 'topicons'; t.classList.add('iphone-only');
  t.innerHTML = TOP_ITEMS.map(k => `<button class="tb" data-k="${k}" aria-label="${k}"></button>`).join('');
  t.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const k = b.dataset.k;
    if (k === 'flash') ACT.flash(); else if (k === 'aspect') ACT.aspect();
    else if (k === 'action') ACT.action(); else if (k === 'timer') ACT.timer(); else if (k === 'ev') openExposure(); else if (k === 'fmt') ACT.format();
  });
  $('#controls').appendChild(t);
}
function evValue() { const s = $('#expslider'); return s ? Number(s.value) || 0 : 0; }
function syncTop() {
  const map = {
    flash: [torchOn ? 'flashOn' : 'flashOff', torchOn],
    aspect: ['aspect169', cfg.aspect !== 'full'],
    action: [cfg.burstMode ? 'action' : 'actionOff', !!cfg.burstMode],
    timer: [cfg.timer > 0 ? 'timer' : 'timerOff', cfg.timer > 0]
  };
  $$('#topicons .tb').forEach(b => {
    const k = b.dataset.k;
    if (k === 'ev') {
      const hide = $('#exprow') && $('#exprow').hidden;
      b.hidden = !!hide;
      const v = evValue();
      b.innerHTML = `<span class="evv">${v > 0 ? '+' : ''}${v.toFixed(1)}</span><small>EV</small>`;
      b.classList.toggle('on', Math.abs(v) > 0.001);
    } else if (k === 'fmt') {
      b.innerHTML = `<span class="fmtTxt">${resHtml()}</span>`;
    } else {
      const [icon, on] = map[k];
      if (b.dataset.icon !== icon) { b.innerHTML = `<span class="ico-wrap">${svgI(icon)}</span>`; b.dataset.icon = icon; }
      b.classList.toggle('on', on);
    }
  });
  // iPad の右側の操作列
  const ib = (id, html, on) => { const b = $(id); if (b) { b.innerHTML = html; b.classList.toggle('on', !!on); } };
  const resName = { 2160: '4K', 1080: 'FHD', 720: 'HD' }[cfg.videoRes] || 'FHD';
  ib('#ib-res', `<b>${resName}</b><small>RES</small>`);
  ib('#ib-fps', `<b>${Math.round(Number(cfg.fps) || 30)}</b><small>FPS</small>`);
  ib('#ib-aspect', svgI('aspect169'), cfg.aspect !== 'full');
  ib('#ib-timer2', svgI(cfg.timer > 0 ? 'timer' : 'timerOff'), cfg.timer > 0);
  ib('#ib-depth', svgI('depth'));
}

/* ---- iPad の右側の操作列 / iPhone の下段の補助ボタン ---- */
function buildSideButtons() {
  const ctl = $('#controls');
  const defs = [
    ['ib-res', 'ipad-video', 'ipad-top s1', b => openPicker('res', b), '解像度'],
    ['ib-fps', 'ipad-video', 'ipad-top s2', b => openPicker('fps', b), 'フレームレート'],
    ['ib-aspect', 'ipad-photo', 'ipad-top s1', () => cycleAspectCam(), '比率'],
    ['ib-timer2', 'ipad-photo', 'ipad-top s2', () => ACT.timer(), 'タイマー'],
    ['ib-depth', 'iphone-only iphone-depth', '', () => ACT.depth(), '被写界深度']
  ];
  defs.forEach(([id, cls, pos, fn, label]) => {
    const b = mk('button', `${pos} ${cls}`.trim()); b.id = id; b.setAttribute('aria-label', label);
    b.onclick = () => fn(b); ctl.appendChild(b);
  });
}

/* ---- iPad: 解像度・FPS をタップで選ぶピッカー(参照画像の横長のカプセル) ---- */
let pickerEl = null;
function openPicker(kind, anchor) {
  closePicker();
  const opts = kind === 'res' ? [['720', 'HD'], ['1080', 'FHD'], ['2160', '4K']] : [['24', '24'], ['30', '30'], ['60', '60']];
  const cur = kind === 'res' ? String(cfg.videoRes) : String(cfg.fps);
  const p = mk('div', 'ipicker'); p.id = 'ipicker';
  p.innerHTML = opts.map(([v, l]) => `<button data-v="${v}" class="${v === cur ? 'sel' : ''}">${l}</button>`).join('');
  const r = anchor.getBoundingClientRect(), base = $('#app').getBoundingClientRect();
  p.style.top = (r.top + r.height / 2 - base.top) + 'px';
  p.style.right = (base.right - r.left + 12) + 'px';
  $('#controls').appendChild(p);
  requestAnimationFrame(() => p.classList.add('open'));
  p.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const v = b.dataset.v;
    applyKey(kind === 'res' ? 'videoRes' : 'fps', kind === 'res' ? v : Number(v));
    closePicker(); syncTop();
  });
  pickerEl = p;
}
function closePicker() { if (pickerEl) { pickerEl.remove(); pickerEl = null; } }
document.addEventListener('pointerdown', e => { if (pickerEl && !e.target.closest('#ipicker') && !e.target.closest('.ipad-top')) closePicker(); }, true);

/* ---- ズームのダイヤル(iPhone: 長押し) ---- */
const DIAL = { cx: 196.5, cy: 330, R: 322, W: 393, H: 340 };
const dialAngle = z => Math.max(-60, Math.min(60, 11.5 * Math.log2(z)));
function shownZoom() { return (lensId && lensId === ultraId && zoom === 1) ? 0.5 : zoom; }
function buildDial() {
  if (!IOS_UI || IPAD_UI) return;
  const d = mk('div', ''); d.id = 'zdial'; d.hidden = true;
  const ticks = [0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.4, 1.6, 1.8, 2, 2.5, 3, 4, 5, 6, 8, 10];
  const majors = [0.5, 1, 2, 3, 5, 10];
  let g = '';
  ticks.forEach(z => {
    const a = dialAngle(z) * Math.PI / 180, major = majors.includes(z);
    const sx = DIAL.cx + DIAL.R * Math.sin(a), sy = DIAL.cy - DIAL.R * Math.cos(a);
    const r2 = DIAL.R - (major ? 20 : 10);
    const ex = DIAL.cx + r2 * Math.sin(a), ey = DIAL.cy - r2 * Math.cos(a);
    g += `<line x1="${sx.toFixed(1)}" y1="${sy.toFixed(1)}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}" class="${major ? 'maj' : 'min'}"/>`;
    if (major) {
      const lr = DIAL.R - 46, lx = DIAL.cx + lr * Math.sin(a), ly = DIAL.cy - lr * Math.cos(a);
      const lab = z === 1 ? '1×' : (z === 0.5 ? '.5' : String(z));
      g += `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" class="dlab${z === 1 ? ' cur' : ''}">${lab}</text>`;
      if (z === 0.5) g += `<text x="${lx.toFixed(1)}" y="${(ly + 16).toFixed(1)}" class="dmm">13MM</text>`;
    }
  });
  d.innerHTML = `<svg viewBox="0 0 ${DIAL.W} ${DIAL.H}" width="100%" height="100%" preserveAspectRatio="xMidYMax meet">
    <circle cx="${DIAL.cx}" cy="${DIAL.cy}" r="${DIAL.R}" class="dbg"/>
    <g id="zdial-g">${g}</g>
    <path d="M${DIAL.cx} 12 l-5 10 h10 z" class="dmark"/>
    <text id="zdial-big" x="${DIAL.cx}" y="66" class="dbig">1×</text>
    <text id="zdial-mm" x="${DIAL.cx}" y="86" class="dmm2">26MM</text>
  </svg>`;
  $('#app').appendChild(d);
  const svg = d.querySelector('svg');
  let dragging = false;
  const move = e => {
    const r = svg.getBoundingClientRect(), sc = DIAL.W / r.width;
    const x = (e.clientX - r.left) * sc, y = (e.clientY - r.top) * sc;
    const ang = Math.atan2(x - DIAL.cx, DIAL.cy - y) * 180 / Math.PI;
    const z = Math.max(0.5, Math.min(zmax || 10, Math.pow(2, ang / 11.5)));
    dialZ = z;
    if (z >= 1 && !(lensId && lensId === ultraId)) setZoom(z);
    syncDial(z);
  };
  svg.addEventListener('pointerdown', e => { dragging = true; svg.setPointerCapture(e.pointerId); move(e); });
  svg.addEventListener('pointermove', e => { if (dragging) move(e); });
  const end = () => { if (!dragging) return; dragging = false; if (dialZ < 1) choosePreset(0.5); else setZoom(dialZ); keepZoomPanel(); };
  svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
  document.addEventListener('pointerdown', e => { if (!d.hidden && !e.target.closest('#zdial') && !e.target.closest('#zoompresets')) d.hidden = true; }, true);
}
let dialZ = 1;
function syncDial(z) {
  const g = $('#zdial-g'); if (!g) return;
  const v = z != null ? z : shownZoom(); dialZ = v;
  g.style.transform = `rotate(${(-dialAngle(v)).toFixed(2)}deg)`;
  const big = $('#zdial-big'), mm = $('#zdial-mm');
  if (big) big.textContent = (v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)) + '×';
  if (mm) mm.textContent = v === 1 ? '26MM' : (v < 1 ? '13MM' : '');
}
let lpT = 0, lpFired = false;
function wireZoomPress() {
  const zp = $('#zoompresets');
  zp.addEventListener('pointerdown', e => {
    lpFired = false;
    if (!e.target.closest('button') || !IOS_UI || IPAD_UI) return;
    lpT = setTimeout(() => { lpFired = true; const d = $('#zdial'); if (d) { d.hidden = false; syncDial(); } }, 420);
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => zp.addEventListener(t, () => clearTimeout(lpT)));
  zp.addEventListener('click', e => { if (lpFired) { lpFired = false; e.stopPropagation(); e.preventDefault(); } }, true);
}

/* ---- 初期化 ---- */
(() => {
  if (!IOS_UI) return;
  const ctl = $('#controls');
  ['#btn-cap', '#zoompanel', '#chip-res', '#chip-lock'].forEach(s => ctl.appendChild($(s)));
  $('#tiles .ex-slot').append(...$$('#zoompanel .slrow'));
  const fl = $('#btn-flip .ms'); fl.innerHTML = svgI('flip');
  $('#btn-cap').innerHTML = `<span class="ms">${svgI('more')}</span>`;
  $('#chip-res').onclick = () => openFmt();
  buildTiles();
  buildTop();
  buildSideButtons();
  buildDial();
  wireZoomPress();
  ['tiles', 'fmt'].forEach(id => $('#' + id).addEventListener('click', e => { if (e.target.id === id) closeSheet(id); }));
  $('#zoompresets').addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('button');
    if (b && b.classList.contains('sel')) $('#zoompanel').classList.toggle('open');
    else $('#zoompanel').classList.remove('open');
  }, true);
  updateResChip();
  syncTop();
  // syncUI の後に上部の表示も更新する
  const baseSyncUI = syncUI;
  window.syncUI = function () { baseSyncUI(); syncTop(); syncTiles(); };
})();
