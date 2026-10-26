#!/usr/bin/env python3
"""
Build the PDE pages of the website (notes/pde/) from the LaTeX notes (latex/pde-notes/).

    python3 tools/tex-to-web.py

The .tex files are the only copy you edit. This script writes, in notes/pde/:
    <id>.html          one page per \\input line in main.tex (concept pages and case studies)
    index.html         the hub: the Introduction of main.tex, the case studies and the reading path
    registry.js        the list of pages (layers = the chapters of Part I, prerequisites, status)
    mathjax-config.js  the math macros, read from the "Math macros" section of pdenotes.sty

It does not touch pde.css or wiki.js (the code that draws the boxes and links from registry.js).
GitHub runs it automatically (.github/workflows/build-pde-notes.yml) whenever a .tex or .sty file
changes, so you never need to run it yourself. It only needs Python 3, no extra packages.

LaTeX it understands: paragraphs, $..$ \\(..\\) \\[..\\] $$..$$ and the equation/align/gather/multline
environments (passed to MathJax as they are), \\section \\subsection \\subsubsection \\paragraph,
itemize/enumerate, \\emph \\textit \\textbf \\texttt \\textsuperscript \\textsubscript \\href \\url \\footnote,
and the commands and boxes of pdenotes.sty. Anything else is reported as a warning and its text is kept.
"""
import html, json, os, re, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
TEX = os.path.join(ROOT, 'latex', 'pde-notes')
WEB = os.path.join(ROOT, 'notes', 'pde')
WARNINGS = []


def warn(where, msg):
    WARNINGS.append(f'{where}: {msg}')


# ====================================================================== small parsing helpers

def strip_comments(s):
    """Remove % comments (not \\%). A comment eats its line break, as in TeX, except on a blank line."""
    out = []
    for line in s.split('\n'):
        m = re.search(r'(?<!\\)%', line)
        if m:
            # \\% is a line break followed by a comment
            i = m.start()
            while True:
                bs = len(line[:i]) - len(line[:i].rstrip('\\'))
                if bs % 2 == 0:
                    break
                m = re.search(r'(?<!\\)%', line[i + 1:])
                if not m:
                    i = None
                    break
                i = i + 1 + m.start()
            if i is not None:
                kept = line[:i]
                out.append(kept + ('\x00' if kept.strip() else ''))   # \x00 = "join with next line"
                continue
        out.append(line)
    s = '\n'.join(out)
    s = re.sub(r'\x00\n[ \t]*', '', s)
    return s.replace('\x00', '')


def skip_ws(s, i):
    while i < len(s) and s[i] in ' \t\n':
        i += 1
    return i


def read_group(s, i, where='?'):
    """s[i:] starts (after spaces) with {...}: return (content, index after the closing brace)."""
    i = skip_ws(s, i)
    if i >= len(s) or s[i] != '{':
        # a single token argument, e.g. \textbf x
        if i < len(s) and s[i] == '\\':
            m = re.match(r'\\([a-zA-Z]+|.)', s[i:])
            return m.group(0), i + len(m.group(0))
        if i < len(s):
            return s[i], i + 1
        warn(where, 'missing argument')
        return '', i
    depth, j = 0, i
    while j < len(s):
        c = s[j]
        if c == '\\':
            j += 2
            continue
        if c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                return s[i + 1:j], j + 1
        j += 1
    warn(where, 'unbalanced braces')
    return s[i + 1:], len(s)


def read_optional(s, i):
    """An optional [..] argument at s[i:] (no spaces skipped before it)."""
    if i < len(s) and s[i] == '[':
        depth, j = 0, i
        while j < len(s):
            if s[j] == '{':
                depth += 1
            elif s[j] == '}':
                depth -= 1
            elif s[j] == ']' and depth == 0:
                return s[i + 1:j], j + 1
            j += 1
    return None, i


def find_end(s, i, env):
    """s[i:] is just after \\begin{env}; return (body, index after the matching \\end{env})."""
    pat = re.compile(r'\\(begin|end)\{' + re.escape(env) + r'\}')
    depth = 1
    for m in pat.finditer(s, i):
        depth += 1 if m.group(1) == 'begin' else -1
        if depth == 0:
            return s[i:m.start()], m.end()
    raise ValueError(f'\\begin{{{env}}} without \\end{{{env}}}')


def split_list(arg):
    return [x.strip() for x in arg.split(',') if x.strip()]


