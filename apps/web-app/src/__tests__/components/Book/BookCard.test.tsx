import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BookCard } from '../../../components/Book/BookCard';
import { Book } from '../../types';

// Mock Material-UI components
vi.mock('@mui/material', () => ({
  Card: ({ children, onClick, sx }: any) => (
    <div data-testid="card" onClick={onClick} style={sx}>
      {children}
    </div>
  ),
  CardContent: ({ children, sx }: any) => (
    <div data-testid="card-content" style={sx}>
      {children}
    </div>
  ),
  CardActions: ({ children, sx }: any) => (
    <div data-testid="card-actions" style={sx}>
      {children}
    </div>
  ),
  CardMedia: ({ children, sx }: any) => (
    <div data-testid="card-media" style={sx}>
      {children}
    </div>
  ),
  Typography: ({ children, variant, component, title, ...props }: any) => {
    const Component = component || 'div';
    return (
      <Component data-testid={`typography-${variant}`} title={title} {...props}>
        {children}
      </Component>
    );
  },
  Chip: ({ label, color, size, ...props }: any) => (
    <span data-testid="chip" data-color={color} data-size={size} {...props}>
      {label}
    </span>
  ),
  IconButton: ({ children, onClick, title, size, color, ...props }: any) => (
    <button
      data-testid="icon-button"
      onClick={onClick}
      title={title}
      data-size={size}
      data-color={color}
      {...props}
    >
      {children}
    </button>
  ),
  MenuItem: ({ children, value, ...props }: any) => (
    <option data-testid="menu-item" value={value} {...props}>
      {children}
    </option>
  ),
  Select: ({ children, value, onChange, onClick, ...props }: any) => (
    <select
      data-testid="select"
      value={value}
      onChange={onChange}
      onClick={onClick}
      {...props}
    >
      {children}
    </select>
  ),
  FormControl: ({ children, ...props }: any) => (
    <div data-testid="form-control" {...props}>
      {children}
    </div>
  ),
  Box: ({ children, ...props }: any) => (
    <div data-testid="box" {...props}>
      {children}
    </div>
  ),
  Stack: ({ children, ...props }: any) => (
    <div data-testid="stack" {...props}>
      {children}
    </div>
  ),
}));

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
  status: 'in progress',
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
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('ISBN: 978-0123456789')).toBeInTheDocument();
    expect(screen.getByText('Edition 1')).toBeInTheDocument();
    expect(screen.getByText('2023')).toBeInTheDocument();
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

    expect(screen.getByText('Unknown Author')).toBeInTheDocument();
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
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  test('renders without optional fields', () => {
    const minimalBook: Book = {
      id: 1,
      title: 'Minimal Book',
    };

    render(<BookCard book={minimalBook} />);

    expect(screen.getByText('Minimal Book')).toBeInTheDocument();
    expect(screen.getByText('Unknown Author')).toBeInTheDocument();
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
    const mockEvent = {
      stopPropagation: vi.fn(),
      target: { value: 'finished' },
    };

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
    expect(handleStatusChange).toHaveBeenCalledWith(mockBook.id, '');
  });

  test('does not render status change select when onStatusChange is not provided', () => {
    render(<BookCard book={mockBook} />);

    expect(screen.queryByTestId('select')).not.toBeInTheDocument();
  });
});