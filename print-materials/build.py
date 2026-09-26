"""Builds the Texas Health Help flyer and banner as print-ready vector PDFs."""
from pathlib import Path

import qrcode
from reportlab.lib.colors import Color, HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

FONTS = Path("/root/.claude/skills/synced/1c204bf7-74c6-4cdf-b321-b2ada1e2d870_b00db03a-5903-481f-8538-c35d4f927166/canvas-design/canvas-fonts")
OUT = Path(__file__).parent
for name, file in {
    "Serif": "Lora-Bold.ttf",
    "SerifItalic": "Lora-Italic.ttf",
    "Sans": "Outfit-Regular.ttf",
    "SansBold": "Outfit-Bold.ttf",
}.items():
    pdfmetrics.registerFont(TTFont(name, str(FONTS / file)))

PINE = HexColor("#1E4D2B")
PINE_RING = HexColor("#2C6139")
EMBER = HexColor("#C75A1F")  # print orange from the brand guide
CREAM = HexColor("#F6F0E4")
INK = HexColor("#1A2E20")
MUTED = HexColor("#5B6B5F")
WHITE = HexColor("#FFFFFF")

PHONE = "346-699-7222"
SERVICES = [
    "Doctors & free clinics",
    "Medicaid & CHIP",
    "Food help: SNAP & WIC",
    "Rides to appointments",
    "Senior & caregiver support",
    "Utility & rent help",
]


def width(text, font, size):
    return pdfmetrics.stringWidth(text, font, size)


def fit(text, font, size, max_w):
    while width(text, font, size) > max_w:
        size -= 0.5
    return size


def tracked(c, x, y, text, font, size, tracking, color, anchor="left"):
    """Letter-spaced small caps line."""
    total = width(text, font, size) + tracking * (len(text) - 1)
    if anchor == "center":
        x -= total / 2
    c.setFillColor(color)
    c.setFont(font, size)
    for ch in text:
        c.drawString(x, y, ch)
        x += width(ch, font, size) + tracking


def rings(c, cx, cy, r0, step, count, color, lw):
    c.setStrokeColor(color)
    c.setLineWidth(lw)
    for i in range(count):
        c.circle(cx, cy, r0 + i * step, stroke=1, fill=0)


def light(c, cx, cy, r):
    """The porch light: an ember core inside two soft halos."""
    for k, alpha in ((2.6, 0.12), (1.8, 0.22)):
        c.setFillColor(Color(EMBER.red, EMBER.green, EMBER.blue, alpha=alpha))
        c.circle(cx, cy, r * k, stroke=0, fill=1)
    c.setFillColor(EMBER)
    c.circle(cx, cy, r, stroke=0, fill=1)


def qr(c, x, y, size, url, dark=PINE):
    q = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, border=0)
    q.add_data(url)
    q.make(fit=True)
    m = q.get_matrix()
    n = len(m)
    pad = size * 0.08
    cell = (size - 2 * pad) / n
    c.setFillColor(WHITE)
    c.roundRect(x, y, size, size, size * 0.06, stroke=0, fill=1)
    c.setFillColor(dark)
    for r, row in enumerate(m):
        for col, on in enumerate(row):
            if on:
                # slight overlap avoids hairline gaps between modules in print
                c.rect(x + pad + col * cell, y + size - pad - (r + 1) * cell, cell + 0.15, cell + 0.15, stroke=0, fill=1)


