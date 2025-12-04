/**
 * BookCard business logic - platform agnostic
 * Contains all the data transformation and formatting logic
 */

import { Book, BookStatus } from '@my-many-books/shared-types';
import { formatFullName } from '@my-many-books/shared-utils';
import { BookCardData } from './BookCard.types';

export const formatBookCardData = (book: Book): BookCardData => {
  const authors = book.authors?.length 
    ? book.authors.map(author => formatFullName(author.name, author.surname)).join(', ')
    : 'Unknown Author';

  const categories = book.categories?.map(cat => cat.name) || [];
  
  const editionInfo = book.editionNumber && book.editionDate
    ? `Edition ${book.editionNumber} (${new Date(book.editionDate).getFullYear()})`
    : book.editionNumber 
      ? `Edition ${book.editionNumber}`
      : book.editionDate
        ? `${new Date(book.editionDate).getFullYear()}`
        : undefined;

  return {
    id: book.id,
    title: book.title,
    authors,
    status: book.status,
    categories,
    isbn: book.isbnCode,
    editionInfo,
  };
};

export const getStatusColor = (status?: BookStatus): string => {
  switch (status) {
    case 'finished':
      return '#10B981'; // green
    case 'reading':
      return '#3B82F6'; // blue
    case 'paused':
      return '#F59E0B'; // amber
    default:
      return '#6B7280'; // gray
  }
};

/**
 * Get the i18n key for a book status
 * Usage: t(getStatusI18nKey(status))
 */
export const getStatusI18nKey = (status?: BookStatus): string => {
  switch (status) {
    case 'reading':
      return 'search.filter.status.reading';
    case 'paused':
      return 'search.filter.status.paused';
    case 'finished':
      return 'search.filter.status.finished';
    case 'unread':
      return 'search.filter.status.unread';
    default:
      return '';
  }
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
};