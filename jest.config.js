/** @type {import('jest').Config} */
const expoPreset = require('jest-expo/jest-preset');

module.exports = {
  preset: 'jest-expo',
  watchman: process.platform !== 'win32',
  roots: ['<rootDir>/src', '<rootDir>/app'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/packages/shared/'],
  // Three's examples (including GLTFLoader) are ESM. Preserve Expo's native
  // transform allowlist and add Three so native loader regressions can run.
  transformIgnorePatterns: expoPreset.transformIgnorePatterns.map(pattern =>
    pattern.replace('native-base))', 'native-base|three))'),
  ),
};
