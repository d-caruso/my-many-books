// ================================================================
// src/container/index.ts
// Inversify container configuration
// ================================================================

import 'reflect-metadata';
import { Container } from 'inversify';
import { TYPES } from './types';
import { BookController } from '../controllers/BookController';
import { BookRepository } from '../repositories/book/BookRepository';
import { Repository as BookRepositoryContract } from '../repositories/book/Repository';
import { BookService } from '../services/book/BookService';
import { AuthorController } from '../controllers/AuthorController';
import { Repository as AuthorRepositoryContract } from '../repositories/author/Repository';
import { AuthorRepository } from '../repositories/author/AuthorRepository';
import { AuthorService } from '../services/author/AuthorService';
import { CategoryController } from '../controllers/CategoryController';
import { Repository as CategoryRepositoryContract } from '../repositories/category/Repository';
import { CategoryRepository } from '../repositories/category/CategoryRepository';
import { CategoryService } from '../services/category/CategoryService';
import { AdminUserController } from '../controllers/admin/AdminUserController';
import { Repository as UserRepositoryContract } from '../repositories/user/Repository';
import { UserRepository } from '../repositories/user/UserRepository';
import { AdminUserService } from '../services/user/AdminUserService';
import { UserController } from '../controllers/UserController';
import { UserService } from '../services/user/UserService';
import { SettingsController } from '../controllers/SettingsController';

const container = new Container({
  defaultScope: 'Singleton',
});

container.bind<BookRepositoryContract>(TYPES.BookRepository).to(BookRepository).inSingletonScope();
container.bind<BookService>(TYPES.BookService).to(BookService).inSingletonScope();
container.bind<BookController>(TYPES.BookController).to(BookController).inTransientScope();

container
  .bind<AuthorRepositoryContract>(TYPES.AuthorRepository)
  .to(AuthorRepository)
  .inSingletonScope();
container.bind<AuthorService>(TYPES.AuthorService).to(AuthorService).inSingletonScope();
container.bind<AuthorController>(TYPES.AuthorController).to(AuthorController).inTransientScope();

container
  .bind<CategoryRepositoryContract>(TYPES.CategoryRepository)
  .to(CategoryRepository)
  .inSingletonScope();
container.bind<CategoryService>(TYPES.CategoryService).to(CategoryService).inSingletonScope();
container
  .bind<CategoryController>(TYPES.CategoryController)
  .to(CategoryController)
  .inTransientScope();

container.bind<UserRepositoryContract>(TYPES.UserRepository).to(UserRepository).inSingletonScope();
container.bind<UserService>(TYPES.UserService).to(UserService).inSingletonScope();
container.bind<UserController>(TYPES.UserController).to(UserController).inTransientScope();
container
  .bind<UserRepositoryContract>(TYPES.AdminUserRepository)
  .to(UserRepository)
  .inSingletonScope();
container.bind<AdminUserService>(TYPES.AdminUserService).to(AdminUserService).inSingletonScope();
container
  .bind<AdminUserController>(TYPES.AdminUserController)
  .to(AdminUserController)
  .inTransientScope();

container
  .bind<SettingsController>(TYPES.SettingsController)
  .to(SettingsController)
  .inTransientScope();

export { container };