MATH_ENVS = {'equation', 'equation*', 'align', 'align*', 'gather', 'gather*', 'multline', 'multline*',
             'flalign', 'flalign*', 'alignat', 'alignat*', 'eqnarray', 'eqnarray*'}


def esc_math(m):
    return m.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def read_math(s, i):
    """If s[i:] starts inline or display math, return (kind, raw, end) with kind 'inline' or 'display'."""
    if s.startswith('$$', i):
        j = s.find('$$', i + 2)
        if j < 0:
            raise ValueError('unclosed $$')
        return 'display', '\\[' + s[i + 2:j] + '\\]', j + 2
    if s[i] == '$':
        j = i + 1
        while j < len(s):
            if s[j] == '\\':
                j += 2
                continue
            if s[j] == '$':
                return 'inline', s[i:j + 1], j + 1
            j += 1
        raise ValueError('unclosed $')
    if s.startswith('\\(', i):
        j = s.find('\\)', i)
        return 'inline', s[i:j + 2], j + 2
    if s.startswith('\\[', i):
        j = s.find('\\]', i)
        return 'display', s[i:j + 2], j + 2
    m = re.match(r'\\begin\{([a-zA-Z*]+)\}', s[i:])
    if m and m.group(1) in MATH_ENVS:
        body, end = find_end(s, i + m.end(), m.group(1))
        return 'display', s[i:end], end
    return None


# ====================================================================== the converter

TEXT_SYMBOLS = {
    'S': '§', 'P': '¶', 'ldots': '…', 'dots': '…', 'textperiodcentered': '·', 'textbullet': '•',
    'textendash': '–', 'textemdash': '—', 'copyright': '©', 'textasciitilde': '~', 'textbackslash': '\\',
    'LaTeX': 'LaTeX', 'TeX': 'TeX', 'quad': '\u2003', 'qquad': '\u2003\u2003', 'enspace': '\u2002',
    'textdegree': '°', 'pounds': '£', 'euro': '€', 'ss': 'ß', 'ae': 'æ', 'oe': 'œ', 'o': 'ø', 'O': 'Ø',
    'aa': 'å', 'i': 'ı', 'l': 'ł', 'L': 'Ł',
}
IGNORED = {'small', 'footnotesize', 'scriptsize', 'tiny', 'normalsize', 'large', 'Large', 'LARGE', 'huge',
           'raggedright', 'raggedleft', 'centering', 'noindent', 'indent', 'medskip', 'smallskip', 'bigskip',
           'par', 'newline', 'linebreak', 'pagebreak', 'newpage', 'clearpage', 'nopagebreak', 'allowbreak',
           'hfill', 'vfill', 'null', 'relax', 'protect', 'leavevmode', 'nobreak', 'sloppy', 'normalfont',
           'itshape', 'bfseries', 'upshape', 'rmfamily', 'sffamily', 'ttfamily', 'mdseries', 'scshape',
           'qed', 'qedhere'}
WRAPPERS = {'emph': 'em', 'textit': 'em', 'textsl': 'em', 'textbf': 'strong', 'texttt': 'code',
            'textsuperscript': 'sup', 'textsubscript': 'sub', 'underline': 'u', 'textsc': None,
            'textrm': None, 'textsf': None, 'textup': None, 'textnormal': None, 'mbox': None, 'text': None,
            'hbox': None, 'textmd': None}
ACCENTS = {"'": '\u0301', '`': '\u0300', '^': '\u0302', '"': '\u0308', '~': '\u0303', '=': '\u0304',
           '.': '\u0307', 'c': '\u0327', 'v': '\u030c', 'u': '\u0306', 'H': '\u030b', 'k': '\u0328'}
BOXES = {'thmbox': 'thm', 'defnbox': 'defn', 'rmkbox': 'rmk', 'exbox': 'ex'}


