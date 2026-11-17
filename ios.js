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
const IPAD10 = document.documentElement.classList.contains('dev-ipad10');
// フレームレートの選択肢(4K でも 24/30/60fps)
const fpsChoices = () => [24, 30, 60];

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

/* ---- 「…」のツールシート(参照画像の9項目) ---- */
const MAIN_TILES = [
  ['flash', 'フラッシュ', 'flashOff'], ['histo', 'ヒストグラム', 'histo'], ['aspect', 'アスペクト比', 'aspect169'],
  ['timer', 'タイマー', 'timerOff'], ['exposure', '露出', 'exposure'], ['style', 'スタイル', 'style'],
  ['depth', '被写界深度', 'depthOff'], ['night', 'ナイトモード', 'nightOff'], ['format', '解像度', null]
];
const SECOND_TILES = [
  ['burst', '連写', 'action'], ['auto', '自動撮影', 'timer'], ['zebra', '白飛び警告', 'style'],
  ['grid', 'グリッド', 'aspect169'], ['level', '水準器', 'level'], ['peak', 'ピント確認', 'depth'],
  ['dim', '画面の暗さ', 'nightOff'], ['settings', '設定', 'more']
];
const VIDEO_TILES = [
  ['flash', 'フラッシュ', 'flashAuto'], ['exposure', '露出', 'exposure'], ['action', 'アクション', 'action'], ['format', 'フォーマット', null]
];
function renderMainTiles() {
  const grid = $('#tiles .tile-grid'); if (!grid) return;
  const list = isVideoMode() ? VIDEO_TILES : MAIN_TILES;
  grid.classList.toggle('video', isVideoMode());
  const key = list.map(t => t[0]).join(',');
  if (grid.dataset.key === key) return;
  grid.dataset.key = key;
  grid.innerHTML = list.map(([act, label]) => `<button class="tile" data-act="${act}"><span class="tc"></span><em>${label}</em></button>`).join('');
}
function buildTiles() {
  const grid = $('#tiles .tile-grid');
  renderMainTiles();
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
    flash: torchOn, aspect: cfg.aspect !== 'full', timer: cfg.timer > 0, action: !!cfg.burstMode,
    exposure: $('#tiles .ex-slot').classList.contains('open'), style: (cfg.style || 'standard') !== 'standard'
  };
  const ICON = { flash: torchOn ? 'flashOn' : 'flashOff', timer: cfg.timer > 0 ? 'timer' : 'timerOff', aspect: 'aspect169' };
  $$('#tiles .tile').forEach(b => {
    const act = b.dataset.act, def = MAIN_TILES.find(t => t[0] === act) || VIDEO_TILES.find(t => t[0] === act);
    const tc = b.querySelector('.tc');
    if (act === 'format') tc.innerHTML = `<span class="fmtTxt">${resHtml()}</span>`;
    else tc.innerHTML = svgI(ICON[act] || (def && def[2]) || 'more');
    b.classList.toggle('on', !!st[act]);
    b.classList.toggle('dim', act === 'depth' || act === 'night');
    if (act === 'timer') b.querySelector('em').textContent = cfg.timer ? `タイマー ${cfg.timer}秒` : 'タイマー';
    if (act === 'aspect') b.querySelector('em').textContent = cfg.aspect === 'full' ? 'アスペクト比' : `比率 ${cfg.aspect}`;
  });
}
function openSheet(id) { if (id === 'tiles') { renderMainTiles(); syncTiles(); } show($('#' + id)); }
function closeSheet(id) { hide($('#' + id)); }

/* ---- フォーマットのシート(解像度・フレームレート / 写真の解像度・形式) ---- */
function openFmt() {
  const v = isVideoMode();
  const rows = v
    ? [{ t: '解像度', k: 'videoRes', o: [['720', 'HD'], ['1080', 'FHD'], ['2160', '4K']] },
       { t: 'フレームレート', k: 'fps', o: fpsChoices(cfg.videoRes).map(f => [String(f), String(f)]) }]
    : [{ t: '解像度', k: 'photoRes', o: [['fhd', 'FHD'], ['4k', '4K'], ['max', '最大']] },
       { t: '形式', k: 'fmt', o: [['jpeg', 'JPEG'], ['png', 'PNG']] }];
  $('#fmt-title').textContent = 'フォーマット';
  const box = $('#fmt-rows'); box.innerHTML = '';
  rows.forEach(r => {
    const row = mk('div', 'frow');
    row.innerHTML = `<div class="lab">${r.t}</div><div class="opts"></div>`;
    const opts = row.querySelector('.opts');
    r.o.forEach(([val, label]) => {
      const b = mk('button', String(cfg[r.k]) === val ? 'sel' : '', label);
      b.onclick = () => {
        applyKey(r.k, r.k === 'fps' ? Number(val) : val);
        openFmt();
      };
      opts.appendChild(b);
    });
    box.appendChild(row);
  });
  show($('#fmt'));
}

