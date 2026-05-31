"""Regenerate app-icon.png: clean transparency + larger emblem, same artwork."""
from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "app-icon" / "app-icon.png"
OUT = ROOT / "app-icon" / "app-icon.png"
CANVAS = 1024
FILL_RATIO = 0.96


def flood_clear_background(img: Image.Image, tolerance: int = 28) -> Image.Image:
    px = img.load()
    w, h = img.size

    def is_bg(r: int, g: int, b: int, a: int) -> bool:
        if a == 0:
            return True
        return r <= tolerance and g <= tolerance and b <= tolerance

    seen: set[tuple[int, int]] = set()
    q: deque[tuple[int, int]] = deque()
    for x, y in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)):
        q.append((x, y))

    while q:
        x, y = q.popleft()
        if (x, y) in seen or x < 0 or x >= w or y < 0 or y >= h:
            continue
        seen.add((x, y))
        r, g, b, a = px[x, y]
        if is_bg(r, g, b, a):
            px[x, y] = (0, 0, 0, 0)
            q.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))

    return img


def main() -> None:
    img = Image.open(SRC).convert("RGBA")
    img = flood_clear_background(img)

    alpha = img.split()[3]
    bbox = alpha.getbbox()
    if not bbox:
        raise SystemExit("Kein sichtbares Logo in app-icon/app-icon.png gefunden.")

    emblem = img.crop(bbox)
    target = int(CANVAS * FILL_RATIO)
    cw, ch = emblem.size
    scale = target / max(cw, ch)
    new_size = (max(1, int(cw * scale)), max(1, int(ch * scale)))
    emblem = emblem.resize(new_size, Image.Resampling.LANCZOS)

    out = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    x = (CANVAS - new_size[0]) // 2
    y = (CANVAS - new_size[1]) // 2
    out.paste(emblem, (x, y), emblem)
    out.save(OUT, "PNG", optimize=True)

    public = ROOT / "public"
    public.mkdir(exist_ok=True)
    for name in ("app-icon.png", "logo.png", "favicon.png"):
        out.save(public / name, "PNG", optimize=True)

    print(f"Saved {OUT} ({CANVAS}x{CANVAS}, fill {FILL_RATIO:.0%})")


if __name__ == "__main__":
    main()