class Page:
    def __init__(self, path, info, registry):
        self.path = path
        self.where = os.path.relpath(path, ROOT)
        self.info = info
        self.reg = registry
        self.n_ex = 0
        self.sec = 0
        self.links = set()
        self.footnotes = []
        self.terms = []

    # ---------------------------------------------------------------- inline text
    def inline(self, s):
        out, i = [], 0
        while i < len(s):
            c = s[i]
            if c in '$' or s.startswith('\\(', i) or s.startswith('\\[', i):
                kind, raw, i = read_math(s, i)
                out.append(esc_math(raw) if kind == 'inline' else '\n' + esc_math(raw) + '\n')
                continue
            if c == '\\':
                text, i = self.command(s, i)
                out.append(text)
                continue
            if c == '{':
                g, i = read_group(s, i, self.where)
                out.append(self.inline(g))
                continue
            if c == '}':
                warn(self.where, 'stray }')
                i += 1
                continue
            if c == '~':
                out.append('\u00a0')
                i += 1
                continue
            if s.startswith('---', i):
                out.append('—'); i += 3; continue
            if s.startswith('--', i):
                out.append('–'); i += 2; continue
            if s.startswith('``', i):
                out.append('“'); i += 2; continue
            if s.startswith("''", i):
                out.append('”'); i += 2; continue
            if c == '&':
                out.append('&amp;'); i += 1; continue
            if c == '<':
                out.append('&lt;'); i += 1; continue
            if c == '>':
                out.append('&gt;'); i += 1; continue
            out.append(c)
            i += 1
        return ''.join(out)

    def command(self, s, i):
        """s[i] is a backslash. Return (html, index after the command and its arguments)."""
        m = re.match(r'\\([a-zA-Z]+)\*?|\\(.)', s[i:])
        name = m.group(1) or m.group(2)
        j = i + m.end()
        if m.group(1):                      # a control word swallows the spaces after it, unless it takes arguments
            k = skip_ws(s, j)
        if m.group(2) is not None:
            ch = m.group(2)
            if ch in '%&_#${}':
                return html.escape(ch, quote=False), j
            if ch == '\\':
                _, j = read_optional(s, skip_ws(s, j) if s[j:j+1] == '[' else j)
                return '<br>\n', j
            if ch in ',;:': return '\u2009', j
            if ch == '!': return '', j
            if ch in ' \n': return ' ', j
            if ch == '/': return '', j
            if ch == '-': return '', j
            if ch in ACCENTS:
                g, j = read_group(s, j, self.where)
                return self.inline(g) + ACCENTS[ch], j
            warn(self.where, f'unknown command \\{ch}')
            return '', j
        if name in ACCENTS and len(name) == 1:
            g, j = read_group(s, j, self.where)
            return self.inline(g) + ACCENTS[name], j
        if name in TEXT_SYMBOLS:
            return TEXT_SYMBOLS[name], (j + 2 if s.startswith('{}', j) else k)
        if name in IGNORED:
            return '', k
        if name in WRAPPERS:
            g, j = read_group(s, j, self.where)
            tag = WRAPPERS[name]
            body = self.inline(g)
            return (f'<{tag}>{body}</{tag}>' if tag else body), j
        if name == 'href':
            url, j = read_group(s, j, self.where)
            txt, j = read_group(s, j, self.where)
            return f'<a href="{html.escape(url.replace(chr(92) + "#", "#").replace(chr(92) + "%", "%"))}">{self.inline(txt)}</a>', j
        if name == 'url':
            url, j = read_group(s, j, self.where)
            u = html.escape(url)
            return f'<a href="{u}">{u}</a>', j
        if name == 'pref':
            pid, j = read_group(s, j, self.where)
            txt, j = read_group(s, j, self.where)
            pid = pid.strip()
            self.links.add(pid)
            if pid not in self.reg['by_id']:
                warn(self.where, f'\\pref{{{pid}}}: no page with that id')
            label = self.inline(txt) if txt.strip() else self.reg['by_id'].get(pid, {}).get('title', pid)
            return f'<a href="{pid}.html">{label}</a>', j
        if name in ('ref', 'eqref', 'pageref', 'nameref'):
            lab, j = read_group(s, j, self.where)
            if lab.startswith('p:'):
                warn(self.where, f'\\{name}{{{lab}}}: use \\pref{{{lab[2:]}}}{{text}} to link to a page')
                return f'<a href="{lab[2:]}.html">{self.reg["by_id"].get(lab[2:], {}).get("title", lab[2:])}</a>', j
            if name == 'pageref':
                return '', j
            return f'\\{name}{{{html.escape(lab)}}}', j     # equation references: MathJax handles them
        if name == 'label':
            lab, j = read_group(s, j, self.where)
            return '', j
        if name == 'routine':
            j = skip_braces(s, j)
            return '<span class="tag tag-routine">routine</span>', j
        if name == 'newidea':
            j = skip_braces(s, j)
            return '<span class="tag tag-new">new idea</span>', j
        if name == 'footnote':
            g, j = read_group(s, j, self.where)
            self.footnotes.append(self.inline(g))
            n = len(self.footnotes)
            return f'<sup><a href="#fn{n}" id="fnref{n}">{n}</a></sup>', j
        if name == 'index':
            entry, j = read_group(s, j, self.where)
            self.terms.append(entry)
            return f'<span id="term{len(self.terms)}"></span>', j
        if name == 'term':
            word, j = read_group(s, j, self.where)
            self.terms.append(word)
            return f'<em id="term{len(self.terms)}">{self.inline(word)}</em>', j
        if name == 'today':
            return '', k
        if name in ('vspace', 'hspace', 'phantom', 'hphantom', 'vphantom', 'index', 'hypertarget',
                    'addcontentsline', 'markboth', 'markright', 'setlength', 'addtocounter', 'setcounter'):
            if name in ('addcontentsline', 'setlength', 'addtocounter', 'setcounter', 'markboth', 'hypertarget'):
                for _ in range({'addcontentsline': 3}.get(name, 2)):
                    _, j = read_group(s, j, self.where)
            else:
                _, j = read_group(s, j, self.where)
            return '', j
        warn(self.where, f'unknown command \\{name}')
        return '', k

    # ---------------------------------------------------------------- blocks
    def blocks(self, s, level=0):
        """Convert a run of LaTeX (paragraphs, environments, headings) to HTML blocks."""
        out, para, i = [], [], 0

        def flush():
            text = ''.join(para).strip()
            para.clear()
            if not text:
                return
            # display math inside a paragraph becomes its own block, as on a printed page
            pieces = re.split(r'(\n\\\[.*?\\\]\n|\n\\begin\{([a-zA-Z*]+)\}.*?\\end\{\2\}\n)', '\n' + text + '\n', flags=re.S)
            k = 0
            while k < len(pieces):
                piece = pieces[k]
                if k % 3 == 0:
                    p = piece.strip()
                    if p:
                        out.append(f'<p>{p}</p>')
                    k += 1
                else:
                    out.append(piece.strip())
                    k += 2
        while i < len(s):
            # paragraph break
            m = re.match(r'[ \t]*\n[ \t]*\n\s*', s[i:])
            if m:
                flush()
                i += m.end()
                continue
            c = s[i]
            if c == '$' or s.startswith('\\[', i) or s.startswith('\\(', i):
                kind, raw, i = read_math(s, i)
                para.append(esc_math(raw) if kind == 'inline' else '\n' + esc_math(raw) + '\n')
                continue
            if c == '\\':
                m = re.match(r'\\([a-zA-Z]+)(\*?)', s[i:])
                if m:
                    name, star = m.group(1), m.group(2)
                    j = i + m.end()
                    if name == 'begin':
                        env, j = read_group(s, j, self.where)
                        if env in MATH_ENVS:
                            kind, raw, i = read_math(s, i)
                            para.append('\n' + esc_math(raw) + '\n')
                            continue
                        flush()
                        body, i = find_end(s, j, env)
                        out.append(self.environment(env, body))
                        continue
                    if name in ('chapter', 'section', 'subsection', 'subsubsection'):
                        flush()
                        _, j = read_optional(s, j)
                        title, i = read_group(s, j, self.where)
                        out.append(self.heading(name, star, title))
                        continue
                    if name == 'paragraph':
                        flush()
                        title, i = read_group(s, j, self.where)
                        para.append(f'<strong>{self.inline(title)}</strong> ')
                        i = skip_ws(s, i)
                        continue
                    if name in ('status', 'blurb', 'prereqs', 'conceptsused'):
                        _, i = read_group(s, j, self.where)
                        if name == 'conceptsused':
                            flush()
                            out.append('<div id="concepts-used"></div>')
                        continue
                    if name == 'neededfor':
                        i = j
                        continue
                    if name == 'uses':
                        flush()
                        g, i = read_group(s, j, self.where)
                        out.append(f'<p class="uses">Uses: {self.inline(g).strip()}</p>')
                        continue
                    if name == 'item':
                        warn(self.where, '\\item outside a list')
                    if name in ('printhints', 'printsolutions', 'tableofcontents', 'maketitle', 'appendix',
                                'frontmatter', 'mainmatter', 'backmatter', 'showsolutionsinline'):
                        i = j
                        continue
                text, i = self.command(s, i)
                para.append(text)
                continue
            if c == '{':
                g, i = read_group(s, i, self.where)
                para.append(self.inline(g))
                continue
            # plain text up to the next special character
            m = re.match(r'[^\\${}\n~`\'&<>-]+|.', s[i:], flags=re.S)
            chunk = m.group(0)
            if chunk == '\n':
                para.append('\n')
                i += 1
            elif len(chunk) == 1 and chunk in '~`\'&<>-':
                # let inline() handle ligatures and escapes; take enough to see -- and ``
                n = 3 if s.startswith('---', i) else 2 if s[i:i + 2] in ('--', '``', "''") else 1
                para.append(self.inline(s[i:i + n]))
                i += n
            else:
                para.append(chunk)
                i += len(chunk)
        flush()
        return '\n'.join(out)

    def heading(self, cmd, star, title):
        top = self.info['top']                        # 'section' for a concept page, 'chapter' for a case study
        order = ['chapter', 'section', 'subsection', 'subsubsection', 'paragraph']
        depth = order.index(cmd) - order.index(top)   # 0 = the page title, 1 = h2, ...
        t = self.inline(title).strip()
        if depth <= 0:
            if self.info.get('seen_title'):
                warn(self.where, f'a second \\{cmd} in one file: each file is one page')
            self.info['seen_title'] = True
            return ''                                  # the page title is written by the template
        if depth == 1 and not star:
            self.sec += 1
            t = f'{self.sec}. {t}'
        h = min(depth + 1, 4)
        return f'<h{h}>{t}</h{h}>'

    def environment(self, env, body):
        b = body
        if env in BOXES:
            title, j = read_group(b, 0, self.where)
            inner = self.blocks(b[j:])
            label = f'<span class="label">{self.inline(title).strip()}.</span> '
            inner = with_label(inner, label)
            return f'<div class="{BOXES[env]}">\n{inner}\n</div>'
        if env in ('step', 'stepnew'):
            title, j = read_group(b, 0, self.where)
            cls = 'step new' if env == 'stepnew' else 'step'
            return f'<div class="{cls}">\n<h4>{self.inline(title).strip()}</h4>\n{self.blocks(b[j:])}\n</div>'
        if env == 'proofslot':
            return f'<div class="proof-slot">{self.inline(b).strip()}</div>'
        if env == 'proof':
            opt, j = read_optional(b, 0)
            inner = self.blocks(b[j:])
            label = f'<span class="label">{self.inline(opt) if opt else "Proof"}.</span> '
            inner = with_label(inner, label)
            return f'<div class="proof">\n{inner}\n</div>'
        if env == 'exercise':
            self.n_ex += 1
            parts = {}
            for sub in ('hint', 'solution'):
                m = re.search(r'\\begin\{' + sub + r'\}', b)
                if m:
                    inner, end = find_end(b, m.end(), sub)
                    parts[sub] = self.blocks(inner)
                    b = b[:m.start()] + b[end:]
            stmt = self.blocks(b)
            label = f'<span class="label">Exercise {self.n_ex}.</span> '
            stmt = with_label(stmt, label)
            out = [f'<div class="exercise" id="ex{self.n_ex}">', stmt]
            if 'hint' in parts:
                out.append(f'<details class="hint"><summary>Hint</summary>\n{parts["hint"]}\n</details>')
            if 'solution' in parts:
                out.append(f'<details class="solution"><summary>Solution</summary>\n{parts["solution"]}\n</details>')
            out.append('</div>')
            return '\n'.join(out)
        if env in ('itemize', 'enumerate', 'description'):
            opt, j = read_optional(b, skip_ws(b, 0))
            items = re.split(r'\\item\b', b[j:])
            if items[0].strip():
                warn(self.where, f'text before the first \\item in {env}')
            lis = []
            for it in items[1:]:
                lab, k = read_optional(it, 0) if it[:1] == '[' else read_optional(it, skip_ws(it, 0)) if it.lstrip()[:1] == '[' else (None, 0)
                inner = self.blocks(it[k:])
                if inner.count('<p>') == 1 and inner.startswith('<p>') and inner.endswith('</p>'):
                    inner = inner[3:-4]
                if lab:
                    inner = f'<strong>{self.inline(lab)}</strong> ' + inner
                lis.append(f'<li>{inner}</li>')
            tag = 'ol' if env == 'enumerate' else 'ul'
            cls = ' class="refs"' if opt and '[' in opt else ''
            return f'<{tag}{cls}>\n' + '\n'.join(lis) + f'\n</{tag}>'
        if env == 'byline':
            return f'<div class="byline">{self.inline(b).strip()}</div>'
        if env == 'pdfonly':
            return ''
        if env in ('webonly', 'multicols', 'minipage', 'quote', 'quotation', 'center', 'flushleft', 'flushright'):
            if env in ('multicols', 'minipage'):
                _, j = read_group(b, 0, self.where)
                b = b[j:]
            inner = self.blocks(b)
            if env in ('quote', 'quotation'):
                return f'<blockquote>\n{inner}\n</blockquote>'
            if env == 'center':
                return f'<div style="text-align:center">\n{inner}\n</div>'
            return inner
        if env in ('hint', 'solution'):
            warn(self.where, f'{env} outside an exercise')
            return ''
        if env == 'conceptsbox':
            warn(self.where, 'conceptsbox: use \\conceptsused{id, id, ...} instead')
            return ''
        warn(self.where, f'unknown environment {env}: its content is shown as plain text')
        return self.blocks(b)


