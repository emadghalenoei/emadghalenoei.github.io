# Gasha geophysical viewer

This is the static, browser-only version of the Gasha viewer. It shows observed and predicted gravity and RTP magnetic fields, interactive 3D Random Forest and Bayesian PMD model surfaces or points, synchronized 2D model and uncertainty sections, and the salt/sediment/basement color interpretation. It does not run inversion or training.

## Files

| Path | Purpose |
| --- | --- |
| `index.html`, `style.css`, `app.js` | Page layout, styling, and interactive plots. |
| `data-client.js` | Loads static files and computes point subsets, voxel boundary meshes, and slices in the browser. |
| `plotly.min.js` | Bundled Plotly runtime. |
| `data/` | Generated display arrays; see [data/README.md](data/README.md). |
| `tools/build_data.py` | Rebuilds browser data from the original local visualization workspace. |
| `tools/build_preview.py` | Rebuilds the portfolio preview image from exported data. |
| `tools/check_data.mjs` | Verifies field grids, slices, uncertainty, and 3D mesh indices. |
| `tools/check_ui.mjs` | Exercises startup, model and field switching, and click-to-slice logic without a browser dependency. |

## Build and check

From the `emadghalenoei.github.io` repository root, with the original `geophysical_inversion` workspace available:

```powershell
D:\Python_Projects\geophysical_inversion\.venv\Scripts\python.exe gasha-viewer\tools\build_data.py --source D:\Python_Projects\geophysical_inversion
D:\Python_Projects\geophysical_inversion\.venv\Scripts\python.exe gasha-viewer\tools\build_preview.py
node gasha-viewer\tools\check_data.mjs
node gasha-viewer\tools\check_ui.mjs
python -m http.server 8765
```

Then open <http://127.0.0.1:8765/gasha-viewer/>. `build_data.py` imports the existing `viewer.data.ProjectData` loader, so coordinate reconstruction follows its documented rules. It only reads the source files and writes generated files in this project.

The preview image script uses Pillow. Install it in the Python environment if it is missing; the browser viewer itself needs no Python packages.

## Scientific conventions

- Model and uncertainty binaries are little-endian `float32` arrays in `(z, y, x)` C order, with X varying fastest.
- `project.json` contains center axes in kilometers. X increases eastward, Y runs north-to-south, and Z is depth positive downward.
- The 2D field grids use the gravity-derived 32 × 32 survey axes. Gravity is in mGal and RTP magnetic in nT. The observed and predicted maps use a shared color range for the selected field.
- Random Forest density values are −0.13 for salt, 0 for sediments, and +0.4 for basement rock. Bayesian PMD values are continuous density contrasts; the same color names are geological interpretations rather than discrete classes.
- Random Forest uncertainty is `1 −` maximum class probability. Bayesian uncertainty is posterior standard deviation. They are separate measures with separate color ranges.
- The browser generates exposed voxel-face meshes for the 3D solid view. This follows the same voxel boundaries as the former local viewer, though the faces are flat rather than its marching-cubes triangles. The threshold and selected slice remain interactive.

## Publication boundary

This folder is intended for a static host such as GitHub Pages. A published site exposes every file in `data/` to visitors. The previous localhost viewer's Cloudflare email sign-in does not protect this version. The original source files are not copied here. Review the display data and intended audience before pushing this repository.
