// 写真編集の純粋関数のテスト(DOMなし)。実行: node tests/photoedit_pure_test.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'photoedit.js'), 'utf8');
const pure = src.slice(src.indexOf('/* ---PURE-START---'), src.indexOf('/* ---PURE-END---'));
const ctx = {}; vm.createContext(ctx); vm.runInContext(pure + '\n;this.exp={PE_PRESETS,PE_ADJ,PE_TOOLS,peApplyPixels,aspectCrop,cropDrag,fitScale,peDefault,peGet,peSet,PE_ANGLE};', ctx);
const { peApplyPixels, aspectCrop, cropDrag, fitScale, peDefault, peGet, peSet, PE_ANGLE } = ctx.exp;
let fails = 0;
const ok = (name, cond, extra = '') => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : ' ' + extra)); if (!cond) fails++; };
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;
const px = (...v) => Uint8ClampedArray.from(v);
const base = () => ({ ...peDefault() });

// 1) 露出 +1EV で明るさが約2倍(クランプ前の範囲)
{ const d = px(60, 60, 60, 255); peApplyPixels(d, 1, 1, { ...base(), adj: { exposure: 1 } }); ok('exposure +1EV doubles', Math.abs(d[0] - 120) <= 1, d[0]); }
// 2) 彩度0(モノクロ)で R=G=B
{ const d = px(200, 80, 40, 255); peApplyPixels(d, 1, 1, { ...base(), filter: 'mono' }); ok('mono -> r=g=b', d[0] === d[1] && d[1] === d[2], Array.from(d)); }
// 3) 補正なし(オリジナル)は画素を変えない
{ const d = px(10, 120, 240, 255); peApplyPixels(d, 1, 1, base()); ok('original is identity', d[0] === 10 && d[1] === 120 && d[2] === 240, Array.from(d)); }
// 4) 自動: 狭い範囲の画像を広げる
{ const d = px(100, 100, 100, 255, 110, 110, 110, 255, 120, 120, 120, 255, 130, 130, 130, 255); peApplyPixels(d, 4, 1, { ...base(), auto: true }); ok('auto stretches range', d[0] < 100 && d[12] > 130, [d[0], d[12]]); }
// 5) 透明度(alpha)は変えない
{ const d = px(90, 90, 90, 77); peApplyPixels(d, 1, 1, { ...base(), adj: { contrast: 40 } }); ok('alpha preserved', d[3] === 77); }
// 6) ビネット: 中心は明るく、四隅は暗い
{ const w = 9, h = 9, d = new Uint8ClampedArray(w * h * 4); for (let i = 0; i < w * h; i++) { d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = 200; d[i * 4 + 3] = 255; }
  peApplyPixels(d, w, h, { ...base(), tools: { vignette: 100 } }); const c = (4 * w + 4) * 4, corner = 0; ok('vignette darkens corners', d[corner] < d[c] - 20, [d[corner], d[c]]); }
// 7) 比率 1:1 の切り取り(横長 4:3 の画像内)
{ const r = aspectCrop('1:1', 4 / 3); ok('1:1 crop width 3/4 height 1', near(r.w, 0.75) && near(r.h, 1) && near(r.x, 0.125), JSON.stringify(r)); }
// 8) 比率 自由 は全体
{ const r = aspectCrop('free', 1.5); ok('free crop is full', r.x === 0 && r.y === 0 && r.w === 1 && r.h === 1); }
// 9) 縦向きの 16:9 は縦長の枠
{ const r = aspectCrop('16:9', 0.75); ok('portrait 16:9 is tall', r.h > r.w && near(r.w / r.h * 0.75, 9 / 16, 1e-6), JSON.stringify(r)); }
// 10) 切り取り枠の移動は画像の外に出ない
{ const r = cropDrag({ x: 0.5, y: 0.5, w: 0.4, h: 0.4 }, 'move', 1, 1); ok('move clamped inside', near(r.x, 0.6) && near(r.y, 0.6), JSON.stringify(r)); }
// 11) 右辺を内側へ: 最小幅を下回らない
{ const r = cropDrag({ x: 0, y: 0, w: 1, h: 1 }, 'e', -2, 0); ok('min width enforced', r.w >= 0.08 - 1e-9 && r.w < 0.2, JSON.stringify(r)); }
// 12) 左辺を外へ: 画像の左端で止まる
{ const r = cropDrag({ x: 0.2, y: 0, w: 0.5, h: 1 }, 'w', -5, 0); ok('left edge clamped', near(r.x, 0) && near(r.x + r.w, 0.7), JSON.stringify(r)); }
// 13) 傾き 0 は拡大なし、45度は √2 倍(正方形)
ok('fit scale 0deg = 1', fitScale(0, 100, 100) === 1);
ok('fit scale 45deg square ~ sqrt2', near(fitScale(45, 100, 100), Math.SQRT2, 1e-9), fitScale(45, 100, 100));
// 14) 傾きの値は p.angle に入る
{ const p = base(); peSet(PE_ANGLE, p, 12.5); ok('angle set/get', peGet(PE_ANGLE, p) === 12.5 && p.angle === 12.5); }
// 15) 既定の切り取りは全体
ok('default crop is full', JSON.stringify(peDefault().crop) === JSON.stringify({ x: 0, y: 0, w: 1, h: 1 }));
console.log(fails ? `\n${fails} FAILED` : '\nALL PASS');
process.exit(fails ? 1 : 0);
