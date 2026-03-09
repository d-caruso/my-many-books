import { FormManager } from '../FormManager';
import { FormValidator } from '../FormValidator';
import type { FormConfig, FormField, FormSubmissionResult } from '../types';

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

const createTextField = (overrides: Partial<FormField> = {}): FormField => ({
  id: overrides.id ?? 'field',
  name: overrides.name ?? 'field',
  label: overrides.label ?? 'Field',
  type: 'text',
  value: overrides.value ?? '',
  ...overrides,
});

describe('FormManager', () => {
  test('initializes state from config', () => {
    const config: FormConfig = {
      fields: [
        createTextField({ name: 'title', value: 'A' }),
        createTextField({ name: 'subtitle', value: undefined, defaultValue: 'B' }),
      ],
    };

    const manager = new FormManager(config);
    const state = manager.getState();

    expect(Object.keys(state.fields).sort()).toEqual(['subtitle', 'title']);
    expect(state.values['title']).toBe('A');
    expect(state.values['subtitle']).toBe('B');
    expect(state.touched['title']).toBe(false);
    expect(state.isDirty).toBe(false);
    expect(state.isValid).toBe(true);
  });

  test('setFieldValue updates value, marks dirty, and emits FIELD_CHANGE', () => {
    const config: FormConfig = { fields: [createTextField({ name: 'title', value: '' })] };
    const manager = new FormManager(config);

    const events: any[] = [];
    manager.addEventListener((event) => events.push(event));

    manager.setFieldValue('title', 'New');

    expect(manager.getFieldValue('title')).toBe('New');
    const titleField = manager.getState().fields['title'];
    expect(titleField).toBeDefined();
    expect(titleField?.value).toBe('New');
    expect(manager.getState().isDirty).toBe(true);
    expect(events).toEqual([{ type: 'FIELD_CHANGE', fieldName: 'title', value: 'New' }]);
  });

  test('setFieldValue no-ops for unknown field', () => {
    const manager = new FormManager({ fields: [createTextField({ name: 'title', value: '' })] });

    manager.setFieldValue('missing', 'x');

    expect(manager.getFieldValue('title')).toBe('');
    expect(manager.getState().isDirty).toBe(false);
  });

  test('validationMode=onChange triggers validation', async () => {
    const validateSpy = jest.spyOn(FormValidator.prototype as any, 'validateField');
    validateSpy.mockResolvedValue(['Required']);

    const config: FormConfig = {
      fields: [
        createTextField({
          name: 'title',
          value: '',
          validation: [FormValidator.createRequiredRule('Required')],
        }),
      ],
      validationMode: 'onChange',
    };

    const manager = new FormManager(config);
    manager.setFieldValue('title', '');
    await flushMicrotasks();

    expect(validateSpy).toHaveBeenCalled();
    expect(manager.getFieldError('title')).toEqual(['Required']);
    expect(manager.getState().isValid).toBe(false);

    validateSpy.mockRestore();
  });

  test('validationMode=onBlur triggers validation when touched', async () => {
    const validateSpy = jest.spyOn(FormValidator.prototype as any, 'validateField');
    validateSpy.mockResolvedValue(['Required']);

    const config: FormConfig = {
      fields: [
        createTextField({
          name: 'title',
          value: '',
          validation: [FormValidator.createRequiredRule('Required')],
        }),
      ],
      validationMode: 'onBlur',
    };

    const manager = new FormManager(config);
    manager.setFieldTouched('title', true);
    await flushMicrotasks();

    expect(validateSpy).toHaveBeenCalled();
    expect(manager.getFieldError('title')).toEqual(['Required']);

    validateSpy.mockRestore();
  });

  test('validateForm populates errors and emits VALIDATION_ERROR when invalid', async () => {
    const config: FormConfig = {
      fields: [
        createTextField({
          name: 'email',
          value: '',
          validation: [FormValidator.createRequiredRule('Email required')],
        }),
      ],
    };

    const manager = new FormManager(config);
    const events: any[] = [];
    manager.addEventListener((event) => events.push(event));

    const ok = await manager.validateForm();

    expect(ok).toBe(false);
    expect(manager.getState().errors).toEqual({ email: ['Email required'] });
    expect(events.some((e) => e.type === 'VALIDATION_ERROR')).toBe(true);
  });

  test('submit returns validation errors and does not call submissionHandler', async () => {
    const handler = jest.fn<Promise<FormSubmissionResult>, any[]>(async () => ({
      success: true,
      timestamp: new Date(),
    }));

    const config: FormConfig = {
      fields: [
        createTextField({
          name: 'title',
          value: '',
          validation: [FormValidator.createRequiredRule('Title required')],
        }),
      ],
    };

    const manager = new FormManager(config, handler);
    const result = await manager.submit();

    expect(handler).not.toHaveBeenCalled();
    expect(result?.success).toBe(false);
    expect(result?.errors).toEqual({ title: ['Title required'] });
  });

  test('submit without submission handler returns error result', async () => {
    const manager = new FormManager({ fields: [createTextField({ name: 'title', value: 'x' })] });
    const result = await manager.submit();

    expect(result?.success).toBe(false);
    expect(result?.errors).toBe('No submission handler provided');
  });

  test('successful submit emits SUBMISSION_SUCCESS and optionally resets form', async () => {
    const handler = jest.fn<Promise<FormSubmissionResult>, any[]>(async () => ({
      success: true,
      data: { ok: true },
      timestamp: new Date(),
    }));

    const config: FormConfig = {
      fields: [createTextField({ name: 'title', value: 'Initial' })],
      resetOnSubmit: true,
    };

    const manager = new FormManager(config, handler);
    const events: any[] = [];
    manager.addEventListener((event) => events.push(event));

    manager.setFieldValue('title', 'Changed');
    const result = await manager.submit();

    expect(result?.success).toBe(true);
    expect(events.some((e) => e.type === 'SUBMISSION_SUCCESS')).toBe(true);
    expect(manager.getFieldValue('title')).toBe('Initial');
    expect(manager.getState().isDirty).toBe(false);
  });

  test('server-side field errors are merged into state', async () => {
    const handler = jest.fn<Promise<FormSubmissionResult>, any[]>(async () => ({
      success: false,
      errors: { title: ['Server says no'] },
      timestamp: new Date(),
    }));

    const config: FormConfig = {
      fields: [createTextField({ name: 'title', value: 'Ok' })],
    };

    const manager = new FormManager(config, handler);
    const result = await manager.submit();

    expect(result?.success).toBe(false);
    expect(manager.getFieldError('title')).toEqual(['Server says no']);
    expect(manager.getState().isValid).toBe(false);
  });

  test('setValues updates multiple values and validates when validationMode=onChange', async () => {
    const config: FormConfig = {
      fields: [
        createTextField({
          name: 'title',
          value: 'Ok',
          validation: [FormValidator.createRequiredRule('Title required')],
        }),
      ],
      validationMode: 'onChange',
    };

    const manager = new FormManager(config);
    manager.setValues({ title: '' });
    await flushMicrotasks();

    expect(manager.getFieldValue('title')).toBe('');
    expect(manager.getFieldError('title')).toEqual(['Title required']);
    expect(manager.getState().isValid).toBe(false);
  });

  test('setErrors replaces errors and emits VALIDATION_ERROR', () => {
    const manager = new FormManager({ fields: [createTextField({ name: 'title', value: 'x' })] });
    const events: any[] = [];
    manager.addEventListener((event) => events.push(event));

    manager.setErrors({ title: ['Bad'] });

    expect(manager.getState().errors).toEqual({ title: ['Bad'] });
    expect(manager.getState().isValid).toBe(false);
    expect(events.some((e) => e.type === 'VALIDATION_ERROR')).toBe(true);
  });

  test('updateField can update value and keeps values in sync', () => {
    const manager = new FormManager({ fields: [createTextField({ name: 'title', value: 'x' })] });

    manager.updateField('title', { value: 'y', label: 'New Label' });

    expect(manager.getFieldValue('title')).toBe('y');
    const titleField = manager.getState().fields['title'];
    expect(titleField).toBeDefined();
    expect(titleField?.label).toBe('New Label');
  });

  test('addField and removeField mutate form state', async () => {
    const validateSpy = jest.spyOn(FormValidator.prototype as any, 'validateField');
    validateSpy.mockResolvedValue([]);

    const manager = new FormManager({ fields: [createTextField({ name: 'title', value: 'x' })] });
    manager.addField(
      createTextField({
        name: 'subtitle',
        value: 'y',
        validation: [FormValidator.createRequiredRule('Required')],
      })
    );

    await flushMicrotasks();

    expect(manager.getFieldNames().sort()).toEqual(['subtitle', 'title']);
    expect(validateSpy).toHaveBeenCalled();

    manager.removeField('subtitle');
    expect(manager.getFieldNames()).toEqual(['title']);

    validateSpy.mockRestore();
  });

  test('getDirtyFields and getTouchedFields reflect state', () => {
    const config: FormConfig = {
      fields: [
        createTextField({ name: 'title', value: 'A', defaultValue: 'A' }),
        createTextField({ name: 'subtitle', value: 'B', defaultValue: 'A' }),
      ],
    };
    const manager = new FormManager(config);

    expect(manager.getDirtyFields()).toEqual(['subtitle']);

    manager.setFieldTouched('title', true);
    manager.setFieldTouched('subtitle', false);
    expect(manager.getTouchedFields()).toEqual(['title']);
  });

  test('event listener exceptions are isolated', () => {
    const manager = new FormManager({ fields: [createTextField({ name: 'title', value: 'x' })] });
    const secondListener = jest.fn();

    manager.addEventListener(() => {
      throw new Error('listener fail');
    });
    manager.addEventListener(secondListener);

    expect(() => manager.setFieldValue('title', 'y')).not.toThrow();
    expect(secondListener).toHaveBeenCalledTimes(1);
  });

  test('addEventListener unsubscribe removes listener', () => {
    const manager = new FormManager({ fields: [createTextField({ name: 'title', value: 'x' })] });
    const listener = jest.fn();
    const unsubscribe = manager.addEventListener(listener);

    manager.setFieldValue('title', 'y');
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    manager.setFieldValue('title', 'z');
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
