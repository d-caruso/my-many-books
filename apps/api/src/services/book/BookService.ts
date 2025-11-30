// ================================================================
// src/services/book/BookService.ts
// Temporary service placeholder (Phase 1)
// ================================================================

import { inject, injectable } from 'inversify';
import { TYPES } from '../../container/types';
import { IBookRepository } from '../../repositories/book/IBookRepository';

@injectable()
class BookService {
  constructor(@inject(TYPES.BookRepository) private readonly bookRepository: IBookRepository) {}

  /**
   * Phase 1 diagnostic helper.
   * Ensures the repository binding is available while we transition the controller.
   */
  initializeControllerContext(): void {
    // Accessing the repository ensures the binding is evaluated.
    void this.bookRepository;
  }
}

export { BookService };
