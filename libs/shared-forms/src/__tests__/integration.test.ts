import { act, renderHook } from '@testing-library/react';
import { FormManager } from '../FormManager';
import { FormValidator } from '../FormValidator';
import { useFormAutoSave } from '../hooks';
import type { FieldValue, FormConfig, FormEvent, FormSubmissionResult } from '../types';

const createConfig = (): FormConfig => ({
  fields: [
    {
      id: 'title',
      name: 'title',
      label: 'Title',
      type: 'text',
      value: 'Ok',
      validation: [FormValidator.createRequiredRule('Title required')],
    },
  ],
});

describe('shared-forms integration', () => {
  test('submit handles thrown submission handler errors', async () => {
    const handler = jest.fn<Promise<FormSubmissionResult>, [Record<string, FieldValue>]>(async () => {
      throw new Error('Network down');
    });

    const manager = new FormManager(createConfig(), handler);
    const events: FormEvent[] = [];
    manager.addEventListener((event) => events.push(event));

    const result = await manager.submit();

    expect(result?.success).toBe(false);
    expect(result?.errors).toBe('Network down');
    expect(events.some((e) => e.type === 'SUBMISSION_ERROR')).toBe(true);
  });

  test('submit preserves existing validation state when server returns string error', async () => {
    const handler = jest.fn<Promise<FormSubmissionResult>, [Record<string, FieldValue>]>(async () => ({
      success: false,
      errors: 'Bad request',
      timestamp: new Date(),
    }));

    const manager = new FormManager(createConfig(), handler);
    const result = await manager.submit();

    expect(result?.success).toBe(false);
    expect(result?.errors).toBe('Bad request');
    expect(manager.getState().errors).toEqual({});
    expect(manager.getState().isValid).toBe(true);
  });

  test('auto-save logs errors and attempts again on subsequent change', async () => {
    jest.useFakeTimers();
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const saveHandler = jest
      .fn<Promise<void>, [Record<string, FieldValue>]>()
      .mockRejectedValueOnce(new Error('Save failed'))
      .mockResolvedValueOnce(undefined);

    const manager = new FormManager(createConfig());
    renderHook(() => useFormAutoSave(manager, saveHandler, 2000));

    await act(async () => {
      manager.setFieldValue('title', 'A');
      jest.advanceTimersByTime(2000);
    });
    expect(saveHandler).toHaveBeenCalledTimes(1);

    await act(async () => {
      manager.setFieldValue('title', 'B');
      jest.advanceTimersByTime(2000);
    });
    expect(saveHandler).toHaveBeenCalledTimes(2);

    errorSpy.mockRestore();
    jest.useRealTimers();
  });
});
