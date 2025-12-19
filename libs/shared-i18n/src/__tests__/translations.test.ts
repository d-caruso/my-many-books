import { initializeI18n, i18n, TranslationNamespace } from '../index';

describe('shared-i18n translations', () => {
  beforeEach(async () => {
    await initializeI18n('en');
  });

  test('resolves translation keys from the expected namespace', () => {
    expect(i18n.t('save', { ns: TranslationNamespace.COMMON })).toBe('Save');
    expect(i18n.t('required', { ns: TranslationNamespace.VALIDATION })).toBe('This field is required');
  });

  test('supports interpolation', () => {
    expect(
      i18n.t('field_required', { ns: TranslationNamespace.VALIDATION, field: 'Title' })
    ).toBe('Title is required');
  });

  test('supports basic pluralization via count', () => {
    i18n.addResourceBundle(
      'en',
      'test',
      { item_one: '1 item', item_other: '{{count}} items' },
      true,
      true
    );

    expect(i18n.t('item', { ns: 'test', count: 1 })).toBe('1 item');
    expect(i18n.t('item', { ns: 'test', count: 2 })).toBe('2 items');
  });

  test('missing keys surface as key strings (no silent undefined)', () => {
    const value = i18n.t('does_not_exist', { ns: TranslationNamespace.COMMON });
    expect(value).toContain('does_not_exist');
  });
});

