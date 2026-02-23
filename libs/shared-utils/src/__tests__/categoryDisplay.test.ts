import { getCategoryDisplayName } from '../categoryDisplay';

describe('getCategoryDisplayName', () => {
  it('returns raw name when translationKey is missing', () => {
    const t = jest.fn((key: string) => key);

    expect(getCategoryDisplayName({ name: 'Custom Label' }, t)).toBe('Custom Label');
    expect(t).not.toHaveBeenCalled();
  });

  it('resolves category translation key through categories namespace', () => {
    const t = jest.fn((key: string) => (key === 'categories:fiction' ? 'Narrativa' : key));

    expect(
      getCategoryDisplayName({ name: 'Fiction', translationKey: 'categories.fiction' }, t)
    ).toBe('Narrativa');
    expect(t).toHaveBeenCalledWith('categories:fiction', { defaultValue: 'Fiction' });
  });

  it('falls back to raw name when translation is missing', () => {
    const t = jest.fn((_key: string, options?: Record<string, unknown>) => String(options?.defaultValue));

    expect(
      getCategoryDisplayName({ name: 'Fiction', translationKey: 'categories.fiction' }, t)
    ).toBe('Fiction');
  });
});

