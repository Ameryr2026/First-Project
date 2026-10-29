/* The two p-adic tools of "Theory of Valuations" (Amer Rawashdeh), running in the browser.
   They follow the Python programs in latex/projects/valuations-code/ step by step, with BigInt
   so that every computation is exact however large the numbers are.

   Usage in a page:
     <div class="padic-tool" data-tool="rational"></div>   rational number -> p-adic coefficients
     <div class="padic-tool" data-tool="sqrt"></div>       square root of a in the p-adics
     <script src="padic-tools.js"></script>
*/
(function () {
  'use strict';

  // ---------------------------------------------------------------- arithmetic (as in the Python code)
  function mod(x, p) { const r = x % p; return r < 0n ? r + p : r; }           // Python's %
  function fdiv(x, p) { const q = x / p; return (x % p !== 0n && (x < 0n) !== (p < 0n)) ? q - 1n : q; } // Python's //
  function gcd(x, y) { x = x < 0n ? -x : x; y = y < 0n ? -y : y; while (y) { [x, y] = [y, x % y]; } return x; }
  function isPrime(p) {
    if (p < 2n) return false;
    for (let q = 2n; q * q <= p; q++) if (p % q === 0n) return false;
    return true;
  }

  // First program: the first n coefficients of the p-adic expansion of a/b, and the power m of the first one.
  function rationalToPadic(a, b, p, n) {
    const g = gcd(a, b);
    let k = 0n;
    while (mod(a, p ** (k + 1n)) === 0n) k++;
    a = fdiv(a, p ** k);
    let l = 0n;
    while (mod(b, p ** (l + 1n)) === 0n) l++;
    b = fdiv(b, p ** l);
    const m = k - l;
    const digits = [];
    for (let j = 0; j < n; j++) {
      for (let i = 0n; i < p; i++) {
        if (mod(a - i * b, p) === 0n) { a = fdiv(a - i * b, p); digits.push(i); break; }
      }
    }
    return { m: m, digits: digits, g: g };
  }

  // Second program: is a (0 <= a < p) a square mod p, and if so the first n coefficients of a square root.
  function squaresModP(p) {
    const t = [];
    for (let i = 0n; i < p; i++) t.push(mod(i * i, p));
    return t;
  }
  function padicSqrt(a, p, n) {
    const t = squaresModP(p);
    const i0 = t.findIndex(v => v === a);
    if (i0 < 0) return null;
    const x0 = BigInt(i0);
    const y = [x0];
    let z = x0;
    for (let j = 0n; j < BigInt(n - 1); j++) {
      for (let k = 0n; k < p; k++) {
        const T = fdiv(z * z - a, p ** (j + 1n));
        const S = T + 2n * z * k;
        if (mod(S, p) === 0n) { y.push(k); z = z + k * p ** (j + 1n); break; }
      }
    }
    return y;
  }

  // ---------------------------------------------------------------- display
  function readInt(input, name) {
    const s = input.value.trim();
    if (!/^[-+]?\d+$/.test(s)) throw new Error('Please enter an integer value for ' + name + '.');
    return BigInt(s.replace('+', ''));
  }
  // the notation of the paper: coefficients a_m a_{m+1} ..., with a comma after a_0
  function commaNotation(m, digits) {
    let d = digits.map(String), first = Number(m);
    if (first > 0) { d = Array(first).fill('0').concat(d); first = 0; }
    const parts = [];
    d.forEach((x, idx) => { parts.push(x); if (first + idx === 0 && idx < d.length - 1) parts.push(','); });
    let s = '';
    parts.forEach((x, idx) => {
      if (x === ',') { s += ','; return; }
      s += (idx && parts[idx - 1] !== ',' ? ' ' : '') + x;
    });
    return s + ' ⋯';
  }
  function sumNotation(m, digits, p) {
    const terms = [];
    digits.forEach((d, idx) => {
      if (d === 0n) return;
      const e = Number(m) + idx;
      const pw = e === 0 ? '' : (e === 1 ? String(p) : String(p) + '<sup>' + e + '</sup>');
      terms.push(e === 0 ? String(d) : (d === 1n ? pw : d + '·' + pw));
    });
    return (terms.length ? terms.join(' + ') : '0') + ' + ⋯';
  }
  function table(m, digits) {
    let h = '<table class="pt-tab"><tr><th>power of <i>p</i></th>';
    digits.forEach((_, i) => { h += '<td>' + (Number(m) + i) + '</td>'; });
    h += '</tr><tr><th>coefficient</th>';
    digits.forEach(d => { h += '<td>' + d + '</td>'; });
    return h + '</tr></table>';
  }

  const CSS = `
.padic-tool { border: 1px solid var(--rule, #ddd); border-radius: 6px; padding: 14px 16px; margin: 14px 0 22px;
  font-family: Inter, system-ui, sans-serif; font-size: 15px; background: var(--box, #f6f6f3); }
.padic-tool .pt-title { font-weight: 600; margin-bottom: 8px; }
.padic-tool .pt-row { display: flex; flex-wrap: wrap; gap: 8px 14px; align-items: end; }
.padic-tool label { display: flex; flex-direction: column; font-size: 13px; color: var(--muted, #555); gap: 3px; }
.padic-tool input { font: inherit; width: 9.5em; max-width: 100%; padding: 5px 7px; border: 1px solid var(--rule, #ccc);
  border-radius: 4px; background: var(--bg, #fff); color: var(--text, #222); }
.padic-tool input.wide { width: 14em; }
.padic-tool button { font: inherit; padding: 6px 14px; border-radius: 4px; border: 1px solid var(--accent, #0c4a6e);
  background: var(--accent, #0c4a6e); color: var(--bg, #fff); cursor: pointer; }
.padic-tool .pt-out { margin-top: 12px; line-height: 1.6; overflow-wrap: anywhere; }
.padic-tool .pt-out .err { color: #b42318; }
.padic-tool .pt-tabwrap { overflow-x: auto; margin: 6px 0; }
.padic-tool table.pt-tab { border-collapse: collapse; font-size: 13px; }
.padic-tool table.pt-tab th { text-align: left; font-weight: 500; color: var(--muted, #555); padding: 2px 8px 2px 0; white-space: nowrap; }
.padic-tool table.pt-tab td { border: 1px solid var(--rule, #ddd); padding: 2px 7px; text-align: center; }
.padic-tool .pt-note { font-size: 13px; color: var(--muted, #555); }
.padic-tool .pt-mono { font-family: ui-monospace, Menlo, Consolas, monospace; }
.padic-tool details.pt-src { margin-top: 12px; font-size: 14px; }
.padic-tool details.pt-src summary { cursor: pointer; color: var(--accent, #0c4a6e); }
.padic-tool details.pt-src pre { max-height: 420px; overflow: auto; background: var(--bg, #fff); border: 1px solid var(--rule, #ddd);
  border-radius: 4px; padding: 10px; font-size: 12.5px; line-height: 1.45; }
.padic-tool details.pt-src a { font-size: 13px; }
@media (prefers-color-scheme: dark) { .padic-tool .pt-out .err { color: #ff8a80; } }`;

  function field(label, value, cls) {
    return '<label><span>' + label + '</span><input type="text" inputmode="numeric" value="' + value + '"' +
           (cls ? ' class="' + cls + '"' : '') + '></label>';
  }

  function buildRational(box) {
    box.innerHTML = '<div class="pt-title">Rational number → <i>p</i>-adic</div>' +
      '<div class="pt-row">' + field('numerator <i>a</i>', '110', 'wide') + field('denominator <i>b</i>', '7', 'wide') +
      field('prime <i>p</i>', '11') + field('coefficients <i>n</i>', '10') +
      '<button type="button">Run</button></div><div class="pt-out" aria-live="polite"></div>';
    const [ia, ib, ip, inn] = box.querySelectorAll('input');
    const out = box.querySelector('.pt-out');
    function go() {
      try {
        const a = readInt(ia, 'a'), b = readInt(ib, 'b'), p = readInt(ip, 'p'), n = Number(readInt(inn, 'n'));
        if (b === 0n) throw new Error('The denominator cannot be 0!');
        if (!isPrime(p)) throw new Error('p must be a prime number!');
        if (p > 100000n) throw new Error('Please use a prime below 100000.');
        if (n < 1 || n > 500) throw new Error('Please enter n between 1 and 500.');
        if (a === 0n) { out.innerHTML = '0 is 0 in every <i>p</i>-adic: all its coefficients are 0.'; return; }
        const r = rationalToPadic(a, b, p, n);
        const sa = a / r.g, sb = b / r.g;
        out.innerHTML =
          (r.g !== 1n || b < 0n ? 'The fraction ' + a + '/' + b + ' is equivalent to ' +
            (sb < 0n ? -sa : sa) + '/' + (sb < 0n ? -sb : sb) + '.<br>' : '') +
          'The first ' + n + ' coefficients of the ' + p + '-adic expansion of ' + a + '/' + b + ':' +
          '<div class="pt-tabwrap">' + table(r.m, r.digits) + '</div>' +
          '<div class="pt-mono">' + commaNotation(r.m, r.digits) + '</div>' +
          '<div>= ' + sumNotation(r.m, r.digits, p) + '</div>' +
          '<div class="pt-note">The first coefficient is the coefficient of <i>p</i><sup>' + r.m + '</sup>. ' +
          'In the line above, the comma comes after the coefficient of <i>p</i><sup>0</sup>.</div>';
      } catch (e) { out.innerHTML = '<span class="err">' + e.message + '</span>'; }
    }
    box.querySelector('button').addEventListener('click', go);
    box.querySelectorAll('input').forEach(el => el.addEventListener('keydown', e => { if (e.key === 'Enter') go(); }));
    go();
  }

  function buildSqrt(box) {
    box.innerHTML = '<div class="pt-title">Square root in the <i>p</i>-adics</div>' +
      '<div class="pt-row">' + field('odd prime <i>p</i>', '7') + field('<i>a</i> (0 ≤ <i>a</i> &lt; <i>p</i>)', '2') +
      field('coefficients <i>n</i>', '10') + '<button type="button">Run</button></div>' +
      '<div class="pt-out" aria-live="polite"></div>';
    const [ip, ia, inn] = box.querySelectorAll('input');
    const out = box.querySelector('.pt-out');
    function go() {
      try {
        const p = readInt(ip, 'p'), a = readInt(ia, 'a'), n = Number(readInt(inn, 'n'));
        if (!isPrime(p) || p === 2n) throw new Error('p must be an odd prime (for p = 2 this method does not work).');
        if (p > 100000n) throw new Error('Please use a prime below 100000.');
        if (a < 0n || a >= p) throw new Error('Please enter a number a with 0 ≤ a < p.');
        if (n < 1 || n > 500) throw new Error('Please enter n between 1 and 500.');
        const y = padicSqrt(a, p, n);
        if (y === null) {
          const sq = [...new Set(squaresModP(p).map(String))].map(Number).sort((u, v) => u - v);
          out.innerHTML = a + ' is not a square mod ' + p + ', so it has no square root in the ' + p + '-adic.' +
            '<div class="pt-note">The squares mod ' + p + ' are ' + (sq.length <= 60 ? sq.join(', ') : sq.slice(0, 60).join(', ') + ', …') + '.</div>';
          return;
        }
        out.innerHTML = 'The number ' + a + ' has a square root in the ' + p + '-adic. Its first ' + n + ' coefficients:' +
          '<div class="pt-tabwrap">' + table(0n, y) + '</div>' +
          '<div class="pt-mono">' + commaNotation(0n, y) + '</div>' +
          '<div>= ' + sumNotation(0n, y, p) + '</div>' +
          '<div class="pt-note">The first number is the coefficient of <i>p</i><sup>0</sup>, the second of <i>p</i><sup>1</sup>, and so on. ' +
          'The other square root is its negative. If ' + a + ' is not a square of an integer, the expansion never ends.</div>';
      } catch (e) { out.innerHTML = '<span class="err">' + e.message + '</span>'; }
    }
    box.querySelector('button').addEventListener('click', go);
    box.querySelectorAll('input').forEach(el => el.addEventListener('keydown', e => { if (e.key === 'Enter') go(); }));
    go();
  }

  // under a tool: the Python program it follows (data-src), to read and download
  function addSource(box) {
    const src = box.dataset.src;
    if (!src) return;
    const name = src.split('/').pop();
    const d = document.createElement('details');
    d.className = 'pt-src';
    d.innerHTML = '<summary>The Python code (' + name + ')</summary><pre><code>Loading\u2026</code></pre>' +
      '<a href="' + src + '" download="' + name + '">Download ' + name + '</a>';
    box.appendChild(d);
    let loaded = false;
    d.addEventListener('toggle', () => {
      if (!d.open || loaded) return;
      loaded = true;
      fetch(src).then(r => { if (!r.ok) throw new Error(); return r.text(); })
        .then(t => { d.querySelector('code').textContent = t; })
        .catch(() => { d.querySelector('code').textContent = 'The code could not be loaded here; use the download link.'; });
    });
  }

  if (typeof module !== 'undefined') {          // for testing with node
    module.exports = { rationalToPadic, padicSqrt, commaNotation };
    return;
  }
  const st = document.createElement('style');
  st.textContent = CSS;
  document.head.appendChild(st);
  document.querySelectorAll('.padic-tool').forEach(box => {
    if (box.dataset.tool === 'rational') buildRational(box);
    else if (box.dataset.tool === 'sqrt') buildSqrt(box);
    addSource(box);
  });
})();
