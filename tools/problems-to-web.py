#!/usr/bin/env python3
"""
Build the "Problems in Analysis" pages of the website (notes/analysis/) from the LaTeX source
(latex/analysis-problems/).

    python3 tools/problems-to-web.py

The .tex files are the only copy you edit. This script writes, in notes/analysis/:
    <id>.html          one page per \\input line in main.tex (one topic per page)
    index.html         the hub: the introduction of main.tex and the list of topics
    mathjax-config.js  the math macros, read from the "Math macros" section of problems.sty

It reuses the LaTeX reader of tools/tex-to-web.py (the PDE notes' converter), and adds the
problem/solution environment: each solution becomes a "click to open" box under its problem.
GitHub runs it automatically (.github/workflows/build-pde-notes.yml) whenever a file in
latex/analysis-problems/ changes. It only needs Python 3, no extra packages.
"""
import html, importlib.util, json, os, re, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
TEX = os.path.join(ROOT, 'latex', 'analysis-problems')
WEB = os.path.join(ROOT, 'notes', 'analysis')

# the PDE notes' converter: its LaTeX reader (Page) and helpers
spec = importlib.util.spec_from_file_location('textoweb', os.path.join(ROOT, 'tools', 'tex-to-web.py'))
T = importlib.util.module_from_spec(spec)
spec.loader.exec_module(T)
WARNINGS = T.WARNINGS

FIGURES = {'upper': 'The contour: the segment from −R to R and the upper half-circle C_R.',
           'indented': 'The contour: the segments L_1 and L_2, the upper half-circle C_R, and a small half-circle C_ρ around 0.',
           'quarters': 'The unit circle split into the quarter arcs I_1 (third quadrant), I_2, I_3, I_4.',
           'rectangle': 'The rectangle [a,b]×[c,d] with its sides I_1 (bottom), I_2, I_3, I_4 and their exterior normals n_1, ..., n_4.',
           'disknormal': 'The unit disk; at a boundary point (x, y) the exterior unit normal is ν = (x, y).'}

# MathJax versions of commands that LaTeX already has (amsmath, LaTeX kernel) but MathJax lacks
EXTRA_MACROS = {'Bar': '\\bar', 'Tilde': '\\tilde', 'textup': ['\\text{#1}', 1]}

# labels of problems (\label{prob:...}), filled in by main(): label -> (page id, problem number)
PROBLEM_LABELS = {}


class ProblemPage(T.Page):
    """A topic page: the PDE converter plus problems, solutions and contour figures."""

    def __init__(self, path, info, registry):
        super().__init__(path, info, registry)
        self.n_prob = 0
        self.n_sub = 0

    def command(self, s, i):
        m = re.match(r'\\([a-zA-Z]+)', s[i:])
        if m and m.group(1) == 'contourfig':
            name, j = T.read_group(s, i + m.end(), self.where)
            name = name.strip()
            if name not in FIGURES:
                T.warn(self.where, f'\\contourfig{{{name}}}: no such figure')
            alt = html.escape(FIGURES.get(name, name))
            return f'\n<figure class="contour"><img src="figures/{name}.svg" alt="{alt}"></figure>\n', j
        if m and m.group(1) == 'ref':
            lab, j = T.read_group(s, i + m.end(), self.where)
            lab = lab.strip()
            if lab.startswith('prob:'):
                if lab not in PROBLEM_LABELS:
                    T.warn(self.where, f'\\ref{{{lab}}}: no problem has this label')
                    return '??', j
                pid, num = PROBLEM_LABELS[lab]
                return f'<a href="{pid}.html#problem-{num}">{num}</a>', j
        if m and m.group(1) == 'blurb':
            _, j = T.read_group(s, i + m.end(), self.where)
            return '', j
        return super().command(s, i)

    def heading(self, cmd, star, title):
        if cmd == 'subsection' and not star:
            self.n_sub += 1
            return f'<h2>{self.info["num"]}.{self.n_sub}. {self.inline(title).strip()}</h2>'
        return super().heading(cmd, star, title)

    def environment(self, env, body):
        if env == 'problem':
            self.n_prob += 1
            num = f'{self.info["num"]}.{self.n_prob}'
            b, sol = body, None
            m = re.search(r'\\begin\{solution\}', b)
            if m:
                inner, end = T.find_end(b, m.end(), 'solution')
                sol = self.blocks(inner)
                b = b[:m.start()] + b[end:]
            else:
                T.warn(self.where, f'Problem {num} has no solution')
            stmt = T.with_label(self.blocks(b), f'<span class="label">Problem {num}.</span> ')
            out = [f'<div class="exercise problem" id="problem-{num}">', stmt]
            if sol is not None:
                out.append(f'<details class="solution"><summary>Solution</summary>\n{sol}\n</details>')
            out.append('</div>')
            return '\n'.join(out)
        if env == 'solution':
            T.warn(self.where, 'solution outside a problem')
            return ''
        if env in ('itemize', 'enumerate'):
            return self.list_env(env, body)
        return super().environment(env, body)

    def list_env(self, env, b):
        """A list whose items may contain nested lists (split only at the top-level \\item)."""
        opt, j = T.read_optional(b, T.skip_ws(b, 0))
        b = b[j:]
        cuts, depth = [], 0
        for m in re.finditer(r'\\begin\{[^}]*\}|\\end\{[^}]*\}|\\item\b', b):
            t = m.group(0)
            if t.startswith('\\begin'):
                depth += 1
            elif t.startswith('\\end'):
                depth -= 1
            elif depth == 0:
                cuts.append(m)
        if not cuts:
            return self.blocks(b)
        if b[:cuts[0].start()].strip():
            T.warn(self.where, f'text before the first \\item in {env}')
        lis = []
        for k, m in enumerate(cuts):
            it = b[m.end():cuts[k + 1].start() if k + 1 < len(cuts) else len(b)]
            lab, i0 = (None, 0)
            if it.lstrip()[:1] == '[':
                lab, i0 = T.read_optional(it, T.skip_ws(it, 0))
            inner = self.blocks(it[i0:])
            if inner.count('<p>') == 1 and inner.startswith('<p>') and inner.endswith('</p>'):
                inner = inner[3:-4]
            if lab:
                inner = f'<strong>{self.inline(lab)}</strong> ' + inner
            cls = ' class="labelled"' if lab is not None else ''
            lis.append(f'<li{cls}>{inner}</li>')
        tag = 'ol' if env == 'enumerate' else 'ul'
        return f'<{tag}>\n' + '\n'.join(lis) + f'\n</{tag}>'


