import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BookCard } from '../../../components/Book/BookCard';
import type { Book } from '@my-many-books/shared-types';
import { setupMuiMock } from '../../test-utils/setupMuiMock';


// Mock Material-UI components
setupMuiMock();

vi.mock('@mui/icons-material', () => ({
  Edit: () => <span data-testid="edit-icon">Edit</span>,
  Delete: () => <span data-testid="delete-icon">Delete</span>,
  MenuBook: () => <span data-testid="book-icon">Book</span>,
}));

// Mock window.confirm
Object.defineProperty(window, 'confirm', {
  writable: true,
  value: vi.fn(),
});

const mockBook: Book = {
  id: 1,
  title: 'Test Book',
  authors: [{ name: 'John', surname: 'Doe' }],
  status: 'reading',
  isbnCode: '978-0123456789',
  editionNumber: 1,
  editionDate: '2023-01-01',
  notes: 'Great book about testing',
  categories: [
    { id: 1, name: 'Fiction' },
    { id: 2, name: 'Adventure' },
    { id: 3, name: 'Mystery' },
  ],
};

describe('BookCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (window.confirm as any).mockReturnValue(true);
  });

  test('renders book information correctly', () => {
    render(<BookCard book={mockBook} />);

    expect(screen.getByText('Test Book')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Reading')).toBeInTheDocument();
    expect(screen.getByText('ISBN: 978-0123456789')).toBeInTheDocument();
    expect(screen.getByText('Edition 1')).toBeInTheDocument();
    expect(screen.getByText('01/01/2023')).toBeInTheDocument();
    expect(screen.getByText('Great book about testing')).toBeInTheDocument();
  });

  test('renders categories correctly', () => {
    render(<BookCard book={mockBook} />);

    expect(screen.getByText('Fiction')).toBeInTheDocument();
    expect(screen.getByText('Adventure')).toBeInTheDocument();
    expect(screen.getByText('+1 more')).toBeInTheDocument();
  });

  test('handles unknown authors', () => {
    const bookWithoutAuthors = { ...mockBook, authors: [] };
    render(<BookCard book={bookWithoutAuthors} />);

    expect(screen.getByText(/unknown author/i)).toBeInTheDocument();
  });

  test('handles string authors', () => {
    const bookWithStringAuthors = { ...mockBook, authors: ['Jane Smith', 'Bob Johnson'] };
    render(<BookCard book={bookWithStringAuthors} />);

    expect(screen.getByText('Jane Smith, Bob Johnson')).toBeInTheDocument();
  });

  test('calls onClick when card is clicked', () => {
    const handleClick = vi.fn();
    render(<BookCard book={mockBook} onClick={handleClick} />);

    fireEvent.click(screen.getByTestId('card'));
    expect(handleClick).toHaveBeenCalledWith(mockBook);
  });

  test('calls onEdit when edit button is clicked', () => {
    const handleEdit = vi.fn();
    render(<BookCard book={mockBook} onEdit={handleEdit} />);

    fireEvent.click(screen.getByTitle('Edit book'));
    expect(handleEdit).toHaveBeenCalledWith(mockBook);
  });

  test('calls onDelete when delete button is clicked and confirmed', () => {
    const handleDelete = vi.fn();
    render(<BookCard book={mockBook} onDelete={handleDelete} />);

    fireEvent.click(screen.getByTitle('Delete book'));
    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete "Test Book"?');
    expect(handleDelete).toHaveBeenCalledWith(mockBook.id);
  });

  test('does not call onDelete when deletion is not confirmed', () => {
    (window.confirm as any).mockReturnValue(false);
    const handleDelete = vi.fn();
    render(<BookCard book={mockBook} onDelete={handleDelete} />);

    fireEvent.click(screen.getByTitle('Delete book'));
    expect(window.confirm).toHaveBeenCalled();
    expect(handleDelete).not.toHaveBeenCalled();
  });

  test('calls onStatusChange when status is changed', () => {
    const handleStatusChange = vi.fn();
    render(<BookCard book={mockBook} onStatusChange={handleStatusChange} />);

    fireEvent.change(screen.getByTestId('select'), { target: { value: 'finished' } });
    expect(handleStatusChange).toHaveBeenCalledWith(mockBook.id, 'finished');
  });

  test('hides actions when showActions is false', () => {
    render(<BookCard book={mockBook} onEdit={vi.fn()} onDelete={vi.fn()} showActions={false} />);

    expect(screen.queryByTitle('Edit book')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Delete book')).not.toBeInTheDocument();
  });

  test('renders compact version correctly', () => {
    render(<BookCard book={mockBook} compact={true} />);

    // In compact mode, we should still have the basic information
    expect(screen.getByText('Test Book')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Reading')).toBeInTheDocument();
  });

  test('renders without optional fields', () => {
    const minimalBook: Book = {
      id: 1,
      title: 'Minimal Book',
    };

    render(<BookCard book={minimalBook} />);

    expect(screen.getByText('Minimal Book')).toBeInTheDocument();
    expect(screen.getByText(/unknown author/i)).toBeInTheDocument();
  });

  test('getStatusColor function works correctly', () => {
    const finishedBook = { ...mockBook, status: 'finished' as Book['status'] };
    const pausedBook = { ...mockBook, status: 'paused' as Book['status'] };
    const defaultBook = { ...mockBook, status: 'unknown' as Book['status'] };

    const { rerender } = render(<BookCard book={finishedBook} />);
    expect(screen.getByText('Finished')).toBeInTheDocument();

    rerender(<BookCard book={pausedBook} />);
    expect(screen.getByText('Paused')).toBeInTheDocument();

    rerender(<BookCard book={defaultBook} />);
    expect(screen.getByText('unknown')).toBeInTheDocument();
  });

  test('stops propagation on action button clicks', () => {
    const handleClick = vi.fn();
    const handleEdit = vi.fn();
    const handleDelete = vi.fn();

    render(
      <BookCard
        book={mockBook}
        onClick={handleClick}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    );

    // Create a mock event with stopPropagation
    // Simulate clicking edit button
    const editButton = screen.getByTitle('Edit book');
    editButton.onclick = (e) => {
      e.stopPropagation();
      handleEdit(mockBook);
    };

    fireEvent.click(editButton);
    expect(handleEdit).toHaveBeenCalledWith(mockBook);
    expect(handleClick).not.toHaveBeenCalled();
  });

  test('handles status change with empty value', () => {
    const handleStatusChange = vi.fn();
    render(<BookCard book={mockBook} onStatusChange={handleStatusChange} />);

    fireEvent.change(screen.getByTestId('select'), { target: { value: '' } });
    expect(handleStatusChange).toHaveBeenCalledWith(mockBook.id, null);
  });

  test('does not render status change select when onStatusChange is not provided', () => {
    render(<BookCard book={mockBook} />);

    expect(screen.queryByTestId('select')).not.toBeInTheDocument();
  });
});
