#!/usr/bin/env python3
"""
Build a printable PDF of the PDE analysis pages (notes/pde/) with LaTeX.

    python3 tools/build-pde-pdf.py [output-folder]

Reads the registry in notes/pde/wiki.js (layers, reading order, prerequisites), converts every
page's HTML to LaTeX, and compiles with pdflatex (via latexmk). Links between pages become
section references. Part I: the concept pages, one chapter per layer, in reading order.
Part II: the case studies.

Needs: python3 with beautifulsoup4, node, and a TeX installation (pdflatex, latexmk,
mathpazo, tcolorbox, hyperref).
"""
import json, os, re, subprocess, sys, warnings
from bs4 import BeautifulSoup, NavigableString, Comment, Tag

HERE = os.path.dirname(os.path.abspath(__file__))
PDE = os.path.join(HERE, '..', 'notes', 'pde')
OUT = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.join(HERE, '..', 'build')


# ---------- the registry ----------
def read_registry():
    src = open(os.path.join(PDE, 'wiki.js'), encoding='utf-8').read()
    src = src[:src.index('(function')]                  # just the LAYERS and PAGES lists
    js = src + '\nconsole.log(JSON.stringify({LAYERS, PAGES}));'
    out = subprocess.run(['node', '-e', js], capture_output=True, text=True, check=True).stdout
    return json.loads(out)


REG = read_registry()
BY_ID = {p['id']: p for p in REG['PAGES']}
CONCEPTS = [p for p in REG['PAGES'] if p['kind'] == 'concept']
CASES = [p for p in REG['PAGES'] if p['kind'] == 'case']


# ---------- text and math ----------
MATH = re.compile(
    r'(\$\$.+?\$\$|\$.+?\$|\\\[.+?\\\]|\\\(.+?\\\)'
    r'|\\begin\{(equation|align|gather|multline)\*?\}.+?\\end\{\2\*?\}'
    r'|\\(?:eq)?ref\{[^}]*\})', re.S)

UNICODE = {'–': r'--\allowbreak{}', 'ᵖ': r'\textsuperscript{\textit{p}}', '²': r'\textsuperscript{2}', '←': r'$\leftarrow$',
           '→': r'$\rightarrow$', '’': "'", '“': '``', '”': "''", '\u00a0': '~'}
SPECIAL = {'\\': r'\textbackslash{}', '&': r'\&', '%': r'\%', '#': r'\#', '_': r'\_', '{': r'\{',
           '}': r'\}', '~': r'\textasciitilde{}', '^': r'\textasciicircum{}', '$': r'\$'}


def esc(s):
    out = []
    for ch in s:
        if ch in SPECIAL:
            if ch == '\\':
                warnings.warn('stray backslash in text: ' + s[:60])
            out.append(SPECIAL[ch])
        else:
            out.append(UNICODE.get(ch, ch))
    return ''.join(out)


def text(s, collapse=True):
    """Escape prose, keep math and \\eqref{...} exactly as written."""
    if collapse:
        s = re.sub(r'\s+', ' ', s)
    parts, last = [], 0
    for m in MATH.finditer(s):
        parts.append(esc(s[last:m.start()]))
        parts.append(m.group(0))
        last = m.end()
    parts.append(esc(s[last:]))
    joined = ''.join(parts)
    if joined.count('$') % 2:
        warnings.warn('unbalanced $ in: ' + s[:80])
    return joined


# ---------- links ----------
def ref_for(href):
    if not href or href.startswith(('http:', 'https:', 'mailto:')):
        return None
    pid = re.sub(r'\.html(#.*)?$', '', href.split('/')[-1])
    return pid if pid in BY_ID else None


def where(pid):
    p = BY_ID[pid]
    return (r'Chapter~\ref{p:%s}' if p['kind'] == 'case' else r'\S\ref{p:%s}') % pid


# ---------- HTML → LaTeX ----------
HINTS = []      # (page id, exercise number, hint LaTeX), printed in Appendix A
SOLUTIONS = []  # (page id, exercise number, solution LaTeX), printed in Appendix B


