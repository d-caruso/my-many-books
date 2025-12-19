import { FormManager, FormValidator } from '../index';

describe('shared-forms exports', () => {
  test('exports FormManager and FormValidator', () => {
    expect(FormManager).toBeDefined();
    expect(FormValidator).toBeDefined();
  });
});

