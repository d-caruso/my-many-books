// ================================================================
// src/controllers/UserController.ts
// User management controller
// ================================================================

import { Response } from 'express';
import { WhereOptions } from 'sequelize';
import { AuthenticatedRequest } from '../middleware/auth';
import { Book } from '../models/Book';
import { Author } from '../models/Author';
import { Category } from '../models/Category';
import { UserService } from '../middleware/auth';
import { BookAttributes, BookStatus } from '../models/interfaces/ModelInterfaces';
import { i18n } from '@my-many-books/shared-i18n';

export class UserController {
  private static async initializeI18n(req: AuthenticatedRequest): Promise<void> {
    const acceptLanguage = req.headers?.['accept-language'] || 'en';
    const language = this.parseLanguageCode(acceptLanguage);
    await i18n.changeLanguage(language);
  }

  private static parseLanguageCode(acceptLanguage: string): string {
    const primaryLang =
      acceptLanguage?.split(',')[0]?.split('-')[0]?.split(';')[0]?.trim()?.toLowerCase() || 'en';
    const supportedLanguages = ['en', 'it'];
    return supportedLanguages.includes(primaryLang) ? primaryLang : 'en';
  }

  /**
   * Translate a key using i18n
   * @param key - Translation key with namespace (e.g., "errors:book_not_found")
   * @param interpolation - Optional interpolation values
   */
  private static t(key: string, interpolation?: Record<string, unknown>): string {
    return interpolation ? i18n.t(key, interpolation) : i18n.t(key);
  }

