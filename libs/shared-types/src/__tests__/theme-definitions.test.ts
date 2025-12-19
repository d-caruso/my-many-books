import { ThemeNameSchema, ThemeNameValues } from '../theme';

describe('shared-types theme definitions', () => {
  it('exports a unique list of ThemeNameValues', () => {
    expect(ThemeNameValues.length).toBeGreaterThan(0);
    expect(new Set(ThemeNameValues).size).toBe(ThemeNameValues.length);
    expect(ThemeNameValues).toContain('default');
    expect(ThemeNameValues).toContain('dark');
  });

  it('keeps ThemeNameSchema options in sync with ThemeNameValues', () => {
    expect(ThemeNameSchema.options).toEqual([...ThemeNameValues]);
  });
});

