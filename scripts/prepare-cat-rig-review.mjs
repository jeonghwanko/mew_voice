import fs from 'node:fs/promises';
import path from 'node:path';
const source = path.resolve('assets/avatar/references/quadruped');
const target = path.resolve('dist/web/cat-rig-review');
await fs.mkdir(target, {recursive:true});
for (const name of ['index.html','review.js','sketchfab-viewer-1.12.1.js']) await fs.copyFile(path.join(source,name),path.join(target,name));
process.stdout.write('http://localhost:8092/cat-rig-review/index.html\n');
