import { componentStyles, designTokens, themes } from '../index';

describe('shared-design exports', () => {
  test('exports designTokens, themes, and componentStyles', () => {
    expect(designTokens).toBeDefined();
    expect(themes).toBeDefined();
    expect(componentStyles).toBeDefined();
  });
});

