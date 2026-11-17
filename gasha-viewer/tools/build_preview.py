"""Render a portfolio preview from the exported, read-only Gasha data."""

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
SITE = ROOT.parent
BACKGROUND = "#081923"
PANEL = "#102633"
TEXT = "#e8f4f7"
MUTED = "#a7bdc6"


def load_json(name):
    return json.loads((DATA / name).read_text(encoding="utf-8"))


def font(size, bold=False):
    name = "arialbd.ttf" if bold else "arial.ttf"
    return ImageFont.truetype(str(Path("C:/Windows/Fonts") / name), size)


def colorize(values, low, high, stops):
    position = np.clip((values - low) / (high - low), 0, 1)
    channels = []
    stop_positions = np.linspace(0, 1, len(stops))
    for channel in range(3):
        channels.append(np.interp(position, stop_positions, [color[channel] for color in stops]))
    return Image.fromarray(np.stack(channels, axis=-1).astype(np.uint8), "RGB")


def main():
    project = load_json("project.json")
    observed = np.asarray(load_json("observed-gravity.json")["values"])
    model = np.fromfile(DATA / "model-pmd.bin", dtype="<f4").reshape(project["shape_zyx"])
    section = model[:, 42, :]

    image = Image.new("RGB", (1200, 600), BACKGROUND)
    draw = ImageDraw.Draw(image)
    draw.text((48, 30), "GASHA  /  GEOPHYSICAL VIEWER", fill="#64d1ca", font=font(34, True))
    draw.text((48, 82), "Observed fields and subsurface models in one interactive view", fill=MUTED, font=font(18))
    panels = [(48, 140, 576, 552), (624, 140, 1152, 552)]
    for box in panels:
        draw.rounded_rectangle(box, radius=12, fill=PANEL, outline="#315263", width=2)
    draw.text((73, 163), "OBSERVED GRAVITY", fill=TEXT, font=font(19, True))
    draw.text((649, 163), "BAYESIAN MODEL SECTION", fill=TEXT, font=font(19, True))

    field_colors = [(68, 1, 84), (59, 82, 139), (33, 145, 140), (94, 201, 98), (253, 231, 37)]
    field = colorize(observed, float(observed.min()), float(observed.max()), field_colors)
    field = field.resize((430, 300), Image.Resampling.NEAREST)
    image.paste(field, (73, 207))

    section_colors = [(80, 166, 206), (255, 255, 255), (232, 135, 97)]
    model_image = colorize(section, -0.35, 0.35, section_colors)
    model_image = model_image.resize((430, 300), Image.Resampling.NEAREST)
    image.paste(model_image, (649, 207))

    for x, stops in ((511, field_colors), (1087, section_colors)):
        for row in range(300):
            fraction = 1 - row / 299
            index = min(int(fraction * (len(stops) - 1)), len(stops) - 2)
            local = fraction * (len(stops) - 1) - index
            rgb = tuple(round(stops[index][channel] * (1 - local) + stops[index + 1][channel] * local)
                        for channel in range(3))
            draw.line((x, 207 + row, x + 16, 207 + row), fill=rgb)
    draw.text((230, 517), "Easting / km", fill=MUTED, font=font(15))
    draw.text((810, 517), "Easting / km", fill=MUTED, font=font(15))
    draw.text((536, 365), "mGal", fill=MUTED, font=font(14))

    output = SITE / "images" / "gasha-viewer-preview.png"
    image.save(output, optimize=True)
    print(output)


if __name__ == "__main__":
    main()
