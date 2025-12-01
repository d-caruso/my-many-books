import { CategoryRepository } from '../../../src/repositories/category/CategoryRepository';
import { CategoryRepositoryAdapter } from '../../../src/repositories/category/adapters/CategoryRepositoryAdapter';
import {
  CategoryEntity,
  CategoryListOptions,
  CategoryQueryOptions,
} from '../../../src/repositories/category/CategoryRepositoryTypes';
import { CategoryCreationAttributes } from '../../../src/models/interfaces/ModelInterfaces';

describe('CategoryRepository', () => {
  let adapter: jest.Mocked<CategoryRepositoryAdapter>;
  let repository: CategoryRepository;

  const baseCategory: CategoryEntity = {
    id: 1,
    name: 'Fiction',
    userId: 42,
    creationDate: new Date(),
  };

  beforeEach(() => {
    adapter = {
      findById: jest.fn(),
      findUserCategoryById: jest.fn(),
      findByName: jest.fn(),
      list: jest.fn(),
      searchByQuery: jest.fn(),
      countBooks: jest.fn(),
      createModel: jest.fn(),
      updateModel: jest.fn(),
      deleteModel: jest.fn(),
    } as unknown as jest.Mocked<CategoryRepositoryAdapter>;

    repository = new CategoryRepository(adapter);
  });

  it('creates category through adapter', async () => {
    adapter.createModel.mockResolvedValue(baseCategory);
    const payload = { name: 'Fiction', userId: 42 } as CategoryCreationAttributes;
    const options: CategoryQueryOptions = { includeBooks: true };

    const created = await repository.create(payload, options);

    expect(adapter.createModel).toHaveBeenCalledWith(payload, options);
    expect(created).toBe(baseCategory);
  });

  it('lists categories with filters', async () => {
    const options: CategoryListOptions = { limit: 10 };
    adapter.list.mockResolvedValue({ rows: [baseCategory], total: 1, limit: 10, offset: 0 });

    const result = await repository.list(options);

    expect(adapter.list).toHaveBeenCalledWith(options);
    expect(result.rows[0]).toBe(baseCategory);
  });

  it('delete returns boolean', async () => {
    adapter.deleteModel.mockResolvedValue(3);

    const deleted = await repository.delete(9);

    expect(adapter.deleteModel).toHaveBeenCalledWith(9);
    expect(deleted).toBe(true);
  });
});
