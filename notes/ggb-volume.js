/*
 * ggb-volume.js — volume of revolution, with the inputs on our page and GeoGebra 3D only as the picture.
 *
 * Write, anywhere in the page:
 *   <div class="ggb-volume" data-f="x" data-a="0" data-b="3" data-n="6"></div>
 *
 * The region under y = f(x) on [a, b] is turned about the x-axis. The reader types the function and
 * the interval, chooses the number of discs, and turns the region with a slider (or "Rotate");
 * GeoGebra draws the solid, which the reader can turn around and zoom.
 *
 * The volume is approximated by n discs (cylinders) at the midpoints:
 *     V ≈ π Σ f(m_k)² Δx,   and exactly   V = π ∫_a^b f(x)² dx.
 *
 * Settings on the tag (all optional):
 *   data-f, data-a, data-b, data-n   the function (GeoGebra's English syntax), the interval, the number of discs
 *   data-nmax   the largest number of discs on the slider (default 40, at most 200)
 *   data-color-surface, data-color-discs, data-color-curve   colours as #rrggbb
 *   data-lang   ar for Arabic labels (default: the page's language)
 *   data-height height of the picture in pixels (default 480)
 *
 * This file follows the same plan as ggb-riemann.js; docs/geogebra-widgets.md explains it step by step.
 */
