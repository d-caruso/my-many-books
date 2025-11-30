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

const container = new Container({
  defaultScope: 'Singleton',
});

container
  .bind<IBookRepository>(TYPES.BookRepository)
  .to(SequelizeBookRepository)
  .inSingletonScope();
container.bind<BookService>(TYPES.BookService).to(BookService).inSingletonScope();
container.bind<BookController>(TYPES.BookController).to(BookController).inTransientScope();

export { container };
