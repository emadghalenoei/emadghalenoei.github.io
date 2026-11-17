"""Read scientific inputs and prepare browser display data for the static site."""

from functools import cached_property
from pathlib import Path

import numpy as np
import yaml
from scipy.interpolate import griddata


MODEL_FILES = {
    "density": "Random Forest/DensityModel_field.npy",
    "pmd": "Bayesian_PMD/PMD_g.npy",
}
PREDICTION_FILES = {
    ("gravity", "density"): "Random Forest/dg_field_prediction.npy",
    ("gravity", "pmd"): "Bayesian_PMD/PMD_data_g.npy",
    ("rtp", "density"): "Random Forest/dT_field_prediction.npy",
    ("rtp", "pmd"): "Bayesian_PMD/PMD_data_T.npy",
}
UNCERTAINTY_FILES = {
    "density": "Random Forest/DensityModel_prob.npy",
    "pmd": "Bayesian_PMD/STD_g.npy",
}
DATA_FILES = {"gravity": "gravity_data_path", "rtp": "rtp_data_path"}


class ProjectData:
    def __init__(self, source_folder):
        self.folder = Path(source_folder).resolve()
        if not (self.folder / "input_config.yaml").is_file():
            raise FileNotFoundError(f"Missing config: {self.folder / 'input_config.yaml'}")
        self.name = "Subsurface Model"

    @cached_property
    def config(self):
        with (self.folder / "input_config.yaml").open(encoding="utf-8") as handle:
            config = yaml.safe_load(handle)
        if not isinstance(config, dict):
            raise ValueError("input_config.yaml must contain a mapping")
        return config

    def _configured_file(self, key):
        path = (self.folder / self.config[key]).resolve()
        if not path.is_relative_to(self.folder.resolve()):
            raise ValueError(f"{key} must point inside the project folder")
        return path

    @cached_property
    def raw_data(self):
        result = {}
        for kind, key in DATA_FILES.items():
            values = np.loadtxt(self._configured_file(key), dtype=np.float64)
            if values.ndim != 2 or values.shape[1] != 3 or not np.isfinite(values).all():
                raise ValueError(f"{kind} data must have finite x, y, value columns")
            result[kind] = values
        return result

    @cached_property
    def axes(self):
        # These are cell centers. Match deploy_rf.py: survey bounds come from gravity,
        # y runs from north to south, and the model extends by Pad_Length.
        gravity = self.raw_data["gravity"]
        count = int(self.config["Ndatapoints"])
        nx, ny, nz = (int(self.config[key]) for key in ("CX", "CY", "CZ"))
        if min(count, nx, ny, nz) < 2:
            raise ValueError("Grid dimensions must be at least 2")
        pad = float(self.config["Pad_Length"])
        xs = np.linspace(gravity[:, 0].min(), gravity[:, 0].max(), count)
        ys = np.linspace(gravity[:, 1].max(), gravity[:, 1].min(), count)
        xmodel = np.linspace(xs.min() - pad, xs.max() + pad, nx)
        ymodel = np.linspace(ys.max() + pad, ys.min() - pad, ny)
        zmodel = np.linspace(float(self.config["Z0"]), float(self.config["ZEND"]), nz)
        return {"xs": xs, "ys": ys, "x": xmodel, "y": ymodel, "z": zmodel}

    @cached_property
    def grids(self):
        xs, ys = self.axes["xs"], self.axes["ys"]
        xx, yy = np.meshgrid(xs, ys)
        return {
            kind: griddata(data[:, :2], data[:, 2], (xx, yy), method="nearest")
            for kind, data in self.raw_data.items()
        }

    @cached_property
    def models(self):
        shape = tuple(len(self.axes[axis]) for axis in ("z", "y", "x"))
        result = {}
        for kind, relative_path in MODEL_FILES.items():
            values = np.load(self.folder / relative_path, allow_pickle=False)
            if values.size != np.prod(shape):
                raise ValueError(f"{kind} model has {values.size} values; expected {np.prod(shape)}")
            # PLOT.py uses (CZ, CY, CX) for slices; C-order flattening makes x fastest.
            result[kind] = values.reshape(shape)
        return result

    @cached_property
    def predictions(self):
        shape = (len(self.axes["ys"]), len(self.axes["xs"]))
        result = {}
        for (field, kind), relative_path in PREDICTION_FILES.items():
            values = np.load(self.folder / relative_path, allow_pickle=False)
            if values.size != np.prod(shape) or not np.isfinite(values).all():
                raise ValueError(f"{kind} predicted {field} must have {np.prod(shape)} finite values")
            result[field, kind] = values.reshape(shape)
        return result

    @cached_property
    def uncertainties(self):
        shape = self.models["density"].shape
        result = {}
        for kind, relative_path in UNCERTAINTY_FILES.items():
            values = np.load(self.folder / relative_path, allow_pickle=False)
            if values.size != np.prod(shape) or not np.isfinite(values).all():
                raise ValueError(f"{kind} uncertainty must have {np.prod(shape)} finite values")
            values = values.reshape(shape)
            if kind == "density":
                if np.any((values < 0) | (values > 1)):
                    raise ValueError("Random Forest class probability must lie between 0 and 1")
                values = 1 - values
            elif np.any(values < 0):
                raise ValueError("Bayesian standard deviation must be nonnegative")
            result[kind] = values
        return result

    def metadata(self):
        axes = self.axes
        return {
            "project": self.name,
            "units": {"horizontal": "km", "depth": "km", "gravity": "mGal", "rtp": "nT"},
            "axes": {key: (value / 1000).tolist() for key, value in axes.items()},
            "shape_zyx": list(self.models["density"].shape),
            "data_counts": {key: len(value) for key, value in self.raw_data.items()},
            "model_ranges": {
                key: [float(np.min(value)), float(np.max(value))]
                for key, value in self.models.items()
            },
        }

    def data_grid(self, kind):
        if kind not in DATA_FILES:
            raise ValueError(f"Unknown data type: {kind}")
        return {"x": (self.axes["xs"] / 1000).tolist(),
                "y": (self.axes["ys"] / 1000).tolist(),
                "values": self.grids[kind].tolist(),
                "count": len(self.raw_data[kind])}

    def prediction_grid(self, field, kind):
        if (field, kind) not in PREDICTION_FILES:
            raise ValueError(f"No {kind} prediction is available for {field}")
        return {
            "x": (self.axes["xs"] / 1000).tolist(),
            "y": (self.axes["ys"] / 1000).tolist(),
            "values": self.predictions[field, kind].astype(float).tolist(),
            "unit": "mGal" if field == "gravity" else "nT",
            "field": field,
            "model": kind,
        }

