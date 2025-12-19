import { FormValidator } from '../FormValidator';
import type { FormField, ValidationRule } from '../types';

const createField = (overrides: Partial<FormField>): FormField => ({
  id: 'field',
  name: 'field',
  label: 'Field',
  type: 'text',
  value: '',
  ...overrides,
});

describe('FormValidator', () => {
  test('returns no errors when field has no validation rules', async () => {
    const validator = new FormValidator();
    const field = createField({ value: 'x', validation: undefined });

    await expect(validator.validateField(field, {})).resolves.toEqual([]);
  });

  test('required rule fails for empty string and passes for non-empty string', async () => {
    const validator = new FormValidator();
    const field = createField({
      value: '',
      validation: [FormValidator.createRequiredRule('Required')],
    });

    await expect(validator.validateField(field, {})).resolves.toEqual(['Required']);

    field.value = 'hello';
    await expect(validator.validateField(field, {})).resolves.toEqual([]);
  });

  test('required rule treats NaN as invalid', async () => {
    const validator = new FormValidator();
    const field = createField({
      type: 'number',
      value: NaN,
      validation: [FormValidator.createRequiredRule('Required')],
    });

    await expect(validator.validateField(field, {})).resolves.toEqual(['Required']);
  });

  test('email rule validates format but treats empty as optional', async () => {
    const validator = new FormValidator();
    const field = createField({
      type: 'email',
      value: '',
      validation: [FormValidator.createEmailRule('Invalid email')],
    });

    await expect(validator.validateField(field, {})).resolves.toEqual([]);

    field.value = 'not-an-email';
    await expect(validator.validateField(field, {})).resolves.toEqual(['Invalid email']);

    field.value = 'user@example.com';
    await expect(validator.validateField(field, {})).resolves.toEqual([]);
  });

  test('url rule validates format but treats empty as optional', async () => {
    const validator = new FormValidator();
    const field = createField({
      type: 'url',
      value: '',
      validation: [FormValidator.createUrlRule('Invalid url')],
    });

    await expect(validator.validateField(field, {})).resolves.toEqual([]);

    field.value = 'notaurl';
    await expect(validator.validateField(field, {})).resolves.toEqual(['Invalid url']);

    field.value = 'https://example.com';
    await expect(validator.validateField(field, {})).resolves.toEqual([]);
  });

  test('minLength and maxLength rules work for strings', async () => {
    const validator = new FormValidator();
    const field = createField({
      value: 'ab',
      validation: [
        FormValidator.createMinLengthRule(3, 'Too short'),
        FormValidator.createMaxLengthRule(4, 'Too long'),
      ],
    });

    await expect(validator.validateField(field, {})).resolves.toEqual(['Too short']);

    field.value = 'abcd';
    await expect(validator.validateField(field, {})).resolves.toEqual([]);

    field.value = 'abcde';
    await expect(validator.validateField(field, {})).resolves.toEqual(['Too long']);
  });

  test('pattern rule works for strings', async () => {
    const validator = new FormValidator();
    const field = createField({
      value: 'abc-123',
      validation: [FormValidator.createPatternRule('^[a-z]+$','Letters only')],
    });

    await expect(validator.validateField(field, {})).resolves.toEqual(['Letters only']);

    field.value = 'abc';
    await expect(validator.validateField(field, {})).resolves.toEqual([]);
  });

  test('min/max rules validate numbers and numeric strings', async () => {
    const validator = new FormValidator();
    const field = createField({
      type: 'number',
      value: 1,
      validation: [FormValidator.createMinRule(2, 'Min 2'), FormValidator.createMaxRule(3, 'Max 3')],
    });

    await expect(validator.validateField(field, {})).resolves.toEqual(['Min 2']);

    field.value = 2;
    await expect(validator.validateField(field, {})).resolves.toEqual([]);

    field.value = 4;
    await expect(validator.validateField(field, {})).resolves.toEqual(['Max 3']);

    field.value = '2';
    await expect(validator.validateField(field, {})).resolves.toEqual([]);
  });

  test('min/max rules validate dates using timestamps', async () => {
    const validator = new FormValidator();
    const min = new Date('2020-01-01').getTime();
    const max = new Date('2020-12-31').getTime();

    const field = createField({
      type: 'date',
      value: new Date('2019-12-31'),
      validation: [FormValidator.createMinRule(min, 'Too early'), FormValidator.createMaxRule(max, 'Too late')],
    });

    await expect(validator.validateField(field, {})).resolves.toEqual(['Too early']);

    field.value = new Date('2020-06-01');
    await expect(validator.validateField(field, {})).resolves.toEqual([]);

    field.value = new Date('2021-01-01');
    await expect(validator.validateField(field, {})).resolves.toEqual(['Too late']);
  });

  test('custom rule supports async validation', async () => {
    const validator = new FormValidator();
    const asyncRule = FormValidator.createCustomRule(async (value) => value === 'ok', 'Not ok');
    const field = createField({ value: 'no', validation: [asyncRule] });

    await expect(validator.validateField(field, {})).resolves.toEqual(['Not ok']);

    field.value = 'ok';
    await expect(validator.validateField(field, {})).resolves.toEqual([]);
  });

  test('custom rule missing validator warns and passes', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const validator = new FormValidator();
    const field = createField({
      value: 'x',
      validation: [{ type: 'custom', message: 'ignored' } as ValidationRule],
    });

    await expect(validator.validateField(field, {})).resolves.toEqual([]);
    expect(warnSpy).toHaveBeenCalledWith('Custom validation rule missing validator function');
    warnSpy.mockRestore();
  });

  test('custom validator error returns false and logs', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const validator = new FormValidator();
    const rule = FormValidator.createCustomRule(() => {
      throw new Error('boom');
    }, 'Failed');
    const field = createField({ value: 'x', validation: [rule] });

    await expect(validator.validateField(field, {})).resolves.toEqual(['Failed']);
    expect(errorSpy).toHaveBeenCalledWith('Custom validator error:', expect.any(Error));
    errorSpy.mockRestore();
  });

  test('unknown rule type warns and is treated as valid', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const validator = new FormValidator();
    const field = createField({
      value: 'x',
      validation: [{ type: 'unknown', message: 'Ignored' } as unknown as ValidationRule],
    });

    await expect(validator.validateField(field, {})).resolves.toEqual([]);
    expect(warnSpy).toHaveBeenCalledWith('Unknown validation rule type: unknown');
    warnSpy.mockRestore();
  });
});

