// ================================================================
// src/controllers/admin/AdminBookController.ts
// Admin book management controller
// ================================================================

import { inject, injectable } from 'inversify';
import { BaseController } from '../base/BaseController';
import { ApiResponse } from '../../common/ApiResponse';
import { getLogger } from '@my-many-books/shared-logging';
import { UniversalRequest } from '../../types';
import { User } from '../../models/User';
import { TYPES } from '../../container/types';
import { Repository as BookRepositoryContract } from '../../repositories/book/Repository';
import { BookSearchFilters } from '../../repositories/book/BookRepositoryTypes';

interface UpdateBookData {
  title?: string;
  isbnCode?: string;
  editionNumber?: number | null;
  editionDate?: string | null;
  status?: 'reading' | 'paused' | 'finished' | null;
  notes?: string | null;
  userId?: number | null;
}

@injectable()
export class AdminBookController extends BaseController {
  constructor(
    @inject(TYPES.BookRepository) private readonly bookRepository: BookRepositoryContract
  ) {
    super();
  }

  private isUpdateBookData(value: unknown): value is UpdateBookData {
    if (!this.isRecord(value)) {
      return false;
    }

    if (value['title'] !== undefined && typeof value['title'] !== 'string') {
      return false;
    }
    if (value['isbnCode'] !== undefined && typeof value['isbnCode'] !== 'string') {
      return false;
    }
    if (
      value['editionNumber'] !== undefined &&
      value['editionNumber'] !== null &&
      typeof value['editionNumber'] !== 'number'
    ) {
      return false;
    }
    if (
      value['editionDate'] !== undefined &&
      value['editionDate'] !== null &&
      typeof value['editionDate'] !== 'string'
    ) {
      return false;
    }
    if (
      value['status'] !== undefined &&
      value['status'] !== null &&
      value['status'] !== 'reading' &&
      value['status'] !== 'paused' &&
      value['status'] !== 'finished'
    ) {
      return false;
    }
    if (value['notes'] !== undefined && value['notes'] !== null && typeof value['notes'] !== 'string') {
      return false;
    }
    if (value['userId'] !== undefined && value['userId'] !== null && typeof value['userId'] !== 'number') {
      return false;
    }

    return true;
  }

  /**
   * GET /api/<version>/admin/books
   */
  async getAllBooks(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);

    try {
      const { page, limit, offset } = this.getPaginationParams(request);
      const search = this.getQueryParameter(request, 'search');
      const userIdFilter = this.getQueryParameter(request, 'userId');

      const filters: BookSearchFilters = {};
      if (search) filters.searchQuery = search;
      if (userIdFilter) filters.userId = parseInt(userIdFilter, 10);

      const result = await this.bookRepository.search(filters, {
        limit,
        offset,
        orderBy: 'creationDate',
        orderDirection: 'DESC',
      });

      const booksWithUsers = await Promise.all(
        result.rows.map(async book => {
          let userName = null;
          if (book.userId) {
            const user = await User.findByPk(book.userId, {
              attributes: ['id', 'name', 'surname', 'email'],
            });
            if (user) {
              userName = user.getFullName();
            }
          }
          return { ...book, userName };
        })
      );

      return this.createSuccessResponse(
        { books: booksWithUsers },
        undefined,
        this.createPaginationMeta(page, limit, result.total)
      );
    } catch (error) {
      getLogger().error({ err: error instanceof Error ? error : new Error(String(error)) }, 'Get all books error:');
      return this.createErrorResponseI18n('errors:internal_server_error', 500);
    }
  }

  /**
   * GET /api/<version>/admin/books/:id
   */
  async getBookById(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);

    try {
      const bookId = this.getPathParameter(request, 'id');
      if (!bookId) {
        return this.createErrorResponseI18n('errors:book_id_required', 400);
      }

      const book = await this.bookRepository.findById(parseInt(bookId, 10));
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

      return this.createSuccessResponse({ ...book, userName });
    } catch (error) {
      getLogger().error({ err: error instanceof Error ? error : new Error(String(error)) }, 'Get book by ID error:');
      return this.createErrorResponseI18n('errors:internal_server_error', 500);
    }
  }

  /**
   * PUT /api/<version>/admin/books/:id
   */
  async updateBook(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);

    try {
      const bookId = this.getPathParameter(request, 'id');
      if (!bookId) {
        return this.createErrorResponseI18n('errors:book_id_required', 400);
      }

      const body = this.parseBody(request);
      if (!this.isUpdateBookData(body)) {
        return this.createErrorResponseI18n('errors:invalid_request_body', 400);
      }

      const existing = await this.bookRepository.findById(parseInt(bookId, 10));
      if (!existing) {
        return this.createErrorResponseI18n('errors:book_not_found', 404);
      }

      if (body.userId !== undefined && body.userId !== null) {
        const user = await User.findByPk(body.userId);
        if (!user) {
          return this.createErrorResponseI18n('errors:user_not_found', 404);
        }
      }

      const updated = await this.bookRepository.update(parseInt(bookId, 10), body);
      if (!updated) {
        return this.createErrorResponseI18n('errors:book_not_found', 404);
      }

      let userName = null;
      if (updated.userId) {
        const user = await User.findByPk(updated.userId, {
          attributes: ['id', 'name', 'surname', 'email'],
        });
        if (user) {
          userName = user.getFullName();
        }
      }

      return this.createSuccessResponse({ ...updated, userName });
    } catch (error) {
      getLogger().error({ err: error instanceof Error ? error : new Error(String(error)) }, 'Update book error:');
      return this.createErrorResponseI18n('errors:internal_server_error', 500);
    }
  }

  /**
   * DELETE /api/<version>/admin/books/:id
   */
  async deleteBook(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);

    try {
      const bookId = this.getPathParameter(request, 'id');
      if (!bookId) {
        return this.createErrorResponseI18n('errors:book_id_required', 400);
      }

      const deleted = await this.bookRepository.delete(parseInt(bookId, 10));
      if (!deleted) {
        return this.createErrorResponseI18n('errors:book_not_found', 404);
      }

      return this.createSuccessResponse(
        { message: this.t('success:book_deleted') },
        undefined,
        undefined,
        200
      );
    } catch (error) {
      getLogger().error({ err: error instanceof Error ? error : new Error(String(error)) }, 'Delete book error:');
      return this.createErrorResponseI18n('errors:internal_server_error', 500);
    }
  }
}
