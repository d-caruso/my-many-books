// ================================================================
// src/container/types.ts
// Token definitions for the DI container
// ================================================================

const TYPES = {
  BookRepository: Symbol.for('BookRepository'),
  BookService: Symbol.for('BookService'),
  BookController: Symbol.for('BookController'),
  AuthorRepository: Symbol.for('AuthorRepository'),
};

export { TYPES };
