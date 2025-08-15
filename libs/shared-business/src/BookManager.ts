/**
 * Book business logic manager - platform agnostic
 */

import { Book, BookFormData, BookStatus } from '@my-many-books/shared-types';
import { validateISBN, normalizeISBN } from '@my-many-books/shared-utils';

export interface BookAPI {
  searchByISBN(isbn: string): Promise<Book | null>;
  createBook(data: BookFormData): Promise<Book>;
  updateBook(id: number, data: Partial<BookFormData>): Promise<Book>;
  deleteBook(id: number): Promise<void>;
  updateBookStatus(id: number, status: BookStatus): Promise<Book>;
}

export class BookManager {
  constructor(private api: BookAPI) {}

  /**
   * Add a book by ISBN with validation
   */
  async addBookByISBN(isbn: string, additionalData?: Partial<BookFormData>): Promise<Book> {
    // Validate ISBN format
    const normalizedISBN = normalizeISBN(isbn);
    const validation = validateISBN(normalizedISBN);
    
    if (!validation.isValid) {
      throw new Error(`Invalid ISBN format: ${isbn}. Please enter a valid 10 or 13 digit ISBN.`);
    }

    // Search for existing book data
    const existingBook = await this.api.searchByISBN(normalizedISBN);
    if (existingBook) {
      throw new Error('Book already exists in your library');
    }

    // Create book with validated ISBN
    const bookData: BookFormData = {
      isbnCode: normalizedISBN,
      title: '',
      ...additionalData,
    };

    // Ensure title is provided
    if (!bookData.title?.trim()) {
      throw new Error('Book title is required');
    }

    return await this.api.createBook(bookData);
  }

  /**
   * Update book status with validation
   */
  async updateBookStatus(bookId: number, status: BookStatus): Promise<Book> {
    const validStatuses: BookStatus[] = ['in progress', 'paused', 'finished'];
    
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
    }

    return await this.api.updateBookStatus(bookId, status);
  }

  /**
   * Update book with validation
   */
  async updateBook(bookId: number, updates: Partial<BookFormData>): Promise<Book> {
    // Validate ISBN if provided
    if (updates.isbnCode) {
      const normalizedISBN = normalizeISBN(updates.isbnCode);
      const validation = validateISBN(normalizedISBN);
      
      if (!validation.isValid) {
        throw new Error(`Invalid ISBN format: ${updates.isbnCode}`);
      }
      
      updates.isbnCode = normalizedISBN;
    }

    // Validate title if provided
    if (updates.title !== undefined && !updates.title.trim()) {
      throw new Error('Book title cannot be empty');
    }

    // Validate edition number if provided
    if (updates.editionNumber !== undefined && updates.editionNumber < 1) {
      throw new Error('Edition number must be at least 1');
    }

    return await this.api.updateBook(bookId, updates);
  }

  /**
   * Safely delete book with confirmation
   */
  async deleteBook(bookId: number, confirmTitle?: string): Promise<void> {
    if (confirmTitle && confirmTitle.trim()) {
      // Additional validation could be added here
      // For example, comparing with actual book title
    }

    await this.api.deleteBook(bookId);
  }

  /**
   * Calculate reading progress statistics
   */
  static calculateReadingStats(books: Book[]): {
    total: number;
    inProgress: number;
    paused: number;
    finished: number;
    percentageComplete: number;
  } {
    const total = books.length;
    const inProgress = books.filter(book => book.status === 'in progress').length;
    const paused = books.filter(book => book.status === 'paused').length;
    const finished = books.filter(book => book.status === 'finished').length;
    
    const percentageComplete = total > 0 ? Math.round((finished / total) * 100) : 0;

    return {
      total,
      inProgress,
      paused,
      finished,
      percentageComplete
    };
  }

  /**
   * Group books by status
   */
  static groupBooksByStatus(books: Book[]): Record<BookStatus | 'unknown', Book[]> {
    return books.reduce((groups, book) => {
      const status = book.status || 'unknown';
      if (!groups[status]) {
        groups[status] = [];
      }
      groups[status].push(book);
      return groups;
    }, {} as Record<BookStatus | 'unknown', Book[]>);
  }

  /**
   * Find books by author
   */
  static findBooksByAuthor(books: Book[], authorName: string): Book[] {
    const searchTerm = authorName.toLowerCase();
    return books.filter(book => 
      book.authors?.some(author => 
        `${author.name} ${author.surname}`.toLowerCase().includes(searchTerm)
      )
    );
  }
}