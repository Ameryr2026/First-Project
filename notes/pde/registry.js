/* Made by tools/tex-to-web.py from latex/pde-notes/main.tex and the section files.
   Do not edit: the layers are the chapters of Part I in main.tex, the order is the order of
   the \input lines, and each page's \status, \prereqs, \conceptsused and \blurb come from its .tex file. */

const LAYERS = [
  { n: 1, title: "The language: function spaces" },
  { n: 2, title: "The inequality toolkit" },
  { n: 3, title: "Linear building blocks" },
  { n: 4, title: "What \"solution\" means" },
  { n: 5, title: "A priori estimates" },
  { n: 6, title: "Existence by approximation" },
  { n: 7, title: "Uniqueness" },
  { n: 8, title: "Global weak solutions" },
];

const PAGES = [
  {"id": "sobolev-spaces", "kind": "concept", "status": "stub", "title": "Weak derivatives and Sobolev spaces", "layer": 1, "prereqs": []},
  {"id": "bochner-spaces", "kind": "concept", "status": "stub", "title": "Spaces of time-dependent functions", "layer": 1, "prereqs": ["sobolev-spaces"]},
  {"id": "weak-convergence", "kind": "concept", "status": "stub", "title": "Weak and weak* convergence", "layer": 1, "prereqs": ["sobolev-spaces"]},
  {"id": "elementary-inequalities", "kind": "concept", "status": "stub", "title": "Hölder, Young, and Lᵖ interpolation", "layer": 2, "prereqs": []},
  {"id": "sobolev-embedding", "kind": "concept", "status": "stub", "title": "Sobolev embeddings", "layer": 2, "prereqs": ["sobolev-spaces"]},
  {"id": "gagliardo-nirenberg", "kind": "concept", "status": "stub", "title": "Gagliardo–Nirenberg inequalities", "layer": 2, "prereqs": ["sobolev-embedding", "elementary-inequalities"]},
  {"id": "gronwall", "kind": "concept", "status": "stub", "title": "Gronwall's inequality and continuity arguments", "layer": 2, "prereqs": []},
  {"id": "elliptic-regularity", "kind": "concept", "status": "stub", "title": "Elliptic regularity: the Lamé system and the Neumann Laplacian", "layer": 3, "prereqs": ["sobolev-spaces"]},
  {"id": "parabolic-regularity", "kind": "concept", "status": "stub", "title": "Maximal regularity for parabolic equations", "layer": 3, "prereqs": ["bochner-spaces", "elliptic-regularity"]},
  {"id": "transport-equation", "kind": "concept", "status": "stub", "title": "The transport (continuity) equation", "layer": 3, "prereqs": ["sobolev-spaces", "sobolev-embedding"]},
  {"id": "notions-of-solution", "kind": "concept", "status": "stub", "title": "Strong, weak, and renormalized solutions", "layer": 4, "prereqs": ["bochner-spaces", "transport-equation"]},
  {"id": "energy-estimates", "kind": "concept", "status": "stub", "title": "Energy estimates and a priori bounds", "layer": 5, "prereqs": ["elementary-inequalities", "gronwall"]},
  {"id": "galerkin", "kind": "concept", "status": "stub", "title": "The Faedo–Galerkin method", "layer": 6, "prereqs": ["energy-estimates", "weak-convergence", "bochner-spaces"]},
  {"id": "uniqueness-energy", "kind": "concept", "status": "stub", "title": "Uniqueness by difference estimates", "layer": 7, "prereqs": ["energy-estimates", "gronwall"]},
  {"id": "compactness", "kind": "concept", "status": "stub", "title": "Compactness: Rellich–Kondrachov and Aubin–Lions", "layer": 8, "prereqs": ["sobolev-embedding", "bochner-spaces", "weak-convergence"]},
  {"id": "regularized-approximation", "kind": "concept", "status": "stub", "title": "Regularized approximation schemes", "layer": 8, "prereqs": ["energy-estimates", "galerkin"]},
  {"id": "lions-feireisl", "kind": "concept", "status": "stub", "title": "Lions–Feireisl theory for compressible flow", "layer": 8, "prereqs": ["compactness", "notions-of-solution", "regularized-approximation"]},
  {"id": "case-chemotaxis", "kind": "case", "status": "draft", "title": "Chemotaxis compressible Navier–Stokes equations", "blurb": "Huang, Rababah, Rawashdeh, J. Differential Equations 480 (2026). Local strong solutions with vacuum; global weak solutions for $\\gamma &gt; 3/2$.", "uses": ["sobolev-spaces", "bochner-spaces", "weak-convergence", "elementary-inequalities", "sobolev-embedding", "gagliardo-nirenberg", "gronwall", "elliptic-regularity", "parabolic-regularity", "transport-equation", "notions-of-solution", "energy-estimates", "galerkin", "uniqueness-energy", "compactness", "regularized-approximation", "lions-feireisl"]},
];