def with_label(inner, label):
    """Put a bold label (Theorem., Exercise 1.) at the start of the first paragraph."""
    return '<p>' + label + inner[3:] if inner.startswith('<p>') else f'<p>{label}</p>\n' + inner


def skip_braces(s, j):
    return j + 2 if s.startswith('{}', j) else j


# ====================================================================== reading the project

def read_tex(name):
    with open(os.path.join(TEX, name), encoding='utf-8') as f:
        return f.read()


def plain_title(tex_title):
    """A section title as plain text (for the registry, page titles, and links)."""
    p = Page('title', {'top': 'section'}, {'by_id': {}})
    t = p.inline(tex_title)
    sup = str.maketrans('0123456789+-=()abcdeghijklmnoprstuvwxyzABDEGHIJKLMNOPRTUVW',
                        '⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ᵃᵇᶜᵈᵉᵍʰⁱʲᵏˡᵐⁿᵒᵖʳˢᵗᵘᵛʷˣʸᶻᴬᴮᴰᴱᴳᴴᴵᴶᴷᴸᴹᴺᴼᴾᴿᵀᵁⱽᵂ')
    t = re.sub(r'<sup>(.*?)</sup>', lambda m: re.sub(r'<[^>]+>', '', m.group(1)).translate(sup), t)
    t = re.sub(r'<[^>]+>', '', t)
    return t.strip()


