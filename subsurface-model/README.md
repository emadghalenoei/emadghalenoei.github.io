# Subsurface Model viewer

This browser-only project lets visitors compare surface gravity and magnetic measurements with two possible 3D interpretations of the ground below. Visitors can rotate the model, inspect cross sections, and see uncertainty alongside each section. The viewer displays precomputed results; it does not run inversion or training.

## Files

| Path | Purpose |
| --- | --- |
| `index.html`, `style.css`, `app.js` | Page, styling, and interactive Plotly views. |
| `data-client.js` | Loads static data and prepares point subsets, voxel surfaces, and slices in the browser. |
| `plotly.min.js` | Bundled Plotly runtime; no CDN is needed. |
| [`data/`](data/README.md) | Generated browser display data and format details. |
| [`tools/`](tools/README.md) | Local input loader, export and preview scripts, and data/UI checks. |

All runtime assets are in this folder. After publication, the viewer needs only a static file host such as GitHub Pages.

The viewer shares the portfolio's dark technology palette through `style.css`. Its map and model colors, plot labels, and plotting axes are set in `app.js`. Keep the viewer's control IDs and relative data paths when changing its layout.

## Build and check

The source folder is `D:\Python_Projects\geophysical_inversion\Projects\Gasha`. It holds read-only scientific inputs. `tools/source_data.py` in this repository reconstructs the axes and display grids from those inputs, so building no longer imports code from the other workspace. The loader preserves the existing coordinate rules and exports a public project label of **Subsurface Model**.

From the `.io` repository root, in a Python environment with the packages in [`tools/requirements.txt`](tools/requirements.txt):

```powershell
python subsurface-model\tools\build_data.py --source D:\Python_Projects\geophysical_inversion\Projects\Gasha
python subsurface-model\tools\build_preview.py
node subsurface-model\tools\check_data.mjs
node subsurface-model\tools\check_ui.mjs
python -m http.server 8765
```

Open <http://127.0.0.1:8765/subsurface-model/>. Run the two Node checks after data or viewer code changes. `build_preview.py` uses Pillow and creates `../images/subsurface-model-preview.png`.

## Scientific conventions

- Model and uncertainty binaries are little-endian `float32` arrays in `(z, y, x)` C order, with X varying fastest.
- `data/project.json` contains cell-center axes in kilometers. X increases eastward, Y runs north-to-south, and Z is depth positive downward.
- The observed and predicted field grids use the gravity-derived 32 × 32 survey axes. Gravity is in mGal; RTP magnetic is in nT. The observed and predicted maps share a color range for each selected field.
- Random Forest density values are −0.13 for salt, 0 for sediments, and +0.4 for basement rock. Bayesian PMD values are continuous density contrasts; its matching colors are geological interpretations, not discrete classes.
- Random Forest uncertainty is `1 −` maximum class probability. Bayesian uncertainty is posterior standard deviation. They are different measures with separate color ranges.
- The browser creates exposed voxel-face meshes for the solid 3D view. Faces are flat rather than the old local viewer's marching-cubes triangles. The threshold and selected slice remain interactive.

## Publication boundary

Every file in `data/` becomes publicly accessible when this site is published. The former localhost viewer's Cloudflare email restriction does not apply. Keep the original scientific inputs in their separate read-only folder; review any new derived data before publishing.
