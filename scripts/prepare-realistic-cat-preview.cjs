// Build an offline asset review page. Does not change the app's default model.
const fs = require('node:fs');
const path = require('node:path');
const app = path.resolve(__dirname, '..');
const source = path.join(app, 'assets/avatar/realistic');
const target = path.join(app, 'dist/web/research');
const three = path.resolve(path.dirname(require.resolve('three')), '..');
function copy(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}
copy(path.join(source, 'review.html'), path.join(target, 'index.html'));
copy(path.join(source, 'bicolor-cat.glb'), path.join(target, 'bicolor-cat.glb'));
for (const name of ['three.module.js', 'three.core.js']) {
  copy(path.join(three, 'build', name), path.join(target, 'vendor', name));
}
for (const name of ['loaders/GLTFLoader.js', 'utils/BufferGeometryUtils.js', 'controls/OrbitControls.js']) {
  copy(path.join(three, 'examples/jsm', name), path.join(target, 'vendor/addons', name));
}
