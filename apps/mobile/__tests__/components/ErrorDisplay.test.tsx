// Test for ErrorDisplay component

describe('ErrorDisplay Component', () => {
  it('should import ErrorDisplay component', () => {
    const componentModule = require('../../src/components/ErrorDisplay');
    expect(componentModule.ErrorDisplay).toBeDefined();
    expect(typeof componentModule.ErrorDisplay).toBe('function');
  });
});
