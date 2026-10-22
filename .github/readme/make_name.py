"""Builds name.svg, the animated ASCII banner at the top of the profile README.

The name is rasterized in Archivo Black, cut into a grid of character cells, and each
cell gets a glyph by how much ink it covers. GitHub renders README images
without scripts, so the motion is pre-baked: a stack of text frames whose
visibility is switched on a SMIL timeline (decode in, flicker, glitch,
dissolve, loop). JetBrains Mono is subset and embedded so the grid looks the
same on every OS.

    python make_name.py <font dir with ArchivoBlack-Regular.ttf and JetBrainsMono[wght].ttf>

Fonts: github.com/google/fonts/raw/main/ofl/archivoblack/ArchivoBlack-Regular.ttf
       github.com/google/fonts/raw/main/ofl/jetbrainsmono/JetBrainsMono%5Bwght%5D.ttf
Needs Pillow and fontTools.
"""
import base64
import io
import random
import sys
from html import escape
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from PIL import Image, ImageDraw, ImageFont

FONT_DIR = Path(sys.argv[1] if len(sys.argv) > 1 else ".")
OUT = Path(__file__).with_name("name.svg")

NAME = ("SHUMOKH", "ALSHARIF")
TAGLINE = "> software engineer // frontend, backend & the messy middle"

FONT_PX = 11.6             # JetBrains Mono advance is 0.6em
CW, CH = FONT_PX * 0.6, 11.0   # cell size in viewBox px
COLS, ROWS = 158, 36
PAD_X = 50
W, H = PAD_X * 2 + COLS * CW, ROWS * CH + 40
NAME_ROWS = ((2, 15), (17, 30))  # row band for each line of the name
TAG_ROW = 33
TRACKING = 0.09            # gap between letters, in em
TICK = 0.09                # seconds per frame

BG, INK, DIM, RED = "#0b0b0c", "#ededed", "#6e6e73", "#ff3344"

DENSE = "@#%$&8BWM0"
MID = "*+=xoa?"
LIGHT = ":;-~^'\""
NOISE = "01<>/\\|_[]{}"
SCRAMBLE = DENSE + MID + LIGHT + NOISE

random.seed(7)


def line_width(font, text, size):
    return sum(font.getlength(ch) for ch in text) + TRACKING * size * (len(text) - 1)


def coverage():
    """Ink coverage (0..1) per cell for the name, one line per NAME_ROWS band."""
    k = 4
    gw, gh = int(COLS * CW * k), int(ROWS * CH * k)
    path = str(FONT_DIR / "ArchivoBlack-Regular.ttf")
    probe = ImageFont.truetype(path, 100)
    cap = probe.getbbox("H")[3] - probe.getbbox("H")[1]
    band = min(b - a for a, b in NAME_ROWS) * CH * k
    widest = max(line_width(probe, line, 100) for line in NAME)
    size = int(min(gw * 0.96 / widest, band / cap) * 100)  # same size for both lines
    font = ImageFont.truetype(path, size)
    cap = font.getbbox("H")[3] - font.getbbox("H")[1]
    top_off = font.getbbox("H")[1]

    img = Image.new("L", (gw, gh), 0)
    draw = ImageDraw.Draw(img)
    for line, (r0, r1) in zip(NAME, NAME_ROWS):
        x = (gw - line_width(font, line, size)) / 2
        y = (r0 + r1) / 2 * CH * k - cap / 2 - top_off
        for ch in line:
            draw.text((x, y), ch, font=font, fill=255)
            x += font.getlength(ch) + TRACKING * size
    cells = img.resize((COLS, ROWS), Image.BOX).load()
    return [[cells[c, r] / 255 for c in range(COLS)] for r in range(ROWS)]


def glyph(cov, shadow):
    if cov > 0.72:
        return random.choice(DENSE)
    if cov > 0.4:
        return random.choice(MID)
    if cov > 0.12:
        return random.choice(LIGHT)
    if shadow:
        return random.choice(".`")
    return " "