def html_title(tex_title):
    p = Page('title', {'top': 'section'}, {'by_id': {}})
    return p.inline(tex_title).strip()


def scan_main():
    main = strip_comments(read_tex('main.tex'))
    doc = main[main.index('\\begin{document}'):]
    m = re.search(r'pdftitle=\{([^}]*)\}', main)
    book_title = m.group(1) if m else 'Notes'
    m = re.search(r'pdfauthor=\{([^}]*)\}', main)
    author = m.group(1) if m else ''
    m = re.search(r'\\chapter\*\{Introduction\}(.*?)(\\tableofcontents|\\mainmatter|\\part)', doc, flags=re.S)
    intro = m.group(1) if m else ''
    layers, pages = [], []
    chapter, part = None, None
    for m in re.finditer(r'\\(part|chapter)\*?\{((?:[^{}]|\{[^{}]*\})*)\}|\\(?:input|include)\{([^}]+)\}|\\appendix', doc):
        if m.group(0) == '\\appendix':
            break
        if m.group(1) == 'part':
            part, chapter = m.group(2), None
        elif m.group(1) == 'chapter':
            chapter = m.group(2)
        elif m.group(3):
            f = m.group(3).strip()
            f = f if f.endswith('.tex') else f + '.tex'
            pages.append({'file': f, 'chapter': chapter, 'part': part})
    return book_title, author, intro, pages


