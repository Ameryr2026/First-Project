/*
 * arabic-math.js — Arabic mathematics on top of MathJax 3 (SVG output), with a reader switch
 * between two notations:
 *
 *   "ar"     Arabic notation: equations read right to left, Arabic letters (س، ص، ق)،
 *            Arabic function names (جا، نهــا)، Arabic-Indic digits, mirrored ∫ ∑ √ ∂.
 *   "latin"  Latin notation inside Arabic text, as in current Jordanian schools: equations
 *            left to right, Latin letters (x, y, f), sin, lim, Western digits.
 *
 * Load this file BEFORE MathJax:
 *   <script src="arabic-math.js?v=N"></script>
 *   <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js" async></script>
 *
 * Authors always write the Arabic form ($ق(س) = س^2$). For the Latin view, each page says
 * which Latin letter each Arabic letter becomes, before loading this file:
 *   window.ArabicMathLatin = { 'س': 'x', 'ص': 'y', 'ق': 'f' };
 * Function names (جا → sin, نهــا → lim, ...) are converted automatically.
 *
 * Your own commands: window.ArabicMathMacros = { name: 'TeX', ... } (Arabic view), and
 * optionally window.ArabicMathMacrosLatin = { name: 'TeX', ... } (Latin view).
 *
 * The switch is added to the page's <nav> automatically. The reader's choice is remembered
 * in their browser; ?math=latin or ?math=ar in the address also selects a view.
 */
