/*
 * ggb-riemann.js — Riemann sums with the inputs on our page and GeoGebra only as the graph.
 *
 * Write, anywhere in the page:
 *   <div class="ggb-riemann" data-f="x^2" data-a="0" data-b="2" data-n="6" data-sum="both"></div>
 *
 * The reader types the function, the interval and the number of rectangles in our own boxes;
 * GeoGebra draws the graph, and the reader can zoom (wheel or pinch) and drag it.
 *
 * Settings on the tag (all optional):
 *   data-f      the function, in GeoGebra's English syntax: x^2, sin(x), sqrt(x), exp(x), 1/x
 *   data-a, data-b, data-n   the interval [a, b] and the number of rectangles
 *   data-nmax   the largest number of rectangles on the slider (default 100, at most 1000)
 *   data-color-upper, data-color-lower, data-color-sum, data-color-curve
 *               colours as #rrggbb (defaults: blue, orange, green, near-black)
 *   data-sum    which sum is shown first: lower, upper, both, left, right, mid
 *   data-lang   ar for Arabic labels (default: the page's language)
 *   data-height height of the graph in pixels (default 460)
 * Readers can also change the slider's maximum and the colours, under "Settings" below the graph.
 *
 * How it talks to GeoGebra: the page creates an empty GeoGebra graph and sends it commands
 * (f(x) = ..., UpperSum(f, a, b, n), ...) through GeoGebra's Apps API; GeoGebra recalculates
 * everything that depends on f, a, b, n by itself. Reference: https://geogebra.github.io/docs/reference/en/GeoGebra_Apps_API/
 */
