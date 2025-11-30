// ================================================================
// src/container/index.ts
// Inversify container configuration
// ================================================================

import 'reflect-metadata';
import { Container } from 'inversify';
import { TYPES } from './types';
import { BookController } from '../controllers/BookController';
import { SequelizeBookRepository } from '../repositories/book/SequelizeBookRepository';
import { IBookRepository } from '../repositories/book/IBookRepository';
import { BookService } from '../services/book/BookService';
import { AuthorController } from '../controllers/AuthorController';
import { IAuthorRepository } from '../repositories/author/IAuthorRepository';
import { SequelizeAuthorRepository } from '../repositories/author/SequelizeAuthorRepository';
import { AuthorService } from '../services/author/AuthorService';
import { CategoryController } from '../controllers/CategoryController';
import { ICategoryRepository } from '../repositories/category/ICategoryRepository';
import { SequelizeCategoryRepository } from '../repositories/category/SequelizeCategoryRepository';
import { CategoryService } from '../services/category/CategoryService';
import { AdminUserController } from '../controllers/admin/AdminUserController';
import { IUserRepository } from '../repositories/user/IUserRepository';
import { SequelizeUserRepository } from '../repositories/user/SequelizeUserRepository';
import { AdminUserService } from '../services/user/AdminUserService';
import { UserController } from '../controllers/UserController';
import { UserService } from '../services/user/UserService';

const container = new Container({
  defaultScope: 'Singleton',
});

container
  .bind<IBookRepository>(TYPES.BookRepository)
  .to(SequelizeBookRepository)
  .inSingletonScope();
container.bind<BookService>(TYPES.BookService).to(BookService).inSingletonScope();
container.bind<BookController>(TYPES.BookController).to(BookController).inTransientScope();

container
  .bind<IAuthorRepository>(TYPES.AuthorRepository)
  .to(SequelizeAuthorRepository)
  .inSingletonScope();
container.bind<AuthorService>(TYPES.AuthorService).to(AuthorService).inSingletonScope();
container.bind<AuthorController>(TYPES.AuthorController).to(AuthorController).inTransientScope();

container
  .bind<ICategoryRepository>(TYPES.CategoryRepository)
  .to(SequelizeCategoryRepository)
  .inSingletonScope();
container.bind<CategoryService>(TYPES.CategoryService).to(CategoryService).inSingletonScope();
container
  .bind<CategoryController>(TYPES.CategoryController)
  .to(CategoryController)
  .inTransientScope();

container
  .bind<IUserRepository>(TYPES.UserRepository)
  .to(SequelizeUserRepository)
  .inSingletonScope();
container.bind<UserService>(TYPES.UserService).to(UserService).inSingletonScope();
container.bind<UserController>(TYPES.UserController).to(UserController).inTransientScope();
container
  .bind<IUserRepository>(TYPES.AdminUserRepository)
  .to(SequelizeUserRepository)
  .inSingletonScope();
container.bind<AdminUserService>(TYPES.AdminUserService).to(AdminUserService).inSingletonScope();
container
  .bind<AdminUserController>(TYPES.AdminUserController)
  .to(AdminUserController)
  .inTransientScope();

export { container };
