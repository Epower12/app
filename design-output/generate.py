"""
Chromatic Velocity — Stripe product image, brand-aligned with YFL logo.
Renders at 2048x2048, downsamples for crispness.
"""
import math
from PIL import Image, ImageDraw, ImageFilter, ImageFont

# ── Canvas ────────────────────────────────────────────────
W = 2048
H = 2048
FINAL = 1024
OUT = "design-output/stripe-product-image.png"

# ── Palette ───────────────────────────────────────────────
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

# ── Helpers ───────────────────────────────────────────────
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

def vignette(width, height, strength=0.55):
    """Radial darkening at edges for cinematic feel."""
    v = Image.new('L', (width, height), 0)
    d = ImageDraw.Draw(v)
    cx, cy = width // 2, height // 2
    max_r = math.hypot(cx, cy)
    for r in range(int(max_r), 0, -8):
        t = r / max_r
        a = int(255 * (t ** 2.2) * strength)
        d.ellipse([cx-r, cy-r, cx+r, cy+r], fill=a)
    v = v.filter(ImageFilter.GaussianBlur(radius=80))
    return v

def get_font(names, size):
    for n in names:
        try:
            return ImageFont.truetype(n, size)
        except (OSError, IOError):
            continue
    return ImageFont.load_default()

# ── 1. Background ─────────────────────────────────────────
bg = vertical_gradient(W, H, BG_TOP, BG_BOTTOM).convert('RGBA')

# ── 2. Light streaks — orange + cyan diagonals crossing ───
def draw_streak(layer, points, color, width_start, width_end, opacity_start, opacity_end):
    """Draw a tapered streak along bezier-ish path."""
    d = ImageDraw.Draw(layer)
    n = len(points)
    for i in range(n - 1):
        t = i / n
        w = int(width_start + (width_end - width_start) * t)
        a = int(opacity_start + (opacity_end - opacity_start) * t)
        d.line([points[i], points[i+1]], fill=(*color, a), width=w)

def bezier_pts(p0, p1, p2, n=300):
    pts = []
    for i in range(n + 1):
        t = i / n
        x = (1-t)**2 * p0[0] + 2*(1-t)*t * p1[0] + t**2 * p2[0]
        y = (1-t)**2 * p0[1] + 2*(1-t)*t * p1[1] + t**2 * p2[1]
        pts.append((x, y))
    return pts

# Orange streak — sweeps from upper-left across center to lower-right
orange_layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
orange_pts = bezier_pts((-100, 380), (800, 1080), (2200, 1500))
draw_streak(orange_layer, orange_pts, ORANGE_HOT, 46, 26, 250, 130)
orange_layer = orange_layer.filter(ImageFilter.GaussianBlur(radius=12))
# Soft outer glow layer — more presence to match the cyan streak
orange_glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
draw_streak(orange_glow, orange_pts, ORANGE, 170, 110, 130, 50)
orange_glow = orange_glow.filter(ImageFilter.GaussianBlur(radius=58))

# Cyan streak — sweeps from lower-left through center to upper-right
cyan_layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
cyan_pts = bezier_pts((-100, 1700), (900, 1000), (2200, 580))
draw_streak(cyan_layer, cyan_pts, CYAN_HOT, 38, 22, 220, 95)
cyan_layer = cyan_layer.filter(ImageFilter.GaussianBlur(radius=14))
cyan_glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
draw_streak(cyan_glow, cyan_pts, CYAN, 140, 90, 90, 30)
cyan_glow = cyan_glow.filter(ImageFilter.GaussianBlur(radius=52))

bg = Image.alpha_composite(bg, orange_glow)
bg = Image.alpha_composite(bg, cyan_glow)
bg = Image.alpha_composite(bg, orange_layer)
bg = Image.alpha_composite(bg, cyan_layer)

