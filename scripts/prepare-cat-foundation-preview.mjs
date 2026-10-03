import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url),app=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),source=path.join(app,'assets/avatar/blender'),dest=path.join(app,'dist/web/cat-foundation'),three=path.resolve(path.dirname(require.resolve('three')),'..');
async function copy(from,to){await fs.mkdir(path.dirname(to),{recursive:true});await fs.copyFile(from,to);}
for(const file of ['foundation.html','foundation.js','cat-a-foundation-v20.glb'])await copy(path.join(source,file),path.join(dest,file==='foundation.html'?'index.html':file));
const viewerCode=await fs.readFile(path.join(source,'foundation.js'));
const viewerFile=`foundation-${createHash('sha256').update(viewerCode).digest('hex').slice(0,12)}.js`;
await fs.writeFile(path.join(dest,viewerFile),viewerCode);
const viewerHtml=(await fs.readFile(path.join(source,'foundation.html'),'utf8')).replace(/src="foundation\.js[^\"]*"/,`src="${viewerFile}"`);
await fs.writeFile(path.join(dest,'index.html'),viewerHtml);
const manifest={};
for(const version of ['14','20']){
 const buffer=await fs.readFile(path.join(source,`cat-a-foundation-v${version}.glb`));
 const sha256=createHash('sha256').update(buffer).digest('hex');
 const file=`cat-a-v${version}-${sha256.slice(0,12)}.glb`;
 await fs.writeFile(path.join(dest,file),buffer);
 manifest[version]={file,sha256,bytes:buffer.length};
}
await fs.writeFile(path.join(dest,'foundation-models.json'),JSON.stringify(manifest,null,2));
await copy(path.join(app,'assets/avatar/concepts/v1/a-model-input.png'),path.join(dest,'a-model-input.png'));
for(const file of ['three.module.js','three.core.js'])await copy(path.join(three,'build',file),path.join(dest,'vendor',file));
for(const file of ['environments/RoomEnvironment.js','controls/OrbitControls.js','loaders/GLTFLoader.js','loaders/DRACOLoader.js','utils/BufferGeometryUtils.js','libs/draco/gltf/draco_wasm_wrapper.js','libs/draco/gltf/draco_decoder.wasm','libs/draco/gltf/draco_decoder.js'])await copy(path.join(three,'examples/jsm',file),path.join(dest,'vendor',file));
process.stdout.write(JSON.stringify({preview:'http://localhost:8092/cat-foundation/index.html',dest})+'\n');
