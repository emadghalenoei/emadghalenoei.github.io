# Subsurface Model build and check tools

Run these from the repository root. The exact commands and scientific conventions are in the [viewer README](../README.md).

| Tool | Purpose |
| --- | --- |
| `source_data.py` | Reads the separate scientific input folder and reconstructs axes, grids, models, and uncertainty for export. This is the online build's local copy of the required loader logic. |
| `build_data.py` | Writes browser-ready JSON and binary files to `../data/` without changing scientific inputs. |
| `build_preview.py` | Writes `../../images/subsurface-model-preview.png` from exported display data. |
| `check_data.mjs` | Checks field grids, slices, uncertainty, and 3D mesh indices. |
| `check_ui.mjs` | Exercises startup, switching, and click-to-slice behavior without a browser dependency. |
| `requirements.txt` | Python packages needed only to regenerate data and the preview. |

The source project folder name remains `D:\Python_Projects\geophysical_inversion\Projects\Gasha`; keep its files read-only. Do not hand-edit the generated arrays. Their format and publication boundary are documented in [`../data/README.md`](../data/README.md).
