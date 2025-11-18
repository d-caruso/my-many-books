// ================================================================
// src/controllers/admin/AdminBookController.ts
// Admin book management controller
// ================================================================

import Joi from 'joi';
import { Op, WhereOptions } from 'sequelize';
import { BaseController } from '../base/BaseController';
import { ApiResponse } from '../../common/ApiResponse';
import { UniversalRequest } from '../../types';
import { Book } from '../../models/Book';
import { Author } from '../../models/Author';
import { Category } from '../../models/Category';
import { User } from '../../models/User';
import { BookAttributes } from '../../models/interfaces/ModelInterfaces';

/**
 * Validation schemas
 */
interface UpdateBookData {
  title?: string;
  isbnCode?: string;
  editionNumber?: number | null;
  editionDate?: Date | null;
  status?: 'reading' | 'paused' | 'finished' | null;
  notes?: string | null;
  userId?: number | null;
}

const updateBookSchema = Joi.object({
  title: Joi.string().min(1).max(255).optional(),
  isbnCode: Joi.string().min(10).max(20).optional(),
  editionNumber: Joi.number().integer().min(1).allow(null).optional(),
  editionDate: Joi.date().allow(null).optional(),
  status: Joi.string().valid('reading', 'paused', 'finished').allow(null).optional(),
  notes: Joi.string().max(2000).allow(null, '').optional(),
  userId: Joi.number().integer().allow(null).optional(),
});

/**
 * Controller for admin book management.
 * All endpoints require admin authentication (enforced by adminRoutes middleware).
 */
export class AdminBookController extends BaseController {
  /**
   * Get paginated list of all books with authors, categories, and user info
   * GET /api/v1/admin/books
   * Query params: page, limit, search (title/ISBN/author), userId
   */
  async getAllBooks(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);

    try {
      const { page, limit, offset } = this.getPaginationParams(request);
      const search = this.getQueryParameter(request, 'search');
      const userIdFilter = this.getQueryParameter(request, 'userId');

      // Build where clause for search
      const whereClause: WhereOptions<BookAttributes> = {};
      if (search) {
        whereClause[Op.or] = [
          { title: { [Op.like]: `%${search}%` } },
          { isbnCode: { [Op.like]: `%${search}%` } },
        ];
      }
      if (userIdFilter) {
        whereClause.userId = parseInt(userIdFilter, 10);
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
        limit,
        offset,
        order: [['creationDate', 'DESC']],
      });

      // Fetch user info for each book
      const booksWithUsers = await Promise.all(
        books.map(async book => {
          let userName = null;
          if (book.userId) {
            const user = await User.findByPk(book.userId, {
              attributes: ['id', 'name', 'surname', 'email'],
            });
            if (user) {
              userName = user.getFullName();
            }
          }

          return {
            id: book.id,
            title: book.title,
            isbnCode: book.isbnCode,
            editionNumber: book.editionNumber,
            editionDate: book.editionDate,
            status: book.status,
            notes: book.notes,
            userId: book.userId,
            userName,
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
          };
        })
      );

