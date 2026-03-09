import { createCategoryDisplayNameComparator, getCategoryDisplayName } from '../categoryDisplay';

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
    const t = jest.fn((_key: string, options?: Record<string, unknown>) => String(options?.['defaultValue']));

    expect(
      getCategoryDisplayName({ name: 'Fiction', translationKey: 'categories.fiction' }, t)
    ).toBe('Fiction');
  });
});

describe('createCategoryDisplayNameComparator', () => {
  it('sorts by localized display label', () => {
    const t = jest.fn((key: string, options?: Record<string, unknown>) => {
      if (key === 'categories:fiction') return 'Narrativa';
      if (key === 'categories:horror') return 'Horror';
      return String(options?.['defaultValue'] ?? key);
    });

    const categories = [
      { id: 1, name: 'Fiction', translationKey: 'categories.fiction' },
      { id: 2, name: 'Horror', translationKey: 'categories.horror' },
      { id: 3, name: 'Zeta Custom', translationKey: null },
    ];

    const sorted = [...categories].sort(createCategoryDisplayNameComparator(t, 'it'));

    expect(sorted.map((category) => category.id)).toEqual([2, 1, 3]);
  });
});
