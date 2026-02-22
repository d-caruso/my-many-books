import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { BookForm } from '../../../components/Book/BookForm';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../../../hooks/useCategories', () => ({
  useCategories: () => ({
    categories: [],
    loading: false,
    loadCategories: vi.fn(),
  }),
}));

vi.mock('../../../components/Search/AuthorAutocomplete', () => ({
  AuthorAutocomplete: () => <div data-testid="author-autocomplete" />,
}));

vi.mock('../../../components/Author/AddAuthorDialog', () => ({
  AddAuthorDialog: () => null,
}));

vi.mock('../../../components/Category/AddCategoryDialog', () => ({
  AddCategoryDialog: () => null,
}));

const testI18n = i18n.createInstance();
const i18nReady = testI18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  ns: ['books', 'common'],
  defaultNS: 'books',
  resources: {
    en: {
      books: {
        add_new_book: 'Add New Book',
        title: 'Title',
        enter_book_title: 'Enter title',
        isbn: 'ISBN',
        isbn_placeholder: 'Enter ISBN',
        scan_isbn: 'Scan ISBN',
        author: 'Author',
        search_add_authors: 'Search authors',
        reading_status: 'Reading Status',
        reading: 'Reading',
        paused: 'Paused',
        finished: 'Finished',
        categories: 'Categories',
        loading_categories: 'Loading categories',
        edition_number: 'Edition Number',
        edition_date: 'Edition Date',
        notes: 'Notes',
        save_book: 'Save Book',
        update_book: 'Update Book',
      },
      common: {
        close: 'Close',
        add: 'Add',
        cancel: 'Cancel',
        save: 'Save',
      },
    },
  },
  interpolation: { escapeValue: false },
});

const renderBookForm = () =>
  render(
    <I18nextProvider i18n={testI18n}>
      <BookForm onSubmit={vi.fn().mockResolvedValue(undefined)} onCancel={vi.fn()} />
    </I18nextProvider>
  );

describe('BookForm', () => {
  beforeAll(async () => {
    await i18nReady;
  });

  beforeEach(() => {
    mockNavigate.mockClear();
  });

  test('renders scan isbn button next to isbn field and navigates to scanner', () => {
    renderBookForm();

    const scanButton = screen.getByRole('button', { name: /scan isbn/i });
    expect(scanButton).toBeInTheDocument();

    fireEvent.click(scanButton);
    expect(mockNavigate).toHaveBeenCalledWith('/scanner?returnTo=add-book');
  });
});
