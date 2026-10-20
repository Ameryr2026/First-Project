/* ==================================================================
   PDE ANALYSIS WIKI — the registry
   ------------------------------------------------------------------
   This is the ONLY file you edit to connect pages. Every page in
   notes/pde/ is listed here once. From this list the script builds,
   on every page:
     - the "Before reading this" box   (from prereqs)
     - the "Used in" box               (from the uses lists of case studies)
     - the previous / next links       (reading-path order below)
     - the reading path and case-study list on the hub (index.html)

   To add a CONCEPT page:
     1. copy concept-template.html to <id>.html and write it
     2. add an entry below with kind: 'concept', a layer, and prereqs
   To add a CASE STUDY:
     1. copy case-chemotaxis.html as a starting point
     2. add an entry with kind: 'case' and the concepts it uses
   The "Used in" lists on concept pages then update themselves.

   status: 'stub' (statement + reference only), 'draft', or 'done'.
   ================================================================== */

const LAYERS = [
  { n: 1, title: 'The language: function spaces' },
  { n: 2, title: 'The inequality toolkit' },
  { n: 3, title: 'Linear building blocks' },
  { n: 4, title: 'What "solution" means' },
  { n: 5, title: 'A priori estimates' },
  { n: 6, title: 'Existence by approximation' },
  { n: 7, title: 'Uniqueness' },
  { n: 8, title: 'Global weak solutions' }
];

const PAGES = [
  // ---- Layer 1 ----
  { id: 'sobolev-spaces', kind: 'concept', layer: 1, status: 'stub',
    title: 'Weak derivatives and Sobolev spaces', prereqs: [] },
  { id: 'bochner-spaces', kind: 'concept', layer: 1, status: 'stub',
    title: 'Spaces of time-dependent functions', prereqs: ['sobolev-spaces'] },
  { id: 'weak-convergence', kind: 'concept', layer: 1, status: 'stub',
    title: 'Weak and weak* convergence', prereqs: ['sobolev-spaces'] },

  // ---- Layer 2 ----
  { id: 'elementary-inequalities', kind: 'concept', layer: 2, status: 'stub',
    title: 'Hölder, Young, and Lᵖ interpolation', prereqs: [] },
  { id: 'sobolev-embedding', kind: 'concept', layer: 2, status: 'stub',
    title: 'Sobolev embeddings', prereqs: ['sobolev-spaces'] },
  { id: 'gagliardo-nirenberg', kind: 'concept', layer: 2, status: 'stub',
    title: 'Gagliardo–Nirenberg inequalities',
    prereqs: ['sobolev-embedding', 'elementary-inequalities'] },
  { id: 'gronwall', kind: 'concept', layer: 2, status: 'stub',
    title: 'Gronwall’s inequality and continuity arguments', prereqs: [] },

  // ---- Layer 3 ----
  { id: 'elliptic-regularity', kind: 'concept', layer: 3, status: 'stub',
    title: 'Elliptic regularity: the Lamé system and the Neumann Laplacian',
    prereqs: ['sobolev-spaces'] },
  { id: 'parabolic-regularity', kind: 'concept', layer: 3, status: 'stub',
    title: 'Maximal regularity for parabolic equations',
    prereqs: ['bochner-spaces', 'elliptic-regularity'] },
  { id: 'transport-equation', kind: 'concept', layer: 3, status: 'stub',
    title: 'The transport (continuity) equation',
    prereqs: ['sobolev-spaces', 'sobolev-embedding'] },

  // ---- Layer 4 ----
  { id: 'notions-of-solution', kind: 'concept', layer: 4, status: 'stub',
    title: 'Strong, weak, and renormalized solutions',
    prereqs: ['bochner-spaces', 'transport-equation'] },

  // ---- Layer 5 ----
  { id: 'energy-estimates', kind: 'concept', layer: 5, status: 'stub',
    title: 'Energy estimates and a priori bounds',
    prereqs: ['elementary-inequalities', 'gronwall'] },

  // ---- Layer 6 ----
  { id: 'galerkin', kind: 'concept', layer: 6, status: 'stub',
    title: 'The Faedo–Galerkin method',
    prereqs: ['energy-estimates', 'weak-convergence', 'bochner-spaces'] },

  // ---- Layer 7 ----
  { id: 'uniqueness-energy', kind: 'concept', layer: 7, status: 'stub',
    title: 'Uniqueness by difference estimates',
    prereqs: ['energy-estimates', 'gronwall'] },

  // ---- Layer 8 ----
  { id: 'compactness', kind: 'concept', layer: 8, status: 'stub',
    title: 'Compactness: Rellich–Kondrachov and Aubin–Lions',
    prereqs: ['sobolev-embedding', 'bochner-spaces', 'weak-convergence'] },
  { id: 'regularized-approximation', kind: 'concept', layer: 8, status: 'stub',
    title: 'Regularized approximation schemes',
    prereqs: ['energy-estimates', 'galerkin'] },
  { id: 'lions-feireisl', kind: 'concept', layer: 8, status: 'stub',
    title: 'Lions–Feireisl theory for compressible flow',
    prereqs: ['compactness', 'notions-of-solution', 'regularized-approximation'] },

  // ---- Case studies ----
  { id: 'case-chemotaxis', kind: 'case', status: 'draft',
    title: 'Chemotaxis compressible Navier–Stokes (vascular network formation)',
    blurb: 'Huang, Rababah, Rawashdeh, J. Differential Equations 480 (2026). Local strong solutions with vacuum; global weak solutions for γ > 3/2.',
    uses: ['sobolev-spaces', 'bochner-spaces', 'weak-convergence',
           'elementary-inequalities', 'sobolev-embedding', 'gagliardo-nirenberg', 'gronwall',
           'elliptic-regularity', 'parabolic-regularity', 'transport-equation',
           'notions-of-solution', 'energy-estimates', 'galerkin', 'uniqueness-energy',
           'compactness', 'regularized-approximation', 'lions-feireisl'] }
];

/* ==================================================================
   Nothing below needs editing.
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
