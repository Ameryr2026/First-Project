# The Analysis of Nonlinear PDEs: LaTeX source

This folder is the only copy of the notes. Edit the `.tex` files here, directly on GitHub or in a clone.
The printable PDF **and** the PDE pages of the website are both made from them.

## What happens when you change a file

You do not need to compile anything. Every time a `.tex` or `.sty` file in this folder changes on GitHub,
the action `.github/workflows/build-pde-notes.yml` runs and, a couple of minutes later, commits:

- `main.pdf`, compiled from `main.tex` with pdfLaTeX (the PDF link on the website always points to it);
- the website pages in `notes/pde/`: one page per `\input` line in `main.tex`, the hub page `index.html`,
  and the list of pages `registry.js`. They are made by `tools/tex-to-web.py`.

You can watch it, and see any error, under the repository's **Actions** tab. A LaTeX error stops only the PDF:
the website pages are still updated. Things the web converter does not understand (an unknown command,
a page id that does not exist) are listed as warnings on the run's summary page.

Never edit the `.html` files in `notes/pde/`: they are overwritten on the next build.

To compile on your own computer instead: `latexmk -pdf main.tex`. To rebuild the web pages yourself:
`python3 tools/tex-to-web.py` from the top folder of the repository (Python 3, nothing to install).

## Files

- `main.tex`: title page, introduction, and the order of the chapters. Each page is one `\input` line.
  - The chapters of Part I are the **layers** of the website's reading path.
  - The order of the `\input` lines is the reading order (the previous / next links on the website).
  - The Introduction is also the introduction of the website's PDE hub page.
- `pdenotes.sty`: fonts, the macros (`\R`, `\norm{}`, `\abs{}`, `\dv`, `\weakto`, ...), the coloured boxes,
  and the exercise system. A macro added in its "Math macros" section works in the PDF **and** on the website.
- `sections/foundations/<id>.tex`: Part I, one file per concept. It becomes `notes/pde/<id>.html`.
- `sections/case-studies/<name>.tex`: Part II, one file per case study. Its label is `p:case-<name>`
  and it becomes `notes/pde/case-<name>.html`.
- `sections/foundations/_template.tex` and `sections/case-studies/_template.tex`: skeletons for new pages.

## A page

Every file is one page and starts like this:

    \section{Gronwall's inequality and continuity arguments}\label{p:gronwall}
    \status{stub}                 % stub, draft or done: the badge on the website
    \prereqs{sobolev-spaces}      % "Before reading this"; leave the line out if there are none

The id (`gronwall`) is the file name, and the page's address on the website (`gronwall.html`).
End a concept file with `\neededfor`: the "Needed for" list is filled in from the other pages' `\prereqs`.

A case study starts with `\chapter{...}\label{p:case-<name>}`, then `\status{...}`,
`\blurb{one line for the hub page}`, and `\conceptsused{id, id, ...}` where the box of concepts should go.
`\conceptsused` also makes the "Used in" box on each of those concept pages.

## Links between pages

    \pref{gronwall}{Gronwall's inequality}     PDF: "Gronwall's inequality (§2.4)"   website: a link
    \pref{gronwall}{}                          the same, with the page's own title as the text

Equations: `\label{eq:name}` and `\eqref{eq:name}` work in both. Start equation labels with the page's
name (`eq:chemotaxis-system`) so that two pages never use the same label.

## Adding a page

1. Copy `sections/foundations/_template.tex` to `sections/foundations/<id>.tex` (or the case-study template).
2. Fill it in.
3. In `main.tex`, add `\input{sections/foundations/<id>}` under the right chapter
   (case studies: `\input{sections/case-studies/<name>}` under `\part{Case studies}`).

That is all: the PDF chapter, the web page, its links and the hub are all made from it.
To remove a page, delete its `\input` line; its web page is removed on the next build.

## Boxes

    \begin{thmbox}{Theorem (Name)} ... \end{thmbox}
    \begin{defnbox}{Definition} ... \end{defnbox}
    \begin{rmkbox}{Remark} ... \end{rmkbox}
    \begin{exbox}{Example} ... \end{exbox}
    \begin{proof} ... \end{proof}                     (\begin{proof}[Proof of Theorem A] for another title)
    \begin{step}{\routine{}Step 1. Title} ... \end{step}      (\begin{stepnew}{\newidea{}...} marks a new idea)
    \uses{\pref{energy-estimates}{energy estimates}}           ("Uses: ..." at the end of a step)
    \begin{proofslot} proof still to be written \end{proofslot}
    \begin{pdfonly} ... \end{pdfonly}                 (printed in the PDF only)
    \begin{webonly} ... \end{webonly}                 (shown on the website only)

## Exercises

Write the hint and the solution inside the exercise:

    \begin{exercise}
      Show that ...
      \begin{hint} ... \end{hint}
      \begin{solution} ... \end{solution}
    \end{exercise}

In the PDF they do not print there: `\printhints` and `\printsolutions` (Appendices A and B in `main.tex`)
print them, grouped by section, with links back to the exercise. Exercises are numbered within sections and
labelled automatically: Exercise 2.3.1 has the label `x:2.3.1`. On the website, the hint and the solution are
"click to open" boxes under the exercise.

Put `\showsolutionsinline` in the preamble to print each hint and solution under its exercise instead
(for a problem sheet with answers). For a sheet without answers, just leave out `\printhints`/`\printsolutions`.

## What the website understands

Ordinary text and math: paragraphs, `$...$`, `\[...\]`, `equation`/`align`/`gather`/`multline`
(the math goes to MathJax as it is), `\section`, `\subsection`, `\paragraph`, `itemize`/`enumerate`,
`\emph`, `\textbf`, `\texttt`, `\textsuperscript`, `\href`, `\url`, `\footnote`, `--`, `---`, ` ``...'' `,
and everything in `pdenotes.sty` above. Something else (a figure, a table, a new environment) is reported
as a warning in the Actions run; ask for it to be added to `tools/tex-to-web.py`.

## Reusing a section elsewhere

A paper or a set of notes needs `pdenotes.sty` and the section file:

    \documentclass{article}       % book works too
    \usepackage{pdenotes}
    \begin{document}
    \input{sections/foundations/gronwall}
    \end{document}

Links to sections not included will show as ??; delete or reword them.

## License

© Amer Rawashdeh. Licensed under [Creative Commons Attribution 4.0 (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/):
you may share and adapt this material for any purpose, as long as you give credit.
