# Project write-ups: LaTeX source

Stand-alone write-ups (course projects and similar), one `.tex` file each. Each file makes two things,
built by GitHub automatically when it changes (the same action as the PDE notes):

- `<name>.pdf` here, compiled with pdfLaTeX;
- the web page `notes/projects/<name>.html`, made by `tools/tex-to-web.py`.

A file is a whole LaTeX document using the style of the PDE notes (`\usepackage{pdenotes}`; the
`latexmkrc` file here lets it find `../pde-notes/pdenotes.sty`). The web page's title is the `\title{...}`,
and each `\section` becomes a numbered heading. Everything in `latex/pde-notes/README.md` works here too
(boxes, `pdfonly`/`webonly`, footnotes, equations), except links to the PDE pages.

## Hiding calculations

    \begin{calc}
      ... the calculation ...
    \end{calc}

In the PDF the calculation is printed in place, in a light box marked "Calculation". On the website it
is a closed "Show the calculation" box that the reader can open. For another button text:
`\begin{calc}[Show why the determinant is zero]`.

## Adding a write-up

Copy `conic-invariants.tex` to `<name>.tex`, replace the content, and add a line for it in the
"English projects" list of `index.html` (link `notes/projects/<name>.html` and the PDF).

## Interactive pieces and code

`\begin{rawhtml} ... \end{rawhtml}` copies HTML as it is into the web page (nothing in the PDF; do not use `%`
inside it). `valuations.tex` uses it for the two p-adic calculators, whose code is `notes/projects/padic-tools.js`;
they follow the Python programs in `valuations-code/`, which the PDF prints in its appendix.
