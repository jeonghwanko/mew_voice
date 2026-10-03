import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const app=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=path.join(app,'assets/avatar/references/anatomy'),dest=path.join(app,'dist/web/cat-references');
await fs.mkdir(dest,{recursive:true});
for(const file of ['index.html','README.md','cfa-muzzle-19.png','cfa-chin-26.png','loof-7.png','loof-8.png','loof-9.png','bicolor-front.png','bicolor-side.png','bicolor-back.png'])await fs.copyFile(path.join(source,file),path.join(dest,file));
process.stdout.write('Local reference board: http://localhost:8092/cat-references/index.html\n');
