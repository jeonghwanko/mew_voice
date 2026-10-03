const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { createFiberFileSystemResolver } = require('./src/features/avatar/metroFileSystemResolver');

const projectRoot = __dirname;
const monorepoRoot = projectRoot;
const sharedPkg = path.resolve(monorepoRoot, 'packages/shared');

const config = getDefaultConfig(projectRoot);
config.maxWorkers = 2;
config.resolver.assetExts.push('glb', 'gltf');

// 패키지 루트를 직접 매핑해 workspace symlink에 의존하지 않되,
// package.json exports가 실제 dist entry를 선택하게 한다.
config.resolver.extraNodeModules = {
  '@findthem/shared': sharedPkg,
};

config.resolver.resolveRequest = createFiberFileSystemResolver({
  defaultResolveRequest: config.resolver.resolveRequest,
  fiberNativeRoot: path.dirname(require.resolve('@react-three/fiber/native/package.json')),
});

// shared build 결과와 manifest를 Metro가 함께 감시한다.
config.watchFolders = [sharedPkg];

module.exports = config;
