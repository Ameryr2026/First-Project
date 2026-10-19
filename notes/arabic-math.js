/*
 * arabic-math.js — right-to-left Arabic mathematics on top of MathJax 3 (SVG output).
 *
 * Load this file BEFORE MathJax:
 *   <script src="arabic-math.js"></script>
 *   <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js" async></script>
 *
 * What it does:
 *   1. Every equation is mirrored as a whole, so it reads right to left. Operators and
 *      structural symbols (∫ ∑ √, brackets, arrows, < >) come out mirrored, as in Arabic notation.
 *   2. Letters, numbers and words are mirrored back, so they read normally.
 *   3. Western digits become Arabic-Indic digits (12.5 → ١٢٫٥), the comma becomes ، and ; becomes ؛.
 *   4. Arabic letters are set upright (not slanted).
 *
 * Your own symbols: before loading this file, define
 *   window.ArabicMathMacros = { name: 'TeX definition', ... };
 * Each entry becomes a command \name usable in any equation on that page.
 */
(function () {
  'use strict';

  var ARABIC = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;
  var LETTER = /[A-Za-z؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;
  var DIGITS = '٠١٢٣٤٥٦٧٨٩';

  // Default commands (Arabic school notation). Extend or override per page.
  var macros = {
    // Number sets (\\R is the real numbers: bold ح)
    R: '\\mathbf{ح}', N: '\\mathbb{N}', Z: '\\mathbb{Z}', Q: '\\mathbb{Q}', C: '\\mathbb{C}',
    // Limit
    nha: '\\mathop{\\text{نهــا}}\\limits',
    // Trigonometric functions
    ja: '\\mathop{\\text{جا}}\\nolimits', jta: '\\mathop{\\text{جتا}}\\nolimits',
    zha: '\\mathop{\\text{ظا}}\\nolimits', zta: '\\mathop{\\text{ظتا}}\\nolimits',
    qa: '\\mathop{\\text{قا}}\\nolimits', qta: '\\mathop{\\text{قتا}}\\nolimits',
    // Logarithm
    lo: '\\mathop{\\text{لو}}\\nolimits',
    // Derivatives: \partial shows as د; \pd{ص}{س} gives the long form دص/دس,
    // \pd[2]{ص}{س} gives د²ص/دس²
    partial: '\\mathrm{د}',
    pd: ['\\frac{\\mathrm{د}^{#1} #2}{\\mathrm{د} #3^{#1}}', 3, ''],
    // Norm and absolute value
    norm: ['\\left\\lVert #1 \\right\\rVert', 1],
    abs: ['\\left\\lvert #1 \\right\\rvert', 1],
    // Arabic text inside math, e.g. \nas{حيث}
    nas: ['\\;\\text{#1}\\;', 1]
  };
  var extra = window.ArabicMathMacros || {};
  for (var k in extra) { if (Object.prototype.hasOwnProperty.call(extra, k)) macros[k] = extra[k]; }

  function toArabicDigits(s, decimal) {
    s = s.replace(/[0-9]/g, function (d) { return DIGITS[+d]; });
    if (decimal) s = s.replace(/\./g, '٫');
    return s;
  }

  // Runs on the MathML tree after TeX is parsed, before anything is drawn.
  function arabize(args) {
    (args.data.root || args.math.root).walkTree(function (node) {
      if (!node.isToken) return;
      var kind = node.kind;
      var text = '';
      node.childNodes.forEach(function (child) {
        if (!child.isKind('text')) return;
        var t = child.getText();
        if (kind === 'mn') t = toArabicDigits(t, true);
        else if (kind === 'mtext') t = toArabicDigits(t, false);
        else if (kind === 'mo') t = t.replace(/,/g, '،').replace(/;/g, '؛');
        child.setText(t);
        text += t;
      });
      if (ARABIC.test(text) && (kind === 'mi' || kind === 'mo')) {
        var mv = node.attributes.getExplicit('mathvariant');
        if (!mv || mv === 'italic') node.attributes.set('mathvariant', 'normal');
      }
      // Tokens that must read normally (not mirrored).
      if (kind === 'mi' || kind === 'mn' || kind === 'mtext' ||
          (kind === 'mo' && LETTER.test(text))) {
        node.attributes.set('data-ar-keep', '1');
      }
    });
  }

  // Runs on the drawn SVG: mirror the whole equation, then mirror readable tokens back.
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
    var list = (root || document).querySelectorAll('mjx-container');
    for (var i = 0; i < list.length; i++) mirror(list[i]);
  }

  window.MathJax = {
    tex: {
      inlineMath: [['$', '$'], ['\\(', '\\)']],
      displayMath: [['$$', '$$'], ['\\[', '\\]']],
      tags: 'ams',
      macros: macros
    },
    svg: {
      fontCache: 'local',
      mtextInheritFont: true,
      unknownFamily: '"Noto Naskh Arabic", "Amiri", serif'
    },
    options: { enableMenu: false },
    startup: {
      typeset: false,
      ready: function () {
        MathJax.startup.defaultReady();
        MathJax.startup.document.inputJax[0].postFilters.add(arabize, 100);
      },
      pageReady: function () {
        // Wait for the Arabic font so MathJax measures letters with the right widths.
        var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
        return fontsReady
          .then(function () { return MathJax.typesetPromise(); })
          .then(function () { mirrorAll(); document.documentElement.setAttribute('data-math-ready', '1'); });
      }
    }
  };

  // For content added later: ArabicMath.typeset(element)
  window.ArabicMath = {
    typeset: function (el) {
      return MathJax.typesetPromise(el ? [el] : undefined).then(function () { mirrorAll(el); });
    }
  };
})();
