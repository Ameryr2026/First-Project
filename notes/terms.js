/* =====================================================================
   المصطلحات (terms.js) — one dictionary of mathematical terms for the whole site.

   Pages do not write the term itself; they write its key, and the site fills in the word
   from the terminology in use. Changing a word here changes it on every page.

   In the text of a page (and inside math):
     {{function}}          اقتران        the word
     {{function.def}}      الاقتران      with ال
     {{function.pl}}       اقترانات      plural
     {{function.defpl}}    الاقترانات    plural with ال
     {{function.sym}}      ق             its letter in equations: $ {{function.sym}}(س) $
     {{function?متصل:متصلة}}             a word that agrees with the term: masculine:feminine
                                          (adjectives, pronouns هو:هي, verbs يكون:تكون)
   A ل written right before a form with ال joins correctly: ل{{function.def}} → للاقتران.

   Which terminology: SITE_REGION below, for the whole site. A page can set its own with
   window.ArabicTermsRegion = 'eg' before this file loads, and ?terms=eg in the address shows a
   page in another terminology (used for the demonstration on the Riemann page).

   To add a terminology: add its name to REGIONS and its column to the terms below. A term
   missing from a column falls back to the default column.
   ===================================================================== */
(function () {
  'use strict';

  var SITE_REGION = 'jo';                 // the terminology used on the site
  var DEFAULT = 'jo';                     // the column used when a term is missing elsewhere
  var REGIONS = { jo: 'الأردن', eg: 'مصر' };

  // g: 'm' or 'f' (grammatical gender). sym: letter in equations (Arabic view); latin: in the Latin view.
  // Every entry should be checked against that country's school textbooks.
  var TERMS = {
    'function':  { en: 'function',
                   jo: { sg: 'اقتران', pl: 'اقترانات', g: 'm', sym: 'ق' },
                   eg: { sg: 'دالة', pl: 'دوال', g: 'f', sym: 'د' },
                   latin: 'f' },
    'limit':     { en: 'limit',          jo: { sg: 'نهاية', pl: 'نهايات', g: 'f' } },
    'derivative':{ en: 'derivative',     jo: { sg: 'مشتقة', pl: 'مشتقات', g: 'f' } },
    'integral':  { en: 'integral',       jo: { sg: 'تكامل', pl: 'تكاملات', g: 'm' } },
    'interval':  { en: 'interval',       jo: { sg: 'فترة', pl: 'فترات', g: 'f' } },
    'partition': { en: 'partition',      jo: { sg: 'تجزئة', pl: 'تجزئات', g: 'f' } },
    'rectangle': { en: 'rectangle',      jo: { sg: 'مستطيل', pl: 'مستطيلات', g: 'm' } },
    'area':      { en: 'area',           jo: { sg: 'مساحة', pl: 'مساحات', g: 'f' } },
    'sum':       { en: 'sum',            jo: { sg: 'مجموع', pl: 'مجاميع', g: 'm' } },
    'riemann-sum': { en: 'Riemann sum',  jo: { sg: 'مجموع ريمان', def: 'مجموع ريمان', pl: 'مجاميع ريمان', g: 'm' } },
    'upper-sum': { en: 'upper sum',      jo: { sg: 'مجموع علوي', def: 'المجموع العلوي', pl: 'مجاميع علوية', g: 'm' } },
    'lower-sum': { en: 'lower sum',      jo: { sg: 'مجموع سفلي', def: 'المجموع السفلي', pl: 'مجاميع سفلية', g: 'm' } },
    'definite-integral': { en: 'definite integral',
                   jo: { sg: 'تكامل محدد', def: 'التكامل المحدد', pl: 'تكاملات محددة', g: 'm' } },
    'volume':    { en: 'volume',         jo: { sg: 'حجم', pl: 'أحجام', g: 'm' } },
    'disc':      { en: 'disc',           jo: { sg: 'قرص', pl: 'أقراص', g: 'm' } },
    'solid-of-revolution': { en: 'solid of revolution',
                   jo: { sg: 'مجسّم دوراني', def: 'المجسّم الدوراني', pl: 'مجسّمات دورانية', g: 'm' } }
  };

  var REGION = SITE_REGION;
  if (window.ArabicTermsRegion && REGIONS[window.ArabicTermsRegion]) REGION = window.ArabicTermsRegion;
  try {
    var q = new URLSearchParams(location.search).get('terms');
    if (q && REGIONS[q]) REGION = q;
  } catch (e) { /* no URL parameters */ }

  function entry(key, region) {
    var t = TERMS[key];
    if (!t) return null;
    return t[region || REGION] || t[DEFAULT];
  }

  // The word for one {{...}} token. mode: 'ar' or 'latin' (the math view, for .sym)
  function word(token, mode, region) {
    var m = /^\s*([\w-]+)(?:\.(\w+))?(?:\?([^:]*):(.*))?\s*$/.exec(token);
    if (!m) return null;
    var key = m[1], form = m[2] || 'sg', e = entry(key, region);
    if (!e) return null;
    if (m[3] !== undefined) return e.g === 'f' ? m[4] : m[3];          // agreement
    switch (form) {
      case 'sg': return e.sg;
      case 'def': return e.def || 'ال' + e.sg;
      case 'pl': return e.pl || e.sg;
      case 'defpl': return e.defpl || 'ال' + (e.pl || e.sg);
      case 'sym': return mode === 'latin' ? (TERMS[key].latin || e.sym) : e.sym;
      case 'en': return TERMS[key].en;
      default: return null;
    }
  }

  // ل + ال...  → لل...   (and ل + الل... → لل...)
  function joinLam(before, w) {
    if (!/(^|[\s(«"'،؛وف])ل$/.test(before) || w.indexOf('ال') !== 0) return w;
    return w.charAt(2) === 'ل' ? w.slice(2) : w.slice(1);
  }

  function expand(s, mode) {
    var out = '', last = 0, re = /\{\{([^{}]+)\}\}/g, m;
    while ((m = re.exec(s))) {
      out += s.slice(last, m.index);
      var w = word(m[1], mode);
      if (w === null) { w = m[0]; console.warn('terms.js: unknown term ' + m[0]); }
      else w = joinLam(out, w);
      out += w;
      last = re.lastIndex;
    }
    return out + s.slice(last);
  }

  // Replace the tokens in every text node under root (math source included, before MathJax reads it).
  function apply(root, mode) {
    root = root || document.body;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), nodes = [], n;
    while ((n = walker.nextNode())) {
      if (n.nodeValue.indexOf('{{') >= 0 && !/^(SCRIPT|STYLE|TEXTAREA|CODE|PRE)$/.test(n.parentNode.nodeName)) nodes.push(n);
    }
    nodes.forEach(function (node) { node.nodeValue = expand(node.nodeValue, mode); });
    var attrs = root.querySelectorAll('[title*="{{"], [alt*="{{"]');
    Array.prototype.forEach.call(attrs, function (el) {
      ['title', 'alt'].forEach(function (a) { if (el.hasAttribute(a)) el.setAttribute(a, expand(el.getAttribute(a), mode)); });
    });
    buildGlossaries(root);
    document.documentElement.setAttribute('data-terms', REGION);
  }

  // <div data-terms-glossary></div> becomes a table of all terms: English, the site's word, other columns.
  function buildGlossaries(root) {
    var boxes = root.querySelectorAll('[data-terms-glossary]');
    Array.prototype.forEach.call(boxes, function (box) {
      var regions = Object.keys(REGIONS);
      var html = '<table class="glossary"><thead><tr><th>English</th>' +
        regions.map(function (r) { return '<th>' + REGIONS[r] + '</th>'; }).join('') + '</tr></thead><tbody>';
      Object.keys(TERMS).sort(function (a, b) { return TERMS[a].en.localeCompare(TERMS[b].en); }).forEach(function (k) {
        html += '<tr><td class="en">' + TERMS[k].en + '</td>' + regions.map(function (r) {
          var own = TERMS[k][r], e = own || TERMS[k][DEFAULT];
          return '<td' + (own ? '' : ' class="same"') + '>' + e.sg + (e.sym ? ' <span class="sym">(' + e.sym + ')</span>' : '') + '</td>';
        }).join('') + '</tr>';
      });
      box.innerHTML = html + '</tbody></table>';
    });
  }

  window.ArabicTerms = {
    region: REGION, regions: REGIONS, terms: TERMS,
    word: word, expand: expand, apply: apply,
    wordIn: function (token, region, mode) { return word(token, mode, region); },   // another terminology (demonstrations)
    keys: function () { return Object.keys(TERMS); }
  };

  // Pages with arabic-math.js call apply() themselves, just before the math is drawn (it knows the view).
  document.addEventListener('DOMContentLoaded', function () {
    if (!window.ArabicMath) apply(document.body, 'ar');
  });
})();
