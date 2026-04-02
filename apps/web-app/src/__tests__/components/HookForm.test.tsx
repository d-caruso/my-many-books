import React from 'react';
import { render as rtlRender, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { vi, afterEach } from 'vitest';
import { HookForm } from '../../pages/Admin/Hooks/HookForm';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

vi.mock('@mui/material', async () => {
  const actual = await vi.importActual<typeof import('@mui/material')>('@mui/material');
  return {
    ...actual,
    Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
      open ? <div data-testid="mock-dialog">{children}</div> : null,
  };
});

const testI18n = i18n.createInstance();
testI18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  ns: ['hooks'],
  defaultNS: 'hooks',
  resources: {
    en: {
      hooks: {
        form: {
          title: 'Create or Edit Hook',
          fields: {
            name: 'Name',
            description: 'Description',
            event_pattern: 'Event Pattern',
            action_config: 'Action Configuration (JSON)',
          },
          helpers: {
            name: 'Use a human-friendly label.',
            description: 'Optional description.',
            event_pattern: 'Supports wildcards.',
            action_config: 'Provide valid JSON.',
            priority: 'Lower numbers run first.',
            is_active: 'Disable hooks without deleting them.',
          },
          action_types: {
            log: 'Log',
            email: 'Email',
            database: 'Database',
          },
          actions: {
            save: 'Save Hook',
            cancel: 'Cancel',
          },
          errors: {
            required: 'This field is required',
            invalid_json: 'Provide valid JSON',
            priority: 'Priority must be zero or greater',
          },
          wildcard_legend: {
            single: '* wildcard',
            multi: '** wildcard',
            replace: '? wildcard',
          },
          chips_hint: 'Click to autofill the event pattern.',
        },
        stats: { reload_hint: '' },
        actions: { create: 'Create Hook', reload: 'Reload Hooks' },
        errors: { delete: '', fetch: '', reload: '' },
        list: { empty_title: 'No hooks configured yet', empty_description: 'Create a hook.' },
      },
    },
  },
});

const renderWithProviders = (ui: React.ReactElement) => {
  return rtlRender(
    <BrowserRouter>
      <I18nextProvider i18n={testI18n}>{ui}</I18nextProvider>
    </BrowserRouter>
  );
};

describe('HookForm', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  test('calls onSave with parsed JSON and closes dialog', async () => {
    const onClose = vi.fn();
    const onSave = vi.fn().mockResolvedValue(undefined);

    renderWithProviders(
      <HookForm open onClose={onClose} onSave={onSave} />
    );

    const nameInput = screen.getByLabelText('Name');
    fireEvent.change(nameInput, { target: { value: 'Test Hook' } });

    const eventInput = screen.getByLabelText('Event Pattern');
    fireEvent.change(eventInput, { target: { value: 'book.create' } });

    const saveButton = screen.getByRole('button', { name: /Save Hook/ });
    fireEvent.click(saveButton);

    // Wait for async operation to complete
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ name: 'Test Hook' }));
      expect(onClose).toHaveBeenCalled();
    });
  });

  test('shows validation error when action config JSON is invalid', () => {
    const onClose = vi.fn();
    const onSave = vi.fn();

    renderWithProviders(
      <HookForm open onClose={onClose} onSave={onSave} />
    );

    const config = screen.getByLabelText('Action Configuration (JSON)');
    fireEvent.change(config, { target: { value: '{invalidJson' } });
    const saveButton = screen.getByRole('button', { name: /Save Hook/ });

    expect(saveButton).toBeDisabled();
    fireEvent.click(saveButton);
    expect(onSave).not.toHaveBeenCalled();
  });
});
