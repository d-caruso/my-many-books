// ================================================================
// src/repositories/book/BookRepository.ts
// Temporary repository placeholder (Phase 1)
// ================================================================

import { injectable } from 'inversify';
import { Book } from '../../models';

@injectable()
class BookRepository {
  /**
   * Returns a simple identifier to verify bindings.
   * This will be replaced with real persistence logic in Task 1.2.
   */
  getRepositoryIdentifier(): string {
    return Book?.name ?? 'BookModel';
  }
}

export { BookRepository };
