# The Analysis of Nonlinear PDEs: LaTeX source

This folder is the master copy of the notes. Edit the `.tex` files here, directly on GitHub or in a clone.
Do not regenerate it with tools/export-pde-latex.py: that writes a fresh export to build/ and would not include your edits.

## Compiling

You do not need to compile anything. Every time a `.tex` or `.sty` file in this folder changes on GitHub,
the "Build PDFs (PDE notes and CV)" action (`.github/workflows/build-pde-notes.yml`) compiles `main.tex` with pdfLaTeX
and commits the new `main.pdf` back to the repository, so the download link on the website is always current.
It takes a couple of minutes; you can watch it, and see any LaTeX error, under the repository's **Actions** tab.

To compile on your own computer instead: `latexmk -pdf main.tex` (it runs pdfLaTeX as many times as needed
for the page numbers in the hints and solutions to settle).

## Files

- `main.tex`: title page, introduction, and the order of the chapters. Each section is one `\input` line,
  so you can reorder, drop, or reuse sections by editing this list.
- `pdenotes.sty`: fonts, the macros (`\R`, `\norm{}`, `\abs{}`, `\dv`, `\weakto`, ...), the coloured boxes,
  and the exercise system. Load it in any other document with `\usepackage{pdenotes}`.
- `sections/foundations/<name>.tex`: Part I, one file per concept. Its label is `p:<name>`,
  so any file can link to it with `\S\ref{p:<name>}`.
- `sections/case-studies/<name>.tex`: Part II, one file per case study.
- `sections/case-studies/_template.tex`: the skeleton for a new case study.

## Adding a case study

1. Copy `sections/case-studies/_template.tex` to `sections/case-studies/<short-name>.tex`.
2. Fill it in. The comments at the top explain the labels and the two kinds of step box.
3. In `main.tex`, add `\input{sections/case-studies/<short-name>}` under `\part{Case studies}`.

The website has its own copy of each case study (`notes/pde/case-<name>.html`, listed in `notes/pde/wiki.js`);
add that page too if the case study should appear on the site.

## Adding a concept

Create `sections/foundations/<name>.tex` starting with `\section{<Title>}\label{p:<name>}`, then add its
`\input` line in `main.tex` under the right chapter.

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
    \input{sections/foundations/gronwall}
    \end{document}

Cross-references to sections not included will show as ??; delete or reword them.

## License

© Amer Rawashdeh. Licensed under [Creative Commons Attribution 4.0 (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/):
you may share and adapt this material for any purpose, as long as you give credit.