def scan_page(entry):
    raw = read_tex(entry['file'])
    src = strip_comments(raw)
    m = re.search(r'\\(chapter|section)\*?(?:\[[^\]]*\])?\{((?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*)\}\s*\\label\{p:([\w-]+)\}', src)
    if not m:
        raise SystemExit(f'{entry["file"]}: the page must start with \\section{{Title}}\\label{{p:<id>}}')
    top, title, pid = m.group(1), m.group(2), m.group(3)
    info = {'id': pid, 'file': entry['file'], 'top': top, 'tex_title': title,
            'title': plain_title(title), 'src': src}

    def arg(cmd):
        mm = re.search(r'\\' + cmd + r'\b', src)
        if not mm:
            return None
        return read_group(src, mm.end(), entry['file'])[0]
    info['status'] = (arg('status') or 'done').strip()
    info['prereqs'] = split_list(arg('prereqs') or '')
    cu = arg('conceptsused')
    is_case = cu is not None or top == 'chapter' or 'case-stud' in entry['file']
    info['kind'] = 'case' if is_case else 'concept'
    info['uses'] = split_list(cu or '')
    info['blurb'] = arg('blurb') or ''
    return info


# ====================================================================== output

HEAD = '''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} · {author}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="pde.css">
<script src="mathjax-config.js"></script>
<script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js" async></script>
<script src="registry.js" defer></script>
<script src="wiki.js" defer></script>
</head>
<body data-page="{id}">
<!-- Made by tools/tex-to-web.py from latex/pde-notes/{file}. Do not edit this file: edit the .tex file. -->
'''
NAV = '''
<nav>
  <div class="inner">
    <a class="home" href="../../index.html">Main page</a>
{hub}    <a href="../../index.html#notes">All notes</a>
  </div>
</nav>
'''


