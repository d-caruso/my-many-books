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
import { SORT_DIRECTIONS, DATABASE_FIELDS } from '@my-many-books/shared-types';
import {
  AdminBookMutationContext,
  AdminBookMutationService,
  AdminBookMutationServiceError,
} from '../../services/book/AdminBookMutationService';

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
    @inject(TYPES.BookRepository) private readonly bookRepository: BookRepositoryContract,
    @inject(TYPES.AdminBookMutationService)
    private readonly adminBookMutationService: AdminBookMutationService
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
        orderBy: DATABASE_FIELDS.CREATION_DATE,
        orderDirection: SORT_DIRECTIONS.DESC,
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

      const updated = await this.adminBookMutationService.updateBook(
        parseInt(bookId, 10),
        body,
        this.getAdminContext(request)
      );

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
      if (error instanceof AdminBookMutationServiceError) {
        return this.handleMutationServiceError(error);
      }

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

      await this.adminBookMutationService.deleteBook(
        parseInt(bookId, 10),
        this.getAdminContext(request)
      );

      return this.createSuccessResponse(
        { message: this.t('success:book_deleted') },
        undefined,
        undefined,
        200
      );
    } catch (error) {
      if (error instanceof AdminBookMutationServiceError) {
        return this.handleMutationServiceError(error);
      }

      getLogger().error({ err: error instanceof Error ? error : new Error(String(error)) }, 'Delete book error:');
      return this.createErrorResponseI18n('errors:internal_server_error', 500);
    }
  }

  private getAdminContext(request: UniversalRequest): AdminBookMutationContext | null {
    if (!request.user) {
      return null;
    }

    const context: AdminBookMutationContext = {
      userId: request.user.id,
    };

    if (request.user.role) {
      context.role = request.user.role;
    }

    return context;
  }

  private handleMutationServiceError(error: AdminBookMutationServiceError): ApiResponse {
    switch (error.code) {
      case 'BOOK_NOT_FOUND':
        return this.createErrorResponseI18n('errors:book_not_found', 404);
      case 'USER_NOT_FOUND':
        return this.createErrorResponseI18n('errors:user_not_found', 404);
      case 'FORBIDDEN':
        return this.createErrorResponseI18n('errors:permission_denied', 403);
      default:
        return this.createErrorResponseI18n('errors:internal_server_error', 500);
    }
  }
}
