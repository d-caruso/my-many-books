// ================================================================
// src/container/types.ts
// Token definitions for the DI container
// ================================================================

const TYPES = {
  BookRepository: Symbol.for('BookRepository'),
  BookService: Symbol.for('BookService'),
  BookController: Symbol.for('BookController'),
  AuthorRepository: Symbol.for('AuthorRepository'),
  AuthorService: Symbol.for('AuthorService'),
  AuthorController: Symbol.for('AuthorController'),
  CategoryRepository: Symbol.for('CategoryRepository'),
  CategoryService: Symbol.for('CategoryService'),
  CategoryController: Symbol.for('CategoryController'),
  UserRepository: Symbol.for('UserRepository'),
  UserService: Symbol.for('UserService'),
  UserController: Symbol.for('UserController'),
};

export { TYPES };
