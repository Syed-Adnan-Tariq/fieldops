// Stub for xmlhttprequest-ssl — React Native already provides XMLHttpRequest natively.
// socket.io-client pulls this in as a polyfill but it tries to overwrite the non-writable
// global XMLHttpRequest in Hermes, causing "TypeError: property is not writable".
module.exports = { XMLHttpRequest: global.XMLHttpRequest };
