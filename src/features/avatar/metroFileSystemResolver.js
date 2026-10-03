const path = require('path');

function isInside(parentPath, childPath) {
  const relativePath = path.relative(parentPath, childPath);
  return (
    relativePath !== '' &&
    relativePath !== '..' &&
    !relativePath.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relativePath)
  );
}

/**
 * Fiber 9's native loader imports the pre-SDK 54 FileSystem surface. SDK 54
 * keeps that surface under /legacy while the root methods throw at runtime.
 * Redirect only Fiber's native import so every app import keeps the modern API.
 */
function createFiberFileSystemResolver({ defaultResolveRequest, fiberNativeRoot }) {
  return (context, moduleName, platform) => {
    const resolvedModuleName =
      moduleName === 'expo-file-system' &&
      platform !== 'web' &&
      isInside(fiberNativeRoot, context.originModulePath)
        ? 'expo-file-system/legacy'
        : moduleName;

    if (defaultResolveRequest) {
      return defaultResolveRequest(context, resolvedModuleName, platform);
    }
    return context.resolveRequest(context, resolvedModuleName, platform);
  };
}

module.exports = { createFiberFileSystemResolver };
