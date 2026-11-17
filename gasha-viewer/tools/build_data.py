"""Build browser-ready Gasha data without changing the scientific inputs."""

import argparse
import json
import sys
from pathlib import Path

import numpy as np


def write_json(path, value):
    path.write_text(json.dumps(value, separators=(",", ":"), allow_nan=False), encoding="utf-8")


def write_volume(path, values):
    if not np.isfinite(values).all():
        raise ValueError(f"Non-finite values in {path.name}")
    np.asarray(values, dtype="<f4", order="C").tofile(path)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True,
                        help="path to the geophysical_inversion repository")
    args = parser.parse_args()

    source = args.source.resolve()
    if not (source / "viewer" / "data.py").is_file():
        parser.error(f"No viewer/data.py found under {source}")
    sys.path.insert(0, str(source))
    from viewer.data import ProjectData  # import the existing, documented axis rules

    project = ProjectData("Gasha")
    output = Path(__file__).resolve().parents[1] / "data"
    output.mkdir(exist_ok=True)

    write_json(output / "project.json", project.metadata())
    for field in ("gravity", "rtp"):
        write_json(output / f"observed-{field}.json", project.data_grid(field))
        for model in ("density", "pmd"):
            write_json(output / f"predicted-{field}-{model}.json",
                       project.prediction_grid(field, model))
    for model in ("density", "pmd"):
        write_volume(output / f"model-{model}.bin", project.models[model])
        write_volume(output / f"uncertainty-{model}.bin", project.uncertainties[model])

    for path in sorted(output.iterdir()):
        if path.is_file():
            print(f"{path.name}: {path.stat().st_size:,} bytes")


if __name__ == "__main__":
    main()
