"""
OG image — 1200×630 landscape variant of Chromatic Velocity for social sharing.
Mirrors the YFL Stripe product image but in standard OG aspect ratio.
"""
import math
from PIL import Image, ImageDraw, ImageFilter, ImageFont

# Render 2x for crispness, downsample to final
W = 2400
H = 1260
FINAL_W = 1200
FINAL_H = 630
OUT = "public/og.png"

BG_TOP    = (4,  6, 12)
BG_BOTTOM = (10, 14, 26)
CYAN      = (56, 189, 248)
CYAN_HOT  = (34, 211, 238)
MAGENTA   = (236, 72, 153)
ORANGE    = (249, 115, 22)
ORANGE_HOT= (251, 146, 60)
WHITE     = (240, 246, 255)
DIM       = (71, 85, 105)
MUTED     = (148, 163, 184)


def vertical_gradient(width, height, top, bottom):
    img = Image.new('RGB', (width, height), top)
    d = ImageDraw.Draw(img)
    for y in range(height):
        t = y / height
        r = int(top[0] + (bottom[0]-top[0]) * t)
        g = int(top[1] + (bottom[1]-top[1]) * t)
        b = int(top[2] + (bottom[2]-top[2]) * t)
        d.line([(0, y), (width, y)], fill=(r, g, b))
    return img


def vignette(width, height, strength=0.5):
    v = Image.new('L', (width, height), 0)
    d = ImageDraw.Draw(v)
    cx, cy = width // 2, height // 2
    max_r = math.hypot(cx, cy)
    for r in range(int(max_r), 0, -8):
        t = r / max_r
        a = int(255 * (t ** 2.2) * strength)
        d.ellipse([cx-r, cy-r, cx+r, cy+r], fill=a)
    return v.filter(ImageFilter.GaussianBlur(radius=80))


def get_font(names, size):
    for n in names:
        try:
            return ImageFont.truetype(n, size)
        except (OSError, IOError):
            continue
    return ImageFont.load_default()


def bezier_pts(p0, p1, p2, n=300):
    pts = []
    for i in range(n + 1):
        t = i / n
        x = (1-t)**2 * p0[0] + 2*(1-t)*t * p1[0] + t**2 * p2[0]
        y = (1-t)**2 * p0[1] + 2*(1-t)*t * p1[1] + t**2 * p2[1]
        pts.append((x, y))
    return pts


def draw_streak(layer, points, color, width_start, width_end, opacity_start, opacity_end):
    d = ImageDraw.Draw(layer)
    n = len(points)
    for i in range(n - 1):
        t = i / n
        w = int(width_start + (width_end - width_start) * t)
        a = int(opacity_start + (opacity_end - opacity_start) * t)
        d.line([points[i], points[i+1]], fill=(*color, a), width=w)


# Background
bg = vertical_gradient(W, H, BG_TOP, BG_BOTTOM).convert('RGBA')

# Subtle grid
grid = Image.new('RGBA', (W, H), (0, 0, 0, 0))
gd = ImageDraw.Draw(grid)
step = 120
for x in range(step, W, step):
    gd.line([(x, 0), (x, H)], fill=(255, 255, 255, 6), width=2)
for y in range(step, H, step):
    gd.line([(0, y), (W, y)], fill=(255, 255, 255, 6), width=2)
bg = Image.alpha_composite(bg, grid)

# Light streaks - orange and cyan crossing diagonally
orange_layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
orange_pts = bezier_pts((-100, 200), (1100, 750), (2500, 1100))
draw_streak(orange_layer, orange_pts, ORANGE_HOT, 50, 28, 250, 110)
orange_layer = orange_layer.filter(ImageFilter.GaussianBlur(radius=14))
orange_glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
draw_streak(orange_glow, orange_pts, ORANGE, 200, 130, 130, 50)
orange_glow = orange_glow.filter(ImageFilter.GaussianBlur(radius=70))

cyan_layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
cyan_pts = bezier_pts((-100, 1100), (1200, 600), (2500, 200))
draw_streak(cyan_layer, cyan_pts, CYAN_HOT, 50, 28, 240, 110)
cyan_layer = cyan_layer.filter(ImageFilter.GaussianBlur(radius=14))
cyan_glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
draw_streak(cyan_glow, cyan_pts, CYAN, 200, 130, 130, 50)
cyan_glow = cyan_glow.filter(ImageFilter.GaussianBlur(radius=70))

bg = Image.alpha_composite(bg, orange_glow)
bg = Image.alpha_composite(bg, cyan_glow)
bg = Image.alpha_composite(bg, orange_layer)
bg = Image.alpha_composite(bg, cyan_layer)

