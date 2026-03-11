import { formatBookCardData } from '../bookCard';
import type { Book } from '@my-many-books/shared-types';

const baseBook: Book = {
  id: 1,
  isbnCode: '9780306406157',
  title: 'My Book',
  status: 'reading',
  authors: [{ id: 1, name: 'A', surname: 'B' }],
  categories: [{ id: 1, name: 'Fiction' }],
};

describe('formatBookCardData', () => {
  test('formats authors, categories, isbn, and editionInfo', () => {
    const result = formatBookCardData({
      ...baseBook,
      editionNumber: 2,
      editionDate: '2020-01-01',
    });

    expect(result.authors).toBe('A B');
    expect(result.categories).toEqual(['Fiction']);
    expect(result.isbn).toBe('9780306406157');
    expect(result.editionInfo).toBe('Edition 2 (2020)');
  });

  test('handles missing authors and editionInfo branches', () => {
    expect(formatBookCardData({ ...baseBook, authors: undefined }).authors).toBe('Unknown Author');
    expect(formatBookCardData({ ...baseBook, editionNumber: 3, editionDate: null }).editionInfo).toBe('Edition 3');
    expect(formatBookCardData({ ...baseBook, editionNumber: null, editionDate: '2021-01-01' }).editionInfo).toBe('2021');
    expect(formatBookCardData({ ...baseBook, editionNumber: null, editionDate: null }).editionInfo).toBeUndefined();
  });
});
