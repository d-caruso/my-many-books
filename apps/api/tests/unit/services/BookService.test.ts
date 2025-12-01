import { BookService, BookServiceError } from '../../../src/services/book/BookService';
import { Repository as BookRepositoryContract } from '../../../src/repositories/book/Repository';
import { USER_ROLES } from '@my-many-books/shared-auth';
import { Author } from '../../../src/models/Author';
import { Category } from '../../../src/models/Category';

jest.mock('../../../src/models/Author', () => ({
  Author: {
    findAll: jest.fn(),
  },
}));

jest.mock('../../../src/models/Category', () => ({
  Category: {
    findAll: jest.fn(),
  },
}));

describe('BookService', () => {
  let repository: jest.Mocked<BookRepositoryContract>;
  let service: BookService;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      findUserBookById: jest.fn(),
      findByIsbnCode: jest.fn(),
      listUserBooks: jest.fn(),
      search: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      countUserBooks: jest.fn(),
      findRecentUserBooks: jest.fn(),
    } as unknown as jest.Mocked<BookRepositoryContract>;

    service = new BookService(repository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates a book for the current user and delegates to repository', async () => {
    (repository.create as jest.Mock).mockResolvedValue({
      id: 1,
      title: 'Test Book',
      isbnCode: '1234567890',
      userId: 10,
    });
    (Author.findAll as jest.Mock).mockResolvedValue([]);
    (Category.findAll as jest.Mock).mockResolvedValue([]);

    const result = await service.createBook(
      {
        title: 'Test Book',
        isbnCode: '1234567890',
      },
      { userId: 10, role: USER_ROLES.USER }
    );

    expect(repository.findByIsbnCode).toHaveBeenCalledWith('1234567890', 10);
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Test Book',
        isbnCode: '1234567890',
        userId: 10,
      }),
      undefined
    );
    expect(result.title).toBe('Test Book');
  });

  it('throws when trying to use duplicate ISBN', async () => {
    (repository.findByIsbnCode as jest.Mock).mockResolvedValue({
      id: 99,
      title: 'Existing',
      isbnCode: '123',
    });

    await expect(
      service.createBook(
        { title: 'Another', isbnCode: '123' },
        { userId: 5, role: USER_ROLES.USER }
      )
    ).rejects.toThrow(BookServiceError);
  });

  it('updates a book when user owns it', async () => {
    (repository.findById as jest.Mock).mockResolvedValue({
      id: 7,
      isbnCode: '111',
      title: 'Original',
      userId: 2,
    });
    (repository.update as jest.Mock).mockResolvedValue({
      id: 7,
      isbnCode: '111',
      title: 'Updated',
      userId: 2,
    });

    const updated = await service.updateBook(
      7,
      { title: 'Updated' },
      { userId: 2, role: USER_ROLES.USER }
    );

    expect(repository.update).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ title: 'Updated' }),
      undefined
    );
    expect(updated.title).toBe('Updated');
  });

  it('prevents users from deleting books they do not own', async () => {
    (repository.findById as jest.Mock).mockResolvedValue({
      id: 4,
      isbnCode: '999',
      title: 'Forbidden',
      userId: 50,
    });

    await expect(
      service.deleteBook(4, { userId: 3, role: USER_ROLES.USER })
    ).rejects.toThrow(BookServiceError);
  });
});