# ── 3. Spotlight from above center ────────────────────────
spot = Image.new('RGBA', (W, H), (0, 0, 0, 0))
sd = ImageDraw.Draw(spot)
for r in range(900, 80, -8):
    a = max(0, int(28 * (1 - r/900) ** 2.6))
    sd.ellipse([W//2 - r, 700 - int(r*0.7), W//2 + r, 700 + int(r*0.7)], fill=(*WHITE, a))
spot = spot.filter(ImageFilter.GaussianBlur(radius=70))
bg = Image.alpha_composite(bg, spot)

# ── 4. The monumental YFL — chromatic plate separation ───
# We build the letterform on a wide transparent canvas, render three offset plates,
# then composite back.

font_yfl = get_font([
    "ariblk.ttf", "Arial Black.ttf", "arialbd.ttf",
    "Impact.ttf", "DejaVuSans-Bold.ttf"
], 640)

text = "YFL"

# Measure precisely by rendering to a temp canvas and finding actual content bounds
tmp = Image.new('L', (W, H), 0)
ImageDraw.Draw(tmp).text((W // 2, H // 2), text, font=font_yfl, fill=255, anchor="mm")
content_bbox = tmp.getbbox()  # actual rendered pixel bounds
if content_bbox is None:
    content_bbox = (0, 0, W, H)
content_w = content_bbox[2] - content_bbox[0]
content_h = content_bbox[3] - content_bbox[1]

# Pin the visual center of YFL to ~y=830 (upper-center of canvas)
YFL_CENTER_Y = 830
text_x = (W - content_w) // 2 - content_bbox[0] + (W // 2 - W // 2)
# Re-derive text_x via anchor positioning instead
# Use anchor="mm" everywhere for predictable positioning
text_anchor_x = W // 2
text_anchor_y = YFL_CENTER_Y

# Chromatic separation offsets — heavier than before to match the brand logo's punch
OFFSET = 18

# Cyan plate (left shift) — using anchor "mm" for predictable centering
cyan_plate = Image.new('RGBA', (W, H), (0, 0, 0, 0))
ImageDraw.Draw(cyan_plate).text((text_anchor_x - OFFSET, text_anchor_y), text,
                                font=font_yfl, fill=(*CYAN_HOT, 240), anchor="mm")

# Magenta plate (right shift)
mag_plate = Image.new('RGBA', (W, H), (0, 0, 0, 0))
ImageDraw.Draw(mag_plate).text((text_anchor_x + OFFSET, text_anchor_y), text,
                               font=font_yfl, fill=(*MAGENTA, 240), anchor="mm")

# Soft outer glow of the white core for cinematic bloom
glow_plate = Image.new('RGBA', (W, H), (0, 0, 0, 0))
ImageDraw.Draw(glow_plate).text((text_anchor_x, text_anchor_y), text,
                                font=font_yfl, fill=(*WHITE, 120), anchor="mm")
glow_plate = glow_plate.filter(ImageFilter.GaussianBlur(radius=36))

# White core plate (the moment of decision, perfectly registered)
core_plate = Image.new('RGBA', (W, H), (0, 0, 0, 0))
ImageDraw.Draw(core_plate).text((text_anchor_x, text_anchor_y), text,
                                font=font_yfl, fill=(*WHITE, 255), anchor="mm")

# Composite: glow → cyan plate → magenta plate → core
bg = Image.alpha_composite(bg, glow_plate)
bg = Image.alpha_composite(bg, cyan_plate)
bg = Image.alpha_composite(bg, mag_plate)
bg = Image.alpha_composite(bg, core_plate)

# ── 5. PREMIUM wordmark — letterspaced supporting line ───
draw = ImageDraw.Draw(bg)

font_premium = get_font(["arial.ttf", "Arial.ttf", "DejaVuSans.ttf"], 78)
font_tagline = get_font(["arial.ttf", "Arial.ttf", "DejaVuSans.ttf"], 36)
font_micro   = get_font(["arial.ttf", "Arial.ttf", "DejaVuSans.ttf"], 26)

def draw_letterspaced(d, xy, text, font, fill, spacing=14):
    x, y = xy
    for ch in text:
        d.text((x, y), ch, font=font, fill=fill)
        b = font.getbbox(ch)
        x += (b[2] - b[0]) + spacing

# PREMIUM — set in two registered plates for subtle echo of the chromatic treatment
# Pin below the YFL visual lower edge with generous breathing room
prem = "PREMIUM"
PREM_SPACING = 22
total_w = sum((font_premium.getbbox(ch)[2] - font_premium.getbbox(ch)[0]) for ch in prem) + PREM_SPACING * (len(prem) - 1)

# YFL visual half-height ≈ 230 at font size 640 → so YFL_CENTER_Y + 230 = ~1060 is its visual bottom
# PREMIUM y baseline at 1280 keeps a clear ~220px gap; tagline at 1400 below that
PREM_Y = 1260
TAG_Y  = 1400

# Subtle chromatic ghosts on PREMIUM (4px split — gentler echo of YFL)
draw_letterspaced(draw, ((W - total_w)//2 - 4, PREM_Y), prem, font_premium, (*CYAN_HOT, 70), spacing=PREM_SPACING)
draw_letterspaced(draw, ((W - total_w)//2 + 4, PREM_Y), prem, font_premium, (*MAGENTA, 70), spacing=PREM_SPACING)
draw_letterspaced(draw, ((W - total_w)//2,     PREM_Y), prem, font_premium, (*WHITE,    245), spacing=PREM_SPACING)

# Tagline
tag = "PREDICT  ·  PLAY  ·  WIN"
TAG_SPACING = 6
tag_w = sum((font_tagline.getbbox(ch)[2] - font_tagline.getbbox(ch)[0]) for ch in tag) + TAG_SPACING * (len(tag) - 1)
draw_letterspaced(draw, ((W - tag_w)//2, TAG_Y), tag, font_tagline, (*MUTED, 220), spacing=TAG_SPACING)

# ── 6. Reflective floor — horizontal mirror with fade ───
# Take what we've rendered above floor line, mirror vertically, fade alpha downward
# Floor sits below tagline (1400 + ~50 text height = 1450) with breathing room
FLOOR_Y = 1620

# Copy area above floor
above = bg.crop((0, 0, W, FLOOR_Y)).convert('RGBA')
# Flip vertically
reflection = above.transpose(Image.FLIP_TOP_BOTTOM)
# Apply vertical alpha falloff
fade_mask = Image.new('L', (W, FLOOR_Y), 0)
fm = ImageDraw.Draw(fade_mask)
for y in range(FLOOR_Y):
    a = int(95 * (1 - y / FLOOR_Y) ** 1.6)
    fm.line([(0, y), (W, y)], fill=a)
# Compose: paste reflection at floor line, masked by fade
floor_layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
# Reflection should appear flipped under floor line
# Reflection height available: H - FLOOR_Y
reflection_visible = reflection.crop((0, 0, W, H - FLOOR_Y))
fade_visible = fade_mask.crop((0, 0, W, H - FLOOR_Y))
reflection_visible.putalpha(fade_visible)
floor_layer.paste(reflection_visible, (0, FLOOR_Y), reflection_visible)

# Add subtle horizontal floor highlight line
fl_line = ImageDraw.Draw(floor_layer)
fl_line.line([(150, FLOOR_Y), (W - 150, FLOOR_Y)], fill=(*WHITE, 28), width=2)

bg = Image.alpha_composite(bg, floor_layer)

# ── 7. Vignette + final atmosphere ────────────────────────
vig = vignette(W, H, strength=0.55)
black = Image.new('RGB', (W, H), (0, 0, 0))
bg = Image.composite(black.convert('RGBA'), bg, vig)

# ── 8. Corner registration marks + maker mark ───────────
draw = ImageDraw.Draw(bg)
mark_color = (*DIM, 200)
mark_len = 32
mark_off = 84
# 4 corner registration crosses
for (cx_, cy_, dx, dy) in [
    (mark_off, mark_off, 1, 1),
    (W - mark_off, mark_off, -1, 1),
    (mark_off, H - mark_off, 1, -1),
    (W - mark_off, H - mark_off, -1, -1),
]:
    draw.line([(cx_, cy_), (cx_ + mark_len*dx, cy_)], fill=mark_color, width=2)
    draw.line([(cx_, cy_), (cx_, cy_ + mark_len*dy)], fill=mark_color, width=2)

# Top-left identifier — small letterspaced caption
draw_letterspaced(draw, (140, 130), "YOURFRIENDLEAGUE", font_micro, (*MUTED, 200), spacing=8)
# Top-right coord — Latvia latitude
draw.text((W - 280, 130), "56°51' N", font=font_micro, fill=(*DIM, 220))

# Bottom-left edition mark
draw_letterspaced(draw, (140, H - 130), "CAT. 002  ·  MMXXVI", font_micro, (*DIM, 200), spacing=8)
# Bottom-right ™
sia_text = "SIA  EGATRI"
sia_spacing = 6
sia_w = sum((font_micro.getbbox(ch)[2] - font_micro.getbbox(ch)[0]) for ch in sia_text) + sia_spacing * (len(sia_text) - 1)
draw_letterspaced(draw, (W - sia_w - 140, H - 130), sia_text, font_micro, (*DIM, 200), spacing=sia_spacing)

# ── 9. Downsample for crispness ───────────────────────────
final = bg.convert('RGB').resize((FINAL, FINAL), Image.LANCZOS)
final.save(OUT, optimize=True, quality=95)
print(f"Saved {OUT}")
