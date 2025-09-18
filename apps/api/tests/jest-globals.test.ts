// ================================================================
// tests/jest-globals.test.ts
// Test to verify Jest globals are recognized
// ================================================================

// This test verifies that Jest globals work properly in your IDE
describe('Jest Globals Test', () => {
  beforeAll(() => {
    // Jest global should be recognized
    jest.clearAllMocks();
  });

  beforeEach(() => {
    // Another Jest global
    jest.resetAllMocks();
  });

  afterEach(() => {
    // Another Jest global
    jest.restoreAllMocks();
  });

  afterAll(() => {
    // Another Jest global
    console.log('All tests completed');
  });

  it('should recognize Jest globals without TypeScript errors', () => {
    // Basic Jest globals that should not show "Cannot find name" errors
    expect(true).toBe(true);
    expect('hello').toEqual('hello');
    expect([1, 2, 3]).toContain(2);
    expect({ a: 1 }).toHaveProperty('a');
    
    // Mock functions
    const mockFn = jest.fn();
    mockFn('test');
    expect(mockFn).toHaveBeenCalledWith('test');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should support async tests', async () => {
    const promise = Promise.resolve('success');
    await expect(promise).resolves.toBe('success');
  });

  it('should support test.skip and test.only syntax', () => {
    // These should not show TypeScript errors
    test('nested test', () => {
      expect(1 + 1).toBe(2);
    });
  });
});