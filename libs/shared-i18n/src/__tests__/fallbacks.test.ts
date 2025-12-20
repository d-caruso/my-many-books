describe('shared-i18n fallbacks', () => {
  test('initializeI18n uses DEFAULT_LANGUAGE when language is not provided', async () => {
    jest.resetModules();
    const { DEFAULT_LANGUAGE } = await import('../types');
    const { initializeI18n, getCurrentLanguage } = await import('../config');

    await initializeI18n();
    expect(getCurrentLanguage()).toBe(DEFAULT_LANGUAGE);
  });

  test('getCurrentLanguage returns DEFAULT_LANGUAGE before initialization', async () => {
    jest.resetModules();
    const { DEFAULT_LANGUAGE } = await import('../types');
    const { getCurrentLanguage } = await import('../config');

    expect(getCurrentLanguage()).toBe(DEFAULT_LANGUAGE);
  });
});