class Page:
    def __init__(self, pid, file=None):
        self.pid = pid
        self.meta = BY_ID.get(pid, {'kind': 'hub'})
        html = open(os.path.join(PDE, file or pid + '.html'), encoding='utf-8').read()
        self.soup = BeautifulSoup(html, 'html.parser')
        self.main = self.soup.find('main')

    # inline content of an element
    def inline(self, el):
        out = []
        for c in el.children:
            if isinstance(c, Comment):
                continue
            if isinstance(c, NavigableString):
                out.append(text(str(c)))
                continue
            name, cls = c.name, c.get('class') or []
            inner = self.inline(c)
            if name == 'em':
                out.append(r'\emph{%s}' % inner)
            elif name in ('strong', 'b'):
                out.append(r'\textbf{%s}' % inner)
            elif name == 'code':
                out.append(r'\texttt{%s}' % inner)
            elif name == 'a':
                pid = ref_for(c.get('href'))
                if pid:
                    out.append(r'%s~(%s)' % (inner, where(pid)))
                elif c.get('href', '').startswith('http'):
                    out.append(r'\href{%s}{%s}' % (c['href'].replace('%', r'\%').replace('#', r'\#'), inner))
                else:
                    out.append(inner)
            elif name == 'span' and 'tag-routine' in cls:
                out.append(r'\routine{}')
            elif name == 'span' and 'tag-new' in cls:
                out.append(r'\newidea{}')
            elif name == 'span' and 'label' in cls:
                out.append(r'\textbf{%s}' % inner)
            elif name == 'br':
                out.append(r'\\')
            else:
                out.append(inner)
        return ''.join(out).strip()

    # block content of an element
    def blocks(self, el, depth=0):
        out = []
        for c in el.children:
            if isinstance(c, Comment):
                continue
            if isinstance(c, NavigableString):
                s = str(c).strip()
                if s:                                  # display math sitting between paragraphs
                    out.append(text(s, collapse=False))
                continue
            out.append(self.block(c, depth))
        return '\n\n'.join(x for x in out if x)

    def block(self, c, depth):
        name, cls, cid = c.name, c.get('class') or [], c.get('id')
        if name == 'h1':
            return ''                                  # the page title is the section/chapter heading
        if name == 'h2':
            t = self.inline(c)
            if self.meta['kind'] == 'case':
                m = re.match(r'^\d+\.\s*(.*)$', t)
                return r'\section{%s}' % m.group(1) if m else r'\section*{%s}' % t
            return r'\subsection*{%s}' % t
        if name == 'h3':
            return (r'\subsection*{%s}' if self.meta['kind'] == 'case' else r'\paragraph{%s}') % self.inline(c)
        if name == 'h4':
            return r'\paragraph{%s}' % self.inline(c)
        if name == 'p':
            body = self.inline(c)
            if 'uses' in cls:
                return r'\uses{%s}' % re.sub(r'^Uses:\s*', '', body)
            if 'muted' in cls:
                return r'{\small\itshape %s\par}' % body
            return body
        if name in ('ul', 'ol'):
            env = 'enumerate' if name == 'ol' else 'itemize'
            items = '\n'.join(r'\item ' + self.li(li, depth) for li in c.find_all('li', recursive=False))
            opt = '[label={[\\arabic*]}, leftmargin=*]' if 'refs' in cls else ''
            return '\\begin{%s}%s\n%s\n\\end{%s}' % (env, opt, items, env)
        if name == 'div':
            if cid == 'page-meta' or cid == 'pager' or cid == 'used-in':
                return ''
            if cid == 'prereqs':
                pre = self.meta.get('prereqs') or []
                return (r'\prereqs{%s}' % ', '.join(r'%s~(%s)' % (esc(BY_ID[p]['title']), where(p)) for p in pre)
                        if pre else '')
            if cid == 'concepts-used':
                return self.concepts_used()
            if 'byline' in cls:
                return r'\begin{byline}%s\end{byline}' % self.inline(c)
            if 'proof-slot' in cls:
                return r'\begin{proofslot}%s\end{proofslot}' % self.inline(c)
            if 'step' in cls:
                h4 = c.find('h4')
                title = self.inline(h4) if h4 else ''
                if h4:
                    h4.extract()
                env = 'stepnew' if 'new' in cls else 'step'
                return '\\begin{%s}{%s}\n%s\n\\end{%s}' % (env, title, self.blocks(c, depth + 1), env)
            if 'exercise' in cls:
                lab = c.find('span', class_='label')
                n = re.sub(r'\D', '', lab.get_text()) if lab else str(len(HINTS) + 1)
                if lab:
                    lab.extract()
                def take(kind):
                    """Remove the folded box of this kind (hint or solution) and return its LaTeX."""
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
                if hint:
                    HINTS.append((self.pid, n, hint))
                if sol:
                    SOLUTIONS.append((self.pid, n, sol))
                where_to = []
                if hint:
                    where_to.append(r'Hint on page~\pageref{h:%s:%s}' % (self.pid, n))
                if sol:
                    where_to.append(r'solution on page~\pageref{s:%s:%s}' % (self.pid, n))
                ref = (r'\par\hfill{\footnotesize\color{black!60}%s}' % ' \\textperiodcentered\\ '.join(where_to)
                       if where_to else '')
                return '\\begin{exercisebox}{Exercise \\thesection.%s}\\label{x:%s:%s}\n%s%s\n\\end{exercisebox}' % (
                    n, self.pid, n, self.blocks(c, depth + 1), ref)
            for kind in ('thm', 'defn', 'rmk', 'ex'):
                if kind in cls:
                    lab = c.find('span', class_='label')
                    title = ''
                    if lab:
                        title = self.inline(lab).rstrip('.')
                        lab.extract()
                    return '\\begin{%sbox}{%s}\n%s\n\\end{%sbox}' % (kind, title, self.blocks(c, depth + 1), kind)
            return self.blocks(c, depth + 1)
        return self.inline(c)

    def li(self, li, depth):
        if li.find(['p', 'ul', 'ol', 'div']):
            return self.blocks(li, depth + 1)
        return self.inline(li)

    def concepts_used(self):
        rows = []
        for L in REG['LAYERS']:
            ids = [i for i in self.meta.get('uses', []) if BY_ID.get(i, {}).get('layer') == L['n']]
            for i in ids:
                rows.append(r'\item %s~(%s)' % (esc(BY_ID[i]['title']), where(i)))
        return ('\\begin{conceptsbox}\n\\begin{multicols}{2}\\small\\raggedright\n\\begin{itemize}[leftmargin=*,itemsep=1pt]\n'
                + '\n'.join(rows) + '\n\\end{itemize}\n\\end{multicols}\n\\end{conceptsbox}')

    def needed_for(self):
        req = [c for c in CONCEPTS if self.pid in c.get('prereqs', [])]
        if not req:
            return ''
        return r'\neededfor{%s}' % ', '.join(r'%s~(%s)' % (esc(c['title']), where(c['id'])) for c in req)

    def latex(self):
        title = esc(self.meta['title']) if self.meta['kind'] == 'concept' else text(self.main.find('h1').get_text())
        body = self.blocks(self.main)
        if self.meta['kind'] == 'concept':
            return '\\section{%s}\\label{p:%s}\n\n%s\n\n%s\n' % (title, self.pid, body, self.needed_for())
        return '\\chapter{%s}\\label{p:%s}\n\n%s\n' % (title, self.pid, body)


