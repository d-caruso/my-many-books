import { AuthorController } from '../../../src/controllers/AuthorController';
import { Author, Book } from '../../../src/models';
import { container } from '../../../src/container';
import { TYPES } from '../../../src/container/types';
import { AuthorService } from '../../../src/services/author/AuthorService';
import { AuthorRepository } from '../../../src/repositories/author/AuthorRepository';
import { emitHookEvent } from '../../../src/services/hooks/hookSystem';
import { EVENTS } from '../../../src/services/hooks/events';

jest.mock('../../../src/services/hooks/hookSystem', () => ({
  emitHookEvent: jest.fn().mockResolvedValue(undefined),
}));

interface UniversalRequest {
  body?: any;
  queryStringParameters?: Record<string, string | undefined>;
  pathParameters?: Record<string, string | undefined>;
  headers?: Record<string, string | undefined>;
  user?: { userId: number; role?: string };
}

jest.mock('../../../src/models');

describe('AuthorController', () => {
  let authorController: AuthorController;
  let mockRequest: UniversalRequest;
  let createAuthorSpy: jest.SpyInstance;
  let updateAuthorSpy: jest.SpyInstance;
  let deleteAuthorSpy: jest.SpyInstance;
  let findUserAuthorByIdSpy: jest.SpyInstance;
  let findByIdSpy: jest.SpyInstance;
  let searchByQuerySpy: jest.SpyInstance;

  const emitHookEventMock = emitHookEvent as jest.MockedFunction<typeof emitHookEvent>;

  beforeEach(() => {
    container.snapshot();
    authorController = container.get<AuthorController>(TYPES.AuthorController);

    createAuthorSpy = jest.spyOn(AuthorService.prototype, 'createAuthor');
    updateAuthorSpy = jest.spyOn(AuthorService.prototype, 'updateAuthor');
    deleteAuthorSpy = jest.spyOn(AuthorService.prototype, 'deleteAuthor');
    findUserAuthorByIdSpy = jest
      .spyOn(AuthorRepository.prototype, 'findUserAuthorById')
      .mockResolvedValue(null);
    findByIdSpy = jest.spyOn(AuthorRepository.prototype, 'findById').mockResolvedValue(null);
    searchByQuerySpy = jest
      .spyOn(AuthorRepository.prototype, 'searchByQuery')
      .mockResolvedValue([]);

    mockRequest = {
      headers: { 'accept-language': 'en' },
      queryStringParameters: {},
      pathParameters: {},
      user: { userId: 1, role: 'user' },
    };
    emitHookEventMock.mockClear();
  });

  afterEach(() => {
    createAuthorSpy.mockRestore();
    updateAuthorSpy.mockRestore();
    deleteAuthorSpy.mockRestore();
    findUserAuthorByIdSpy.mockRestore();
    findByIdSpy.mockRestore();
    searchByQuerySpy.mockRestore();
    container.restore();
  });

  describe('createAuthor', () => {
    it('should create an author successfully', async () => {
      const payload = { name: 'John', surname: 'Doe', nationality: 'IT' };
      mockRequest.body = JSON.stringify(payload);

      createAuthorSpy.mockResolvedValue({
        id: 1,
        ...payload,
        userId: 1,
      } as any);

      const response = await authorController.createAuthor(mockRequest);

      expect(createAuthorSpy).toHaveBeenCalledWith(
        expect.objectContaining(payload),
        expect.objectContaining({ userId: 1 })
      );
      expect(response.statusCode).toBe(201);
      expect(response.success).toBe(true);
      expect((response.data as { id: number }).id).toBe(1);
      expect(emitHookEventMock).toHaveBeenCalledWith(
        EVENTS.AUTHOR.CREATE.BEFORE,
        expect.objectContaining({
          user: { id: 1, role: 'user' },
          input: expect.objectContaining(payload),
        })
      );
    });

  });

  describe('updateAuthor', () => {
    it('should update author through service', async () => {
      mockRequest.pathParameters = { id: '1' };
      mockRequest.body = JSON.stringify({ nationality: 'US' });

      updateAuthorSpy.mockResolvedValue({
        id: 1,
        name: 'John',
        surname: 'Doe',
        userId: 1,
      } as any);

      const response = await authorController.updateAuthor(mockRequest);

      expect(updateAuthorSpy).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ nationality: 'US' }),
        expect.objectContaining({ userId: 1 })
      );
      expect(response.statusCode).toBe(200);
      expect(emitHookEventMock).toHaveBeenCalledWith(
        EVENTS.AUTHOR.UPDATE.BEFORE,
        expect.objectContaining({
          authorId: 1,
          user: { id: 1, role: 'user' },
          input: expect.objectContaining({ nationality: 'US' }),
        })
      );
    });

  });

  describe('deleteAuthor', () => {
    it('should call service to delete author', async () => {
      mockRequest.pathParameters = { id: '2' };
      deleteAuthorSpy.mockResolvedValue(undefined);

      const response = await authorController.deleteAuthor(mockRequest);

      expect(deleteAuthorSpy).toHaveBeenCalledWith(
        2,
        expect.objectContaining({ userId: 1 })
      );
      expect(response.statusCode).toBe(204);
      expect(emitHookEventMock).toHaveBeenCalledWith(
        EVENTS.AUTHOR.DELETE.BEFORE,
        expect.objectContaining({
          authorId: 2,
          user: { id: 1, role: 'user' },
        })
      );
    });
  });

  describe('getAuthor', () => {
    it('should return author for current user', async () => {
      findUserAuthorByIdSpy.mockResolvedValue({
        id: 1,
        name: 'John',
        surname: 'Doe',
        userId: 1,
      });
      mockRequest.pathParameters = { id: '1' };

      const response = await authorController.getAuthor(mockRequest);

      expect(findUserAuthorByIdSpy).toHaveBeenCalledWith(1, 1, expect.any(Object));
      expect(response.statusCode).toBe(200);
      expect(response.data).toMatchObject({ id: 1, name: 'John' });
    });

    it('should return 404 when author not found', async () => {
      mockRequest.pathParameters = { id: '999' };

      const response = await authorController.getAuthor(mockRequest);

      expect(response.statusCode).toBe(404);
    });
  });

  describe('listAuthors', () => {
    it('should list authors with pagination', async () => {
      (Author.findAndCountAll as jest.Mock).mockResolvedValue({
        count: 1,
        rows: [{ id: 1, name: 'John', surname: 'Doe' }],
      });

      const response = await authorController.listAuthors(mockRequest);

      expect(Author.findAndCountAll).toHaveBeenCalled();
      expect(response.statusCode).toBe(200);
      expect(response.data).toHaveLength(1);
      expect(response.pagination).toBeDefined();
    });
  });

  describe('searchAuthors', () => {
    it('should delegate to repository search', async () => {
      mockRequest.queryStringParameters = { q: 'jo' };
      searchByQuerySpy.mockResolvedValue([
        { id: 1, name: 'John', surname: 'Doe' },
      ]);

      const response = await authorController.searchAuthors(mockRequest);

      expect(searchByQuerySpy).toHaveBeenCalledWith('jo', 1, 20);
      expect(response.statusCode).toBe(200);
      expect(response.data).toHaveLength(1);
    });
  });

  describe('getAuthorBooks', () => {
    it('should return books for author', async () => {
      findByIdSpy.mockResolvedValue({
        id: 2,
        name: 'Jane',
        surname: 'Smith',
        userId: 1,
      });
      mockRequest.pathParameters = { id: '2' };
      (Book.findAndCountAll as jest.Mock).mockResolvedValue({
        count: 1,
        rows: [{ id: 10, title: 'Book Title' }],
      });

      const response = await authorController.getAuthorBooks(mockRequest);

      expect(findByIdSpy).toHaveBeenCalledWith(2);
      expect(Book.findAndCountAll).toHaveBeenCalled();
      expect(response.statusCode).toBe(200);
      expect((response.data as any).books).toHaveLength(1);
    });
  });
});
