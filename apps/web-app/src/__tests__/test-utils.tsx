import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Create a test i18n instance
const createTestI18n = () => {
  const testI18n = i18n.createInstance();

  testI18n
    .use(initReactI18next)
    .init({
      lng: 'en',
      fallbackLng: 'en',
      ns: ['common', 'validation', 'errors', 'books', 'scanner', 'pwa', 'dialogs', 'pages', 'theme', 'search', 'auth'],
      defaultNS: 'common',
      resources: {
        en: {
          common: {
            app_name: 'My Many Books',
            search: 'Search',
            scanner: 'Scanner',
            sign_out: 'Sign out',
            loading: 'Loading...',
          },
          validation: {},
          errors: {},
          books: {
            my_books: 'My Books',
            search_error: 'Search Error',
            no_books_found: 'No books found',
            try_adjusting: 'Try adjusting your search terms or filters',
            showing_results_one: 'Showing {{current}} of {{total}} book',
            showing_results_other: 'Showing {{current}} of {{total}} books',
            load_more_books: 'Load More Books',
            searching_for_books: 'Searching for books...',
            unknown_author: 'Unknown Author',
            reading: 'Reading',
            paused: 'Paused',
            finished: 'Finished',
            edition: 'Edition',
            more: 'more',
          },
          scanner: {
            manual: {
              title: 'Enter ISBN',
              placeholder: 'Enter ISBN (10 or 13 digits)',
              submit: 'Search',
              cancel: 'Cancel',
            },
            camera: {
              title: 'Scan Book Barcode',
              instructions: 'Position the barcode within the frame',
              switch_to_manual: 'Enter ISBN manually',
              close: 'Close',
            },
          },
          pwa: {
            install: {
              title: 'Install My Many Books',
              description: 'Install this app on your device for a better experience',
              install: 'Install',
              later: 'Maybe Later',
            },
            update: {
              title: 'Update Available',
              description: 'A new version is available',
              update: 'Update',
              later: 'Later',
            },
            offline: {
              message: 'You are currently offline',
            },
          },
          dialogs: {
            add_author: {
              title: 'Add New Author',
              name_label: 'Name',
              name_placeholder: "Author's first name",
              surname_label: 'Surname',
              surname_placeholder: "Author's last name",
              cancel: 'Cancel',
              add: 'Add Author',
            },
            add_category: {
              title: 'Add New Category',
              name_label: 'Category Name',
              name_placeholder: 'Enter category name',
              cancel: 'Cancel',
              add: 'Add Category',
            },
          },
          pages: {
            books: {
              title: 'My Books',
              description: 'Your personal book collection',
              description_with_count_one: '{{count}} book in your library',
              description_with_count_other: '{{count}} books in your library',
              add_book: 'Add Book',
              add: 'Add',
              clear_search: 'Clear search',
              grid_view: 'Grid view',
              list_view: 'List view',
              no_books_search: 'No books found matching your search',
              no_books_empty: 'No books in your library yet',
              loading: 'Loading...',
              load_more: 'Load More Books',
              error_load_books: 'Failed to load your books',
            },
            protected_route: {
              loading: 'Loading...',
            },
          },
          theme: {
            selector: {
              title: 'Choose Theme',
              current: 'Current theme',
            },
            settings: {
              title: 'Theme Settings',
              description: 'Customize your reading experience',
              theme_label: 'Color Theme',
            },
          },
          search: {
            form: {
              placeholder: 'Search by title, author, ISBN...',
              search_button: 'Search',
              searching: 'Searching...',
              advanced_filters: 'Advanced Filters',
              clear_all: 'Clear all',
              validation_error: 'Please enter at least 2 characters in the search box or select an advanced filter.',
              author_placeholder: 'Search by author name...',
              category_label: 'Category',
              category_loading: 'Loading categories...',
              category_all: 'All Categories',
              status_label: 'Reading Status',
              status_any: 'Any Status',
              status_reading: 'Reading',
              status_paused: 'Paused',
              status_finished: 'Finished',
              sort_label: 'Sort By',
              sort_title: 'Title (A-Z)',
              sort_author: 'Author (A-Z)',
              sort_date: 'Recently Added',
            },
            results: {
              showing_count_one: 'Showing {{count}} of {{total}} book',
              showing_count_other: 'Showing {{count}} of {{total}} books',
            },
            filter: {
              title: 'Filters',
              sort: {
                title_asc: 'Title A-Z',
                title_desc: 'Title Z-A',
                author_asc: 'Author A-Z',
                author_desc: 'Author Z-A',
                date_newest: 'Date Added (Newest)',
                rating_highest: 'Rating (Highest)',
              },
              status: {
                label: 'Status',
                all: 'All Books',
                reading: 'Reading',
                paused: 'Paused',
                finished: 'Finished',
              },
              category: {
                label: 'Category',
                all: 'All Categories',
              },
              author: {
                label: 'Author',
                all: 'All Authors',
              },
              clear_all: 'Clear All Filters',
              results_count: '{{filtered}} of {{total}} books',
              results_total: '{{total}} books',
              no_books: 'No books found',
            },
          },
          auth: {
            login: {
              title: 'Login',
              email: 'Email',
              password: 'Password',
              submit: 'Login',
              no_account: "Don't have an account?",
              register: 'Register',
            },
            register: {
              title: 'Register',
              username: 'Username',
              email: 'Email',
              password: 'Password',
              confirm_password: 'Confirm Password',
              submit: 'Register',
              have_account: 'Already have an account?',
              login: 'Login',
            },
          },
        },
      },
      interpolation: {
        escapeValue: false,
      },
    });

  return testI18n;
};

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  i18nInstance?: typeof i18n;
}

/**
 * Custom render function that wraps components with I18nextProvider
 */
export function renderWithI18n(
  ui: ReactElement,
  options?: CustomRenderOptions
) {
  const { i18nInstance = createTestI18n(), ...renderOptions } = options || {};

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <I18nextProvider i18n={i18nInstance}>
        {children}
      </I18nextProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

/**
 * Mock translation function for tests that don't need full i18n
 */
export const mockT = (key: string, options?: any) => {
  if (options && typeof options === 'object') {
    let result = key;
    Object.keys(options).forEach(optKey => {
      result = result.replace(`{{${optKey}}}`, options[optKey]);
    });
    return result;
  }
  return key;
};

// Re-export everything from testing library
export * from '@testing-library/react';
export { renderWithI18n as render };
