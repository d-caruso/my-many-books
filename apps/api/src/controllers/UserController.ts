// ================================================================
// src/controllers/UserController.ts
// User management controller
// ================================================================

import { inject, injectable } from 'inversify';
import { UserBaseController } from './base/UserBaseController';
import { ApiResponse } from '../common/ApiResponse';
import { UniversalRequest } from '../types';
import { TYPES } from '../container/types';
import { UpdateUserDTO } from '../dtos/user/UpdateUserDTO';
import { toUserResponseDTO } from '../dtos/user/UserResponseDTO';
import { UserService, UserServiceError } from '../services/user/UserService';
import { BookEntity } from '../repositories/book/BookRepositoryTypes';
import { BookStatus } from '@/models/interfaces/ModelInterfaces';
import { BOOK_STATUSES } from '@my-many-books/shared-types';

const toBookView = (book: BookEntity): object => ({
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
    })) || [],
  categories:
    book.categories?.map(category => ({
      id: category.id,
      name: category.name,
    })) || [],
  creationDate: book.creationDate,
  updateDate: book.updateDate,
});

@injectable()
export class UserController extends UserBaseController {
  constructor(@inject(TYPES.UserService) private readonly userService: UserService) {
    super();
    this.userService.initializeControllerContext();
  }

  async getCurrentUser(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const userId = this.getIdParam(request);
    if (userId === null) {
      return this.createErrorResponse('User ID is required', 400);
    }

    if (!this.hasUserAccess(request, userId)) {
      return this.createAccessDeniedResponse(request);
    }

    try {
      const user = await this.userService.requireUser(userId);
      return this.createSuccessResponse(toUserResponseDTO(user));
    } catch (error) {
      return this.handleServiceError(error);
    }
  }

  async updateCurrentUser(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const userId = this.getIdParam(request);
    if (userId === null) {
      return this.createErrorResponse('User ID is required', 400);
    }

    // Check if user can update this config (self or admin)
    if (!this.hasUserAccess(request, userId)) {
      return this.createAccessDeniedResponse(request);
    }

    const dto = UpdateUserDTO.from(this.parseBody(request));

    try {
      const updated = await this.userService.updateCurrentUser(userId, dto.toServiceInput());
      return this.createSuccessResponse(
        toUserResponseDTO(updated),
        this.t('common:profile_updated')
      );
    } catch (error) {
      return this.handleServiceError(error);
    }
  }

  async getUserBooks(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const userId = this.getIdParam(request);
    if (userId === null) {
      return this.createErrorResponse('User ID is required', 400);
    }

    // Check if user can update this config (self or admin)
    if (!this.hasUserAccess(request, userId)) {
      return this.createAccessDeniedResponse(request);
    }

    const pagination = this.getPaginationParams(request);
    const statusQuery = this.getQueryParameter(request, 'status');
    const status = this.normalizeStatus(statusQuery);

    try {
      const listOptions: Parameters<UserService['listUserBooks']>[1] = {
        limit: pagination.limit,
        offset: pagination.offset,
      };
      if (status) {
        listOptions.status = status;
      }

      const result = await this.userService.listUserBooks(userId, listOptions);

      const meta = {
        currentPage: pagination.page,
        totalPages: Math.ceil(result.total / pagination.limit),
        totalItems: result.total,
        itemsPerPage: pagination.limit,
      };

      return this.createSuccessResponse({
        books: result.rows.map(toBookView),
        pagination: meta,
      });
    } catch (error) {
      return this.handleServiceError(error);
    }
  }

  async getUserStats(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const userId = this.getIdParam(request);
    if (userId === null) {
      return this.createErrorResponse('User ID is required', 400);
    }

    // Check if user can update this config (self or admin)
    if (!this.hasUserAccess(request, userId)) {
      return this.createAccessDeniedResponse(request);
    }

    try {
      const stats = await this.userService.getUserStats(userId);
      return this.createSuccessResponse(stats);
    } catch (error) {
      return this.handleServiceError(error);
    }
  }

  async deactivateAccount(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const userId = this.getIdParam(request);
    if (userId === null) {
      return this.createErrorResponse('User ID is required', 400);
    }

    // Check if user can update this config (self or admin)
    if (!this.hasUserAccess(request, userId)) {
      return this.createAccessDeniedResponse(request);
    }

    try {
      await this.userService.deactivateAccount(userId);
      return this.createSuccessResponse(null, this.t('common:account_deactivated'));
    } catch (error) {
      return this.handleServiceError(error);
    }
  }

  async deleteAccount(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const userId = this.getIdParam(request);
    if (userId === null) {
      return this.createErrorResponse('User ID is required', 400);
    }

    // Check if user can update this config (self or admin)
    if (!this.hasUserAccess(request, userId)) {
      return this.createAccessDeniedResponse(request);
    }

    try {
      await this.userService.deleteAccount(userId);
      return this.createSuccessResponse(null, this.t('common:account_deleted'));
    } catch (error) {
      return this.handleServiceError(error);
    }
  }

  private handleServiceError(error: unknown): ApiResponse {
    if (!(error instanceof UserServiceError)) {
      throw error;
    }

    switch (error.code) {
      case 'USER_NOT_FOUND':
        return this.createErrorResponseI18n('errors:user_not_found', 404);
      default:
        return this.createErrorResponseI18n('errors:internal_server_error', 500);
    }
  }


  private normalizeStatus(value?: string | null): BookStatus | undefined {
    if (!value) {
      return undefined;
    }
    return BOOK_STATUSES.includes(value as BookStatus) ? (value as BookStatus) : undefined;
  }
}
