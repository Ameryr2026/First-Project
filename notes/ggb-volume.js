/*
 * ggb-volume.js — volumes of revolution, with the inputs on our page and GeoGebra 3D only as the picture.
 *
 * The region between y = g(x) and y = f(x), a ≤ x ≤ b, is turned about an axis:
 *   - a horizontal line y = c: the pieces are discs or washers (cuts across the axis)
 *         V ≈ Σ π (R_k² − r_k²) Δx,          V = π ∫_a^b (R(x)² − r(x)²) dx
 *   - a vertical line x = c: the pieces are cylindrical shells (cuts along the axis)
 *         V ≈ Σ 2π |m_k − c| (f − g)(m_k) Δx,  V = 2π ∫_a^b |x − c| (f(x) − g(x)) dx
 * where m_k are the midpoints and R, r the distances from the axis to the farther and nearer curve.
 * The reader turns the region with the angle slider (or ▶); the solid and the pieces turn together, and
 * the flat faces where they are cut show the cross-sections. The axis is drawn as a dashed line.
 *
 * Write, anywhere in the page:
 *   <div class="ggb-volume" data-f="x" data-a="0" data-b="3"></div>                         discs about the x-axis
 *   <div class="ggb-volume" data-f="x + 1" data-g="sin(x)" data-axis="horizontal" data-c="-1"
 *        data-a="1" data-b="3.8"></div>                                                      washers about y = −1
 *   <div class="ggb-volume" data-f="2x - x^2" data-axis="vertical" data-c="0"
 *        data-a="0" data-b="2"></div>                                                        shells about the y-axis
 *
 * Settings on the tag (all optional):
 *   data-f, data-g   the upper and lower curves, GeoGebra's English syntax (g defaults to 0)
 *   data-a, data-b   the interval;   data-n   the number of pieces (default 6)
 *   data-axis        horizontal (default) or vertical;   data-c   the axis is y = c or x = c (default 0)
 *   data-method      shells is the same as data-axis="vertical" (kept for older pages)
 *   data-angle       starting angle in degrees (default 270, so the cut is visible)
 *   data-nmax        the largest n on the slider (default 20, at most 200; each piece is several 3D surfaces)
 *   data-color-outer, data-color-inner, data-color-ends, data-color-cuts   colours of the parts of the solid:
 *                    the surface made by f, the one made by g, the end faces at a and b, the cut faces
 *   data-color-surface   one colour for all four parts at once (used when the four above are not given)
 *   data-color-curve, data-color-axis   colours as #rrggbb
 *   data-lang        ar for Arabic labels (default: the page's language)
 *   data-height      height of the picture in pixels (default 480)
 *
 * This file follows the same plan as ggb-riemann.js; docs/geogebra-widgets.md explains it step by step.
 */