/* ---- 上部のアイコン行(iPhone) ---- */
function timerIconSvg(n) {
  return `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M9.8 2.8h4.4M12 2.8v2.2"/><circle cx="12" cy="13.2" r="8"/><text x="12" y="16.6" font-size="10.5" font-weight="600" text-anchor="middle" fill="currentColor" stroke="none" font-family="-apple-system,Helvetica,Arial">${n}</text></svg>`;
}
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
    timer: [cfg.timer > 0 ? 'timerN' + cfg.timer : 'timerOff', cfg.timer > 0]
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
      if (b.dataset.icon !== icon) { b.innerHTML = `<span class="ico-wrap">${icon.startsWith('timerN') ? timerIconSvg(icon.slice(6)) : svgI(icon)}</span>`; b.dataset.icon = icon; }
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
  const opts = kind === 'res' ? [['720', 'HD'], ['1080', 'FHD'], ['2160', '4K']] : fpsChoices(cfg.videoRes).map(f => [String(f), String(f)]);
  const cur = kind === 'res' ? String(cfg.videoRes) : String(cfg.fps);
  const p = mk('div', 'ipicker'); p.id = 'ipicker'; p.classList.add('lgg');
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

/* ---- ズームのダイヤル(iPhone): 長押しで出て、押したまま左右に回し、離すと閉じる ----
   本家の配置: 円の半径 226pt、中心は画面下の方、頂点が画面の約60%の高さ。目盛りは 2^(角度/16.5) の対数。 */