def read_tex(name):
    with open(os.path.join(TEX, name), encoding='utf-8') as f:
        return f.read()


def scan_main():
    main = T.strip_comments(read_tex('main.tex'))
    m = re.search(r'pdftitle=\{([^}]*)\}', main)
    title = m.group(1) if m else 'Problems'
    m = re.search(r'pdfauthor=\{([^}]*)\}', main)
    authors = m.group(1) if m else ''
    doc = main[main.index('\\begin{document}'):]
    m = re.search(r'\\section\*\{Introduction\}(.*?)\\tableofcontents', doc, flags=re.S)
    intro = m.group(1) if m else ''
    files = [f.strip() + ('' if f.strip().endswith('.tex') else '.tex')
             for f in re.findall(r'\\input\{([^}]+)\}', doc)]
    return title, authors, intro, files


def scan_page(f, num):
    src = T.strip_comments(read_tex(f))
    m = re.search(r'\\section\{((?:[^{}]|\{[^{}]*\})*)\}\s*\\label\{p:([\w-]+)\}', src)
    if not m:
        raise SystemExit(f'{f}: the page must start with \\section{{Title}}\\label{{p:<id>}}')
    mb = re.search(r'\\blurb\b', src)
    blurb = T.read_group(src, mb.end(), f)[0] if mb else ''
    # the labels of the problems on this page, for \\ref{prob:...} on any page
    for k, body in enumerate(re.split(r'\\begin\{problem\}', src)[1:], 1):
        ml = re.search(r'\\label\{(prob:[^}]*)\}', body.split('\\begin{solution}')[0])
        if ml:
            PROBLEM_LABELS[ml.group(1)] = (m.group(2), f'{num}.{k}')
    return {'id': m.group(2), 'file': f, 'top': 'section', 'tex_title': m.group(1),
            'title': T.plain_title(m.group(1)), 'src': src, 'num': num, 'blurb': blurb,
            'count': len(re.findall(r'\\begin\{problem\}', src))}


HEAD = '''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} · Problems in Analysis</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../pde/pde.css">
<link rel="stylesheet" href="problems.css">
<script src="mathjax-config.js"></script>
<script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js" async></script>
</head>
<body>
<!-- Made by tools/problems-to-web.py from latex/analysis-problems/{file}. Do not edit this file: edit the .tex file. -->

<nav>
  <div class="inner">
    <a class="home" href="../../index.html">Main page</a>
{hub}    <a href="../../index.html#notes">All notes</a>
  </div>
</nav>
'''