(function () {
  'use strict';

  var SCRIPT = 'https://www.geogebra.org/apps/deployggb.js';

  // ---- 1. The words on the widget, in each language ----
  var TEXT = {
    en: { f: 'Upper curve f(x) =', g: 'Lower curve g(x) =', a: 'From a =', b: 'to b =',
          n: 'Pieces n = ', angle: 'Turn the region: ', axis: 'Axis of revolution',
          axisH: 'Horizontal line y = c  (discs and washers)', axisV: 'Vertical line x = c  (shells)', c: 'c =',
          play: '▶', stop: '■', playN: 'Play: add pieces one at a time', playT: 'Turn the region',
          outer: 'Surface made by f', inner: 'Surface made by g', ends: 'End faces', cuts: 'Cut faces',
          surface: 'Solid', piecesH: 'Discs / washers', piecesV: 'Shells', curve: 'Curves', axisLine: 'Axis',
          approxH: 'Sum of the discs/washers', approxV: 'Sum of the shells',
          exactH: 'Volume π∫(R² − r²)', exactV: 'Volume 2π∫|x − c|(f − g)', gap: 'Difference', fit: 'Fit view',
          bad: 'GeoGebra could not read this function.', order: 'a must be less than b.',
          cross: 'For shells, the axis x = c must not cut through the region: take c ≤ a or c ≥ b.',
          loading: 'Loading GeoGebra 3D…',
          failed: 'GeoGebra could not be loaded. Check the connection and reload the page.',
          help: 'Write the functions in English: sqrt(x), x^2, sin(x) + 1, 2x - x^2. Drag the picture to turn it.',
          settings: 'Settings', nmax: 'Largest n on the slider', show: 'Show',
          surfaces: 'Surfaces', lines: 'Lines', colorW: 'Color', opacity: 'Opacity', thick: 'Thickness', style: 'Style',
          styles: ['Solid', 'Long dashes', 'Short dashes', 'Dotted', 'Dash-dot'] },
    ar: { f: 'المنحنى العلوي f(x) =', g: 'المنحنى السفلي g(x) =', a: 'من أ =', b: 'إلى ب =',
          n: 'عدد القطع ن = ', angle: 'دوّر المنطقة: ', axis: 'محور الدوران',
          axisH: 'مستقيم أفقي y = c  (أقراص وحلقات)', axisV: 'مستقيم رأسي x = c  (قشرات أسطوانية)', c: 'c =',
          play: '▶', stop: '■', playN: 'تشغيل: أضف القطع واحدة بعد الأخرى', playT: 'دوّر المنطقة',
          outer: 'سطح المنحنى الأعلى', inner: 'سطح المنحنى الأسفل', ends: 'الوجهان الطرفيان', cuts: 'وجها القطع',
          surface: 'المجسّم', piecesH: 'الأقراص والحلقات', piecesV: 'القشرات', curve: 'المنحنيان', axisLine: 'المحور',
          approxH: 'مجموع الأقراص والحلقات', approxV: 'مجموع القشرات',
          exactH: 'الحجم <bdi dir="ltr">π∫(R² − r²)</bdi>', exactV: 'الحجم <bdi dir="ltr">2π∫|x − c|(f − g)</bdi>', gap: 'الفرق', fit: 'ملاءمة الرسم',
          bad: 'لم يفهم جيوجبرا هذا الاقتران.', order: 'يجب أن يكون أ أصغر من ب.',
          cross: 'في طريقة القشرات يجب ألا يقطع المحور x = c المنطقة: اختر c ≤ أ أو c ≥ ب.',
          loading: 'جارٍ تحميل جيوجبرا ثلاثي الأبعاد…',
          failed: 'تعذّر تحميل جيوجبرا. تحقّق من الاتصال وأعد تحميل الصفحة.',
          help: 'اكتب الاقترانات بالإنجليزية: sqrt(x)، x^2، sin(x) + 1، 2x - x^2. اسحب الرسم لتدويره.',
          settings: 'الإعدادات', nmax: 'أكبر قيمة لـ ن على المؤشر', show: 'اعرض',
          surfaces: 'الأسطح', lines: 'الخطوط', colorW: 'اللون', opacity: 'التعتيم', thick: 'السُّمك', style: 'النمط',
          styles: ['متصل', 'متقطع طويل', 'متقطع قصير', 'منقّط', 'شرطة ونقطة'] }
  };

  // ---- 2. Colours ----
  // Each part of the solid has its own colour: outer = f turned, inner = g turned, ends = the faces at
  // x = a and x = b, cuts = the flat faces where the solid is cut (at angle 0 and t).
  var DEFAULT_COLOR = { outer: '#2563eb', inner: '#16a34a', ends: '#9333ea', cuts: '#ea580c',
                        pieces: '#ea580c', prof: '#1f2328', axis: '#b91c1c' };
  var COLOR_ATTR = { outer: 'data-color-outer', inner: 'data-color-inner', ends: 'data-color-ends',
                     cuts: 'data-color-cuts', pieces: 'data-color-discs', prof: 'data-color-curve',
                     axis: 'data-color-axis' };
  var PART = { S1: 'outer', S2: 'inner', S3: 'ends', S4: 'ends', S5: 'cuts', S6: 'cuts' };
  // Opacity of each part of the solid (0 = invisible, 1 = solid), and the thickness (1 to 13) and style of
  // each line. GeoGebra's line styles: 0 solid, 1 long dashes, 2 short dashes, 3 dotted, 4 dash-dot.
  var DEFAULT_OPACITY = { outer: 0.4, inner: 0.4, ends: 0.4, cuts: 0.7 };
  var DEFAULT_LINE = { prof: { thick: 7, style: 0 }, axis: { thick: 6, style: 1 } };
  var LINE_STYLES = [0, 1, 2, 3, 4];
  function rgb(hex) {
    var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || '');
    return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null;
  }

  // ---- 3. The GeoGebra commands ----
  // rot(axis, X, Y, angle) is the point (X, Y) of the plane z = 0, turned by `angle` about the axis,
  // written as the three coordinates GeoGebra expects. Every surface below is built from it, so the same
  // commands serve both axes.
  //   horizontal axis y = c:  (X, Y) → (X, c + (Y − c) cos θ, (Y − c) sin θ)
  //   vertical axis   x = c:  (X, Y) → (c + (X − c) cos θ, Y, (X − c) sin θ)
  function rot(axis, X, Y, ang) {
    return axis === 'vertical'
      ? 'c + ((' + X + ') - c) cos(' + ang + '), ' + Y + ', ((' + X + ') - c) sin(' + ang + ')'
      : X + ', c + ((' + Y + ') - c) cos(' + ang + '), ((' + Y + ') - c) sin(' + ang + ')';
  }

  // The exact solid (S…) and the n pieces (A…). Names ending in "cut" are the flat faces at angle 0 and t.
  // In GeoGebra: xk(j) is the j-th division point, mk(j) the midpoint of the j-th piece.
  function commands(axis) {
    var R = function (X, Y, ang) { return rot(axis, X, Y, ang); };
    var mid = 'g(u) + s (f(u) - g(u))';                     // a point of the region above x = u
    var F = 'f(mk(k))', G = 'g(mk(k))', X0 = 'xk(k - 1)', X1 = 'xk(k)';
    var rect = function (ang) {                              // the k-th rectangle, turned by ang
      return 'Polygon((' + R(X0, G, ang) + '), (' + R(X1, G, ang) + '), (' + R(X1, F, ang) + '), (' + R(X0, F, ang) + '))';
    };
    return {
      solid: [
        ['S1', 'Surface(' + R('u', 'f(u)', 'v') + ', u, a, b, v, 0, t)'],                              // f turned
        ['S2', 'Surface(' + R('u', 'g(u)', 'v') + ', u, a, b, v, 0, t)'],                              // g turned
        ['S3', 'Surface(' + R('a', 'g(a) + s (f(a) - g(a))', 'v') + ', s, 0, 1, v, 0, t)'],            // end at x = a
        ['S4', 'Surface(' + R('b', 'g(b) + s (f(b) - g(b))', 'v') + ', s, 0, 1, v, 0, t)'],            // end at x = b
        ['S5', 'Surface(' + R('u', mid, '0') + ', u, a, b, s, 0, 1)', 'cut'],                          // region at 0
        ['S6', 'Surface(' + R('u', mid, 't') + ', u, a, b, s, 0, 1)', 'cut']                           // region at t
      ],
      pieces: [
        // The pieces (discs, washers, shells) are turned off: these lines are not sent to GeoGebra.
        /*['A1', 'Sequence(Surface(' + R('u', F, 'v') + ', u, ' + X0 + ', ' + X1 + ', v, 0, t), k, 1, n)'],
        ['A2', 'Sequence(Surface(' + R('u', G, 'v') + ', u, ' + X0 + ', ' + X1 + ', v, 0, t), k, 1, n)'],
        ['A3', 'Sequence(Surface(' + R(X0, G + ' + s (' + F + ' - ' + G + ')', 'v') + ', s, 0, 1, v, 0, t), k, 1, n)'],
        ['A4', 'Sequence(Surface(' + R(X1, G + ' + s (' + F + ' - ' + G + ')', 'v') + ', s, 0, 1, v, 0, t), k, 1, n)'],
        ['A5', 'Sequence(' + rect('0') + ', k, 1, n)', 'cut'],
        ['A6', 'Sequence(' + rect('t') + ', k, 1, n)', 'cut']*/
      ],
      axisLine: axis === 'vertical' ? 'AX = Line((c, 0, 0), (c, 1, 0))' : 'AX = Line((0, c, 0), (1, c, 0))',
      // Volumes. About y = c a cross-section is a washer with radii |f − c| and |g − c|, or a full disc
      // when the axis lies between the curves. About x = c the shells have radius |x − c|.
      exact: axis === 'vertical'
        ? 'V = 2 pi NIntegral(abs(x - c) abs(f(x) - g(x)), a, b)'
        : 'V = pi NIntegral(If((f(x) - c) (g(x) - c) >= 0, abs((f(x) - c)^2 - (g(x) - c)^2), ' +
          'Max((f(x) - c)^2, (g(x) - c)^2)), a, b)',
      // The sum of the pieces is turned off with them.
      /*approx: axis === 'vertical'
        ? 'D = 2 pi (b - a) / n Sum(Sequence(abs(mk(k) - c) abs(' + F + ' - ' + G + '), k, 1, n))'
        : 'D = pi (b - a) / n Sum(Sequence(If((' + F + ' - c) (' + G + ' - c) >= 0, abs((' + F + ' - c)^2 - (' + G +
          ' - c)^2), Max((' + F + ' - c)^2, (' + G + ' - c)^2)), k, 1, n))'*/
    };
  }

  // ---- 4. Styles (written once for every widget on the page) ----
  var css = document.createElement('style');
  css.textContent =
    '.ggb-volume { margin: 20px 0; } .ggb-volume * { box-sizing: border-box; }' +
    '.ggb-volume .gv-controls { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 18px; margin-bottom: 12px;' +
    '  font-size: 16px; }' +
    '.ggb-volume .gv-wide { grid-column: 1 / -1; }' +
    '.ggb-volume label { display: block; font-size: 14px; color: var(--muted, #5b6470); margin-bottom: 2px; }' +
    '.ggb-volume input:not([type=checkbox]), .ggb-volume select { width: 100%; font: inherit; font-size: 16px;' +
    '  padding: 6px 8px; border: 1px solid var(--rule, #d0ccc2); border-radius: 4px; background: var(--bg, #fff);' +
    '  color: inherit; }' +
    '.ggb-volume input.gv-fn, .ggb-volume input[type=number] { direction: ltr; text-align: left;' +
    '  font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }' +
    '.ggb-volume input[type=range] { padding: 0; border: 0; }' +
    '.ggb-volume .gv-slide { display: flex; gap: 8px; align-items: center; }' +
    '.ggb-volume .gv-slide input { flex: 1; }' +
    '.ggb-volume .gv-axis { display: grid; grid-template-columns: 1fr 8em; gap: 8px; }' +
    '.ggb-volume .gv-help { font-size: 13px; color: var(--muted, #5b6470); margin-top: 3px; }' +
    '.ggb-volume .gv-row { display: flex; flex-wrap: wrap; gap: 6px 18px; align-items: center; font-size: 15px; }' +
    '.ggb-volume .gv-row label { display: inline; margin: 0; color: inherit; font-size: 15px; }' +
    '.ggb-volume .gv-msg { min-height: 1.4em; font-size: 14px; color: #b42318; }' +
    '.ggb-volume .gv-graph { width: 100%; direction: ltr; border: 1px solid var(--rule, #e3e0d8); border-radius: 4px;' +
    '  overflow: hidden; background: #fff; }' +
    '.ggb-volume .gv-out { display: flex; flex-wrap: wrap; gap: 6px 22px; margin-top: 10px; font-size: 16px; }' +
    '.ggb-volume .gv-out b { font-weight: 600; }' +
    '.ggb-volume details.gv-more { margin-top: 10px; font-size: 15px; }' +
    '.ggb-volume details.gv-more summary { cursor: pointer; color: var(--muted, #5b6470); }' +
    '.ggb-volume .gv-set { display: flex; flex-wrap: wrap; gap: 10px 22px; align-items: end; padding: 10px 0; }' +
    '.ggb-volume .gv-set input[type=number] { width: 7em; }' +
    '.ggb-volume .gv-set input[type=color] { width: 3em; height: 2em; padding: 0; cursor: pointer; }' +
    '.ggb-volume table.gv-tab { border-collapse: collapse; font-size: 14px; }' +
    '.ggb-volume table.gv-tab th { text-align: start; font-weight: 600; padding: 4px 10px 4px 0; }' +
    '.ggb-volume table.gv-tab td { padding: 4px 10px 4px 0; vertical-align: middle; }' +
    '.ggb-volume table.gv-tab input[type=range] { width: 8em; vertical-align: middle; }' +
    '.ggb-volume table.gv-tab .gv-val { display: inline-block; min-width: 3em; text-align: end; }' +
    '.ggb-volume .gv-set { flex-direction: column; align-items: stretch; }' +
    '.ggb-volume button { font: inherit; font-size: 14px; padding: 4px 10px; border: 1px solid var(--rule, #d0ccc2);' +
    '  border-radius: 4px; background: var(--bg, #fff); color: inherit; cursor: pointer; white-space: nowrap; }' +
    '@media (max-width: 600px) { .ggb-volume .gv-controls { grid-template-columns: 1fr; } }';
  document.head.appendChild(css);

  function num(v, dflt) { var x = parseFloat(v); return isFinite(x) ? x : dflt; }

  // ---------- one widget ----------
  function build(box, index) {
    // ---- 5. Read the settings written on the tag ----
    var lang = box.getAttribute('data-lang') ||
      ((document.documentElement.lang || '').indexOf('ar') === 0 ? 'ar' : 'en');
    var T = {}, base = TEXT[lang] || TEXT.en;
    for (var key in base) T[key] = base[key];
    if (lang === 'ar' && window.ArabicTerms) {          // the site's terminology (terms.js), if loaded
      T.bad = 'لم يفهم جيوجبرا ' + ArabicTerms.expand('{{function.def}}', 'ar') + '.';
      T.help = T.help.replace('الاقترانات', ArabicTerms.expand('{{function.defpl}}', 'ar'));
    }
    var axisAttr = box.getAttribute('data-axis');
    var start = {
      axis: axisAttr === 'vertical' || (!axisAttr && box.getAttribute('data-method') === 'shells') ? 'vertical' : 'horizontal',
      c: num(box.getAttribute('data-c'), 0),
      f: box.getAttribute('data-f') || 'x',
      g: box.getAttribute('data-g') || '0',
      a: num(box.getAttribute('data-a'), 0),
      b: num(box.getAttribute('data-b'), 3),
      angle: Math.max(0, Math.min(360, num(box.getAttribute('data-angle'), 270))),
      nmax: Math.max(1, Math.min(200, Math.round(num(box.getAttribute('data-nmax'), 20))))
    };
    start.n = Math.max(1, Math.min(start.nmax, Math.round(num(box.getAttribute('data-n'), 6))));
    var color = {};
    Object.keys(DEFAULT_COLOR).forEach(function (k) {
      var c = box.getAttribute(COLOR_ATTR[k]);
      if (!rgb(c) && /^(outer|inner|ends|cuts)$/.test(k)) c = box.getAttribute('data-color-surface');
      color[k] = rgb(c) ? c : DEFAULT_COLOR[k];
    });
    var height = num(box.getAttribute('data-height'), 480);
    var gid = 'ggb-volume-' + index;

    // ---- 6. Our own inputs, the place for GeoGebra, and the results ----
    box.innerHTML =
      '<div class="gv-controls">' +
      '  <div class="gv-wide"><label>' + T.f + '</label><input class="gv-fn gv-f" spellcheck="false" autocomplete="off"></div>' +
      '  <div class="gv-wide"><label>' + T.g + '</label><input class="gv-fn gv-g" spellcheck="false" autocomplete="off">' +
      '    <div class="gv-help">' + T.help + '</div></div>' +
      '  <div><label>' + T.a + '</label><input class="gv-a" type="number" step="any"></div>' +
      '  <div><label>' + T.b + '</label><input class="gv-b" type="number" step="any"></div>' +
      '  <div class="gv-wide"><label>' + T.axis + '</label><div class="gv-axis"><select class="gv-ax">' +
      '    <option value="horizontal">' + T.axisH + '</option><option value="vertical">' + T.axisV + '</option></select>' +
      '    <input class="gv-c" type="number" step="any" aria-label="c" title="c" placeholder="c"></div></div>' +
      '  <div><label>' + T.angle + '<span class="gv-tv"></span></label><div class="gv-slide">' +
      '    <button type="button" class="gv-playt" title="' + T.playT + '">' + T.play + '</button>' +
      '    <input class="gv-t" type="range" min="0" max="360" step="1"></div></div>' +
      '  <div class="gv-wide gv-row">' +
      '    <span>' + T.show + ':</span>' +
      '    <label><input type="checkbox" class="gv-show" data-k="S" checked> ' + T.surface + '</label>' +
      '    <label><input type="checkbox" class="gv-show" data-k="X" checked> ' + T.axisLine + '</label>' +
      '    <button type="button" class="gv-fit">' + T.fit + '</button>' +
      '  </div>' +
      '</div>' +
      '<div class="gv-msg" role="status"></div>' +
      '<div class="gv-graph"><div id="' + gid + '">' + T.loading + '</div></div>' +
      '<div class="gv-out"></div>' +
      '<details class="gv-more"><summary>' + T.settings + '</summary><div class="gv-set">' +
      // Surfaces: a colour and an opacity for each part of the solid.
      '<table class="gv-tab"><tr><th>' + T.surfaces + '</th><th>' + T.colorW + '</th><th>' + T.opacity + '</th></tr>' +
      [['outer', T.outer], ['inner', T.inner], ['ends', T.ends], ['cuts', T.cuts]].map(function (p) {
        return '<tr><td>' + p[1] + '</td><td><input type="color" data-k="' + p[0] + '"></td>' +
          '<td><input type="range" class="gv-op" data-k="' + p[0] + '" min="0" max="100" step="5">' +
          ' <span class="gv-val" data-v="' + p[0] + '"></span></td></tr>';
      }).join('') + '</table>' +
      // Lines: a colour, a thickness and a style for the curves and the axis.
      '<table class="gv-tab"><tr><th>' + T.lines + '</th><th>' + T.colorW + '</th><th>' + T.thick + '</th><th>' +
      T.style + '</th></tr>' +
      [['prof', T.curve], ['axis', T.axisLine]].map(function (p) {
        return '<tr><td>' + p[1] + '</td><td><input type="color" data-k="' + p[0] + '"></td>' +
          '<td><input type="range" class="gv-th" data-k="' + p[0] + '" min="1" max="13" step="1">' +
          ' <span class="gv-val" data-v="' + p[0] + '"></span></td>' +
          '<td><select class="gv-st" data-k="' + p[0] + '">' + LINE_STYLES.map(function (st) {
            return '<option value="' + st + '">' + T.styles[st] + '</option>';
          }).join('') + '</select></td></tr>';
      }).join('') + '</table>' +
      '</div></details>';
    if (lang === 'ar') box.setAttribute('dir', 'rtl');

    var $ = function (c) { return box.querySelector(c); };
    var inF = $('.gv-f'), inG = $('.gv-g'), inA = $('.gv-a'), inB = $('.gv-b'), inAx = $('.gv-ax'), inC = $('.gv-c'),
        inT = $('.gv-t');
    var msg = $('.gv-msg'), out = $('.gv-out'), tv = $('.gv-tv');
    var playT = $('.gv-playt');
    inF.value = start.f; inG.value = start.g; inA.value = start.a; inB.value = start.b;
    inAx.value = start.axis; inC.value = start.c;
    inT.value = start.angle;
    Array.prototype.forEach.call(box.querySelectorAll('input[type=color]'), function (el) {
      el.value = color[el.getAttribute('data-k')];
    });
    var opacity = {}, line = {};
    Object.keys(DEFAULT_OPACITY).forEach(function (k) { opacity[k] = DEFAULT_OPACITY[k]; });
    Object.keys(DEFAULT_LINE).forEach(function (k) { line[k] = { thick: DEFAULT_LINE[k].thick, style: DEFAULT_LINE[k].style }; });
    function showVal(k, text) { box.querySelector('.gv-val[data-v="' + k + '"]').textContent = text; }
    Array.prototype.forEach.call(box.querySelectorAll('.gv-op'), function (el) {
      var k = el.getAttribute('data-k'); el.value = Math.round(opacity[k] * 100);
    });
    Array.prototype.forEach.call(box.querySelectorAll('.gv-th'), function (el) {
      el.value = line[el.getAttribute('data-k')].thick;
    });
    Array.prototype.forEach.call(box.querySelectorAll('.gv-st'), function (el) {
      el.value = line[el.getAttribute('data-k')].style;
    });

    var api = null;
    var state = { axis: null, c: null, f: null, g: null, a: null, b: null, n: null, skipG: null };
    var names = { S: [], A: [], X: [['AX', false]] };   // the GeoGebra objects that are drawn

    // ---- 7. Numbers in the reader's digits ----
    function digits(s) {
      if (lang !== 'ar' || document.documentElement.getAttribute('data-math-mode') === 'latin') return s;
      return s.replace(/[0-9]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'[d]; }).replace(/\./g, '٫').replace(/-/g, '−');
    }
    function fmt(x) {
      if (!isFinite(x)) return '—';
      if (Math.abs(x) < 1e-9) x = 0;                 // rounding noise
      var s = Math.abs(x) >= 1e5 || (Math.abs(x) < 1e-4 && x !== 0) ? x.toExponential(3) : String(+x.toFixed(4));
      return digits(s);
    }
    function showAngle(deg) { tv.textContent = digits(String(Math.round(deg))) + '°'; }
    showAngle(start.angle);

    // ---- 8. Talking to GeoGebra ----
    function cmd(c) { return api.evalCommand(c); }
    function hide(name) { api.setVisible(name, false); api.setAuxiliary && api.setAuxiliary(name, true); }
    function paint(name, colorKey, opacity) {
      if (!api.exists(name)) return;
      var c = rgb(color[colorKey]);
      api.setColor(name, c[0], c[1], c[2]);
      if (opacity !== undefined) api.setFilling(name, opacity);
      api.setLabelVisible(name, false);
      api.setFixed(name, true, false);
    }
    function paintAll() {
      names.S.forEach(function (o) { paint(o[0], PART[o[0]], opacity[PART[o[0]]]); });
      names.A.forEach(function (o) { paint(o[0], 'pieces', o[1] ? 0.85 : 0.55); });
      [['pf', 'prof'], ['pg', 'prof'], ['AX', 'axis']].forEach(function (o) {
        if (!api.exists(o[0])) return;
        paint(o[0], o[1]);
        api.setLineThickness(o[0], line[o[1]].thick);
        if (api.setLineStyle) api.setLineStyle(o[0], line[o[1]].style);
      });
    }
    function applyVisibility() {
      Array.prototype.forEach.call(box.querySelectorAll('.gv-show'), function (el) {
        names[el.getAttribute('data-k')].forEach(function (o) { if (api.exists(o[0])) api.setVisible(o[0], el.checked); });
      });
    }

    // Speed: while we send many commands, GeoGebra should not redraw after each one.
    function batch(fn) {
      if (api.setRepaintingActive) api.setRepaintingActive(false);
      try { fn(); } finally { if (api.setRepaintingActive) api.setRepaintingActive(true); }
    }

    // Is the lower curve the axis itself (g = c, axis y = c)? Then the surfaces made by turning g have
    // radius 0 and are not drawn at all: plain discs instead of washers, and half the work.
    function gIsAxis(axis, g, c) {
      return axis === 'horizontal' && g !== '' && isFinite(+g) && +g === c;
    }

    // Create (or re-create) the axis, the solid and the pieces for an axis type.
    function makeObjects(axis, skipG) {
      names.S.concat(names.A).concat(names.X).forEach(function (o) { if (api.exists(o[0])) api.deleteObject(o[0]); });
      var M = commands(axis);
      var skip = skipG ? { S2: true, A2: true } : {};
      names = { S: [], A: [], X: [['AX', false]] };
      function make(list, into) {
        list.forEach(function (c) {
          if (skip[c[0]] || !cmd(c[0] + ' = ' + c[1])) return;
          into.push([c[0], c[2] === 'cut']);
          cmd('SetLevelOfDetail(' + c[0] + ', 0)');   // coarser surfaces: much faster, still smooth
        });
      }
      make(M.solid, names.S);
      // make(M.pieces, names.A);          // pieces turned off
      cmd(M.axisLine);
      cmd(M.exact); if (api.exists('V')) hide('V');   // if GeoGebra rejects V, carry on without it
      // cmd(M.approx); hide('D');          // sum of the pieces turned off
      paintAll();
      applyVisibility();
    }

    // Zoom so that the whole solid and the axis are in view.
    function fit() {
      var a = api.getValue('a'), b = api.getValue('b'), c = api.getValue('c');
      var lo = Math.min(api.getValue('ymin'), 0), hi = Math.max(api.getValue('ymax'), 0);
      if (!isFinite(lo) || !isFinite(hi)) { lo = -1; hi = 1; }
      if (inAx.value === 'vertical') {
        var R = Math.max(Math.abs(a - c), Math.abs(b - c)) * 1.15 || 1, py = (hi - lo) * 0.15 || 1;
        api.setCoordSystem(c - R, c + R, lo - py, hi + py, -R, R);
      } else {
        var r = Math.max(Math.abs(hi - c), Math.abs(lo - c)) * 1.15 || 1, px = (b - a) * 0.15 || 1;
        api.setCoordSystem(Math.min(a, 0) - px, b + px, c - r, c + r, -r, r);
      }
    }

    function readout() {
      var v = inAx.value === 'vertical', V = api.getValue('V');
      if (!api.exists('V')) { out.innerHTML = ''; return; }
      out.innerHTML =
        '<span style="color:' + color.outer + '"><b>' + (v ? T.exactV : T.exactH) + ':</b> ' + fmt(V) + '</span>';
    }

    // Send a new formula for f or g; keep the old one if GeoGebra rejects it.
    function setCurve(name, text) {
      if (text === state[name]) return true;
      if (!text || !cmd(name + '(x) = ' + text) || !api.exists(name)) {
        msg.textContent = T.bad;
        if (state[name]) cmd(name + '(x) = ' + state[name]);
        return false;
      }
      hide(name);
      state[name] = text;
      return 'changed';
    }

    // ---- 9. Read our inputs and send only what changed ----
    function update(refit) {
      if (!api) return;
      var axis = inAx.value, c = num(inC.value, 0), a = num(inA.value, NaN), b = num(inB.value, NaN);
      msg.textContent = '';
      if (!(a < b)) { msg.textContent = T.order; return; }
      if (axis === 'vertical' && c > a && c < b) { msg.textContent = T.cross; return; }
      var r1 = setCurve('f', inF.value.trim()), r2 = setCurve('g', inG.value.trim() || '0');
      if (!r1 || !r2) return;
      var changedShape = r1 === 'changed' || r2 === 'changed';
      var skipG = gIsAxis(axis, state.g, c);
      batch(function () {
        if (a !== state.a) { api.setValue('a', a); state.a = a; changedShape = true; }
        if (b !== state.b) { api.setValue('b', b); state.b = b; changedShape = true; }
        if (c !== state.c) { api.setValue('c', c); state.c = c; changedShape = true; }
        // if (n !== state.n) { api.setValue('n', n); state.n = n; }   // pieces turned off
        if (axis !== state.axis || skipG !== state.skipG) {
          makeObjects(axis, skipG); state.axis = axis; state.skipG = skipG; changedShape = true;
        }
        if (changedShape && refit !== false) fit();
      });
      readout();
    }

    // The slider moves smoothly, but GeoGebra gets the new angle at most every 70 ms: every surface
    // is recomputed for each angle, and sending more often only queues work.
    var angleSent = 0, angleTimer = null, angleWanted = null;
    function setAngle(deg) {
      inT.value = deg; showAngle(deg);
      angleWanted = deg;
      if (!api || angleTimer) return;
      var wait = Math.max(0, 70 - (Date.now() - angleSent));
      angleTimer = setTimeout(function () {
        angleTimer = null; angleSent = Date.now();
        api.setValue('t', angleWanted * Math.PI / 180);
      }, wait);
    }

    // ---- 10. When GeoGebra is ready: create everything once ----
    function onLoad(ggb) {
      api = ggb;
      api.setErrorDialogsActive && api.setErrorDialogsActive(false);
      batch(function () { create(); });
    }
    function create() {
      cmd('a = ' + start.a); cmd('b = ' + start.b); cmd('c = ' + start.c);
      // cmd('n = ' + start.n);            // number of pieces: turned off
      cmd('t = ' + (start.angle * Math.PI / 180));
      ['a', 'b', 'c', 't'].forEach(hide);
      if (!cmd('f(x) = ' + start.f)) { start.f = 'x'; cmd('f(x) = x'); }
      if (!cmd('g(x) = ' + start.g)) { start.g = '0'; cmd('g(x) = 0'); }
      hide('f'); hide('g');
      state.f = inF.value = start.f; state.g = inG.value = start.g;
      // Division points and midpoints, as GeoGebra functions of the piece number.
      // Turned off with the pieces:
      // cmd('xk(j) = a + j (b - a) / n'); cmd('mk(j) = a + (j - 0.5) (b - a) / n');
      // hide('xk'); hide('mk');
      // The range of both curves on [a, b], for the zoom.
      cmd('ys = Join(Sequence(f(a + (b - a) j / 100), j, 0, 100), Sequence(g(a + (b - a) j / 100), j, 0, 100))');
      cmd('ymin = Min(ys)'); cmd('ymax = Max(ys)');
      ['ys', 'ymin', 'ymax'].forEach(hide);
      // The two curves on [a, b], in the plane z = 0.
      cmd('pf = Curve(u, f(u), 0, u, a, b)'); cmd('pg = Curve(u, g(u), 0, u, a, b)');
      cmd('SetVisibleInView(xOyPlane, -1, false)');  // a cleaner picture: no grey floor
      state.a = start.a; state.b = start.b; state.c = start.c;
      state.skipG = gIsAxis(start.axis, start.g, start.c);
      makeObjects(start.axis, state.skipG); state.axis = start.axis;
      fit();
      readout();
    }

    var params = {
      id: 'ggbVolume' + index,
      appName: '3d',
      perspective: 'T',                 // the 3D view only: no algebra view, no input bar
      width: Math.max(300, $('.gv-graph').clientWidth || 700),
      height: height,
      showToolBar: false, showMenuBar: false, showAlgebraInput: false,
      showResetIcon: false, showZoomButtons: true, showFullscreenButton: true,
      enableRightClick: false, enableLabelDrags: false, enableShiftDragZoom: true,
      errorDialogsActive: false, useBrowserForJS: false,
      language: lang === 'ar' ? 'ar' : 'en',
      borderColor: '#ffffff',
      scaleContainerClass: 'gv-graph',
      appletOnLoad: onLoad
    };

    // ---- 11. Listen to the reader ----
    var timer = null;
    function soon() { clearTimeout(timer); timer = setTimeout(update, 300); }
    [inF, inG, inA, inB, inC].forEach(function (el) { el.addEventListener('input', soon); });
    inAx.addEventListener('change', function () { update(); });
    inT.addEventListener('input', function () { stopT(); setAngle(+inT.value); });
    $('.gv-fit').addEventListener('click', function () { if (api) fit(); });
    Array.prototype.forEach.call(box.querySelectorAll('.gv-show'), function (el) {
      el.addEventListener('change', function () { if (api) applyVisibility(); });
    });

    // ▶ next to the angle: turn the region up to 360° (from 0° if already there), in about four seconds.
    var turning = null;
    function stopT() { if (turning) { cancelAnimationFrame(turning); turning = null; playT.textContent = T.play; } }
    playT.addEventListener('click', function () {
      if (turning) return stopT();
      var from = +inT.value >= 360 ? 0 : +inT.value, t0 = null;
      playT.textContent = T.stop;
      function step(ts) {
        if (t0 === null) t0 = ts;
        var deg = Math.min(360, from + (ts - t0) / 4000 * 360);
        setAngle(deg);
        if (deg < 360) turning = requestAnimationFrame(step); else stopT();
      }
      turning = requestAnimationFrame(step);
    });

    // Settings: colours, opacities, line thickness and style.
    Array.prototype.forEach.call(box.querySelectorAll('input[type=color]'), function (el) {
      el.addEventListener('input', function () {
        color[el.getAttribute('data-k')] = el.value;
        if (api) { paintAll(); readout(); }
      });
    });
    Array.prototype.forEach.call(box.querySelectorAll('.gv-op'), function (el) {
      var k = el.getAttribute('data-k');
      showVal(k, digits(el.value) + (lang === 'ar' ? '٪' : '%'));
      el.addEventListener('input', function () {
        opacity[k] = +el.value / 100;
        showVal(k, digits(el.value) + (lang === 'ar' ? '٪' : '%'));
        if (api) paintAll();
      });
    });
    Array.prototype.forEach.call(box.querySelectorAll('.gv-th'), function (el) {
      var k = el.getAttribute('data-k');
      showVal(k, digits(el.value));
      el.addEventListener('input', function () {
        line[k].thick = +el.value;
        showVal(k, digits(el.value));
        if (api) paintAll();
      });
    });
    Array.prototype.forEach.call(box.querySelectorAll('.gv-st'), function (el) {
      el.addEventListener('change', function () {
        line[el.getAttribute('data-k')].style = +el.value;
        if (api) paintAll();
      });
    });

    return { params: params, id: gid, fail: function () { $('#' + gid).textContent = T.failed; } };
  }

  // ---- 12. Load GeoGebra once; start each picture only when the reader scrolls near it ----
  // A 3D GeoGebra picture is heavy, so a page with three of them should not start all three at once.
  var loading = null;
  function loadGeoGebra() {
    if (window.GGBApplet) return Promise.resolve();
    if (!loading) {
      loading = new Promise(function (resolve, reject) {
        var s = document.createElement('script');
        s.src = SCRIPT;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
    }
    return loading;
  }
  function launch(w) {
    if (w.started) return;
    w.started = true;
    loadGeoGebra().then(function () {
      try { new window.GGBApplet(w.params, true).inject(w.id); }
      catch (e) { w.fail(); }
    }, function () { w.fail(); });
  }
  function start() {
    var boxes = document.querySelectorAll('.ggb-volume');
    if (!boxes.length) return;
    var widgets = Array.prototype.map.call(boxes, build);
    if (!('IntersectionObserver' in window)) return widgets.forEach(launch);
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var i = Array.prototype.indexOf.call(boxes, e.target);
        io.unobserve(e.target);
        launch(widgets[i]);
      });
    }, { rootMargin: '300px 0px' });
    Array.prototype.forEach.call(boxes, function (b) { io.observe(b); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
