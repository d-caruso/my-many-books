import { act, renderHook, waitFor } from '@testing-library/react';
import { FormManager } from '../FormManager';
import { FormValidator } from '../FormValidator';
import {
  useFieldValidation,
  useForm,
  useFormAutoSave,
  useFormField,
  useFormSubmission,
  useFormValidation,
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

