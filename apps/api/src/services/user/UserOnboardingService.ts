// ================================================================
// src/services/user/UserOnboardingService.ts
// Seeds default authors and categories for new users
// ================================================================

import { inject, injectable } from 'inversify';
import { getLogger } from '@my-many-books/shared-logging';
import { TYPES } from '../../container/types';
import { Repository as AuthorRepositoryContract } from '../../repositories/author/Repository';
import { Repository as CategoryRepositoryContract } from '../../repositories/category/Repository';
import { DEFAULT_AUTHORS, DEFAULT_CATEGORIES } from '../../config/defaultUserData';

@injectable()
export class UserOnboardingService {
  constructor(
    @inject(TYPES.AuthorRepository) private readonly authorRepository: AuthorRepositoryContract,
    @inject(TYPES.CategoryRepository)
    private readonly categoryRepository: CategoryRepositoryContract
  ) {}

  private readonly logger = getLogger();

  async seedDefaults(userId: number): Promise<void> {
    try {
      await Promise.all([this.seedAuthors(userId), this.seedCategories(userId)]);
      this.logger.info({ userId }, 'Seeded default data for new user');
    } catch (error) {
      this.logger.warn({ err: error }, 'Failed to seed default data for new user');
    }
  }

  private async seedAuthors(userId: number): Promise<void> {
    const authorPromises = DEFAULT_AUTHORS.map(author =>
      this.authorRepository.create({
        name: author.name,
        surname: author.surname,
        nationality: author.nationality,
        userId,
      })
    );
    await Promise.all(authorPromises);
  }

  private async seedCategories(userId: number): Promise<void> {
    const categoryPromises = DEFAULT_CATEGORIES.map(category =>
      this.categoryRepository.create({
        name: category.name,
        userId,
      })
    );
    await Promise.all(categoryPromises);
  }
}
