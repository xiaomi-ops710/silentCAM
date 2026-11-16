'use strict';
/* =====================================================================
   iOS(iPhone)向け「iOS 26 風カメラ」の組み立て
   ・要素の配置替え(上部の表示、シャッター行、下部バー)
   ・「…」→ コントロールシート / 解像度タップ → フォーマットシート
   PC や他のOSでは何もしない
   ===================================================================== */
const IOS_UI = document.documentElement.classList.contains('ios');

// 上部の解像度表示: 2行(例 4K / 60、JPEG / MAX)
const baseResChip = updateResChip;
window.updateResChip = function () {
  if (!IOS_UI) return baseResChip();
  const el = $('#chip-res'); if (!el) return;
  if (isVideoMode()) {
    const r = { 2160: '4K', 1080: '1080p', 720: '720p' }[cfg.videoRes] || '1080p';
    el.innerHTML = `<b>${r}</b><small>${Math.round(Number(cfg.fps) || 30)}</small>`;
  } else {
    const r = { max: 'MAX', '4k': '4K', fhd: 'FHD' }[cfg.photoRes] || 'MAX';
    el.innerHTML = `<b>${cfg.fmt === 'png' ? 'PNG' : 'JPEG'}</b><small>${r}</small>`;
  }
};

const TILE = {
  timer: () => $('#btn-timer').click(),
  burst: () => $('#btn-burst').click(),
  auto: () => {
    const o = ['off', 'page', 'interval'];
    applyCap('auto', o[(o.indexOf(cfg.auto) + 1) % o.length]);
    syncTiles();
  },
  aspect: () => {
    const o = ['full', '3:2', '16:9', '1:1', 'a4'];
    applyCap('aspect', o[(o.indexOf(cfg.aspect) + 1) % o.length]);
    syncTiles();
  },
  exposure: () => { $('#tiles .ex-slot').classList.toggle('open'); syncTiles(); },
  histo: () => { $('#capmenu input[data-key=histo]').click(); syncTiles(); },
  zebra: () => { $('#capmenu input[data-key=zebra]').click(); syncTiles(); },
  grid: () => { $('#btn-grid').click(); syncTiles(); },
  level: () => { $('#btn-level').click(); syncTiles(); },
  peak: () => { $('#btn-peak').click(); syncTiles(); },
  dim: () => { $('#btn-dim').click(); syncTiles(); },
  format: () => { closeSheet('tiles'); openFmt(); },
  settings: () => { closeSheet('tiles'); $('#btn-settings').click(); }
};

function syncTiles() {
  const on = {
    timer: cfg.timer > 0, burst: cfg.burstMode, auto: cfg.auto && cfg.auto !== 'off',
    aspect: cfg.aspect !== 'full', histo: cfg.histo, zebra: cfg.zebra, grid: cfg.grid,
    level: cfg.level, peak: cfg.peak, dim: cfg.dim > 0,
    exposure: $('#tiles .ex-slot').classList.contains('open')
  };
  $$('#tiles .tile').forEach(b => {
    const act = b.dataset.act;
    b.classList.toggle('on', !!on[act]);
    if (act === 'timer') b.querySelector('em').textContent = cfg.timer ? `タイマー ${cfg.timer}秒` : 'タイマー';
    if (act === 'aspect') b.querySelector('em').textContent = cfg.aspect === 'full' ? 'アスペクト比' : `比率 ${cfg.aspect}`;
  });
}

function openSheet(id) { if (id === 'tiles') syncTiles(); show($('#' + id)); }
function closeSheet(id) { hide($('#' + id)); }
function openFmt() {
  const v = isVideoMode();
  const rows = v
    ? [{ t: '解像度', k: 'videoRes', o: [['720', 'HD'], ['1080', 'FHD'], ['2160', '4K']] },
       { t: 'フレームレート', k: 'fps', o: [['24', '24'], ['30', '30'], ['60', '60']] }]
    : [{ t: '解像度', k: 'photoRes', o: [['fhd', 'FHD'], ['4k', '4K'], ['max', '最大']] },
       { t: '形式', k: 'fmt', o: [['jpeg', 'JPEG'], ['png', 'PNG']] }];
  $('#fmt-title').textContent = v ? 'フォーマット(ビデオ)' : 'フォーマット(写真)';
  const box = $('#fmt-rows'); box.innerHTML = '';
  rows.forEach(r => {
    const row = document.createElement('div'); row.className = 'frow';
    const lab = document.createElement('div'); lab.className = 'lab'; lab.textContent = r.t;
    const opts = document.createElement('div'); opts.className = 'opts';
    r.o.forEach(([val, label]) => {
      const b = document.createElement('button');
      b.textContent = label;
      b.className = String(cfg[r.k]) === val ? 'sel' : '';
      b.onclick = () => { applyKey(r.k, r.k === 'fps' ? Number(val) : val); openFmt(); };
      opts.appendChild(b);
    });
    row.append(lab, opts); box.appendChild(row);
  });
  show($('#fmt'));
}

(() => {
  if (!IOS_UI) return;
  // 上部の表示と下部バーに並べるため、コントロール(全面の重ね層)へ移す
  const ctl = $('#controls');
  ['#btn-cap', '#zoompanel', '#chip-res', '#chip-lock'].forEach(s => ctl.appendChild($(s)));
  // 露出・ズームのスライダーはコントロールシートの下段へ
  $('#tiles .ex-slot').append(...$$('#zoompanel .slrow'));
  // 回転アイコン(iOS のフリップ風)
  const fl = $('#btn-flip .ms'); fl.className = 'ms'; fl.textContent = 'cached';
  // 「…」「解像度」「編集」
  $('#btn-cap').onclick = () => openSheet('tiles');
  $('#chip-res').onclick = () => openFmt();
  $('#tl-edit').onclick = () => { closeSheet('tiles'); $('#btn-settings').click(); };
  $$('#tiles .tile').forEach(b => b.onclick = () => { const f = TILE[b.dataset.act]; if (f) f(); });
  ['tiles', 'fmt'].forEach(id => $('#' + id).addEventListener('click', e => { if (e.target.id === id) closeSheet(id); }));
  $('#fmt-close').onclick = () => closeSheet('fmt');
  updateResChip();
})();
