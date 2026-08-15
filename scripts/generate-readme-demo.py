from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets"
OUT.mkdir(exist_ok=True)

W, H = 1200, 675
BG = (18, 18, 24)
PANEL = (31, 31, 42)
TEXT = (238, 238, 244)
MUTED = (170, 170, 185)
PURPLE = (124, 58, 237)
GREEN = (70, 200, 140)
LINE = (63, 63, 82)


def load_font(size: int, bold: bool = False, mono: bool = False):
    candidates = []
    if mono:
        candidates += [
            "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
            "/Library/Fonts/Menlo.ttc",
        ]
    else:
        candidates += [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/Library/Fonts/Arial.ttf",
        ]
    for candidate in candidates:
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()


TITLE = load_font(32, bold=True)
SMALL = load_font(20)
MONO = load_font(22, mono=True)

RAW = [
    r"### 1. (U\_r(x))",
    "",
    r"# [ P(r\mid x)",
    r"\frac{e^{U\_r(x)}}{Z(x)}",
    r"]",
]

CONVERTED = [
    r"### 1. $U_r(x)$",
    "",
    r"$$",
    r"P(r\mid x) =",
    r"\frac{e^{U_r(x)}}{Z(x)}",
    r"$$",
]


def rounded(draw, box, radius=18, fill=PANEL, outline=None):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=1)


def frame(stage: int):
    image = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(image)

    draw.text((60, 48), "ChatGPT Paste Formatter", font=TITLE, fill=TEXT)
    draw.text((60, 92), "Repair copied Markdown and math before it lands in Obsidian.", font=SMALL, fill=MUTED)

    rounded(draw, (945, 48, 1140, 88), 20, fill=(42, 31, 65))
    draw.text((974, 57), "Obsidian plugin", font=SMALL, fill=(208, 187, 255))

    top, height, width = 160, 380, 470
    rounded(draw, (60, top, 60 + width, top + height), outline=LINE)
    draw.text((88, top + 28), "Copied from ChatGPT", font=SMALL, fill=(255, 190, 190))
    draw.line((88, top + 66, 502, top + 66), fill=LINE)
    y = top + 92
    for line in RAW:
        draw.text((88, y), line, font=MONO, fill=TEXT)
        y += 42

    rounded(draw, (670, top, 670 + width, top + height), outline=LINE)
    draw.text((698, top + 28), "Obsidian-ready Markdown", font=SMALL, fill=(170, 245, 205))
    draw.line((698, top + 66, 1112, top + 66), fill=LINE)

    if stage == 0:
        right = []
    elif stage == 1:
        right = ["Converting clipboard...", "", "detect math blocks", "protect code spans", "normalize escapes"]
    else:
        right = CONVERTED

    y = top + 92
    for line in right:
        draw.text((698, y), line, font=MONO, fill=(210, 190, 255) if stage == 1 else TEXT)
        y += 42

    cx, cy = 600, top + 190
    if stage == 0:
        draw.polygon([(570, cy), (615, cy), (615, cy - 14), (642, cy + 12), (615, cy + 38), (615, cy + 24), (570, cy + 24)], fill=PURPLE)
        label = "Paste"
    elif stage == 1:
        draw.arc((570, cy - 15, 630, cy + 45), start=20, end=300, fill=PURPLE, width=7)
        label = "Convert"
    else:
        draw.ellipse((575, cy - 10, 625, cy + 40), fill=(32, 85, 62))
        draw.line((589, cy + 15, 598, cy + 25), fill=GREEN, width=5)
        draw.line((598, cy + 25, 615, cy + 3), fill=GREEN, width=5)
        label = "Done"
    box = draw.textbbox((0, 0), label, font=SMALL)
    draw.text((cx - (box[2] - box[0]) / 2, cy + 58), label, font=SMALL, fill=MUTED)

    x = 60
    for label, dot in [("Local only", GREEN), ("No API key", GREEN), ("Code-safe", GREEN), ("MathJax", PURPLE)]:
        width = draw.textbbox((0, 0), label, font=SMALL)[2]
        rounded(draw, (x, 590, x + width + 34, 632), 20, fill=(26, 26, 35), outline=LINE)
        draw.ellipse((x + 12, 606, x + 20, 614), fill=dot)
        draw.text((x + 27, 599), label, font=SMALL, fill=MUTED)
        x += width + 50

    return image


frames = [frame(0), frame(1), frame(2)]
frames[-1].save(OUT / "preview.png", optimize=True)
animation = [frames[0]] * 5 + [frames[1]] * 6 + [frames[2]] * 12
animation[0].save(
    OUT / "demo.gif",
    save_all=True,
    append_images=animation[1:],
    duration=120,
    loop=0,
    optimize=True,
)
