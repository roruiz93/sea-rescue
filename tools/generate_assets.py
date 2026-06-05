#!/usr/bin/env python3
"""
generate_assets.py – Creates PNG sprite assets for Sea Rescue.

Requirements:
    pip install Pillow

Generates:
    public/assets/player.png
    public/assets/victim.png
    public/assets/shark.png
    public/assets/wave.png
    public/assets/float.png
    public/assets/goggles.png
    public/assets/board.png
    public/assets/boat.png
    public/assets/icon-512.png
    public/assets/icon-192.png

These are optional – the game already generates procedural textures in
GraphicsFactory.js. These PNGs can replace them for a higher-quality look.
"""

import os
import math
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFilter, ImageFont
except ImportError:
    print("❌  Pillow is not installed.")
    print("    Run:  pip install Pillow")
    raise SystemExit(1)

# ── Output directory ──────────────────────────────────────────
OUT = Path(__file__).parent.parent / "public" / "assets"
OUT.mkdir(parents=True, exist_ok=True)


# ── Helper functions ──────────────────────────────────────────

def save(img: Image.Image, name: str):
    path = OUT / name
    img.save(path, "PNG")
    kb = path.stat().st_size // 1024
    print(f"  ✅  {name}  ({img.width}×{img.height}px, {kb} KB)")


def circle_img(size: int, color: tuple, outline: tuple | None = None) -> Image.Image:
    img  = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    r    = size // 2 - 2
    cx = cy = size // 2
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color, outline=outline, width=3)
    return img


def add_glow(img: Image.Image, color: tuple, radius: int = 8) -> Image.Image:
    """Apply a soft colored glow around non-transparent pixels."""
    glow  = Image.new("RGBA", img.size, (0, 0, 0, 0))
    mask  = img.getchannel("A")
    glow_layer = Image.new("RGBA", img.size, color[:3] + (180,))
    glow_layer.putalpha(mask)
    blurred = glow_layer.filter(ImageFilter.GaussianBlur(radius))
    result  = Image.alpha_composite(blurred, img)
    return result


# ── Assets ─────────────────────────────────────────────────────

def gen_player():
    """Rescue swimmer with orange life ring."""
    SIZE = 64
    img  = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d    = ImageDraw.Draw(img)
    cx = cy = SIZE // 2

    # Body circle – ocean blue
    d.ellipse([4, 4, SIZE - 4, SIZE - 4], fill=(33, 150, 243, 255), outline=(13, 71, 161), width=2)

    # Life ring
    ring_r = 16
    for i in range(4):
        c = (239, 83, 80) if i % 2 == 0 else (255, 255, 255)
        start = i * 90
        d.pieslice([cx - ring_r, cy - ring_r, cx + ring_r, cy + ring_r],
                   start=start, end=start + 90, fill=c)

    # Inner hole
    hole_r = 8
    d.ellipse([cx - hole_r, cy - hole_r, cx + hole_r, cy + hole_r],
              fill=(13, 59, 110, 255))

    img = add_glow(img, (33, 150, 243), radius=6)
    save(img, "player.png")


def gen_victim():
    """Drowning person with arms raised."""
    W, H = 48, 64
    img  = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d    = ImageDraw.Draw(img)

    # Head
    d.ellipse([16, 2, 32, 18], fill=(255, 204, 188))
    # Torso
    d.rectangle([18, 18, 30, 38], fill=(239, 83, 80))
    # Arms raised
    d.line([(18, 22), (8, 10)], fill=(255, 204, 188), width=4)
    d.line([(30, 22), (40, 10)], fill=(255, 204, 188), width=4)
    # Legs
    d.line([(22, 38), (16, 54)], fill=(100, 181, 246), width=4)
    d.line([(26, 38), (32, 54)], fill=(100, 181, 246), width=4)
    # Highlight on head
    d.ellipse([24, 4, 30, 10], fill=(255, 224, 212))

    save(img, "victim.png")


def gen_shark():
    """Simple cartoon shark."""
    W, H = 80, 48
    img  = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d    = ImageDraw.Draw(img)

    body_color = (84, 110, 122)
    belly_color = (176, 190, 197)

    # Body
    d.ellipse([8, 14, 72, 40], fill=body_color, outline=(55, 71, 79), width=2)
    # Belly
    d.ellipse([14, 22, 66, 38], fill=belly_color)
    # Dorsal fin
    d.polygon([(36, 14), (48, 0), (56, 14)], fill=body_color, outline=(55, 71, 79))
    # Tail
    d.polygon([(8, 16), (0, 8), (8, 30)], fill=body_color)
    # Eye
    d.ellipse([60, 18, 68, 26], fill="black")
    d.ellipse([62, 19, 65, 22], fill="white")
    # Mouth
    d.arc([58, 24, 74, 34], start=0, end=180, fill="white", width=2)

    save(img, "shark.png")


def gen_wave():
    """Semi-transparent horizontal wave band."""
    W, H = 414, 28
    img  = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d    = ImageDraw.Draw(img)

    # Main band
    d.rectangle([0, 0, W, H], fill=(66, 165, 245, 100))

    # Foam caps
    for x in range(0, W, 40):
        d.ellipse([x, 0, x + 36, 14], fill=(187, 222, 251, 180))

    img = img.filter(ImageFilter.GaussianBlur(1))
    save(img, "wave.png")


