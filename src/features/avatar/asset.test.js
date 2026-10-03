/* global test, expect, __dirname */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

test('V13 runtime asset bundles textures, a 24-bone rig and the four-second corrective motion', () => {
  const bytes = fs.readFileSync(path.join(__dirname, '../../../assets/avatar/v13-sit-stand/v13-sit-stand.glb'));
  const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
  expect(bytes.readUInt32LE(8)).toBe(bytes.length);
  expect(bytes.length).toBeLessThan(8_000_000);
  expect(gltf.images.every(image => image.bufferView !== undefined && !image.uri)).toBe(true);
  expect(gltf.buffers.every(buffer => !buffer.uri)).toBe(true);
  expect(gltf.skins.every(skin => skin.joints.length === 24)).toBe(true);
  const clip = gltf.animations.find(animation => animation.name === 'Animation');
  expect(clip.channels.some(channel => channel.target.path === 'weights')).toBe(true);
  expect(Math.max(...clip.samplers.map(sampler => gltf.accessors[sampler.input].max[0]))).toBe(4);
});

test('the bundled cat preserves source provenance, rig and editable materials without external files', () => {
  const dir = path.join(__dirname, '../../../assets/avatar');
  const bytes = fs.readFileSync(path.join(dir, 'mew-cat.glb'));
  expect(bytes.readUInt32LE(0)).toBe(0x46546c67);
  expect(bytes.readUInt32LE(8)).toBe(bytes.length);
  const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
  expect(gltf.asset.extras.license).toBe('CC0-1.0');
  expect(gltf.asset.extras.originalSHA256).toBe(crypto.createHash('sha256').update(fs.readFileSync(path.join(dir,'quaternius-cat.glb'))).digest('hex'));
  expect(gltf.animations.map(clip => clip.name)).toContain('Idle');
  expect(gltf.skins[0].joints.length).toBeGreaterThan(0);
  expect(gltf.materials.map(material => material.name)).toEqual(['Fur','Muzzle','Nose','Iris','Pupil']);
  expect(gltf.images).toBeUndefined();
  expect(gltf.buffers.every(buffer => !buffer.uri)).toBe(true);
  expect(bytes.length).toBeLessThan(350_000);
});
