import { BookService, BookServiceError } from '../../../src/services/book/BookService';
import { Repository as BookRepositoryContract } from '../../../src/repositories/book/Repository';
import { USER_ROLES } from '@my-many-books/shared-auth';
import { Author } from '../../../src/models/Author';
import { Category } from '../../../src/models/Category';
import { emitHookEvent } from '../../../src/services/hooks/hookSystem';
import { BOOK_STATUS } from '@my-many-books/shared-types';
import { EVENTS } from '../../../src/services/hooks/events';

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

jest.mock('../../../src/services/hooks/hookSystem', () => ({
  emitHookEvent: jest.fn().mockResolvedValue(undefined),
}));

describe('BookService', () => {
  let repository: jest.Mocked<BookRepositoryContract>;
  let service: BookService;
  const emitHookEventMock = emitHookEvent as jest.MockedFunction<typeof emitHookEvent>;

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
    emitHookEventMock.mockClear();
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
    expect(emitHookEventMock).toHaveBeenNthCalledWith(
      1,
      EVENTS.BOOK.CREATE.BEFORE,
      expect.objectContaining({
        user: { id: 10, role: USER_ROLES.USER },
        input: expect.objectContaining({ title: 'Test Book' }),
      })
    );
    expect(emitHookEventMock).toHaveBeenNthCalledWith(
      2,
      EVENTS.BOOK.CREATE.AFTER,
      expect.objectContaining({
        book: expect.objectContaining({ title: 'Test Book' }),
        user: { id: 10, role: USER_ROLES.USER },
      })
    );
  });

  it('does not wait for hook emission before completing createBook', async () => {
    emitHookEventMock.mockImplementation(() => new Promise(() => {}));
    (repository.create as jest.Mock).mockResolvedValue({
      id: 2,
      title: 'Async Hooks',
      isbnCode: '9999999999',
      userId: 10,
    });
    (Author.findAll as jest.Mock).mockResolvedValue([]);
    (Category.findAll as jest.Mock).mockResolvedValue([]);

    await expect(
      service.createBook(
        {
          title: 'Async Hooks',
          isbnCode: '9999999999',
        },
        { userId: 10, role: USER_ROLES.USER }
      )
    ).resolves.toEqual(
      expect.objectContaining({
        id: 2,
        title: 'Async Hooks',
      })
    );

    expect(repository.create).toHaveBeenCalled();
    expect(emitHookEventMock).toHaveBeenCalledWith(
      EVENTS.BOOK.CREATE.BEFORE,
      expect.objectContaining({
        user: { id: 10, role: USER_ROLES.USER },
      })
    );
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
    expect(emitHookEventMock).toHaveBeenNthCalledWith(
      1,
      EVENTS.BOOK.CREATE.BEFORE,
      expect.objectContaining({
        user: { id: 5, role: USER_ROLES.USER },
        input: expect.objectContaining({ title: 'Another', isbnCode: '123' }),
      })
    );
    expect(emitHookEventMock).toHaveBeenNthCalledWith(
      2,
      EVENTS.BOOK.CREATE.FAILURE,
      expect.objectContaining({
        user: { id: 5, role: USER_ROLES.USER },
        input: expect.objectContaining({ title: 'Another', isbnCode: '123' }),
        error: expect.any(BookServiceError),
      })
    );
  });

  it('updates a book when user owns it', async () => {
    (repository.findById as jest.Mock).mockResolvedValue({
      id: 7,
      isbnCode: '111',
      title: 'Original',
      status: BOOK_STATUS.READING,
      userId: 2,
    });
    (repository.update as jest.Mock).mockResolvedValue({
      id: 7,
      isbnCode: '111',
      title: 'Updated',
      status: BOOK_STATUS.FINISHED,
      userId: 2,
    });

    const updated = await service.updateBook(
      7,
      { title: 'Updated', status: BOOK_STATUS.FINISHED },
      { userId: 2, role: USER_ROLES.USER }
    );

    expect(repository.update).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ title: 'Updated' }),
      undefined
    );
    expect(updated.title).toBe('Updated');
    expect(emitHookEventMock).toHaveBeenNthCalledWith(
      1,
      EVENTS.BOOK.UPDATE.BEFORE,
      expect.objectContaining({
        bookId: 7,
        user: { id: 2, role: USER_ROLES.USER },
        input: expect.objectContaining({ title: 'Updated', status: BOOK_STATUS.FINISHED }),
      })
    );
    expect(emitHookEventMock).toHaveBeenNthCalledWith(
      2,
      EVENTS.BOOK.STATUS.CHANGE.BEFORE,
      expect.objectContaining({
        bookId: 7,
        previousStatus: BOOK_STATUS.READING,
        nextStatus: BOOK_STATUS.FINISHED,
      })
    );
    expect(emitHookEventMock).toHaveBeenNthCalledWith(
      3,
      EVENTS.BOOK.UPDATE.AFTER,
      expect.objectContaining({
        bookId: 7,
        user: { id: 2, role: USER_ROLES.USER },
      })
    );
    expect(emitHookEventMock).toHaveBeenNthCalledWith(
      4,
      EVENTS.BOOK.STATUS.CHANGE.AFTER,
      expect.objectContaining({
        bookId: 7,
        previousStatus: BOOK_STATUS.READING,
        newStatus: BOOK_STATUS.FINISHED,
      })
    );
  });

  it('accepts author associations when model userId is a numeric string matching the owner', async () => {
    (repository.findById as jest.Mock).mockResolvedValue({
      id: 9,
      isbnCode: '222',
      title: 'Owned Book',
      status: BOOK_STATUS.READING,
      userId: 10,
    });
    (Author.findAll as jest.Mock).mockResolvedValue([
      { id: 1598, userId: '10' as unknown as number },
    ]);
    (repository.update as jest.Mock).mockResolvedValue({
      id: 9,
      isbnCode: '222',
      title: 'Owned Book',
      status: BOOK_STATUS.READING,
      userId: 10,
    });

    await expect(
      service.updateBook(
        9,
        { authorIds: [1598] },
        { userId: 10, role: USER_ROLES.USER }
      )
    ).resolves.toEqual(
      expect.objectContaining({
        id: 9,
        userId: 10,
      })
    );

    expect(Author.findAll).toHaveBeenCalledWith({ where: { id: [1598] } });
    expect(repository.update).toHaveBeenCalledWith(
      9,
      {},
      expect.objectContaining({ authorIds: [1598] })
    );
  });

  it('emits failure hooks when update fails after a status change starts', async () => {
    const repositoryError = new Error('update failed');
    (repository.findById as jest.Mock).mockResolvedValue({
      id: 11,
      isbnCode: '333',
      title: 'Broken Update',
      status: BOOK_STATUS.READING,
      userId: 2,
    });
    (repository.update as jest.Mock).mockRejectedValue(repositoryError);

    await expect(
      service.updateBook(
        11,
        { status: BOOK_STATUS.FINISHED },
        { userId: 2, role: USER_ROLES.USER }
      )
    ).rejects.toThrow(repositoryError);

    expect(emitHookEventMock).toHaveBeenNthCalledWith(
      1,
      EVENTS.BOOK.UPDATE.BEFORE,
      expect.objectContaining({
        bookId: 11,
        user: { id: 2, role: USER_ROLES.USER },
        input: { status: BOOK_STATUS.FINISHED },
      })
    );
    expect(emitHookEventMock).toHaveBeenNthCalledWith(
      2,
      EVENTS.BOOK.STATUS.CHANGE.BEFORE,
      expect.objectContaining({
        bookId: 11,
        previousStatus: BOOK_STATUS.READING,
        nextStatus: BOOK_STATUS.FINISHED,
      })
    );
    expect(emitHookEventMock).toHaveBeenNthCalledWith(
      3,
      EVENTS.BOOK.UPDATE.FAILURE,
      expect.objectContaining({
        bookId: 11,
        user: { id: 2, role: USER_ROLES.USER },
        input: { status: BOOK_STATUS.FINISHED },
        error: repositoryError,
      })
    );
    expect(emitHookEventMock).toHaveBeenNthCalledWith(
      4,
      EVENTS.BOOK.STATUS.CHANGE.FAILURE,
      expect.objectContaining({
        bookId: 11,
        previousStatus: BOOK_STATUS.READING,
        nextStatus: BOOK_STATUS.FINISHED,
        error: repositoryError,
      })
    );
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
    expect(emitHookEventMock).toHaveBeenNthCalledWith(
      1,
      EVENTS.BOOK.DELETE.BEFORE,
      expect.objectContaining({
        bookId: 4,
        user: { id: 3, role: USER_ROLES.USER },
      })
    );
    expect(emitHookEventMock).toHaveBeenNthCalledWith(
      2,
      EVENTS.BOOK.DELETE.FAILURE,
      expect.objectContaining({
        bookId: 4,
        user: { id: 3, role: USER_ROLES.USER },
        error: expect.any(BookServiceError),
      })
    );
  });

  it('emits hook event after deleting a book', async () => {
    (repository.findById as jest.Mock).mockResolvedValue({
      id: 8,
      isbnCode: '555',
      title: 'Removable',
      userId: 8,
    });
    (repository.delete as jest.Mock).mockResolvedValue(true);

    await service.deleteBook(8, { userId: 8, role: USER_ROLES.USER });

    expect(emitHookEventMock).toHaveBeenNthCalledWith(
      1,
      EVENTS.BOOK.DELETE.BEFORE,
      expect.objectContaining({
        bookId: 8,
        user: { id: 8, role: USER_ROLES.USER },
      })
    );
    expect(emitHookEventMock).toHaveBeenNthCalledWith(
      2,
      EVENTS.BOOK.DELETE.AFTER,
      expect.objectContaining({
        bookId: 8,
      })
    );
  });
});
