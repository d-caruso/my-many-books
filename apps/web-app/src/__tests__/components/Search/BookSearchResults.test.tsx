import React from 'react';
import { render, screen, fireEvent, within } from '../../../__tests__/test-utils';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { BookSearchResults } from '../../../components/Search/BookSearchResults';
import { Book } from '../../../types';
import { setupMuiMock } from '../../test-utils/setupMuiMock';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

// Mock Material-UI components
setupMuiMock();

// Mock Material-UI icons
vi.mock('@mui/icons-material/Error', () => ({
  default: () => <div data-testid="error-icon">Error</div>,
}));

vi.mock('@mui/icons-material/MenuBook', () => ({
  default: () => <div data-testid="menu-book-icon">Book</div>,
}));

const mockBooks: Book[] = [
  {
    id: 1,
    title: 'The Great Gatsby',
    authors: [{ id: 1, name: 'F. Scott', surname: 'Fitzgerald' }],
    isbnCode: '9780743273565',
    status: 'finished',
    categories: [
      { id: 1, name: 'Fiction' },
      { id: 2, name: 'Classic' }
    ],
    editionNumber: 1,
    editionDate: '2004-09-30',
  },
  {
    id: 2,
    title: 'To Kill a Mockingbird',
    authors: [{ id: 2, name: 'Harper', surname: 'Lee' }],
    isbnCode: '9780061120084',
    status: 'reading',
    categories: [
      { id: 1, name: 'Fiction' },
      { id: 3, name: 'Drama' },
      { id: 4, name: 'Coming of Age' }
    ],
    editionNumber: 2,
    editionDate: '2006-05-23',
  },
  {
    id: 3,
    title: 'Book Without Authors',
    authors: [],
    isbnCode: '9781234567890',
    status: 'paused',
    categories: [],
  },
  {
    id: 4,
    title: 'Book With String Authors',
    authors: ['Author One', 'Author Two'] as any,
    isbnCode: '9780987654321',
    status: 'reading',
    categories: [{ id: 5, name: 'Non-Fiction' }],
  },
];

