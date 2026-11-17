# Generated Subsurface Model display data

These files are derived from the read-only scientific inputs in `D:\Python_Projects\geophysical_inversion\Projects\Gasha`. Rebuild them with [`../tools/build_data.py`](../tools/build_data.py); do not hand-edit arrays. The source folder name is a legacy scientific identifier, while the public project name is **Subsurface Model**.

`project.json` records the public label, axes in kilometers, and model shape. `observed-*.json` and `predicted-*.json` contain 32 × 32 field grids. `model-*.bin` and `uncertainty-*.bin` contain little-endian `float32` values in `(z, y, x)` C order, with X varying fastest. Northing runs north-to-south; depth is positive downward. Density uncertainty is `1 −` class probability; PMD uncertainty is posterior standard deviation.

These display values are downloadable by anyone once GitHub Pages publishes the repository. They do not inherit the former Cloudflare tunnel's email restrictions.
