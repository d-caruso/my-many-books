describe('shared-i18n fallbacks', () => {
  test('initializeI18n uses DEFAULT_LANGUAGE when language is not provided', async () => {
    jest.resetModules();
    const { DEFAULT_LANGUAGE } = require('../types');
    const { initializeI18n, getCurrentLanguage } = require('../config');

    await initializeI18n();
    expect(getCurrentLanguage()).toBe(DEFAULT_LANGUAGE);
  });

  test('getCurrentLanguage returns DEFAULT_LANGUAGE before initialization', () => {
    jest.resetModules();
    const { DEFAULT_LANGUAGE } = require('../types');
    const { getCurrentLanguage } = require('../config');

    expect(getCurrentLanguage()).toBe(DEFAULT_LANGUAGE);
  });
});

