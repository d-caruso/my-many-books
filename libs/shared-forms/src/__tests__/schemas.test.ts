import { bookFormSchema } from '../schemas';
import { FormValidator } from '../FormValidator';

describe('shared-forms schemas', () => {
  test('bookFormSchema authors custom rule validates array presence', async () => {
    const authorsField = bookFormSchema.fields.find((field) => field.name === 'authors');
    if (!authorsField) {
      throw new Error('Authors field is not defined in bookFormSchema');
    }
    expect(authorsField.validation?.length).toBeGreaterThan(0);

    const validator = new FormValidator();

    await expect(
      validator.validateField({ ...authorsField, value: [] }, { authors: [] })
    ).resolves.toEqual(['At least one author is required']);

    await expect(
      validator.validateField({ ...authorsField, value: [1] }, { authors: [1] })
    ).resolves.toEqual([]);
  });
});
