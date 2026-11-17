# Emad Ghaleh Noei — portfolio site

This repository is a static site served by GitHub Pages. The root `index.html` opens the Gasha viewer at `gasha-viewer/`. The portfolio is available at `portfolio.html`; `Project*.html` contains project descriptions, `assets/` holds the portfolio theme, and `images/` holds project artwork.

## Gasha geophysical viewer

The interactive viewer lives in [`gasha-viewer/`](gasha-viewer/README.md) and opens from the site's root URL. Its HTML, CSS, JavaScript, Plotly runtime, and browser-ready data are self-contained. It does not need Flask, Python, a local tunnel, or a running computer to serve after publication.

The original scientific files remain in the separate `geophysical_inversion/Projects/Gasha/` workspace. `gasha-viewer/data/` contains derived display arrays generated from those files. These arrays are public and downloadable when published. The owner approved public access to the viewer and data. GitHub Pages does not use the previous Cloudflare email allowlist.

## Preview locally

From this repository's root:

```powershell
python -m http.server 8765
```

Open <http://127.0.0.1:8765/> for the viewer or <http://127.0.0.1:8765/portfolio.html> for the portfolio. Use an HTTP server because browsers normally block `fetch()` for local `file://` pages.

To regenerate Gasha data after changing the source files, follow [the viewer build instructions](gasha-viewer/README.md). No build step is needed for ordinary portfolio HTML edits.
