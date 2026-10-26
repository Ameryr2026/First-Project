# Interactive GeoGebra pages: how they work and how to build your own

The Riemann sum and volume of revolution pages use GeoGebra in a particular way: **the inputs are on our
page, and GeoGebra only draws.** The reader types a function and moves our sliders; GeoGebra shows the
graph, which the reader can zoom, drag and (in 3D) turn. This guide shows how to use the two ready-made
widgets, and then how to build a new one yourself.

- [1. The idea in one picture](#1-the-idea-in-one-picture)
- [2. Using the ready-made widgets](#2-using-the-ready-made-widgets)
- [3. Learn the GeoGebra commands first](#3-learn-the-geogebra-commands-first)
- [4. Your first widget: the tangent line](#4-your-first-widget-the-tangent-line)
- [5. How the full widgets are organised](#5-how-the-full-widgets-are-organised)
- [6. Building a new widget, step by step](#6-building-a-new-widget-step-by-step)
- [7. Reference: the GeoGebra functions we use](#7-reference-the-geogebra-functions-we-use)
- [8. Testing and fixing](#8-testing-and-fixing)

---

## 1. The idea in one picture

```
 our page                                     GeoGebra (drawing only)
 ─────────                                    ────────────────────────
 [ f(x) = x^2 ]  ──►  evalCommand("f(x) = x^2")  ──►  the graph of f
 [ a = 0 ] [ b = 2 ]  ──►  setValue("a", 0) …        ┐
 slider n = 6    ──►  setValue("n", 6)              ├─►  U = UpperSum(f, a, b, n)  (redrawn by itself)
                                                     ┘
 "Upper sum: 3.37" ◄──  getValue("U")  ◄──────────────  the number U
```

1. When the page loads, it creates an **empty GeoGebra graph** (GeoGebra's script `deployggb.js`).
2. When the graph is ready, our code sends it **GeoGebra commands**, exactly what you would type in
   GeoGebra's input bar: `f(x) = x^2`, `a = 0`, `U = UpperSum(f, a, b, n)`.
3. GeoGebra remembers that `U` depends on `f`, `a`, `b`, `n`. When the reader changes an input, our code
   changes only that one object (`setValue("n", 10)`), and **GeoGebra recalculates and redraws everything
   that depends on it.**
4. Our code reads numbers back (`getValue("U")`) to show under the graph.

All the talking is done through GeoGebra's **Apps API**, a set of JavaScript functions documented at
<https://geogebra.github.io/docs/reference/en/GeoGebra_Apps_API/>.

---

## 2. Using the ready-made widgets

Load the script once in the page's `<head>`, then put a `<div>` where the widget should appear.

**Riemann sums** (`notes/ggb-riemann.js`):

```html
<script src="ggb-riemann.js?v=4" defer></script>
…
<div class="ggb-riemann" data-f="x^2" data-a="0" data-b="2" data-n="6" data-sum="both"></div>
```

| Setting | Meaning | Default |
|---|---|---|
| `data-f` | the function, in GeoGebra's English syntax (`x^2`, `sin(x)`, `sqrt(x)`, `exp(x)`) | `x^2` |
| `data-a`, `data-b` | the interval | 0, 2 |
| `data-n` | number of rectangles at the start | 6 |
| `data-nmax` | largest value on the slider (up to 1000) | 100 |
| `data-sum` | `both`, `upper`, `lower`, `left`, `right`, `mid` | `both` |
| `data-color-upper`, `-lower`, `-sum`, `-curve` | colours as `#rrggbb` | blue, orange, green, black |
| `data-lang` | `ar` for Arabic labels | the page's language |
| `data-height` | height of the graph in pixels | 460 |

**Volumes of revolution** (`notes/ggb-volume.js`): the region between two curves, turned about a horizontal
line (discs and washers) or a vertical line (shells). The axis is drawn as a dashed line; the solid and the
pieces turn with the angle slider, and the flat faces where they are cut show the cross-sections. ▶ next to
$n$ adds pieces one at a time; ▶ next to the angle turns the region.

```html
<script src="ggb-volume.js?v=5" defer></script>
…
<div class="ggb-volume" data-f="x" data-a="0" data-b="3"></div>                          <!-- discs about the x-axis -->
<div class="ggb-volume" data-f="x + 1" data-g="sin(x)" data-axis="horizontal" data-c="-1"
     data-a="1" data-b="3.8"></div>                                                       <!-- washers about y = -1 -->
<div class="ggb-volume" data-f="2x - x^2" data-axis="vertical" data-c="0"
     data-a="0" data-b="2"></div>                                                         <!-- shells about the y-axis -->
```

| Setting | Meaning | Default |
|---|---|---|
| `data-f`, `data-g` | the upper and the lower curve | `x`, `0` |
| `data-a`, `data-b`, `data-n` | the interval and the number of pieces | 0, 3, 6 |
| `data-axis` | `horizontal` (the axis is $y = c$) or `vertical` ($x = c$) | `horizontal` |
| `data-c` | where the axis is | 0 |
| `data-angle` | the starting angle in degrees; below 360 the cut is visible | 270 |
| `data-nmax` | largest $n$ on the slider (up to 200; each piece is several 3D surfaces, so keep it modest) | 20 |
| `data-color-outer`, `-inner`, `-ends`, `-cuts` | colours of the parts of the solid (surface made by f, by g, end faces, cut faces); `data-color-surface` sets all four at once | blue, green, purple, orange |
| `data-color-curve`, `-axis` | colours as `#rrggbb` | black, red |

In the picture, **Settings** also lets the reader change the opacity of each part of the solid (default 40%, cut faces 70%) and the thickness (1–13) and style (solid, dashed, dotted, dash-dot) of the curves and the axis.
| `data-lang`, `data-height` | as above | |

For shells, the vertical axis must not pass through the region ($c \le a$ or $c \ge b$); the widget says so
if it does.

**How the volume widget builds its pieces.** Each disc, washer or shell is built from GeoGebra `Surface`s,
not from the `Cylinder` command, so it can be turned by any angle like the solid: the curved sides, the two
flat ends, and the flat cut faces (`Polygon`s). All of them use one formula for turning a point
$(X, Y)$ of the plane by an angle $\theta$ about the axis:

```
about y = c:   (X,  c + (Y − c) cos θ,  (Y − c) sin θ)
about x = c:   (c + (X − c) cos θ,  Y,  (X − c) sin θ)
```

This is the function `rot()` near the top of `ggb-volume.js`; to add another kind of axis, add its formula
there.

Several widgets can be on one page. Readers can change the slider's maximum and the colours themselves
under "Settings".

---

## 3. Learn the GeoGebra commands first

Every widget is a list of GeoGebra commands plus some JavaScript around them. So the first skill is the
commands, and the best place to learn them is GeoGebra itself:

1. Open <https://www.geogebra.org/calculator> (or <https://www.geogebra.org/3d> for 3D).
2. Type the commands one at a time in the input bar, for example:

   ```
   f(x) = x^2
   a = 0
   b = 2
   n = 6
   U = UpperSum(f, a, b, n)
   ```

3. Change `n` (double-click it, or make it a slider) and watch `U` change. This is exactly what the widget
   does; the widget only adds our own input boxes.

The volume widget's discs about the x-axis, typed the same way in the 3D calculator:

```
f(x) = x
a = 0
b = 3
n = 6
t = 3pi/2
mk(j) = a + (j - 0.5) (b - a) / n
xk(j) = a + j (b - a) / n
solid = Surface(u, f(u) cos(v), f(u) sin(v), u, a, b, v, 0, t)
discs = Sequence(Surface(u, f(mk(k)) cos(v), f(mk(k)) sin(v), u, xk(k - 1), xk(k), v, 0, t), k, 1, n)
V = pi Integral(f(x)^2, a, b)
```

Make `t` and `n` sliders and move them: the solid and the sides of the discs turn together.

When a command works in the calculator, it will work in a widget. The full list of commands, each with
examples: <https://geogebra.github.io/docs/manual/en/commands/>.

---

## 4. Your first widget: the tangent line

`notes/ggb-template.js` is the smallest complete widget (about 100 lines): the reader types $f$ and a point
$x_0$, and GeoGebra draws the tangent line there. It has six marked steps:

| Step | What it does |
|---|---|
| 1 | finds every `<div class="ggb-tangent">` on the page |
| 2 | writes our input boxes into each one, and an empty place for GeoGebra |
| 3 | loads GeoGebra's script, then creates one GeoGebra graph per box |
| 4 | when the graph is ready (`appletOnLoad`), creates the objects with commands: `f(x) = …`, `x0 = …`, `P = (x0, f(x0))`, `T = Tangent(x0, f)`, `m = f'(x0)` |
| 5 | `update()`: sends the reader's values (`evalCommand` for f, `setValue` for x0) and shows the slope (`getValue("m")`) |
| 6 | connects our inputs to `update()` |

To try it, make a page with

```html
<div class="ggb-tangent" data-f="x^2" data-x0="1"></div>
<script src="ggb-template.js" defer></script>
```

Read the file from top to bottom once; everything in the larger widgets is the same six steps with more
inputs and more care.

---

## 5. How the full widgets are organised

`ggb-volume.js` is numbered in the same order you would build it:

1. **TEXT**: every word shown on the widget, in English and in Arabic.
2. **Colours**: defaults, and how they are read from the tag.
3. **Styles**: the CSS for our inputs (written once per page).
4. **Settings**: read `data-…` from the tag, with defaults.
5. **Our HTML**: the input boxes, sliders, buttons, the empty place for GeoGebra, the results line.
6. **Numbers**: formatting, with Arabic digits ١٢٣ on Arabic pages.
7. **Talking to GeoGebra**: small helpers `cmd()`, `hide()`, `style()`, and `makeObjects()`, the list of
   commands that create the picture.
8. **update()**: read our inputs, send only what changed, re-zoom if the shape changed, refresh the numbers.
9. **onLoad()**: GeoGebra is ready; create every object once.
10. **Listening**: what each input does; the "Rotate" animation (it moves the angle `t` from 0 to 2π).
11. **Loading GeoGebra** once for all widgets on the page.

`ggb-riemann.js` has the same parts without the numbering.

**Two details worth copying:**

- *Send only what changed.* `update()` keeps the last values in `state` and calls `setValue` only for
  inputs that changed. Redefining `f` is slower than moving a slider, so it is done only when the function
  text changes, and 250 ms after the reader stops typing.
- *Hidden helper objects.* Numbers like the integral `I`, the volume `V` or the largest value `R` are
  created as GeoGebra objects and hidden (`hide('V')`), so GeoGebra keeps them up to date and we just read
  them.

---

## 6. Building a new widget, step by step

Suppose you want **the trapezoid rule**.

1. **Work it out in the GeoGebra calculator.** Find commands that draw what you want and give the numbers
   you want to show. For trapezoids: `TrapezoidalSum(f, a, b, n)`. Note every command that works.
2. **Copy a widget.** Copy `ggb-riemann.js` to `ggb-trapezoid.js`. Change the class name everywhere
   (`ggb-riemann` → `ggb-trapezoid`; keep the prefix `gr-` or change it too) and the `id:` in the
   GeoGebra settings (`'ggbApplet' + index` → `'ggbTrapezoid' + index`), so two widgets on one page do not
   clash.
3. **Change the commands.** In `drawSums()` replace the sums with `T = TrapezoidalSum(f, a, b, n)`.
4. **Change the inputs and the words.** Remove inputs you do not need (the "Sum" menu), edit `TEXT` in
   both languages, and update `readout()` to show `getValue('T')`.
5. **Put it on a test page** that is not linked from the homepage, and open it through a local server
   (see the editing guide, section 1). Check it in both languages and on a phone.
6. **Add a line to this guide** describing the new widget's settings.

For 3D, start from `ggb-volume.js` instead: it uses `appName: '3d'` and `perspective: 'T'`.

**Ideas that fit this pattern well:** trapezoid and Simpson's rule; the tangent line and the secant line
approaching it; Taylor polynomials of increasing degree; the area between two curves; slope fields with
`SlopeField`; surface area of revolution (the same `rot()` surfaces, with frustums instead of discs).

---

## 7. Reference: the GeoGebra functions we use

In the code, `api` is the GeoGebra graph's API object, given to `appletOnLoad`.

| Function | What it does |
|---|---|
| `api.evalCommand('…')` | runs a command as if typed in the input bar; returns `false` if GeoGebra rejects it |
| `api.setValue('n', 10)` | changes a number; everything depending on it is recalculated |
| `api.getValue('U')` | reads a number |
| `api.exists('U')` | does an object with this name exist? |
| `api.deleteObject('U')` | removes an object |
| `api.setVisible('x0', false)` | hides or shows an object |
| `api.setColor('T', r, g, b)` | colour, each value 0–255 |
| `api.setFilling('U', 0.3)` | fill opacity, 0 to 1 |
| `api.setLineThickness('f', 6)` | line width, 1–13 |
| `api.setLabelVisible('f', false)` | hides the name label |
| `api.setFixed('f', true, false)` | the reader cannot drag or select it |
| `api.setCoordSystem(xmin, xmax, ymin, ymax)` | sets the view; in 3D add `zmin, zmax` |
| `api.setErrorDialogsActive(false)` | no GeoGebra pop-ups for bad input |

Settings when creating the graph (`new GGBApplet({...})`):

| Setting | Our choice |
|---|---|
| `appName` | `'classic'` for 2D, `'3d'` for 3D |
| `perspective` | `'G'` the 2D graph only, `'T'` the 3D view only |
| `showToolBar`, `showMenuBar`, `showAlgebraInput` | `false`: GeoGebra's own controls hidden |
| `enableShiftDragZoom`, `showZoomButtons` | `true`: the reader can zoom and move |
| `appletOnLoad` | our function that runs when the graph is ready |
| `id` | a unique name; also the name of the API object in the browser console |
| `scaleContainerClass` | the class of the box GeoGebra should fit its width to |

---

## 8. Testing and fixing

- **Try commands live in the browser.** Open a page with a widget, press F12 to open the console, and type
  for example `ggbApplet0.evalCommand("n = 20")` (Riemann widgets are named `ggbApplet0`, `ggbApplet1`,
  …; volume widgets `ggbVolume0`, …; the template `ggbTangent0`). You see the effect at once. This is the
  fastest way to find the right command or colour.
- **Nothing appears:** check the console for red errors; check that the page loads the script; GeoGebra
  needs an internet connection (its script comes from geogebra.org).
- **The graph appears but an object is missing:** that command failed. Copy it into the GeoGebra
  calculator and see GeoGebra's error message.
- **A number shows "—":** the object is undefined (for example the integral of a function with a pole in
  $[a,b]$).
- **3D is slow:** lower `data-nmax`; each disc is a 3D object.
- After changing a widget's file, bump the `?v=` number where pages load it, so browsers fetch the new copy.
