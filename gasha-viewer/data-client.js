/* Browser-side equivalent of the former Flask read-only visualization API. */
const dataStore = (() => {
  const cache = new Map();

  function load(name, binary = false) {
    if (!cache.has(name)) {
      cache.set(name, fetch(`./data/${name}`).then((response) => {
        if (!response.ok) throw new Error(`Could not load ${name} (${response.status})`);
        return binary ? response.arrayBuffer() : response.json();
      }).then((value) => binary ? new Float32Array(value) : value));
    }
    return cache.get(name);
  }

  function volume(type, model) {
    return load(`${type}-${model}.bin`, true);
  }

  function position(flat, nx, ny) {
    const z = Math.floor(flat / (nx * ny));
    const remaining = flat - z * nx * ny;
    const y = Math.floor(remaining / nx);
    return {x: remaining - y * nx, y, z};
  }

  function edges(centers) {
    const step = centers[1] - centers[0];
    return Array.from({length: centers.length + 1}, (_, index) =>
      index === 0 ? centers[0] - step / 2 : centers[index - 1] + step / 2);
  }

  function sliceValues(values, shape, axis, index) {
    const [nz, ny, nx] = shape;
    const horizontal = axis === 'x' ? 'y' : 'x';
    const vertical = axis === 'z' ? 'y' : 'z';
    const width = horizontal === 'x' ? nx : ny;
    const height = vertical === 'y' ? ny : nz;
    const rows = Array.from({length: height}, () => Array(width));
    for (let row = 0; row < height; row++) {
      for (let column = 0; column < width; column++) {
        const x = axis === 'x' ? index : column;
        const y = axis === 'y' ? index : (axis === 'x' ? column : row);
        const z = axis === 'z' ? index : row;
        rows[row][column] = values[(z * ny + y) * nx + x];
      }
    }
    return {horizontal, vertical, values: rows};
  }

  async function section(type, model, axis, index) {
    const [project, values] = await Promise.all([load('project.json'), volume(type, model)]);
    const axes = project.axes;
    if (!['x', 'y', 'z'].includes(axis) || !Number.isInteger(index) ||
        index < 0 || index >= axes[axis].length) throw new Error('Invalid slice position');
    const plane = sliceValues(values, project.shape_zyx, axis, index);
    const result = {axis, coordinate: axes[axis][index],
      horizontal: plane.horizontal, vertical: plane.vertical,
      x: axes[plane.horizontal], y: axes[plane.vertical], values: plane.values};
    if (type === 'uncertainty') {
      let maximum = 0;
      for (const value of values) maximum = Math.max(maximum, value);
      result.range = [0, maximum];
      result.measure = model === 'density' ? '1 - class probability' : 'posterior standard deviation';
    }
    return result;
  }

  async function modelPoints(model, threshold, limit) {
    const [project, values] = await Promise.all([load('project.json'), volume('model', model)]);
    const indices = [];
    for (let index = 0; index < values.length; index++) {
      if (values[index] !== 0 && Math.abs(values[index]) >= threshold) indices.push(index);
    }
    const chosen = indices.length > limit
      ? Array.from({length: limit}, (_, index) => indices[Math.floor(index * (indices.length - 1) / (limit - 1))])
      : indices;
    const result = {x: [], y: [], z: [], values: [], total: indices.length, shown: chosen.length};
    const [nz, ny, nx] = project.shape_zyx;
    for (const flat of chosen) {
      const cell = position(flat, nx, ny);
      for (const axis of ['x', 'y', 'z']) result[axis].push(project.axes[axis][cell[axis]]);
      result.values.push(values[flat]);
    }
    return result;
  }

  async function modelSurfaces(model, threshold) {
    const [project, values] = await Promise.all([load('project.json'), volume('model', model)]);
    const [nz, ny, nx] = project.shape_zyx;
    const boundary = {x: edges(project.axes.x), y: edges(project.axes.y), z: edges(project.axes.z)};
    const surfaces = [];

    for (const sign of ['positive', 'negative']) {
      const selected = sign === 'positive'
        ? (value) => threshold === 0 ? value > 0 : value >= threshold
        : (value) => threshold === 0 ? value < 0 : value <= -threshold;
      const surface = {sign, cells: 0, x: [], y: [], z: [], i: [], j: [], k: []};
      const vertices = new Map();
      const vertex = (xb, yb, zb) => {
        const key = xb + (nx + 1) * (yb + (ny + 1) * zb);
        if (vertices.has(key)) return vertices.get(key);
        const id = surface.x.length;
        vertices.set(key, id);
        surface.x.push(boundary.x[xb]);
        surface.y.push(boundary.y[yb]);
        surface.z.push(boundary.z[zb]);
        return id;
      };
      const face = (corners) => {
        const ids = corners.map(([xb, yb, zb]) => vertex(xb, yb, zb));
        surface.i.push(ids[0], ids[0]);
        surface.j.push(ids[1], ids[2]);
        surface.k.push(ids[2], ids[3]);
      };
      for (let z = 0; z < nz; z++) {
        for (let y = 0; y < ny; y++) {
          for (let x = 0; x < nx; x++) {
            const flat = (z * ny + y) * nx + x;
            if (!selected(values[flat])) continue;
            surface.cells++;
            if (x === 0 || !selected(values[flat - 1]))
              face([[x,y,z],[x,y,z+1],[x,y+1,z+1],[x,y+1,z]]);
            if (x === nx - 1 || !selected(values[flat + 1]))
              face([[x+1,y,z],[x+1,y+1,z],[x+1,y+1,z+1],[x+1,y,z+1]]);
            if (y === 0 || !selected(values[flat - nx]))
              face([[x,y,z],[x+1,y,z],[x+1,y,z+1],[x,y,z+1]]);
            if (y === ny - 1 || !selected(values[flat + nx]))
              face([[x,y+1,z],[x,y+1,z+1],[x+1,y+1,z+1],[x+1,y+1,z]]);
            if (z === 0 || !selected(values[flat - nx * ny]))
              face([[x,y,z],[x,y+1,z],[x+1,y+1,z],[x+1,y,z]]);
            if (z === nz - 1 || !selected(values[flat + nx * ny]))
              face([[x,y,z+1],[x+1,y,z+1],[x+1,y+1,z+1],[x,y+1,z+1]]);
          }
        }
      }
      if (surface.cells) surfaces.push(surface);
    }
    return {surfaces, threshold};
  }

  return {
    project: () => load('project.json'),
    observed: (field) => load(`observed-${field}.json`),
    predicted: (field, model) => load(`predicted-${field}-${model}.json`),
    modelPoints, modelSurfaces,
    modelSlice: (model, axis, index) => section('model', model, axis, index),
    uncertaintySlice: (model, axis, index) => section('uncertainty', model, axis, index)
  };
})();
