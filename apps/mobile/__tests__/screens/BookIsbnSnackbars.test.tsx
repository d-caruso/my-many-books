import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { router, useLocalSearchParams } from 'expo-router';

import AddBookScreen from '../../app/book/add';
import EditBookScreen from '../../app/book/edit/[id]';
import { useBooks } from '@/hooks/useBooks';
import { useBookSearch } from '@/hooks/useBookSearch';
import { useNetworkState } from '@/hooks/useNetworkState';
import { useAddBookEntities } from '@/hooks/useAddBookEntities';
import enBooks from '@my-many-books/shared-i18n/src/locales/en/books.json';
import enCommon from '@my-many-books/shared-i18n/src/locales/en/common.json';

jest.mock('react-i18next', () => {
  const mockBooks = jest.requireActual('@my-many-books/shared-i18n/src/locales/en/books.json') as Record<string, string>;
  const mockCommon = jest.requireActual('@my-many-books/shared-i18n/src/locales/en/common.json') as Record<string, string>;

  const interpolate = (template: string, options?: Record<string, unknown>) => {
    if (!options) {
      return template;
    }

    return Object.entries(options).reduce((message, [key, value]) => {
      return message.replace(`{{${key}}}`, String(value));
    }, template);
  };

  const translate = (key: string, options?: Record<string, unknown>) => {
    const dictionaries: Record<string, Record<string, string>> = {
      books: mockBooks,
      common: mockCommon,
    };

    if (key.includes(':')) {
      const [namespace, lookupKey] = key.split(':', 2);
      const match = dictionaries[namespace]?.[lookupKey];
      return typeof match === 'string' ? interpolate(match, options) : key;
    }

    if (key in mockCommon) {
      return interpolate(mockCommon[key], options);
    }

    if (key in mockBooks) {
      return interpolate(mockBooks[key], options);
    }

    return key;
  };

  return {
    useTranslation: () => ({
      t: translate,
      i18n: {
        language: 'en',
        changeLanguage: jest.fn(() => Promise.resolve()),
      },
    }),
    Trans: ({ children }: { children: React.ReactNode }) => children,
    initReactI18next: { type: '3rdParty', init: jest.fn() },
  };
});

jest.mock('react-native', () => {
  const ReactModule = jest.requireActual('react') as typeof import('react');
  const actual = jest.requireActual('react-native');

  return {
    ...actual,
    KeyboardAvoidingView: ({ children, ...props }: { children: React.ReactNode }) =>
      ReactModule.createElement('KeyboardAvoidingView', props, children),
  };
});

jest.mock('@/hooks/useBooks');
jest.mock('@/hooks/useBookSearch');
jest.mock('@/hooks/useNetworkState');
jest.mock('@/hooks/useAddBookEntities');

jest.mock('@/components/EditionDateInput', () => ({
  EditionDateInput: () => null,
}));

jest.mock('@/components/book/AuthorsSection', () => ({
  AuthorsSection: () => null,
}));

jest.mock('@/components/book/CategoriesSection', () => ({
  CategoriesSection: () => null,
}));

jest.mock('@/components/book/AddBookOverlays', () => ({
  AddBookOverlays: () => null,
}));

jest.mock('@/utils/isbnScannerRouting', () => ({
  deserializeExternalBookPrefill: (rawPrefill?: string | string[]) => {
    const encodedPrefill = Array.isArray(rawPrefill) ? rawPrefill[0] : rawPrefill;

    if (!encodedPrefill) {
      return null;
    }

    return JSON.parse(decodeURIComponent(encodedPrefill));
  },
}));

jest.mock('@/components/book/addBookStyles', () => ({
  useAddBookStyles: () => ({
    container: {},
    keyboardAvoidingView: {},
    scrollView: {},
    card: {},
    title: {},
    errorContainer: {},
    errorText: {},
    isbnSection: {},
    isbnInput: {},
    isbnActionButtons: {},
    input: {},
    lookupButton: {},
    scanButton: {},
    sectionTitle: {},
    segmentedButtons: {},
    buttonContainer: {},
    button: {},
    offlineHint: {},
  }),
}));

jest.mock('@/services/hooks/mobileHooks', () => ({
  mobileHooks: {
    emit: jest.fn(),
  },
  MOBILE_EVENTS: {
    ERROR: {
      VALIDATION: 'validation',
      API_RESPONSE: 'api_response',
    },
  },
  RESOURCE_TYPES: {
    BOOK: 'book',
  },
}));

jest.mock('@/services/hooks/eventsSchema', () => ({
  OPERATION_TYPES: {
    CREATE: 'create',
    UPDATE: 'update',
  },
}));

const mockUseLocalSearchParams = useLocalSearchParams as jest.MockedFunction<typeof useLocalSearchParams>;
const mockUseBooks = useBooks as jest.MockedFunction<typeof useBooks>;
const mockUseBookSearch = useBookSearch as jest.MockedFunction<typeof useBookSearch>;
const mockUseNetworkState = useNetworkState as jest.MockedFunction<typeof useNetworkState>;
const mockUseAddBookEntities = useAddBookEntities as jest.MockedFunction<typeof useAddBookEntities>;

const createEncodedPrefill = (prefill: object): string =>
  encodeURIComponent(JSON.stringify(prefill));

const interpolate = (template: string, params: Record<string, string | number>): string =>
  Object.entries(params).reduce((message, [key, value]) => {
    return message.replace(`{{${key}}}`, String(value));
  }, template);

