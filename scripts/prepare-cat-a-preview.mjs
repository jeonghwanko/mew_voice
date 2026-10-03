import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const app=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=path.join(app,'assets/avatar/blender');
const dest=path.join(app,'dist/web/cat-a');
const three=path.resolve(path.dirname(require.resolve('three')),'..');
async function copy(from,to){await fs.mkdir(path.dirname(to),{recursive:true});await fs.copyFile(from,to);}
for(const file of ['review.html','review.js','cat-a-study-v3.glb','cat-a-study-v4.glb'])await copy(path.join(source,file),path.join(dest,file==='review.html'?'index.html':file));
await copy(path.join(app,'assets/avatar/concepts/v1/a-model-input.png'),path.join(dest,'a-model-input.png'));
for(const file of ['three.module.js','three.core.js'])await copy(path.join(three,'build',file),path.join(dest,'vendor',file));
for(const file of ['controls/OrbitControls.js','loaders/GLTFLoader.js','loaders/DRACOLoader.js','utils/BufferGeometryUtils.js','libs/draco/gltf/draco_wasm_wrapper.js','libs/draco/gltf/draco_decoder.wasm','libs/draco/gltf/draco_decoder.js'])await copy(path.join(three,'examples/jsm',file),path.join(dest,'vendor',file));
process.stdout.write(JSON.stringify({preview:'http://localhost:8092/cat-a/index.html',dest})+'\n');
