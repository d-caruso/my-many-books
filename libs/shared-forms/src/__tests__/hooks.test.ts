import { act, renderHook, waitFor } from '@testing-library/react';
import { FormManager } from '../FormManager';
import { FormValidator } from '../FormValidator';
import {
  useAuthForm,
  useBookForm,
  useFieldValidation,
  useForm,
  useFormAutoSave,
  useFormField,
  useFormSubmission,
  useFormValidation,
  useSearchForm,
  useUserForm,
} from '../hooks';
import type { FormConfig, FormSubmissionResult } from '../types';

const createConfig = (overrides: Partial<FormConfig> = {}): FormConfig => ({
  fields: [
    {
      id: 'title',
      name: 'title',
      label: 'Title',
      type: 'text',
      value: '',
      validation: [FormValidator.createRequiredRule('Title required')],
    },
  ],
  ...overrides,
});

describe('shared-forms React hooks', () => {
  test('useForm updates state when setting a field value', async () => {
    const { result } = renderHook(() => useForm(createConfig()));

    expect(result.current.state.values.title).toBe('');

    await act(async () => {
      result.current.setFieldValue('title', 'New Title');
    });

    expect(result.current.state.values.title).toBe('New Title');
    expect(result.current.formManager.getFieldValue('title')).toBe('New Title');
  });

  test('useForm setValues() and setErrors() update state', async () => {
    const { result } = renderHook(() => useForm(createConfig({ validationMode: 'onChange' })));

    await act(async () => {
      result.current.setValues({ title: '' });
    });

    await waitFor(() => {
      expect(result.current.state.errors).toEqual({ title: ['Title required'] });
      expect(result.current.state.isValid).toBe(false);
    });

    await act(async () => {
      result.current.setErrors({ title: ['Server error'] });
    });

    expect(result.current.state.errors).toEqual({ title: ['Server error'] });
    expect(result.current.state.isValid).toBe(false);
  });

  test('useFormField reflects value and touched state changes', async () => {
    const manager = new FormManager(createConfig());
    const { result } = renderHook(() => useFormField(manager, 'title'));

    expect(result.current.value).toBe('');
    expect(result.current.isTouched).toBe(false);

    await act(async () => {
      manager.setFieldValue('title', 'X');
    });
    expect(result.current.value).toBe('X');

    await act(async () => {
      manager.setFieldTouched('title', true);
    });
    expect(result.current.isTouched).toBe(true);
  });

  test('useFormValidation exposes validate() and updates errors', async () => {
    const manager = new FormManager(createConfig());
    const { result } = renderHook(() => useFormValidation(manager));

    expect(result.current.isValid).toBe(true);

    await act(async () => {
      await result.current.validate();
    });

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors).toEqual({ title: ['Title required'] });
  });

  test('useFormSubmission exposes submit() and tracks last result', async () => {
    const handler = jest.fn<Promise<FormSubmissionResult>, any[]>(async () => ({
      success: true,
      timestamp: new Date(),
    }));

    const manager = new FormManager(createConfig({ fields: [{ ...createConfig().fields[0], value: 'Ok' }] }), handler);
    const { result } = renderHook(() => useFormSubmission(manager));

    expect(result.current.submissionState.hasSubmitted).toBe(false);

    await act(async () => {
      await result.current.submit();
    });

    expect(handler).toHaveBeenCalled();
    expect(result.current.submissionState.hasSubmitted).toBe(true);
    expect(result.current.lastResult?.success).toBe(true);
  });

  test('useAuthForm returns login and register configs', () => {
    const { result: login } = renderHook(() => useAuthForm('login'));
    expect(Object.keys(login.current.state.fields).sort()).toEqual(['email', 'password', 'rememberMe']);

    const { result: register } = renderHook(() => useAuthForm('register'));
    expect(Object.keys(register.current.state.fields)).toEqual(
      expect.arrayContaining(['firstName', 'lastName', 'email', 'password', 'confirmPassword'])
    );
  });

  test('useBookForm and useUserForm apply initialData', async () => {
    const { result: book } = renderHook(() => useBookForm(undefined, { title: 'My Book', language: 'it' }));
    expect(book.current.state.values.title).toBe('My Book');
    expect(book.current.state.values.language).toBe('it');

    const { result: user } = renderHook(() => useUserForm(undefined, { firstName: 'A', lastName: 'B' }));
    expect(user.current.state.values.firstName).toBe('A');
    expect(user.current.state.values.lastName).toBe('B');
  });

  test('useSearchForm populates category/author options when provided', () => {
    const { result } = renderHook(() =>
      useSearchForm(undefined, [{ id: 1, name: 'Fiction' }], [{ id: 10, name: 'Author' }])
    );

    expect(result.current.state.fields.category.options).toEqual([
      { label: 'All Categories', value: null },
      { label: 'Fiction', value: 1 },
    ]);

    expect(result.current.state.fields.author.options).toEqual([
      { label: 'All Authors', value: null },
      { label: 'Author', value: 10 },
    ]);
  });

  test('useBookForm and useSearchForm keep defaults when optional data is missing', () => {
    const { result: book } = renderHook(() => useBookForm());
    expect(book.current.state.values.title).toBe('');

    const { result: search } = renderHook(() => useSearchForm());
    expect(search.current.state.fields.category.options).toEqual([{ label: 'All Categories', value: null }]);
    expect(search.current.state.fields.author.options).toEqual([{ label: 'All Authors', value: null }]);
  });

  test('useFieldValidation validates rules and updates errors', async () => {
    const { result } = renderHook(() =>
      useFieldValidation('', [FormValidator.createRequiredRule('Required')])
    );

    await waitFor(() => {
      expect(result.current.errors).toEqual(['Required']);
    });

    const { result: okResult } = renderHook(() =>
      useFieldValidation('x', [FormValidator.createRequiredRule('Required')])
    );

    await waitFor(() => {
      expect(okResult.current.errors).toEqual([]);
      expect(okResult.current.isValid).toBe(true);
    });
  });

  test('useFormAutoSave debounces changes and calls saveHandler after delay', async () => {
    jest.useFakeTimers();
    const saveHandler = jest.fn(async () => {});
    const manager = new FormManager(createConfig({ fields: [{ ...createConfig().fields[0], value: 'Init' }] }));

    const { result, unmount } = renderHook(() => useFormAutoSave(manager, saveHandler, 2000));

    await act(async () => {
      manager.setFieldValue('title', 'A');
    });

    await act(async () => {
      jest.advanceTimersByTime(1999);
    });
    expect(saveHandler).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(1);
    });

    await waitFor(() => {
      expect(saveHandler).toHaveBeenCalledTimes(1);
      expect(saveHandler).toHaveBeenCalledWith({ title: 'A' });
    });

    await act(async () => {
      manager.setFieldValue('title', 'B');
      jest.advanceTimersByTime(1000);
      manager.setFieldValue('title', 'C');
    });

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(saveHandler).toHaveBeenCalledTimes(2);
      expect(saveHandler).toHaveBeenLastCalledWith({ title: 'C' });
    });

    unmount();
    jest.useRealTimers();

    expect(result.current.isSaving).toBe(false);
  });
});