def build_page(info, prev, nxt):
    p = ProblemPage(os.path.join(TEX, info['file']), info, {'by_id': {}})
    body = p.blocks(info['src']).strip()
    pager = ['<div id="pager">',
             f'  <a class="prev" href="{prev["id"]}.html">← {prev["num"]}. {html.escape(prev["title"])}</a>' if prev else '  <span></span>',
             f'  <a class="next" href="{nxt["id"]}.html">{nxt["num"]}. {html.escape(nxt["title"])} →</a>' if nxt else '  <span></span>',
             '</div>']
    return '\n'.join([
        HEAD.format(title=html.escape(info['title']), file=info['file'],
                    hub='    <a href="index.html">Problems in Analysis</a>\n'),
        '<main>',
        '<div id="page-meta">Problems in Analysis</div>',
        f'<h1>{info["num"]}. {T.html_title(info["tex_title"])}</h1>',
        '<p class="muted toggle-all"><button type="button" onclick="'
        "document.querySelectorAll('details.solution').forEach(d=>d.open=!this.dataset.open);"
        "this.dataset.open=this.dataset.open?'':'1';this.textContent=this.dataset.open?'Hide all solutions':'Show all solutions'"
        '">Show all solutions</button></p>' if info['count'] else '',
        body,
        *pager,
        '</main>', '', '</body>', '</html>', ''])


def build_hub(title, authors, intro, infos):
    p = ProblemPage(os.path.join(TEX, 'main.tex'), {'top': 'section', 'num': 0}, {'by_id': {}})
    body = p.blocks(intro).strip()
    items = []
    for inf in infos:
        n = f' <span class="muted">· {inf["count"]} problems</span>' if inf['count'] else ''
        blurb = p.inline(inf['blurb']).strip()
        items.append(f'  <li><a href="{inf["id"]}.html"><strong>{inf["num"]}. {T.html_title(inf["tex_title"])}</strong></a>{n}'
                     + (f'<br><span class="muted">{blurb}</span>' if blurb else '') + '</li>')
    return '\n'.join([
        HEAD.format(title='Contents', file='main.tex', hub=''),
        '<main>',
        f'<h1>{html.escape(title)}</h1>',
        f'<div class="byline">{html.escape(authors)}</div>',
        body,
        '<p class="muted downloads">Printable version: <a href="../../latex/analysis-problems/main.pdf">PDF</a> '
        '(all solutions printed) · <a href="https://github.com/Ameryr2026/First-Project/tree/main/latex/analysis-problems">LaTeX source</a>.</p>',
        '<h2>Topics</h2>',
        '<ul class="cases">', *items, '</ul>',
        '</main>', '',
        '<footer>', '  <a href="../../index.html#notes">← Back to all notes</a>', '</footer>', '',
        '</body>', '</html>', ''])


def build_mathjax():
    raw = read_tex('problems.sty')
    m = re.search(r'Math macros.*?\n(.*?)\n% =+', raw, flags=re.S)
    section = T.strip_comments(m.group(1)) if m else ''
    macros = {}
    for mm in re.finditer(r'\\(?:(?:re)?newcommand|providecommand)\*?\{?\\([a-zA-Z]+)\}?(?:\[(\d)\])?', section):
        name, n = mm.group(1), int(mm.group(2) or 0)
        body, _ = T.read_group(section, mm.end(), 'problems.sty')
        macros[name] = [body, n] if n else body
    for k, v in EXTRA_MACROS.items():
        macros.setdefault(k, v)
    return '\n'.join([
        '/* Made by tools/problems-to-web.py from the "Math macros" section of latex/analysis-problems/problems.sty.',
        '   Do not edit: add a macro to problems.sty and it works in the PDF and on every page. */',
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
    os.makedirs(WEB, exist_ok=True)
    title, authors, intro, files = scan_main()
    infos = [scan_page(f, k) for k, f in enumerate(files, 1)]
    changed = []
    for k, inf in enumerate(infos):
        prev = infos[k - 1] if k > 0 else None
        nxt = infos[k + 1] if k + 1 < len(infos) else None
        if write(inf['id'] + '.html', build_page(inf, prev, nxt)):
            changed.append(inf['id'] + '.html')
    for name, text in (('index.html', build_hub(title, authors, intro, infos)),
                       ('mathjax-config.js', build_mathjax())):
        if write(name, text):
            changed.append(name)
    made = {inf['id'] + '.html' for inf in infos} | {'index.html'}
    for f in sorted(os.listdir(WEB)):
        if f.endswith('.html') and f not in made:
            head = open(os.path.join(WEB, f), encoding='utf-8').read(800)
            if 'Made by tools/problems-to-web.py' in head:
                os.remove(os.path.join(WEB, f))
                changed.append(f + ' (removed)')
    total = sum(inf['count'] for inf in infos)
    print(f'{len(infos)} pages, {total} problems. Changed: {", ".join(changed) if changed else "nothing"}')
    for w in WARNINGS:
        print(('::warning::' if os.environ.get('GITHUB_ACTIONS') else 'warning: ') + w)
    if '--strict' in sys.argv and WARNINGS:
        sys.exit(1)


if __name__ == '__main__':
    main()
