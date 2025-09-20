/**
 * Timer setup for React Native Testing Library compatibility
 * This fixes the "globalObj.setTimeout is not a function" error
 */

// Set up globalThis if not available (Node.js < 12)
if (typeof globalThis === 'undefined') {
  global.globalThis = global;
}

// The critical fix: globalObj must be exactly global for React Native Testing Library
global.globalObj = global;

// Ensure all timer functions are available and properly bound
if (!global.setTimeout) {
  global.setTimeout = setTimeout;
}
if (!global.clearTimeout) {
  global.clearTimeout = clearTimeout;
}
if (!global.setInterval) {
  global.setInterval = setInterval;
}
if (!global.clearInterval) {
  global.clearInterval = clearInterval;
}

// Polyfill setImmediate if needed
if (typeof global.setImmediate === 'undefined') {
  global.setImmediate = (fn) => global.setTimeout(fn, 0);
  global.clearImmediate = (id) => global.clearTimeout(id);
}