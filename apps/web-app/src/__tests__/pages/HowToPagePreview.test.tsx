import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import HowToPage from '../../pages/HowTo/HowToPage';
import { SAMPLE_PREVIEW_DISMISSED } from '../../constants/sampleBooks';
import type { TutorialCapabilities } from '../../pages/HowTo/howToContent';
import * as howToContent from '../../pages/HowTo/howToContent';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const testI18n = i18n.createInstance();
const i18nReady = testI18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  ns: ['tutorial', 'books'],
  defaultNS: 'tutorial',
  resources: {
    en: {
      books: {
        preview_banner_title: 'Sample library preview',
      },
      tutorial: {
        page_title: 'How-to guides',
        page_description: 'Quick guides',
        no_guides_available: 'No guides available right now.',
        toc_label: 'On this page',
        cta_try_it_now: 'Try it now',
        cta: {},
        cta_note: {},
        video: { label: 'Mini video', fallback: 'Video unavailable' },
        videos: {},
        sections: {},
      },
    },
  },
  interpolation: { escapeValue: false },
});

const renderHowToPage = () =>
  render(
    <I18nextProvider i18n={testI18n}>
      <MemoryRouter>
        <HowToPage />
      </MemoryRouter>
    </I18nextProvider>
  );

describe('HowToPage — preview button', () => {
  beforeAll(async () => {
    await i18nReady;
    vi.spyOn(howToContent, 'getTutorialCapabilities').mockReturnValue({
      canScanISBN: false,
      canManageAuthors: false,
      canManageCategories: false,
      canChangePassword: false,
    } as TutorialCapabilities);
  });

  beforeEach(() => {
    mockNavigate.mockClear();
    localStorage.clear();
  });

  test('removes the dismissed flag and navigates to books page', () => {
    localStorage.setItem(SAMPLE_PREVIEW_DISMISSED, 'true');
    renderHowToPage();

    const button = screen.getByTestId('preview-library-button');
    fireEvent.click(button);

    expect(localStorage.getItem(SAMPLE_PREVIEW_DISMISSED)).toBeNull();
    expect(mockNavigate).toHaveBeenCalledWith('/books');
  });
});