const isSnackbarNode = (node: renderer.ReactTestInstance): boolean => {
  if (typeof node.type === 'string') {
    return node.type === 'Snackbar';
  }

  return typeof node.type === 'object' && node.type !== null && 'displayName' in node.type
    ? (node.type as { displayName?: string }).displayName === 'Snackbar'
    : false;
};

const getSnackbar = (tree: renderer.ReactTestRenderer): renderer.ReactTestInstance =>
  tree.root.find(isSnackbarNode);

describe('Mobile ISBN snackbars', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseLocalSearchParams.mockReturnValue({});
    mockUseNetworkState.mockReturnValue({
      isOnline: true,
      isInternetReachable: true,
      connectionType: 'wifi',
    });
    mockUseBookSearch.mockReturnValue({
      books: [],
      loading: false,
      error: null,
      hasMore: false,
      totalCount: 0,
      currentPage: 1,
      isOffline: false,
      searchBooks: jest.fn(),
      searchByISBN: jest.fn(),
      clearSearch: jest.fn(),
      loadMore: jest.fn(),
    });
    mockUseAddBookEntities.mockReturnValue({
      availableAuthors: [],
      availableCategories: [],
      selectedAuthors: [],
      selectedCategoryIds: [],
      authorsLoading: false,
      categoriesLoading: false,
      categoriesSorting: false,
      setSelectedAuthors: jest.fn(),
      setSelectedCategoryIds: jest.fn(),
      loadAuthors: jest.fn(),
      loadCategories: jest.fn(),
      selectAuthor: jest.fn(),
      removeAuthor: jest.fn(),
      toggleCategory: jest.fn(),
      createAuthorAndSelect: jest.fn(),
      createCategoryAndSelect: jest.fn(),
      handleAuthorUpdated: jest.fn(),
      handleAuthorDeleted: jest.fn(),
      handleCategoryUpdated: jest.fn(),
      handleCategoryDeleted: jest.fn(),
    });
    mockUseBooks.mockReturnValue({
      books: [],
      loading: false,
      error: null,
      refreshing: false,
      loadBooks: jest.fn(),
      refreshBooks: jest.fn(),
      createBook: jest.fn(),
      updateBook: jest.fn(),
      deleteBook: jest.fn(),
      updateBookStatus: jest.fn(),
      resolveConflict: jest.fn(),
    });
  });

  it('shows metadata-loaded snackbar when arriving with external prefill', async () => {
    mockUseLocalSearchParams.mockReturnValue({
      prefill: createEncodedPrefill({
        title: 'Iliad',
        isbnCode: '9780140449136',
        authorIds: [],
        categoryIds: [],
        createdAuthorIds: [],
        createdCategoryIds: [],
      }),
    });

    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<AddBookScreen />);
    });

    const snackbar = getSnackbar(tree);
    expect(snackbar.props.visible).toBe(true);
    expect(snackbar.props.children).toBe(enBooks.isbn_metadata_loaded);
  });

  it('queues the auto-created snackbar after the metadata-loaded snackbar', async () => {
    mockUseLocalSearchParams.mockReturnValue({
      prefill: createEncodedPrefill({
        title: 'Iliad',
        isbnCode: '9780140449136',
        authorIds: [10],
        categoryIds: [5, 9],
        createdAuthorIds: [10],
        createdCategoryIds: [5, 9],
      }),
    });

    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<AddBookScreen />);
    });

    let snackbar = getSnackbar(tree);
    expect(snackbar.props.children).toBe(enBooks.isbn_metadata_loaded);

    await act(async () => {
      snackbar.props.onDismiss();
    });

    snackbar = getSnackbar(tree);
    expect(snackbar.props.visible).toBe(true);
    expect(snackbar.props.children).toBe(
      interpolate(enBooks.isbn_entities_auto_created, {
        authors: 1,
        categories: 2,
      })
    );
  });

  it('shows the valid-no-metadata snackbar on add screen when the scanner route carries isbnNotice', async () => {
    mockUseLocalSearchParams.mockReturnValue({
      isbn: '9780140449136',
      isbnNotice: 'valid_no_metadata',
    });

    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<AddBookScreen />);
    });

    const snackbar = getSnackbar(tree);
    expect(snackbar.props.visible).toBe(true);
    expect(snackbar.props.children).toBe(enBooks.isbn_valid_no_metadata);
    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/book/add',
      params: {
        isbn: '9780140449136',
      },
    });
  });

  it('shows the owned-book snackbar on edit screen when arriving from scanner', async () => {
    mockUseLocalSearchParams.mockReturnValue({
      id: '1',
      fromIsbnScan: '1',
    });
    mockUseBooks.mockReturnValue({
      books: [
        {
          id: 1,
          title: 'Iliad',
          isbnCode: '9780140449136',
          authors: [],
          categories: [],
          meta: {},
        },
      ],
      loading: false,
      error: null,
      refreshing: false,
      loadBooks: jest.fn(),
      refreshBooks: jest.fn(),
      createBook: jest.fn(),
      updateBook: jest.fn(),
      deleteBook: jest.fn(),
      updateBookStatus: jest.fn(),
      resolveConflict: jest.fn(),
    });

    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<EditBookScreen />);
    });

    const snackbar = getSnackbar(tree);
    expect(snackbar.props.visible).toBe(true);
    expect(snackbar.props.children).toBe(enBooks.isbn_owned_book_found);
    expect(snackbar.props.action.label).toBe(enCommon.ok);
    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/book/edit/[id]',
      params: {
        id: '1',
      },
    });
  });
});
