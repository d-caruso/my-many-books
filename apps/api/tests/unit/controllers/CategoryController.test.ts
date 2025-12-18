import { CategoryController } from '../../../src/controllers/CategoryController';
import {
  CategoryService,
  CategoryServiceError,
} from '../../../src/services/category/CategoryService';
import { Book } from '../../../src/models/Book';
import { UniversalRequest } from '../../../src/types';
import { CategoryEntity } from '../../../src/repositories/category/CategoryRepositoryTypes';
import { emitHookEvent } from '../../../src/services/hooks/hookSystem';
import { EVENTS } from '../../../src/services/hooks/events';

jest.mock('../../../src/services/hooks/hookSystem', () => ({
  emitHookEvent: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../src/models/Book', () => ({
  Book: {
    findAndCountAll: jest.fn(),
  },
}));

jest.mock('../../../src/models/Category', () => ({
  Category: {},
}));

describe('CategoryController', () => {
  let controller: CategoryController;
  let mockService: jest.Mocked<CategoryService>;
  let baseRequest: UniversalRequest;
  const emitHookEventMock = emitHookEvent as jest.MockedFunction<typeof emitHookEvent>;

  const buildCategory = (overrides: Partial<CategoryEntity> = {}): CategoryEntity => ({
    id: 1,
    name: 'Category',
    userId: 1,
    creationDate: new Date(),
    updateDate: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    mockService = {
      initializeControllerContext: jest.fn(),
      getCategory: jest.fn(),
      listCategories: jest.fn(),
      searchCategories: jest.fn(),
      createCategory: jest.fn(),
      updateCategory: jest.fn(),
      deleteCategory: jest.fn(),
    } as unknown as jest.Mocked<CategoryService>;

    controller = new CategoryController(mockService as unknown as CategoryService);

    baseRequest = {
      headers: { 'accept-language': 'en' },
      queryStringParameters: {},
      pathParameters: {},
      user: { id: 1, email: 'test@example.com', role: 'user', provider: 'cognito' },
    };

    jest.clearAllMocks();
    emitHookEventMock.mockClear();
  });

  describe('createCategory', () => {
    it('creates category via service', async () => {
      mockService.createCategory.mockResolvedValue(
        buildCategory({ id: 1, name: 'Fiction' })
      );

      const response = await controller.createCategory({
        ...baseRequest,
        body: { name: 'Fiction' },
      });

      expect(mockService.createCategory).toHaveBeenCalledWith(
        { name: 'Fiction' },
        expect.objectContaining({ userId: 1 })
      );
      expect(response.statusCode).toBe(201);
      expect(response.data).toMatchObject({ id: 1, name: 'Fiction', userId: 1 });
      expect(emitHookEventMock).toHaveBeenCalledWith(
        EVENTS.CATEGORY.CREATE.BEFORE,
        expect.objectContaining({
          user: { id: 1, role: 'user' },
          input: { name: 'Fiction' },
        })
      );
    });


    it('handles service errors', async () => {
      mockService.createCategory.mockRejectedValue(
        new CategoryServiceError('DUPLICATE_CATEGORY')
      );

      const response = await controller.createCategory({
        ...baseRequest,
        body: { name: 'Fiction' },
      });

      expect(response.statusCode).toBe(409);
      expect(response.success).toBe(false);
    });
  });

  describe('getCategory', () => {
    it('returns DTO from service', async () => {
      mockService.getCategory.mockResolvedValue(
        buildCategory({ id: 10, name: 'Mystery' })
      );

      const response = await controller.getCategory({
        ...baseRequest,
        pathParameters: { id: '10' },
      });

      expect(mockService.getCategory).toHaveBeenCalledWith(10, expect.any(Object), false);
      expect(response.data).toMatchObject({ id: 10, name: 'Mystery', userId: 1 });
    });

    it('validates id parameter', async () => {
      const response = await controller.getCategory({
        ...baseRequest,
        pathParameters: { id: 'abc' },
      });

      expect(response.statusCode).toBe(400);
      expect(mockService.getCategory).not.toHaveBeenCalled();
    });

    it('maps service not found error', async () => {
      mockService.getCategory.mockRejectedValue(
        new CategoryServiceError('CATEGORY_NOT_FOUND')
      );

      const response = await controller.getCategory({
        ...baseRequest,
        pathParameters: { id: '99' },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('updateCategory', () => {
    it('updates via service', async () => {
      mockService.updateCategory.mockResolvedValue(
        buildCategory({ id: 2, name: 'Updated' })
      );

      const response = await controller.updateCategory({
        ...baseRequest,
        pathParameters: { id: '2' },
        body: { name: 'Updated' },
      });

      expect(mockService.updateCategory).toHaveBeenCalledWith(
        2,
        { name: 'Updated' },
        expect.any(Object)
      );
      expect(response.data).toMatchObject({ id: 2, name: 'Updated', userId: 1 });
      expect(emitHookEventMock).toHaveBeenCalledWith(
        EVENTS.CATEGORY.UPDATE.BEFORE,
        expect.objectContaining({
          categoryId: 2,
          user: { id: 1, role: 'user' },
          input: { name: 'Updated' },
        })
      );
    });

  });

  describe('deleteCategory', () => {
    it('deletes via service with force flag', async () => {
      mockService.deleteCategory.mockResolvedValue();

      const response = await controller.deleteCategory({
        ...baseRequest,
        pathParameters: { id: '3' },
        queryStringParameters: { force: 'true' },
      });

      expect(mockService.deleteCategory).toHaveBeenCalledWith(
        3,
        expect.any(Object),
        { force: true }
      );
      expect(response.statusCode).toBe(204);
      expect(emitHookEventMock).toHaveBeenCalledWith(
        EVENTS.CATEGORY.DELETE.BEFORE,
        expect.objectContaining({
          categoryId: 3,
          user: { id: 1, role: 'user' },
          force: true,
        })
      );
    });
  });

  describe('listCategories', () => {
    it('returns paginated categories', async () => {
      mockService.listCategories.mockResolvedValue({
        rows: [
          buildCategory({ id: 1, name: 'Fiction' }),
          buildCategory({ id: 2, name: 'Science' }),
        ],
        total: 2,
        limit: 20,
        offset: 0,
      });

      const response = await controller.listCategories({
        ...baseRequest,
        queryStringParameters: { page: '1', limit: '20', search: 'fi' },
      });

      expect(mockService.listCategories).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'fi', limit: 20, offset: 0 }),
        expect.any(Object)
      );
      expect(response.data).toEqual([
        expect.objectContaining({ id: 1, name: 'Fiction', userId: 1 }),
        expect.objectContaining({ id: 2, name: 'Science', userId: 1 }),
      ]);
      expect(response.pagination).toMatchObject({ totalCount: 2 });
    });
  });

  describe('getCategoryBooks', () => {
    it('fetches books for category', async () => {
      mockService.getCategory.mockResolvedValue(
        buildCategory({ id: 5, name: 'History' })
      );
      (Book.findAndCountAll as jest.Mock).mockResolvedValue({
        count: 1,
        rows: [{ id: 10, title: 'Book' }],
      });

      const response = await controller.getCategoryBooks({
        ...baseRequest,
        pathParameters: { id: '5' },
      });

      expect(mockService.getCategory).toHaveBeenCalledWith(5, expect.any(Object));
      expect(Book.findAndCountAll).toHaveBeenCalled();
      expect(response.data).toMatchObject({
        category: expect.objectContaining({ id: 5, name: 'History' }),
        books: [{ id: 10, title: 'Book' }],
      });
  });
});
});