const DIAL = { cx: 196.5, cy: 226, R: 226, W: 393, H: 340, K: 16.5 };
let dialAng = 0, dialOpen = false, dialPress = null, lpFired = false, lpT = 0;
const dialAngle = z => Math.max(-62, Math.min(62, DIAL.K * Math.log2(z)));
function shownZoom() { return (lensId && lensId === ultraId && zoom === 1) ? 0.5 : zoom; }
function fmtZoom(z) { return (Math.abs(z - Math.round(z)) < 0.05 ? Math.round(z) : z.toFixed(1)) + '×'; }
function buildDial() {
  if (!IOS_UI || IPAD_UI) return;
  const d = mk('div', ''); d.id = 'zdial'; d.hidden = true;
  const ticks = [0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.4, 1.6, 1.8, 2, 2.5, 3, 4, 5, 6, 7, 8, 9, 10, 12];
  const majors = [0.5, 1, 2, 3, 5, 10];
  let g = '';
  ticks.forEach(z => {
    const a = dialAngle(z) * Math.PI / 180, sin = Math.sin(a), cos = Math.cos(a), major = majors.includes(z);
    const r1 = DIAL.R - 4, r2 = DIAL.R - (major ? 30 : 17);
    g += `<line x1="${(DIAL.cx + r1 * sin).toFixed(2)}" y1="${(DIAL.cy - r1 * cos).toFixed(2)}" x2="${(DIAL.cx + r2 * sin).toFixed(2)}" y2="${(DIAL.cy - r2 * cos).toFixed(2)}" class="${major ? 'maj' : 'min'}"/>`;
    if (major) {
      const lr = DIAL.R - 52, lx = DIAL.cx + lr * sin, ly = DIAL.cy - lr * cos;
      const rot = `rotate(${dialAngle(z).toFixed(2)} ${lx.toFixed(2)} ${ly.toFixed(2)})`;
      g += `<text x="${lx.toFixed(2)}" y="${ly.toFixed(2)}" transform="${rot}" class="dlab${z === 1 ? ' one' : ''}">${z === 0.5 ? '.5' : z}</text>`;
      if (z === 0.5) g += `<text x="${(lx - 4).toFixed(2)}" y="${(ly + 15).toFixed(2)}" transform="${rot}" class="dmm">13MM</text>`;
    }
  });
  d.innerHTML = `<svg viewBox="0 0 ${DIAL.W} ${DIAL.H}" width="100%" height="100%" preserveAspectRatio="xMidYMax meet">
    <circle cx="${DIAL.cx}" cy="${DIAL.cy}" r="${DIAL.R}" class="dbg"/>
    <rect x="0" y="${DIAL.cy}" width="${DIAL.W}" height="${DIAL.H - DIAL.cy}" class="dbg"/>
    <g id="zdial-g">${g}</g>
    <path d="M${DIAL.cx} 2.5 l-6.2 11.5 h12.4 z" class="dmark"/>
    <text id="zd-big" x="${DIAL.cx}" y="40" class="dbig">1×</text>
    <text id="zd-mm" x="${DIAL.cx}" y="57" class="dmm2">26MM</text>
  </svg>`;
  $('#app').appendChild(d);
}
function syncDial(z) {
  const g = $('#zdial-g'); if (!g) return;
  const v = z != null ? z : shownZoom();
  dialAng = dialAngle(v);
  g.style.transformOrigin = `${DIAL.cx}px ${DIAL.cy}px`;
  g.style.transform = `rotate(${(-dialAng).toFixed(2)}deg)`;
  const big = $('#zd-big'), mm = $('#zd-mm');
  if (big) big.textContent = fmtZoom(v);
  if (mm) mm.textContent = v < 0.9 ? '13MM' : (Math.abs(v - 1) < 0.05 ? '26MM' : '');
}
function showDial() {
  const d = $('#zdial'); if (!d || dialOpen) return;
  dialOpen = true; d.hidden = false;
  $('#zoompanel').classList.add('dial-on');
  syncDial(shownZoom());
}
function hideDial() {
  if (!dialOpen) return;
  dialOpen = false; dialPress = null;
  const d = $('#zdial'); if (d) d.hidden = true;
  $('#zoompanel').classList.remove('dial-on');
}
// 押したまま左右に動かすと回る。左へ動かすと大きく(望遠側)、右へ動かすと小さく(広角側)
function wireZoomPress() {
  const zp = $('#zoompresets');
  zp.addEventListener('pointerdown', e => {
    const b = e.target.closest('button'); if (!b || !IOS_UI || IPAD_UI) return;
    lpFired = false;
    try { b.setPointerCapture(e.pointerId); } catch (_) {}
    dialPress = { x: e.clientX, id: e.pointerId };
    clearTimeout(lpT);
    lpT = setTimeout(() => { lpFired = true; showDial(); }, 380);
  });
  document.addEventListener('pointermove', e => {
    if (!dialOpen || !dialPress) return;
    const dx = e.clientX - dialPress.x; dialPress.x = e.clientX;
    const ang = dialAng - dx * (180 / Math.PI) / DIAL.R;   // 左へ動かすと角度が増える
    const z = Math.max(0.5, Math.min(zmax, Math.pow(2, ang / DIAL.K)));
    if (z >= 1) setZoom(z);
    syncDial(z);
  });
  const end = () => {
    clearTimeout(lpT);
    if (dialOpen) {
      const z = shownZoom();
      hideDial();
      if (z < 1) choosePreset(0.5); else setZoom(z);
      keepZoomPanel();
    }
    dialPress = null;
  };
  document.addEventListener('pointerup', end);
  document.addEventListener('pointercancel', end);
  zp.addEventListener('click', e => { if (lpFired) { lpFired = false; e.stopPropagation(); e.preventDefault(); } }, true);
}

/* ---- Liquid Glass: 屈折(Chromium 系のみ)と磨りガラス(Safari / Firefox)----
   変位マップ(R=x, G=y の押し出し量)を canvas で作り、SVG フィルタの feImage に渡す。
   縁ほど内側へ引き込む(レンズの縁の屈折)。Safari は backdrop-filter: url() を描かないため使わない。 */
