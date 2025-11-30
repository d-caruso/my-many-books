import { container } from '../../../src/container';
import { TYPES } from '../../../src/container/types';
import { BookController } from '../../../src/controllers/BookController';
import { BookService } from '../../../src/services/book/BookService';
import { BookRepository } from '../../../src/repositories/book/BookRepository';

describe('DI Container Configuration', () => {
  beforeEach(() => {
    container.snapshot();
  });

  afterEach(() => {
    container.restore();
  });

  it('resolves BookController with dependencies', () => {
    const controller = container.get<BookController>(TYPES.BookController);
    expect(controller).toBeInstanceOf(BookController);
  });

  it('resolves BookService singleton', () => {
    const first = container.get<BookService>(TYPES.BookService);
    const second = container.get<BookService>(TYPES.BookService);

    expect(first).toBeInstanceOf(BookService);
    expect(first).toBe(second);
  });

  it('resolves BookRepository singleton', () => {
    const first = container.get<BookRepository>(TYPES.BookRepository);
    const second = container.get<BookRepository>(TYPES.BookRepository);

    expect(first).toBeInstanceOf(BookRepository);
    expect(first).toBe(second);
  });
});
