/*
 * geogebra.js — GeoGebra activities in a page.
 *
 * Write, anywhere in the page:
 *   <div class="geogebra" data-id="mpufvzus"></div>
 * where data-id is the part after geogebra.org/m/ in the activity's address.
 *
 * Optional settings on the same tag:
 *   data-width="800" data-height="500"   the activity's own size (it is scaled to fit the page)
 *   data-lang="ar"                       interface language (default: ar)
 *   data-toolbar="true"                  show GeoGebra's toolbar   (default: hidden)
 *   data-menu="true"                     show the menu bar         (default: hidden)
 *   data-input="true"                    show the input bar        (default: hidden)
 *   data-reset="false"                   hide the reset button     (default: shown)
 *
 * The activity must be shared (public or "shared with link") on geogebra.org.
 * If GeoGebra's script cannot load, the activity is shown in a simple frame instead.
 */
(function () {
  'use strict';

  var SCRIPT = 'https://www.geogebra.org/apps/deployggb.js';

  var css = document.createElement('style');
  css.textContent =
    '.geogebra { width: 100%; max-width: 100%; margin: 20px 0; direction: ltr; }' +
    '.geogebra iframe { display: block; width: 100%; border: 0; }' +
    '.geogebra .ggb-note { font-size: 14px; color: var(--muted, #5b6470); direction: rtl; }';
  document.head.appendChild(css);

  function flag(el, name, dflt) {
    var v = el.getAttribute('data-' + name);
    return v === null ? dflt : v === 'true';
  }

  // Simple frame, used when the GeoGebra script is not available.
  function frame(el) {
    var id = el.getAttribute('data-id');
    var w = +el.getAttribute('data-width') || 800, h = +el.getAttribute('data-height') || 500;
    var opts = '/border/888888/rc/false/ld/false/sdz/true/ctl/false' +
      '/stb/' + flag(el, 'toolbar', false) + '/smb/' + flag(el, 'menu', false) +
      '/ai/' + flag(el, 'input', false) + '/sri/' + flag(el, 'reset', true) + '/sfsb/true';
    var f = document.createElement('iframe');
    f.src = 'https://www.geogebra.org/material/iframe/id/' + encodeURIComponent(id) +
      '/width/' + w + '/height/' + h + opts;
    f.setAttribute('allowfullscreen', '');
    f.setAttribute('title', 'GeoGebra');
    f.style.aspectRatio = w + ' / ' + h;
    el.textContent = '';
    el.appendChild(f);
  }

  function inject(el, i) {
    if (!el.id) el.id = 'ggb-' + i;
    var params = {
      material_id: el.getAttribute('data-id'),
      width: +el.getAttribute('data-width') || 800,
      height: +el.getAttribute('data-height') || 500,
      language: el.getAttribute('data-lang') || 'ar',
      showToolBar: flag(el, 'toolbar', false),
      showMenuBar: flag(el, 'menu', false),
      showAlgebraInput: flag(el, 'input', false),
      showResetIcon: flag(el, 'reset', true),
      showFullscreenButton: true,
      enableRightClick: false,
      enableShiftDragZoom: true,
      enableLabelDrags: false,
      borderColor: '#e3e0d8',
      // Scale the activity to the width of the box it sits in (phones included).
      scaleContainerClass: 'geogebra',
      allowUpscale: false
    };
    try { new window.GGBApplet(params, true).inject(el.id); }
    catch (e) { frame(el); }
  }

  function start() {
    var list = document.querySelectorAll('.geogebra[data-id]');
    if (!list.length) return;
    var run = function () {
      for (var i = 0; i < list.length; i++) {
        if (window.GGBApplet) inject(list[i], i); else frame(list[i]);
      }
    };
    if (window.GGBApplet) return run();
    var s = document.createElement('script');
    s.src = SCRIPT;
    s.onload = run;
    s.onerror = function () { for (var i = 0; i < list.length; i++) frame(list[i]); };
    document.head.appendChild(s);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
