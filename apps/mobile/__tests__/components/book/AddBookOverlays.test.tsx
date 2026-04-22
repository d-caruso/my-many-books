import React from 'react';
import renderer, { act } from 'react-test-renderer';

import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';

import { AddBookOverlays } from '@/components/book/AddBookOverlays';
import { bookAPI } from '@/services/api';
import { ISBN_NOTICE, SCANNER_COPY_STATUS } from '@/constants/scanner';

jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');

  return {
    ...actual,
    Modal: ({ children }: { children: React.ReactNode }) => children,
  };
});

jest.mock('expo-router', () => ({
  router: {
    replace: jest.fn(),
  },
}));

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(),
}));

jest.mock('@/services/api', () => ({
  bookAPI: {
    searchByISBN: jest.fn(),
  },
}));

jest.mock('@/components/scanner/BarcodeScannerPanel', () => ({
  BarcodeScannerPanel: ({
    onDetected,
  }: {
    onDetected: (isbn: string) => void | Promise<void>;
  }) => React.createElement('MockBarcodeScannerPanel', { onDetected }),
}));

jest.mock('@/components/ScannerErrorBoundary', () => ({
  ScannerErrorBoundary: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@/components/book/AddAuthorDialog', () => ({
  AddAuthorDialog: () => null,
}));

jest.mock('@/components/book/AddCategoryDialog', () => ({
  AddCategoryDialog: () => null,
}));

jest.mock('@/components/book/AuthorSelectorModal', () => ({
  AuthorSelectorModal: () => null,
}));

jest.mock('@/components/book/CategorySelectorModal', () => ({
  CategorySelectorModal: () => null,
}));

jest.mock('@/components/book/ManageAuthorsDialog', () => ({
  ManageAuthorsDialog: () => null,
}));

jest.mock('@/components/book/ManageCategoriesDialog', () => ({
  ManageCategoriesDialog: () => null,
}));

jest.mock('@/components/book/addBookStyles', () => ({
  useAddBookStyles: () => ({
    scannerModalContainer: {},
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

describe('AddBookOverlays — ISBN resolution routing', () => {
  const mockReplace = router.replace as jest.MockedFunction<typeof router.replace>;
  const mockSetStringAsync = Clipboard.setStringAsync as jest.MockedFunction<typeof Clipboard.setStringAsync>;
  const mockSearchByISBN = bookAPI.searchByISBN as jest.MockedFunction<typeof bookAPI.searchByISBN>;

  const createProps = () => ({
    scannerOpen: true,
    onScannerClose: jest.fn(),
    authorSelectorOpen: false,
    availableAuthors: [],
    selectedAuthorIds: [],
    authorsLoading: false,
    onCloseAuthorSelector: jest.fn(),
    onSelectAuthor: jest.fn(),
    onOpenAddAuthorFromSelector: jest.fn(),
    categorySelectorOpen: false,
    availableCategories: [],
    selectedCategoryIds: [],
    categoriesLoading: false,
    onCloseCategorySelector: jest.fn(),
    onToggleCategory: jest.fn(),
    onOpenAddCategoryFromSelector: jest.fn(),
    addAuthorDialogOpen: false,
    onCloseAddAuthorDialog: jest.fn(),
    onCreateAuthor: jest.fn(),
    manageAuthorsDialogOpen: false,
    onCloseManageAuthorsDialog: jest.fn(),
    onAuthorUpdated: jest.fn(),
    onAuthorDeleted: jest.fn(),
    addCategoryDialogOpen: false,
    onCloseAddCategoryDialog: jest.fn(),
    onCreateCategory: jest.fn(),
    manageCategoriesDialogOpen: false,
    onCloseManageCategoriesDialog: jest.fn(),
    onCategoryUpdated: jest.fn(),
    onCategoryDeleted: jest.fn(),
  });

  const getScannerNode = (tree: renderer.ReactTestRenderer) =>
    tree.root.find((node) => node.type === 'MockBarcodeScannerPanel');

  beforeEach(() => {
    jest.clearAllMocks();
    mockSetStringAsync.mockResolvedValue(undefined);
  });

  it('navigates to the edit screen when the scanned ISBN already belongs to the user', async () => {
    const props = createProps();
    mockSearchByISBN.mockResolvedValue({
      found: true,
      external: false,
      book: {
        id: 1,
        title: 'Iliad',
        isbnCode: '9780140449136',
        userId: 2,
        authors: [],
        categories: [],
      },
    });

    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<AddBookOverlays {...props} />);
    });

    await act(async () => {
      await getScannerNode(tree).props.onDetected('9780140449136');
    });

    expect(props.onScannerClose).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/book/edit/[id]',
      params: {
        id: '1',
        fromIsbnScan: '1',
        scannerCopy: SCANNER_COPY_STATUS.SUCCESS,
      },
    });
  });

  it('navigates to add-book with a serialized external prefill when metadata is found', async () => {
    const props = createProps();
    mockSearchByISBN.mockResolvedValue({
      found: true,
      external: true,
      book: {
        title: 'Iliad',
        isbnCode: '9780140449136',
        authorIds: [10],
        categoryIds: [5],
        createdAuthorIds: [10],
        createdCategoryIds: [],
      },
    });

    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<AddBookOverlays {...props} />);
    });

    await act(async () => {
      await getScannerNode(tree).props.onDetected('9780140449136');
    });

    expect(props.onScannerClose).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledTimes(1);

    const route = mockReplace.mock.calls[0][0] as {
      pathname: string;
      params: { isbn: string; scannerCopy: string; prefill?: string };
    };

    expect(route.pathname).toBe('/book/add');
    expect(route.params.isbn).toBe('9780140449136');
    expect(route.params.scannerCopy).toBe(SCANNER_COPY_STATUS.SUCCESS);
    expect(route.params.prefill).toBeDefined();
    expect(
      JSON.parse(decodeURIComponent(route.params.prefill as string))
    ).toEqual(
      expect.objectContaining({
        title: 'Iliad',
        authorIds: [10],
        categoryIds: [5],
        createdAuthorIds: [10],
        createdCategoryIds: [],
      })
    );
  });

  it('navigates to add-book with no prefill when ISBN metadata is not found', async () => {
    const props = createProps();
    mockSearchByISBN.mockResolvedValue({ found: false });

    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<AddBookOverlays {...props} />);
    });

    await act(async () => {
      await getScannerNode(tree).props.onDetected('9780140449136');
    });

    expect(props.onScannerClose).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/book/add',
      params: {
        isbn: '9780140449136',
        isbnNotice: ISBN_NOTICE.VALID_NO_METADATA,
        scannerCopy: SCANNER_COPY_STATUS.SUCCESS,
      },
    });
  });
});
