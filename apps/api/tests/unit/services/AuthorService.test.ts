import { AuthorService, AuthorServiceError } from '../../../src/services/author/AuthorService';
import { Repository as AuthorRepositoryContract } from '../../../src/repositories/author/Repository';
import { emitHookEvent } from '../../../src/services/hooks/hookSystem';
import { EVENTS } from '../../../src/services/hooks/events';

jest.mock('../../../src/services/hooks/hookSystem', () => ({
  emitHookEvent: jest.fn().mockResolvedValue(undefined),
}));

describe('AuthorService', () => {
  let service: AuthorService;
  let repository: jest.Mocked<AuthorRepositoryContract>;
  const emitHookEventMock = emitHookEvent as jest.MockedFunction<typeof emitHookEvent>;

  const userContext = { userId: 1, role: 'user' };

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      findUserAuthorById: jest.fn(),
      findByNameAndSurname: jest.fn(),
      list: jest.fn(),
      searchByQuery: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      countBooks: jest.fn(),
    };

    service = new AuthorService(repository);
    emitHookEventMock.mockClear();
  });

  describe('createAuthor', () => {
    it('creates author for current user', async () => {
      repository.findByNameAndSurname.mockResolvedValue(null);
      repository.create.mockResolvedValue({
        id: 1,
        name: 'John',
        surname: 'Doe',
        userId: 1,
      } as any);

    const author = await service.createAuthor(
      { name: 'John', surname: 'Doe' },
      userContext
    );

    expect(repository.findByNameAndSurname).toHaveBeenCalledWith('John', 'Doe', 1);
    expect(repository.create).toHaveBeenCalledWith({
      name: 'John',
      surname: 'Doe',
      nationality: null,
      userId: 1,
    });
    expect(author.id).toBe(1);
    expect(emitHookEventMock).toHaveBeenNthCalledWith(
      1,
      EVENTS.AUTHOR.CREATE.BEFORE,
      expect.objectContaining({
        user: { id: 1, role: 'user' },
        input: expect.objectContaining({ name: 'John', surname: 'Doe' }),
      })
    );
    expect(emitHookEventMock).toHaveBeenNthCalledWith(
      2,
      EVENTS.AUTHOR.CREATE.AFTER,
      expect.objectContaining({
        author: expect.objectContaining({ id: 1 }),
        user: { id: 1, role: 'user' },
      })
    );
  });

    it('throws when author exists', async () => {
      repository.findByNameAndSurname.mockResolvedValue({ id: 1 } as any);

      await expect(
        service.createAuthor({ name: 'John', surname: 'Doe' }, userContext)
      ).rejects.toThrow(AuthorServiceError);
      expect(emitHookEventMock).toHaveBeenNthCalledWith(
        1,
        EVENTS.AUTHOR.CREATE.BEFORE,
        expect.objectContaining({
          user: { id: 1, role: 'user' },
          input: { name: 'John', surname: 'Doe' },
        })
      );
      expect(emitHookEventMock).toHaveBeenNthCalledWith(
        2,
        EVENTS.AUTHOR.CREATE.FAILURE,
        expect.objectContaining({
          user: { id: 1, role: 'user' },
          input: { name: 'John', surname: 'Doe' },
          error: expect.any(AuthorServiceError),
        })
      );
    });
  });

  describe('updateAuthor', () => {
    it('updates author when owned by user', async () => {
      repository.findById.mockResolvedValue({
        id: 2,
        name: 'Old',
        surname: 'Name',
        userId: 1,
      } as any);
      repository.findByNameAndSurname.mockResolvedValue(null);
      repository.update.mockResolvedValue({
        id: 2,
        name: 'New',
        surname: 'Name',
        userId: 1,
      } as any);

    const updated = await service.updateAuthor(
      2,
      { name: 'New' },
      userContext
    );

    expect(repository.update).toHaveBeenCalledWith(
      2,
      expect.objectContaining({ name: 'New' })
    );
    expect(updated.name).toBe('New');
    expect(emitHookEventMock).toHaveBeenNthCalledWith(
      1,
      EVENTS.AUTHOR.UPDATE.BEFORE,
      expect.objectContaining({
        authorId: 2,
        user: { id: 1, role: 'user' },
        input: { name: 'New' },
      })
    );
    expect(emitHookEventMock).toHaveBeenNthCalledWith(
      2,
      EVENTS.AUTHOR.UPDATE.AFTER,
      expect.objectContaining({
        authorId: 2,
        author: expect.objectContaining({ id: 2 }),
        user: { id: 1, role: 'user' },
      })
    );
  });

    it('throws when user does not own author', async () => {
      repository.findById.mockResolvedValue({
        id: 3,
        name: 'Other',
        surname: 'User',
        userId: 2,
      } as any);

      await expect(
        service.updateAuthor(3, { name: 'Hack' }, userContext)
      ).rejects.toThrow(AuthorServiceError);
      expect(emitHookEventMock).toHaveBeenNthCalledWith(
        1,
        EVENTS.AUTHOR.UPDATE.BEFORE,
        expect.objectContaining({
          authorId: 3,
          user: { id: 1, role: 'user' },
          input: { name: 'Hack' },
        })
      );
      expect(emitHookEventMock).toHaveBeenNthCalledWith(
        2,
        EVENTS.AUTHOR.UPDATE.FAILURE,
        expect.objectContaining({
          authorId: 3,
          user: { id: 1, role: 'user' },
          input: { name: 'Hack' },
          error: expect.any(AuthorServiceError),
        })
      );
    });
  });

  describe('deleteAuthor', () => {
    it('deletes author when without books', async () => {
      repository.findById.mockResolvedValue({
        id: 4,
        name: 'Jane',
        surname: 'Doe',
        userId: 1,
      } as any);
      repository.countBooks.mockResolvedValue(0);
      repository.delete.mockResolvedValue(true);

      await service.deleteAuthor(4, userContext);

      expect(repository.countBooks).toHaveBeenCalledWith(4);
      expect(repository.delete).toHaveBeenCalledWith(4);
      expect(emitHookEventMock).toHaveBeenNthCalledWith(
        1,
        EVENTS.AUTHOR.DELETE.BEFORE,
        expect.objectContaining({
          authorId: 4,
          user: { id: 1, role: 'user' },
          force: false,
        })
      );
      expect(emitHookEventMock).toHaveBeenNthCalledWith(
        2,
        EVENTS.AUTHOR.DELETE.AFTER,
        expect.objectContaining({
          authorId: 4,
          user: { id: 1, role: 'user' },
        })
      );
    });

    it('throws when author has books', async () => {
      repository.findById.mockResolvedValue({
        id: 4,
        name: 'Jane',
        surname: 'Doe',
        userId: 1,
      } as any);
      repository.countBooks.mockResolvedValue(2);

      await expect(service.deleteAuthor(4, userContext)).rejects.toThrow(AuthorServiceError);
      expect(emitHookEventMock).toHaveBeenNthCalledWith(
        1,
        EVENTS.AUTHOR.DELETE.BEFORE,
        expect.objectContaining({
          authorId: 4,
          user: { id: 1, role: 'user' },
          force: false,
        })
      );
      expect(emitHookEventMock).toHaveBeenNthCalledWith(
        2,
        EVENTS.AUTHOR.DELETE.FAILURE,
        expect.objectContaining({
          authorId: 4,
          user: { id: 1, role: 'user' },
          force: false,
          error: expect.any(AuthorServiceError),
        })
      );
    });
  });
});
