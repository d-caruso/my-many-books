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
  AdminUserRepository: Symbol.for('AdminUserRepository'),
  AdminUserService: Symbol.for('AdminUserService'),
  AdminUserController: Symbol.for('AdminUserController'),
  UserRepository: Symbol.for('UserRepository'),
  UserService: Symbol.for('UserService'),
  UserController: Symbol.for('UserController'),
  SettingsController: Symbol.for('SettingsController'),
  SearchSettingsService: Symbol.for('SearchSettingsService'),
};

export { TYPES };
