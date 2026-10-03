import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const base=path.resolve('.'),source=path.join(base,'assets/avatar/realistic/rework'),dest=path.join(base,'dist/web/cat-motion');
await fs.mkdir(dest,{recursive:true});
await fs.cp(path.join(base,'dist/web/cat-rework/vendor'),path.join(dest,'vendor'),{recursive:true});
await fs.copyFile(path.join(base,'assets/avatar/concepts/v1/a-model-input.png'),path.join(dest,'a-model-input.png'));
const manifest={};
for(const[id,name]of Object.entries({face:'bicolor-v13-motion-preview.glb',original:'bicolor-v13-motion-before-paw-forward.glb'})){
 const data=await fs.readFile(path.join(source,name)),sha256=createHash('sha256').update(data).digest('hex'),file=`${id}-${sha256.slice(0,12)}.glb`;
 await fs.writeFile(path.join(dest,file),data);manifest[id]={file,sha256,bytes:data.length};
}
await fs.writeFile(path.join(dest,'models.json'),JSON.stringify(manifest));
const js=await fs.readFile(path.join(source,'motion-review.js')),name=`motion-${createHash('sha256').update(js).digest('hex').slice(0,12)}.js`;
await fs.writeFile(path.join(dest,name),js);
await fs.writeFile(path.join(dest,'index.html'),(await fs.readFile(path.join(source,'motion-review.html'),'utf8')).replace('src="motion-review.js"',`src="${name}"`).replace('원본 Bicolor</button>','수정 전 앉기</button>'));
process.stdout.write('http://localhost:8092/cat-motion/index.html\n');