def build_page(info, reg, author):
    p = Page(os.path.join(TEX, info['file']), info, reg)
    body = p.blocks(info['src']).strip()
    out = [HEAD.format(title=html.escape(info['title']), author=author, id=info['id'], file=info['file']),
           NAV.format(hub='    <a href="index.html">PDE analysis</a>\n'),
           '<main>', '<div id="page-meta"></div>', f'<h1>{html_title(info["tex_title"])}</h1>']
    if info['kind'] == 'concept':
        out.append('<div id="prereqs"></div>')
    out.append(body)
    if p.footnotes:
        out.append('<ol class="footnotes">' + ''.join(
            f'<li id="fn{k}">{t} <a href="#fnref{k}">↩</a></li>' for k, t in enumerate(p.footnotes, 1)) + '</ol>')
    if info['kind'] == 'concept':
        out += ['<div id="used-in"></div>', '<div id="pager"></div>', '</main>']
    else:
        out += ['</main>', '', '<footer>', '  <a href="index.html">← PDE analysis: all pages</a>', '</footer>']
        missing = sorted(x for x in p.links if reg['by_id'].get(x, {}).get('kind') == 'concept' and x not in info['uses'])
        if missing:
            warn(info['file'], 'links to ' + ', '.join(missing) + ' but they are not in \\conceptsused')
    out += ['', '</body>', '</html>', '']
    return '\n'.join(out)


def build_hub(book_title, author, intro, reg):
    p = Page(os.path.join(TEX, 'main.tex'), {'top': 'chapter'}, reg)
    body = p.blocks(intro).strip()
    return '\n'.join([
        HEAD.format(title=html.escape(book_title), author=author, id='hub', file='main.tex'),
        NAV.format(hub=''),
        '<main>',
        f'<h1>{html.escape(book_title)}</h1>',
        f'<div class="byline">{author} · draft</div>',
        body,
        '<p class="muted downloads">',
        '  Printable version: <a href="../../latex/pde-notes/main.pdf">PDF</a> (with exercises, hints and solutions) ·',
        '  <a href="https://github.com/Ameryr2026/First-Project/tree/main/latex/pde-notes">LaTeX source</a>.',
        '  Free to share and adapt with credit, under the',
        '  <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a> license.',
        '</p>',
        '',
        '<h2>Case studies</h2>',
        '<div id="case-list"></div>',
        '',
        '<h2>Reading path</h2>',
        '<p class="muted">Each layer uses only the layers before it.</p>',
        '<div id="reading-path"></div>',
        '</main>',
        '',
        '<footer>',
        '  <a href="../../index.html#notes">← Back to all notes</a>',
        '</footer>',
        '',
        '</body>',
        '</html>',
        ''])


def build_registry(layers, pages):
    def js(v):
        return json.dumps(v, ensure_ascii=False)
    lines = ['/* Made by tools/tex-to-web.py from latex/pde-notes/main.tex and the section files.',
             '   Do not edit: the layers are the chapters of Part I in main.tex, the order is the order of',
             '   the \\input lines, and each page\'s \\status, \\prereqs, \\conceptsused and \\blurb come from its .tex file. */',
             '', 'const LAYERS = [']
    lines += [f'  {{ n: {L["n"]}, title: {js(L["title"])} }},' for L in layers]
    lines += ['];', '', 'const PAGES = [']
    for p in pages:
        e = {'id': p['id'], 'kind': p['kind'], 'status': p['status'], 'title': html_title(p['tex_title']) if '$' in p['tex_title'] else p['title']}
        if p['kind'] == 'concept':
            e['layer'] = p['layer']
            e['prereqs'] = p['prereqs']
        else:
            e['blurb'] = p['blurb_html']
            e['uses'] = p['uses']
        lines.append('  ' + js(e) + ',')
    lines += ['];', '']
    return '\n'.join(lines)