def build_grids(cov):
    # a figlet-style drop shadow: light dots one cell down and two to the right
    shadow = [[r > 0 and c > 1 and cov[r - 1][c - 2] > 0.5 for c in range(COLS)]
              for r in range(ROWS)]
    base = [[glyph(cov[r][c], shadow[r][c]) for c in range(COLS)] for r in range(ROWS)]

    # stable frames: the same art with a slice of cells re-rolled each time
    stable = []
    for _ in range(6):
        g = [row[:] for row in base]
        for r in range(ROWS):
            for c in range(COLS):
                if g[r][c] != " " and random.random() < 0.18:
                    g[r][c] = glyph(cov[r][c], shadow[r][c])
        stable.append(g)

    # decode frames: cells resolve in a ragged left-to-right sweep; unresolved
    # ink is scrambled and a little static hangs around the empty space
    order = [[c / COLS * 0.75 + random.random() * 0.35 for c in range(COLS)] for _ in range(ROWS)]
    decode = []
    for i in range(10):
        p = (i + 1) / 11
        g = [row[:] for row in base]
        for r in range(ROWS):
            for c in range(COLS):
                if order[r][c] > p:
                    if g[r][c] != " " or random.random() < 0.05 * (1 - p):
                        g[r][c] = random.choice(SCRAMBLE)
        decode.append(g)

    # glitch frames: a few bands of rows torn sideways
    glitch = []
    for bands in ([(6, 8, 4), (22, 23, -6)], [(4, 5, -3), (12, 14, 7), (25, 27, -2)]):
        g = [row[:] for row in random.choice(stable)]
        torn = set()
        for r0, r1, shift in bands:
            for r in range(r0, r1 + 1):
                g[r] = g[r][-shift:] + g[r][:-shift]  # rotate the row by shift cells
                torn.add(r)
        glitch.append((g, torn))
    return stable, decode, glitch


def rows_svg(grid, torn=()):
    out = []
    for r, row in enumerate(grid):
        line = "".join(row)
        if not line.strip():
            continue
        cls = ' class="t"' if r in torn else ""
        out.append(f'<text y="{20 + (r + 1) * CH - 2:.1f}"{cls}>{escape(line, quote=False)}</text>')
    return "".join(out)


