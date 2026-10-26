# Amer Rawashdeh: website and open math notes

Website: **https://ameryr2026.github.io/First-Project/**

This repository is the whole website. It has three parts:

1. **Arabic mathematics** (`notes/`): math pages written fully in Arabic, with a switch between
   Arabic symbols (equations right to left, س، ص، جا، نهــا, mirrored ∫ ∑) and the Latin symbols used in
   schools today. Includes an online editor that writes Arabic math with LaTeX-style commands
   (`\كسر{س}{٢}`), a converter from English LaTeX to Arabic, an interactive Riemann sum, and a
   terminology system that adapts the pages to each country's mathematical vocabulary.
2. **The analysis of nonlinear PDEs** (`notes/pde/`): an English wiki of the tools behind existence
   and uniqueness proofs, with exercises, hints and solutions, built around a real case study.
3. **The same PDE notes as a LaTeX book** (`latex/pde-notes/`): editable source and a printable PDF.

مستودع موقع عامر رواشدة: صفحات رياضيات بالعربية كاملة (برموز عربية أو لاتينية)، ومحرر للرياضيات
العربية، ومحوّل من LaTeX الإنجليزي، ونظام مصطلحات يمكن تكييفه لأي بلد عربي. كل شيء مفتوح المصدر
ويمكن نسخه وتعديله.

## Guides

- **[docs/editing-guide.md](docs/editing-guide.md)**: how to edit and extend everything. Start here.
- **[docs/how-it-works.md](docs/how-it-works.md)**: how the site was built and why it works the way it
  does, for anyone who wants to maintain it or build something similar.

## Folders

```
index.html              the homepage
notes/                  Arabic pages and the shared Arabic-math system
  arabic-math.js          Arabic math on top of MathJax (letters, commands, mirroring, the switch)
  terms.js                the terminology dictionary ({{function}} → اقتران / دالة …)
  ar-template.html        copy this to start a new Arabic page
  editor.html             the online Arabic math editor
  converter.html          English LaTeX → Arabic converter
  commands.html           table of all Arabic commands
  terms.html              glossary page
  riemann.js, geogebra.js interactive widgets
  pde/                    the English PDE wiki (registry in wiki.js)
latex/pde-notes/        the PDE notes as a LaTeX book (master copy for print)
tools/                  scripts: PDE pages → PDF, PDE pages → LaTeX project
docs/                   the guides
```

## Using this work

The PDE notes are licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/): share and
adapt them with credit. You are welcome to reuse the Arabic math system (`arabic-math.js`, `terms.js`, the
editor) for your own pages; please credit this site.

## How it was made

Amer Rawashdeh designed and directed the site, chose its content, and reviewed it. The code and much of
the text were written with Claude (Anthropic) as an AI assistant, in conversation; the commits show it as
co-author. [docs/how-it-works.md](docs/how-it-works.md) describes the process.
