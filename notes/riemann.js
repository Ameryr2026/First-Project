/*
 * riemann.js — an interactive Riemann sum.
 *
 * Write, anywhere in the page:
 *   <div class="riemann" data-f="س^2" data-a="0" data-b="2" data-n="6"></div>
 *
 * The reader can change the function, the bounds أ and ب, the number of rectangles ن,
 * and the sum (lower / upper / both / midpoint). data-fn="en" takes the function in English on an
 * Arabic page. The function may be written in Arabic or in English:
 *   س^2 + 1     x^2 + 1     جا س     sin(x)     هـ^س     e^x     2س + 3     جذر(س)
 */
(function () {
  'use strict';

  // ---------- A small, safe expression reader (no eval) ----------
  var FUNCS = {
    sin: Math.sin, cos: Math.cos, tan: Math.tan, exp: Math.exp, ln: Math.log, log: Math.log10,
    sqrt: Math.sqrt, abs: Math.abs, asin: Math.asin, acos: Math.acos, atan: Math.atan
  };
  // Arabic names → the names above. Longer names first (جتا before جا).
  var ARABIC_WORDS = [['جتا', 'cos'], ['ظتا', 'cot'], ['جا', 'sin'], ['ظا', 'tan'], ['لو', 'log'],
                      ['لن', 'ln'], ['جذر', 'sqrt'], ['مطلق', 'abs'], ['هـ', 'e'], ['باي', 'pi']];
  FUNCS.cot = function (t) { return 1 / Math.tan(t); };

  var MSG = {
    ar: { unknownSymbol: 'رمز غير مفهوم', expected: 'متوقّع', incomplete: 'المعادلة ناقصة', unknown: 'لا أعرف',
          extra: 'رمز زائد', order: 'يجب أن يكون أ أصغر من ب' },
    en: { unknownSymbol: 'Unknown symbol', expected: 'Expected', incomplete: 'The expression is incomplete',
          unknown: 'Unknown name', extra: 'Unexpected', order: 'a must be less than b' }
  };
  var Q = { ar: ['«', '»'], en: ['“', '”'] };

  function compile(text, lang) {
    var M = MSG[lang] || MSG.ar, q = Q[lang] || Q.ar;
    function quote(x) { return q[0] + x + q[1]; }
    var s = String(text).replace(/[٠-٩]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(d); })
      .replace(/٫/g, '.').replace(/[×·]/g, '*').replace(/÷/g, '/').replace(/[−–]/g, '-').replace(/π/g, 'pi');
    ARABIC_WORDS.forEach(function (w) { s = s.split(w[0]).join(' ' + w[1] + ' '); });
    s = s.replace(/س/g, ' x ');

    var toks = [], re = /\s*(\d+\.?\d*|\.\d+|[A-Za-z]+|[-+*/^(),])/y, m, pos = 0;
    s = s.trim();
    while (pos < s.length) {
      re.lastIndex = pos;
      m = re.exec(s);
      if (!m) throw new Error(M.unknownSymbol + ': ' + quote(s.slice(pos).trim().charAt(0)));
      toks.push(m[1]); pos = re.lastIndex;
      while (pos < s.length && s[pos] === ' ') pos++;
    }
    var i = 0;
    function peek() { return toks[i]; }
    function take(t) { if (toks[i] !== t) throw new Error(M.expected + ' ' + quote(t)); i++; }
    function startsAtom(t) { return t !== undefined && (/^[\d.A-Za-z(]/.test(t)); }

    function expr() {                       // a + b - c
      var f = term();
      while (peek() === '+' || peek() === '-') {
        var op = toks[i++], g = term(), a = f;
        f = op === '+' ? function (x) { return a(x) + g(x); } : function (x) { return a(x) - g(x); };
      }
      return f;
    }
    function term() {                       // a * b / c, and 2x (implicit)
      var f = unary();
      for (;;) {
        var t = peek();
        if (t === '*' || t === '/') {
          i++; var g = unary(), a = f;
          f = t === '*' ? function (x) { return a(x) * g(x); } : function (x) { return a(x) / g(x); };
        } else if (startsAtom(t)) {
          var h = unary(), b = f;
          f = function (x) { return b(x) * h(x); };
        } else return f;
      }
    }
    function unary() {
      if (peek() === '-') { i++; var g = unary(); return function (x) { return -g(x); }; }
      if (peek() === '+') { i++; return unary(); }
      return power();
    }
    function power() {                      // a ^ b (right to left)
      var base = atom();
      if (peek() === '^') { i++; var e = unary(); return function (x) { return Math.pow(base(x), e(x)); }; }
      return base;
    }
    function atom() {
      var t = toks[i++];
      if (t === undefined) throw new Error(M.incomplete);
      if (/^[\d.]/.test(t)) { var v = parseFloat(t); return function () { return v; }; }
      if (t === '(') { var f = expr(); take(')'); return f; }
      if (t === 'x') return function (x) { return x; };
      if (t === 'pi') return function () { return Math.PI; };
      if (t === 'e') return function () { return Math.E; };
      if (FUNCS[t]) {
        var fn = FUNCS[t], arg, ex = null;
        if (peek() === '^') { i++; ex = unary(); }        // جا^2 س = (جا س)^2
        if (peek() === '(') { i++; arg = expr(); take(')'); } else arg = power();
        if (ex) return function (x) { return Math.pow(fn(arg(x)), ex(x)); };
        return function (x) { return fn(arg(x)); };
      }
      throw new Error(M.unknown + ': ' + quote(t));
    }
    var f = expr();
    if (i < toks.length) throw new Error(M.extra + ': ' + quote(toks[i]));
    return f;
  }

  // ---------- Numbers in the page's digits ----------
  var LANG = 'ar';   // set per box when drawing
  function arabicDigits() { return LANG !== 'en' && !(window.ArabicMath && ArabicMath.mode === 'latin'); }
  function fmt(v) {
    if (!isFinite(v)) return '—';
    var s = (Math.abs(v) < 1e-12 ? 0 : v).toFixed(4).replace(/\.?0+$/, '');
    if (!arabicDigits()) return s;
    return s.replace(/\d/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'[d]; }).replace('.', '٫').replace('-', '−');
  }

  // Accurate integral (Simpson's rule, many pieces) for comparison.
  function integral(f, a, b) {
    var n = 2000, h = (b - a) / n, s = f(a) + f(b);
    for (var k = 1; k < n; k++) s += f(a + k * h) * (k % 2 ? 4 : 2);
    return s * h / 3;
  }

  var NS = 'http://www.w3.org/2000/svg';
  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  var css = document.createElement('style');
  css.textContent =
    '.riemann { margin: 20px 0; padding: 14px; border: 1px solid var(--rule, #e3e0d8); border-radius: 10px;' +
    ' background: var(--box, #f2f0ea); }' +
    '.riemann .rs-controls { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px 14px;' +
    ' align-items: end; margin-bottom: 10px; }' +
    '.riemann label { display: block; font-size: 15px; color: var(--muted, #5b6470); }' +
    '.riemann input, .riemann select { width: 100%; font: inherit; font-size: 17px; padding: 3px 8px; border-radius: 6px;' +
    ' border: 1px solid var(--rule, #e3e0d8); background: var(--bg, #fff); color: var(--text, #1f2328); }' +
    '.riemann input.rs-f { direction: rtl; }' +
    '.riemann[data-lang="en"] input.rs-f { direction: ltr; }' +
    '.riemann input[type=range] { padding: 0; }' +
    '.riemann .rs-wide { grid-column: 1 / -1; }' +
    '.riemann svg { display: block; width: 100%; height: auto; background: var(--bg, #fff); border-radius: 6px;' +
    ' direction: ltr; }' +
    '.riemann .rs-out { display: flex; flex-wrap: wrap; gap: 6px 22px; margin-top: 10px; font-size: 17px; }' +
    '.riemann .rs-out b { font-weight: 700; }' +
    '.riemann .rs-err { color: #b42318; font-size: 15px; min-height: 1.4em; }';
  document.head.appendChild(css);

  function build(box) {
    var state = {
      f: box.getAttribute('data-f') || 'س^2',
      a: parseFloat(box.getAttribute('data-a') || '0'),
      b: parseFloat(box.getAttribute('data-b') || '2'),
      n: parseInt(box.getAttribute('data-n') || '6', 10),
      rule: box.getAttribute('data-rule') || 'lower'
    };
    var DEFAULT_WORDS = { '{{function.def}}': 'الاقتران', '{{function.sym}}': 'ق', '{{rectangle.defpl}}': 'المستطيلات',
      '{{sum.def}}': 'المجموع', '{{lower-sum.def}}': 'المجموع السفلي', '{{upper-sum.def}}': 'المجموع العلوي',
      '{{riemann-sum}}': 'مجموع ريمان', '{{integral.def}}': 'التكامل' };
    var lang = box.getAttribute('data-lang') === 'en' ? 'en' : 'ar';
    var TXT = lang === 'en'
      ? { f: 'f(x) =', a: 'Lower bound a', b: 'Upper bound b', n: 'Number of rectangles n = ',
          rule: 'Sum', lower: 'Lower sum', upper: 'Upper sum', both: 'Upper and lower', mid: 'Midpoint sum',
          sum: 'Riemann sum', lowerSum: 'Lower sum', upperSum: 'Upper sum', integral: 'Integral',
          diff: 'Difference', gap: 'Upper − lower', aria: 'Riemann sum graph' }
      : { f: '{{function.def}} {{function.sym}}(س) =', a: 'الحد الأدنى أ', b: 'الحد الأعلى ب', n: 'عدد {{rectangle.defpl}} ن = ',
          rule: '{{sum.def}}', lower: '{{lower-sum.def}}', upper: '{{upper-sum.def}}', both: 'العلوي والسفلي معًا',
          mid: 'مجموع المنتصف', sum: '{{riemann-sum}}', lowerSum: '{{lower-sum.def}}', upperSum: '{{upper-sum.def}}',
          integral: '{{integral.def}}', diff: 'الفرق', gap: 'العلوي − السفلي', aria: 'رسم {{riemann-sum}}' };
    // data-fn="en": the function is typed in English (f(x) = x^2) even on an Arabic page.
    var fnEnglish = lang === 'en' || box.getAttribute('data-fn') === 'en';
    if (fnEnglish && lang !== 'en') TXT.f = '{{function.def}} f(x) =';
    // Arabic labels use the site's terminology (terms.js); without it, the default words.
    for (var k in TXT) {
      TXT[k] = window.ArabicTerms ? ArabicTerms.expand(TXT[k], 'ar')
        : TXT[k].replace(/\{\{[^}]+\}\}/g, function (t) { return DEFAULT_WORDS[t] || ''; });
    }
    if (lang === 'en') box.setAttribute('dir', 'ltr');
    box.innerHTML =
      '<div class="rs-controls">' +
      '  <div class="rs-wide"><label>' + TXT.f + '</label><input class="rs-f" spellcheck="false"></div>' +
      '  <div><label>' + TXT.a + '</label><input class="rs-a" type="number" step="any"></div>' +
      '  <div><label>' + TXT.b + '</label><input class="rs-b" type="number" step="any"></div>' +
      '  <div><label>' + TXT.n + '<span class="rs-nv"></span></label><input class="rs-n" type="range" min="1" max="100"></div>' +
      '  <div><label>' + TXT.rule + '</label><select class="rs-rule">' +
      '    <option value="lower">' + TXT.lower + '</option><option value="upper">' + TXT.upper + '</option>' +
      '    <option value="both">' + TXT.both + '</option><option value="mid">' + TXT.mid + '</option></select></div>' +
      '</div>' +
      '<div class="rs-err" role="alert"></div>' +
      '<svg viewBox="0 0 640 360" role="img" aria-label="' + TXT.aria + '"></svg>' +
      '<div class="rs-out"></div>';
    var q = function (c) { return box.querySelector(c); };
    var fIn = q('.rs-f'), aIn = q('.rs-a'), bIn = q('.rs-b'), nIn = q('.rs-n'), ruleIn = q('.rs-rule');
    var nv = q('.rs-nv'), err = q('.rs-err'), svg = q('svg'), out = q('.rs-out');
    if (fnEnglish) fIn.setAttribute('dir', 'ltr');
    fIn.value = state.f; aIn.value = state.a; bIn.value = state.b; nIn.value = state.n; ruleIn.value = state.rule;

    function draw() {
      var f;
      LANG = lang;
      try { f = compile(fIn.value, lang); err.textContent = ''; }
      catch (e) { err.textContent = e.message; return; }
      var a = parseFloat(aIn.value), b = parseFloat(bIn.value), n = parseInt(nIn.value, 10), rule = ruleIn.value;
      nv.textContent = arabicDigits() ? String(n).replace(/\d/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'[d]; }) : n;
      if (!isFinite(a) || !isFinite(b) || a >= b) { err.textContent = MSG[lang].order; return; }

      // View: a little room around [a, b], and around the curve's values.
      var pad = (b - a) * 0.12, x0 = a - pad, x1 = b + pad, ys = [0];
      for (var k = 0; k <= 400; k++) { var y = f(x0 + (x1 - x0) * k / 400); if (isFinite(y)) ys.push(y); }
      var y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
      if (y1 - y0 < 1e-9) { y1 += 1; y0 -= 1; }
      var yp = (y1 - y0) * 0.1; y0 -= yp; y1 += yp;
      var W = 640, H = 360, L = 10, R = 10, T = 10, B = 10;
      var X = function (x) { return L + (x - x0) / (x1 - x0) * (W - L - R); };
      var Y = function (y) { return H - B - (y - y0) / (y1 - y0) * (H - T - B); };

      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var cs = getComputedStyle(box);
      var ink = cs.getPropertyValue('--text').trim() || '#1f2328';
      var accent = cs.getPropertyValue('--accent').trim() || '#0c4a6e';
      var muted = cs.getPropertyValue('--rule').trim() || '#e3e0d8';

      // Axes
      if (y0 < 0 && y1 > 0) el('line', { x1: 0, x2: W, y1: Y(0), y2: Y(0), stroke: ink, 'stroke-width': 1, opacity: .6 }, svg);
      if (x0 < 0 && x1 > 0) el('line', { x1: X(0), x2: X(0), y1: 0, y2: H, stroke: ink, 'stroke-width': 1, opacity: .6 }, svg);

      // Rectangles. Upper / lower sums use the largest / smallest value of f on each piece,
      // found by sampling the piece finely (exact for functions that only rise or only fall there).
      var dx = (b - a) / n, lowerS = 0, upperS = 0, midS = 0, m = Math.max(24, Math.ceil(3000 / n));
      function rect(xl, h, strong) {
        el('rect', {
          x: X(xl), width: Math.max(0, X(xl + dx) - X(xl)),
          y: Math.min(Y(h), Y(0)), height: Math.abs(Y(h) - Y(0)),
          fill: h >= 0 ? accent : '#d97706', 'fill-opacity': strong ? .28 : .1,
          stroke: h >= 0 ? accent : '#d97706', 'stroke-width': 1, 'stroke-dasharray': strong ? '' : '3 2'
        }, svg);
      }
      function dot(x, h) {
        el('circle', { cx: X(x), cy: Y(h), r: n > 40 ? 1.5 : 3, fill: h >= 0 ? accent : '#d97706' }, svg);
      }
      for (var j = 0; j < n; j++) {
        var xl = a + j * dx, lo = Infinity, hi = -Infinity, xlo = xl, xhi = xl;
        for (var t = 0; t <= m; t++) {
          var xt = xl + dx * t / m, v = f(xt);
          if (!isFinite(v)) continue;
          if (v < lo) { lo = v; xlo = xt; }
          if (v > hi) { hi = v; xhi = xt; }
        }
        if (!isFinite(lo)) continue;
        var hm = f(xl + dx / 2);
        lowerS += lo * dx; upperS += hi * dx; if (isFinite(hm)) midS += hm * dx;
        if (rule === 'both') { rect(xl, hi, false); rect(xl, lo, true); dot(xhi, hi); dot(xlo, lo); }
        else if (rule === 'upper') { rect(xl, hi, true); dot(xhi, hi); }
        else if (rule === 'mid') { if (isFinite(hm)) { rect(xl, hm, true); dot(xl + dx / 2, hm); } }
        else { rect(xl, lo, true); dot(xlo, lo); }
      }
      // Bounds
      [a, b].forEach(function (x) {
        el('line', { x1: X(x), x2: X(x), y1: 0, y2: H, stroke: muted, 'stroke-dasharray': '4 4' }, svg);
      });
      // Curve
      var d = '', pen = false;
      for (var k2 = 0; k2 <= 600; k2++) {
        var xx = x0 + (x1 - x0) * k2 / 600, yy = f(xx);
        if (!isFinite(yy) || yy < y0 - (y1 - y0) || yy > y1 + (y1 - y0)) { pen = false; continue; }
        d += (pen ? 'L' : 'M') + X(xx).toFixed(1) + ' ' + Y(yy).toFixed(1) + ' ';
        pen = true;
      }
      el('path', { d: d, fill: 'none', stroke: ink, 'stroke-width': 2 }, svg);

      var I = integral(f, a, b);
      out.innerHTML = '';
      var rows = rule === 'both' ? [[TXT.lowerSum, lowerS], [TXT.upperSum, upperS], [TXT.integral, I], [TXT.gap, upperS - lowerS]]
        : rule === 'upper' ? [[TXT.upperSum, upperS], [TXT.integral, I], [TXT.diff, upperS - I]]
        : rule === 'mid' ? [[TXT.mid, midS], [TXT.integral, I], [TXT.diff, midS - I]]
        : [[TXT.lowerSum, lowerS], [TXT.integral, I], [TXT.diff, lowerS - I]];
      rows.forEach(function (p) {
        var s = document.createElement('span');
        s.innerHTML = p[0] + ': <b></b>';
        s.querySelector('b').textContent = fmt(p[1]);
        out.appendChild(s);
      });
    }
    [fIn, aIn, bIn, nIn, ruleIn].forEach(function (inp) { inp.addEventListener('input', draw); });
    draw();
  }

  function start() {
    var list = document.querySelectorAll('.riemann');
    for (var i = 0; i < list.length; i++) build(list[i]);
  }
  window.RiemannCompile = compile;   // for testing
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