(function () {
  'use strict';

  var SCRIPT = 'https://www.geogebra.org/apps/deployggb.js';

  var TEXT = {
    en: { f: 'f(x) =', a: 'From a =', b: 'to b =', n: 'Rectangles n = ', sum: 'Sum',
          lower: 'Lower sum', upper: 'Upper sum', both: 'Upper and lower', left: 'Left endpoints',
          right: 'Right endpoints', mid: 'Midpoints', integral: 'Integral', fit: 'Fit graph',
          gap: 'Upper − lower', value: 'Sum', bad: 'GeoGebra could not read this function.',
          order: 'a must be less than b.', loading: 'Loading GeoGebra…',
          failed: 'GeoGebra could not be loaded. Check the connection and reload the page.',
          help: 'Write the function in English: x^2 + 1, sin(x), sqrt(x), exp(x), ln(x), abs(x).',
          othersum: 'Left, right, midpoint sums', settings: 'Settings', nmax: 'Largest n on the slider', curve: 'Graph of f', colors: 'Colours' },
    ar: { f: 'f(x) =', a: 'من أ =', b: 'إلى ب =', n: 'عدد المستطيلات ن = ', sum: 'المجموع',
          lower: 'المجموع السفلي', upper: 'المجموع العلوي', both: 'العلوي والسفلي معًا', left: 'الأطراف اليسرى',
          right: 'الأطراف اليمنى', mid: 'منتصفات الفترات', integral: 'التكامل', fit: 'ملاءمة الرسم',
          gap: 'العلوي − السفلي', value: 'المجموع', bad: 'لم يفهم جيوجبرا هذا الاقتران.',
          order: 'يجب أن يكون أ أصغر من ب.', loading: 'جارٍ تحميل جيوجبرا…',
          failed: 'تعذّر تحميل جيوجبرا. تحقّق من الاتصال وأعد تحميل الصفحة.',
          help: 'اكتب الاقتران بالإنجليزية: x^2 + 1، sin(x)، sqrt(x)، exp(x)، ln(x)، abs(x).',
          othersum: 'مجاميع الأطراف والمنتصفات', settings: 'الإعدادات', nmax: 'أكبر قيمة لـ ن على المؤشر', curve: 'منحنى الاقتران', colors: 'الألوان' }
  };

  // Default colours: upper sum blue, lower sum orange (as on the other Riemann pages), other sums green.
  var DEFAULT_COLOR = { U: '#2563eb', L: '#ea580c', S: '#16a34a', f: '#1f2328' };
  var COLOR_ATTR = { U: 'data-color-upper', L: 'data-color-lower', S: 'data-color-sum', f: 'data-color-curve' };
  function rgb(hex) {
    var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || '');
    return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null;
  }

  var css = document.createElement('style');
  css.textContent =
    '.ggb-riemann { margin: 20px 0; } .ggb-riemann * { box-sizing: border-box; }' +
    '.ggb-riemann .gr-controls { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 18px; margin-bottom: 12px;' +
    '  font-size: 16px; }' +
    '.ggb-riemann .gr-wide { grid-column: 1 / -1; }' +
    '.ggb-riemann label { display: block; font-size: 14px; color: var(--muted, #5b6470); margin-bottom: 2px; }' +
    '.ggb-riemann input, .ggb-riemann select { width: 100%; font: inherit; font-size: 16px; padding: 6px 8px;' +
    '  border: 1px solid var(--rule, #d0ccc2); border-radius: 4px; background: var(--bg, #fff); color: inherit; }' +
    '.ggb-riemann input.gr-f, .ggb-riemann input[type=number] { direction: ltr; text-align: left;' +
    '  font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }' +
    '.ggb-riemann input[type=range] { padding: 0; border: 0; }' +
    '.ggb-riemann .gr-help { font-size: 13px; color: var(--muted, #5b6470); margin-top: 3px; }' +
    '.ggb-riemann .gr-msg { min-height: 1.4em; font-size: 14px; color: #b42318; }' +
    '.ggb-riemann .gr-graph { width: 100%; direction: ltr; border: 1px solid var(--rule, #e3e0d8); border-radius: 4px;' +
    '  overflow: hidden; background: #fff; }' +
    '.ggb-riemann .gr-out { display: flex; flex-wrap: wrap; gap: 6px 22px; margin-top: 10px; font-size: 16px; }' +
    '.ggb-riemann .gr-out b { font-weight: 600; }' +
    '.ggb-riemann details.gr-more { margin-top: 10px; font-size: 15px; }' +
    '.ggb-riemann details.gr-more summary { cursor: pointer; color: var(--muted, #5b6470); }' +
    '.ggb-riemann .gr-set { display: flex; flex-wrap: wrap; gap: 10px 22px; align-items: end; padding: 10px 0; }' +
    '.ggb-riemann .gr-set input[type=number] { width: 7em; }' +
    '.ggb-riemann .gr-set input[type=color] { width: 3em; height: 2em; padding: 0; cursor: pointer; }' +
    '.ggb-riemann button { font: inherit; font-size: 14px; padding: 4px 10px; border: 1px solid var(--rule, #d0ccc2);' +
    '  border-radius: 4px; background: var(--bg, #fff); color: inherit; cursor: pointer; }' +
    '@media (max-width: 600px) { .ggb-riemann .gr-controls { grid-template-columns: 1fr; } }';
  document.head.appendChild(css);

  function num(v, dflt) { var x = parseFloat(v); return isFinite(x) ? x : dflt; }

  // ---------- one widget ----------
  function build(box, index) {
    var lang = box.getAttribute('data-lang') ||
      ((document.documentElement.lang || '').indexOf('ar') === 0 ? 'ar' : 'en');
    var T = TEXT[lang] || TEXT.en;
    if (lang === 'ar' && window.ArabicTerms) {          // the site's terminology (terms.js), if loaded
      T.bad = 'لم يفهم جيوجبرا ' + ArabicTerms.expand('{{function.def}}', 'ar') + '.';
      T.f = ArabicTerms.expand('{{function.def}}', 'ar') + ' f(x) =';
    }
    var start = {
      f: box.getAttribute('data-f') || 'x^2',
      a: num(box.getAttribute('data-a'), 0),
      b: num(box.getAttribute('data-b'), 2),
      nmax: Math.max(1, Math.min(1000, Math.round(num(box.getAttribute('data-nmax'), 100)))),
      sum: box.getAttribute('data-sum') || 'both'
    };
    start.n = Math.max(1, Math.min(start.nmax, Math.round(num(box.getAttribute('data-n'), 6))));
    var color = {};                       // this widget's colours, as #rrggbb
    Object.keys(DEFAULT_COLOR).forEach(function (k) {
      var c = box.getAttribute(COLOR_ATTR[k]);
      color[k] = rgb(c) ? c : DEFAULT_COLOR[k];
    });
    var height = num(box.getAttribute('data-height'), 460);
    var gid = 'ggb-riemann-' + index;

    box.innerHTML =
      '<div class="gr-controls">' +
      '  <div class="gr-wide"><label>' + T.f + '</label><input class="gr-f" spellcheck="false" autocomplete="off">' +
      '    <div class="gr-help">' + T.help + '</div></div>' +
      '  <div><label>' + T.a + '</label><input class="gr-a" type="number" step="any"></div>' +
      '  <div><label>' + T.b + '</label><input class="gr-b" type="number" step="any"></div>' +
      '  <div><label>' + T.n + '<span class="gr-nv"></span></label><input class="gr-n" type="range" min="1"></div>' +
      '  <div><label>' + T.sum + '</label><select class="gr-sum">' +
      ['both', 'lower', 'upper', 'left', 'right', 'mid'].map(function (k) {
        return '<option value="' + k + '">' + T[k] + '</option>';
      }).join('') + '</select></div>' +
      '</div>' +
      '<div class="gr-msg" role="status"></div>' +
      '<div class="gr-graph"><div id="' + gid + '">' + T.loading + '</div></div>' +
      '<div class="gr-out"></div>' +
      '<div style="margin-top:8px"><button type="button" class="gr-fit">' + T.fit + '</button></div>' +
      '<details class="gr-more"><summary>' + T.settings + '</summary><div class="gr-set">' +
      '  <div><label>' + T.nmax + '</label><input class="gr-nmax" type="number" min="1" max="1000" step="1"></div>' +
      [['U', T.upper], ['L', T.lower], ['S', T.othersum], ['f', T.curve]].map(function (p) {
        return '  <div><label>' + p[1] + '</label><input type="color" data-k="' + p[0] + '"></div>';
      }).join('') +
      '</div></details>';
    if (lang === 'ar') box.setAttribute('dir', 'rtl');

    var $ = function (c) { return box.querySelector(c); };
    var inF = $('.gr-f'), inA = $('.gr-a'), inB = $('.gr-b'), inN = $('.gr-n'), inSum = $('.gr-sum');
    var msg = $('.gr-msg'), out = $('.gr-out'), nv = $('.gr-nv');
    var inMax = $('.gr-nmax');
    inN.max = start.nmax; inMax.value = start.nmax;
    Array.prototype.forEach.call(box.querySelectorAll('input[type=color]'), function (el) {
      el.value = color[el.getAttribute('data-k')];
    });
    inF.value = start.f; inA.value = start.a; inB.value = start.b; inN.value = start.n; inSum.value = start.sum;
    nv.textContent = fmtInt(start.n);

    var api = null;
    var state = { f: null, a: null, b: null, n: null, sum: null };

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
    function fmtInt(n) { return digits(String(n)); }

    // GeoGebra commands. evalCommand returns false when GeoGebra rejects a command.
    function cmd(c) { return api.evalCommand(c); }
    function hide(name) { api.setVisible(name, false); api.setAuxiliary && api.setAuxiliary(name, true); }
    function style(name, hex, fill) {
      var c = rgb(hex);
      api.setColor(name, c[0], c[1], c[2]);
      if (fill !== undefined) api.setFilling(name, fill);
      api.setLabelVisible(name, false);
      api.setFixed(name, true, false);          // cannot be dragged or selected by the reader
    }

    // The sums currently on the graph, as GeoGebra objects U, L, S.
    function drawSums(kind) {
      ['U', 'L', 'S'].forEach(function (o) { if (api.exists(o)) api.deleteObject(o); });
      if (kind === 'both' || kind === 'upper') { cmd('U = UpperSum(f, a, b, n)'); style('U', color.U, 0.25); }
      if (kind === 'both' || kind === 'lower') { cmd('L = LowerSum(f, a, b, n)'); style('L', color.L, 0.35); }
      if (kind === 'left') cmd('S = LeftSum(f, a, b, n)');
      if (kind === 'right') cmd('S = RectangleSum(f, a, b, n, 1)');
      if (kind === 'mid') cmd('S = RectangleSum(f, a, b, n, 0.5)');
      if (api.exists('S')) style('S', color.S, 0.3);
    }

    // Zoom so that [a, b] and the graph over it are in view.
    function fit() {
      var a = api.getValue('a'), b = api.getValue('b');
      var lo = api.getValue('ymin'), hi = api.getValue('ymax');
      if (!isFinite(lo) || !isFinite(hi)) { lo = -1; hi = 1; }
      lo = Math.min(lo, 0); hi = Math.max(hi, 0);
      var px = (b - a) * 0.15 || 1, py = (hi - lo) * 0.15 || 1;
      api.setCoordSystem(a - px, b + px, lo - py, hi + py);
    }

    function readout() {
      var parts = [];
      var item = function (k, label) {
        return '<span style="color:' + color[k] + '"><b>' + label + ':</b> ' + fmt(api.getValue(k)) + '</span>';
      };
      if (api.exists('U')) parts.push(item('U', T.upper));
      if (api.exists('L')) parts.push(item('L', T.lower));
      if (api.exists('S')) parts.push(item('S', T.value));
      parts.push('<span><b>' + T.integral + ':</b> ' + fmt(api.getValue('I')) + '</span>');
      if (api.exists('U') && api.exists('L')) {
        parts.push('<span><b>' + T.gap + ':</b> ' + fmt(api.getValue('U') - api.getValue('L')) + '</span>');
      }
      out.innerHTML = parts.join('');
    }

    // Read our inputs and send only what changed.
    function update(refit) {
      if (!api) return;
      var f = inF.value.trim(), a = num(inA.value, NaN), b = num(inB.value, NaN);
      var n = Math.round(num(inN.value, 6)), kind = inSum.value;
      nv.textContent = fmtInt(n);
      msg.textContent = '';
      if (!(a < b)) { msg.textContent = T.order; return; }
      var changedShape = false;
      if (f !== state.f) {
        if (!f || !cmd('f(x) = ' + f) || !api.exists('f')) {
          msg.textContent = T.bad;
          if (state.f) cmd('f(x) = ' + state.f);   // keep the last function that worked
          return;
        }
        style('f', color.f); api.setLineThickness('f', 6);
        state.f = f; changedShape = true;
      }
      if (a !== state.a) { api.setValue('a', a); state.a = a; changedShape = true; }
      if (b !== state.b) { api.setValue('b', b); state.b = b; changedShape = true; }
      if (n !== state.n) { api.setValue('n', n); state.n = n; }
      if (kind !== state.sum) { drawSums(kind); state.sum = kind; }
      if (changedShape && refit !== false) fit();
      readout();
    }

    // Called by GeoGebra when the empty graph is ready.
    function onLoad(ggb) {
      api = ggb;
      api.setErrorDialogsActive && api.setErrorDialogsActive(false);
      cmd('a = ' + start.a); cmd('b = ' + start.b); cmd('n = ' + start.n);
      ['a', 'b', 'n'].forEach(hide);
      if (!cmd('f(x) = ' + start.f)) cmd('f(x) = x^2');
      state.f = inF.value = api.exists('f') ? start.f : 'x^2';
      style('f', color.f); api.setLineThickness('f', 6);
      // The integral (value only: its shading is hidden) and the range of f, for the readout and the zoom.
      cmd('I = Integral(f, a, b)'); hide('I');
      cmd('ys = Sequence(f(a + (b - a) k / 200), k, 0, 200)'); hide('ys');
      cmd('ymin = Min(ys)'); cmd('ymax = Max(ys)'); hide('ymin'); hide('ymax');
      state.a = start.a; state.b = start.b; state.n = start.n;
      drawSums(start.sum); state.sum = start.sum;
      fit();
      readout();
    }

    var params = {
      id: 'ggbApplet' + index,
      appName: 'classic',
      perspective: 'G',                 // the graph only: no algebra view, no input bar
      width: Math.max(300, $('.gr-graph').clientWidth || 700),
      height: height,
      showToolBar: false, showMenuBar: false, showAlgebraInput: false,
      showResetIcon: false, showZoomButtons: true, showFullscreenButton: true,
      enableRightClick: false, enableLabelDrags: false, enableShiftDragZoom: true,
      errorDialogsActive: false, useBrowserForJS: false,
      language: lang === 'ar' ? 'ar' : 'en',
      borderColor: '#ffffff',
      scaleContainerClass: 'gr-graph',
      appletOnLoad: onLoad
    };

    var timer = null;
    function soon() { clearTimeout(timer); timer = setTimeout(update, 250); }  // wait while typing
    inF.addEventListener('input', soon);
    inA.addEventListener('input', soon);
    inB.addEventListener('input', soon);
    inN.addEventListener('input', function () { update(false); });
    inSum.addEventListener('change', function () { update(false); });
    $('.gr-fit').addEventListener('click', function () { if (api) fit(); });
    // Settings: the slider's maximum, and the colours.
    inMax.addEventListener('change', function () {
      var m = Math.max(1, Math.min(1000, Math.round(num(inMax.value, start.nmax))));
      inMax.value = m; inN.max = m;
      if (+inN.value > m) inN.value = m;
      update(false);
    });
    Array.prototype.forEach.call(box.querySelectorAll('input[type=color]'), function (el) {
      el.addEventListener('input', function () {
        var k = el.getAttribute('data-k');
        color[k] = el.value;
        if (!api || !api.exists(k)) return;
        if (k === 'f') style('f', color.f); else style(k, color[k], k === 'U' ? 0.25 : k === 'L' ? 0.35 : 0.3);
        readout();
      });
    });

    return { params: params, id: gid, fail: function () { $('#' + gid).textContent = T.failed; } };
  }

  // ---------- load GeoGebra once, then start every widget ----------
  function start() {
    var boxes = document.querySelectorAll('.ggb-riemann');
    if (!boxes.length) return;
    var widgets = Array.prototype.map.call(boxes, build);
    function run() {
      widgets.forEach(function (w) {
        try { new window.GGBApplet(w.params, true).inject(w.id); }
        catch (e) { w.fail(); }
      });
    }
    if (window.GGBApplet) return run();
    var s = document.createElement('script');
    s.src = SCRIPT;
    s.onload = run;
    s.onerror = function () { widgets.forEach(function (w) { w.fail(); }); };
    document.head.appendChild(s);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
