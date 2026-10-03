// Rebuild the CC0 Quaternius cat as texture-free, editable PBR materials.
// Run from the repo root: node apps/mobile/scripts/prepare-cat.cjs
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { PNG } = require('pngjs');
const dir = path.join(__dirname, '../assets/avatar');
const source = fs.readFileSync(path.join(dir, 'quaternius-cat.glb'));
const jsonLength = source.readUInt32LE(12);
const gltf = JSON.parse(source.subarray(20, 20 + jsonLength));
const original = source.subarray(28 + jsonLength);
const chunks = [original]; let byteLength = original.length;
function append(data, type, count, componentType = 5123) {
  const pad = (4 - byteLength % 4) % 4; chunks.push(Buffer.alloc(pad)); byteLength += pad;
  const view = gltf.bufferViews.push({ buffer: 0, byteOffset: byteLength, byteLength: data.length }) - 1;
  chunks.push(data); byteLength += data.length;
  return gltf.accessors.push({ bufferView: view, componentType, count, type }) - 1;
}
function values(id, width, bytes, method) {
  const a = gltf.accessors[id], v = gltf.bufferViews[a.bufferView];
  return Array.from({ length: a.count }, (_, i) => Array.from({ length: width }, (_, k) => original[method]((v.byteOffset || 0) + (a.byteOffset || 0) + i * (v.byteStride || width * bytes) + k * bytes)));
}
const primitive = gltf.meshes[0].primitives[0];
const uv = values(primitive.attributes.TEXCOORD_0, 2, 4, 'readFloatLE');
const positions = values(primitive.attributes.POSITION, 3, 4, 'readFloatLE');
const indices = values(primitive.indices, 1, 2, 'readUInt16LE').flat();
const imageView = gltf.bufferViews[gltf.images[0].bufferView];
const atlas = PNG.sync.read(original.subarray(imageView.byteOffset, imageView.byteOffset + imageView.byteLength));
const groups = [[], [], [], []];
for (let i = 0; i < indices.length; i += 3) {
  const [u, v] = uv[indices[i]];
  const red = atlas.data[(Math.min(atlas.height - 1, Math.floor(v * atlas.height)) * atlas.width + Math.min(atlas.width - 1, Math.floor(u * atlas.width))) * 4];
  const material = ({ 104: 0, 159: 1, 207: 2, 52: 3 })[red];
  if (material === undefined) throw new Error('Source palette changed');
  groups[material].push(...indices.slice(i, i + 3));
}
const names = ['Fur', 'Muzzle', 'Nose', 'Iris', 'Pupil'];
const colors = [[0.82,0.72,0.57,1],[0.96,0.9,0.79,1],[0.55,0.26,0.23,1],[0.28,0.39,0.19,1],[0.025,0.035,0.026,1]];
gltf.materials = names.map((name,i) => ({ name, pbrMetallicRoughness: { baseColorFactor: colors[i], roughnessFactor: i >= 3 ? 0.3 : 0.87, metallicFactor: 0 } }));
const attributes = { ...primitive.attributes }; delete attributes.TEXCOORD_0; delete attributes.COLOR_0;
const writeIndices = list => { const b = Buffer.alloc(list.length * 2); list.forEach((n,i) => b.writeUInt16LE(n,i*2)); return append(b,'SCALAR',list.length); };
gltf.meshes[0].primitives = groups.map((list,material) => ({ attributes, indices: writeIndices(list), material, mode: 4 }));
// Inset pupils share the original skin weights and follow the existing head rig.
const pupilPositions = positions.map(p => [...p]);
for (const side of [-1,1]) {
  const eyeVertices = [...new Set(groups[3])].filter(i => Math.sign(positions[i][0]) === side);
  const center = [0,1,2].map(axis => eyeVertices.reduce((sum,i) => sum + positions[i][axis],0) / eyeVertices.length);
  for (const i of eyeVertices) pupilPositions[i] = [center[0]+(positions[i][0]-center[0])*0.43, positions[i][1]-0.000025, center[2]+(positions[i][2]-center[2])*0.8];
}
const pupilBytes = Buffer.alloc(pupilPositions.length*12);
pupilPositions.flat().forEach((v,i) => pupilBytes.writeFloatLE(v,i*4));
const pupilAccessor = append(pupilBytes,'VEC3',pupilPositions.length,5126);
gltf.accessors[pupilAccessor].min = gltf.accessors[attributes.POSITION].min;
gltf.accessors[pupilAccessor].max = gltf.accessors[attributes.POSITION].max;
gltf.meshes[0].primitives.push({ attributes:{...attributes,POSITION:pupilAccessor},indices:writeIndices(groups[3]),material:4,mode:4 });
delete gltf.images; delete gltf.textures; delete gltf.samplers;
gltf.animations.forEach(a => { a.name = a.name.split('|').pop(); });
gltf.asset.extras = { source:'https://poly.pizza/m/qKICY6xla2', author:'Quaternius', license:'CC0-1.0', originalSHA256:crypto.createHash('sha256').update(source).digest('hex'), modifications:'Texture-free named PBR materials; inset pupils; simplified animation names. Original mesh, rig and clips retained.' };
const binary = Buffer.concat(chunks); const paddedBinary=Buffer.concat([binary,Buffer.alloc((4-binary.length%4)%4)]);
gltf.buffers[0].byteLength = paddedBinary.length;
const json=Buffer.from(JSON.stringify(gltf)), paddedJson=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);
const header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(28+paddedJson.length+paddedBinary.length,8);header.writeUInt32LE(paddedJson.length,12);header.writeUInt32LE(0x4e4f534a,16);
const binaryHeader=Buffer.alloc(8);binaryHeader.writeUInt32LE(paddedBinary.length);binaryHeader.writeUInt32LE(0x004e4942,4);
fs.writeFileSync(path.join(dir,'mew-cat.glb'),Buffer.concat([header,paddedJson,binaryHeader,paddedBinary]));
process.stdout.write(`Adapted cat: ${28+paddedJson.length+paddedBinary.length} bytes; ${indices.length/3} source triangles; ${gltf.animations.length} clips\n`);
