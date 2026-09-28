const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch workspace root for @fieldops/shared
config.watchFolders = [workspaceRoot];

// Resolve workspace packages
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Stub xmlhttprequest-ssl (socket.io polyfill that crashes in Hermes)
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'xmlhttprequest-ssl': path.resolve(projectRoot, 'xmlhttprequest-stub.js'),
};

// Inject our global-fix polyfill BEFORE React Native's own polyfills.
// This is the only way to patch non-writable Hermes globals before
// setUpDefaultReactNativeEnvironment runs and crashes.
const originalGetPolyfills = config.serializer.getPolyfills;
config.serializer = {
  ...config.serializer,
  getPolyfills: (ctx) => {
    const base = typeof originalGetPolyfills === 'function'
      ? originalGetPolyfills(ctx)
      : [];
    return [
      path.resolve(projectRoot, 'polyfill-fix.js'),
      ...(Array.isArray(base) ? base : []),
    ];
  },
};

module.exports = config;
