const fs = require('fs');
const src = fs.readFileSync(__dirname + '/../app.js', 'utf8');
// 書き換えた「シャッター押下判定」IIFE本体を抜き出して実行
const start = src.indexOf("(() => {\n  const sh = $('#shutter');");
const end = src.indexOf("$('#btn-snap').onclick", start);
const iife = src.slice(start, end);
const trigSrc = src.slice(src.indexOf('function triggerShutter('), src.indexOf('// モード切替などで撮影の予約'));
const cancelSrc = src.slice(src.indexOf('function cancelPendingCapture()'), src.indexOf('/* ---------- シャッターボタン'));

function makeEl() {
  const h = {};
  return { h, rect: { left: 100, right: 200, top: 500, bottom: 600 },
    addEventListener(t, f) { (h[t] = h[t] || []).push(f); },
    fire(t, ev) { (h[t] || []).forEach(f => f(ev)); },
    getBoundingClientRect() { return this.rect; }, setPointerCapture() {} };
}
function run(scenario) {
  const log = [];
  const sh = makeEl();
  const ctx = {
    $: () => sh, sh,
    cfg: { mode: 'photo', burstMode: false, auto: 'off', dtap: false },
    camBusy: 0, burstRunning: false, recording: false, AS: { on: false },
    isVideoMode() { return ctx.cfg.mode === 'video'; },
    toast() {}, cancelCountdown() {}, autoStop() {},
    burstLoop() { log.push('burst'); },
    shootWithTimer() { log.push('shoot'); }, toggleRecord() { log.push('record'); },
    SHUTTER_DEBUG: false, autoToggle() {},
    performance: { now: () => ctx._now }, _now: 0,
    Math, clearTimeout, setTimeout: (f, ms) => { ctx._timers.push([f, ms]); return ctx._timers.length; },
    _timers: [], console, document: {}, location: { search: '' },
  };
  const code = `${trigSrc}\n${cancelSrc}\n${iife}\n;__sh = sh;`;
  const vm = require('vm');
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  const s = ctx.__sh;
  scenario(s, ctx, log);
  return log;
}
const ev = (x, y, id = 1, button = 0) => ({ pointerId: id, clientX: x, clientY: y, button, preventDefault() {} });
const results = [];
const check = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); results.push(ok); console.log((ok ? 'PASS ' : 'FAIL ') + name + ' -> ' + JSON.stringify(got) + (ok ? '' : ' (want ' + JSON.stringify(want) + ')')); };

// 1) 普通のタップ(シャッター内で押して離す) → 1回だけ撮影
check('tap inside -> shoot once', run((s, c, log) => { c._now = 0; s.fire('pointerdown', ev(150, 550)); c._now = 120; s.fire('pointerup', ev(151, 551)); }), ['shoot']);
// 2) シャッターから指を滑らせてモードボタン側で離す → 撮らない(誤発火の典型)
check('press then slide off & release outside -> no shot', run((s, c, log) => { c._now = 0; s.fire('pointerdown', ev(150, 550)); c._now = 150; s.fire('pointerup', ev(150, 420)); }), []);
// 3) 押したまま大きく動かして離す → 撮らない
check('moved >12px before release -> no shot', run((s, c, log) => { c._now = 0; s.fire('pointerdown', ev(150, 550)); s.fire('pointermove', ev(150, 580)); c._now = 100; s.fire('pointerup', ev(150, 580)); }), []);
// 4) 長押し → 連写。離すと止まり、撮影(shoot)は追加されない
check('long press -> burst, release does not shoot', run((s, c, log) => { c._now = 0; s.fire('pointerdown', ev(150, 550)); c._timers.forEach(([f]) => f()); c._now = 900; c.burstRunning = true; s.fire('pointerup', ev(150, 550)); log.push('burstRunning=' + c.burstRunning); }), ['burst', 'burstRunning=false']);
// 5) 取り残された押下状態(pointerupが来なかった)があっても、次の押下で反応する
check('stale press recovered after 2s', run((s, c, log) => { c._now = 0; s.fire('pointerdown', ev(150, 550)); c._now = 5000; s.fire('pointerdown', ev(150, 550, 2)); c._now = 5100; s.fire('pointerup', ev(150, 550, 2)); }), ['shoot']);
// 6) カメラ切替中(camBusy>0)は、タップしても撮らない
check('camBusy -> ignored', run((s, c, log) => { c.camBusy = 1; c._now = 0; s.fire('pointerdown', ev(150, 550)); c._now = 100; s.fire('pointerup', ev(150, 550)); }), []);
// 7) 2本目の指はシャッターを壊さない(1本目の離しで1回だけ)
check('second finger ignored', run((s, c, log) => { c._now = 0; s.fire('pointerdown', ev(150, 550, 1)); s.fire('pointerdown', ev(160, 560, 2)); c._now = 100; s.fire('pointerup', ev(160, 560, 2)); c._now = 110; s.fire('pointerup', ev(150, 550, 1)); }), ['shoot']);
// 8) ビデオモードでは離すと録画の開始/停止
check('video mode tap -> record toggle', run((s, c, log) => { c.cfg.mode = 'video'; c._now = 0; s.fire('pointerdown', ev(150, 550)); c._now = 100; s.fire('pointerup', ev(150, 550)); }), ['record']);
// 9) 押下が外へ出たままpointercancelされても、次の正しいタップは効く
check('pointercancel then normal tap', run((s, c, log) => { c._now = 0; s.fire('pointerdown', ev(150, 550)); s.fire('pointercancel', ev(150, 550)); c._now = 300; s.fire('pointerdown', ev(150, 550)); c._now = 400; s.fire('pointerup', ev(150, 550)); }), ['shoot']);
console.log(results.every(Boolean) ? '\nALL PASS (' + results.length + ')' : '\nSOME FAILED');
