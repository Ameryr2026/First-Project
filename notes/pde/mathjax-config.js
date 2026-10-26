/* Made by tools/tex-to-web.py from the "Math macros" section of latex/pde-notes/pdenotes.sty.
   Do not edit: add a macro to pdenotes.sty and it works in the PDF and on every page. */
window.MathJax = {
  tex: {
    inlineMath: [['$', '$'], ['\\(', '\\)']],
    displayMath: [['$$', '$$'], ['\\[', '\\]']],
    tags: 'ams',
    macros: {
      R: "\\mathbb{R}",
      N: "\\mathbb{N}",
      dv: "\\operatorname{div}",
      norm: ["\\left\\lVert #1\\right\\rVert", 1],
      abs: ["\\left\\lvert #1\\right\\rvert", 1],
      Lame: "\\mathcal{L}",
      weakto: "\\rightharpoonup",
      weakstarto: "\\overset{*}{\\rightharpoonup}"
    }
  },
  chtml: { scale: 1.0 }
};
