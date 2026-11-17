const $ = (id) => document.getElementById(id);
let project;
let modelRequest = 0;
let sliceRequest = 0;
let dataRequest = 0;
let uncertaintyRequest = 0;
let modelClickBound = false;
let hoveredModelPoint = null;
let modelPointerDown = null;
const saltColor = '#50a6ce';
const sedimentColor = '#ffffff';
const basementColor = '#e88761';
const colors = [[0, saltColor], [0.45, '#a6ccda'], [0.5, sedimentColor], [0.55, '#edbd9d'], [1, basementColor]];
const densityColors = [[0, saltColor], [0.1226, saltColor], [0.1227, sedimentColor], [0.6226, sedimentColor], [0.6227, basementColor], [1, basementColor]];
const plotConfig = {responsive: true, displaylogo: false, modeBarButtonsToRemove: ['lasso2d', 'select2d', 'toImage']};
const font = {family: 'Segoe UI, sans-serif', color: '#b7bfd7', size: 11};
const base = {paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', font, margin: {l: 48, r: 18, t: 8, b: 43}};
const axis = (title) => ({title: {text: title, standoff: 5}, color: '#aab3cf', gridcolor: '#343b59', zeroline: false, tickfont: {size: 10}});

function fail(error) { $('error').textContent = error.message || String(error); $('error').hidden = false; console.error(error); }
function fmtRange(values) { return `${Math.min(...values).toFixed(1)}–${Math.max(...values).toFixed(1)}`; }
function modelScale(kind) { return kind === 'density' ? [-0.13, 0.4] : [-0.35, 0.35]; }
function modelColors(kind) { return kind === 'density' ? densityColors : colors; }
function modelColorbar(kind, len) {
  return {thickness: 9, len, tickfont: {color: '#b7bfd7', size: 10}, outlinewidth: 0,
    ...(kind === 'density' ? {tickvals: [-0.13, 0, 0.4], ticktext: ['Salt', 'Sediments', 'Basement']} : {})};
}
function updateLegend() {
  $('legend-salt').textContent = 'Salt';
  $('legend-sediments').textContent = 'Sediments';
  $('legend-basement').textContent = 'Basement rock';
}
function nearestIndex(values, coordinate) {
  let best = 0;
  for (let i = 1; i < values.length; i++) {
    if (Math.abs(values[i] - coordinate) < Math.abs(values[best] - coordinate)) best = i;
  }
  return best;
}
function modelPoint(event) {
  const point = event.points?.[0];
  if (!point) return;
  const position = {};
  for (const axis of ['x', 'y', 'z']) {
    position[axis] = Number(point[axis] ?? point.data?.[axis]?.[point.pointNumber]);
  }
  return Object.values(position).some(Number.isFinite) ? position : null;
}
function selectSliceAt(point) {
  if (!point) return;
  const plane = $('slice-axis').value;
  if (!Number.isFinite(point[plane])) return;
  const index = nearestIndex(project.axes[plane], point[plane]);
  if (index === Number($('slice-position').value)) return;
  $('slice-position').value = index;
  showSections().catch(fail);
}
function bindModelClick() {
  const plot = $('model-plot');
  plot.on('plotly_hover', (event) => { hoveredModelPoint = modelPoint(event); });
  plot.on('plotly_unhover', () => { hoveredModelPoint = null; });
  plot.on('plotly_click', (event) => selectSliceAt(modelPoint(event) ?? hoveredModelPoint));
  plot.addEventListener('pointerdown', (event) => {
    modelPointerDown = event.button === 0 ? {x: event.clientX, y: event.clientY, point: hoveredModelPoint} : null;
  }, true);
  plot.addEventListener('pointerup', (event) => {
    if (!modelPointerDown || event.target.closest?.('.modebar')) return;
    const distance = Math.hypot(event.clientX - modelPointerDown.x, event.clientY - modelPointerDown.y);
    const point = modelPointerDown.point;
    modelPointerDown = null;
    if (distance <= 5) selectSliceAt(point ?? hoveredModelPoint);
  }, true);
  plot.addEventListener('pointerleave', () => { hoveredModelPoint = null; modelPointerDown = null; });
}

async function showModel() {
  const current = ++modelRequest;
  const kind = $('model-kind').value;
  const view = $('model-view').value;
  const threshold = Number($('threshold').value);
  $('threshold-value').textContent = threshold.toFixed(2);
  let traces;
  if (view === 'surface') {
    const mesh = await dataStore.modelSurfaces(kind, threshold);
    if (current !== modelRequest) return;
    const cells = mesh.surfaces.reduce((sum, surface) => sum + surface.cells, 0);
    $('point-count').textContent = `${cells.toLocaleString()} model cells · ${mesh.surfaces.length} surfaces`;
    traces = mesh.surfaces.map((surface) => ({
      type: 'mesh3d', x: surface.x, y: surface.y, z: surface.z,
      i: surface.i, j: surface.j, k: surface.k,
      color: surface.sign === 'positive' ? basementColor : saltColor, opacity: 0.77,
      flatshading: true, lighting: {ambient: 0.7, diffuse: 0.65, roughness: 0.55, specular: 0.12},
      hovertemplate: `${surface.sign === 'positive' ? 'Basement rock' : 'Salt'}<br>E %{x:.2f} km<br>N %{y:.2f} km<br>Depth %{z:.2f} km<extra></extra>`,
      showlegend: false
    }));
  } else {
    const points = await dataStore.modelPoints(kind, threshold, 24000);
    if (current !== modelRequest) return;
    $('point-count').textContent = `${points.shown.toLocaleString()} / ${points.total.toLocaleString()} cells shown`;
    const [cmin, cmax] = modelScale(kind);
    traces = [{type: 'scatter3d', mode: 'markers', x: points.x, y: points.y, z: points.z,
      hovertemplate: 'E %{x:.2f} km<br>N %{y:.2f} km<br>Depth %{z:.2f} km<br>Value %{marker.color:.3f}<extra></extra>',
      marker: {size: 2.1, opacity: 0.65, color: points.values, colorscale: modelColors(kind), cmin, cmax,
        colorbar: {...modelColorbar(kind, 0.57), x: 0.94}}}];
  }
  const ranges = project.axes;
  await Plotly.react('model-plot', traces, {
    ...base, margin: {l: 0, r: 0, t: 0, b: 0}, showlegend: false,
    scene: {bgcolor: 'rgba(0,0,0,0)', aspectmode: 'manual', aspectratio: {x: 1.15, y: 1, z: 0.64},
      xaxis: {...axis('Easting / km'), range: [ranges.x[0], ranges.x.at(-1)], backgroundcolor: '#171c32', showbackground: true},
      yaxis: {...axis('Northing / km'), range: [ranges.y.at(-1), ranges.y[0]], backgroundcolor: '#171c32', showbackground: true},
      zaxis: {...axis('Depth / km'), range: [ranges.z.at(-1), ranges.z[0]], backgroundcolor: '#171c32', showbackground: true},
      camera: {eye: {x: 1.45, y: -1.55, z: 0.85}}}
  }, plotConfig);
  if (!modelClickBound) {
    bindModelClick();
    modelClickBound = true;
  }
}

function fieldRange(...grids) {
  const values = grids.flatMap((grid) => grid.values.flat());
  return [Math.min(...values), Math.max(...values)];
}
function plotField(id, data, unit, range) {
  return Plotly.react(id, [{type: 'heatmap', x: data.x, y: data.y, z: data.values,
    colorscale: 'Viridis', zmin: range[0], zmax: range[1], zsmooth: false,
    hovertemplate: `E %{x:.2f} km<br>N %{y:.2f} km<br>Value %{z:.3f} ${unit}<extra></extra>`,
    colorbar: {thickness: 9, len: 0.75, tickfont: {color: '#b7bfd7', size: 10}, outlinewidth: 0}}],
    {...base, xaxis: axis('Easting / km'), yaxis: {...axis('Northing / km'), scaleanchor: 'x', scaleratio: 1}}, plotConfig);
}
async function showData() {
  const current = ++dataRequest;
  const observedKind = $('data-kind').value;
  const modelKind = $('model-kind').value;
  const [observed, predicted] = await Promise.all([
    dataStore.observed(observedKind), dataStore.predicted(observedKind, modelKind)
  ]);
  if (current !== dataRequest) return;
  const sharedRange = fieldRange(observed, predicted);
  $('observed-title').textContent = observedKind === 'gravity' ? 'Observed gravity' : 'Observed RTP magnetic';
  $('predicted-title').textContent = observedKind === 'gravity' ? 'Predicted gravity' : 'Predicted RTP magnetic';
  $('data-count').textContent = `${observed.count.toLocaleString()} samples · ${observed.x.length} × ${observed.y.length} grid`;
  $('prediction-source').textContent = `${modelKind === 'density' ? 'Random Forest' : 'Bayesian PMD'} · ${predicted.unit}`;
  $('prediction-count').textContent = `${predicted.x.length} × ${predicted.y.length} grid · ${observedKind === 'gravity' ? 'gravity' : 'RTP magnetic'} prediction`;
  await Promise.all([
    plotField('data-plot', observed, observedKind === 'gravity' ? 'mGal' : 'nT', sharedRange),
    plotField('prediction-plot', predicted, predicted.unit, sharedRange)
  ]);
}

async function showSlice() {
  const current = ++sliceRequest;
  const kind = $('model-kind').value;
  const plane = $('slice-axis').value;
  const index = Number($('slice-position').value);
  $('slice-index').textContent = index;
  const label = `${plane.toUpperCase()} = ${project.axes[plane][index].toFixed(2)} km · cell ${index + 1} of ${project.axes[plane].length}`;
  $('slice-coordinate').textContent = `${label} · loading`;
  let data;
  try {
    data = await dataStore.modelSlice(kind, plane, index);
  } catch (error) {
    if (current === sliceRequest) $('slice-coordinate').textContent = `${label} · unavailable`;
    throw error;
  }
  if (current !== sliceRequest) return;
  const [zmin, zmax] = modelScale(kind);
  await Plotly.react('slice-plot', [{type: 'heatmap', x: data.x, y: data.y, z: data.values,
    colorscale: modelColors(kind), zmin, zmax, zsmooth: false,
    hovertemplate: `${data.horizontal.toUpperCase()} %{x:.2f} km<br>${data.vertical.toUpperCase()} %{y:.2f} km<br>Value %{z:.3f}<extra></extra>`,
    colorbar: modelColorbar(kind, 0.75)}],
    {...base, xaxis: axis(`${data.horizontal.toUpperCase()} / km`), yaxis: {...axis(`${data.vertical.toUpperCase()} / km`), ...(data.vertical === 'z' ? {autorange: 'reversed'} : {})}}, plotConfig);
  if (current === sliceRequest) $('slice-coordinate').textContent = label;
}

async function showUncertainty() {
  const current = ++uncertaintyRequest;
  const kind = $('model-kind').value;
  const plane = $('slice-axis').value;
  const index = Number($('slice-position').value);
  $('uncertainty-label').textContent = kind === 'density' ? 'Random Forest · 1 − class confidence' : 'Bayesian PMD · posterior standard deviation';
  const label = `${plane.toUpperCase()} = ${project.axes[plane][index].toFixed(2)} km · same plane as model slice`;
  $('uncertainty-coordinate').textContent = `${label} · loading`;
  let data;
  try {
    data = await dataStore.uncertaintySlice(kind, plane, index);
  } catch (error) {
    if (current === uncertaintyRequest) $('uncertainty-coordinate').textContent = `${label} · unavailable`;
    throw error;
  }
  if (current !== uncertaintyRequest) return;
  await Plotly.react('uncertainty-plot', [{type: 'heatmap', x: data.x, y: data.y, z: data.values,
    colorscale: [[0, '#f7fafb'], [0.45, '#f3c77a'], [1, '#d45f4e']], zmin: data.range[0], zmax: data.range[1], zsmooth: false,
    hovertemplate: `${data.horizontal.toUpperCase()} %{x:.2f} km<br>${data.vertical.toUpperCase()} %{y:.2f} km<br>${data.measure}: %{z:.3f}<extra></extra>`,
    colorbar: {thickness: 9, len: 0.75, tickfont: {color: '#b7bfd7', size: 10}, outlinewidth: 0}}],
    {...base, xaxis: axis(`${data.horizontal.toUpperCase()} / km`), yaxis: {...axis(`${data.vertical.toUpperCase()} / km`), ...(data.vertical === 'z' ? {autorange: 'reversed'} : {})}}, plotConfig);
  if (current === uncertaintyRequest) $('uncertainty-coordinate').textContent = label;
}
function showSections() {
  $('error').hidden = true;
  return Promise.all([showSlice(), showUncertainty()]);
}

function debounce(fn, delay) { let timer; return () => {clearTimeout(timer); timer = setTimeout(() => fn().catch(fail), delay);}; }

async function start() {
  project = await dataStore.project();
  $('grid-shape').textContent = project.shape_zyx.join(' × ');
  for (const [key, id] of [['x', 'x-range'], ['y', 'y-range'], ['z', 'z-range']]) $(id).textContent = fmtRange(project.axes[key]);
  $('slice-position').max = project.axes.z.length - 1;
  $('slice-position').value = Math.floor(project.axes.z.length / 2);
  $('model-kind').addEventListener('change', () => { const pmd = $('model-kind').value === 'pmd'; $('threshold').value = pmd ? '0.05' : '0'; updateLegend(); showModel().catch(fail); showData().catch(fail); showSections().catch(fail); });
  $('model-view').addEventListener('change', () => showModel().catch(fail));
  $('threshold').addEventListener('input', debounce(showModel, 130));
  $('data-kind').addEventListener('change', () => showData().catch(fail));
  $('slice-axis').addEventListener('change', () => { const axis = $('slice-axis').value; $('slice-position').max = project.axes[axis].length - 1; $('slice-position').value = Math.floor(project.axes[axis].length / 2); showSections().catch(fail); });
  $('slice-position').addEventListener('input', debounce(showSections, 100));
  updateLegend();
  await Promise.all([showModel(), showData(), showSections()]);
}
start().catch(fail);
