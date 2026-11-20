"""Phase 0 mockups: edit copies of real emulator screenshots, then compose before/after boards."""
import os
from PIL import Image, ImageDraw, ImageFont, ImageChops, ImageStat

ROOT = "C:/Users/Brylle/Documents/01 Mobile Development/stridewood/"
R = ROOT + "e2e-artifacts/20261119-121117/2026-11-19_121119/"
OUT = ROOT + "design/mockups/phase0/"
FONTS = ROOT + "node_modules/@expo-google-fonts/plus-jakarta-sans/"
W = {'body': '500Medium', 'semi': '600SemiBold', 'strong': '700Bold', 'heavy': '800ExtraBold'}

def font(weight, size):
    w = W[weight]
    return ImageFont.truetype(f"{FONTS}{w}/PlusJakartaSans_{w}.ttf", round(size))

INK, SOFT, MUTED = (43, 46, 74), (91, 96, 120), (154, 160, 180)
PRIMARY, PDARK, ACCENT = (46, 195, 143), (31, 166, 118), (255, 138, 60)
WHITE = (255, 255, 255)

def load(p):
    return Image.open(R + p).convert('RGB')

def dist(a, b):
    return sum(abs(x - y) for x, y in zip(a, b))

# ---------- fitting: find size/position of an existing text line ----------
def fit(img, text, weight, box, sizes, fg):
    """box = ink bbox of the original line. Returns (size, x, baseline)."""
    x0, y0, x1, y1 = box
    pad = 8
    reg = (x0 - pad, y0 - pad, x1 + pad, y1 + pad)
    crop = img.crop(reg)
    bg = img.getpixel((reg[0], reg[1]))
    md = max(1, dist(fg, bg))
    tgt = Image.new('L', crop.size)
    tp = tgt.load(); cp = crop.load()
    for y in range(crop.size[1]):
        for x in range(crop.size[0]):
            tp[x, y] = min(255, int(dist(cp[x, y], bg) * 255 / md))
    best = None
    for s in sizes:
        f = font(weight, s)
        asc = f.getbbox(text, anchor='ls')
        for dx in range(-4, 5):
            for by in range(y0 - asc[1] - 6, y0 - asc[1] + 7):
                c = Image.new('L', crop.size)
                ImageDraw.Draw(c).text((x0 - asc[0] + dx - reg[0], by - reg[1]), text, font=f, fill=255, anchor='ls')
                e = sum(ImageStat.Stat(ImageChops.difference(c, tgt)).sum)
                if best is None or e < best[0]:
                    best = (e, s, x0 - asc[0] + dx, by)
    print(f"fit {text[:28]!r}: size {best[1]} x {best[2]} baseline {best[3]}")
    return best[1], best[2], best[3]

def text(d, xy, s, weight, size, fill, anchor='ls'):
    d.text(xy, s, font=font(weight, size), fill=fill, anchor=anchor)
    return d.textlength(s, font=font(weight, size))

def ink_bbox(img, region, test):
    xs, ys = [], []
    px = img.load()
    for y in range(region[1], region[3]):
        for x in range(region[0], region[2]):
            if test(px[x, y]):
                xs.append(x); ys.append(y)
    return (min(xs), min(ys), max(xs) + 1, max(ys) + 1)

def round_mask(size, r):
    m = Image.new('L', size, 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), r, fill=255)
    return m

# ---------- shared assets cropped from real screenshots ----------
shop0 = load('01-tabs/takeScreenshot/01-shop.png')
# Wood coin (log on peach circle) from the Shop balance pill.
cb = ink_bbox(shop0, (985, 215, 1075, 310), lambda p: dist(p, WHITE) > 30)
coin = shop0.crop(cb)
cm = Image.new('L', coin.size, 0)
ImageDraw.Draw(cm).ellipse((1, 1, coin.size[0] - 2, coin.size[1] - 2), fill=255)
print('coin', cb)

def paste_coin(img, x, cy, h):
    c = coin.resize((h, h), Image.LANCZOS)
    m = cm.resize((h, h), Image.LANCZOS)
    img.paste(c, (round(x), round(cy - h / 2)), m)
    return h

def marker(d, x, y, n):
    r = 26
    d.ellipse((x - r, y - r, x + r, y + r), fill=ACCENT, outline=WHITE, width=6)
    d.text((x, y + 2), str(n), font=font('heavy', 30), fill=WHITE, anchor='mm')

