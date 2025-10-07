/**
 * MSW server setup for HTTP layer mocking
 * Industry standard approach for API testing
 */

import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { Book, Author, Category, User, PaginatedResponse } from '../../types';

// Mock data
const mockBooks: Book[] = [
  {
    id: 1,
    title: "The Great Gatsby",
    isbnCode: "9780743273565",
    status: "finished",
    userId: 1,
    authors: [{ id: 1, name: "F. Scott", surname: "Fitzgerald", nationality: "American", creationDate: "2024-01-01T00:00:00Z", updateDate: "2024-01-01T00:00:00Z" }],
    categories: [{ id: 1, name: "Fiction", creationDate: "2024-01-01T00:00:00Z", updateDate: "2024-01-01T00:00:00Z" }],
    creationDate: "2024-01-15T10:00:00Z",
    updateDate: "2024-01-15T10:00:00Z"
  }
];

const mockCategories: Category[] = [
  { id: 1, name: "Fiction", creationDate: "2024-01-01T00:00:00Z", updateDate: "2024-01-01T00:00:00Z" },
  { id: 2, name: "Non-Fiction", creationDate: "2024-01-01T00:00:00Z", updateDate: "2024-01-01T00:00:00Z" }
];

const mockAuthors: Author[] = [
  { id: 1, name: "F. Scott", surname: "Fitzgerald", nationality: "American", creationDate: "2024-01-01T00:00:00Z", updateDate: "2024-01-01T00:00:00Z" },
  { id: 2, name: "Harper", surname: "Lee", nationality: "American", creationDate: "2024-01-01T00:00:00Z", updateDate: "2024-01-01T00:00:00Z" }
];

const mockUser: User = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com'
};

// Request handlers
export const handlers = [
  // Books endpoints
  http.get('*/api/books', ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    
    const response: PaginatedResponse<Book> = {
      books: mockBooks,
      pagination: {
        currentPage: page,
        totalPages: 1,
        totalItems: mockBooks.length,
        itemsPerPage: limit
      }
    };
    
    return HttpResponse.json(response);
  }),

  http.get('*/api/books/:id', ({ params }) => {
    const id = parseInt(params.id as string);
    const book = mockBooks.find(b => b.id === id);
    if (!book) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(book);
  }),

  http.post('*/api/books', async ({ request }) => {
    const bookData = await request.json() as any;
    const newBook: Book = {
      id: Date.now(),
      ...bookData,
      userId: 1,
      authors: [],
      categories: [],
      creationDate: new Date().toISOString(),
      updateDate: new Date().toISOString()
    };
    return HttpResponse.json(newBook);
  }),

  http.put('*/api/books/:id', async ({ params, request }) => {
    const id = parseInt(params.id as string);
    const updateData = await request.json() as any;
    const existingBook = mockBooks.find(b => b.id === id);
    
    if (!existingBook) {
      return new HttpResponse(null, { status: 404 });
    }

    const updatedBook: Book = {
      ...existingBook,
      ...updateData,
      updateDate: new Date().toISOString()
    };
    
    return HttpResponse.json(updatedBook);
  }),

  http.delete('*/api/books/:id', ({ params }) => {
    const id = parseInt(params.id as string);
    const bookIndex = mockBooks.findIndex(b => b.id === id);
    if (bookIndex === -1) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json({ success: true });
  }),

  // Categories endpoints
  http.get('*/api/categories', () => {
    return HttpResponse.json(mockCategories);
  }),

  http.get('*/api/categories/:id', ({ params }) => {
    const id = parseInt(params.id as string);
    const category = mockCategories.find(c => c.id === id);
    if (!category) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(category);
  }),

  http.post('*/api/categories', async ({ request }) => {
    const categoryData = await request.json() as any;
    const newCategory: Category = {
      id: Date.now(),
      ...categoryData,
      creationDate: new Date().toISOString(),
      updateDate: new Date().toISOString()
    };
    return HttpResponse.json(newCategory);
  }),

  // Authors endpoints - matches shared-api endpoint /authors (get all)
  http.get('*/api/authors', () => {
    return HttpResponse.json(mockAuthors);
  }),

  http.get('*/api/authors/:id', ({ params }) => {
    const id = parseInt(params.id as string);
    const author = mockAuthors.find(a => a.id === id);
    if (!author) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(author);
  }),

  http.post('*/api/authors', async ({ request }) => {
    const authorData = await request.json() as any;
    const newAuthor: Author = {
      id: Date.now(),
      ...authorData,
      creationDate: new Date().toISOString(),
      updateDate: new Date().toISOString()
    };
    return HttpResponse.json(newAuthor);
  }),

  // Users endpoints
  http.get('*/api/users', () => {
    return HttpResponse.json(mockUser);
  }),

  http.put('*/api/users', async ({ request }) => {
    const updateData = await request.json() as any;
    const updatedUser: User = {
      ...mockUser,
      ...updateData
    };
    return HttpResponse.json(updatedUser);
  }),

  // ISBN search - matches shared-api endpoint /books/search/{isbn}
  http.get('*/api/books/search/:isbn', ({ params }) => {
    const book = mockBooks.find(b => b.isbnCode === params.isbn);
    if (!book) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(book);
  }),

  // Search endpoints - matches shared-api endpoint /books/search?q=...
  http.get('*/api/books/search', ({ request }) => {
    const url = new URL(request.url);
    const q = url.searchParams.get('q');
    const status = url.searchParams.get('status');

    let filteredBooks = mockBooks;
    if (q) {
      filteredBooks = filteredBooks.filter(book =>
        book.title.toLowerCase().includes(q.toLowerCase())
      );
    }
    if (status) {
      filteredBooks = filteredBooks.filter(book => book.status === status);
    }

    return HttpResponse.json({
      books: filteredBooks,
      total: filteredBooks.length,
      hasMore: false,
      page: 1
    });
  }),

  // Authors search - matches shared-api endpoint /authors/search?q=...
  http.get('*/api/authors/search', ({ request }) => {
    const url = new URL(request.url);
    const q = url.searchParams.get('q');

    let filteredAuthors = mockAuthors;
    if (q) {
      filteredAuthors = mockAuthors.filter(a =>
        a.name.toLowerCase().includes(q.toLowerCase()) ||
        a.surname.toLowerCase().includes(q.toLowerCase())
      );
    }

    return HttpResponse.json(filteredAuthors);
  })
];

// Setup server
export const server = setupServer(...handlers);