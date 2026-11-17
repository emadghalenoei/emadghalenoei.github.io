import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve, dirname} from 'node:path';
import {createContext, runInContext} from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const controls = new Map();
const plots = new Map();
const initial = {
  'data-kind': 'gravity', 'model-kind': 'density', 'model-view': 'surface',
  threshold: '0', 'slice-axis': 'z', 'slice-position': '32'
};
const element = (id) => {
  if (!controls.has(id)) controls.set(id, {
    value: initial[id] ?? '', textContent: '', hidden: true,
    addEventListener() {}, on() {}
  });
  return controls.get(id);
};
const context = createContext({
  document: {getElementById: element},
  console,
  setTimeout,
  clearTimeout,
  fetch: async (url) => {
    const path = resolve(root, url.replace(/^\.\//, ''));
    const bytes = readFileSync(path);
    return {
      ok: true,
      json: async () => JSON.parse(bytes.toString('utf8')),
      arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
    };
  },
  Plotly: {react: async (id, traces, layout) => plots.set(id, {traces, layout})}
});
runInContext(readFileSync(resolve(root, 'data-client.js'), 'utf8'), context);
const app = readFileSync(resolve(root, 'app.js'), 'utf8')
  .replace('start().catch(fail);', 'globalThis.startPromise = start().catch(fail);');
runInContext(app + '\nglobalThis.viewer = {showData, showModel, showSections, selectSliceAt};', context);
await context.startPromise;
assert.equal(element('error').hidden, true);
assert.equal(element('observed-title').textContent, 'Observed gravity');
assert.equal(element('prediction-source').textContent, 'Random Forest · mGal');
assert.ok(plots.get('model-plot').traces.length > 0);
assert.ok(plots.get('slice-plot').traces.length > 0);
assert.ok(plots.get('uncertainty-plot').traces.length > 0);

element('data-kind').value = 'rtp';
element('model-kind').value = 'pmd';
await Promise.all([context.viewer.showData(), context.viewer.showModel(), context.viewer.showSections()]);
assert.equal(element('observed-title').textContent, 'Observed RTP magnetic');
assert.equal(element('predicted-title').textContent, 'Predicted RTP magnetic');
assert.equal(element('prediction-source').textContent, 'Bayesian PMD · nT');
const predicted = JSON.parse(readFileSync(resolve(root, 'data/predicted-rtp-pmd.json'), 'utf8'));
assert.equal(plots.get('prediction-plot').traces[0].z[0][0], predicted.values[0][0]);
assert.ok(plots.get('model-plot').traces.length > 0);

const axes = JSON.parse(readFileSync(resolve(root, 'data/project.json'), 'utf8')).axes;
context.viewer.selectSliceAt({z: axes.z[20]});
assert.equal(Number(element('slice-position').value), 20);
await context.viewer.showSections();
assert.ok(element('slice-coordinate').textContent.includes('cell 21 of 64'));
console.log('Static viewer startup, field/model switching, and 3D slice selection checks passed.');