# ============================== SHOP ==============================
def shop():
    im = shop0.copy(); d = ImageDraw.Draw(im); marks = []
    # 1. hero subtitle: real counts
    s, x, b = fit(im, '10 buildings · 5 cards a pack · 2% legendary', 'body', (138, 1015, 789, 1051), [30, 31, 31.5, 32, 33], MUTED)
    d.rectangle((120, b - 30, 900, b + 12), fill=WHITE)
    text(d, (x, b), '8 buildings · 3 path types · 2% legendary', 'body', s, MUTED)
    marks.append((31, b - 12))
    # 2. section count: say what's actually buyable
    s2, x2, b2 = fit(im, '3 sets', 'body', (1113, 1227, 1214, 1255), [34, 35, 36, 37, 38], MUTED)
    d.rectangle((1000, b2 - 40, 1240, b2 + 14), fill=(244, 251, 248))
    text(d, (1214, b2), '1 out · 2 soon', 'body', s2, MUTED, anchor='rs')
    marks.append((31, b2 - 12))
    # 3. How it works: Wood, not Steps
    s3, x3, b3 = fit(im, 'Every step you walk adds one Step to your wallet. Trade them for', 'body', (107, 2191, 1074, 2230), [30, 31, 31.5, 32, 33], MUTED)
    d.rectangle((95, b3 - 34, 1180, b3 + 75), fill=WHITE)
    lh = 52.5  # leading-5 = 20dp
    for i, line in enumerate(['Every step has a 1-in-10 chance to drop Wood. Spend', 'it on booster packs, then build what you pull in your city.']):
        text(d, (x3, b3 + i * lh), line, 'body', s3, MUTED)
    marks.append((31, b3 + 14))
    return im, marks, [
        'Hero line uses the set\'s real counts (was "10 buildings"; the set has 8 buildings, 2 props and 3 path types).',
        'Section count says what you can buy now (was "3 sets", two of them "Coming soon").',
        '"How it works" explains Wood (it still said steps add "one Step to your wallet").',
    ]

# ============================== HOME ==============================
def home():
    im = load('00-reset/takeScreenshot/00-home-fresh.png'); d = ImageDraw.Draw(im); marks = []
    canvas = im.getpixel((900, 150))
    # 1. greeting for a first visit
    eb = ink_bbox(im, (480, 205, 600, 265), lambda p: p[0] > 200 and p[1] > 140 and p[2] < 140)
    emoji = im.crop((eb[0] - 2, 210, eb[2] + 3, 260))
    s, x, b = fit(im, 'Welcome back', 'body', (251, 220, 497, 254), [35, 36, 36.75, 37.5, 38.5], MUTED)
    d.rectangle((240, b - 40, 600, b + 14), fill=canvas)
    w = text(d, (x, b), 'Welcome to Stridewood', 'body', s, MUTED)
    im.paste(emoji, (round(x + w + 10), 210))
    marks.append((x + w + 110, b - 14))
    # 2. remove the bell with a fake unread dot
    d.rectangle((1060, 185, 1245, 362), fill=canvas)
    marks.append((1150, 272))
    return im, marks, [
        'First-visit greeting (was "Welcome back" for a player who just installed the app). Returning players get "Good to see you".',
        'Bell removed until notifications exist (it had a permanent orange dot and did nothing on tap).',
    ]

# ============================== NAME STEP ==============================
def name():
    im = load('07-onboarding/takeScreenshot/07-name.png'); d = ImageDraw.Draw(im); marks = []
    eb = ink_bbox(im, (480, 1845, 570, 1900), lambda p: p[0] > 200 and p[1] > 140 and p[2] < 140)
    emoji = im.crop((eb[0] - 3, 1848, eb[2] + 3, 1898))
    s, x, b = fit(im, 'Welcome back', 'body', (280, 1860, eb[0] - 10, 1890), [30, 31, 31.5, 32, 33], MUTED)
    d.rectangle((270, b - 34, 600, b + 12), fill=WHITE)
    w = text(d, (x, b), 'Nice to meet you', 'body', s, MUTED)
    im.paste(emoji, (round(x + w + 8), 1848))
    marks.append((x + w + 100, b - 12))
    return im, marks, ['Live preview greets a new player ("Nice to meet you", was "Welcome back").']