def gen_float():
    """Orange/white life ring."""
    SIZE = 48
    img  = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d    = ImageDraw.Draw(img)
    cx = cy = SIZE // 2
    r  = SIZE // 2 - 3

    for i in range(4):
        c = (255, 102, 0) if i % 2 == 0 else (255, 255, 255)
        d.pieslice([cx - r, cy - r, cx + r, cy + r],
                   start=i * 90, end=i * 90 + 90, fill=c, outline=(180, 60, 0), width=1)

    # Inner hole
    hole = r // 2
    d.ellipse([cx - hole, cy - hole, cx + hole, cy + hole], fill=(0, 0, 0, 0))
    d.ellipse([cx - hole, cy - hole, cx + hole, cy + hole],
              outline=(180, 60, 0), width=2)

    img = add_glow(img, (255, 102, 0), radius=5)
    save(img, "float.png")


def gen_goggles():
    """Swimming goggles."""
    W, H = 56, 36
    img  = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d    = ImageDraw.Draw(img)

    strap_color = (21, 101, 192)
    lens_color  = (79, 195, 247, 200)
    rim_color   = (13, 71, 161)

    # Strap
    d.line([(2, 18), (54, 18)], fill=strap_color, width=4)
    # Left lens
    d.ellipse([4, 10, 24, 28], fill=lens_color, outline=rim_color, width=3)
    # Right lens
    d.ellipse([32, 10, 52, 28], fill=lens_color, outline=rim_color, width=3)
    # Bridge
    d.line([(24, 18), (32, 18)], fill=rim_color, width=3)
    # Shine
    d.ellipse([7, 12, 13, 17], fill=(255, 255, 255, 140))
    d.ellipse([35, 12, 41, 17], fill=(255, 255, 255, 140))

    save(img, "goggles.png")


def gen_board():
    """Swimming kickboard."""
    W, H = 64, 40
    img  = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d    = ImageDraw.Draw(img)

    # Main shape (rounded rectangle)
    d.rounded_rectangle([4, 4, 60, 36], radius=10,
                         fill=(102, 187, 106), outline=(56, 142, 60), width=2)
    # Logo stripe
    d.rounded_rectangle([18, 14, 46, 26], radius=4,
                         fill=(255, 255, 255, 140))

    save(img, "board.png")


def gen_boat():
    """Rescue boat – orange hull with white cabin."""
    W, H = 96, 52
    img  = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d    = ImageDraw.Draw(img)

    # Hull
    d.rounded_rectangle([4, 24, 92, 48], radius=8,
                         fill=(245, 127, 23), outline=(230, 81, 0), width=2)
    # Cabin
    d.rounded_rectangle([28, 8, 68, 28], radius=5,
                         fill=(255, 255, 255), outline=(200, 200, 200), width=2)
    # Window
    d.ellipse([42, 12, 54, 24], fill=(79, 195, 247))
    # Red cross on cabin
    d.rectangle([39, 12, 42, 22], fill=(239, 83, 80))
    d.rectangle([36, 15, 45, 18], fill=(239, 83, 80))

    img = add_glow(img, (245, 127, 23), radius=4)
    save(img, "boat.png")


def gen_icon(size: int):
    """App icon (solid ocean + wave + life ring)."""
    img  = Image.new("RGBA", (size, size), (10, 32, 64))
    d    = ImageDraw.Draw(img)
    cx = cy = size // 2

    # Gradient-ish background (two circles)
    d.ellipse([size // 6, size // 6, size * 5 // 6, size * 5 // 6],
              fill=(13, 59, 110, 180))

    # Life ring
    r = size * 2 // 5
    for i in range(4):
        c = (239, 83, 80) if i % 2 == 0 else (255, 255, 255)
        d.pieslice([cx - r, cy - r, cx + r, cy + r],
                   start=i * 90, end=i * 90 + 90, fill=c)

    # Inner hole
    hole = r // 2
    d.ellipse([cx - hole, cy - hole, cx + hole, cy + hole], fill=(10, 32, 64))

    # "SR" text
    try:
        font = ImageFont.truetype("arial.ttf", size // 6)
    except Exception:
        font = ImageFont.load_default()

    text = "SR"
    bbox = d.textbbox((0, 0), text, font=font)
    tw   = bbox[2] - bbox[0]
    th   = bbox[3] - bbox[1]
    d.text((cx - tw // 2, cy - th // 2), text, fill=(249, 168, 37), font=font)

    save(img, f"icon-{size}.png")


# ── Main ──────────────────────────────────────────────────────

def main():
    print("\n🌊  Sea Rescue – Asset Generator")
    print("=" * 42)

    generators = [
        ("Player",        gen_player),
        ("Victim",        gen_victim),
        ("Shark",         gen_shark),
        ("Wave",          gen_wave),
        ("Life ring",     gen_float),
        ("Goggles",       gen_goggles),
        ("Kickboard",     gen_board),
        ("Rescue boat",   gen_boat),
        ("Icon 512px",    lambda: gen_icon(512)),
        ("Icon 192px",    lambda: gen_icon(192)),
    ]

    for name, fn in generators:
        print(f"\n  Generating {name}...")
        try:
            fn()
        except Exception as e:
            print(f"  ❌ Error: {e}")

    print(f"\n✅  Done! Assets written to: {OUT.resolve()}")
    print("   To use them in the game, update GraphicsFactory.js to load")
    print("   these PNGs instead of drawing procedural textures.\n")


if __name__ == "__main__":
    main()
