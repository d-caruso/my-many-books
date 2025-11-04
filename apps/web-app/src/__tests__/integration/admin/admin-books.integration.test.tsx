import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { BookManagementPage } from '../../../pages/Admin/BookManagementPage';

// Mock API service
const mockGetAdminBooks = vi.fn();
const mockUpdateAdminBook = vi.fn();
const mockDeleteAdminBook = vi.fn();

vi.mock('../../../contexts/ApiContext', async () => {
  const originalModule = await vi.importActual('../../../contexts/ApiContext');
  return {
    ...originalModule,
    useApi: () => ({
      apiService: {
        getAdminBooks: mockGetAdminBooks,
        updateAdminBook: mockUpdateAdminBook,
        deleteAdminBook: mockDeleteAdminBook,
      },
    }),
  };
});

// Test i18n instance
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
            delete_confirmation_message: 'Are you sure you want to delete "{{title}}"?',
          },
          title: 'Admin Panel',
          sidebar_title: 'Administration',
          menu: {
            dashboard: 'Dashboard',
            users: 'Users',
            books: 'Books',
            settings: 'Settings',
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

// Mock navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/admin/books' }),
  };
});

// Mock DataGrid
vi.mock('@mui/x-data-grid', () => ({
  DataGrid: (props: any) => {
    return (
      <div data-testid="data-grid">
        {props.rows.map((row: any) => (
          <div key={row.id} data-testid={`book-row-${row.id}`}>
            <span data-testid={`book-title-${row.id}`}>{row.title}</span>
            <span data-testid={`book-isbn-${row.id}`}>{row.isbnCode}</span>
            <span>{row.userName || 'No owner'}</span>
          </div>
        ))}
      </div>
    );
  },
}));

describe('Admin Book Management Integration', () => {
  const mockBooks = [
    {
      id: 1,
      title: 'The Great Gatsby',
      isbnCode: '9780743273565',
      editionNumber: 1,
      editionDate: '2004-09-30',
      status: 'reading',
      userId: 1,
      userName: 'John Doe',
      authors: [{ id: 1, name: 'F. Scott', surname: 'Fitzgerald', fullName: 'F. Scott Fitzgerald' }],
      categories: [{ id: 1, name: 'Fiction' }],
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    },
    {
      id: 2,
      title: '1984',
      isbnCode: '9780451524935',
      status: 'finished',
      userId: 2,
      userName: 'Jane Smith',
      authors: [{ id: 2, name: 'George', surname: 'Orwell', fullName: 'George Orwell' }],
      categories: [{ id: 2, name: 'Dystopian' }],
      createdAt: '2025-01-02T00:00:00Z',
      updatedAt: '2025-01-02T00:00:00Z',
    },
    {
      id: 3,
      title: 'To Kill a Mockingbird',
      isbnCode: '9780061120084',
      status: null,
      userId: null,
      userName: null,
      authors: [{ id: 3, name: 'Harper', surname: 'Lee', fullName: 'Harper Lee' }],
      categories: [{ id: 1, name: 'Fiction' }],
      createdAt: '2025-01-03T00:00:00Z',
      updatedAt: '2025-01-03T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAdminBooks.mockResolvedValue({
      books: mockBooks,
      pagination: { total: 3, page: 1, pageSize: 10 },
    });
    mockUpdateAdminBook.mockResolvedValue({});
    mockDeleteAdminBook.mockResolvedValue({});
  });

  const renderBookManagement = () => {
    return render(
      <BrowserRouter>
        <I18nextProvider i18n={testI18n}>
          <BookManagementPage />
        </I18nextProvider>
      </BrowserRouter>
    );
  };

  test('loads and displays book list', async () => {
    renderBookManagement();

    await waitFor(() => {
      expect(screen.getByTestId('book-row-1')).toBeInTheDocument();
      expect(screen.getByTestId('book-row-2')).toBeInTheDocument();
      expect(screen.getByTestId('book-row-3')).toBeInTheDocument();
    });

    expect(mockGetAdminBooks).toHaveBeenCalledTimes(1);
  });

  test('displays book details correctly', async () => {
    renderBookManagement();

    await waitFor(() => {
      expect(screen.getByText('The Great Gatsby')).toBeInTheDocument();
      expect(screen.getByText('9780743273565')).toBeInTheDocument();
      expect(screen.getByText('1984')).toBeInTheDocument();
      expect(screen.getByText('9780451524935')).toBeInTheDocument();
    });
  });

  test('renders page title and layout', async () => {
    renderBookManagement();

    expect(screen.getByText('Book Management')).toBeInTheDocument();
    expect(screen.getByText('Administration')).toBeInTheDocument();
  });

  test('handles search functionality', async () => {
    renderBookManagement();

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search by title, ISBN, or author...')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search by title, ISBN, or author...');
    const searchButton = screen.getByText('Search');

    fireEvent.change(searchInput, { target: { value: 'Gatsby' } });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(mockGetAdminBooks).toHaveBeenCalledWith(1, 10, 'Gatsby');
    });
  });

  test('handles API errors gracefully', async () => {
    mockGetAdminBooks.mockRejectedValue(new Error('Failed to load books'));

    renderBookManagement();

    await waitFor(() => {
      expect(screen.getByText('Failed to load books')).toBeInTheDocument();
    });
  });

  test('displays books with and without owners', async () => {
    renderBookManagement();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('No owner')).toBeInTheDocument();
    });
  });

  test('loads books on initial render', async () => {
    renderBookManagement();

    await waitFor(() => {
      expect(mockGetAdminBooks).toHaveBeenCalledWith(1, 10, undefined);
    });
  });

  test('displays all book titles from mock data', async () => {
    renderBookManagement();

    await waitFor(() => {
      expect(screen.getByTestId('book-title-1')).toHaveTextContent('The Great Gatsby');
      expect(screen.getByTestId('book-title-2')).toHaveTextContent('1984');
      expect(screen.getByTestId('book-title-3')).toHaveTextContent('To Kill a Mockingbird');
    });
  });
});
