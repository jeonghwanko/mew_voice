import fs from 'node:fs';
const file=process.argv[2];
const buffer=fs.readFileSync(file);
if(buffer.readUInt32LE(0)!==0x46546c67||buffer.readUInt32LE(4)!==2)throw new Error('Invalid GLB');
const size=buffer.readUInt32LE(12);
const data=JSON.parse(buffer.subarray(20,20+size).toString('utf8'));
let triangles=0,vertices=0;
for(const m of data.meshes??[])for(const p of m.primitives){
 const a=data.accessors[p.attributes.POSITION];
 if(!a.min?.every(Number.isFinite)||!a.max?.every(Number.isFinite))throw new Error('Invalid bounds');
 vertices+=a.count;triangles+=(p.indices!==undefined?data.accessors[p.indices].count:a.count)/3;
}
const report={file,bytes:buffer.length,meshes:data.meshes?.length,vertices,triangles,skins:(data.skins??[]).map(s=>({joints:s.joints.length})),animations:(data.animations??[]).map(a=>({name:a.name,channels:a.channels.length,paths:[...new Set(a.channels.map(c=>c.target.path))]})),morphTargets:(data.meshes??[]).filter(m=>m.extras?.targetNames).map(m=>({name:m.name,names:m.extras.targetNames})),materials:data.materials?.length};
process.stdout.write(JSON.stringify(report,null,2)+'\n');
