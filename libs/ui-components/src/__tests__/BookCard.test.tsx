import { fireEvent, render } from '@testing-library/react';
import { BookCard } from '../BookCard/BookCard';
import { BOOK_STATUS } from '@my-many-books/shared-types';
import type { Book } from '@my-many-books/shared-types';

const book: Book = {
  id: 1,
  isbnCode: '9780306406157',
  title: 'A very long title that should be truncated in compact mode',
  status: BOOK_STATUS.READING,
  authors: [
    { id: 1, name: 'VeryLongFirstName', surname: 'VeryLongSurname' },
    { id: 2, name: 'Second', surname: 'Author' },
  ],
  categories: [{ id: 1, name: 'Fiction' }],
};

describe('BookCard', () => {
  test('renders title, authors, and status label', () => {
    const { getByText } = render(<BookCard book={book} testID="card" />);
    expect(getByText(book.title)).toBeInTheDocument();
    expect(getByText(BOOK_STATUS.READING)).toBeInTheDocument();
  });

  test('calls onPress when clicked', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<BookCard book={book} onPress={onPress} testID="card" />);

    fireEvent.click(getByTestId('card'));
    expect(onPress).toHaveBeenCalledWith(book);
  });

  test('action buttons call handlers and do not trigger onPress', () => {
    const onPress = jest.fn();
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    const onStatusChange = jest.fn();

    const { getByTestId } = render(
      <BookCard
        book={book}
        testID="card"
        onPress={onPress}
        onEdit={onEdit}
        onDelete={onDelete}
        onStatusChange={onStatusChange}
      />
    );

    fireEvent.click(getByTestId('card-edit'));
    expect(onEdit).toHaveBeenCalledWith(book);
    expect(onPress).not.toHaveBeenCalled();

    fireEvent.click(getByTestId('card-delete'));
    expect(onDelete).toHaveBeenCalledWith(book.id);
    expect(onPress).not.toHaveBeenCalled();

    fireEvent.click(getByTestId('card-status-paused'));
    expect(onStatusChange).toHaveBeenCalledWith(book.id, BOOK_STATUS.PAUSED);
    expect(onPress).not.toHaveBeenCalled();
  });

  test('compact mode truncates title and authors', () => {
    const { container, queryByText } = render(<BookCard book={book} compact />);

    expect(queryByText(book.title)).toBeNull();

    const title = container.querySelector('h3')?.textContent ?? '';
    const authors = container.querySelector('p')?.textContent ?? '';

    expect(title).toMatch(/\.{3}$/);
    expect(authors).toMatch(/\.{3}$/);
  });

  test('does not render status chip when status is null', () => {
    const { queryByText } = render(<BookCard book={{ ...book, status: null }} />);
    expect(queryByText(BOOK_STATUS.READING)).toBeNull();
  });
});
