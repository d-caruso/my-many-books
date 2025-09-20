/**
 * Custom Jest environment that fixes React Native Testing Library timer issues
 * This runs BEFORE any module imports, ensuring globalObj is set up correctly
 */

const { TestEnvironment } = require('jest-environment-jsdom');

class ReactNativeTestEnvironment extends TestEnvironment {
  constructor(config, context) {
    super(config, context);
    
    // CRITICAL: Set up globalObj BEFORE any modules are imported
    this.global.globalObj = this.global;
    
    // Ensure all timer functions are available
    if (!this.global.setTimeout) {
      this.global.setTimeout = global.setTimeout;
    }
    if (!this.global.clearTimeout) {
      this.global.clearTimeout = global.clearTimeout;
    }
    if (!this.global.setInterval) {
      this.global.setInterval = global.setInterval;
    }
    if (!this.global.clearInterval) {
      this.global.clearInterval = global.clearInterval;
    }
    
    // Polyfill setImmediate if needed
    if (typeof this.global.setImmediate === 'undefined') {
      this.global.setImmediate = (fn) => this.global.setTimeout(fn, 0);
      this.global.clearImmediate = (id) => this.global.clearTimeout(id);
    }
  }
}

module.exports = ReactNativeTestEnvironment;