import { ThemeNameSchema, ThemeSchema } from '../theme';

describe('shared-types theme schemas', () => {
  it('validates ThemeNameSchema values', () => {
    expect(ThemeNameSchema.parse('default')).toBe('default');
    expect(() => ThemeNameSchema.parse('nope')).toThrow();
  });

  it('validates ThemeSchema payload', () => {
    const theme = {
      name: 'forest',
      displayName: 'Forest',
      colors: {
        primary: '#000000',
        secondary: '#111111',
        accent: '#222222',
        surface: '#333333',
        background: '#444444',
        text: {
          primary: '#ffffff',
          secondary: '#eeeeee',
          muted: '#dddddd',
        },
        semantic: {
          success: '#00ff00',
          warning: '#ffff00',
          error: '#ff0000',
          info: '#0000ff',
        },
      },
    };

    const parsed = ThemeSchema.parse(theme);
    expect(parsed.name).toBe('forest');
    expect(parsed.displayName).toBe('Forest');
  });

  it('rejects ThemeSchema with missing required fields', () => {
    expect(() =>
      ThemeSchema.parse({
        name: 'default',
        displayName: 'Default',
        colors: {
          primary: '#000000',
        },
      })
    ).toThrow();
  });
});

