import { formatBookCardData, getStatusColor, getStatusLabel, truncateText } from '../BookCard/BookCard.logic';
import type { Book } from '@my-many-books/shared-types';

const baseBook: Book = {
  id: 1,
  isbnCode: '9780306406157',
  title: 'My Book',
  status: 'reading',
  authors: [{ id: 1, name: 'A', surname: 'B' }],
  categories: [{ id: 1, name: 'Fiction' }],
};

describe('BookCard.logic', () => {
  test('formatBookCardData formats authors, categories, isbn, and editionInfo', () => {
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

  test('formatBookCardData handles missing authors and editionInfo branches', () => {
    expect(formatBookCardData({ ...baseBook, authors: undefined }).authors).toBe('Unknown Author');
    expect(formatBookCardData({ ...baseBook, editionNumber: 3, editionDate: null }).editionInfo).toBe('Edition 3');
    expect(formatBookCardData({ ...baseBook, editionNumber: null, editionDate: '2021-01-01' }).editionInfo).toBe('2021');
    expect(formatBookCardData({ ...baseBook, editionNumber: null, editionDate: null }).editionInfo).toBeUndefined();
  });

  test('getStatusColor maps statuses to stable colors', () => {
    expect(getStatusColor('finished')).toBe('#10B981');
    expect(getStatusColor('reading')).toBe('#3B82F6');
    expect(getStatusColor('paused')).toBe('#F59E0B');
    expect(getStatusColor(undefined)).toBe('#6B7280');
  });

  test('getStatusLabel maps statuses to labels', () => {
    expect(getStatusLabel('reading')).toBe('Reading');
    expect(getStatusLabel('paused')).toBe('Paused');
    expect(getStatusLabel('finished')).toBe('Finished');
    expect(getStatusLabel(undefined)).toBe('');
  });

  test('truncateText truncates long strings', () => {
    expect(truncateText('abc', 3)).toBe('abc');
    expect(truncateText('abcd', 3)).toBe('...');
  });
});