# ============================== SET DETAIL ==============================
def setdetail():
    im = load('03-buy-and-open/takeScreenshot/03-set-detail.png'); d = ImageDraw.Draw(im); marks = []
    px = im.load()
    # 1. remove the bell: repaint each row with the sky colour, keeping the sun
    for y in range(194, 360):
        sky = px[1000, y] if y < 260 else px[1228, y]
        for x in range(1058, 1226):
            p = px[x, y]
            if not (p[0] > 240 and p[1] > 190 and p[2] < 140):
                px[x, y] = sky
    marks.append((1140, 276))
    # 2. Wood icon next to the price label
    s, x, b = fit(im, 'Wood / pack', 'body', (1020, 1398, 1215, 1436), [33, 34, 35, 36, 37], MUTED)
    d.rectangle((960, b - 40, 1225, b + 14), fill=im.getpixel((960, b + 10)))
    w = d.textlength('Wood / pack', font=font('body', s))
    text(d, (1215, b), 'Wood / pack', 'body', s, MUTED, anchor='rs')
    paste_coin(im, 1215 - w - 48, b - 11, 40)
    marks.append((31, b - 12))
    # 3. price on the Buy button
    green = px[300, 2693]
    bag = im.crop((596, 2663, 655, 2724))
    s3, x3, b3 = fit(im, 'Buy pack', 'strong', (679, 2680, 864, 2720), [40, 41, 42, 43, 44], WHITE)
    d.rectangle((420, 2640, 1120, 2745), fill=green)
    f = font('strong', s3)
    parts = d.textlength('Buy pack  ·  ', font=f) + 48 + 10 + d.textlength('200', font=f)
    total = bag.size[0] + 22 + parts
    cx = (246 + 1216) / 2
    left = cx - total / 2
    bm = ImageChops.invert(Image.new('L', bag.size, 0))
    bagmask = Image.eval(bag.convert('L'), lambda v: max(0, min(255, (v - 170) * 3)))
    im.paste(Image.new('RGB', bag.size, WHITE), (round(left), 2663), bagmask)
    tx = left + bag.size[0] + 22
    tx += text(d, (tx, b3), 'Buy pack  ·  ', 'strong', s3, WHITE)
    tx += paste_coin(im, tx, b3 - 15, 48) + 10
    text(d, (tx, b3), '200', 'strong', s3, WHITE)
    marks.append((31, b3 - 14))
    return im, marks, [
        'Bell removed (it suggested notifications that don\'t exist).',
        'Wood icon on the price, so "200" reads as Wood.',
        'Buy button shows the price ("Buy pack · 200"), so you know the cost when you tap.',
    ]

# ============================== PACK SUMMARY ==============================
def summary():
    im = load('03-buy-and-open/takeScreenshot/03-summary.png'); d = ImageDraw.Draw(im); marks = []
    canvas = im.getpixel((30, 2450))
    refresh = im.crop((396, 2423, 461, 2477))
    rmask = Image.eval(refresh.convert('L'), lambda v: max(0, min(255, (v - 175) * 3)))
    s, x, b = fit(im, 'Open another · 200', 'strong', (481, 2436, 876, 2475), [40, 41, 42, 43, 44], WHITE)
    d.rectangle((60, 2366, 1220, 2534), fill=canvas)
    # secondary: white with a green outline; "Add to my city" below stays the one filled button
    d.rounded_rectangle((72, 2376, 1207, 2522), 52, fill=WHITE, outline=PRIMARY, width=5)
    f = font('strong', s)
    label = 'Open another  ·  '
    total = refresh.size[0] + 18 + d.textlength(label, font=f) + 46 + 10 + d.textlength('200', font=f)
    left = (72 + 1207) / 2 - total / 2
    im.paste(Image.new('RGB', refresh.size, PDARK), (round(left), 2423), rmask)
    tx = left + refresh.size[0] + 18
    tx += text(d, (tx, b), label, 'strong', s, PDARK)
    tx += paste_coin(im, tx, b - 15, 46) + 10
    text(d, (tx, b), '200', 'strong', s, PDARK)
    marks.append((31, 2449))
    return im, marks, [
        '"Add to my city" is the only filled button; "Open another" becomes a secondary outline button (it was a louder orange button on top).',
    ]

# ============================== SAVE PROGRESS ==============================
def save():
    src = load('07-onboarding/takeScreenshot/07-save-progress.png')
    im = src.copy(); d = ImageDraw.Draw(im); marks = []
    email = src.crop((60, 2030, 1220, 2178))
    signin = src.crop((300, 2214, 980, 2266))
    s, x, b = fit(src, 'You can save your progress anytime from Profile.', 'body', (273, 2312, 1003, 2343), [30, 31, 31.5, 32, 33], MUTED)
    d.rectangle((0, 1700, 1280, 2760), fill=WHITE)
    im.paste(email, (60, 1718))
    im.paste(signin, (300, 1902))
    text(d, (640, 2030), 'Apple and Google sign-in are coming soon.', 'body', s, MUTED, anchor='ms')
    text(d, (640, 2560), 'You can save your progress anytime from Profile.', 'body', s, MUTED, anchor='ms')
    text(d, (640, 2665), 'Skip for now', 'strong', 42, SOFT, anchor='ms')
    marks += [(31, 1790), (31, 2018), (31, 2652)]
    return im, marks, [
        'Email is the one main button, moved up to where the disabled Apple/Google rows were.',
        'The two "Soon" rows collapse into one quiet line.',
        '"Skip for now" becomes a text button, so it no longer competes with email as a second big green button.',
    ]

