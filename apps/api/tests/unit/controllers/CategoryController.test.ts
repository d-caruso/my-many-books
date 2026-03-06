import { CategoryController } from '../../../src/controllers/CategoryController';
import {
  CategoryService,
  CategoryServiceError,
} from '../../../src/services/category/CategoryService';
import { UniversalRequest } from '../../../src/types';
import { CategoryEntity } from '../../../src/repositories/category/CategoryRepositoryTypes';
import { emitHookEvent } from '../../../src/services/hooks/hookSystem';
import { EVENTS } from '../../../src/services/hooks/events';

jest.mock('../../../src/services/hooks/hookSystem', () => ({
  emitHookEvent: jest.fn().mockResolvedValue(undefined),
}));

// Container will use real dependency injection

jest.mock('../../../src/models/Book', () => ({
  Book: {
    SORTABLE_FIELDS: { TITLE: 'title', STATUS: 'status' },
  },
}));

jest.mock('../../../src/models/Category', () => ({
  Category: {},
}));

describe('CategoryController', () => {
  let controller: CategoryController;
  let mockService: jest.Mocked<CategoryService>;
  let mockRepository: any;
  let mockBookRepository: any;
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

    mockRepository = {
      list: jest.fn().mockResolvedValue({ rows: [], total: 0 }),
    };

    mockBookRepository = {
      search: jest.fn().mockResolvedValue({ rows: [], total: 0, limit: 20, offset: 0 }),
    };

    controller = new CategoryController(
      mockService as unknown as CategoryService,
      mockRepository,
      mockBookRepository,
    );

    baseRequest = {
      headers: { 'accept-language': 'en' },
      queryStringParameters: {},
      params: {},
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
        params: { id: '10' },
      });

      expect(mockService.getCategory).toHaveBeenCalledWith(10, expect.any(Object), false);
      expect(response.data).toMatchObject({ id: 10, name: 'Mystery', userId: 1 });
    });

    it('validates id parameter', async () => {
      const response = await controller.getCategory({
        ...baseRequest,
        params: { id: 'abc' },
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
        params: { id: '99' },
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
        params: { id: '2' },
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
        params: { id: '3' },
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
      const mockRepository = controller['categoryRepository'] as any;
      mockRepository.list.mockResolvedValue({
        rows: [
          buildCategory({ id: 1, name: 'Fiction' }),
          buildCategory({ id: 2, name: 'Science' }),
        ],
        total: 2,
      });

      const response = await controller.listCategories({
        ...baseRequest,
        queryStringParameters: { page: '1', limit: '20', filters: JSON.stringify({ name: 'fi' }) },
      });

      expect(mockRepository.list).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 20,
          offset: 0,
          filters: expect.objectContaining({ name: 'fi', userId: 1 })
        })
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
      mockBookRepository.search.mockResolvedValue({
        rows: [{ id: 10, title: 'Book' }],
        total: 1,
        limit: 20,
        offset: 0,
      });

      const response = await controller.getCategoryBooks({
        ...baseRequest,
        params: { id: '5' },
      });

      expect(mockService.getCategory).toHaveBeenCalledWith(5, expect.any(Object));
      expect(mockBookRepository.search).toHaveBeenCalledWith(
        expect.objectContaining({ categoryId: 5 }),
        expect.any(Object)
      );
      expect(response.data).toMatchObject({
        category: expect.objectContaining({ id: 5, name: 'History' }),
        books: [{ id: 10, title: 'Book' }],
      });
    });

  describe('listCategories with incremental sync', () => {
    beforeEach(() => {
      // Mock Category model for incremental sync tests - note: Category is imported via Book
      jest.clearAllMocks();
    });

    it('should support updatedSince parameter for incremental sync', async () => {
      baseRequest.queryStringParameters = { updatedSince: '2024-01-01T00:00:00.000Z' };

      const result = await controller.listCategories(baseRequest);

      expect(result.statusCode).toBe(200);
    });
  });
});
});
