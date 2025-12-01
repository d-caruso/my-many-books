import { container } from '../../../src/container';
import { TYPES } from '../../../src/container/types';
import { BookController } from '../../../src/controllers/BookController';
import { BookService } from '../../../src/services/book/BookService';
import { BookRepository } from '../../../src/repositories/book/BookRepository';
import { AuthorRepository } from '../../../src/repositories/author/AuthorRepository';
import { CategoryRepository } from '../../../src/repositories/category/CategoryRepository';
import { UserRepository } from '../../../src/repositories/user/UserRepository';

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

  it('resolves AuthorRepository singleton', () => {
    const first = container.get<AuthorRepository>(TYPES.AuthorRepository);
    const second = container.get<AuthorRepository>(TYPES.AuthorRepository);

    expect(first).toBeInstanceOf(AuthorRepository);
    expect(first).toBe(second);
  });

  it('resolves CategoryRepository singleton', () => {
    const first = container.get<CategoryRepository>(TYPES.CategoryRepository);
    const second = container.get<CategoryRepository>(TYPES.CategoryRepository);

    expect(first).toBeInstanceOf(CategoryRepository);
    expect(first).toBe(second);
  });

  it('resolves UserRepository singleton', () => {
    const first = container.get<UserRepository>(TYPES.UserRepository);
    const second = container.get<UserRepository>(TYPES.UserRepository);

    expect(first).toBeInstanceOf(UserRepository);
    expect(first).toBe(second);
  });
});