describe('BookSearchResults', () => {
  const mockOnLoadMore = vi.fn();
  const mockOnBookSelect = vi.fn();

  const defaultProps = {
    books: [],
    loading: false,
    error: null,
    totalCount: 0,
    hasMore: false,
    onLoadMore: mockOnLoadMore,
    onBookSelect: mockOnBookSelect,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders error state with i18n fallback for unknown errors', () => {
    render(
      <BookSearchResults
        {...defaultProps}
        error="Search failed"
      />
    );

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent('Search Error');
    expect(alert).toHaveTextContent('Something went wrong while searching. Please try again later.');
    expect(screen.getByTestId('error-icon')).toBeInTheDocument();
  });

  test('renders error state with i18n key for known error codes', () => {
    render(
      <BookSearchResults
        {...defaultProps}
        error="SEARCH_UNEXPECTED_ERROR"
      />
    );

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent('Something went wrong while searching. Please try again later.');
  });

  test('renders no books found state', () => {
    render(<BookSearchResults {...defaultProps} />);

    expect(screen.getByTestId('menu-book-icon')).toBeInTheDocument();
    expect(screen.getByText('No books found')).toBeInTheDocument();
    expect(screen.getByText('Try adjusting your search terms or filters')).toBeInTheDocument();
  });

  test('does not render no books found when loading', () => {
    render(
      <BookSearchResults
        {...defaultProps}
        loading={true}
      />
    );

    expect(screen.queryByText('No books found')).not.toBeInTheDocument();
  });

  test('renders results header with count', () => {
    render(
      <BookSearchResults
        {...defaultProps}
        books={mockBooks.slice(0, 2)}
        totalCount={10}
      />
    );

    expect(screen.getByText('Showing 2 of 10 books')).toBeInTheDocument();
  });

  test('renders singular book count correctly', () => {
    render(
      <BookSearchResults
        {...defaultProps}
        books={mockBooks.slice(0, 1)}
        totalCount={1}
      />
    );

    expect(screen.getByText('Showing 1 of 1 book')).toBeInTheDocument();
  });

  test('renders book cards', () => {
    render(
      <BookSearchResults
        {...defaultProps}
        books={mockBooks.slice(0, 2)}
        totalCount={2}
      />
    );

    expect(screen.getByText('The Great Gatsby')).toBeInTheDocument();
    expect(screen.getByText('To Kill a Mockingbird')).toBeInTheDocument();
    expect(screen.getByText('F. Scott Fitzgerald')).toBeInTheDocument();
    expect(screen.getByText('Harper Lee')).toBeInTheDocument();
  });

  test('handles book selection', () => {
    render(
      <BookSearchResults
        {...defaultProps}
        books={mockBooks.slice(0, 1)}
        totalCount={1}
      />
    );

    const bookTitle = screen.getByText('The Great Gatsby');
    fireEvent.click(bookTitle);

    expect(mockOnBookSelect).toHaveBeenCalledWith(mockBooks[0]);
  });

  test('renders load more button when hasMore is true', () => {
    render(
      <BookSearchResults
        {...defaultProps}
        books={mockBooks.slice(0, 2)}
        totalCount={10}
        hasMore={true}
      />
    );

    const loadMoreButton = screen.getByText('Load More Books');
    expect(loadMoreButton).toBeInTheDocument();
    
    fireEvent.click(loadMoreButton);
    expect(mockOnLoadMore).toHaveBeenCalledTimes(1);
  });

  test('shows loading state on load more button', () => {
    render(
      <BookSearchResults
        {...defaultProps}
        books={mockBooks.slice(0, 2)}
        totalCount={10}
        hasMore={true}
        loading={true}
      />
    );

    const loadMoreButton = screen.getByRole('button', { name: /loading/i });
    expect(loadMoreButton).toBeDisabled();
    expect(within(loadMoreButton).getByRole('progressbar')).toBeInTheDocument();
  });

  test('renders initial loading state', () => {
    render(
      <BookSearchResults
        {...defaultProps}
        loading={true}
      />
    );

    expect(screen.getByText('Searching for books...')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('renders book status badges', () => {
    render(
      <BookSearchResults
        {...defaultProps}
        books={mockBooks.slice(0, 3)}
        totalCount={3}
      />
    );

    expect(screen.getByText('Finished')).toBeInTheDocument();
    expect(screen.getByText('Reading')).toBeInTheDocument();
    expect(screen.getByText('Paused')).toBeInTheDocument();
  });

  test('formats authors correctly for different data types', () => {
    render(
      <BookSearchResults
        {...defaultProps}
        books={mockBooks.slice(2)} // Books without authors and with string authors
        totalCount={2}
      />
    );

    expect(screen.getByText('Unknown Author')).toBeInTheDocument();
    expect(screen.getByText('Author One, Author Two')).toBeInTheDocument();
  });

  test('renders category chips with overflow', () => {
    render(
      <BookSearchResults
        {...defaultProps}
        books={[mockBooks[1]]} // Book with 3 categories
        totalCount={1}
      />
    );

    expect(screen.getByText('Fiction')).toBeInTheDocument();
    expect(screen.getByText('Drama')).toBeInTheDocument();
    expect(screen.getByText('+1 more')).toBeInTheDocument();
  });

  test('renders edition information', () => {
    render(
      <BookSearchResults
        {...defaultProps}
        books={mockBooks.slice(0, 1)}
        totalCount={1}
      />
    );

    expect(screen.getByText('Edition 1')).toBeInTheDocument();
    expect(screen.getByText('30/09/2004')).toBeInTheDocument();
  });

  test('renders ISBN codes', () => {
    render(
      <BookSearchResults
        {...defaultProps}
        books={mockBooks.slice(0, 1)}
        totalCount={1}
      />
    );

    expect(screen.getByText('ISBN: 9780743273565')).toBeInTheDocument();
  });

  test('handles books without ISBN', () => {
    const bookWithoutISBN = {
      ...mockBooks[0],
      isbnCode: undefined,
    };

    render(
      <BookSearchResults
        {...defaultProps}
        books={[bookWithoutISBN]}
        totalCount={1}
      />
    );

    expect(screen.queryByText(/ISBN:/)).not.toBeInTheDocument();
  });

  test('handles books without categories', () => {
    render(
      <BookSearchResults
        {...defaultProps}
        books={[mockBooks[2]]} // Book without categories
        totalCount={1}
      />
    );

    // Should render without category chips (status chip will still be there)
    expect(screen.getByText('Book Without Authors')).toBeInTheDocument();
    // Book has status 'paused' so status chip should exist
    expect(screen.getByText('Paused')).toBeInTheDocument();
    // But no category chips (Fiction, Classic, etc.)
    expect(screen.queryByText('Fiction')).not.toBeInTheDocument();
    expect(screen.queryByText('Classic')).not.toBeInTheDocument();
  });

  test('handles books without edition info', () => {
    const bookWithoutEdition = {
      ...mockBooks[0],
      editionNumber: undefined,
      editionDate: undefined,
    };

    render(
      <BookSearchResults
        {...defaultProps}
        books={[bookWithoutEdition]}
        totalCount={1}
      />
    );

    expect(screen.queryByText(/Edition/)).not.toBeInTheDocument();
    expect(screen.queryByText('30/09/2004')).not.toBeInTheDocument();
  });

  test('applies correct status colors', () => {
    render(
      <BookSearchResults
        {...defaultProps}
        books={mockBooks.slice(0, 4)}
        totalCount={4}
      />
    );

    const getChipClass = (label: string) => {
      const elements = screen.getAllByText(label);
      return elements[0].closest('.MuiChip-root')?.className || '';
    };

    expect(getChipClass('Finished')).toMatch(/MuiChip-colorSuccess/);
    expect(getChipClass('Reading')).toMatch(/MuiChip-colorPrimary/);
    expect(getChipClass('Paused')).toMatch(/MuiChip-colorWarning/);
  });

  test('truncates long titles and authors with title attribute', () => {
    const longTitleBook = {
      ...mockBooks[0],
      title: 'This is a very long book title that should be truncated in the display',
      authors: [{ id: 1, name: 'Very Long Author Name', surname: 'That Should Be Truncated' }],
    };

    render(
      <BookSearchResults
        {...defaultProps}
        books={[longTitleBook]}
        totalCount={1}
      />
    );

    const titleElement = screen.getByText(longTitleBook.title);
    const authorElement = screen.getByText('Very Long Author Name That Should Be Truncated');
    
    expect(titleElement).toHaveAttribute('title', longTitleBook.title);
    expect(authorElement).toHaveAttribute('title', 'Very Long Author Name That Should Be Truncated');
  });

  test('renders responsive grid layout', () => {
    render(
      <BookSearchResults
        {...defaultProps}
        books={mockBooks.slice(0, 2)}
        totalCount={2}
      />
    );

    const cards = Array.from(document.querySelectorAll('.MuiCard-root'));
    expect(cards.length).toBeGreaterThan(1);
    const gridContainer = cards[0]?.parentElement?.parentElement;
    expect(gridContainer?.className).toContain('MuiBox-root');
    expect(gridContainer?.children.length).toBeGreaterThan(1);
  });

  test('handles component mount and unmount cleanly', () => {
    const { unmount } = render(<BookSearchResults {...defaultProps} />);
    
    expect(() => unmount()).not.toThrow();
  });

  test('does not render results header when totalCount is 0', () => {
    render(
      <BookSearchResults
        {...defaultProps}
        books={[]}
        totalCount={0}
      />
    );

    expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();
  });

  test('handles unknown book status', () => {
    const bookWithUnknownStatus = {
      ...mockBooks[0],
      status: 'custom-status' as any,
    };

    render(
      <BookSearchResults
        {...defaultProps}
        books={[bookWithUnknownStatus]}
        totalCount={1}
      />
    );

    // Check that custom status is rendered
    const statusChip = screen.getByText('custom-status');
    expect(statusChip).toBeInTheDocument();

    const chipClass = statusChip.closest('.MuiChip-root')?.className || '';
    expect(chipClass).toMatch(/MuiChip-colorDefault/);
  });
});
