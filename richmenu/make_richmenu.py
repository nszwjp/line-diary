"""リッチメニュー画像（2500x843）を作る。macOS のヒラギノフォントと Pillow が必要。

    pip install pillow
    python3 richmenu/make_richmenu.py
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

W, H = 2500, 843
BG = "#F7F6F3"
TEXT = "#37352F"
LINE = "#E3E2DE"
ACCENT = "#2F80ED"
FONT = "/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc"

img = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(img)
font = ImageFont.truetype(FONT, 110)

# 中央の区切り線
d.line([(W // 2, 120), (W // 2, H - 120)], fill=LINE, width=6)


def label(cx, text):
    d.text((cx, 600), text, font=font, fill=TEXT, anchor="mm")


# 左：テンプレ（メモ用紙）
cx, cy = W // 4, 330
d.rounded_rectangle([cx - 130, cy - 170, cx + 130, cy + 170], radius=28, outline=TEXT, width=16)
for i, y in enumerate(range(cy - 90, cy + 120, 70)):
    d.line([(cx - 75, y), (cx + (75 if i < 2 else 10), y)], fill=ACCENT if i == 0 else TEXT, width=16)
label(cx, "テンプレ")

# 右：日記を見る（開いた本）
cx, cy = W * 3 // 4, 330
d.polygon([(cx, cy - 110), (cx - 200, cy - 150), (cx - 200, cy + 130), (cx, cy + 170)], outline=TEXT, width=16)
d.polygon([(cx, cy - 110), (cx + 200, cy - 150), (cx + 200, cy + 130), (cx, cy + 170)], outline=TEXT, width=16)
d.line([(cx, cy - 110), (cx, cy + 170)], fill=TEXT, width=16)
for dy in (-50, 20):
    d.line([(cx - 150, cy + dy - 18), (cx - 50, cy + dy)], fill=ACCENT, width=14)
    d.line([(cx + 50, cy + dy), (cx + 150, cy + dy - 18)], fill=ACCENT, width=14)
label(cx, "日記を見る")

out = Path(__file__).with_name("richmenu.png")
img.save(out, optimize=True)
print(f"saved {out}")
