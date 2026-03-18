const mockI18n = {
  language: 'en',
  use: jest.fn().mockReturnThis(),
  init: jest.fn().mockResolvedValue(undefined),
  changeLanguage: jest.fn(async (language: string) => {
    mockI18n.language = language;
  }),
};

jest.mock('i18next', () => ({
  __esModule: true,
  default: mockI18n,
}));

jest.mock('react-i18next', () => ({
  initReactI18next: {},
}));

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en' }],
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/services/hooks/mobileHooks', () => {
  const actual = jest.requireActual('../src/services/hooks/eventsSchema');
  return {
    mobileHooks: {
      emit: jest.fn().mockResolvedValue(undefined),
    },
    MOBILE_EVENTS: actual.MOBILE_EVENTS,
  };
});

describe('i18n hookey emits', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockI18n.language = 'en';
  });

  it('emits language.changed when the app language changes', async () => {
    const mockAsyncStorage = jest.requireMock('@react-native-async-storage/async-storage') as {
      getItem: jest.Mock;
      setItem: jest.Mock;
    };
    const { mobileHooks, MOBILE_EVENTS } = jest.requireMock('@/services/hooks/mobileHooks') as {
      mobileHooks: { emit: jest.Mock };
      MOBILE_EVENTS: { LANGUAGE: { CHANGED: string } };
    };
    const { changeLanguage } = jest.requireActual('../src/i18n') as typeof import('../src/i18n');

    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);

    await changeLanguage('it');

    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('@language-preference', 'it');
    expect(mobileHooks.emit).toHaveBeenCalledWith(
      MOBILE_EVENTS.LANGUAGE.CHANGED,
      expect.objectContaining({
        previousLanguage: 'en',
        nextLanguage: 'it',
        source: 'i18n.changeLanguage',
      })
    );
  });
});
