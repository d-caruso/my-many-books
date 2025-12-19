import { i18n, initializeI18n } from '../index';

describe('shared-i18n exports', () => {
  test('exports initializeI18n and i18n instance', () => {
    expect(initializeI18n).toBeDefined();
    expect(i18n).toBeDefined();
  });
});
