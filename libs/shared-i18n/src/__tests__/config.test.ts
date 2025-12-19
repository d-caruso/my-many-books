import { changeLanguage, getCurrentLanguage, initializeI18n, i18n, TranslationNamespace, DEFAULT_LANGUAGE } from '../index';

describe('shared-i18n config', () => {
  beforeEach(async () => {
    await initializeI18n(DEFAULT_LANGUAGE);
  });

  test('initializeI18n defaults to DEFAULT_LANGUAGE', () => {
    expect(getCurrentLanguage()).toBe(DEFAULT_LANGUAGE);
  });

  test('initializeI18n loads expected namespaces for en/it', () => {
    expect(i18n.hasResourceBundle('en', TranslationNamespace.COMMON)).toBe(true);
    expect(i18n.hasResourceBundle('en', TranslationNamespace.VALIDATION)).toBe(true);
    expect(i18n.hasResourceBundle('en', TranslationNamespace.ERRORS)).toBe(true);
    expect(i18n.hasResourceBundle('en', TranslationNamespace.BOOKS)).toBe(true);
    expect(i18n.hasResourceBundle('en', TranslationNamespace.ADMIN)).toBe(true);
    expect(i18n.hasResourceBundle('en', TranslationNamespace.HOOKS)).toBe(true);
    expect(i18n.hasResourceBundle('en', TranslationNamespace.DIALOGS)).toBe(true);

    expect(i18n.hasResourceBundle('it', TranslationNamespace.COMMON)).toBe(true);
  });

  test('changeLanguage updates the current language', async () => {
    expect(getCurrentLanguage()).toBe('en');

    await changeLanguage('it');

    expect(getCurrentLanguage()).toBe('it');
  });

  test('fallback language returns English translations for unsupported languages', async () => {
    await initializeI18n('fr');

    expect(getCurrentLanguage()).toBe('fr');
    expect(i18n.t('save', { ns: TranslationNamespace.COMMON })).toBe('Save');
  });
});