def build_mathjax():
    raw = read_tex('pdenotes.sty')
    m = re.search(r'Math macros.*?\n(.*?)\n% =+', raw, flags=re.S)
    section = strip_comments(m.group(1)) if m else ''
    macros = {}
    for mm in re.finditer(r'\\(?:re)?newcommand\*?\{?\\([a-zA-Z]+)\}?(?:\[(\d)\])?', section):
        name, n = mm.group(1), int(mm.group(2) or 0)
        body, _ = read_group(section, mm.end(), 'pdenotes.sty')
        macros[name] = [body, n] if n else body
    for mm in re.finditer(r'\\DeclareMathOperator(\*?)\{\\([a-zA-Z]+)\}', section):
        body, _ = read_group(section, mm.end(), 'pdenotes.sty')
        macros[mm.group(2)] = ('\\operatorname*{' if mm.group(1) else '\\operatorname{') + body + '}'
    return '\n'.join([
        '/* Made by tools/tex-to-web.py from the "Math macros" section of latex/pde-notes/pdenotes.sty.',
        '   Do not edit: add a macro to pdenotes.sty and it works in the PDF and on every page. */',
        'window.MathJax = {',
        '  tex: {',
        "    inlineMath: [['$', '$'], ['\\\\(', '\\\\)']],",
        "    displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']],",
        "    tags: 'ams',",
        '    macros: {',
        ',\n'.join(f'      {k}: {json.dumps(v, ensure_ascii=False)}' for k, v in macros.items()),
        '    }',
        '  },',
        '  chtml: { scale: 1.0 }',
        '};',
        ''])


def write(name, text):
    path = os.path.join(WEB, name)
    old = open(path, encoding='utf-8').read() if os.path.exists(path) else None
    if old != text:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(text)
        return True
    return False


def main():
    book_title, author, intro, entries = scan_main()
    infos = [scan_page(e) for e in entries]
    # layers: the chapters that hold concept pages, in order
    layers, layer_of = [], {}
    for inf, e in zip(infos, entries):
        if inf['kind'] == 'concept':
            ch = e['chapter'] or 'Concepts'
            if ch not in layer_of:
                layer_of[ch] = len(layers) + 1
                layers.append({'n': layer_of[ch], 'title': plain_title(ch).replace('“', '"').replace('”', '"')})
            inf['layer'] = layer_of[ch]
    by_id = {}
    for inf in infos:
        if inf['id'] in by_id:
            raise SystemExit(f'two files use the label p:{inf["id"]}: {by_id[inf["id"]]["file"]} and {inf["file"]}')
        by_id[inf['id']] = inf
    reg = {'by_id': by_id}
    for inf in infos:
        for x in inf['prereqs'] + inf['uses']:
            if x not in by_id:
                warn(inf['file'], f'"{x}" is not the id of any page (ids are the names in \\label{{p:...}})')
        inf['blurb_html'] = Page(inf['file'], inf, reg).inline(inf['blurb']).strip()
    changed = []
    for inf in infos:
        if write(inf['id'] + '.html', build_page(inf, reg, author)):
            changed.append(inf['id'] + '.html')
    for name, text in (('index.html', build_hub(book_title, author, intro, reg)),
                       ('registry.js', build_registry(layers, infos)),
                       ('mathjax-config.js', build_mathjax())):
        if write(name, text):
            changed.append(name)
    # pages that are no longer in main.tex
    made = {inf['id'] + '.html' for inf in infos} | {'index.html'}
    for f in sorted(os.listdir(WEB)):
        if f.endswith('.html') and f not in made:
            head = open(os.path.join(WEB, f), encoding='utf-8').read(600)
            if 'Made by tools/tex-to-web.py' in head:
                os.remove(os.path.join(WEB, f))
                changed.append(f + ' (removed: no longer in main.tex)')
            else:
                warn('notes/pde/' + f, 'this page is not made from a .tex file; it is left as it is')
    print(f'{len(infos)} pages, {len(layers)} layers. Changed: {", ".join(changed) if changed else "nothing"}')
    for w in WARNINGS:
        print(('::warning::' if os.environ.get('GITHUB_ACTIONS') else 'warning: ') + w)
    if '--strict' in sys.argv and WARNINGS:
        sys.exit(1)


if __name__ == '__main__':
    main()
