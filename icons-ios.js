'use strict';
/* iOS カメラの小さなアイコン(SF Symbols に近い形で手描き。viewBox 0 0 24 24、線の太さ 1.6、丸い端)
   色は currentColor。中の文字・斜線は各アイコンに含めてある */
const ICONS = {
  flashAuto: '<path d="M13.4 2.6 5.6 13.1h5.3l-1 8.3 7.9-10.9h-5.4z" fill="currentColor" stroke="none"/><circle cx="17.7" cy="17.4" r="4.2" fill="currentColor" stroke="none"/><text x="17.7" y="19.9" font-size="6.4" font-weight="700" text-anchor="middle" fill="#000" stroke="none" font-family="-apple-system,Helvetica,Arial">A</text>',
  flashOn: '<path d="M13.4 2.6 5.6 13.1h5.3l-1 8.3 7.9-10.9h-5.4z" fill="currentColor" stroke="none"/>',
  flashOff: '<path d="M13.4 2.6 5.6 13.1h5.3l-1 8.3 7.9-10.9h-5.4z" fill="none"/><path d="M3.5 20.5 20.5 3.5"/>',
  live: '<circle cx="12" cy="12" r="9.2" stroke-dasharray="0.1 2.4" stroke-linecap="round" stroke-width="1.5"/><circle cx="12" cy="12" r="5.6"/><circle cx="12" cy="12" r="2.1" fill="currentColor" stroke="none"/>',
  liveOff: '<circle cx="12" cy="12" r="9.2" stroke-dasharray="0.1 2.4" stroke-linecap="round" stroke-width="1.5"/><circle cx="12" cy="12" r="5.6"/><circle cx="12" cy="12" r="2.1" fill="currentColor" stroke="none"/><path d="M3.5 20.5 20.5 3.5"/>',
  aspect169: '<path d="M3 8V4h4 M17 4h4v4 M21 16v4h-4 M7 20H3v-4"/><text x="12" y="14.2" font-size="7.2" font-weight="600" text-anchor="middle" fill="currentColor" stroke="none" font-family="-apple-system,Helvetica,Arial">16:9</text>',
  action: '<circle cx="14.2" cy="4.8" r="1.9" fill="currentColor" stroke="none"/><path d="M12.6 8.8 10.2 13.6 13.6 15.2 11.8 21 M12.6 9 16.4 11 18.6 9.6 M10.2 13.6 6.2 16.2"/><path d="M2.5 10.2h3.6 M2 14.4h4 M3.2 18.6h2.8"/>',
  actionOff: '<circle cx="14.2" cy="4.8" r="1.9" fill="currentColor" stroke="none"/><path d="M12.6 8.8 10.2 13.6 13.6 15.2 11.8 21 M12.6 9 16.4 11 18.6 9.6 M10.2 13.6 6.2 16.2"/><path d="M2.5 10.2h3.6 M2 14.4h4 M3.2 18.6h2.8"/><path d="M3.5 20.5 20.5 3.5"/>',
  timer: '<circle cx="12" cy="13.4" r="7.4"/><path d="M9.6 2.9h4.8 M12 2.9v2.7 M12 13.4V8.9 M12 13.4h3.4"/>',
  timerOff: '<circle cx="12" cy="13.4" r="7.4"/><path d="M9.6 2.9h4.8 M12 2.9v2.7 M12 13.4V8.9 M12 13.4h3.4"/><path d="M3.5 20.5 20.5 3.5"/>',
  exposure: '<path d="M12 3.8v5.8 M9.1 6.7h5.8 M8.8 17.8h6.4"/>',
  style: '<path d="M12 21.2V12 M12 12c-3.5 0-4.7-2.7-4.7-5.8 2.5 0 4.3 1.4 4.7 3.5.4-2.1 2.2-3.5 4.7-3.5 0 3.1-1.2 5.8-4.7 5.8z M6.8 16.6c2.7 1.5 4.3 1 5.2-.6.9 1.6 2.5 2.1 5.2.6"/>',
  depth: '<path d="M15.8 3.8c-2.7 0-3.7 1.6-3.7 4.7V20.4 M8.2 11.3h7.4"/>',
  depthOff: '<path d="M15.8 3.8c-2.7 0-3.7 1.6-3.7 4.7V20.4 M8.2 11.3h7.4"/><path d="M3.5 20.5 20.5 3.5"/>',
  night: '<path d="M18.5 14.9c-1.1 1.9-3.3 3.1-5.8 2.9-4.2-.4-7.1-4.4-6.3-8.6.5-2.6 1.9-4.3 3.6-5.1-1.2 2.5-.8 5.5 1.2 7.4 1.8 1.7 4.7 2.1 7.3 3.4z"/><circle cx="18.2" cy="5.8" r=".9" fill="currentColor" stroke="none"/><circle cx="20.2" cy="9.4" r=".9" fill="currentColor" stroke="none"/>',
  nightOff: '<path d="M18.5 14.9c-1.1 1.9-3.3 3.1-5.8 2.9-4.2-.4-7.1-4.4-6.3-8.6.5-2.6 1.9-4.3 3.6-5.1-1.2 2.5-.8 5.5 1.2 7.4 1.8 1.7 4.7 2.1 7.3 3.4z"/><path d="M3.5 20.5 20.5 3.5"/>',
  flip: '<path d="M4.2 11.2C4.8 7.4 7.9 4.8 11.8 4.8c2.6 0 4.7 1.2 6 3.2 M19.8 12.8c-.6 3.8-3.7 6.4-7.6 6.4-2.6 0-4.7-1.2-6-3.2"/><path d="M18.4 3.8 18.2 8.2 13.9 7.4 M5.6 20.2l.2-4.4 4.3.8"/>',
  more: '<circle cx="5" cy="5" r="1.7" fill="currentColor" stroke="none"/><circle cx="12" cy="5" r="1.7" fill="currentColor" stroke="none"/><circle cx="19" cy="5" r="1.7" fill="currentColor" stroke="none"/><circle cx="5" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="5" cy="19" r="1.7" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1.7" fill="currentColor" stroke="none"/><circle cx="19" cy="19" r="1.7" fill="currentColor" stroke="none"/>'
};
const svgIcon = (name, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
