import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { BooksPage } from '../../pages/BooksPage';
import { useAuth } from '../../contexts/AuthContext';

// Mock the useAuth hook
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock API services
jest.mock('../../services/api', () => ({
  bookAPI: {
    getBooks: jest.fn(),
    deleteBook: jest.fn(),
  },
  categoryAPI: {
    getCategories: jest.fn(),
  },
  authorAPI: {
    getAuthors: jest.fn(),
  },
}));

// Mock Material-UI components
jest.mock('@mui/material', () => ({
  Box: ({ children, sx, ...props }: any) => (
    <div data-testid="box" style={sx} {...props}>{children}</div>
  ),
  Container: ({ children, maxWidth, ...props }: any) => (
    <div data-testid="container" data-maxwidth={maxWidth} {...props}>{children}</div>
  ),
  Typography: ({ children, variant, ...props }: any) => (
    <div data-testid={`typography-${variant}`} {...props}>{children}</div>
  ),
  Button: ({ children, onClick, variant, startIcon, endIcon, ...props }: any) => (
    <button
      data-testid={`button-${variant || 'default'}`}
      onClick={onClick}
      {...props}
    >
      {startIcon && <span data-testid="start-icon">{startIcon}</span>}
      {children}
      {endIcon && <span data-testid="end-icon">{endIcon}</span>}
    </button>
  ),
  Grid: ({ children, container, item, xs, sm, md, spacing, ...props }: any) => (
    <div 
      data-testid="grid" 
      data-container={container}
      data-item={item}
      data-xs={xs}
      data-sm={sm}
      data-md={md}
      data-spacing={spacing}
      {...props}
    >
      {children}
    </div>
  ),
  CircularProgress: (props: any) => (
    <div data-testid="circular-progress" {...props} />
  ),
  Alert: ({ children, severity, ...props }: any) => (
    <div data-testid={`alert-${severity}`} {...props}>{children}</div>
  ),
  Fab: ({ children, color, onClick, ...props }: any) => (
    <button data-testid="fab" data-color={color} onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

// Mock Material-UI icons
jest.mock('@mui/icons-material', () => ({
  Add: () => <div data-testid="add-icon">Add</div>,
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('BooksPage', () => {
  const mockBooks = [
    {
      id: 1,
      title: 'Test Book 1',
      isbn: '9780747532699',
      author: { id: 1, name: 'John', surname: 'Doe' },
      category: { id: 1, name: 'Fiction' },
      description: 'A great book',
      publicationYear: 2020,
      pages: 250,
      publisher: 'Test Publisher',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseAuth.mockReturnValue({
      user: { id: 1, email: 'test@example.com', name: 'Test User' },
      loading: false,
      login: jest.fn(),
      logout: jest.fn(),
      signup: jest.fn(),
    });

    const { bookAPI, categoryAPI, authorAPI } = require('../../services/api');
    bookAPI.getBooks.mockResolvedValue({ data: mockBooks, total: 1, page: 1, limit: 10 });
    categoryAPI.getCategories.mockResolvedValue([]);
    authorAPI.getAuthors.mockResolvedValue([]);
  });

  test('renders books page', async () => {
    render(
      <BooksPage />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByText('My Books')).toBeInTheDocument();
    expect(screen.getByTestId('circular-progress')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Test Book 1')).toBeInTheDocument();
    });
  });

  test('shows loading state initially', () => {
    render(
      <BooksPage />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByTestId('circular-progress')).toBeInTheDocument();
  });

  test('renders add book button', async () => {
    render(
      <BooksPage />,
      { wrapper: TestWrapper }
    );

    await waitFor(() => {
      expect(screen.getByTestId('fab')).toBeInTheDocument();
      expect(screen.getByTestId('add-icon')).toBeInTheDocument();
    });
  });

  test('shows error message when books fail to load', async () => {
    const { bookAPI } = require('../../services/api');
    bookAPI.getBooks.mockRejectedValue(new Error('Failed to load books'));

    render(
      <BooksPage />,
      { wrapper: TestWrapper }
    );

    await waitFor(() => {
      expect(screen.getByTestId('alert-error')).toBeInTheDocument();
      expect(screen.getByText('Failed to load books')).toBeInTheDocument();
    });
  });

  test('shows empty state when no books', async () => {
    const { bookAPI } = require('../../services/api');
    bookAPI.getBooks.mockResolvedValue({ data: [], total: 0, page: 1, limit: 10 });

    render(
      <BooksPage />,
      { wrapper: TestWrapper }
    );

    await waitFor(() => {
      expect(screen.getByText('No books found')).toBeInTheDocument();
    });
  });

  test('renders book information correctly', async () => {
    render(
      <BooksPage />,
      { wrapper: TestWrapper }
    );

    await waitFor(() => {
      expect(screen.getByText('Test Book 1')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Fiction')).toBeInTheDocument();
      expect(screen.getByText('2020')).toBeInTheDocument();
    });
  });

  test('has responsive layout', async () => {
    render(
      <BooksPage />,
      { wrapper: TestWrapper }
    );

    await waitFor(() => {
      const grids = screen.getAllByTestId('grid');
      expect(grids.length).toBeGreaterThan(0);
    });
  });
});