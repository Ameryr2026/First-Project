/*
 * ggb-template.js — the smallest complete GeoGebra widget: a tangent line.
 * Copy this file to start a new widget; docs/geogebra-widgets.md explains every step.
 *
 * In a page:
 *   <div class="ggb-tangent" data-f="x^2" data-x0="1"></div>
 *   <script src="ggb-template.js" defer></script>
 *
 * The reader types f(x) and a point x0 in our boxes; GeoGebra draws the graph, the point and the
 * tangent line, and we show the slope under the graph.
 */
(function () {
  'use strict';

  // STEP 1. Find the boxes on the page that should become widgets.
  var boxes = document.querySelectorAll('.ggb-tangent');
  if (!boxes.length) return;

  // STEP 2. Build our own inputs inside each box, and a place where GeoGebra will draw.
  Array.prototype.forEach.call(boxes, function (box, i) {
    box.innerHTML =
      '<label>f(x) = <input class="t-f" style="direction:ltr"></label> ' +
      '<label>x<sub>0</sub> = <input class="t-x0" type="number" step="0.1" style="width:6em"></label>' +
      '<div id="ggb-tangent-' + i + '" style="margin-top:10px">Loading GeoGebra…</div>' +
      '<p class="t-out"></p>';
    box.querySelector('.t-f').value = box.getAttribute('data-f') || 'x^2';
    box.querySelector('.t-x0').value = box.getAttribute('data-x0') || '1';
  });

  // STEP 3. Load GeoGebra's script once, then create one GeoGebra graph per box.
  var s = document.createElement('script');
  s.src = 'https://www.geogebra.org/apps/deployggb.js';
  s.onload = function () { Array.prototype.forEach.call(boxes, start); };
  document.head.appendChild(s);

  function start(box, i) {
    var inF = box.querySelector('.t-f'), inX = box.querySelector('.t-x0'), out = box.querySelector('.t-out');
    var api = null;

    // STEP 5. Send the reader's values to GeoGebra. Everything defined from f and x0
    // (the point, the tangent, the slope) is recalculated by GeoGebra itself.
    function update() {
      if (!api) return;
      if (!api.evalCommand('f(x) = ' + inF.value)) { out.textContent = 'GeoGebra could not read f.'; return; }
      api.setValue('x0', parseFloat(inX.value) || 0);
      out.textContent = 'Slope of the tangent: ' + api.getValue('m').toFixed(4);
    }

    // STEP 4. When GeoGebra is ready, create the objects once, with GeoGebra commands.
    // (Try each command first in https://www.geogebra.org/calculator.)
    function onLoad(ggb) {
      api = ggb;
      api.evalCommand('f(x) = ' + inF.value);
      api.evalCommand('x0 = ' + (parseFloat(inX.value) || 0));
      api.setVisible('x0', false);                       // a number we control: no slider in the graph
      api.evalCommand('P = (x0, f(x0))');                // the point on the graph
      api.evalCommand('T = Tangent(x0, f)');             // the tangent line there
      api.evalCommand("m = f'(x0)");                     // its slope, for our readout
      api.setVisible('m', false);
      api.setColor('T', 234, 88, 12);                    // colours as red, green, blue (0–255)
      api.setLineThickness('T', 6);
      ['f', 'P', 'T'].forEach(function (o) { api.setLabelVisible(o, false); api.setFixed(o, true, false); });
      update();
    }

    // STEP 6. Listen to our inputs.
    inF.addEventListener('change', update);
    inX.addEventListener('input', update);

    // The GeoGebra graph: only the drawing (perspective G), no toolbar, menus or input bar.
    new window.GGBApplet({
      id: 'ggbTangent' + i,            // in the browser console, window.ggbTangent0 is this graph's API
      appName: 'classic', perspective: 'G',
      width: 700, height: 420,
      showToolBar: false, showMenuBar: false, showAlgebraInput: false,
      enableShiftDragZoom: true, showZoomButtons: true, showResetIcon: false,
      enableRightClick: false, errorDialogsActive: false,
      appletOnLoad: onLoad
    }, true).inject('ggb-tangent-' + i);
  }
})();
