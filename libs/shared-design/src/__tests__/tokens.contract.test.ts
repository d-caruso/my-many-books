import { designTokens } from '../tokens';

const hexColor = /^#[0-9A-Fa-f]{6}$/;
const paletteShades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;

describe('designTokens contract', () => {
  test('primary palette has expected shades', () => {
    for (const shade of paletteShades) {
      expect(designTokens.colors.primary[shade]).toMatch(hexColor);
    }
  });

  test('neutral palette has expected shades', () => {
    for (const shade of paletteShades) {
      expect(designTokens.colors.neutral[shade]).toMatch(hexColor);
    }
  });

  test('semantic colors are valid hex', () => {
    expect(designTokens.colors.semantic.success).toMatch(hexColor);
    expect(designTokens.colors.semantic.warning).toMatch(hexColor);
    expect(designTokens.colors.semantic.error).toMatch(hexColor);
    expect(designTokens.colors.semantic.info).toMatch(hexColor);
  });

  test('spacing scale is numeric and non-decreasing', () => {
    const keys = Object.keys(designTokens.spacing)
      .map((key) => Number(key))
      .sort((a, b) => a - b);

    let lastValue = -Infinity;
    for (const key of keys) {
      const value = designTokens.spacing[key as unknown as keyof typeof designTokens.spacing];
      expect(typeof value).toBe('number');
      expect(value).toBeGreaterThanOrEqual(lastValue);
      lastValue = value;
    }
  });

  test('breakpoints are numeric and increasing', () => {
    const values = Object.values(designTokens.breakpoints);
    expect(values.every((value) => typeof value === 'number')).toBe(true);

    let previousValue: number | null = null;
    for (const value of values) {
      if (previousValue !== null) {
        expect(value).toBeGreaterThan(previousValue);
      }

      previousValue = value;
    }
  });
});