      return this.createSuccessResponse(
        { books: booksWithUsers },
        undefined,
        this.createPaginationMeta(page, limit, count)
      );
    } catch (error) {
      console.error('Get all books error:', error);
      return this.createErrorResponseI18n('errors:internal_server_error', 500);
    }
  }

  /**
   * Get single book by ID with full details
   * GET /api/v1/admin/books/:id
   */
  async getBookById(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);

    try {
      const bookId = this.getPathParameter(request, 'id');
      if (!bookId) {
        return this.createErrorResponseI18n('errors:book_id_required', 400);
      }

      const book = await Book.findByPk(parseInt(bookId, 10), {
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
      });

      if (!book) {
        return this.createErrorResponseI18n('errors:book_not_found', 404);
      }

      let userName = null;
      if (book.userId) {
        const user = await User.findByPk(book.userId, {
          attributes: ['id', 'name', 'surname', 'email'],
        });
        if (user) {
          userName = user.getFullName();
        }
      }

      return this.createSuccessResponse({
        id: book.id,
        title: book.title,
        isbnCode: book.isbnCode,
        editionNumber: book.editionNumber,
        editionDate: book.editionDate,
        status: book.status,
        notes: book.notes,
        userId: book.userId,
        userName,
        authors:
          book.authors?.map(author => ({
            id: author.id,
            name: author.name,
            surname: author.surname,
            fullName: `${author.name} ${author.surname}`,
          })) ?? [],
        categories:
          book.categories?.map(category => ({
            id: category.id,
            name: category.name,
          })) ?? [],
        createdAt: book.creationDate,
        updatedAt: book.updateDate,
      });
    } catch (error) {
      console.error('Get book by ID error:', error);
      return this.createErrorResponseI18n('errors:internal_server_error', 500);
    }
  }

  /**
   * Update book details
   * PUT /api/v1/admin/books/:id
   * Body: { title?, isbnCode?, editionNumber?, editionDate?, status?, notes?, userId? }
   */
  async updateBook(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);

    try {
      const bookId = this.getPathParameter(request, 'id');
      if (!bookId) {
        return this.createErrorResponseI18n('errors:book_id_required', 400);
      }

      const body = this.parseBody(request);
      if (!body) {
        return this.createErrorResponseI18n('errors:invalid_request_body', 400);
      }

      // Validate request body
      const validation = this.validateRequest(body, updateBookSchema);
      if (!validation.isValid) {
        return this.createErrorResponse(
          this.t('errors:validation_failed'),
          400,
          validation.errors ? { errors: validation.errors } : undefined
        );
      }

      const book = await Book.findByPk(parseInt(bookId, 10));
      if (!book) {
        return this.createErrorResponseI18n('errors:book_not_found', 404);
      }

      const updateData = validation.value as UpdateBookData;

      // If userId is being changed, verify the user exists
      if (updateData?.userId !== undefined && updateData.userId !== null) {
        const user = await User.findByPk(updateData.userId);
        if (!user) {
          return this.createErrorResponseI18n('errors:user_not_found', 404);
        }
      }

      // Update book
      await book.update(updateData);

      // Reload with associations
      await book.reload({
        include: [
          { model: Author, as: 'authors', through: { attributes: [] } },
          { model: Category, as: 'categories', through: { attributes: [] } },
        ],
      });

      let userName = null;
      if (book.userId) {
        const user = await User.findByPk(book.userId, {
          attributes: ['id', 'name', 'surname', 'email'],
        });
        if (user) {
          userName = user.getFullName();
        }
      }

      return this.createSuccessResponse({
        id: book.id,
        title: book.title,
        isbnCode: book.isbnCode,
        editionNumber: book.editionNumber,
        editionDate: book.editionDate,
        status: book.status,
        notes: book.notes,
        userId: book.userId,
        userName,
        authors:
          book.authors?.map(author => ({
            id: author.id,
            name: author.name,
            surname: author.surname,
            fullName: `${author.name} ${author.surname}`,
          })) ?? [],
        categories:
          book.categories?.map(category => ({
            id: category.id,
            name: category.name,
          })) ?? [],
        createdAt: book.creationDate,
        updatedAt: book.updateDate,
      });
    } catch (error) {
      console.error('Update book error:', error);
      return this.createErrorResponseI18n('errors:internal_server_error', 500);
    }
  }

  /**
   * Delete book
   * DELETE /api/v1/admin/books/:id
   */
  async deleteBook(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);

    try {
      const bookId = this.getPathParameter(request, 'id');
      if (!bookId) {
        return this.createErrorResponseI18n('errors:book_id_required', 400);
      }

      const book = await Book.findByPk(parseInt(bookId, 10));
      if (!book) {
        return this.createErrorResponseI18n('errors:book_not_found', 404);
      }

      // Delete book (associations will be removed automatically via cascade)
      await book.destroy();

      return this.createSuccessResponse(
        { message: this.t('success:book_deleted') },
        undefined,
        undefined,
        200
      );
    } catch (error) {
      console.error('Delete book error:', error);
      return this.createErrorResponseI18n('errors:internal_server_error', 500);
    }
  }
}

export const adminBookController = new AdminBookController();
