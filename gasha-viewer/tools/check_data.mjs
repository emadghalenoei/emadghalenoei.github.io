import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve, dirname} from 'node:path';
import {createContext, runInContext} from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const context = createContext({
  fetch: async (url) => {
    const path = resolve(root, url.replace(/^\.\//, ''));
    const bytes = readFileSync(path);
    return {
      ok: true,
      json: async () => JSON.parse(bytes.toString('utf8')),
      arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
    };
  }
});
runInContext(readFileSync(resolve(root, 'data-client.js'), 'utf8') + '\nglobalThis.dataStore = dataStore;', context);
const store = context.dataStore;

const project = await store.project();
assert.deepEqual(Array.from(project.shape_zyx), [64, 64, 64]);
for (const field of ['gravity', 'rtp']) {
  const observed = await store.observed(field);
  for (const model of ['density', 'pmd']) {
    const predicted = await store.predicted(field, model);
    assert.equal(predicted.unit, field === 'gravity' ? 'mGal' : 'nT');
    assert.equal(predicted.values.length, observed.values.length);
    assert.equal(predicted.values[0].length, observed.values[0].length);
  }
}
const rfRtp = await store.predicted('rtp', 'density');
const pmdRtp = await store.predicted('rtp', 'pmd');
assert.notEqual(rfRtp.values[0][0], pmdRtp.values[0][0]);

const modelBytes = readFileSync(resolve(root, 'data/model-pmd.bin'));
const model = new Float32Array(modelBytes.buffer.slice(
  modelBytes.byteOffset, modelBytes.byteOffset + modelBytes.byteLength));
for (const axis of ['x', 'y', 'z']) {
  const index = 17;
  const section = await store.modelSlice('pmd', axis, index);
  const x = axis === 'x' ? index : 23;
  const y = axis === 'y' ? index : 31;
  const z = axis === 'z' ? index : 42;
  const row = axis === 'z' ? y : z;
  const column = axis === 'x' ? y : x;
  assert.equal(section.values[row][column], model[(z * 64 + y) * 64 + x]);
  const uncertainty = await store.uncertaintySlice('pmd', axis, index);
  assert.equal(uncertainty.values.length, 64);
  assert.ok(uncertainty.range[1] > 0);
}

for (const [kind, threshold] of [['density', 0], ['pmd', 0.05]]) {
  const result = await store.modelSurfaces(kind, threshold);
  assert.equal(result.surfaces.length, 2);
  for (const surface of result.surfaces) {
    assert.ok(surface.cells > 0);
    assert.equal(surface.i.length, surface.j.length);
    assert.equal(surface.i.length, surface.k.length);
    assert.ok(surface.i.every((id) => id >= 0 && id < surface.x.length));
    assert.ok(surface.j.every((id) => id >= 0 && id < surface.x.length));
    assert.ok(surface.k.every((id) => id >= 0 && id < surface.x.length));
    console.log(`${kind} ${surface.sign}: ${surface.cells} cells, ${surface.i.length} triangles`);
  }
}
console.log('Static field, volume, slice, uncertainty, and mesh data checks passed.');