def timeline(decode_n, stable_n):
    """Frame index per tick: decode in, hold (with two glitches), dissolve, blank."""
    seq = [("d", i) for i in range(decode_n)]
    hold = 70
    for t in range(hold):
        if t in (22, 23):
            seq.append(("g", 0))
        elif t in (51, 52, 53):
            seq.append(("g", 1))
        else:
            seq.append(("s", (t // 2) % stable_n))  # each flicker frame lasts two ticks
    seq += [("d", i) for i in reversed(range(decode_n))]
    seq += [None] * 4
    return seq


def visibility(seq, key):
    """SMIL animation that shows one frame only on the ticks it owns."""
    n = len(seq)
    vals, times, prev = [], [], None
    for i, k in enumerate(seq):
        v = "visible" if k == key else "hidden"
        if v != prev:
            vals.append(v)
            times.append(f"{i / n:.4f}")
            prev = v
    return (f'<animate attributeName="visibility" values="{";".join(vals)}" '
            f'keyTimes="{";".join(times)}" dur="{n * TICK:.2f}s" calcMode="discrete" '
            f'repeatCount="indefinite"/>')


def embedded_mono(chars):
    font = TTFont(FONT_DIR / "JetBrainsMono[wght].ttf")
    font = instantiateVariableFont(font, {"wght": 700})
    opts = subset.Options()
    opts.layout_features = []
    opts.name_IDs = []
    sub = subset.Subsetter(opts)
    sub.populate(text=chars)
    sub.subset(font)
    buf = io.BytesIO()
    font.save(buf)
    return base64.b64encode(buf.getvalue()).decode()


def build():
    cov = coverage()
    stable, decode, glitch = build_grids(cov)
    seq = timeline(len(decode), len(stable))

    frames = []
    for i, g in enumerate(decode):
        frames.append(f'<g visibility="hidden">{visibility(seq, ("d", i))}{rows_svg(g)}</g>')
    for i, g in enumerate(stable):
        frames.append(f'<g visibility="hidden">{visibility(seq, ("s", i))}{rows_svg(g)}</g>')
    for i, (g, torn) in enumerate(glitch):
        frames.append(f'<g visibility="hidden">{visibility(seq, ("g", i))}{rows_svg(g, torn)}</g>')
    # still image for reduced motion and for renderers without SMIL
    still = f'<g class="still">{rows_svg(stable[0])}</g>'

    # faint static over the whole field, on its own slower loop
    static = []
    for i in range(4):
        grid = [[random.choice(NOISE) if random.random() < 0.012 else " " for _ in range(COLS)]
                for _ in range(ROWS)]
        vals = ";".join("visible" if j == i else "hidden" for j in range(4))
        static.append(f'<g visibility="hidden"><animate attributeName="visibility" values="{vals}" '
                      f'dur="1.2s" calcMode="discrete" repeatCount="indefinite"/>{rows_svg(grid)}</g>')

    tag_y = 20 + (TAG_ROW + 1) * CH
    tag_w = len(TAGLINE) * 13 * 0.6
    font64 = embedded_mono(SCRAMBLE + NOISE + ".` " + TAGLINE)

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:.0f} {H:.0f}" width="{W:.0f}" height="{H:.0f}" role="img" aria-label="Shumokh Alsharif, software engineer" xml:space="preserve">
<title>Shumokh Alsharif</title>
<style>
@font-face{{font-family:"M";src:url(data:font/ttf;base64,{font64}) format("truetype")}}
text{{font-family:"M",ui-monospace,Menlo,Consolas,monospace;font-size:{FONT_PX}px;fill:{INK};white-space:pre}}
.art text{{text-anchor:start}}
.t{{fill:{RED}}}
.static text{{fill:{DIM};opacity:.45}}
.still{{display:none}}
.tag{{font-size:13px;fill:{DIM}}}
.tag tspan{{fill:{RED}}}
.type{{animation:type 2.4s steps({len(TAGLINE)},end) .9s both}}
@keyframes type{{from{{transform:scaleX(0)}}to{{transform:scaleX(1)}}}}
.cur{{animation:blink 1s steps(1,end) infinite,move 2.4s steps({len(TAGLINE)},end) .9s both}}
@keyframes blink{{50%{{opacity:0}}}}
@keyframes move{{from{{transform:translateX(0)}}to{{transform:translateX({tag_w:.1f}px)}}}}
.scan{{animation:scan 4.5s linear infinite}}
@keyframes scan{{from{{transform:translateY(-40px)}}to{{transform:translateY({H + 40:.0f}px)}}}}
@media (prefers-reduced-motion:reduce){{.art,.static{{display:none}}.still{{display:inline}}*{{animation:none!important}}}}
</style>
<defs>
<pattern id="crt" width="4" height="3" patternUnits="userSpaceOnUse"><rect width="4" height="1" fill="#fff" opacity=".035"/></pattern>
<linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".07"/></linearGradient>
<radialGradient id="vig" cx=".5" cy=".45" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>
<clipPath id="tagclip"><rect class="type" x="{PAD_X}" y="{tag_y - 14:.0f}" width="{tag_w:.1f}" height="20" style="transform-origin:{PAD_X}px 0"/></clipPath>
<clipPath id="frame"><rect width="{W:.0f}" height="{H:.0f}" rx="14"/></clipPath>
</defs>
<g clip-path="url(#frame)">
<rect width="{W:.0f}" height="{H:.0f}" fill="{BG}"/>
<g class="static" transform="translate({PAD_X} 0)">{"".join(static)}</g>
<g class="art" transform="translate({PAD_X} 0)">{"".join(frames)}</g>
<g transform="translate({PAD_X} 0)">{still}</g>
<g clip-path="url(#tagclip)"><text class="tag" x="{PAD_X}" y="{tag_y:.0f}"><tspan>&gt;</tspan>{escape(TAGLINE[1:], quote=False)}</text></g>
<rect class="cur" x="{PAD_X + 2}" y="{tag_y - 11:.0f}" width="7" height="14" fill="{RED}"/>
<rect width="{W:.0f}" height="{H:.0f}" fill="url(#crt)"/>
<rect class="scan" width="{W:.0f}" height="40" fill="url(#beam)"/>
<rect width="{W:.0f}" height="{H:.0f}" fill="url(#vig)"/>
</g>
<rect x=".5" y=".5" width="{W - 1:.0f}" height="{H - 1:.0f}" rx="13.5" fill="none" stroke="#fff" stroke-opacity=".08"/>
</svg>
'''
    OUT.write_text(svg, encoding="utf-8")
    print(f"{len(frames)} frames, {len(seq) * TICK:.1f}s loop, {OUT.stat().st_size / 1024:.0f} KB -> {OUT}")


if __name__ == "__main__":
    build()
