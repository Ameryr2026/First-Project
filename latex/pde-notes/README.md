# The Analysis of Nonlinear PDEs: LaTeX source

This folder is the master copy of the notes. Edit here (or in Overleaf, then copy changes back).
Do not regenerate it with tools/export-pde-latex.py: that writes a fresh export to build/ and would not include your edits.

Compile `main.tex` with pdfLaTeX (on Overleaf: upload the zip as a new project; pdfLaTeX is the default).
Run it twice, or let Overleaf/latexmk do it, so the page numbers in the hints and solutions settle.

## Files

- `main.tex`: title page, introduction, and the order of the chapters. Each section is one `\input` line,
  so you can reorder, drop, or reuse sections by editing this list.
- `pdenotes.sty`: fonts, the macros (`\R`, `\norm{}`, `\abs{}`, `\dv`, `\weakto`, ...), the coloured boxes,
  and the exercise system. Load it in any other document with `\usepackage{pdenotes}`.
- `sections/<name>.tex`: one file per concept, and one for the chemotaxis case study.

## Boxes

    \begin{thmbox}{Theorem (Name)} ... \end{thmbox}
    \begin{defnbox}{Definition} ... \end{defnbox}
    \begin{rmkbox}{Remark} ... \end{rmkbox}
    \begin{exbox}{Example} ... \end{exbox}
    \begin{step}{Step 1. Title} ... \end{step}       (\begin{stepnew} marks a new idea)
    \begin{proofslot} proof still to be written \end{proofslot}

## Exercises

Write the hint and the solution inside the exercise:

    \begin{exercise}
      Show that ...
      \begin{hint} ... \end{hint}
      \begin{solution} ... \end{solution}
    \end{exercise}

They do not print there. `\printhints` and `\printsolutions` (Appendices A and B in `main.tex`) print them,
grouped by section, with links back to the exercise. Exercises are numbered within sections and labelled
automatically: Exercise 2.3.1 has the label `x:2.3.1`.

Put `\showsolutionsinline` in the preamble to print each hint and solution under its exercise instead
(for a problem sheet with answers). For a sheet without answers, just leave out `\printhints`/`\printsolutions`.

## Reusing a section elsewhere

A paper or a set of notes needs `pdenotes.sty` and the section file:

    \documentclass{article}       % book works too
    \usepackage{pdenotes}
    \begin{document}
    \input{sections/gronwall}
    \end{document}

Cross-references to sections not included will show as ??; delete or reword them.

## License

© Amer Rawashdeh. Licensed under [Creative Commons Attribution 4.0 (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/):
you may share and adapt this material for any purpose, as long as you give credit.