  // Get current user profile
  static async getCurrentUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    await this.initializeI18n(req);
    try {
      if (!req.user) {
        res.status(401).json({ error: this.t('errors:user_not_authenticated') });
        return;
      }

      const user = await UserService.getUserById(req.user.userId);
      if (!user) {
        res.status(404).json({ error: this.t('errors:user_not_found') });
        return;
      }

      res.status(200).json({
        id: user.id,
        email: user.email,
        name: user.name,
        surname: user.surname,
        fullName: user.getFullName(),
        isActive: user.isActive,
        createdAt: user.creationDate,
        updatedAt: user.updateDate,
      });
    } catch (error) {
      // TODO: Replace with proper logging
      // console.error('Error fetching current user:', error);
      res.status(500).json({
        error: this.t('errors:internal_server_error'),
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Update current user profile
  static async updateCurrentUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    await this.initializeI18n(req);
    try {
      if (!req.user) {
        res.status(401).json({ error: this.t('errors:user_not_authenticated') });
        return;
      }

      const { name, surname } = req.body as { name?: string; surname?: string };

      // Validate input
      if (!name || !surname) {
        res.status(400).json({ error: this.t('errors:name_surname_required') });
        return;
      }

      if (typeof name !== 'string' || typeof surname !== 'string') {
        res.status(400).json({ error: this.t('errors:name_surname_strings') });
        return;
      }

      if (name.length > 100 || surname.length > 100) {
        res.status(400).json({ error: this.t('errors:name_surname_max_length', { max: 100 }) });
        return;
      }

      const user = await UserService.getUserById(req.user.userId);
      if (!user) {
        res.status(404).json({ error: this.t('errors:user_not_found') });
        return;
      }

      // Update user
      await user.update({ name, surname });

      res.status(200).json({
        id: user.id,
        email: user.email,
        name: user.name,
        surname: user.surname,
        fullName: user.getFullName(),
        isActive: user.isActive,
        updatedAt: user.updateDate,
      });
    } catch (error) {
      // TODO: Replace with proper logging
      // console.error('Error updating current user:', error);
      res.status(500).json({
        error: this.t('errors:internal_server_error'),
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Get user's books
  static async getUserBooks(req: AuthenticatedRequest, res: Response): Promise<void> {
    await this.initializeI18n(req);
    try {
      if (!req.user) {
        res.status(401).json({ error: this.t('errors:user_not_authenticated') });
        return;
      }

      const { page = 1, limit = 10, status } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const whereClause: WhereOptions<BookAttributes> = { userId: req.user.userId };
      if (
        status &&
        typeof status === 'string' &&
        ['reading', 'paused', 'finished'].includes(status)
      ) {
        whereClause.status = status as BookStatus;
      }

      const { count, rows: books } = await Book.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Author,
            as: 'authors',
            through: { attributes: [] },
          },
          {
            model: Category,
            as: 'categories',
            through: { attributes: [] },
          },
        ],
        limit: Number(limit),
        offset,
        order: [['title', 'ASC']],
      });

      res.status(200).json({
        books: books.map(book => ({
          id: book.id,
          title: book.title,
          isbnCode: book.isbnCode,
          editionNumber: book.editionNumber,
          editionDate: book.editionDate,
          status: book.status,
          notes: book.notes,
          authors:
            book.authors?.map(author => ({
              id: author.id,
              name: author.name,
              surname: author.surname,
              fullName: `${author.name} ${author.surname}`,
            })) || [],
          categories:
            book.categories?.map(category => ({
              id: category.id,
              name: category.name,
            })) || [],
          createdAt: book.creationDate,
          updatedAt: book.updateDate,
        })),
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(count / Number(limit)),
          totalItems: count,
          itemsPerPage: Number(limit),
        },
      });
    } catch (error) {
      // TODO: Replace with proper logging
      // console.error('Error fetching user books:', error);
      res.status(500).json({
        error: this.t('errors:internal_server_error'),
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Get user statistics
  static async getUserStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    await this.initializeI18n(req);
    try {
      if (!req.user) {
        res.status(401).json({ error: this.t('errors:user_not_authenticated') });
        return;
      }

      const userId = req.user.userId;

      // Get book counts by status
      const [totalBooks, readingBooks, pausedBooks, finishedBooks] = await Promise.all([
        Book.count({ where: { userId } }),
        Book.count({ where: { userId, status: 'reading' } }),
        Book.count({ where: { userId, status: 'paused' } }),
        Book.count({ where: { userId, status: 'finished' } }),
      ]);

      // Get recent activity (last 5 books added)
      const recentBooks = await Book.findAll({
        where: { userId },
        order: [['creationDate', 'DESC']],
        limit: 5,
        attributes: ['id', 'title', 'creationDate'],
      });

      res.status(200).json({
        totalBooks,
        booksByStatus: {
          reading: readingBooks,
          paused: pausedBooks,
          finished: finishedBooks,
          unspecified: totalBooks - readingBooks - pausedBooks - finishedBooks,
        },
        completionRate: totalBooks > 0 ? Math.round((finishedBooks / totalBooks) * 100) : 0,
        recentBooks: recentBooks.map(book => ({
          id: book.id,
          title: book.title,
          addedAt: book.creationDate,
        })),
      });
    } catch (error) {
      // TODO: Replace with proper logging
      // console.error('Error fetching user stats:', error);
      res.status(500).json({
        error: this.t('errors:internal_server_error'),
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Deactivate user account
  static async deactivateAccount(req: AuthenticatedRequest, res: Response): Promise<void> {
    await this.initializeI18n(req);
    try {
      if (!req.user) {
        res.status(401).json({ error: this.t('errors:user_not_authenticated') });
        return;
      }

      await UserService.deactivateUser(req.user.userId);

      res.status(200).json({
        message: 'Account deactivated successfully',
        note: 'Your books will remain in the system but will no longer be accessible',
      });
    } catch (error) {
      // TODO: Replace with proper logging
      // console.error('Error deactivating user account:', error);
      res.status(500).json({
        error: this.t('errors:internal_server_error'),
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Delete user account (hard delete)
  static async deleteAccount(req: AuthenticatedRequest, res: Response): Promise<void> {
    await this.initializeI18n(req);
    try {
      if (!req.user) {
        res.status(401).json({ error: this.t('errors:user_not_authenticated') });
        return;
      }

      const user = await UserService.getUserById(req.user.userId);
      if (!user) {
        res.status(404).json({ error: this.t('errors:user_not_found') });
        return;
      }

      // Note: Books will have their userId set to NULL due to the foreign key constraint
      await user.destroy();

      res.status(200).json({
        message: 'Account deleted successfully',
        note: 'All personal data has been removed. Books will remain anonymized in the system.',
      });
    } catch (error) {
      // TODO: Replace with proper logging
      // console.error('Error deleting user account:', error);
      res.status(500).json({
        error: this.t('errors:internal_server_error'),
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
