/* Made by tools/problems-to-web.py from the "Math macros" section of latex/analysis-problems/problems.sty.
   Do not edit: add a macro to problems.sty and it works in the PDF and on every page. */
window.MathJax = {
  tex: {
    inlineMath: [['$', '$'], ['\\(', '\\)']],
    displayMath: [['$$', '$$'], ['\\[', '\\]']],
    tags: 'ams',
    macros: {
      R: "\\mathbb{R}",
      N: "\\mathbb{N}",
      Z: "\\mathbb{Z}",
      Q: "\\mathbb{Q}",
      C: "\\mathbb{C}",
      norm: ["\\left\\lVert #1\\right\\rVert", 1],
      abs: ["\\left\\lvert #1\\right\\rvert", 1],
      set: ["\\left\\{ #1\\right\\}", 1],
      Res: "\\operatorname{Res}",
      Re: "\\operatorname{Re}",
      Im: "\\operatorname{Im}",
      dv: "\\operatorname{div}",
      tr: "\\operatorname{tr}",
      gph: "\\operatorname{gph}",
      dom: "\\operatorname{dom}",
      dd: "\\displaystyle",
      la: "\\langle",
      ra: "\\rangle",
      ri: "\\rightarrow",
      pa: "\\partial",
      vp: "\\varphi",
      brac: ["\\left( #1\\right)", 1],
      sbrac: ["\\left[ #1\\right]", 1],
      closure: ["\\overline{#1}", 1],
      conj: ["\\overline{#1}", 1],
      O: "\\mathcal{O}",
      fall: ["\\text{ for all }#1 \\in #2", 2],
      epsilon: "\\varepsilon",
      hdots: "\\cdots",
      lt: "<",
      gt: ">",
      Bar: "\\bar",
      Tilde: "\\tilde",
      textup: ["\\text{#1}", 1]
    }
  },
  chtml: { scale: 1.0 }
};
