/* ==================================================================
   PDE ANALYSIS WIKI — draws the links between pages
   ------------------------------------------------------------------
   The list of pages (LAYERS and PAGES) is in registry.js, which
   tools/tex-to-web.py makes from the LaTeX notes. From it this script
   builds, on every page:
     - the "Before reading this" box   (from \prereqs)
     - the "Used in" box               (from \conceptsused of case studies)
     - the "Needed for" box            (from the other pages' \prereqs)
     - the previous / next links       (the order of \input lines in main.tex)
     - the reading path and case-study list on the hub (index.html)
   You do not need to edit this file.
   ================================================================== */
(function () {
  const byId = Object.fromEntries(PAGES.map(p => [p.id, p]));
  const concepts = PAGES.filter(p => p.kind === 'concept');
  const cases = PAGES.filter(p => p.kind === 'case');
  // Reading order: by layer, then by the order listed above.
  const path = LAYERS.flatMap(L => concepts.filter(c => c.layer === L.n));

  const href = id => id + '.html';
  const statusBadge = p => p.status === 'done' ? ''
    : `<span class="badge badge-${p.status}">${p.status}</span>`;
  const link = id => {
    const p = byId[id];
    if (!p) { console.warn('[wiki] unknown page id:', id); return `<span class="missing">${id}?</span>`; }
    return `<a href="${href(id)}">${p.title}</a>${statusBadge(p)}`;
  };
  const fill = (elId, html) => { const el = document.getElementById(elId); if (el) el.innerHTML = html; };

  function run() {
    const here = document.body.dataset.page;
    const page = byId[here];
    if (here && here !== 'hub' && !page) console.warn('[wiki] this page is not in the registry:', here);

    // ---------- concept pages ----------
    if (page && page.kind === 'concept') {
      const L = LAYERS.find(l => l.n === page.layer);
      fill('page-meta', `Concept · Layer ${L.n}: ${L.title}${statusBadge(page)}`);

      fill('prereqs', page.prereqs.length
        ? `<div class="wiki-box"><div class="wiki-box-title">Before reading this</div>
             <ul>${page.prereqs.map(id => `<li>${link(id)}</li>`).join('')}</ul></div>`
        : '');

      const usedBy = cases.filter(c => (c.uses || []).includes(here));
      fill('used-in', `<div class="wiki-box"><div class="wiki-box-title">Used in</div>${
        usedBy.length
          ? `<ul>${usedBy.map(c => `<li>${link(c.id)}</li>`).join('')}</ul>`
          : '<p class="muted">No case study uses this yet.</p>'}</div>`);

      const required = concepts.filter(c => c.prereqs.includes(here));
      if (required.length) {
        const el = document.getElementById('used-in');
        if (el) el.insertAdjacentHTML('beforeend',
          `<div class="wiki-box"><div class="wiki-box-title">Needed for</div>
             <ul>${required.map(c => `<li>${link(c.id)}</li>`).join('')}</ul></div>`);
      }

      const i = path.findIndex(c => c.id === here);
      const prev = path[i - 1], next = path[i + 1];
      fill('pager', `${prev ? `<a class="prev" href="${href(prev.id)}">← ${prev.title}</a>` : '<span></span>'}
                     ${next ? `<a class="next" href="${href(next.id)}">${next.title} →</a>` : '<span></span>'}`);
    }

    // ---------- case studies ----------
    if (page && page.kind === 'case') {
      fill('page-meta', `Case study${statusBadge(page)}`);
      fill('concepts-used', `<div class="wiki-box"><div class="wiki-box-title">Concepts used in this case study</div>
        <ul class="cols">${LAYERS.map(L => {
          const here = (page.uses || []).filter(id => byId[id] && byId[id].layer === L.n);
          return here.map(id => `<li>${link(id)}</li>`).join('');
        }).join('')}</ul></div>`);

      // Consistency check: every concept page this case study links to
      // should be listed in its uses, so the "Used in" boxes stay correct.
      const linked = new Set([...document.querySelectorAll('main a[href$=".html"]')]
        .map(a => a.getAttribute('href').replace(/\.html(#.*)?$/, ''))
        .filter(id => byId[id] && byId[id].kind === 'concept'));
      linked.forEach(id => { if (!page.uses.includes(id))
        console.warn(`[wiki] ${here} links to ${id} but does not list it in uses`); });
    }

    // ---------- hub ----------
    if (here === 'hub') {
      fill('reading-path', LAYERS.map(L => `
        <div class="layer"><div class="layer-title">Layer ${L.n} · ${L.title}</div>
          <ul>${concepts.filter(c => c.layer === L.n).map(c => `<li>${link(c.id)}</li>`).join('')}</ul>
        </div>`).join(''));
      fill('case-list', `<ul class="cases">${cases.map(c =>
        `<li>${link(c.id)}<div class="muted">${c.blurb || ''}</div></li>`).join('')}</ul>`);
    }

    if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
