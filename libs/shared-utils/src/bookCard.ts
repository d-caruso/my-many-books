import { Book, BookStatus } from '@my-many-books/shared-types';
import { formatFullName } from './formatting';

export interface BookCardData {
  id: number;
  title: string;
  authors: string;
  status?: BookStatus;
  categories: string[];
  isbn?: string;
  editionInfo?: string;
}

export const formatBookCardData = (book: Book): BookCardData => {
  const authors = book.authors?.length
    ? book.authors.map(author => formatFullName(author.name, author.surname)).join(', ')
    : 'Unknown Author';

  const categories = book.categories?.map(cat => cat.name) || [];

  const editionYear = book.editionDate ? book.editionDate.slice(0, 4) : undefined;
  const editionInfo = book.editionNumber && editionYear
    ? `Edition ${book.editionNumber} (${editionYear})`
    : book.editionNumber
      ? `Edition ${book.editionNumber}`
      : editionYear
        ? editionYear
        : undefined;

  return {
    id: book.id,
    title: book.title,
    authors,
    status: book.status ?? undefined,
    categories,
    isbn: book.isbnCode,
    editionInfo,
  };
};
