/**
 * This file is injected by Metro BEFORE React Native's setUpDefaultReactNativeEnvironment runs.
 * In some Expo Go versions, native globals (XMLHttpRequest, fetch, etc.) are defined
 * as non-writable. React Native's polyfill setup tries to overwrite them → crash.
 * We make them writable here so the setup succeeds.
 */
(function fixNonWritableGlobals() {
  var names = [
    'XMLHttpRequest', 'XMLHttpRequestUpload',
    'FormData', 'Blob', 'FileReader',
    'fetch', 'Headers', 'Request', 'Response',
    'AbortController', 'AbortSignal',
    'URL', 'URLSearchParams',
    'performance', 'PerformanceObserver',
    'Event', 'EventTarget', 'CustomEvent',
    'WebSocket',
    'ReadableStream', 'WritableStream', 'TransformStream',
  ];
  for (var i = 0; i < names.length; i++) {
    var name = names[i];
    try {
      if (global[name] == null) continue;
      var d = Object.getOwnPropertyDescriptor(global, name);
      if (d && d.configurable && !d.writable) {
        Object.defineProperty(global, name, {
          value: d.value,
          writable: true,
          enumerable: d.enumerable,
          configurable: true,
        });
      }
    } catch (_) {}
  }
}());
