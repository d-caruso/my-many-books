/**
 * Mock for i18n module in tests
 */

const mockI18n = {
  t: (key, options = {}) => {
    // Return the key as translation for testing
    if (options.count !== undefined) {
      return `${key} (count: ${options.count})`;
    }
    return key;
  },
  changeLanguage: jest.fn().mockResolvedValue(),
  language: 'en',
  languages: ['en', 'it'],
};

module.exports = mockI18n;
module.exports.default = mockI18n;