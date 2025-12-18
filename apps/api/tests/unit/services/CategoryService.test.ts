import { CategoryService, CategoryServiceError } from '../../../src/services/category/CategoryService';
import { Repository as CategoryRepositoryContract } from '../../../src/repositories/category/Repository';
import { emitHookEvent } from '../../../src/services/hooks/hookSystem';
import { EVENTS } from '../../../src/services/hooks/events';

jest.mock('../../../src/services/hooks/hookSystem', () => ({
  emitHookEvent: jest.fn().mockResolvedValue(undefined),
}));

const userContext = { userId: 1, role: 'user' };

describe('CategoryService', () => {
  let service: CategoryService;
  let repository: jest.Mocked<CategoryRepositoryContract>;
  const emitHookEventMock = emitHookEvent as jest.MockedFunction<typeof emitHookEvent>;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      findUserCategoryById: jest.fn(),
      findByName: jest.fn(),
      list: jest.fn(),
      searchByQuery: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      countBooks: jest.fn(),
    } as unknown as jest.Mocked<CategoryRepositoryContract>;

    service = new CategoryService(repository);
    emitHookEventMock.mockClear();
  });

  describe('createCategory', () => {
    it('creates category for current user', async () => {
      repository.findByName.mockResolvedValue(null);
      repository.create.mockResolvedValue({ id: 1, name: 'Fiction', userId: 1 } as any);

    const result = await service.createCategory({ name: 'Fiction' }, userContext);

    expect(repository.findByName).toHaveBeenCalledWith('Fiction', 1);
    expect(repository.create).toHaveBeenCalledWith({ name: 'Fiction', userId: 1 });
    expect(result.id).toBe(1);
    expect(emitHookEventMock).toHaveBeenCalledWith(
      EVENTS.CATEGORY.CREATE.AFTER,
      expect.objectContaining({
        category: expect.objectContaining({ id: 1 }),
        user: { id: 1, email: "test@example.com", role: 'user', provider: "cognito" },
      })
    );
  });

    it('throws when duplicate', async () => {
      repository.findByName.mockResolvedValue({ id: 2 } as any);

      await expect(service.createCategory({ name: 'Fiction' }, userContext)).rejects.toThrow(
        CategoryServiceError
      );
    });
  });

  describe('getCategory', () => {
    it('returns category when owned by user', async () => {
      repository.findById.mockResolvedValue({ id: 5, userId: 1 } as any);

      const category = await service.getCategory(5, userContext);

      expect(repository.findById).toHaveBeenCalledWith(5, { includeBooks: false });
      expect(category.id).toBe(5);
    });

    it('throws when accessing other users category', async () => {
      repository.findById.mockResolvedValue({ id: 5, userId: 2 } as any);

      await expect(service.getCategory(5, userContext)).rejects.toThrow(CategoryServiceError);
    });
  });

  describe('updateCategory', () => {
    it('updates when user owns category', async () => {
      repository.findById.mockResolvedValue({ id: 7, userId: 1, name: 'Old' } as any);
      repository.findByName.mockResolvedValue(null);
      repository.update.mockResolvedValue({ id: 7, userId: 1, name: 'New' } as any);

    const updated = await service.updateCategory(7, { name: 'New' }, userContext);

    expect(repository.update).toHaveBeenCalledWith(7, { name: 'New' });
    expect(updated.name).toBe('New');
    expect(emitHookEventMock).toHaveBeenCalledWith(
      EVENTS.CATEGORY.UPDATE.AFTER,
      expect.objectContaining({
        categoryId: 7,
        category: expect.objectContaining({ id: 7 }),
        user: { id: 1, email: "test@example.com", role: 'user', provider: "cognito" },
      })
    );
  });

    it('throws when category missing', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.updateCategory(1, { name: 'Test' }, userContext)).rejects.toThrow(
        CategoryServiceError
      );
    });
  });

  describe('deleteCategory', () => {
    it('prevents deletion when books exist', async () => {
      repository.findById.mockResolvedValue({ id: 3, userId: 1 } as any);
      repository.countBooks.mockResolvedValue(2);

      await expect(service.deleteCategory(3, userContext)).rejects.toThrow(
        CategoryServiceError
      );
    });

    it('deletes when allowed', async () => {
      repository.findById.mockResolvedValue({ id: 3, userId: 1 } as any);
      repository.countBooks.mockResolvedValue(0);
      repository.delete.mockResolvedValue(true);

    await service.deleteCategory(3, userContext);

    expect(repository.delete).toHaveBeenCalledWith(3);
    expect(emitHookEventMock).toHaveBeenCalledWith(
      EVENTS.CATEGORY.DELETE.AFTER,
      expect.objectContaining({
        categoryId: 3,
        user: { id: 1, email: "test@example.com", role: 'user', provider: "cognito" },
      })
    );
  });
  });

  describe('listCategories', () => {
    it('applies user filter', async () => {
      repository.list.mockResolvedValue({ rows: [], total: 0, limit: 20, offset: 0 });

      await service.listCategories({ limit: 20, offset: 0 }, userContext);

      expect(repository.list).toHaveBeenCalledWith(
        expect.objectContaining({ filters: expect.objectContaining({ userId: 1 }) })
      );
    });
  });
});
