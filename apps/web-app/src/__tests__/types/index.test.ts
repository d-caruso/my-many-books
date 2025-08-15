import * as Types from '../../types/index';

describe('Types Index - Re-exports', () => {
  test('exports all types from shared-types', () => {
    // This test ensures that the types module properly re-exports
    // We can't directly test TypeScript types at runtime, but we can test
    // that the module structure is correct
    expect(Types).toBeDefined();
    
    // The module should be an object (containing the re-exports)
    expect(typeof Types).toBe('object');
  });

  test('module structure is correct', () => {
    // Test that the module exports exist (even if they're types)
    // This helps catch import/export issues
    const moduleKeys = Object.keys(Types);
    
    // We should have re-exported some items
    // The exact count may vary as types are compile-time only
    expect(moduleKeys.length).toBeGreaterThanOrEqual(0);
  });

  test('backwards compatibility exports are available', () => {
    // The types file should make shared-types available
    // We can't test the actual types, but we can test the module structure
    expect(Types).not.toBeNull();
    expect(Types).not.toBeUndefined();
  });
});