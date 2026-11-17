# Emad Ghaleh Noei — portfolio

This is a static GitHub Pages site. [`index.html`](index.html) is the portfolio home page; [`portfolio.html`](portfolio.html) redirects older links to it. Project stories are root `Project*.html` pages. The [Subsurface Model](subsurface-model/) is one interactive project in the portfolio. The old `gasha-viewer/` URL redirects to that project without retaining a second viewer copy.

## Where to start

| Task | File or folder |
| --- | --- |
| Edit the home page, project cards, experience, or contact links | [`index.html`](index.html) |
| Edit an individual project story | The matching `Project*.html` page in the table below |
| Edit the interactive subsurface viewer | [`subsurface-model/README.md`](subsurface-model/README.md) |
| Inspect or rebuild its display data | [`subsurface-model/data/README.md`](subsurface-model/data/README.md) and [`subsurface-model/tools/README.md`](subsurface-model/tools/README.md) |
| Find portfolio styles, scripts, and resume | [`assets/README.md`](assets/README.md) |
| Find photos, screenshots, and video | [`images/README.md`](images/README.md) |

`index_org.html`, `generic.html`, and `elements.html` are older or template pages, not the current entry point. [`AGENTS.md`](AGENTS.md) contains editing constraints.

## Project page map

| Page | Topic |
| --- | --- |
| [`Project1.html`](Project1.html) | Hierarchical Voronoi classification |
| [`Project2.html`](Project2.html) | Adaptive Voronoi modeling |
| [`Project3.html`](Project3.html) | Alpha shape boundary modeling |
| [`Project4.html`](Project4.html) | Selenium browser automation |
| [`Project5.html`](Project5.html) | 3D Bayesian inversion |
| [`Project6.html`](Project6.html) | Image segmentation and detection |
| [`Project7.html`](Project7.html) | Optical flow |
| [`Project8_RF.html`](Project8_RF.html) | LiDAR classification |
| [`Project9_FlyoverMap3D.html`](Project9_FlyoverMap3D.html) | Flyover Map 3D |
| [`Project10_TensorFlow_Segmentation.html`](Project10_TensorFlow_Segmentation.html) | Infrastructure image segmentation |
| [`Project11_PointCloud_DeepLearning.html`](Project11_PointCloud_DeepLearning.html) | 3D point-cloud learning |
| [`Project12_Geospatial_ML_Pipelines.html`](Project12_Geospatial_ML_Pipelines.html) | Geospatial ML pipelines |
| [`Project13_SubsurfaceModel.html`](Project13_SubsurfaceModel.html) | Interactive Subsurface Model |

## Site structure

- `index.html` loads the portfolio theme in `assets/` and media in `images/`. Project cards link to individual stories and demos.
- `subsurface-model/` contains its own HTML, CSS, JavaScript, bundled Plotly runtime, and browser-ready data. It requires no backend or Python process after publication.
- The viewer's export tools and scientific input loader now live in `subsurface-model/tools/`. They read the separate scientific folder at `D:\Python_Projects\geophysical_inversion\Projects\Gasha`; only derived browser data is written here. The scientific inputs remain read-only.
- Keep links and asset paths relative so the site works under a GitHub Pages subpath. No build step is needed for ordinary HTML edits. Browsers use compiled CSS in `assets/css/`, not the Sass source.

## Preview and verify

From the repository root:

```powershell
python -m http.server 8765
```

Open <http://127.0.0.1:8765/> for the portfolio and <http://127.0.0.1:8765/subsurface-model/> for the viewer. The viewer uses `fetch()`, so serve the files over HTTP rather than opening them with `file://`. Follow [the viewer build instructions](subsurface-model/README.md) to regenerate display data and run its checks.

## Publication boundary

GitHub Pages makes tracked files publicly downloadable, including `subsurface-model/data/` and `assets/docs/`. The owner approved public access and download of the derived subsurface **display data**. The original scientific inputs are not in this repository. The local `my skills/` folder is excluded by `.gitignore`. Review any newly added source data or documents before publication; the former Cloudflare email allowlist does not protect GitHub Pages.
