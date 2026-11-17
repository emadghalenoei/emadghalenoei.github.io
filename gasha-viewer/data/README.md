# Generated Gasha display data

These files are derived from the read-only scientific inputs in `D:\Python_Projects\geophysical_inversion\Projects\Gasha`. Regenerate them with `../tools/build_data.py`; do not hand-edit the arrays.

`project.json` records axes and model shape. `observed-*.json` and `predicted-*.json` contain 32 × 32 field grids. `model-*.bin` and `uncertainty-*.bin` contain little-endian `float32` values in `(z, y, x)` C order. The density uncertainty binary contains `1 −` class probability. The PMD uncertainty binary contains posterior standard deviation.

These display values are downloadable by anyone once the GitHub Pages repository is published. They do not inherit Cloudflare tunnel email restrictions.
