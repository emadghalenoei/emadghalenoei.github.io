"""Build browser-ready subsurface display data without changing scientific inputs."""

import argparse
import json
from pathlib import Path

import numpy as np
from source_data import ProjectData


def write_json(path, value):
    path.write_text(json.dumps(value, separators=(",", ":"), allow_nan=False), encoding="utf-8")


def write_volume(path, values):
    if not np.isfinite(values).all():
        raise ValueError(f"Non-finite values in {path.name}")
    np.asarray(values, dtype="<f4", order="C").tofile(path)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True,
                        help="path to the read-only scientific project folder")
    args = parser.parse_args()

    source = args.source.resolve()
    if not (source / "input_config.yaml").is_file():
        parser.error(f"No input_config.yaml found under {source}")
    project = ProjectData(source)
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