# Spotlight from above center
spot = Image.new('RGBA', (W, H), (0, 0, 0, 0))
sd = ImageDraw.Draw(spot)
for r in range(900, 80, -8):
    a = max(0, int(28 * (1 - r/900) ** 2.4))
    sd.ellipse([W//2 - r, 460 - int(r*0.7), W//2 + r, 460 + int(r*0.7)], fill=(*WHITE, a))
spot = spot.filter(ImageFilter.GaussianBlur(radius=70))
bg = Image.alpha_composite(bg, spot)

# YFL — monumental letterform with chromatic split
font_yfl = get_font([
    "ariblk.ttf", "Arial Black.ttf", "arialbd.ttf",
    "Impact.ttf", "DejaVuSans-Bold.ttf"
], 480)

text = "YFL"
text_anchor_x = W // 2
text_anchor_y = 520
OFFSET = 14

# Cyan plate (left)
cyan_plate = Image.new('RGBA', (W, H), (0, 0, 0, 0))
ImageDraw.Draw(cyan_plate).text((text_anchor_x - OFFSET, text_anchor_y), text,
                                font=font_yfl, fill=(*CYAN_HOT, 240), anchor="mm")
# Magenta plate (right)
mag_plate = Image.new('RGBA', (W, H), (0, 0, 0, 0))
ImageDraw.Draw(mag_plate).text((text_anchor_x + OFFSET, text_anchor_y), text,
                               font=font_yfl, fill=(*MAGENTA, 240), anchor="mm")
# Glow under core
glow_plate = Image.new('RGBA', (W, H), (0, 0, 0, 0))
ImageDraw.Draw(glow_plate).text((text_anchor_x, text_anchor_y), text,
                                font=font_yfl, fill=(*WHITE, 130), anchor="mm")
glow_plate = glow_plate.filter(ImageFilter.GaussianBlur(radius=32))
# Core
core_plate = Image.new('RGBA', (W, H), (0, 0, 0, 0))
ImageDraw.Draw(core_plate).text((text_anchor_x, text_anchor_y), text,
                                font=font_yfl, fill=(*WHITE, 255), anchor="mm")

bg = Image.alpha_composite(bg, glow_plate)
bg = Image.alpha_composite(bg, cyan_plate)
bg = Image.alpha_composite(bg, mag_plate)
bg = Image.alpha_composite(bg, core_plate)

# Wordmark + tagline beneath
draw = ImageDraw.Draw(bg)
font_wordmark = get_font(["arial.ttf", "Arial.ttf", "DejaVuSans.ttf"], 56)
font_tagline  = get_font(["arial.ttf", "Arial.ttf", "DejaVuSans.ttf"], 36)
font_micro    = get_font(["arial.ttf", "Arial.ttf", "DejaVuSans.ttf"], 28)


def draw_letterspaced(d, xy, text, font, fill, spacing=10):
    x, y = xy
    for ch in text:
        d.text((x, y), ch, font=font, fill=fill)
        b = font.getbbox(ch)
        x += (b[2] - b[0]) + spacing


def measure_letterspaced(text, font, spacing=10):
    return sum((font.getbbox(ch)[2] - font.getbbox(ch)[0]) for ch in text) + spacing * (len(text) - 1)


# YOURFRIENDLEAGUE wordmark below YFL
wm = "YOURFRIENDLEAGUE"
WM_SP = 16
wm_w = measure_letterspaced(wm, font_wordmark, WM_SP)
draw_letterspaced(draw, ((W - wm_w) // 2, 880), wm, font_wordmark, (*WHITE, 240), spacing=WM_SP)

# Tagline
tag = "PREDICT  ·  PLAY  ·  WIN"
TAG_SP = 8
tag_w = measure_letterspaced(tag, font_tagline, TAG_SP)
draw_letterspaced(draw, ((W - tag_w) // 2, 990), tag, font_tagline, (*MUTED, 220), spacing=TAG_SP)

# Tiny corner registration crosses + caption
mark_color = (*DIM, 200)
mark_len = 32
mark_off = 70
for (cx_, cy_, dx, dy) in [
    (mark_off, mark_off, 1, 1),
    (W - mark_off, mark_off, -1, 1),
    (mark_off, H - mark_off, 1, -1),
    (W - mark_off, H - mark_off, -1, -1),
]:
    draw.line([(cx_, cy_), (cx_ + mark_len*dx, cy_)], fill=mark_color, width=2)
    draw.line([(cx_, cy_), (cx_, cy_ + mark_len*dy)], fill=mark_color, width=2)

# Top corner labels
draw_letterspaced(draw, (130, 100), "YOURFRIENDLEAGUE.COM", font_micro, (*MUTED, 200), spacing=6)
draw.text((W - 240, 100), "+ 56°51' N", font=font_micro, fill=(*DIM, 220))
# Bottom corner labels
draw_letterspaced(draw, (130, H - 130), "PREMIUM  ·  CAT. 003", font_micro, (*DIM, 200), spacing=8)
draw.text((W - 270, H - 130), "SIA  EGATRI", font=font_micro, fill=(*DIM, 200))

# Vignette
vig = vignette(W, H, strength=0.5)
black = Image.new('RGB', (W, H), (0, 0, 0))
bg = Image.composite(black.convert('RGBA'), bg, vig)

# Downsample
final = bg.convert('RGB').resize((FINAL_W, FINAL_H), Image.LANCZOS)
final.save(OUT, optimize=True, quality=92)
print(f"Saved {OUT}  ({FINAL_W}x{FINAL_H})")
