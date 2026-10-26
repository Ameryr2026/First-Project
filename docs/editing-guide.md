# Editing guide

How to change, extend and publish everything on this site without outside help. Every section is
self-contained: jump to the task you need.

- [1. The basics: how editing and publishing work](#1-the-basics)
- [2. The homepage](#2-the-homepage)
- [3. Writing an Arabic math page](#3-writing-an-arabic-math-page)
- [4. Arabic math notation](#4-arabic-math-notation)
- [5. Terminology (اقتران / دالة / تابع)](#5-terminology)
- [6. Interactive pieces: Riemann sums, GeoGebra, JSXGraph](#6-interactive-pieces)
- [7. The editor, converter and commands pages](#7-the-editor-converter-and-commands-pages)
- [8. The PDE notes (website pages and PDF)](#8-the-pde-notes)
- [9. Checking your work and fixing problems](#9-checking-your-work-and-fixing-problems)

---

## 1. The basics

The site is plain files (HTML, CSS, JavaScript) served by **GitHub Pages**. There is no build step and no
server: what is in the repository is what the website shows. Pushing a change to the `main` branch
publishes it within one to two minutes.

**Three ways to edit, from simplest to most capable:**

1. **On github.com.** Open the file, click the pencil icon, edit, then "Commit changes". Good for fixing
   text or adding a paragraph.
2. **github.dev.** On the repository page press the `.` key. A full editor (VS Code) opens in the
   browser; you can edit many files and commit once.
3. **On your computer.** Install Git and an editor (VS Code is free), then:

   ```
   git clone https://github.com/Ameryr2026/First-Project.git
   cd First-Project
   python3 -m http.server 8000        # then open http://localhost:8000
   ```

   Edit, check in the browser, then `git add -A`, `git commit -m "what changed"`, `git push`.
   Use the local server rather than opening files directly: some pages load other files, which
   browsers block for `file://` addresses.

**Browser caching.** Pages load the shared scripts with a version number, e.g.
`arabic-math.js?v=18`. After you change a shared script, increase that number in every page that loads
it (search the repo for `arabic-math.js?v=`), otherwise visitors may keep the old copy for days.

---

## 2. The homepage

`index.html`. Lines marked `EDIT:` are placeholders for your own information (photo, email, papers,
talks, courses). To add a photo: put `photo.jpg` in the repository's top folder and follow the comment
next to the placeholder.

To list a new page, copy an existing `<li>…</li>` in the right list (English notes or Arabic notes) and
change the link and title.

---

## 3. Writing an Arabic math page

1. Copy `notes/ar-template.html` to a new name, e.g. `notes/limits-ar.html`.
2. Change the `<title>` and the `<h1>`.
3. Write the content inside `<main>`. Paragraphs are `<p>…</p>`, headings `<h2>…</h2>`.
   Boxes for definitions and theorems:

   ```html
   <div class="defn"><p><span class="label">تعريف.</span> … </p></div>
   <div class="thm"><p><span class="label">مبرهنة.</span> … </p></div>
   <div class="ex"><p><span class="label">مثال.</span> … </p></div>
   <div class="proof"><p><span class="label">البرهان.</span> … </p></div>
   ```

4. Write technical terms as keys, not words: `{{function}}`, not اقتران (section 5).
5. Add the page to the homepage list (section 2).

The comment block at the top of the template lists every command with examples; it is the quickest
reference while writing.

**Printing.** Readers print a page from the browser (Ctrl+P / ⌘P → "Save as PDF"). The page prints
in whichever symbol view the reader chose.

---

## 4. Arabic math notation

All Arabic pages load `notes/arabic-math.js`, which sits on top of MathJax (the standard library for
math on the web). You write LaTeX; it draws Arabic.

### Writing math

| You write | You get |
|---|---|
| `$ق(س) = س^2 + 1$` | inline math, digits shown as ١٢٣ |
| `\[ … \]` or `$$ … $$` | displayed equation |
| `\begin{equation}\label{eq:x} … \end{equation}` and `\eqref{eq:x}` | numbered equation and reference |
| `\كسر{أ}{ب}`, `\جذر{س}`, `\نها_{س \الى 0}`, `\تكامل`, `\مجموع` | Arabic command names |
| `\frac`, `\sqrt`, `\lim`, `\int`, `\sum` | the usual LaTeX commands work too |
| `\R`, `\N`, `\Z`, `\Q`, `\C`, `\mathbb{ص}` | double-struck letters (ح for the reals) |
| `\pd{ص}{س}`, `\ppd{ع}{ز}` | ordinary and partial derivatives |
| `\nas{في}` | an Arabic word inside an equation |
| `\بداية{مصفوفة} … \نهاية{مصفوفة}` | environments (matrices, cases, aligned equations) |

The full list is on the site at `notes/commands.html`, generated from the code, so it is always current.
`/` always means division (it is never a command).

### Two ways to write a page's math

- **Arabic source** (the default): write Arabic letters, `$ق(س) = س^2$`. For the Latin view, the page
  says which Latin letter each Arabic letter becomes:

  ```html
  <script>window.ArabicMathLatin = { 'س': 'x', 'ص': 'y', 'ق': 'f' };</script>
  ```

  (The standard letters are already known; only add letters you use differently.)
- **English source**: write ordinary LaTeX, `$f(x) = x^2$`, and add
  `window.ArabicMathSource = 'latin';` before `arabic-math.js` loads. The Arabic view converts it
  (x → س, f → ق, sin → جا). To change a letter: `window.ArabicMathLetters = { s: 'ت' };`.

### Adding your own commands

For one page, before `arabic-math.js` loads:

```html
<script>
  window.ArabicMathMacros   = { tdrj: '\\mathop{\\text{تدرج}}\\nolimits' };   // \tdrj
  window.ArabicMathCommands = { 'تدرج': '\\nabla' };                          // \تدرج
</script>
```

For the whole site, add the command to the `COMMANDS` list in `notes/arabic-math.js` (Arabic name →
LaTeX command) and bump the `?v=` number (section 1). The editor's suggestions and the commands page
pick it up automatically.

### The letter table

The standard Latin ↔ Arabic letters (x ↔ س, y ↔ ص, f ↔ ق, …) are one table, `LETTERS`, near the top of
`arabic-math.js`. Changing it changes every page, the converter and the editor.

---

## 5. Terminology

Arabic countries use different words for the same idea (function: اقتران in Jordan, تابع in Syria,
دالة in Egypt and the Gulf). Pages therefore write a **key** and the word comes from one dictionary,
`notes/terms.js`.

| In the page | Gives (Jordan) | Gives (Egypt) |
|---|---|---|
| `{{function}}` | اقتران | دالة |
| `{{function.def}}` | الاقتران | الدالة |
| `{{function.pl}}`, `{{function.defpl}}` | اقترانات، الاقترانات | دوال، الدوال |
| `{{function.sym}}` (inside math) | ق | د |
| `{{function?يُكتب:تُكتب}}` | يُكتب | تُكتب |

The last form picks the word that agrees in gender with the term (masculine:feminine). Use it for
adjectives, pronouns (`هو:هي`) and verbs. `ل{{function.def}}` correctly gives للاقتران.

**Add a term:** add a line to `TERMS` in `terms.js`:

```js
'matrix': { en: 'matrix', jo: { sg: 'مصفوفة', pl: 'مصفوفات', g: 'f' } },
```

`g` is the grammatical gender (`'m'` or `'f'`). If the word with ال or the plural is irregular, give
`def`, `pl` or `defpl` explicitly. The glossary page (`notes/terms.html`) updates itself.

**Change a word everywhere:** edit it in `terms.js`. That is the point of the system: when a language
specialist proposes a better term, it is a one-line change.

**Another country's version:** add the country to `REGIONS` and a column (e.g. `sy: { … }`) to the terms
that differ; missing terms fall back to the default column. Then either set `SITE_REGION = 'sy'` for the
whole site (for example in a fork of the repository) or link to a page with `?terms=sy` to show it.

**Rule of thumb:** mark every term the first time you write a page. Retrofitting finished pages is slow.

---

## 6. Interactive pieces

**GeoGebra widgets with our own inputs** (`notes/ggb-riemann.js`, `notes/ggb-volume.js`): the reader types
in boxes on our page and GeoGebra only draws. Used on the Riemann sum and volume of revolution pages.

```html
<div class="ggb-riemann" data-f="x^2" data-a="0" data-b="2" data-n="6"></div>
<div class="ggb-volume" data-f="x" data-a="0" data-b="3" data-n="6"></div>
```

All settings, how the widgets work, and how to build a new one (starting from the small example
`notes/ggb-template.js`) are in **[geogebra-widgets.md](geogebra-widgets.md)**.

**Riemann sum without GeoGebra** (`notes/riemann.js`): the older widget, drawn by our own code. It is no
longer used on the pages but still works:

```html
<div class="riemann" data-f="x^2" data-a="0" data-b="2" data-n="6" data-fn="en"></div>
```

**A GeoGebra activity as made on geogebra.org** (`notes/geogebra.js`):

```html
<div class="geogebra" data-id="mpufvzus" data-width="800" data-height="500"></div>
```

`data-id` is the part after `geogebra.org/m/` in the activity's address; the activity must be shared
publicly or by link. `data-width`/`data-height` are the activity's own size (it is scaled to fit the page).
Other options are listed at the top of `geogebra.js`.

**JSXGraph** (`notes/jsxgraph-demo.html`): an example of graphs written directly in JavaScript, for
when GeoGebra is not flexible enough. Copy the page and change the script at the bottom.

---

## 7. The editor, converter and commands pages

These are tools for writing, and they all use the same `arabic-math.js`, so anything you add there
appears in them.

- **Editor** (`notes/editor.html`): type text and math on the right, see the result on the left. Type `\`
  and a few letters for suggestions, Tab or Enter to accept. The text is kept in your browser between
  visits. The PDF button prints the preview.
- **Converter** (`notes/converter.html`): paste English LaTeX, get the Arabic version and its source.
  The letter mapping can be changed on the page. Save the result as a PNG image.
- **Commands** (`notes/commands.html`): every Arabic command with its LaTeX equivalent.

---

## 8. The PDE notes

The PDE notes are written **once, in LaTeX**, in `latex/pde-notes/`. Both the printable PDF and the English
web pages in `notes/pde/` are made from those `.tex` files. Never edit the `.html` files in `notes/pde/`:
they are rebuilt from the LaTeX on every change.

`latex/pde-notes/README.md` is the full guide (the commands for links, boxes, exercises, and what the website
understands). In short:

- **Change a page:** edit its `.tex` file in `latex/pde-notes/sections/` and commit. A couple of minutes
  later a GitHub Action (`.github/workflows/build-pde-notes.yml`) has rebuilt `main.pdf` and the web pages
  and committed them. Watch it, and see any error, under the **Actions** tab.
- **Add a page:** copy `sections/foundations/_template.tex` (or `sections/case-studies/_template.tex`),
  fill it in, and add one `\input` line to `main.tex`. The chapter it sits under is its layer on the reading
  path; the order of the `\input` lines is the reading order.
- **Link to another page:** `\pref{gronwall}{Gronwall's inequality}` (a § reference in the PDF, a link on
  the website). Prerequisites: `\prereqs{sobolev-spaces, gronwall}` near the top of the file.
- **Macros** (`\R`, `\norm{}`, `\weakto`, …): add them to the "Math macros" section of
  `latex/pde-notes/pdenotes.sty`; they then work in the PDF and on every web page.

What is made from what:

| Web file in `notes/pde/` | Made from |
|---|---|
| `<id>.html` | `sections/foundations/<id>.tex` or `sections/case-studies/<name>.tex` |
| `index.html` (the hub) | the Introduction in `main.tex`, plus the list of pages |
| `registry.js` (layers, order, prerequisites, status) | `main.tex` and each file's `\status`, `\prereqs`, `\conceptsused`, `\blurb` |
| `mathjax-config.js` | the "Math macros" section of `pdenotes.sty` |
| `wiki.js`, `pde.css` | not made: the code that draws the link boxes, and the page style |

To build the pages on your own computer: `python3 tools/tex-to-web.py` (Python 3 only, nothing to install),
then open them through the local server (section 1).

---

## 9. Checking your work and fixing problems

**Before pushing**, open the changed page through the local server (section 1) and check:
equations draw without red error text; both symbol views work (the switch at the top); the browser's
developer console (F12) shows no red errors.

| Problem | Likely cause and fix |
|---|---|
| A PDE page or the PDF did not change | Open the **Actions** tab: the run "Build the PDE notes" must finish (green). A red run means a LaTeX error (open the failed step for the log); yellow notes on the run's page list LaTeX the website did not understand. |
| Change does not appear online | Wait two minutes; hard-refresh (Ctrl+Shift+R). For shared scripts, bump `?v=` (section 1). Check the repository's Actions tab for a failed Pages build. |
| Equation shows in red | A LaTeX error: unknown command or unbalanced `{ }`. Hover over it for the message. Try the formula in the editor. |
| `{{something}}` appears on the page | The key is not in `terms.js` (check spelling), or the page does not load `terms.js` before `arabic-math.js`. |
| Arabic letter shows in the Latin view | Add it to the page's `window.ArabicMathLatin`. |
| A symbol is mirrored that should not be (or the reverse) | See "Mirroring" in [how-it-works.md](how-it-works.md). |
| GeoGebra activity is blank | The activity is not shared publicly, or the id is wrong. |
| Page works on the server but not when opened as a file | Expected; use the local server. |

To undo a change that broke something: on GitHub, open the commit and click "Revert", or locally
`git revert <commit-id>` and push. Nothing in Git history is ever lost.