(function () {
  'use strict';

  var SCRIPT = 'https://www.geogebra.org/apps/deployggb.js';

  // ---- 1. The words on the widget, in each language ----
  var TEXT = {
    en: { f: 'f(x) =', a: 'From a =', b: 'to b =', n: 'Discs n = ', angle: 'Turn the region: ',
          rotate: 'Rotate', stop: 'Stop', surface: 'Solid', discs: 'Discs', curve: 'Graph of f',
          approx: 'Sum of the discs', exact: 'Volume π∫f²', gap: 'Difference', fit: 'Fit view',
          bad: 'GeoGebra could not read this function.', order: 'a must be less than b.',
          loading: 'Loading GeoGebra 3D…',
          failed: 'GeoGebra could not be loaded. Check the connection and reload the page.',
          help: 'Write the function in English: sqrt(x), x^2, sin(x) + 1, exp(-x). Drag the picture to turn it.',
          settings: 'Settings', nmax: 'Largest n on the slider', show: 'Show' },
    ar: { f: 'f(x) =', a: 'من أ =', b: 'إلى ب =', n: 'عدد الأقراص ن = ', angle: 'دوّر المنطقة: ',
          rotate: 'دوّر', stop: 'أوقف', surface: 'المجسّم', discs: 'الأقراص', curve: 'منحنى الاقتران',
          approx: 'مجموع الأقراص', exact: 'الحجم π∫f²', gap: 'الفرق', fit: 'ملاءمة الرسم',
          bad: 'لم يفهم جيوجبرا هذا الاقتران.', order: 'يجب أن يكون أ أصغر من ب.',
          loading: 'جارٍ تحميل جيوجبرا ثلاثي الأبعاد…',
          failed: 'تعذّر تحميل جيوجبرا. تحقّق من الاتصال وأعد تحميل الصفحة.',
          help: 'اكتب الاقتران بالإنجليزية: sqrt(x)، x^2، sin(x) + 1، exp(-x). اسحب الرسم لتدويره.',
          settings: 'الإعدادات', nmax: 'أكبر قيمة لـ ن على المؤشر', show: 'اعرض' }
  };

  // ---- 2. Colours ----
  var DEFAULT_COLOR = { surf: '#2563eb', discs: '#ea580c', prof: '#1f2328' };
  var COLOR_ATTR = { surf: 'data-color-surface', discs: 'data-color-discs', prof: 'data-color-curve' };
  var OPACITY = { surf: 0.55, discs: 0.45 };
  function rgb(hex) {
    var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || '');
    return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null;
  }

  // ---- 3. Styles (written once for every widget on the page) ----
  var css = document.createElement('style');
  css.textContent =
    '.ggb-volume { margin: 20px 0; } .ggb-volume * { box-sizing: border-box; }' +
    '.ggb-volume .gv-controls { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 18px; margin-bottom: 12px;' +
    '  font-size: 16px; }' +
    '.ggb-volume .gv-wide { grid-column: 1 / -1; }' +
    '.ggb-volume label { display: block; font-size: 14px; color: var(--muted, #5b6470); margin-bottom: 2px; }' +
    '.ggb-volume input:not([type=checkbox]) { width: 100%; font: inherit; font-size: 16px; padding: 6px 8px;' +
    '  border: 1px solid var(--rule, #d0ccc2); border-radius: 4px; background: var(--bg, #fff); color: inherit; }' +
    '.ggb-volume input.gv-f, .ggb-volume input[type=number] { direction: ltr; text-align: left;' +
    '  font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }' +
    '.ggb-volume input[type=range] { padding: 0; border: 0; }' +
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
    '.ggb-volume button { font: inherit; font-size: 14px; padding: 4px 10px; border: 1px solid var(--rule, #d0ccc2);' +
    '  border-radius: 4px; background: var(--bg, #fff); color: inherit; cursor: pointer; }' +
    '@media (max-width: 600px) { .ggb-volume .gv-controls { grid-template-columns: 1fr; } }';
  document.head.appendChild(css);

  function num(v, dflt) { var x = parseFloat(v); return isFinite(x) ? x : dflt; }

  // ---------- one widget ----------
  function build(box, index) {
    // ---- 4. Read the settings written on the tag ----
    var lang = box.getAttribute('data-lang') ||
      ((document.documentElement.lang || '').indexOf('ar') === 0 ? 'ar' : 'en');
    var T = TEXT[lang] || TEXT.en;
    if (lang === 'ar' && window.ArabicTerms) {          // the site's terminology (terms.js), if loaded
      var fdef = ArabicTerms.expand('{{function.def}}', 'ar');
      T.bad = 'لم يفهم جيوجبرا ' + fdef + '.';
      T.f = fdef + ' f(x) =';
      T.curve = 'منحنى ' + fdef;
    }
    var start = {
      f: box.getAttribute('data-f') || 'sqrt(x)',
      a: num(box.getAttribute('data-a'), 0),
      b: num(box.getAttribute('data-b'), 4),
      nmax: Math.max(1, Math.min(200, Math.round(num(box.getAttribute('data-nmax'), 40))))
    };
    start.n = Math.max(1, Math.min(start.nmax, Math.round(num(box.getAttribute('data-n'), 8))));
    var color = {};
    Object.keys(DEFAULT_COLOR).forEach(function (k) {
      var c = box.getAttribute(COLOR_ATTR[k]);
      color[k] = rgb(c) ? c : DEFAULT_COLOR[k];
    });
    var height = num(box.getAttribute('data-height'), 480);
    var gid = 'ggb-volume-' + index;

    // ---- 5. Our own inputs, the place for GeoGebra, and the results ----
    box.innerHTML =
      '<div class="gv-controls">' +
      '  <div class="gv-wide"><label>' + T.f + '</label><input class="gv-f" spellcheck="false" autocomplete="off">' +
      '    <div class="gv-help">' + T.help + '</div></div>' +
      '  <div><label>' + T.a + '</label><input class="gv-a" type="number" step="any"></div>' +
      '  <div><label>' + T.b + '</label><input class="gv-b" type="number" step="any"></div>' +
      '  <div><label>' + T.n + '<span class="gv-nv"></span></label><input class="gv-n" type="range" min="1"></div>' +
      '  <div><label>' + T.angle + '<span class="gv-tv"></span></label><input class="gv-t" type="range" min="0" max="360" step="1"></div>' +
      '  <div class="gv-wide gv-row">' +
      '    <button type="button" class="gv-rot">' + T.rotate + '</button>' +
      '    <span>' + T.show + ':</span>' +
      '    <label><input type="checkbox" class="gv-show" data-k="surf" checked> ' + T.surface + '</label>' +
      '    <label><input type="checkbox" class="gv-show" data-k="discs" checked> ' + T.discs + '</label>' +
      '    <button type="button" class="gv-fit">' + T.fit + '</button>' +
      '  </div>' +
      '</div>' +
      '<div class="gv-msg" role="status"></div>' +
      '<div class="gv-graph"><div id="' + gid + '">' + T.loading + '</div></div>' +
      '<div class="gv-out"></div>' +
      '<details class="gv-more"><summary>' + T.settings + '</summary><div class="gv-set">' +
      '  <div><label>' + T.nmax + '</label><input class="gv-nmax" type="number" min="1" max="200" step="1"></div>' +
      [['surf', T.surface], ['discs', T.discs], ['prof', T.curve]].map(function (p) {
        return '  <div><label>' + p[1] + '</label><input type="color" data-k="' + p[0] + '"></div>';
      }).join('') +
      '</div></details>';
    if (lang === 'ar') box.setAttribute('dir', 'rtl');

    var $ = function (c) { return box.querySelector(c); };
    var inF = $('.gv-f'), inA = $('.gv-a'), inB = $('.gv-b'), inN = $('.gv-n'), inT = $('.gv-t'), inMax = $('.gv-nmax');
    var msg = $('.gv-msg'), out = $('.gv-out'), nv = $('.gv-nv'), tv = $('.gv-tv'), rot = $('.gv-rot');
    inF.value = start.f; inA.value = start.a; inB.value = start.b;
    inN.max = start.nmax; inMax.value = start.nmax; inN.value = start.n; inT.value = 360;
    Array.prototype.forEach.call(box.querySelectorAll('input[type=color]'), function (el) {
      el.value = color[el.getAttribute('data-k')];
    });

    var api = null;
    var state = { f: null, a: null, b: null, n: null };

    // ---- 6. Numbers in the reader's digits ----
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
    nv.textContent = digits(String(start.n)); tv.textContent = digits('360') + '°';

    // ---- 7. Talking to GeoGebra ----
    function cmd(c) { return api.evalCommand(c); }
    function hide(name) { api.setVisible(name, false); api.setAuxiliary && api.setAuxiliary(name, true); }
    function style(name) {
      var c = rgb(color[name]);
      api.setColor(name, c[0], c[1], c[2]);
      if (OPACITY[name] !== undefined) api.setFilling(name, OPACITY[name]);
      api.setLabelVisible(name, false);
      api.setFixed(name, true, false);
    }

    // The objects GeoGebra keeps up to date by itself whenever f, a, b, n or t change.
    function makeObjects() {
      // The graph of f on [a, b], drawn in the xy-plane: x = u, y = f(u), z = 0.
      cmd('prof = Curve(u, f(u), 0, u, a, b)');
      // The solid: each point of the graph turned by an angle v from 0 to t about the x-axis.
      cmd('surf = Surface(u, f(u) cos(v), f(u) sin(v), u, a, b, v, 0, t)');
      // n discs: on the k-th piece of [a, b], a cylinder whose radius is f at the midpoint.
      cmd('discs = Sequence(Cylinder((a + (k - 1) (b - a) / n, 0, 0), (a + k (b - a) / n, 0, 0), ' +
          'abs(f(a + (k - 0.5) (b - a) / n))), k, 1, n)');
      ['prof', 'surf', 'discs'].forEach(style);
      api.setLineThickness('prof', 7);
      Array.prototype.forEach.call(box.querySelectorAll('.gv-show'), function (el) {
        api.setVisible(el.getAttribute('data-k'), el.checked);
      });
    }

    // Zoom so that the whole solid is in view: x from a to b, y and z from −R to R.
    function fit() {
      var a = api.getValue('a'), b = api.getValue('b'), R = api.getValue('R');
      if (!isFinite(R) || R <= 0) R = 1;
      var px = (b - a) * 0.15 || 1, pr = R * 1.2;
      api.setCoordSystem(a - px, b + px, -pr, pr, -pr, pr);
    }

    function readout() {
      var D = api.getValue('D'), V = api.getValue('V');
      out.innerHTML =
        '<span style="color:' + color.discs + '"><b>' + T.approx + ':</b> ' + fmt(D) + '</span>' +
        '<span style="color:' + color.surf + '"><b>' + T.exact + ':</b> ' + fmt(V) + '</span>' +
        '<span><b>' + T.gap + ':</b> ' + fmt(D - V) + '</span>';
    }

    // ---- 8. Read our inputs and send only what changed ----
    function update(refit) {
      if (!api) return;
      var f = inF.value.trim(), a = num(inA.value, NaN), b = num(inB.value, NaN);
      var n = Math.round(num(inN.value, 8));
      nv.textContent = digits(String(n));
      msg.textContent = '';
      if (!(a < b)) { msg.textContent = T.order; return; }
      var changedShape = false;
      if (f !== state.f) {
        if (!f || !cmd('f(x) = ' + f) || !api.exists('f')) {
          msg.textContent = T.bad;
          if (state.f) cmd('f(x) = ' + state.f);
          return;
        }
        hide('f');
        state.f = f; changedShape = true;
      }
      if (a !== state.a) { api.setValue('a', a); state.a = a; changedShape = true; }
      if (b !== state.b) { api.setValue('b', b); state.b = b; changedShape = true; }
      if (n !== state.n) { api.setValue('n', n); state.n = n; }
      if (changedShape && refit !== false) fit();
      readout();
    }

    function setAngle(deg) {
      inT.value = deg;
      tv.textContent = digits(String(Math.round(deg))) + '°';
      if (api) api.setValue('t', deg * Math.PI / 180);
    }

    // ---- 9. When GeoGebra is ready: create everything once ----
    function onLoad(ggb) {
      api = ggb;
      api.setErrorDialogsActive && api.setErrorDialogsActive(false);
      cmd('a = ' + start.a); cmd('b = ' + start.b); cmd('n = ' + start.n); cmd('t = 2pi');
      ['a', 'b', 'n', 't'].forEach(hide);
      if (!cmd('f(x) = ' + start.f)) cmd('f(x) = sqrt(x)');
      state.f = inF.value = api.exists('f') ? start.f : 'sqrt(x)';
      hide('f');                                      // the plain graph in the plane is replaced by prof
      // The numbers: exact volume, the sum of the discs, and the largest radius (for the zoom).
      cmd('V = pi Integral(f(x)^2, a, b)');
      cmd('D = pi (b - a) / n Sum(Sequence(f(a + (k - 0.5) (b - a) / n)^2, k, 1, n))');
      cmd('R = Max(Sequence(abs(f(a + (b - a) k / 100)), k, 0, 100))');
      ['V', 'D', 'R'].forEach(hide);
      cmd('SetVisibleInView(xOyPlane, -1, false)');  // a cleaner picture: no grey floor
      makeObjects();
      state.a = start.a; state.b = start.b; state.n = start.n;
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

    // ---- 10. Listen to the reader ----
    var timer = null;
    function soon() { clearTimeout(timer); timer = setTimeout(update, 300); }
    inF.addEventListener('input', soon);
    inA.addEventListener('input', soon);
    inB.addEventListener('input', soon);
    inN.addEventListener('input', function () { update(false); });
    inT.addEventListener('input', function () { stopTurning(); setAngle(+inT.value); });
    $('.gv-fit').addEventListener('click', function () { if (api) fit(); });
    Array.prototype.forEach.call(box.querySelectorAll('.gv-show'), function (el) {
      el.addEventListener('change', function () { if (api) api.setVisible(el.getAttribute('data-k'), el.checked); });
    });

    // "Rotate": turn the region from 0° to 360° in about four seconds.
    var turning = null;
    function stopTurning() { if (turning) { cancelAnimationFrame(turning); turning = null; rot.textContent = T.rotate; } }
    rot.addEventListener('click', function () {
      if (turning) return stopTurning();
      var t0 = null;
      rot.textContent = T.stop;
      function step(ts) {
        if (t0 === null) t0 = ts;
        var deg = Math.min(360, (ts - t0) / 4000 * 360);
        setAngle(deg);
        if (deg < 360) turning = requestAnimationFrame(step); else stopTurning();
      }
      turning = requestAnimationFrame(step);
    });

    // Settings: the slider's maximum, and the colours.
    inMax.addEventListener('change', function () {
      var m = Math.max(1, Math.min(200, Math.round(num(inMax.value, start.nmax))));
      inMax.value = m; inN.max = m;
      if (+inN.value > m) inN.value = m;
      update(false);
    });
    Array.prototype.forEach.call(box.querySelectorAll('input[type=color]'), function (el) {
      el.addEventListener('input', function () {
        color[el.getAttribute('data-k')] = el.value;
        if (api) { style(el.getAttribute('data-k')); readout(); }
      });
    });

    return { params: params, id: gid, fail: function () { $('#' + gid).textContent = T.failed; } };
  }

  // ---- 11. Load GeoGebra once, then start every widget ----
  function start() {
    var boxes = document.querySelectorAll('.ggb-volume');
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
