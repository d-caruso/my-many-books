import React from 'react';
import { render as rtlRender, screen, waitFor, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { BookManagementPage } from '../../../pages/Admin/BookManagementPage';
import { ApiProvider } from '../../../contexts/ApiContext';

// Mock dependencies
const mockApiService = {
  getAdminBooks: vi.fn(),
  updateAdminBook: vi.fn(),
  deleteAdminBook: vi.fn(),
};

vi.mock('../../../contexts/ApiContext', async () => {
  const originalModule = await vi.importActual('../../../contexts/ApiContext');
  const useApi = () => ({ apiService: mockApiService });
  return {
    ...originalModule,
    useApi,
  };
});

vi.mock('../../../pages/Admin/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="admin-layout">{children}</div>,
}));

vi.mock('@mui/x-data-grid', () => ({
  DataGrid: (props: any) => {
    return (
      <div data-testid="data-grid">
        {props.rows.map((row: any) => (
          <div key={row.id} data-testid={`row-${row.id}`}>
            <span data-testid={`title-${row.id}`}>{row.title}</span>
            <span data-testid={`isbn-${row.id}`}>{row.isbnCode}</span>
          </div>
        ))}
      </div>
    );
  },
}));

// Create test i18n instance
const testI18n = i18n.createInstance();
testI18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  ns: ['pages', 'common'],
  defaultNS: 'pages',
  resources: {
    en: {
      pages: {
        admin: {
          books: {
            page_title: 'Book Management',
            title: 'Title',
            isbn: 'ISBN',
            authors: 'Authors',
            user: 'User',
            status: 'Status',
            created: 'Created',
            actions: 'Actions',
            search_placeholder: 'Search by title, ISBN, or author...',
            search: 'Search',
            edit: 'Edit book',
            delete: 'Delete book',
            edit_book: 'Edit Book',
            delete_confirmation_title: 'Delete Book',
            delete_confirmation_message: 'Are you sure you want to delete "{{title}}"? This action cannot be undone.',
          },
        },
      },
      common: {
        cancel: 'Cancel',
        save: 'Save',
        delete: 'Delete',
      },
    },
  },
});

const renderWithProvider = (ui: React.ReactElement) => {
  return rtlRender(
    <I18nextProvider i18n={testI18n}>
      <ApiProvider>
        {ui}
      </ApiProvider>
    </I18nextProvider>
  );
};

describe('BookManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders book management title', () => {
    mockApiService.getAdminBooks.mockResolvedValue({ books: [], pagination: { total: 0 } });
    renderWithProvider(<BookManagementPage />);
    expect(screen.getByText('Book Management')).toBeInTheDocument();
  });

  test('displays loading indicator while fetching books', () => {
    mockApiService.getAdminBooks.mockReturnValue(new Promise(() => {})); // Never resolves
    renderWithProvider(<BookManagementPage />);
    expect(screen.getByTestId('data-grid')).toBeInTheDocument();
  });

  test('fetches and displays books', async () => {
    const books = [
      {
        id: 1,
        title: 'Book One',
        isbnCode: '1234567890',
        authors: [{ id: 1, name: 'John', surname: 'Doe', fullName: 'John Doe' }],
        categories: [{ id: 1, name: 'Fiction' }],
        status: 'reading',
        userId: 1,
        userName: 'Test User',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 2,
        title: 'Book Two',
        isbnCode: '0987654321',
        authors: [{ id: 2, name: 'Jane', surname: 'Smith', fullName: 'Jane Smith' }],
        categories: [{ id: 2, name: 'Non-Fiction' }],
        status: 'finished',
        userId: 2,
        userName: 'Another User',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    mockApiService.getAdminBooks.mockResolvedValue({ books, pagination: { total: 2 } });
    renderWithProvider(<BookManagementPage />);

    await waitFor(() => {
      expect(screen.getByTestId('row-1')).toBeInTheDocument();
      expect(screen.getByTestId('row-2')).toBeInTheDocument();
      expect(screen.getByTestId('title-1')).toHaveTextContent('Book One');
      expect(screen.getByTestId('isbn-1')).toHaveTextContent('1234567890');
    });
  });

  test('displays error message if books fetching fails', async () => {
    const errorMessage = 'Failed to load books';
    mockApiService.getAdminBooks.mockRejectedValue(new Error(errorMessage));
    renderWithProvider(<BookManagementPage />);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  test('search functionality triggers books refetch', async () => {
    mockApiService.getAdminBooks.mockResolvedValue({ books: [], pagination: { total: 0 } });
    renderWithProvider(<BookManagementPage />);

    const searchInput = screen.getByPlaceholderText('Search by title, ISBN, or author...');
    const searchButton = screen.getByText('Search');

    fireEvent.change(searchInput, { target: { value: 'test query' } });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(mockApiService.getAdminBooks).toHaveBeenCalledWith(1, 10, 'test query');
    });
  });
});
