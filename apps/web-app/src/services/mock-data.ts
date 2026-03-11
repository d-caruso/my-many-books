import {
  SEARCH_SORT_BY_FIELDS,
  SORT_DIRECTIONS,
  type Author,
  type Book,
  type Category,
  type PaginatedResponse,
  type SearchFilters,
  type SearchResult,
} from '@my-many-books/shared-types';
import { env } from '../config/env';

export function getMockBooks(): Promise<PaginatedResponse<Book>> {
  const mockBooks: Book[] = [
    {
      id: 1,
      title: "The Great Gatsby",
      isbnCode: "9780743273565",
      editionNumber: 1,
      editionDate: "2004-09-30",
      status: "finished",
      notes: "Classic American literature",
      userId: 1,
      authors: [{ id: 1, name: "F. Scott", surname: "Fitzgerald" }],
      categories: [{ id: 1, name: "Fiction" }, { id: 2, name: "Classic Literature" }],
      creationDate: "2024-01-15T10:00:00Z",
      updateDate: "2024-01-15T10:00:00Z"
    },
    {
      id: 2,
      title: "To Kill a Mockingbird",
      isbnCode: "9780061120084",
      editionNumber: 1,
      editionDate: "2006-05-23",
      status: "reading",
      notes: "Powerful story about justice and morality",
      userId: 1,
      authors: [{ id: 2, name: "Harper", surname: "Lee" }],
      categories: [{ id: 1, name: "Fiction" }, { id: 3, name: "Social Issues" }],
      creationDate: "2024-01-20T14:30:00Z",
      updateDate: "2024-01-25T16:45:00Z"
    },
    {
      id: 3,
      title: "1984",
      isbnCode: "9780451524935",
      editionNumber: 1,
      editionDate: "1961-01-01",
      status: "paused",
      notes: "Dystopian masterpiece",
      userId: 1,
      authors: [{ id: 3, name: "George", surname: "Orwell" }],
      categories: [{ id: 1, name: "Fiction" }, { id: 4, name: "Dystopian" }],
      creationDate: "2024-02-01T09:15:00Z",
      updateDate: "2024-02-01T09:15:00Z"
    }
  ];

  return Promise.resolve({
    books: mockBooks,
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalItems: mockBooks.length,
      itemsPerPage: 10
    }
  });
}

export function getMockCategories(): Promise<Category[]> {
  return Promise.resolve([
    { id: 1, name: "Fiction", creationDate: "2024-01-01T00:00:00Z", updateDate: "2024-01-01T00:00:00Z" },
    { id: 2, name: "Classic Literature", creationDate: "2024-01-01T00:00:00Z", updateDate: "2024-01-01T00:00:00Z" },
    { id: 3, name: "Social Issues", creationDate: "2024-01-01T00:00:00Z", updateDate: "2024-01-01T00:00:00Z" },
    { id: 4, name: "Dystopian", creationDate: "2024-01-01T00:00:00Z", updateDate: "2024-01-01T00:00:00Z" },
    { id: 5, name: "Science Fiction", creationDate: "2024-01-01T00:00:00Z", updateDate: "2024-01-01T00:00:00Z" },
    { id: 6, name: "Mystery", creationDate: "2024-01-01T00:00:00Z", updateDate: "2024-01-01T00:00:00Z" },
    { id: 7, name: "Romance", creationDate: "2024-01-01T00:00:00Z", updateDate: "2024-01-01T00:00:00Z" },
    { id: 8, name: "Non-Fiction", creationDate: "2024-01-01T00:00:00Z", updateDate: "2024-01-01T00:00:00Z" }
  ]);
}

export function getMockAuthors(): Promise<Author[]> {
  return Promise.resolve([
    { id: 1, name: "F. Scott", surname: "Fitzgerald", nationality: "American", creationDate: "2024-01-01T00:00:00Z", updateDate: "2024-01-01T00:00:00Z" },
    { id: 2, name: "Harper", surname: "Lee", nationality: "American", creationDate: "2024-01-01T00:00:00Z", updateDate: "2024-01-01T00:00:00Z" },
    { id: 3, name: "George", surname: "Orwell", nationality: "British", creationDate: "2024-01-01T00:00:00Z", updateDate: "2024-01-01T00:00:00Z" },
    { id: 4, name: "Jane", surname: "Austen", nationality: "British", creationDate: "2024-01-01T00:00:00Z", updateDate: "2024-01-01T00:00:00Z" },
    { id: 5, name: "Mark", surname: "Twain", nationality: "American", creationDate: "2024-01-01T00:00:00Z", updateDate: "2024-01-01T00:00:00Z" }
  ]);
}

export function getMockSearchResults(searchParams: SearchFilters): Promise<SearchResult> {
  return getMockBooks().then(data => {
    let filteredBooks = data.books || [];

    if (searchParams.query) {
      const query = searchParams.query.toLowerCase();
      filteredBooks = filteredBooks.filter(book =>
        book.title.toLowerCase().includes(query) ||
        book.authors?.some(author =>
          `${author.name} ${author.surname}`.toLowerCase().includes(query)
        ) ||
        book.isbnCode.includes(query)
      );
    }

    if (searchParams.status) {
      filteredBooks = filteredBooks.filter(book => book.status === searchParams.status);
    }

    if (searchParams.authorId) {
      filteredBooks = filteredBooks.filter(book =>
        book.authors?.some(author => author.id === searchParams.authorId)
      );
    }

    if (searchParams.categoryId) {
      filteredBooks = filteredBooks.filter(book =>
        book.categories?.some(category => category.id === searchParams.categoryId)
      );
    }

    const direction = searchParams.sortOrder === SORT_DIRECTIONS.DESC ? -1 : 1;

    if (searchParams.sortBy) {
      switch (searchParams.sortBy) {
        case SEARCH_SORT_BY_FIELDS.TITLE:
          filteredBooks.sort((a, b) => direction * a.title.localeCompare(b.title));
          break;
        case SEARCH_SORT_BY_FIELDS.AUTHOR:
          filteredBooks.sort((a, b) => {
            const aAuthor = a.authors?.[0] ? `${a.authors[0].surname} ${a.authors[0].name}` : '';
            const bAuthor = b.authors?.[0] ? `${b.authors[0].surname} ${b.authors[0].name}` : '';
            return direction * aAuthor.localeCompare(bAuthor);
          });
          break;
        case SEARCH_SORT_BY_FIELDS.STATUS:
          filteredBooks.sort((a, b) => direction * (a.status ?? '').localeCompare(b.status ?? ''));
          break;
        case SEARCH_SORT_BY_FIELDS.CREATION_DATE:
          filteredBooks.sort((a, b) => {
            const aDate = a.creationDate ? new Date(a.creationDate).getTime() : 0;
            const bDate = b.creationDate ? new Date(b.creationDate).getTime() : 0;
            return direction * (aDate - bDate);
          });
          break;
        case SEARCH_SORT_BY_FIELDS.UPDATE_DATE:
          filteredBooks.sort((a, b) => {
            const aDate = a.updateDate ? new Date(a.updateDate).getTime() : 0;
            const bDate = b.updateDate ? new Date(b.updateDate).getTime() : 0;
            return direction * (aDate - bDate);
          });
          break;
      }
    }

    const page = searchParams.page || 1;
    const limit = searchParams.limit || env.BOOKS_PAGINATION_DEFAULT;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedBooks = filteredBooks.slice(startIndex, endIndex);

    return {
      books: paginatedBooks,
      total: filteredBooks.length,
      hasMore: endIndex < filteredBooks.length,
      page
    };
  });
}
