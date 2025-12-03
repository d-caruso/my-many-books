import React from 'react';
import { render as rtlRender, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { HookForm } from '../../pages/Admin/Hooks/HookForm';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const testI18n = i18n.createInstance();
testI18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  ns: ['pages'],
  defaultNS: 'pages',
  resources: {
    en: {
      pages: {
        admin: {
          hooks: {
            actions: { create: 'Create Hook' },
            stats: { reload_hint: '' },
            errors: { delete: '', fetch: '', reload: '' },
          },
        },
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
  test('calls onSave with parsed JSON and closes dialog', async () => {
    const onClose = vi.fn();
    const onSave = vi.fn();

    renderWithProviders(
      <HookForm open onClose={onClose} onSave={onSave} />
    );

    const nameInput = screen.getByLabelText('Name');
    fireEvent.change(nameInput, { target: { value: 'Test Hook' } });

    const eventInput = screen.getByLabelText('Event Pattern');
    fireEvent.change(eventInput, { target: { value: 'book.create' } });

    const saveButton = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ name: 'Test Hook' }));
    });
    await waitFor(() => {
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
    const saveButton = screen.getByRole('button', { name: 'Save' });

    expect(saveButton).toBeDisabled();
    fireEvent.click(saveButton);
    expect(onSave).not.toHaveBeenCalled();
  });
});
