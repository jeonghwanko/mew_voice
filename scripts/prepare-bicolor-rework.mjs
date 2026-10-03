import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url),app=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),source=path.join(app,'assets/avatar/realistic/rework'),dest=path.join(app,'dist/web/cat-rework'),three=path.resolve(path.dirname(require.resolve('three')),'..');
async function copy(a,b){await fs.mkdir(path.dirname(b),{recursive:true});await fs.copyFile(a,b);}
await fs.mkdir(dest,{recursive:true});
const entries={original:path.join(source,'../bicolor-cat.glb'),face:path.join(source,'bicolor-a-v13.glb')};
const manifest={};for(const[id,file]of Object.entries(entries)){const bytes=await fs.readFile(file),sha256=createHash('sha256').update(bytes).digest('hex'),name=`${id}-${sha256.slice(0,12)}.glb`;await fs.writeFile(path.join(dest,name),bytes);manifest[id]={file:name,sha256,bytes:bytes.length};}
await fs.writeFile(path.join(dest,'models.json'),JSON.stringify(manifest,null,2));
const js=await fs.readFile(path.join(source,'review.js')),jsName=`review-${createHash('sha256').update(js).digest('hex').slice(0,12)}.js`;await fs.writeFile(path.join(dest,jsName),js);
let html=(await fs.readFile(path.join(source,'review.html'),'utf8')).replace('src="review.js"',`src="${jsName}"`);
if(!entries.seated)html=html.replace('>앉은 자세</button>','>앉은 자세 · 작업 중</button>');
await fs.writeFile(path.join(dest,'index.html'),html);await copy(path.join(app,'assets/avatar/concepts/v1/a-model-input.png'),path.join(dest,'a-model-input.png'));
for(const file of ['three.module.js','three.core.js'])await copy(path.join(three,'build',file),path.join(dest,'vendor',file));
for(const file of ['loaders/GLTFLoader.js','controls/OrbitControls.js','environments/RoomEnvironment.js','utils/BufferGeometryUtils.js'])await copy(path.join(three,'examples/jsm',file),path.join(dest,'vendor',file));
// Legacy local preview addresses now point to the selected Bicolor workstream.
const old=path.join(app,'dist/web/cat-foundation/index.html');try{const previous=await fs.readFile(old,'utf8');if(!previous.includes('data-bicolor-alias'))await fs.writeFile(path.join(path.dirname(old),'archive.html'),previous);await fs.writeFile(old,'<!doctype html><html lang="ko" data-bicolor-alias><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=/cat-rework/index.html"><title>Bicolor 작업본으로 이동</title><a href="/cat-rework/index.html">최신 Bicolor 기반 작업본 보기</a></html>');}catch(e){if(e.code!=='ENOENT')throw e;}
process.stdout.write(JSON.stringify({preview:'http://localhost:8092/cat-rework/index.html',models:Object.keys(entries)})+'\n');
