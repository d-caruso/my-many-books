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

export { container };
