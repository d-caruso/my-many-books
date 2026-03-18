import { emitHookEvent } from '../../../src/services/hooks/hookSystem';
import { EVENTS } from '../../../src/services/hooks/events';
import {
  AdminBookMutationService,
  AdminBookMutationServiceError,
} from '../../../src/services/book/AdminBookMutationService';
import { Repository as BookRepositoryContract } from '../../../src/repositories/book/Repository';
import { User } from '../../../src/models/User';

jest.mock('../../../src/services/hooks/hookSystem', () => ({
  emitHookEvent: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../src/models/User', () => ({
  User: {
    findByPk: jest.fn(),
  },
}));

describe('AdminBookMutationService', () => {
  let repository: jest.Mocked<BookRepositoryContract>;
  let service: AdminBookMutationService;
  const emitHookEventMock = emitHookEvent as jest.MockedFunction<typeof emitHookEvent>;

  beforeEach(() => {
    repository = {
      search: jest.fn(),
      findById: jest.fn(),
      findByIsbnCode: jest.fn(),
      findUserBookById: jest.fn(),
      listUserBooks: jest.fn(),
      countUserBooks: jest.fn(),
      findRecentUserBooks: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<BookRepositoryContract>;

    service = new AdminBookMutationService(repository);
    emitHookEventMock.mockClear();
    (User.findByPk as jest.Mock).mockReset();
  });

  it('emits update hooks for admin book updates', async () => {
    repository.findById.mockResolvedValue({ id: 4, title: 'Original', userId: 2 } as any);
    repository.update.mockResolvedValue({ id: 4, title: 'Updated', userId: 2 } as any);

    const result = await service.updateBook(
      4,
      { title: 'Updated' },
      { userId: 99, role: 'admin' }
    );

    expect(result.title).toBe('Updated');
    expect(emitHookEventMock).toHaveBeenNthCalledWith(
      1,
      EVENTS.BOOK.UPDATE.BEFORE,
      expect.objectContaining({
        bookId: 4,
        input: { title: 'Updated' },
        admin: { id: 99, role: 'admin' },
      })
    );
    expect(emitHookEventMock).toHaveBeenNthCalledWith(
      2,
      EVENTS.BOOK.UPDATE.AFTER,
      expect.objectContaining({
        bookId: 4,
        book: expect.objectContaining({ title: 'Updated' }),
        previousBook: expect.objectContaining({ title: 'Original' }),
        admin: { id: 99, role: 'admin' },
      })
    );
  });

  it('emits update failure hooks when admin book update fails', async () => {
    const repositoryError = new Error('write failed');
    repository.findById.mockResolvedValue({ id: 4, title: 'Original', userId: 2 } as any);
    repository.update.mockRejectedValue(repositoryError);

    await expect(
      service.updateBook(4, { title: 'Updated' }, { userId: 99, role: 'admin' })
    ).rejects.toThrow(repositoryError);

    expect(emitHookEventMock).toHaveBeenNthCalledWith(
      1,
      EVENTS.BOOK.UPDATE.BEFORE,
      expect.any(Object)
    );
    expect(emitHookEventMock).toHaveBeenNthCalledWith(
      2,
      EVENTS.BOOK.UPDATE.FAILURE,
      expect.objectContaining({
        bookId: 4,
        book: expect.objectContaining({ title: 'Original' }),
        admin: { id: 99, role: 'admin' },
        error: repositoryError,
      })
    );
  });

  it('rejects update when reassigned user does not exist', async () => {
    repository.findById.mockResolvedValue({ id: 4, title: 'Original', userId: 2 } as any);
    (User.findByPk as jest.Mock).mockResolvedValue(null);

    await expect(
      service.updateBook(4, { userId: 777 }, { userId: 99, role: 'admin' })
    ).rejects.toThrow(AdminBookMutationServiceError);

    expect(emitHookEventMock).toHaveBeenNthCalledWith(
      2,
      EVENTS.BOOK.UPDATE.FAILURE,
      expect.objectContaining({
        bookId: 4,
        error: expect.any(AdminBookMutationServiceError),
      })
    );
  });

  it('emits delete hooks for admin deletes', async () => {
    repository.findById.mockResolvedValue({ id: 4, title: 'Delete Me', userId: 2 } as any);
    repository.delete.mockResolvedValue(true);

    await service.deleteBook(4, { userId: 99, role: 'admin' });

    expect(emitHookEventMock).toHaveBeenNthCalledWith(
      1,
      EVENTS.BOOK.DELETE.BEFORE,
      expect.objectContaining({
        bookId: 4,
        admin: { id: 99, role: 'admin' },
      })
    );
    expect(emitHookEventMock).toHaveBeenNthCalledWith(
      2,
      EVENTS.BOOK.DELETE.AFTER,
      expect.objectContaining({
        bookId: 4,
        book: expect.objectContaining({ title: 'Delete Me' }),
        admin: { id: 99, role: 'admin' },
      })
    );
  });

  it('emits delete failure hooks when delete fails', async () => {
    repository.findById.mockResolvedValue({ id: 4, title: 'Delete Me', userId: 2 } as any);
    repository.delete.mockResolvedValue(false);

    await expect(service.deleteBook(4, { userId: 99, role: 'admin' })).rejects.toThrow(
      AdminBookMutationServiceError
    );

    expect(emitHookEventMock).toHaveBeenNthCalledWith(
      1,
      EVENTS.BOOK.DELETE.BEFORE,
      expect.any(Object)
    );
    expect(emitHookEventMock).toHaveBeenNthCalledWith(
      2,
      EVENTS.BOOK.DELETE.FAILURE,
      expect.objectContaining({
        bookId: 4,
        book: expect.objectContaining({ title: 'Delete Me' }),
        admin: { id: 99, role: 'admin' },
        error: expect.any(AdminBookMutationServiceError),
      })
    );
  });
});
