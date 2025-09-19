import React from 'react';
import { render } from '@testing-library/react-native';
import { BookList } from '@/components/BookList';
import { Book } from '@/types';

// Mock react-native-paper
jest.mock('react-native-paper', () => ({
  Text: ({ children, ...props }: any) => 
    React.createElement('text', props, children),
  ActivityIndicator: ({ testID }: any) => 
    React.createElement('view', { testID: testID || 'loading' }),
}));

// Mock BookCard component
jest.mock('@/components/BookCard', () => ({
  BookCard: ({ book, testID }: any) => 
    React.createElement('view', { testID: testID || `book-card-${book.id}` }, book.title),
}));

const createMockBook = (id: number): Book => ({
  id,
  title: `Book ${id}`,
  isbnCode: `123456789${id}`,
  status: 'reading',
  authors: [{ id, name: `Author ${id}` }],
  categories: [{ id, name: `Category ${id}` }],
  createdAt: '2023-01-01T00:00:00.000Z',
  updatedAt: '2023-01-01T00:00:00.000Z',
});

describe('BookList Performance Tests', () => {
  it('should render large list efficiently', () => {
    const largeBookList = Array.from({ length: 1000 }, (_, i) => createMockBook(i + 1));

    const startTime = performance.now();
    
    const { getAllByTestId } = render(
      <BookList 
        books={largeBookList}
        onBookPress={jest.fn()}
        onStatusChange={jest.fn()}
        onDelete={jest.fn()}
        loading={false}
        error={null}
      />
    );

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Should render within reasonable time (adjust threshold as needed)
    expect(renderTime).toBeLessThan(1000); // 1 second

    // Should render all books
    const bookCards = getAllByTestId(/book-card-\d+/);
    expect(bookCards).toHaveLength(1000);
  });

  it('should handle frequent re-renders efficiently', () => {
    const books = Array.from({ length: 100 }, (_, i) => createMockBook(i + 1));
    let renderCount = 0;

    const TestComponent = ({ books }: { books: Book[] }) => {
      renderCount++;
      return (
        <BookList 
          books={books}
          onBookPress={jest.fn()}
          onStatusChange={jest.fn()}
          onDelete={jest.fn()}
          loading={false}
          error={null}
        />
      );
    };

    const { rerender } = render(<TestComponent books={books} />);

    // Re-render multiple times with same data
    for (let i = 0; i < 10; i++) {
      rerender(<TestComponent books={books} />);
    }

    // Should have rendered 11 times (initial + 10 re-renders)
    expect(renderCount).toBe(11);
  });

  it('should handle empty list efficiently', () => {
    const startTime = performance.now();
    
    const { getByText } = render(
      <BookList 
        books={[]}
        onBookPress={jest.fn()}
        onStatusChange={jest.fn()}
        onDelete={jest.fn()}
        loading={false}
        error={null}
      />
    );

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    expect(renderTime).toBeLessThan(100); // 100ms
    expect(getByText('No books yet')).toBeTruthy();
  });

  it('should handle loading state efficiently', () => {
    const startTime = performance.now();
    
    const { getByTestId } = render(
      <BookList 
        books={[]}
        onBookPress={jest.fn()}
        onStatusChange={jest.fn()}
        onDelete={jest.fn()}
        loading={true}
        error={null}
      />
    );

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    expect(renderTime).toBeLessThan(100); // 100ms
    expect(getByTestId('loading')).toBeTruthy();
  });

  it('should handle error state efficiently', () => {
    const startTime = performance.now();
    
    const { getByText } = render(
      <BookList 
        books={[]}
        onBookPress={jest.fn()}
        onStatusChange={jest.fn()}
        onDelete={jest.fn()}
        loading={false}
        error="Failed to load books"
      />
    );

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    expect(renderTime).toBeLessThan(100); // 100ms
    expect(getByText('Failed to load books')).toBeTruthy();
  });

  it('should handle rapid prop changes efficiently', () => {
    const initialBooks = Array.from({ length: 50 }, (_, i) => createMockBook(i + 1));
    let renderCount = 0;

    const TestComponent = ({ books, loading }: { books: Book[], loading: boolean }) => {
      renderCount++;
      return (
        <BookList 
          books={books}
          onBookPress={jest.fn()}
          onStatusChange={jest.fn()}
          onDelete={jest.fn()}
          loading={loading}
          error={null}
        />
      );
    };

    const { rerender } = render(<TestComponent books={initialBooks} loading={false} />);

    // Rapidly change props
    rerender(<TestComponent books={initialBooks} loading={true} />);
    rerender(<TestComponent books={[]} loading={true} />);
    rerender(<TestComponent books={[]} loading={false} />);
    rerender(<TestComponent books={initialBooks} loading={false} />);

    // Should handle rapid changes without issues
    expect(renderCount).toBe(5);
  });

  it('should handle memory efficiently with large datasets', () => {
    const veryLargeBookList = Array.from({ length: 5000 }, (_, i) => createMockBook(i + 1));

    const { unmount } = render(
      <BookList 
        books={veryLargeBookList}
        onBookPress={jest.fn()}
        onStatusChange={jest.fn()}
        onDelete={jest.fn()}
        loading={false}
        error={null}
      />
    );

    // Should unmount without memory leaks
    expect(() => unmount()).not.toThrow();
  });
});
