import { UserOnboardingService } from '../../../src/services/user/UserOnboardingService';
import { Repository as AuthorRepositoryContract } from '../../../src/repositories/author/Repository';
import { Repository as CategoryRepositoryContract } from '../../../src/repositories/category/Repository';
import { DEFAULT_AUTHORS, DEFAULT_CATEGORIES } from '../../../src/config/defaultUserData';

jest.mock('@my-many-books/shared-logging', () => ({
  getLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }),
}));

describe('UserOnboardingService', () => {
  let authorRepository: jest.Mocked<AuthorRepositoryContract>;
  let categoryRepository: jest.Mocked<CategoryRepositoryContract>;
  let service: UserOnboardingService;

  beforeEach(() => {
    authorRepository = {
      create: jest.fn().mockResolvedValue({ id: 1 }),
    } as unknown as jest.Mocked<AuthorRepositoryContract>;

    categoryRepository = {
      create: jest.fn().mockResolvedValue({ id: 1 }),
    } as unknown as jest.Mocked<CategoryRepositoryContract>;

    service = new UserOnboardingService(authorRepository, categoryRepository);
  });

  describe('seedDefaults', () => {
    it('creates 20 authors for the given userId', async () => {
      await service.seedDefaults(42);

      expect(authorRepository.create).toHaveBeenCalledTimes(DEFAULT_AUTHORS.length);
      for (const author of DEFAULT_AUTHORS) {
        expect(authorRepository.create).toHaveBeenCalledWith({
          name: author.name,
          surname: author.surname,
          nationality: author.nationality,
          userId: 42,
        });
      }
    });

    it('creates 10 categories for the given userId', async () => {
      await service.seedDefaults(42);

      expect(categoryRepository.create).toHaveBeenCalledTimes(DEFAULT_CATEGORIES.length);
      for (const category of DEFAULT_CATEGORIES) {
        expect(categoryRepository.create).toHaveBeenCalledWith({
          name: category.name,
          translationKey: category.translationKey,
          userId: 42,
        });
      }
    });

    it('does not throw when author creation fails', async () => {
      authorRepository.create.mockRejectedValue(new Error('DB error'));

      await expect(service.seedDefaults(42)).resolves.toBeUndefined();
    });

    it('does not throw when category creation fails', async () => {
      categoryRepository.create.mockRejectedValue(new Error('DB error'));

      await expect(service.seedDefaults(42)).resolves.toBeUndefined();
    });
  });
});
