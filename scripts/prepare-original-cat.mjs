import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { createCat } from '../assets/avatar/original/cat.mjs';

const require=createRequire(import.meta.url);
const app=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=path.join(app,'assets/avatar/original');
const target=path.join(app,'dist/web/original-cat');
const three=path.resolve(path.dirname(require.resolve('three')),'..');
// GLTFExporter requires FileReader for its binary Blob; no browser or textures needed.
globalThis.FileReader=class {
  readAsArrayBuffer(blob){blob.arrayBuffer().then(value=>{this.result=value;this.onloadend?.();}).catch(error=>this.onerror?.(error));}
};
const {root,animate}=createCat();
animate(0,false);
const binary=await new GLTFExporter().parseAsync(root,{binary:true});
await fs.writeFile(path.join(source,'cat-study-01.glb'),Buffer.from(binary));
async function copy(from,to){await fs.mkdir(path.dirname(to),{recursive:true});await fs.copyFile(from,to);}
for(const [from,to] of [['review.html','index.html'],['cat.mjs','cat.js'],['sculpt.mjs','sculpt.js'],['cat-study-01.glb','cat-study-01.glb']])await copy(path.join(source,from),path.join(target,to));
const browserSource=await fs.readFile(path.join(target,'cat.js'),'utf8');
await fs.writeFile(path.join(target,'cat.js'),browserSource.replace("'./sculpt.mjs'","'./sculpt.js'"));
for(const name of ['three.module.js','three.core.js'])await copy(path.join(three,'build',name),path.join(target,'vendor',name));
await copy(path.join(three,'examples/jsm/controls/OrbitControls.js'),path.join(target,'vendor/OrbitControls.js'));
let triangles=0,meshes=0;
root.traverse(node=>{if(node.isMesh){meshes++;triangles+=(node.geometry.index?.count??node.geometry.attributes.position.count)/3;}});
process.stdout.write(JSON.stringify({bytes:binary.byteLength,meshes,triangles,path:target})+'\n');
