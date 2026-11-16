'use strict';
/* =====================================================================
   SF Symbols 風の手描きアイコン(viewBox 0 0 24 24、線の太さ 1.5、丸い端、currentColor)
   ・既存の Material Symbols の名前(ligature / i-クラス)は、起動時に自動でこの図形に差し替える
   ・比率・形は参照の iPhone / iPad のスクリーンショットに重ねて調整した
   ===================================================================== */
const ICONS = {
  flashAuto: '<path d="M12.7 2.8 6.9 12.4h4.6l-1 8.8 6.2-10.1h-4.5z" fill="currentColor" stroke="none"/><circle cx="17.6" cy="17.6" r="3.9" fill="currentColor" stroke="none"/><text x="17.6" y="19.9" font-size="5.8" font-weight="700" text-anchor="middle" fill="#000" stroke="none" font-family="-apple-system,Helvetica,Arial">A</text>',
  flashOn: '<path d="M12.7 2.8 6.9 12.4h4.6l-1 8.8 6.2-10.1h-4.5z" fill="currentColor" stroke="none"/>',
  flashOff: '<path d="M12.7 2.8 6.9 12.4h4.6l-1 8.8 6.2-10.1h-4.5z"/><path d="M3.5 20.5 20.5 3.5"/>',
  aspect169: '<path d="M3 8V4.8A1.6 1.6 0 0 1 4.6 3.2H7 M17 3.2h2.4A1.6 1.6 0 0 1 21 4.8V8 M21 16v3.2a1.6 1.6 0 0 1-1.6 1.6H17 M7 20.8H4.6A1.6 1.6 0 0 1 3 19.2V16"/><text x="12" y="14.2" font-size="6.6" font-weight="600" text-anchor="middle" fill="currentColor" stroke="none" font-family="-apple-system,Helvetica,Arial">16:9</text>',
  action: '<circle cx="14.2" cy="4.8" r="1.9" fill="currentColor" stroke="none"/><path d="M12.6 8.8 10.2 13.6 13.6 15.2 11.8 21 M12.6 9 16.4 11 18.6 9.6 M10.2 13.6 6.2 16.2"/><path d="M2.5 10.2h3.6 M2 14.4h4 M3.2 18.6h2.8"/>',
  actionOff: '<circle cx="14.2" cy="4.8" r="1.9" fill="currentColor" stroke="none"/><path d="M12.6 8.8 10.2 13.6 13.6 15.2 11.8 21 M12.6 9 16.4 11 18.6 9.6 M10.2 13.6 6.2 16.2"/><path d="M2.5 10.2h3.6 M2 14.4h4 M3.2 18.6h2.8"/><path d="M3.5 20.5 20.5 3.5"/>',
  timer: '<circle cx="12" cy="13.6" r="7.6"/><path d="M9.8 3.2h4.4 M12 3.2v2.6 M12 13.6V8.8 M12 13.6h3.4"/>',
  timerOff: '<circle cx="12" cy="13.6" r="7.6"/><path d="M9.8 3.2h4.4 M12 3.2v2.6 M12 13.6V8.8 M12 13.6h3.4"/><path d="M3.5 20.5 20.5 3.5"/>',
  exposure: '<path d="M12 4v5.6 M9.2 6.8h5.6 M8.6 17.8h6.8"/>',
  style: '<circle cx="12" cy="12" r="2.9"/><circle cx="4.5" cy="4.5" r="1.1" fill="currentColor" stroke="none"/><circle cx="8" cy="4.5" r="1.0" fill="currentColor" stroke="none"/><circle cx="12" cy="4.5" r="1.25" fill="currentColor" stroke="none"/><circle cx="16" cy="4.5" r="1.0" fill="currentColor" stroke="none"/><circle cx="19.5" cy="4.5" r="1.1" fill="currentColor" stroke="none"/><circle cx="4.5" cy="8" r="1.0" fill="currentColor" stroke="none"/><circle cx="8" cy="8" r="1.4" fill="currentColor" stroke="none"/><circle cx="16" cy="8" r="1.4" fill="currentColor" stroke="none"/><circle cx="19.5" cy="8" r="1.0" fill="currentColor" stroke="none"/><circle cx="4.5" cy="12" r="1.25" fill="currentColor" stroke="none"/><circle cx="19.5" cy="12" r="1.25" fill="currentColor" stroke="none"/><circle cx="4.5" cy="16" r="1.0" fill="currentColor" stroke="none"/><circle cx="8" cy="16" r="1.4" fill="currentColor" stroke="none"/><circle cx="16" cy="16" r="1.4" fill="currentColor" stroke="none"/><circle cx="19.5" cy="16" r="1.0" fill="currentColor" stroke="none"/><circle cx="4.5" cy="19.5" r="1.1" fill="currentColor" stroke="none"/><circle cx="8" cy="19.5" r="1.0" fill="currentColor" stroke="none"/><circle cx="12" cy="19.5" r="1.25" fill="currentColor" stroke="none"/><circle cx="16" cy="19.5" r="1.0" fill="currentColor" stroke="none"/><circle cx="19.5" cy="19.5" r="1.1" fill="currentColor" stroke="none"/>',
  depth: '<path d="M15.8 3.6c-2.7 0-3.7 1.7-3.7 4.8v11.8 M8.2 11.4h7.4"/>',
  depthOff: '<path d="M15.8 3.6c-2.7 0-3.7 1.7-3.7 4.8v11.8 M8.2 11.4h7.4"/><path d="M3.5 20.5 20.5 3.5"/>',
  night: '<path d="M18.5 14.9c-1.1 1.9-3.3 3.1-5.8 2.9-4.2-.4-7.1-4.4-6.3-8.6.5-2.6 1.9-4.3 3.6-5.1-1.2 2.5-.8 5.5 1.2 7.4 1.8 1.7 4.7 2.1 7.3 3.4z"/><circle cx="18.2" cy="5.8" r=".9" fill="currentColor" stroke="none"/><circle cx="20.2" cy="9.4" r=".9" fill="currentColor" stroke="none"/>',
  nightOff: '<path d="M18.5 14.9c-1.1 1.9-3.3 3.1-5.8 2.9-4.2-.4-7.1-4.4-6.3-8.6.5-2.6 1.9-4.3 3.6-5.1-1.2 2.5-.8 5.5 1.2 7.4 1.8 1.7 4.7 2.1 7.3 3.4z"/><path d="M3.5 20.5 20.5 3.5"/>',
  cameraFlip: '<path d="M4.2 11.2C4.8 7.4 7.9 4.8 11.8 4.8c2.6 0 4.7 1.2 6 3.2 M19.8 12.8c-.6 3.8-3.7 6.4-7.6 6.4-2.6 0-4.7-1.2-6-3.2"/><path d="M18.4 3.8 18.2 8.2 13.9 7.4 M5.6 20.2l.2-4.4 4.3.8"/>',
  more: '<circle cx="5" cy="5" r="1.7" fill="currentColor" stroke="none"/><circle cx="12" cy="5" r="1.7" fill="currentColor" stroke="none"/><circle cx="19" cy="5" r="1.7" fill="currentColor" stroke="none"/><circle cx="5" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="5" cy="19" r="1.7" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1.7" fill="currentColor" stroke="none"/><circle cx="19" cy="19" r="1.7" fill="currentColor" stroke="none"/>',
  histo: '<path d="M4.5 20V14 M9.5 20V8 M14.5 20V11 M19.5 20V4.5"/>',
  dial: '<circle cx="12" cy="12" r="8.6"/><path d="M12 12 15.6 8.4 M12 4.2v1.6 M4.2 12h1.6 M18.2 12h1.6 M12 18.2v1.6"/>',
  circles: '<circle cx="9.5" cy="9.5" r="5.5"/><circle cx="14.5" cy="9.5" r="5.5"/><circle cx="12" cy="14.2" r="5.5"/>',
  crop: '<path d="M7 2.5V17h14.5 M2.5 7H17v14.5"/>',
  wand: '<path d="M4 20 13.2 10.8"/><path d="M17.2 2.8 18 5.2 20.4 6 18 6.8 17.2 9.2 16.4 6.8 14 6 16.4 5.2 Z" fill="currentColor" stroke="none"/><path d="M19.6 13.2l.5 1.4 1.4.5-1.4.5-.5 1.4-.5-1.4-1.4-.5 1.4-.5z" fill="currentColor" stroke="none"/>',
  slider: '<path d="M3 7h18 M3 12h18 M3 17h18"/><circle cx="8.5" cy="7" r="2.3" fill="#1c1c1e"/><circle cx="16" cy="12" r="2.3" fill="#1c1c1e"/><circle cx="10" cy="17" r="2.3" fill="#1c1c1e"/>',
  grid: '<rect x="3.5" y="3.5" width="17" height="17" rx="2.5"/><path d="M9.2 3.5v17 M14.8 3.5v17 M3.5 9.2h17 M3.5 14.8h17"/>',
  zebra: '<rect x="3.5" y="3.5" width="17" height="17" rx="2.5"/><path d="M3.5 9.2 9.2 3.5 M3.5 14.8 14.8 3.5 M3.5 20.5 20.5 3.5 M9.2 20.5 20.5 9.2 M14.8 20.5 20.5 14.8"/>',
  level: '<path d="M3 12h4 M17 12h4"/><circle cx="12" cy="12" r="4.6"/><path d="M12 9.6v4.8"/>',
  peak: '<path d="M4 8.8V4.5h4.6 M15.4 4.5h4.6v4.3 M20 15.2v4.3h-4.6 M8.6 19.5H4v-4.3"/><circle cx="12" cy="12" r="3.4"/>',
  dim: '<circle cx="12" cy="12" r="8.2"/><path d="M12 3.8C16.5 3.8 20.2 7.5 20.2 12S16.5 20.2 12 20.2Z" fill="currentColor" stroke="none"/>',
  autocap: '<circle cx="12" cy="12" r="8.2"/><path d="M12 7.4V12l3 2"/>',
  burst: '<rect x="8" y="3.5" width="12" height="12" rx="2.4"/><path d="M4 8.5V16.8C4 19.4 5.6 20.6 6.6 20.6H15.2"/>',
  rotate: '<path d="M19.2 9.2V5.2h-4"/><path d="M19.4 5.4C17.6 3.4 15 2.9 12.4 3.8 7.6 5.5 4.6 10 4.6 12 4.6 16.9 8.6 20.2 12 20.2 15.8 20.2 19.4 17.4 20.4 13.4"/>',
  flipH: '<path d="M12 3v18" stroke-dasharray="2 2.2"/><path d="M10 6.5 3.5 18.5H10z"/><path d="M14 6.5l6.5 12H14z"/>',
  xmark: '<path d="M6.2 6.2l11.6 11.6 M17.8 6.2 6.2 17.8"/>',
  checkmark: '<path d="M5.2 12.6l4.4 4.4L19 7.2"/>',
  undo: '<path d="M9.2 13.6 4.8 9.2l4.4-4.4 M4.8 9.2h9.2c4 0 6.2 2.7 6.2 6.6"/>',
  redo: '<path d="M14.8 13.6l4.4-4.4-4.4-4.4 M19.2 9.2H10c-4 0-6.2 2.7-6.2 6.6"/>',
  counterclockwise: '<path d="M4.6 4.2V8.8H9.2"/><path d="M5 8.8C6.2 5.6 8.9 4.2 12 4.2 16.4 4.2 19.8 7.8 19.8 12 19.8 16.2 16.4 19.8 12 19.8 8.4 19.8 5.5 17.4 4.6 14"/>',
  gear: '<circle cx="12" cy="12" r="3.2"/><circle cx="12" cy="12" r="7.6" stroke-dasharray="2.4 2.2" stroke-width="3.2"/>',
  settingsGear: '<circle cx="12" cy="12" r="3.2"/><circle cx="12" cy="12" r="7.6" stroke-dasharray="2.4 2.2" stroke-width="3.2"/>',
  scan: '<path d="M3.5 8V5.5A2 2 0 0 1 5.5 3.5H8 M16 3.5h2.5a2 2 0 0 1 2 2V8 M20.5 16v2.5a2 2 0 0 1-2 2H16 M8 20.5H5.5a2 2 0 0 1-2-2V16"/><path d="M7.5 12h9"/>',
  photo: '<rect x="3.5" y="5" width="17" height="14" rx="3"/><path d="M4.5 16.5 9.5 11.5 13.5 15.5 16 13 19.5 16.5"/><circle cx="16" cy="9" r="1.4" fill="currentColor" stroke="none"/>'
};
const svgIcon = (name, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;

/* Material Symbols の名前 → SF 風の図形 */
const SF_LIG = {
  close: 'xmark', check: 'checkmark', undo: 'undo', redo: 'redo', settings_backup_restore: 'counterclockwise',
  restart_alt: 'counterclockwise', settings: 'gear', build: 'slider', tune: 'dial', filter_vintage: 'circles',
  crop: 'crop', auto_fix_high: 'wand', grid_on: 'grid', texture: 'zebra', straighten: 'level',
  center_focus_strong: 'peak', brightness_6: 'dim', bar_chart: 'histo', motion_photos_auto: 'autocap',
  burst_mode: 'burst', rotate_90_degrees_ccw: 'rotate', aspect_ratio: 'aspect169', timer: 'timer', exposure: 'exposure',
  more_horiz: 'more', flip: 'flipH', flip_camera_ios: 'cameraFlip', cached: 'cameraFlip', photo: 'photo', document_scanner: 'scan', open_in_full: 'crop', compare: 'circles'
};
const SF_CLS = {
  'i-tune': 'dial', 'i-undo': 'undo', 'i-check': 'checkmark', 'i-close': 'xmark', 'i-straighten': 'level',
  'i-timer-off': 'timerOff', 'i-exposure': 'exposure', 'i-grid-on': 'grid', 'i-center-focus-strong': 'peak',
  'i-burst-mode': 'burst', 'i-auto-fix-high': 'wand', 'i-brightness-6': 'dim', 'i-crop-free': 'crop',
  'i-restart-alt': 'counterclockwise', 'i-flip-camera-ios': 'cameraFlip', 'i-more-horiz': 'more', 'i-rotate-right': 'rotate'
};
function sfKeyFor(el) {
  const t = (el.textContent || '').trim();
  if (t && SF_LIG[t]) return SF_LIG[t];
  for (const c of el.classList) if (SF_CLS[c]) return SF_CLS[c];
  return null;
}
// .ms の中身を SF 風の SVG に差し替える(動的に作られた要素にも効くよう、変化を監視する)
function sfApply(root) {
  if (!root || !root.querySelectorAll) return;
  root.querySelectorAll('.ms').forEach(el => {
    if (el.dataset.sf) return;
    const key = sfKeyFor(el);
    if (!key || !ICONS[key]) return;
    el.dataset.sf = key;
    el.innerHTML = svgIcon(key);
  });
}
if (typeof document !== 'undefined') {
  const boot = () => { sfApply(document); new MutationObserver(() => sfApply(document)).observe(document.body, { childList: true, subtree: true }); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
}