function refractMap() {
  const N = 256, c = document.createElement('canvas'); c.width = c.height = N;
  const x = c.getContext('2d'), img = x.createImageData(N, N), d = img.data;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const nx = (i / (N - 1)) * 2 - 1, ny = (j / (N - 1)) * 2 - 1;
    const edge = 1 - Math.max(Math.abs(nx), Math.abs(ny));
    const m = Math.max(0, Math.min(1, (0.42 - edge) / 0.42)), sm = m * m * (3 - 2 * m);
    const o = (j * N + i) * 4;
    d[o] = 128 - nx * sm * 120; d[o + 1] = 128 - ny * sm * 120; d[o + 2] = 128; d[o + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  return c.toDataURL();
}
function setupGlass() {
  const ua = navigator.userAgent;
  const chromium = /Chrome\//.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  if (chromium) document.documentElement.classList.add('lg-refract');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.setAttribute('aria-hidden', 'true');
  svg.style.position = 'absolute';
  svg.innerHTML = `<defs><filter id="lg-refract" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feImage href="${refractMap()}" x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="map"/><feDisplacementMap in="SourceGraphic" in2="map" scale="26" xChannelSelector="R" yChannelSelector="G"/></filter></defs>`;
  document.body.appendChild(svg);
  ['.ib', '.ipad-top', '#btn-cap', '#btn-flip', '#ib-depth', '.lg', '#modes .ind', '.tile .tc'].forEach(sel => document.querySelectorAll(sel).forEach(e => e.classList.add('lgg')));
}

/* ---- 設定: iOS の「設定」風の一覧 ----
   ・項目を角丸のグループにまとめ、見出しと説明を iOS の書式にする
   ・スイッチ・スライダー・分段は Liquid Glass の部品(lg-switch / lg-slider / lg-segmented)に差し替える
     (部品が読み込めなかった時は今の部品のまま)
   ・ビデオ撮影は、解像度とフレームレートをチェックマーク付きの一覧で選ぶ */
const LG_READY = () => !!(window.customElements && customElements.get('lg-switch') && customElements.get('lg-slider') && customElements.get('lg-segmented'));
const VIDEO_OPTS = [['720', 30], ['1080', 30], ['1080', 60], ['2160', 24], ['2160', 30], ['2160', 60]];
const VIDEO_LABEL = { '720': '720p HD', '1080': '1080p HD', '2160': '4K' };
function videoOptLabel(r, f) { return `${VIDEO_LABEL[r]}/${f} fps`; }
function videoOptDisabled() { return false; }

function groupSettings() {
  const panel = $('#settings .panel');
  if (!panel || panel.dataset.grouped) return;
  panel.dataset.grouped = '1';
  let grp = null;
  [...panel.children].forEach(ch => {
    if (ch.tagName === 'H3') { ch.classList.add('ios-h'); grp = null; return; }
    if (ch.classList.contains('row') || ch.classList.contains('mrow') || (ch.tagName === 'LABEL' && ch.classList.contains('mrow'))) {
      if (!grp) { grp = mk('div', 'grp'); ch.before(grp); }
      grp.appendChild(ch);
    } else grp = null;
  });
  // ビデオ撮影: 解像度・フレームレートの行を1つの「ビデオ撮影」行にまとめる
  const resRow = $('#settings .seg[data-key=videoRes]') && $('#settings .seg[data-key=videoRes]').closest('.row');
  const fpsRow = $('#settings .seg[data-key=fps]') && $('#settings .seg[data-key=fps]').closest('.row');
  if (resRow) {
    const nav = mk('div', 'row nav');
    nav.innerHTML = `<label>ビデオ撮影</label><span class="val" id="vid-val"></span>`;
    nav.onclick = () => openSettingsSub('sub-video');
    resRow.before(nav);
    resRow.style.display = 'none';
    if (fpsRow) fpsRow.style.display = 'none';
  }
  const sub = mk('section', 'sub-page'); sub.id = 'sub-video';
  sub.innerHTML = `<header class="sub-top"><button class="sub-back" id="sub-back" aria-label="設定に戻る"><span class="chev-l"></span>設定</button><b>ビデオ撮影</b><span style="width:60px"></span></header><div class="grp" id="vid-list"></div><p class="foot">1分間のビデオのサイズは、解像度とフレームレートで変わります。</p>`;
  $('#settings').appendChild(sub);
  $('#sub-back').onclick = () => closeSettingsSub('sub-video');
  $('#vid-list').addEventListener('click', e => {
    const b = e.target.closest('.chk-row'); if (!b || b.classList.contains('dis')) return;
    applyKey('videoRes', b.dataset.r);
    applyKey('fps', Number(b.dataset.f));
    syncVideoSub();
  });
}
function syncVideoSub() {
  const r = String(cfg.videoRes), f = Number(cfg.fps);
  const v = $('#vid-val'); if (v) v.textContent = `${VIDEO_LABEL[r] || r} / ${f} fps`;
  const list = $('#vid-list'); if (!list) return;
  list.innerHTML = VIDEO_OPTS.map(([rr, ff]) => {
    const sel = rr === r && ff === f, dis = videoOptDisabled(rr, ff);
    return `<div class="chk-row${sel ? ' sel' : ''}${dis ? ' dis' : ''}" data-r="${rr}" data-f="${ff}"><span>${videoOptLabel(rr, ff)}</span><span class="ck">${svgI('checkmark')}</span></div>`;
  }).join('');
}
function openSettingsSub(id) { syncVideoSub(); $('#' + id).classList.add('open'); }
function closeSettingsSub(id) { $('#' + id).classList.remove('open'); }
// 部品は読み込みが済んだ後に差し替える(読み込めていない間は今の部品のまま)
function convertSettingControls() {
  if (!LG_READY()) return false;
  if ($('#settings lg-switch')) return true;
  $$('#settings input.switch[data-key]').forEach(inp => {
    const sw = mk('lg-switch'); sw.dataset.key = inp.dataset.key; sw.checked = inp.checked;
    inp.replaceWith(sw);
  });
  $$('#settings input[type=range][data-key]').forEach(r => {
    const sl = mk('lg-slider'); sl.dataset.key = r.dataset.key;
    sl.setAttribute('min', r.min); sl.setAttribute('max', r.max); sl.setAttribute('step', r.step);
    sl.value = parseFloat(r.value);
    r.replaceWith(sl);
  });
  $$('#settings .seg[data-key]').forEach(seg => {
    const sg = mk('lg-segmented'); sg.dataset.key = seg.dataset.key;
    sg.innerHTML = $$('button', seg).map(b => `<button value="${b.dataset.v}">${b.textContent}</button>`).join('');
    seg.replaceWith(sg);
  });
  return true;
}
// 部品からの変更を cfg へ(app.js の applyKey を通す)
function setupSettingEvents() {
  document.addEventListener('change', e => {
    const sw = e.target.closest && e.target.closest('lg-switch[data-key]');
    if (sw) return applyKey(sw.dataset.key, !!sw.checked);
    const sg = e.target.closest && e.target.closest('lg-segmented[data-key]');
    if (sg) {
      const k = sg.dataset.key, raw = String(sg.value);
      applyKey(k, /^-?\d+(\.\d+)?$/.test(raw) && k !== 'videoRes' ? Number(raw) : raw);
    }
  }, true);
  document.addEventListener('input', e => {
    const sl = e.target.closest && e.target.closest('lg-slider[data-key]');
    if (sl) applyKey(sl.dataset.key, parseFloat(sl.value));
  }, true);
}
function openSettingsIOS() {
  groupSettings();
  convertSettingControls();
  syncSettings();
  syncVideoSub();
  show(settings);
  updateUsage();
}

/* ---- 初期化 ---- */
(() => {
  if (!IOS_UI) return;
  setupGlass();
  const ctl = $('#controls');
  ['#btn-cap', '#zoompanel', '#chip-res', '#chip-lock'].forEach(s => ctl.appendChild($(s)));
  $('#tiles .ex-slot').append(...$$('#zoompanel .slrow'));
  const fl = $('#btn-flip .ms'); fl.innerHTML = svgI('cameraFlip');
  $('#btn-cap').innerHTML = `<span class="ms">${svgI('more')}</span>`;
  $('#chip-res').onclick = () => openFmt();
  buildTiles();
  buildTop();
  buildSideButtons();
  buildDial();
  wireZoomPress();
  // 設定ボタン: 本家にはないが、機能への入口として左上(iPad は右上)に置く
  const sb = $('#btn-settings');
  if (sb) { ctl.appendChild(sb); sb.classList.add('lgg', 'settings-btn'); sb.innerHTML = `<span class="ms">${svgI('gear')}</span>`; }
  // プレビューの大きさは、画面の大きさが変わるたびに計算し直す(動画が小さくなる不具合の対策)
  if (window.ResizeObserver) new ResizeObserver(() => { try { layout(); } catch (_) {} }).observe($('#stage'));
  ['tiles', 'fmt'].forEach(id => $('#' + id).addEventListener('click', e => { if (e.target.id === id) closeSheet(id); }));
  $('#zoompresets').addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('button');
    if (b && b.classList.contains('sel')) $('#zoompanel').classList.toggle('open');
    else $('#zoompanel').classList.remove('open');
  }, true);
  updateResChip();
  syncTop();
  setupSettingEvents();
  $('#btn-settings').onclick = openSettingsIOS;
  // syncUI の後に上部の表示も更新する
  const baseSyncUI = syncUI;
  window.syncUI = function () { baseSyncUI(); syncTop(); syncTiles(); };
})();