(function () {
  'use strict';

  var ARABIC = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿\u{1EE00}-\u{1EEFF}]/u;
  var LETTER = /[A-Za-z؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿\u{1EE00}-\u{1EEFF}]/u;
  var DIGITS = '٠١٢٣٤٥٦٧٨٩';

  // Double-struck Arabic letters (Unicode Arabic Mathematical Alphabetic Symbols).
  // Unicode has no double-struck form for ا, ك, ه.
  var DOUBLE = {'ب': '\u{1EEA1}', 'ج': '\u{1EEA2}', 'د': '\u{1EEA3}', 'و': '\u{1EEA5}', 'ز': '\u{1EEA6}',
    'ح': '\u{1EEA7}', 'ط': '\u{1EEA8}', 'ي': '\u{1EEA9}', 'ل': '\u{1EEAB}', 'م': '\u{1EEAC}', 'ن': '\u{1EEAD}',
    'س': '\u{1EEAE}', 'ع': '\u{1EEAF}', 'ف': '\u{1EEB0}', 'ص': '\u{1EEB1}', 'ق': '\u{1EEB2}', 'ر': '\u{1EEB3}',
    'ش': '\u{1EEB4}', 'ت': '\u{1EEB5}', 'ث': '\u{1EEB6}', 'خ': '\u{1EEB7}', 'ذ': '\u{1EEB8}', 'ض': '\u{1EEB9}',
    'ظ': '\u{1EEBA}', 'غ': '\u{1EEBB}'};

  // Latin view: number sets written with double-struck Arabic letters.
  var DOUBLE_LATIN = {'ح': 'R', 'ط': 'N', 'ص': 'Z', 'ن': 'Q', 'ع': 'C'};
  // Latin view: Arabic words that appear inside equations.
  var WORDS_LATIN = {'نهــا': 'lim', 'نها': 'lim', 'جا': 'sin', 'جتا': 'cos', 'ظا': 'tan', 'ظتا': 'cot',
    'قا': 'sec', 'قتا': 'csc', 'لو': 'log', 'أثر': 'tr'};

  // ---------- Which view? ----------
  var MODE = 'ar';
  try {
    var q = new URLSearchParams(location.search).get('math');
    var saved = localStorage.getItem('arabic-math-mode');
    if (q === 'latin' || q === 'ar') MODE = q;
    else if (saved === 'latin' || saved === 'ar') MODE = saved;
  } catch (e) { /* storage unavailable: default view */ }

  function setMode(m) {
    try { localStorage.setItem('arabic-math-mode', m); } catch (e) {}
    var url = location.href.replace(/([?&])math=(ar|latin)&?/, '$1').replace(/[?&]$/, '');
    location.href = url;
  }

  // Letter map for the Latin view. د defaults to d (as in دص/دس); pages override anything.
  // ---------- The standard letters: Latin ↔ Arabic (one table for the whole site) ----------
  // Sound first, then abjad order (أ ب ج د = a b c d). g, p, v use the letters Arab readers know
  // from foreign words (گ پ ڤ). e is هـ, as in Arab textbooks, because a plain ه looks like ٥.
  // o is left Latin: it looks like ٠, and و means "and".
  var LETTERS = {
    a: 'أ', b: 'ب', c: 'ج', d: 'د', e: 'هـ', f: 'ق', g: 'گ', h: 'ح', i: 'ي', j: 'ط', k: 'ك',
    l: 'ل', m: 'م', n: 'ن', p: 'پ', q: 'ظ', r: 'ر', s: 'ش', t: 'ز', u: 'ع', v: 'ڤ', w: 'ث',
    x: 'س', y: 'ص', z: 'ض'
  };
  // Latin view: Arabic → Latin, from the table above; a page's own ArabicMathLatin wins.
  var LATIN = {};
  Object.keys(LETTERS).forEach(function (l) {
    var ar = LETTERS[l];
    if (ar === 'هـ') { LATIN['ه'] = l; LATIN['ـ'] = ''; } else LATIN[ar] = l;
  });
  function toLatinLetter(c) { return Object.prototype.hasOwnProperty.call(LATIN, c) ? LATIN[c] : c; }
  var pageMap = window.ArabicMathLatin || {};
  for (var a in pageMap) { if (Object.prototype.hasOwnProperty.call(pageMap, a)) LATIN[a] = pageMap[a]; }

  // ---------- Commands ----------
  var macrosAr = {
    // Number sets (\R is the real numbers: double-struck ح)
    R: '\\mathbb{ح}', N: '\\mathbb{N}', Z: '\\mathbb{Z}', Q: '\\mathbb{Q}', C: '\\mathbb{C}',
    nha: '\\mathop{\\text{نهــا}}\\limits',
    ja: '\\mathop{\\text{جا}}\\nolimits', jta: '\\mathop{\\text{جتا}}\\nolimits',
    zha: '\\mathop{\\text{ظا}}\\nolimits', zta: '\\mathop{\\text{ظتا}}\\nolimits',
    qa: '\\mathop{\\text{قا}}\\nolimits', qta: '\\mathop{\\text{قتا}}\\nolimits',
    lo: '\\mathop{\\text{لو}}\\nolimits',
    tr: '\\mathop{\\text{أثر}}\\nolimits',
    // Ordinary derivative: \pd{ص}{س} gives دص/دس, \pd[2]{ص}{س} gives د²ص/دس²
    pd: ['\\frac{\\mathrm{د}^{#1} #2}{\\mathrm{د} #3^{#1}}', 3, ''],
    // Partial derivative, with ∂ mirrored like ∫ and ∑: \ppd{ع}{ز}, \ppd[2]{ع}{س}
    ppd: ['\\frac{\\partial^{#1} #2}{\\partial #3^{#1}}', 3, ''],
    norm: ['\\left\\lVert #1 \\right\\rVert', 1],
    abs: ['\\left\\lvert #1 \\right\\rvert', 1],
    // Arabic word inside an equation, e.g. \nas{في}
    nas: ['\\;\\text{#1}\\;', 1]
  };
  var macrosLatin = {
    R: '\\mathbb{R}', N: '\\mathbb{N}', Z: '\\mathbb{Z}', Q: '\\mathbb{Q}', C: '\\mathbb{C}',
    nha: '\\lim', ja: '\\sin', jta: '\\cos', zha: '\\tan', zta: '\\cot', qa: '\\sec', qta: '\\csc',
    lo: '\\log', tr: '\\operatorname{tr}',
    pd: ['\\frac{d^{#1} #2}{d #3^{#1}}', 3, ''],
    ppd: ['\\frac{\\partial^{#1} #2}{\\partial #3^{#1}}', 3, ''],
    norm: macrosAr.norm, abs: macrosAr.abs, nas: macrosAr.nas
  };
  var macros = MODE === 'latin' ? macrosLatin : macrosAr;
  function addMacros(src) {
    for (var k in src) { if (Object.prototype.hasOwnProperty.call(src, k)) macros[k] = src[k]; }
  }
  addMacros(window.ArabicMathMacros || {});
  if (MODE === 'latin') addMacros(window.ArabicMathMacrosLatin || {});

  function toArabicDigits(s, decimal) {
    s = s.replace(/[0-9]/g, function (d) { return DIGITS[+d]; });
    if (decimal) s = s.replace(/\./g, '٫');
    return s;
  }
  function toWesternDigits(s) {
    return s.replace(/[٠-٩]/g, function (d) { return String(DIGITS.indexOf(d)); }).replace(/٫/g, '.');
  }

  // ---------- Arabic view: rewrite the MathML before drawing ----------
  function arabize(args) {
    (args.data.root || args.math.root).walkTree(function (node) {
      if (!node.isToken) return;
      var kind = node.kind;
      var text = '';
      node.childNodes.forEach(function (child) {
        if (!child.isKind('text')) return;
        var t = child.getText();
        if (node.attributes.getExplicit('mathvariant') === 'double-struck' && ARABIC.test(t)) {
          t = t.replace(/./gu, function (c) { return DOUBLE[c] || c; });
        }
        if (kind === 'mn') t = toArabicDigits(t, true);
        else if (kind === 'mtext') t = toArabicDigits(t, false);
        else if (kind === 'mo') t = t.replace(/,/g, '،').replace(/;/g, '؛');
        child.setText(t);
        text += t;
      });
      if (ARABIC.test(text) && (kind === 'mi' || kind === 'mo')) {
        var mv = node.attributes.getExplicit('mathvariant');
        if (!mv || mv === 'italic' || mv === 'double-struck') node.attributes.set('mathvariant', 'normal');
      }
      // Tokens that must read normally (not mirrored). ∂ stays mirrored, like ∫ and ∑.
      if (kind === 'mi' && text === '∂') return;
      if (kind === 'mi' || kind === 'mn' || kind === 'mtext' ||
          (kind === 'mo' && LETTER.test(text))) {
        node.attributes.set('data-ar-keep', '1');
      }
    });
  }

  // ---------- Latin view: swap Arabic letters for Latin ones ----------
  function latinize(args) {
    (args.data.root || args.math.root).walkTree(function (node) {
      if (!node.isToken) return;
      var kind = node.kind;
      var mv = node.attributes.getExplicit('mathvariant');
      node.childNodes.forEach(function (child) {
        if (!child.isKind('text')) return;
        var t = child.getText();
        var word = t.trim();
        if (WORDS_LATIN[word]) {
          t = WORDS_LATIN[word];
        } else if (mv === 'double-struck') {
          t = t.replace(/./gu, function (c) { return DOUBLE_LATIN[c] || toLatinLetter(c); });
        } else if (kind !== 'mtext') {
          t = t.replace(/./gu, toLatinLetter);
        }
        t = toWesternDigits(t).replace(/،/g, ',').replace(/؛/g, ';');
        child.setText(t);
      });
    });
  }

  // ---------- Arabic command names ----------
  // Write \كسر{أ}{ب} instead of \frac{أ}{ب}. The same names are meant to work in LuaLaTeX,
  // so one source serves both the website and PDFs. "/" is always division. Add your own:
  //   window.ArabicMathCommands = { 'اسم': '\\texcommand' };
  var COMMANDS = {
    // Structure
    'كسر': '\\frac', 'جذر': '\\sqrt', 'نص': '\\text', 'مسافة': '\\quad',
    // Stretchy brackets: \افتح( ... \اغلق)  and  \افتح\{ ... \اغلق.  (named by meaning, not side)
    'افتح': '\\left', 'اغلق': '\\right',
    // Calculus
    'نها': '\\nha', 'الى': '\\to', 'يؤول': '\\to',
    'تكامل': '\\int', 'مجموع': '\\sum', 'جداء': '\\prod', 'لانهاية': '\\infty',
    'مشتقة': '\\pd', 'جزئية': '\\ppd', 'جزء': '\\partial', 'تدرج': '\\nabla', 'لابلاس': '\\Delta',
    // Functions
    'جا': '\\ja', 'جتا': '\\jta', 'ظا': '\\zha', 'ظتا': '\\zta', 'قا': '\\qa', 'قتا': '\\qta', 'لو': '\\lo',
    // Relations and operations
    'لايزيد': '\\le', 'لايقل': '\\ge', 'لايساوي': '\\ne', 'تقريبا': '\\approx',
    'ينتمي': '\\in', 'لاينتمي': '\\notin', 'محتواة': '\\subset', 'اتحاد': '\\cup', 'تقاطع': '\\cap',
    'ضرب': '\\times', 'نقطة': '\\cdot', 'زائدناقص': '\\pm',
    // Arrows, named by reading direction: "forward" points the way the text reads
    // (→ in the Latin view, ← in the Arabic view, where arrows are mirrored).
    'سهم': '\\rightarrow', 'سهمعكسي': '\\leftarrow', 'سهمان': '\\leftrightarrow',
    'سهمطويل': '\\longrightarrow', 'سهممزدوج': '\\Rightarrow', 'سهممزدوجعكسي': '\\Leftarrow',
    'سهممزدوجان': '\\Leftrightarrow', 'يستلزم': '\\implies', 'يستلزممن': '\\impliedby', 'يكافئ': '\\iff',
    'يرسل': '\\mapsto',
    'لكل': '\\forall', 'يوجد': '\\exists',
    // Sets and norms
    'حقيقية': '\\R', 'طبيعية': '\\N', 'صحيحة': '\\Z', 'نسبية': '\\Q', 'مركبة': '\\C',
    'نظيم': '\\norm', 'مطلق': '\\abs',
    // Greek letters
    'الفا': '\\alpha', 'بيتا': '\\beta', 'جاما': '\\gamma', 'دلتا': '\\delta', 'ابسلون': '\\varepsilon',
    'ثيتا': '\\theta', 'لامدا': '\\lambda', 'ميو': '\\mu', 'باي': '\\pi', 'سيجما': '\\sigma',
    'فاي': '\\varphi', 'اوميجا': '\\omega',
    'زيتا': '\\zeta', 'ايتا': '\\eta', 'يوتا': '\\iota', 'كابا': '\\kappa', 'نيو': '\\nu', 'كساي': '\\xi',
    'رو': '\\rho', 'تاو': '\\tau', 'اوبسيلون': '\\upsilon', 'كاي': '\\chi', 'بساي': '\\psi',
    // Capital Greek letters: the name + كبيرة (only those that differ from Latin capitals)
    'جاماكبيرة': '\\Gamma', 'دلتاكبيرة': '\\Delta', 'ثيتاكبيرة': '\\Theta', 'لامداكبيرة': '\\Lambda',
    'كسايكبيرة': '\\Xi', 'بايكبيرة': '\\Pi', 'سيجماكبيرة': '\\Sigma', 'اوبسيلونكبيرة': '\\Upsilon',
    'فايكبيرة': '\\Phi', 'بسايكبيرة': '\\Psi', 'اوميجاكبيرة': '\\Omega'
  };
  function normalizeName(w) { return w.replace(/[أإآ]/g, 'ا').replace(/ـ/g, ''); }
  var CMD = {};
  function addCommands(src) {
    for (var k in src) { if (Object.prototype.hasOwnProperty.call(src, k)) CMD[normalizeName(k)] = src[k]; }
  }
  addCommands(COMMANDS);
  addCommands(window.ArabicMathCommands || {});
  // All Arabic command names as written (for the editor's suggestions).
  var COMMAND_LIST = {};
  [COMMANDS, window.ArabicMathCommands || {}].forEach(function (src) {
    for (var k in src) { if (Object.prototype.hasOwnProperty.call(src, k)) COMMAND_LIST[k] = src[k]; }
  });

  // ---------- Standard LaTeX ↔ Arabic commands (one list for the whole site) ----------
  // The site's own short commands, written as a LaTeX user knows them.
  var STANDARD = {
    '\\nha': '\\lim', '\\ja': '\\sin', '\\jta': '\\cos', '\\zha': '\\tan', '\\zta': '\\cot',
    '\\qa': '\\sec', '\\qta': '\\csc', '\\lo': '\\log', '\\tr': '\\operatorname{tr}',
    '\\pd': '\\frac{d}{dx}', '\\ppd': '\\frac{\\partial}{\\partial x}',
    '\\R': '\\mathbb{R}', '\\N': '\\mathbb{N}', '\\Z': '\\mathbb{Z}', '\\Q': '\\mathbb{Q}', '\\C': '\\mathbb{C}',
    '\\norm': '\\lVert \\cdot \\rVert', '\\abs': '\\lvert \\cdot \\rvert'
  };
  // Other spellings of the same LaTeX command.
  var SAME_AS = {
    '\\leq': '\\le', '\\geq': '\\ge', '\\neq': '\\ne', '\\dfrac': '\\frac', '\\tfrac': '\\frac',
    '\\epsilon': '\\varepsilon', '\\phi': '\\varphi'
  };
  // LaTeX commands left as they are by the converter, because their meaning is ambiguous
  // (\Delta can be the capital letter or the Laplacian).
  var KEEP = { '\\Delta': true };

  function toLatex(tex) { return STANDARD[tex] || tex; }

  // English LaTeX → Arabic name. The first Arabic name listed for a command wins
  // (so \lim → نها, not نهاية; \to → الى, not يؤول).
  var FROM = null;
  function fromLatex(tex) {
    if (!FROM) {
      FROM = {};
      Object.keys(COMMAND_LIST).forEach(function (name) {
        var t = COMMAND_LIST[name];
        if (!(toLatex(t) in FROM)) FROM[toLatex(t)] = name;
        if (!(t in FROM)) FROM[t] = name;
      });
    }
    tex = SAME_AS[tex] || tex;
    if (KEEP[tex]) return null;
    return FROM[tex] || null;
  }

  // Replace \اسم with the TeX command. Longest known name wins, so \جاس reads as \جا س.
  // ---------- Environments: \بداية{مصفوفة} ... \نهاية{مصفوفة} ----------
  var ENVIRONMENTS = {
    'مصفوفة': 'bmatrix', 'مصفوفةقوسين': 'pmatrix', 'محدد': 'vmatrix', 'مصفوفةمجردة': 'matrix',
    'حالات': 'cases', 'جدول': 'array',
    'معادلة': 'equation', 'معادلةبلارقم': 'equation*',
    'محاذاة': 'align', 'محاذاةبلارقم': 'align*', 'محاذاةداخلية': 'aligned', 'تقسيم': 'split',
    'تجميع': 'gather', 'تجميعبلارقم': 'gather*'
  };
  var envExtra = window.ArabicMathEnvironments || {};
  for (var ek in envExtra) { if (Object.prototype.hasOwnProperty.call(envExtra, ek)) ENVIRONMENTS[ek] = envExtra[ek]; }
  var ENV_FROM = {};
  Object.keys(ENVIRONMENTS).forEach(function (a) { if (!(ENVIRONMENTS[a] in ENV_FROM)) ENV_FROM[ENVIRONMENTS[a]] = a; });

  function arabicEnvironments(text) {
    return text.replace(/\\(بداية|نهاية)\s*\{\s*([^{}]+?)\s*\}/g, function (m, which, name) {
      var env = ENVIRONMENTS[normalizeName(name)] || ENVIRONMENTS[name];
      if (!env) return m;
      return (which === 'بداية' ? '\\begin{' : '\\end{') + env + '}';
    });
  }
  // MathJax looks for \begin{...} in the page text to find math, so translate environment
  // names in the text itself before MathJax reads it.
  function translateEnvironments(root) {
    var walker = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var p = n.parentNode && n.parentNode.nodeName;
        if (p === 'SCRIPT' || p === 'STYLE' || p === 'TEXTAREA' || p === 'CODE' || p === 'PRE') return NodeFilter.FILTER_REJECT;
        return n.nodeValue.indexOf('\\') >= 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      }
    });
    var list = [], n;
    while ((n = walker.nextNode())) list.push(n);
    list.forEach(function (t) { var v = arabicEnvironments(t.nodeValue); if (v !== t.nodeValue) t.nodeValue = v; });
  }

  function arabicCommands(args) {
    args.math.math = args.math.math.replace(/\\([ء-يـ]+)/g, function (m, word) {
      for (var n = word.length; n > 0; n--) {
        var tex = CMD[normalizeName(word.slice(0, n))];
        if (tex) {
          var rest = word.slice(n);
          return tex + (rest ? ' ' + rest : ' ');
        }
      }
      return m;   // unknown name: left as is, and MathJax reports it
    });
  }

  // Latin view, step 1: convert the TeX source itself, so Arabic letters become ordinary
  // TeX letters (italic variables). Arabic words inside \text{} and \nas{} are kept.
  function latinizeSource(args) {
    var src = args.math.math;
    // \mathbb{ح} → \mathbb{R}, etc.
    src = src.replace(/\\mathbb\s*\{([^{}]*)\}/g, function (m, inner) {
      return '\\mathbb{' + inner.replace(/./gu, function (c) { return DOUBLE_LATIN[c] || toLatinLetter(c); }) + '}';
    });
    // Convert everything outside \text{...} / \nas{...}.
    var out = '', i = 0, re = /\\(?:text|nas|mbox|textrm)\s*\{/g, m;
    function conv(s) {
      return toWesternDigits(s).replace(/،/g, ',').replace(/؛/g, ';')
        .replace(/./gu, toLatinLetter);
    }
    while ((m = re.exec(src))) {
      out += conv(src.slice(i, m.index));
      var depth = 1, j = re.lastIndex;
      while (j < src.length && depth) { if (src[j] === '{') depth++; else if (src[j] === '}') depth--; j++; }
      out += src.slice(m.index, j);
      i = re.lastIndex = j;
    }
    out += conv(src.slice(i));
    args.math.math = out;
  }

  // ---------- Arabic view: mirror the drawn equation ----------
  function mirror(container) {
    var svg = container.querySelector('svg');
    if (!svg || svg.getAttribute('data-ar-done')) return;
    svg.setAttribute('data-ar-done', '1');
    svg.style.transform = 'scaleX(-1)';
    var keep = svg.querySelectorAll('[data-ar-keep]');
    for (var i = 0; i < keep.length; i++) {
      var g = keep[i];
      var b = g.getBBox();
      var cx = b.x + b.width / 2;
      var t = g.getAttribute('transform') || '';
      g.setAttribute('transform', (t + ' translate(' + (2 * cx) + ',0) scale(-1,1)').trim());
    }
  }
  function mirrorAll(root) {
    if (MODE !== 'ar') return;
    var list = (root || document).querySelectorAll('mjx-container');
    for (var i = 0; i < list.length; i++) mirror(list[i]);
  }

  // ---------- The switch ----------
  function addSwitch() {
    var box = document.createElement('span');
    box.className = 'math-switch';
    box.setAttribute('role', 'group');
    box.setAttribute('aria-label', 'طريقة كتابة الرموز');
    [['ar', 'رموز عربية'], ['latin', 'رموز لاتينية']].forEach(function (opt) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = opt[1];
      b.setAttribute('aria-pressed', MODE === opt[0] ? 'true' : 'false');
      if (MODE !== opt[0]) b.addEventListener('click', function () { setMode(opt[0]); });
      box.appendChild(b);
    });
    var nav = document.querySelector('nav .inner') || document.querySelector('nav');
    if (nav) nav.appendChild(box);
    else { box.classList.add('floating'); document.body.appendChild(box); }
  }

  var css = document.createElement('style');
  css.textContent =
    // MathJax sizes equations by the surrounding font's letter height. Arabic fonts report
    // unusual heights that make the math far too big, so measure against a Latin serif.
    'mjx-container[jax="SVG"], mjx-test { font-family: "Times New Roman", "Liberation Serif", serif; }' +
    // Wide equations scroll inside their own box on small screens instead of widening the page.
    'mjx-container[jax="SVG"][display="true"] { min-width: 0 !important; max-width: 100%;' +
    ' overflow-x: auto; overflow-y: hidden; }' +
    'mjx-container[jax="SVG"] { position: relative; }' +
    '.math-switch { display: inline-flex; border: 1px solid currentColor; border-radius: 999px; overflow: hidden;' +
    ' font-size: 13px; opacity: .85; margin-inline-start: 4px; }' +
    '.math-switch button { font: inherit; color: inherit; background: none; border: 0; padding: 2px 10px; cursor: pointer; }' +
    '.math-switch button[aria-pressed="true"] { background: var(--text, #1f2328); color: var(--bg, #fff);' +
    ' cursor: default; }' +
    '.math-switch.floating { position: fixed; top: 10px; left: 10px; z-index: 50; background: var(--bg, #fff); }';
  document.head.appendChild(css);
  document.documentElement.setAttribute('data-math-mode', MODE);

  // ---------- MathJax configuration ----------
  window.MathJax = {
    tex: {
      inlineMath: [['$', '$'], ['\\(', '\\)']],
      displayMath: [['$$', '$$'], ['\\[', '\\]']],
      tags: 'ams',
      macros: macros
    },
    svg: {
      fontCache: 'local',
      mtextInheritFont: false,
      mtextFont: '"Noto Naskh Arabic", "Noto Sans Math", "Amiri", serif',
      unknownFamily: '"Noto Naskh Arabic", "Noto Sans Math", "Amiri", serif'
    },
    options: { enableMenu: false },
    startup: {
      typeset: false,
      ready: function () {
        MathJax.startup.defaultReady();
        var tex = MathJax.startup.document.inputJax[0];
        tex.preFilters.add(arabicCommands, 50);   // runs before the Latin conversion
        if (MODE === 'latin') {
          tex.preFilters.add(latinizeSource, 100);
          tex.postFilters.add(latinize, 100);   // catches Arabic coming from page commands
        } else {
          tex.postFilters.add(arabize, 100);
        }
      },
      pageReady: function () {
        addSwitch();
        // Wait for the fonts so MathJax measures letters with the right widths.
        var fontsReady = Promise.resolve();
        if (document.fonts && document.fonts.load) {
          fontsReady = Promise.all([
            document.fonts.load('1em "Noto Naskh Arabic"', 'ح'),
            document.fonts.load('700 1em "Noto Naskh Arabic"', 'ح'),
            document.fonts.load('1em "Noto Sans Math"', '\u{1EEA7}')
          ]).catch(function () {}).then(function () { return document.fonts.ready; });
        }
        return fontsReady
          .then(function () { translateEnvironments(document.body); return MathJax.typesetPromise(); })
          .then(function () { mirrorAll(); document.documentElement.setAttribute('data-math-ready', '1'); });
      }
    }
  };

  // For content added later: ArabicMath.typeset(element)
  window.ArabicMath = {
    mode: MODE,
    commands: COMMAND_LIST,
    letters: LETTERS,       // 'x' → 'س'
    toLatex: toLatex,       // '\\nha' → '\\lim'
    fromLatex: fromLatex,   // '\\frac' → 'كسر', '\\mathbb{R}' → 'حقيقية'
    setMode: setMode,
    environments: ENVIRONMENTS,
    environmentFromLatex: function (env) { return ENV_FROM[env] || null; },
    typeset: function (el) {
      translateEnvironments(el || document.body);
      return MathJax.typesetPromise(el ? [el] : undefined).then(function () { mirrorAll(el); });
    }
  };
})();