# ============================== boards ==============================
SCREENS = [
    ('home', 'Home (first visit)', home),
    ('name', 'Onboarding: name', name),
    ('save', 'Onboarding: keep your city safe', save),
    ('shop', 'Shop', shop),
    ('set-detail', 'Set detail', setdetail),
    ('pack-summary', 'Pack summary', summary),
]
BG, PANEL = (236, 243, 240), (255, 255, 255)

def wrap(d, s, f, maxw):
    words, lines, cur = s.split(), [], ''
    for w in words:
        t = (cur + ' ' + w).strip()
        if d.textlength(t, font=f) <= maxw:
            cur = t
        else:
            lines.append(cur); cur = w
    return lines + [cur]

def board(key, title, before, after, marks, notes):
    sc = 0.5
    bw, bh = round(1280 * sc), round(2856 * sc)
    a = after.copy(); ad = ImageDraw.Draw(a)
    for i, (x, y) in enumerate(marks, 1):
        marker(ad, x, y, i)
    pad, gap, head = 56, 40, 150
    side = 560
    Wd = pad * 2 + bw * 2 + gap * 2 + side
    Ht = head + bh + pad
    out = Image.new('RGB', (Wd, Ht), BG)
    d = ImageDraw.Draw(out)
    d.text((pad, 62), title, font=font('heavy', 46), fill=INK, anchor='ls')
    d.text((pad, 108), 'Stridewood · Phase 0 mockup', font=font('body', 26), fill=SOFT, anchor='ls')
    for i, (img, lab) in enumerate([(before, 'Before'), (a, 'After')]):
        x = pad + i * (bw + gap)
        sm = img.resize((bw, bh), Image.LANCZOS)
        out.paste(sm, (x, head), round_mask((bw, bh), 34))
        d.rounded_rectangle((x + 18, head + 18, x + 18 + (130 if i else 150), head + 66), 24,
                            fill=(PRIMARY if i else INK))
        d.text((x + 18 + (65 if i else 75), head + 43), lab, font=font('strong', 26), fill=WHITE, anchor='mm')
    nx = pad + 2 * (bw + gap)
    d.rounded_rectangle((nx, head, nx + side, head + bh), 34, fill=PANEL)
    d.text((nx + 36, head + 70), 'What changed', font=font('heavy', 34), fill=INK, anchor='ls')
    y = head + 130
    fb = font('body', 25)
    for i, n in enumerate(notes, 1):
        d.ellipse((nx + 36, y - 30, nx + 80, y + 14), fill=ACCENT)
        d.text((nx + 58, y - 7), str(i), font=font('heavy', 24), fill=WHITE, anchor='mm')
        for j, line in enumerate(wrap(d, n, fb, side - 140)):
            d.text((nx + 100, y + j * 38), line, font=fb, fill=INK, anchor='ls')
        y += 38 * len(wrap(d, n, fb, side - 140)) + 40
    out.save(OUT + f'{key}.png', optimize=True)
    return a

os.makedirs(OUT, exist_ok=True)
afters = []
for key, title, fn in SCREENS:
    before = {
        'home': '00-reset/takeScreenshot/00-home-fresh.png',
        'name': '07-onboarding/takeScreenshot/07-name.png',
        'save': '07-onboarding/takeScreenshot/07-save-progress.png',
        'shop': '01-tabs/takeScreenshot/01-shop.png',
        'set-detail': '03-buy-and-open/takeScreenshot/03-set-detail.png',
        'pack-summary': '03-buy-and-open/takeScreenshot/03-summary.png',
    }[key]
    im, marks, notes = fn()
    im.save(OUT + f'clean-{key}.png')
    afters.append((title, board(key, title, load(before), im, marks, notes)))

# overview: all six "after" screens
sc = 0.34
bw, bh = round(1280 * sc), round(2856 * sc)
pad, gap, head, lab = 56, 36, 150, 60
ov = Image.new('RGB', (pad * 2 + bw * 3 + gap * 2, head + (bh + lab + gap) * 2 + pad - gap), BG)
d = ImageDraw.Draw(ov)
d.text((pad, 70), 'Stridewood · Phase 0 after fixes', font=font('heavy', 46), fill=INK, anchor='ls')
d.text((pad, 114), 'Copy fixes, dead bells removed, clearer main buttons. Orange dots mark each change.', font=font('body', 26), fill=SOFT, anchor='ls')
for i, (title, a) in enumerate(afters):
    cx = pad + (i % 3) * (bw + gap)
    cy = head + (i // 3) * (bh + lab + gap)
    d.text((cx, cy + 36), title, font=font('strong', 28), fill=INK, anchor='ls')
    ov.paste(a.resize((bw, bh), Image.LANCZOS), (cx, cy + lab), round_mask((bw, bh), 26))
ov.save(OUT + '00-overview.png', optimize=True)
print('done')
