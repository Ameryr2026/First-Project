/* Shared MathJax settings for every page in notes/pde/.
   Inline math: $...$ or \(...\).  Display: $$...$$ or \[...\].
   Numbered equations: \begin{equation}\label{eq:name} ... \end{equation}, cite with \eqref{eq:name}.
   Add your own shortcuts to the macros list below; they work on every page. */
window.MathJax = {
  tex: {
    inlineMath: [['$', '$'], ['\\(', '\\)']],
    displayMath: [['$$', '$$'], ['\\[', '\\]']],
    tags: 'ams',
    macros: {
      R: '\\mathbb{R}',
      N: '\\mathbb{N}',
      dv: '\\operatorname{div}',
      norm: ['\\left\\lVert #1 \\right\\rVert', 1],
      abs: ['\\left\\lvert #1 \\right\\rvert', 1],
      Lame: '\\mathcal{L}',
      weakto: '\\rightharpoonup',
      weakstarto: '\\overset{*}{\\rightharpoonup}'
    }
  },
  chtml: { scale: 1.0 }
};