def hub_intro():
    hub = Page('hub', 'index.html')
    paras = []
    for c in hub.main.children:
        if isinstance(c, Tag) and c.name == 'h2':
            break                                       # the introduction ends at the first heading
        if isinstance(c, Tag) and c.name == 'p':
            paras.append(hub.inline(c))
    return '\n\n'.join(paras), hub.main.find('h1').get_text().strip()


PREAMBLE = r"""\documentclass[11pt,openany]{book}
\usepackage[letterpaper,margin=1.1in,headheight=14pt]{geometry}
\usepackage[T1]{fontenc}
\usepackage[utf8]{inputenc}
\usepackage[sc]{mathpazo}
\linespread{1.05}
\usepackage[skip=6pt plus 1pt]{parskip}  % block paragraphs, as on the website
\usepackage{amsmath,amssymb,mathtools}
\usepackage{microtype}
\usepackage{enumitem}
\usepackage{multicol}
\usepackage[dvipsnames]{xcolor}
\usepackage[most]{tcolorbox}
\usepackage{titlesec}
\usepackage{fancyhdr}
\usepackage[colorlinks=true,linkcolor=MidnightBlue,urlcolor=MidnightBlue,citecolor=MidnightBlue]{hyperref}

% ---- the website's macros (notes/pde/mathjax-config.js) ----
\newcommand{\R}{\mathbb{R}}
\newcommand{\N}{\mathbb{N}}
\newcommand{\dv}{\operatorname{div}}
\newcommand{\norm}[1]{\left\lVert #1\right\rVert}
\newcommand{\abs}[1]{\left\lvert #1\right\rvert}
\newcommand{\Lame}{\mathcal{L}}
\newcommand{\weakto}{\rightharpoonup}
\newcommand{\weakstarto}{\overset{*}{\rightharpoonup}}
\providecommand{\lt}{<}
\providecommand{\gt}{>}

% ---- colours and boxes ----
\definecolor{accent}{HTML}{0C4A6E}
\definecolor{boxbg}{HTML}{F2F0EA}
\definecolor{newidea}{HTML}{C2410C}
\tcbset{base/.style={enhanced,breakable,colback=boxbg,colframe=accent,boxrule=0pt,leftrule=2.5pt,arc=0pt,
  left=8pt,right=8pt,top=5pt,bottom=5pt,before skip=10pt,after skip=10pt,
  fonttitle=\bfseries,coltitle=black,attach title to upper={.\ },detach title}}
\newtcolorbox{thmbox}[1]{base,title={#1},before upper={\textbf{\tcbtitle}.\ \itshape}}
\newtcolorbox{defnbox}[1]{base,title={#1},before upper={\textbf{\tcbtitle}.\ }}
\newtcolorbox{rmkbox}[1]{base,colframe=black!25,title={#1},before upper={\textbf{\tcbtitle}.\ }}
\newtcolorbox{exbox}[1]{base,colframe=black!25,title={#1},before upper={\textbf{\tcbtitle}.\ }}
\newtcolorbox{step}[1]{enhanced,breakable,colback=white,colframe=black!20,boxrule=0.6pt,arc=2pt,
  left=8pt,right=8pt,top=4pt,bottom=4pt,before skip=10pt,after skip=10pt,
  title={#1},coltitle=black,colbacktitle=black!5,fonttitle=\bfseries,toptitle=2pt,bottomtitle=2pt}
\newtcolorbox{stepnew}[1]{enhanced,breakable,colback=newidea!3,colframe=newidea!70,boxrule=0.8pt,arc=2pt,
  left=8pt,right=8pt,top=4pt,bottom=4pt,before skip=10pt,after skip=10pt,
  title={#1},coltitle=black,colbacktitle=newidea!10,fonttitle=\bfseries,toptitle=2pt,bottomtitle=2pt}
\newtcolorbox{proofslot}{enhanced,breakable,colback=white,colframe=black!40,boxrule=0.6pt,arc=2pt,
  borderline={0.6pt}{0pt}{black!40,dashed},frame hidden,fontupper=\itshape\small,before skip=8pt,after skip=12pt}
\newtcolorbox{conceptsbox}{enhanced,breakable,colback=boxbg,colframe=boxbg,arc=2pt,
  title={Concepts used in this case study},coltitle=accent,colbacktitle=boxbg,fonttitle=\bfseries\small}
\newtcolorbox{exercisebox}[1]{enhanced,breakable,colback=white,colframe=accent!45,boxrule=0.6pt,arc=2pt,
  left=8pt,right=8pt,top=5pt,bottom=5pt,before skip=8pt,after skip=8pt,
  title={#1},coltitle=black,fonttitle=\bfseries,detach title,before upper={\textbf{\tcbtitle}.\ }}
\newenvironment{byline}{\begin{quote}\small}{\end{quote}}
\newcommand{\routine}{\fcolorbox{black!30}{black!5}{\sffamily\scriptsize\strut routine}\ }
\newcommand{\newidea}{\fcolorbox{newidea!60}{newidea!10}{\sffamily\scriptsize\color{newidea}\strut new idea}\ }
\newcommand{\uses}[1]{\par\smallskip{\small\color{black!70}\textit{Uses:} #1\par}}
\newcommand{\prereqs}[1]{\noindent{\small\color{black!70}\textit{Before reading this:} #1\par}\medskip}
\newcommand{\neededfor}[1]{\par\medskip\noindent{\small\color{black!70}\textit{Needed for:} #1\par}}

% ---- headings and page style ----
\titleformat{\chapter}[display]{\normalfont\bfseries}{\large\color{accent}\MakeUppercase{\chaptertitlename}\ \thechapter}{4pt}{\LARGE}
\titlespacing*{\chapter}{0pt}{0pt}{24pt}
\titleformat{\section}{\normalfont\Large\bfseries}{\color{accent}\thesection}{0.8em}{}
\titleformat*{\subsection}{\normalfont\large\bfseries}
\pagestyle{fancy}
\fancyhf{}
\fancyhead[LE]{\small\nouppercase{\leftmark}}
\fancyhead[RO]{\small\nouppercase{\rightmark}}
\fancyfoot[C]{\small\thepage}
\renewcommand{\headrulewidth}{0.3pt}
\setlist{itemsep=2pt}
\setlength{\emergencystretch}{3em}  % room to break lines around long dashed names
\setcounter{tocdepth}{1}
\numberwithin{equation}{chapter}
\hypersetup{pdftitle={The analysis of nonlinear PDEs},pdfauthor={Amer Rawashdeh}}
"""


