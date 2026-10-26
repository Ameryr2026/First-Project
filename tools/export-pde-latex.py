#!/usr/bin/env python3
"""
Export the PDE analysis pages (notes/pde/) as an editable LaTeX project (Overleaf-ready, pdfLaTeX).

    python3 tools/export-pde-latex.py [output-folder]      # default: build/pde-notes

Layout of the project:
    main.tex            title page, introduction, the order of chapters (\\input lines), appendices
    pdenotes.sty        fonts, macros, boxes, and the exercise system (copied from tools/pdenotes.sty)
    sections/<id>.tex   one file per concept page, and one per case study
    README.md           how the project is organised

Hints and solutions are written inside each exercise and collected into the appendices by LaTeX.
This is a one-time export: after you edit the .tex files, they are the master copy for print and
the website pages are no longer in sync with them.
"""
import importlib.util, os, re, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('pdf', os.path.join(HERE, 'build-pde-pdf.py'))
pdf = importlib.util.module_from_spec(spec)
sys.argv = sys.argv[:1] + sys.argv[1:]          # build-pde-pdf reads argv[1] as its output folder; not used here
spec.loader.exec_module(pdf)

OUT = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.join(HERE, '..', 'build', 'pde-notes')

# Source meant to be read and edited by a person: plain en dashes, < and > in math.
pdf.UNICODE['–'] = '--'


class Page(pdf.Page):
    def block(self, c, depth):
        if c.name == 'div' and 'exercise' in (c.get('class') or []):
            lab = c.find('span', class_='label')
            if lab:
                lab.extract()                       # numbered by LaTeX

            def take(kind):
                det = c.find('details', class_=kind)
                if not det:
                    return ''
                summ = det.find('summary')
                if summ:
                    summ.extract()
                body = self.blocks(det, depth + 1)
                det.extract()
                return body

            hint, sol = take('hint'), take('solution')
            out = ['\\begin{exercise}', indent(self.blocks(c, depth + 1))]
            if hint:
                out += ['  \\begin{hint}', indent(hint, 4), '  \\end{hint}']
            if sol:
                out += ['  \\begin{solution}', indent(sol, 4), '  \\end{solution}']
            out.append('\\end{exercise}')
            return '\n'.join(out)
        return super().block(c, depth)


def indent(s, n=2):
    return '\n'.join((' ' * n + line) if line.strip() else '' for line in s.split('\n'))


def tidy(s):
    s = re.sub(r'\\lt(?![A-Za-z])\s?', '< ', s)
    s = re.sub(r'\\gt(?![A-Za-z])\s?', '> ', s)
    s = re.sub(r'[ \t]+\n', '\n', s)
    s = re.sub(r'\n{3,}', '\n\n', s)
    return s.strip() + '\n'


def write(path, s):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, 'w', encoding='utf-8').write(s)


def build():
    if os.path.isdir(OUT):
        shutil.rmtree(OUT)
    os.makedirs(os.path.join(OUT, 'sections'))
    shutil.copy(os.path.join(HERE, 'pdenotes.sty'), OUT)

    for p in pdf.CONCEPTS + pdf.CASES:
        head = '%% %s\n%% Converted from notes/pde/%s.html. Edit freely: this file is now the master copy.\n\n' % (
            p['title'], p['id'])
        write(os.path.join(OUT, 'sections', p['id'] + '.tex'), head + tidy(Page(p['id']).latex()))

    intro, hub_title = pdf.hub_intro()
    title = hub_title.replace('nonlinear PDEs', 'Nonlinear PDEs').replace('The analysis', 'The Analysis')
    stubs = [c for c in pdf.CONCEPTS if c.get('status') != 'done']
    m = [r'''\documentclass[11pt,openany]{book}
\usepackage{pdenotes}
\hypersetup{pdftitle={%s},pdfauthor={Amer Rawashdeh}}

%% To print each hint and solution right under its exercise (e.g. for a handout), uncomment:
%% \showsolutionsinline

\begin{document}
\frontmatter
\begin{titlepage}\centering\vspace*{1.6in}
{\Huge\bfseries %s\par}\vspace{14pt}
{\Large Foundations and a case study\par}\vspace{40pt}
{\large Amer Rawashdeh\par}\vspace{8pt}
{\normalsize Draft, \today\par}\vfill
\end{titlepage}

\chapter*{Introduction}
%s

\begin{rmkbox}{How to read this}
Part~I follows the reading path layer by layer: each layer uses only the layers before it.
Part~II is the case study. %sDashed boxes mark proofs still to be written.
\end{rmkbox}

\tableofcontents

\mainmatter
\part{Foundations}
''' % (title, title, intro,
       ('%d of the %d concept sections are still stubs (statement, intuition and a reference). '
        % (len(stubs), len(pdf.CONCEPTS))) if stubs else '')]
    for L in pdf.REG['LAYERS']:
        m.append('\n\\chapter{%s}' % pdf.esc(L['title']).replace('"', '``', 1).replace('"', "''", 1))
        for c in [c for c in pdf.CONCEPTS if c['layer'] == L['n']]:
            m.append('\\input{sections/%s}' % c['id'])
    m.append('\n\\part{Case studies}')
    for c in pdf.CASES:
        m.append('\\input{sections/%s}' % c['id'])
    m.append(r'''
\appendix
\chapter{Hints to the exercises}
\printhints
\chapter{Solutions to the exercises}
\printsolutions

\end{document}''')
    write(os.path.join(OUT, 'main.tex'), tidy('\n'.join(m)))
    write(os.path.join(OUT, 'README.md'), README)

    r = subprocess.run(['latexmk', '-pdf', '-interaction=nonstopmode', '-halt-on-error', 'main.tex'],
                       cwd=OUT, capture_output=True, text=True, errors='replace')
    if r.returncode:
        print(r.stdout[-3000:])
        sys.exit('LaTeX failed; see ' + os.path.join(OUT, 'main.log'))
    print('Wrote', OUT)


README = r'''# The Analysis of Nonlinear PDEs: LaTeX source

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
'''

if __name__ == '__main__':
    build()
