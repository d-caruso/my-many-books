// ================================================================
// src/services/book/BookService.ts
// Temporary service placeholder (Phase 1)
// ================================================================

import { inject, injectable } from 'inversify';
import { TYPES } from '../../container/types';
import { BookRepository } from '../../repositories/book/BookRepository';

@injectable()
class BookService {
  constructor(@inject(TYPES.BookRepository) private readonly bookRepository: BookRepository) {}

  /**
   * Phase 1 diagnostic helper.
   * Ensures the repository binding is available while we transition the controller.
   */
  initializeControllerContext(): void {
    // Accessing the repository ensures the binding is evaluated.
    this.bookRepository.getRepositoryIdentifier();
  }
}

export { BookService };