def build():
    os.makedirs(OUT, exist_ok=True)
    intro, hub_title = hub_intro()
    parts = [PREAMBLE, r'\begin{document}', r'\frontmatter',
             r'''\begin{titlepage}\centering\vspace*{1.6in}
{\Huge\bfseries %s\par}\vspace{14pt}
{\Large Foundations and a case study\par}\vspace{40pt}
{\large Amer Rawashdeh\par}\vspace{8pt}
{\normalsize Draft, \today\par}\vfill
{\small Typeset from the PDE analysis pages of the author's website.\par}
\end{titlepage}''' % hub_title.replace('nonlinear PDEs', 'Nonlinear PDEs').replace('The analysis', 'The Analysis')]
    parts.append(r'\chapter*{Introduction}' + '\n' + intro)
    stubs = [c for c in CONCEPTS if c.get('status') != 'done']
    parts.append(r'\begin{rmkbox}{In this PDF}'
                 'Part~I follows the reading path layer by layer: each layer uses only the layers before it. '
                 'Part~II is the case study. Section references (\\S) replace the website\'s links. '
                 + ('%d of the %d concept sections are still stubs (statement, intuition and a reference). '
                    % (len(stubs), len(CONCEPTS)) if stubs else '')
                 + 'Dashed boxes mark proofs still to be written.\\end{rmkbox}')
    parts.append(r'\tableofcontents')
    parts.append(r'\mainmatter')
    parts.append(r'\part{Foundations}')
    for L in REG['LAYERS']:
        parts.append(r'\chapter{%s}' % esc(L['title']).replace('"', "``", 1).replace('"', "''", 1))
        for c in [c for c in CONCEPTS if c['layer'] == L['n']]:
            parts.append(Page(c['id']).latex())
    parts.append(r'\part{Case studies}')
    for c in CASES:
        parts.append(Page(c['id']).latex())
    def appendix(title, items, tag):
        parts.append(r'\chapter{%s}' % title)
        last = None
        for pid, n, body in items:
            if pid != last:
                parts.append(r'\section*{%s~(%s)}' % (esc(BY_ID[pid]['title']), where(pid)))
                last = pid
            # \ref{x:...} gives the section number (the label sits inside the section); the exercise number follows it.
            parts.append(r'\noindent\textbf{Exercise~\ref{x:%s:%s}.%s.}\label{%s:%s:%s} %s'
                         % (pid, n, n, tag, pid, n, body))

    if HINTS or SOLUTIONS:
        parts.append(r'\appendix')
    if HINTS:
        appendix('Hints to the exercises', HINTS, 'h')
    if SOLUTIONS:
        appendix('Solutions to the exercises', SOLUTIONS, 's')
    parts.append(r'\end{document}')

    tex = os.path.join(OUT, 'pde-analysis.tex')
    open(tex, 'w', encoding='utf-8').write('\n\n'.join(parts))
    r = subprocess.run(['latexmk', '-pdf', '-interaction=nonstopmode', '-halt-on-error', 'pde-analysis.tex'],
                       cwd=OUT, capture_output=True, text=True, errors='replace')
    if r.returncode:
        print(r.stdout[-3000:])
        sys.exit('LaTeX failed; see ' + os.path.join(OUT, 'pde-analysis.log'))
    print('Wrote', os.path.join(OUT, 'pde-analysis.pdf'))


if __name__ == '__main__':
    build()
