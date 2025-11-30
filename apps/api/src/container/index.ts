// ================================================================
// src/container/index.ts
// Inversify container configuration
// ================================================================

import 'reflect-metadata';
import { Container } from 'inversify';
import { TYPES } from './types';
import { BookController } from '../controllers/BookController';
import { BookRepository } from '../repositories/book/BookRepository';
import { BookService } from '../services/book/BookService';

const container = new Container({
  defaultScope: 'Singleton',
});

container.bind<BookRepository>(TYPES.BookRepository).to(BookRepository).inSingletonScope();
container.bind<BookService>(TYPES.BookService).to(BookService).inSingletonScope();
container.bind<BookController>(TYPES.BookController).to(BookController).inTransientScope();

export { container };
