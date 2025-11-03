import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LanguageSelector } from '../../../components/Navigation/LanguageSelector';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../i18n';

describe('LanguageSelector', () => {
  beforeEach(() => {
    // Mock the environment variable for testing using vi.stubEnv
    vi.stubEnv('VITE_SHOW_LANGUAGE_SELECTOR', 'true');
    // Clear localStorage before each test
    localStorage.clear();
    // Reset language to English
    i18n.changeLanguage('en');
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should render the language selector', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <LanguageSelector />
      </I18nextProvider>
    );

    // Should show language icon and select
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('should display current language', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <LanguageSelector />
      </I18nextProvider>
    );

    // Default language should be English - check by text content
    const select = screen.getByRole('combobox');
    expect(select).toHaveTextContent('English');
  });

  it('should display all supported languages', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <LanguageSelector />
      </I18nextProvider>
    );

    // Click to open dropdown
    const select = screen.getByRole('combobox');
    fireEvent.mouseDown(select);

    // Should show Italian option (English is already visible as current selection)
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(2);
    expect(screen.getByRole('option', { name: 'Italiano' })).toBeInTheDocument();
  });

  it('should switch language when selection changes', async () => {
    render(
      <I18nextProvider i18n={i18n}>
        <LanguageSelector />
      </I18nextProvider>
    );

    // Open dropdown
    const select = screen.getByRole('combobox');
    fireEvent.mouseDown(select);

    // Click Italian option
    const italianOption = screen.getByRole('option', { name: 'Italiano' });
    fireEvent.click(italianOption);

    // Wait for language change
    await waitFor(() => {
      expect(i18n.language).toBe('it');
    });
  });

  it('should save language preference to localStorage', async () => {
    render(
      <I18nextProvider i18n={i18n}>
        <LanguageSelector />
      </I18nextProvider>
    );

    // Initially localStorage has 'en' from i18n initialization
    const initialLang = localStorage.getItem('preferred-language');
    expect(initialLang).toBe('en');

    // Open dropdown
    const select = screen.getByRole('combobox');
    fireEvent.mouseDown(select);

    // Click Italian option
    const italianOption = screen.getByRole('option', { name: 'Italiano' });
    fireEvent.click(italianOption);

    // Wait and verify localStorage changed to Italian
    await waitFor(() => {
      expect(localStorage.getItem('preferred-language')).toBe('it');
    });
  });

  it('should persist language preference across component remounts', async () => {
    // Set initial language preference
    localStorage.setItem('preferred-language', 'it');
    await i18n.changeLanguage('it');

    const { unmount } = render(
      <I18nextProvider i18n={i18n}>
        <LanguageSelector />
      </I18nextProvider>
    );

    // Should show Italian text
    expect(screen.getByRole('combobox')).toHaveTextContent('Italiano');

    // Unmount and remount
    unmount();

    render(
      <I18nextProvider i18n={i18n}>
        <LanguageSelector />
      </I18nextProvider>
    );

    // Should still show Italian
    expect(screen.getByRole('combobox')).toHaveTextContent('Italiano');
    expect(localStorage.getItem('preferred-language')).toBe('it');
  });

  it('should switch from Italian to English', async () => {
    // Start with Italian
    localStorage.setItem('preferred-language', 'it');
    await i18n.changeLanguage('it');

    render(
      <I18nextProvider i18n={i18n}>
        <LanguageSelector />
      </I18nextProvider>
    );

    // Verify Italian is selected by text content
    expect(screen.getByRole('combobox')).toHaveTextContent('Italiano');

    // Open dropdown
    const select = screen.getByRole('combobox');
    fireEvent.mouseDown(select);

    // Click English option
    const englishOption = screen.getByRole('option', { name: 'English' });
    fireEvent.click(englishOption);

    // Wait for language change
    await waitFor(() => {
      expect(i18n.language).toBe('en');
      expect(localStorage.getItem('preferred-language')).toBe('en');
    });
  });

  it('should update UI instantly when language changes', async () => {
    render(
      <I18nextProvider i18n={i18n}>
        <LanguageSelector />
      </I18nextProvider>
    );

    // Open dropdown
    const select = screen.getByRole('combobox');
    fireEvent.mouseDown(select);

    // Click Italian
    const italianOption = screen.getByRole('option', { name: 'Italiano' });
    fireEvent.click(italianOption);

    // UI should update instantly - check text content
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toHaveTextContent('Italiano');
    });
  });
});
