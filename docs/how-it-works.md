# How it works

How this site was built, the ideas behind each part, and the decisions that shaped them. Read this before
making deep changes, or if you want to build something similar for another language or subject.

- [The overall design](#the-overall-design)
- [Arabic math on the web](#arabic-math-on-the-web)
- [The terminology system](#the-terminology-system)
- [The PDE wiki](#the-pde-wiki)
- [From web pages to LaTeX and PDF](#from-web-pages-to-latex-and-pdf)
- [How it was made](#how-it-was-made)
- [Known limits and ideas for later](#known-limits-and-ideas-for-later)

---

## The overall design

**Static files, no build step.** The site is plain HTML, CSS and JavaScript on GitHub Pages. Nothing is
generated on a server and there is no framework to update, so the site keeps working for years without
maintenance, and anyone can read or copy any page. The `.nojekyll` file tells GitHub Pages to serve the
files exactly as they are.

**Shared code, thin pages.** Each feature lives in one script that pages load: `arabic-math.js` (Arabic
math), `terms.js` (terminology), `ggb-riemann.js` and `ggb-volume.js` (interactive GeoGebra pieces), `pde/wiki.js` (the
PDE wiki's links). A page is mostly content plus a few `<div>` tags and settings. Fixing a script fixes
every page.

**One source of truth for each list.** The letters, the Arabic commands, the terms, and the PDE page
registry each exist in exactly one place, and everything else (the editor's suggestions, the commands
page, the glossary, the hub's reading path) is generated from them.

---

## Arabic math on the web

### The starting point

[MathJax](https://www.mathjax.org/) turns LaTeX in a web page into drawn math. It works in three steps:
read the LaTeX, convert it to an internal tree (MathML: identifiers, numbers, operators, text), and draw
the tree as SVG pictures. MathJax lets a script step in between these stages. `arabic-math.js` uses those
hooks; it does not change MathJax itself.

### The two views

The reader's switch chooses a view, remembered in the browser (`localStorage`) and also selectable with
`?math=ar` or `?math=latin` in the address:

- **Arabic view:** Arabic letters, Arabic function names (جا، نهــا), Arabic-Indic digits (١٢٣), Arabic
  comma (،), equations read right to left with ∫ ∑ √ ∂ and arrows mirrored.
- **Latin view:** the notation used in Jordanian schools today: Arabic text, but equations left to right
  with x, y, f, sin, lim and digits 0–9.

### The pipeline

1. **Before MathJax reads the page:** the terms (`{{function}}`) are filled in, and Arabic environment
   names (`\بداية{مصفوفة}`) are translated to LaTeX ones (`\begin{bmatrix}`). This must happen in the
   page text itself, because MathJax finds displayed math by looking for `\begin{…}`.
2. **Before parsing (pre-filters):** Arabic command names are replaced by LaTeX commands
   (`\كسر` → `\frac`), longest name first so that `\جاس` reads as `\جا س`. In the Latin view, Arabic
   letters are replaced by Latin ones from the letter table; on English-source pages in the Arabic view,
   Latin letters and commands are converted to Arabic instead.
3. **After parsing (post-filters):** the MathML tree is walked. In the Arabic view digits become ١٢٣,
   commas become ،, Arabic letters are set upright (math italic does not exist for Arabic), double-struck
   letters use the Unicode Arabic Mathematical Alphabetic Symbols (U+1EEA0 block), and every letter,
   number and word is marked "keep".
4. **After drawing: mirroring.** The whole SVG of each equation is flipped horizontally
   (`scaleX(-1)`), which reverses the reading order and mirrors ∫, ∑, √, ∂, brackets and arrows. Then each
   element marked "keep" is flipped back around its own centre, so letters and digits read normally.
   The result is a right-to-left equation built from ordinary MathJax output. This trick is why
   symbols are mirrored without a special font.

### Commands with Arabic names

The goal was a writing system a LaTeX user learns in minutes: the same structure, `\` for commands,
`{}` for arguments, `_` and `^`, with Arabic names (`\كسر{أ}{ب}`, `\نها_{س \الى 0}`). The backslash
stays as the command character because it is what every LaTeX user knows; `/` is never a command, since
in Arabic writing it is division. Names were chosen by meaning, not by the shape of the English one
(`\افتح( … \اغلق)` for `\left( … \right)`).

The same tables work in reverse: the converter turns English LaTeX into the Arabic form, and the
commands page lists every pair.

### The letter table

Latin and Arabic letters are paired mostly by sound, then by the old abjad order (أ ب ج د = a b c d):
x → س, y → ص, f → ق as in Arab textbooks. e is هـ (a bare ه looks like ٥), g, p, v use گ پ ڤ, and o is
left Latin because it looks like ٠ and و means "and".

### Fonts

Arabic text in equations uses Noto Naskh Arabic, and the double-struck letters need Noto Sans Math
(few fonts have them). The scripts wait for the fonts before drawing, because MathJax measures letter
widths once and would otherwise space equations wrongly.

---

## The terminology system

There is no single standard Arabic mathematical vocabulary. `terms.js` keeps one dictionary: each term
has a key, an English name, and per-country forms (singular, plural, with ال, gender, letter in
equations). Pages contain keys like `{{function.def}}`; before anything is drawn, the script replaces
them with the words of the chosen terminology.

Arabic grammar is the hard part: adjectives, pronouns and verbs agree in gender with the noun, and
اقتران (masculine) and دالة (feminine) differ. So the markup carries both forms where agreement matters
(`{{function?متصل:متصلة}}`), and the script picks one from the term's gender. The preposition ل joins
with ال (ل + الاقتران = للاقتران) automatically.

The site shows one terminology (Jordan). Others are produced on request or in forks by adding a column;
`?terms=eg` shows a page in another terminology without changing the site. The reference dictionaries
of the Arabic language bodies (Rabat, Damascus, Cairo) are linked from the glossary page.

---

## The PDE wiki

The PDE notes are organised like a small wiki for a reason: a reader who meets a tool in a proof should
be able to look it up, and see what it depends on, without reading a textbook from the start.

- **Concept pages** each hold one tool: statement, idea, why it is plausible, exercises, a reference.
- **Case studies** walk through a real proof and link every tool they use.
- **Layers** order the concepts so that each uses only earlier ones; this is the reading path.

`registry.js` holds the list of pages with their layer and prerequisites, and `wiki.js` builds every
page's links from it. The pages themselves contain no navigation, so moving a page or changing a
prerequisite is a one-line change in the LaTeX.

---

## One LaTeX source for the PDF and the web pages

The notes were first written as web pages and exported once to LaTeX. Keeping two copies in step by hand
does not last, so the direction was reversed: the LaTeX in `latex/pde-notes/` is now the only source, and
`tools/tex-to-web.py` turns it into the web pages on every change (run by a GitHub Action, together with
pdfLaTeX for the PDF).

The converter is a small hand-written reader for the LaTeX these notes use, in plain Python with no
packages: paragraphs, headings, lists, text commands, and the boxes of `pdenotes.sty`. Math is not
converted at all: it is copied to the page and MathJax draws it, since MathJax and LaTeX read the same
notation, and the macros are copied from `pdenotes.sty` into `mathjax-config.js`. A general converter
such as Pandoc was not used because the notes' own boxes, exercises and page links matter more than
general LaTeX coverage, and a short script is easy to extend when a new command appears. Anything it does
not know is reported as a warning rather than silently dropped.

The links between pages are written with ids (`\pref{gronwall}{...}`, `\prereqs{gronwall}`), not page
numbers, so both outputs can use them: LaTeX prints titles and section numbers through `\nameref` and
`\ref`, and the converter makes links. The "Needed for" lists are the reverse of the prerequisites; in
LaTeX they travel through the `.aux` file (each `\prereqs` writes a line that the page it names reads on
the next run), on the website `wiki.js` computes them.

Exercises keep their hint and solution inside them; the style collects these into the appendices with a
small piece of LaTeX (`environ` captures each hint and solution, and they are stored and printed at
`\printhints` / `\printsolutions`). An earlier attempt with the `answers` package failed inside the
exercise boxes, which is why the collector is custom. On the web, they become "click to open" boxes.

pdfLaTeX with the Palatino-like `mathpazo` fonts was chosen because it compiles everywhere, including
Overleaf's default settings. Arabic LaTeX would need XeLaTeX or LuaLaTeX instead.

---

## How it was made

The site was built in October 2026 by Amer Rawashdeh working with Claude (Anthropic), an AI assistant,
over a series of conversations. Amer set the goals and content, made the design decisions (Arabic
symbols with a switch, LaTeX-style Arabic commands, the terminology system, the structure of the PDE
notes), tested the pages, and caught errors. Claude wrote the code and drafted much of the text,
exercises and solutions. Every commit records both.

The working method, which anyone can reuse with or without an AI assistant:

1. **Start from a concrete need**, e.g. "the Arabic Wikipedia uses English symbols in math", and build
   the smallest version that shows the idea on one real page.
2. **Look at the result, not the code.** Each change was checked by rendering the pages in a headless
   browser (Playwright with Chromium) and looking at screenshots, and by compiling the LaTeX and reading
   the PDF. Errors in MathJax and in LaTeX logs were treated as failures.
3. **Generalise only after it works once:** the Riemann page came before `riemann.js`; one marked page
   came before the terminology dictionary.
4. **Keep each list in one place** and generate everything else from it (see above).
5. **Write instructions where they are needed:** comments at the top of each script and template explain
   how to use it, so the code documents itself.

## Known limits and ideas for later

- **Arabic math in LaTeX.** The Arabic system lives in the browser. A LuaLaTeX package using the same
  command names would let the same source produce printed books; the command names were chosen with
  this in mind.
- **Editor support for terms.** The editor could suggest `{{…}}` keys as it suggests commands.
- **Mirroring edge cases.** Mirroring flips "keep" elements around their own centre; very wide
  elements (long words inside equations) can need spacing adjustments.
- **Visitor statistics.** GitHub Pages has none; a free, privacy-friendly counter such as GoatCounter
  can be added with one script tag.
- **Terminology columns** for Syria, Egypt, the Gulf and the Maghreb, ideally checked against the
  unified dictionaries and by teachers from each country.
