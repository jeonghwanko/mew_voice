/* global __dirname, __filename, afterAll, beforeAll, describe, expect, jest, test */
const fs = require('node:fs');
const path = require('node:path');

const modelPath = path.join(
  __dirname,
  '../../../assets/avatar/v13-sit-stand/v13-sit-stand.glb',
);
const modelUri = 'file:///test/v13-sit-stand.glb';
const mockFiles = new Map([[modelUri, fs.readFileSync(modelPath).toString('base64')]]);
const mockReadAsStringAsync = jest.fn(async uri => mockFiles.get(uri));
const mockWriteAsStringAsync = jest.fn(async (uri, contents) => {
  mockFiles.set(uri, contents);
});

jest.mock('expo-file-system', () => ({
  cacheDirectory: 'file:///test-cache/',
  EncodingType: { Base64: 'base64' },
  readAsStringAsync: mockReadAsStringAsync,
  writeAsStringAsync: mockWriteAsStringAsync,
  copyAsync: jest.fn(async () => undefined),
}));

describe('native avatar asset loading', () => {
  test('Metro redirects only Fiber native to the SDK 54 legacy FileSystem API', () => {
    const { createFiberFileSystemResolver } = require('./metroFileSystemResolver');
    const delegate = jest.fn((_context, moduleName) => ({
      type: 'sourceFile',
      filePath: moduleName,
    }));
    const fiberOrigin = require.resolve('@react-three/fiber/native');
    const resolveRequest = createFiberFileSystemResolver({
      defaultResolveRequest: null,
      fiberNativeRoot: path.dirname(
        require.resolve('@react-three/fiber/native/package.json'),
      ),
    });

    const nativeResult = resolveRequest(
      { originModulePath: fiberOrigin, resolveRequest: delegate },
      'expo-file-system',
      'ios',
    );
    expect(nativeResult.filePath).toBe('expo-file-system/legacy');

    const appResult = resolveRequest(
      { originModulePath: __filename, resolveRequest: delegate },
      'expo-file-system',
      'ios',
    );
    expect(appResult.filePath).toBe('expo-file-system');

    const webResult = resolveRequest(
      { originModulePath: fiberOrigin, resolveRequest: delegate },
      'expo-file-system',
      'web',
    );
    expect(webResult.filePath).toBe('expo-file-system');
  });

  describe('installed Fiber native polyfills with the real V13 GLB', () => {
    let originalBlob;
    let originalSelf;
    let originalUrl;
    let gltf;

    beforeAll(async () => {
      originalBlob = global.Blob;
      originalSelf = global.self;
      originalUrl = global.URL;
      global.self = global;
      global.Blob = require('react-native/Libraries/Blob/Blob').default;
      const { URL: ReactNativeURL } = require('react-native/Libraries/Blob/URL');
      global.URL = class NativeTestURL extends originalUrl {};
      global.URL.createObjectURL = ReactNativeURL.createObjectURL;
      global.URL.revokeObjectURL = ReactNativeURL.revokeObjectURL;

      const { Image } = require('react-native');
      Image.getSize = jest.fn((_uri, onSuccess) => onSuccess(4, 4));

      // Importing the native entry installs Fiber's FileLoader, TextureLoader,
      // Blob and numeric-asset compatibility shims before GLTFLoader runs.
      require('@react-three/fiber/native');
      const { GLTFLoader } = require('three/examples/jsm/loaders/GLTFLoader.js');
      gltf = await new GLTFLoader().loadAsync(modelUri);
    }, 30_000);

    afterAll(() => {
      global.Blob = originalBlob;
      global.self = originalSelf;
      global.URL = originalUrl;
    });

    test('loads all embedded textures without external or network assets', () => {
      const texturedMaterials = new Set();
      gltf.scene.traverse(object => {
        const materials = Array.isArray(object.material)
          ? object.material
          : object.material
            ? [object.material]
            : [];
        materials.forEach(material => {
          if (material.map) texturedMaterials.add(material);
        });
      });

      expect(texturedMaterials.size).toBeGreaterThan(0);
      expect(mockWriteAsStringAsync).toHaveBeenCalledTimes(3);
      expect(mockReadAsStringAsync).toHaveBeenCalledWith(modelUri, { encoding: 'base64' });
    });

    test('preserves the skinned scene and drives its real sit/stand animation', () => {
      let skinnedMesh;
      gltf.scene.traverse(object => {
        if (!skinnedMesh && object.isSkinnedMesh) skinnedMesh = object;
      });
      expect(skinnedMesh.skeleton.bones).toHaveLength(24);

      const clip = gltf.animations.find(animation => animation.name === 'Animation');
      expect(clip.duration).toBe(4);

      const { AnimationMixer } = require('three');
      const mixer = new AnimationMixer(gltf.scene);
      mixer.clipAction(clip).play();
      mixer.setTime(0);
      gltf.scene.updateMatrixWorld(true);
      const seated = skinnedMesh.skeleton.bones.map(bone => bone.matrixWorld.elements.slice());
      mixer.setTime(2);
      gltf.scene.updateMatrixWorld(true);
      const standing = skinnedMesh.skeleton.bones.map(bone => bone.matrixWorld.elements.slice());

      expect(standing).not.toEqual(seated);
      mixer.stopAllAction();
    });
  });
});