# ── FLYER: 8.5 x 11 in trim, 0.125 in bleed ───────────────────────────
def flyer():
    bleed = 9
    W, H = 8.5 * 72 + 2 * bleed, 11 * 72 + 2 * bleed
    L, R = bleed + 40, W - bleed - 40  # safe area (0.55 in from trim)
    c = canvas.Canvas(str(OUT / "THH-flyer-8.5x11-print.pdf"), pagesize=(W, H))
    c.setTitle("Texas Health Help — Flyer")

    c.setFillColor(CREAM)
    c.rect(0, 0, W, H, stroke=0, fill=1)

    # Pine band with radiating rings, clipped to the band
    band_bottom = H - 250
    c.setFillColor(PINE)
    c.rect(0, band_bottom, W, H - band_bottom, stroke=0, fill=1)
    c.saveState()
    p = c.beginPath()
    p.rect(0, band_bottom, W, H - band_bottom)
    c.clipPath(p, stroke=0, fill=0)
    lx, ly = R - 48, H - 118
    rings(c, lx, ly, 34, 22, 16, PINE_RING, 1.1)
    c.restoreState()
    light(c, lx, ly, 11)

    y = H - bleed - 92
    c.setFillColor(CREAM)
    c.setFont("Serif", 42)
    c.drawString(L, y, "Texas Health Help")
    c.setFont("SerifItalic", 15)
    c.setFillColor(Color(CREAM.red, CREAM.green, CREAM.blue, alpha=0.85))
    c.drawString(L, y - 28, "Powered by AI. Guided by People.")
    c.setStrokeColor(EMBER)
    c.setLineWidth(3)
    c.line(L, y - 52, L + 56, y - 52)
    tracked(c, L, y - 84, "FREE HEALTH NAVIGATION  ·  SAN JACINTO & BRAZORIA COUNTY", "Sans", 8.5, 1.4, CREAM)

    # Headline
    y = band_bottom - 62
    c.setFillColor(PINE)
    c.setFont("Serif", 38)
    c.drawString(L, y, "Need a doctor, food,")
    c.drawString(L, y - 44, "or a ride?")
    c.setFillColor(EMBER)
    c.setFont("SerifItalic", 23)
    c.drawString(L, y - 84, "We'll help you find it. Free.")

    # Services: 2 columns x 3 rows of identical ring marks
    top = y - 136
    col_x = [L, L + (R - L) / 2 + 6]
    for i, label in enumerate(SERVICES):
        cx = col_x[i % 2]
        cy = top - (i // 2) * 36
        c.setStrokeColor(EMBER)
        c.setLineWidth(2)
        c.circle(cx + 7, cy + 5, 6.5, stroke=1, fill=0)
        c.setFillColor(EMBER)
        c.circle(cx + 7, cy + 5, 2.2, stroke=0, fill=1)
        c.setFillColor(INK)
        c.setFont("Sans", 15)
        c.drawString(cx + 24, cy, label)

    # Call-to-action block
    bh, by = 128, bleed + 118
    c.setFillColor(PINE)
    c.roundRect(L, by, R - L, bh, 14, stroke=0, fill=1)
    qs = bh - 28
    qx = R - 14 - qs
    qr(c, qx, by + 14, qs, "https://texashealthhelp.com/get-help?utm_source=flyer")
    tx = L + 26
    tracked(c, tx, by + bh - 36, "CALL FOR FREE HELP", "SansBold", 10, 2, HexColor("#F2B48F"))
    size = fit(PHONE, "SansBold", 52, qx - tx - 20)
    c.setFillColor(CREAM)
    c.setFont("SansBold", size)
    c.drawString(tx, by + 44, PHONE)
    c.setFont("Sans", 11.5)
    c.setFillColor(Color(CREAM.red, CREAM.green, CREAM.blue, alpha=0.85))
    c.drawString(tx, by + 22, "Or scan the code to chat with Jessica, 24/7")

    # Trust line and footer
    c.setFillColor(PINE)
    c.setFont("SansBold", 12.5)
    c.drawCentredString(W / 2, by - 30, "Free   ·   Confidential   ·   No insurance needed   ·   Se habla español")
    c.setFillColor(MUTED)
    c.setFont("Sans", 10)
    c.drawCentredString(W / 2, bleed + 56, "A 501(c)(3) nonprofit   ·   texashealthhelp.com   ·   info@texashealthhelp.com")
    c.setFont("Sans", 8.5)
    c.drawCentredString(W / 2, bleed + 42, "We don't provide medical care. In an emergency, call 911.")
    c.showPage()
    c.save()


# ── BANNER: 6 ft x 3 ft vinyl ─────────────────────────────────────────
def banner():
    W, H = 72 * 72, 36 * 72
    M = 2 * 72  # 2 in margin keeps text clear of grommets and hems
    c = canvas.Canvas(str(OUT / "THH-banner-6x3ft-print.pdf"), pagesize=(W, H))
    c.setTitle("Texas Health Help — Banner")

    c.setFillColor(CREAM)
    c.rect(0, 0, W, H, stroke=0, fill=1)

    split = W * 0.6
    c.setFillColor(PINE)
    c.rect(split, 0, W - split, H, stroke=0, fill=1)
    c.saveState()
    p = c.beginPath()
    p.rect(split, 0, W - split, H)
    c.clipPath(p, stroke=0, fill=0)
    lx, ly = W - M - 120, H - M - 150
    rings(c, lx, ly, 150, 96, 22, PINE_RING, 5)
    c.restoreState()
    light(c, lx, ly, 48)

    # Left: brand and promise
    x = M
    c.setFillColor(PINE)
    c.setFont("Serif", fit("Texas Health Help", "Serif", 300, split - 2 * M))
    c.drawString(x, H - M - 250, "Texas Health Help")
    c.setStrokeColor(EMBER)
    c.setLineWidth(14)
    c.line(x, H - M - 350, x + 260, H - M - 350)
    head = ["Free help finding", "healthcare, food", "& rides."]
    hs = fit(head[1], "Serif", 230, split - 2 * M)
    c.setFillColor(INK)
    c.setFont("Serif", hs)
    # Center the headline between the orange rule and the bottom line.
    lead = hs * 1.08
    region_top, region_bottom = H - M - 350, M + 40 + 96
    block = lead * (len(head) - 1) + hs * 0.72
    first = (region_top + region_bottom) / 2 + block / 2 - hs * 0.72
    for i, line in enumerate(head):
        c.setFillColor(EMBER if i == 2 else INK)
        c.drawString(x, first - i * lead, line)
    c.setFillColor(MUTED)
    c.setFont("SansBold", 96)
    c.drawString(x, M + 40, "Free  ·  Confidential  ·  Se habla español")

    # Right: the single action
    rx = split + M * 0.9
    rw = W - rx - M
    tracked(c, rx, H / 2 + 330, "CALL FOR FREE HELP", "SansBold", 84, 16, HexColor("#F2B48F"))
    ps = fit(PHONE, "SansBold", 300, rw)
    c.setFillColor(CREAM)
    c.setFont("SansBold", ps)
    c.drawString(rx, H / 2 + 60, PHONE)
    qs = 640
    qr(c, rx, M + 40, qs, "https://texashealthhelp.com/get-help?utm_source=banner")
    c.setFillColor(CREAM)
    c.setFont("Sans", 84)
    c.drawString(rx + qs + 70, M + 40 + qs - 150, "Scan to chat")
    c.drawString(rx + qs + 70, M + 40 + qs - 260, "with Jessica,")
    c.setFont("SansBold", 84)
    c.drawString(rx + qs + 70, M + 40 + qs - 370, "24/7")
    c.showPage()
    c.save()


if __name__ == "__main__":
    flyer()
    banner()
