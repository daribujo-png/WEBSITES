"""
Trim the two variable fonts to the axis ranges the site actually uses, so the
first page load carries ~70 KB less font data (Lighthouse LCP on mobile).

  Newsreader (display):      wght 300-400, opsz 20-72  (headings are >= 20px, weights 300/350)
  Schibsted Grotesk (body):  wght 400-600              (text uses 400 and 500)

Glyph coverage is unchanged (Fontsource "latin" subset: covers æ ø å é « » – ’).
Widen a range here if the design starts using a weight or size outside it.

Run (needs: pip install fonttools brotli), from the repo root:
  python3 scripts/fonts/instance-fonts.py
"""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parents[2]
FILES = ROOT / "node_modules" / "@fontsource-variable"
OUT = ROOT / "src" / "fonts"

JOBS = [
    (FILES / "newsreader/files/newsreader-latin-opsz-normal.woff2", OUT / "newsreader-latin-display.woff2",
     {"wght": (300, 400), "opsz": (20, 72)}),
    (FILES / "schibsted-grotesk/files/schibsted-grotesk-latin-wght-normal.woff2", OUT / "schibsted-grotesk-latin-text.woff2",
     {"wght": (400, 600)}),
]

OUT.mkdir(parents=True, exist_ok=True)
for src, dst, limits in JOBS:
    font = instancer.instantiateVariableFont(TTFont(src), limits)
    font.flavor = "woff2"
    font.save(dst)
    print(f"{dst.relative_to(ROOT)}  {src.stat().st_size // 1024} KB -> {dst.stat().st_size // 1024} KB  {limits}")
