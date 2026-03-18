// ================================================================
// src/controllers/AuthorController.ts
// ================================================================

import Joi from 'joi';
import { inject, injectable } from 'inversify';
import { BaseController } from './base/BaseController';
import { ApiResponse } from '../common/ApiResponse';
import { UniversalRequest } from '../types';
import { TYPES } from '../container/types';
import {
  AuthorService,
  AuthorServiceError,
  AuthorUserContext,
} from '../services/author/AuthorService';
import { CreateAuthorDTO } from '../dtos/author/CreateAuthorDTO';
import { UpdateAuthorDTO } from '../dtos/author/UpdateAuthorDTO';
import { toAuthorResponseDTO } from '../dtos/author/AuthorResponseDTO';
import { Repository as AuthorRepositoryContract } from '../repositories/author/Repository';
import { Repository as BookRepositoryContract } from '../repositories/book/Repository';
import { SORT_DIRECTIONS, DATABASE_FIELDS, ERROR_CODES } from '@my-many-books/shared-types';
import { ApiErrorPayload } from '../common/ApiResponse';
import { USER_ROLES } from '@my-many-books/shared-auth';
export interface AuthorSearchFilters {
  name?: string;
  surname?: string;
  nationality?: string;
  userId?: number;
  updatedSince?: string;
}

/**
 * Controller for managing Author resources.
 * This class contains all the business logic for authors,
 * independent of the web framework (Express, Lambda, etc.).
 */
@injectable()
export class AuthorController extends BaseController {
  constructor(
    @inject(TYPES.AuthorService) private readonly authorService: AuthorService,
    @inject(TYPES.AuthorRepository) private readonly authorRepository: AuthorRepositoryContract,
    @inject(TYPES.BookRepository) private readonly bookRepository: BookRepositoryContract
  ) {
    super();
    this.authorService.initializeControllerContext();
  }

  private readonly searchFiltersSchema = Joi.object<AuthorSearchFilters>({
    name: Joi.string().max(200).optional().trim(),
    surname: Joi.string().max(200).optional().trim(),
    nationality: Joi.string().max(100).optional().trim(),
  });

  /**
   * Creates a new author.
   * @param request The universal request object.
   * @returns An ApiResponse object with the newly created author or an error.
   */
  async createAuthor(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const body = this.parseBody(request);
    const dto = CreateAuthorDTO.from(body);
    const serviceInput = dto.toServiceInput();

    try {
      const createdAuthor = await this.authorService.createAuthor(
        serviceInput,
        this.getUserContext(request)!
      );
      return this.createSuccessResponse(
        toAuthorResponseDTO(createdAuthor),
        this.t('common:author_created'),
        undefined,
        201
      );
    } catch (error) {
      return this.handleAuthorServiceError(error);
    }
  }

  /**
   * Retrieves a single author by their ID.
   * @param request The universal request object.
   * @returns An ApiResponse object with the author data or an error.
   */
  async getAuthor(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authorId = this.getPathParameter(request, 'id');
    if (!authorId || isNaN(Number(authorId))) {
      return this.createErrorResponseI18n('errors:valid_id_required', 400, { resource: 'author' });
    }

    const includeBooks = this.getQueryParameter(request, 'includeBooks') === 'true';
    const author =
      request.user?.role === USER_ROLES.ADMIN
        ? await this.authorRepository.findById(Number(authorId), { includeBooks })
        : await this.authorRepository.findUserAuthorById(
            Number(authorId),
            request.user?.id ?? -1,
            {
              includeBooks,
            }
          );

    if (!author) {
      return this.createErrorResponseI18n('errors:author_not_found', 404);
    }

    return this.createSuccessResponse(author);
  }

  /**
   * Updates an existing author.
   * @param request The universal request object.
   * @returns An ApiResponse object with the updated author or an error.
   */
  async updateAuthor(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const authorId = this.getPathParameter(request, 'id');
    if (!authorId || isNaN(Number(authorId))) {
      return this.createErrorResponseI18n('errors:valid_id_required', 400, { resource: 'author' });
    }

    const body = this.parseBody(request);
    const dto = UpdateAuthorDTO.from(body);
    const updateInput = dto.toServiceInput();

    try {
      const updated = await this.authorService.updateAuthor(
        Number(authorId),
        updateInput,
        this.getUserContext(request)!
      );
      return this.createSuccessResponse(
        toAuthorResponseDTO(updated),
        this.t('common:author_updated')
      );
    } catch (error) {
      return this.handleAuthorServiceError(error);
    }
  }

  /**
   * Deletes an author by their ID.
   * @param request The universal request object.
   * @returns A success message or an error.
   */
  async deleteAuthor(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const authorId = this.getPathParameter(request, 'id');
    if (!authorId || isNaN(Number(authorId))) {
      return this.createErrorResponseI18n('errors:valid_id_required', 400, { resource: 'author' });
    }

    const numericAuthorId = Number(authorId);
    const forceDelete = this.getQueryParameter(request, 'force') === 'true';

    try {
      await this.authorService.deleteAuthor(numericAuthorId, this.getUserContext(request)!, forceDelete);
      return this.createSuccessResponse(null, this.t('common:author_deleted'), undefined, 204);
    } catch (error) {
      return this.handleAuthorServiceError(error);
    }
  }

  /**
   * Lists all authors with pagination and filtering.
   * @param request The universal request object.
   * @returns An ApiResponse with a list of authors and pagination metadata.
   */
  async listAuthors(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const pagination = this.getPaginationParams(request);
    const filters = this.getQueryParameter(request, 'filters');
    const includeBooks = this.getQueryParameter(request, 'includeBooks') === 'true';
    const updatedSince = this.getQueryParameter(request, 'updatedSince');

    let searchFilters: AuthorSearchFilters = {};
    if (filters) {
      try {
        const parsedFilters: unknown = JSON.parse(filters);
        if (!this.isRecord(parsedFilters)) {
          return this.createErrorResponseI18n('errors:invalid_filters', 400);
        }

        const filterValidation = this.validateRequest(parsedFilters, this.searchFiltersSchema);
        if (!filterValidation.isValid) {
          return this.createErrorResponseI18n(
            'errors:validation_failed',
            400,
            undefined,
            filterValidation.errors ? { errors: filterValidation.errors } : undefined
          );
        }
        searchFilters = filterValidation.value!;
      } catch {
        return this.createErrorResponseI18n('errors:invalid_filters', 400);
      }
    }

    // Add updatedSince filter for incremental sync
    if (updatedSince) {
      searchFilters.updatedSince = updatedSince;
    }

    if (request.user?.role !== USER_ROLES.ADMIN && request.user?.id !== undefined) {
      searchFilters.userId = request.user.id;
    }

    // Use repository layer for consistent filtering and query logic
    const listOptions = {
      limit: pagination.limit,
      offset: pagination.offset,
      includeBooks,
      filters: searchFilters,
      orderBy: 'surname',
      orderDirection: SORT_DIRECTIONS.ASC,
    };

    const result = await this.authorRepository.list(listOptions);
    
    const meta = this.createPaginationMeta(pagination.page, pagination.limit, result.total);
    return this.createSuccessResponse(result.rows, undefined, meta);
  }

  /**
   * Retrieves books for a specific author with pagination.
   * @param request The universal request object.
   * @returns An ApiResponse with a list of books and pagination metadata.
   */
  async getAuthorBooks(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const authorId = this.getPathParameter(request, 'id');
    if (!authorId || isNaN(Number(authorId))) {
      return this.createErrorResponseI18n('errors:valid_id_required', 400, { resource: 'author' });
    }

    const pagination = this.getPaginationParams(request);

    const author = await this.authorRepository.findById(Number(authorId));
    if (!author) {
      return this.createErrorResponseI18n('errors:author_not_found', 404);
    }

    const result = await this.bookRepository.search(
      { authorId: Number(authorId) },
      { limit: pagination.limit, offset: pagination.offset, orderBy: DATABASE_FIELDS.CREATION_DATE, orderDirection: SORT_DIRECTIONS.DESC }
    );

    const meta = this.createPaginationMeta(pagination.page, pagination.limit, result.total);

    return this.createSuccessResponse(
      {
        author: {
          id: author.id,
          name: author.name,
          surname: author.surname,
        },
        books: result.rows,
      },
      undefined,
      meta
    );
  }

  private getUserContext(request: UniversalRequest): AuthorUserContext | null {
    if (!request.user) {
      return null;
    }
    const context: AuthorUserContext = {
      userId: request.user.id,
    };
    if (request.user.role) {
      context.role = request.user.role;
    }
    return context;
  }

  private handleAuthorServiceError(error: unknown): ApiResponse {
    if (!(error instanceof AuthorServiceError)) {
      throw error;
    }

    switch (error.code) {
      case 'DUPLICATE_AUTHOR':
        return {
          statusCode: 409,
          success: false,
          error: {
            code: ERROR_CODES.DUPLICATE_AUTHOR,
            message: this.t('errors:resource_exists', { resource: 'Author', field: 'name' }),
          } as ApiErrorPayload,
        };
      case 'AUTHOR_NOT_FOUND':
        return this.createErrorResponseI18n('errors:author_not_found', 404);
      case 'AUTHOR_HAS_BOOKS':
        return {
          statusCode: 409,
          success: false,
          error: {
            code: 'AUTHOR_HAS_BOOKS',
            message: this.t('errors:author_has_books'),
          } as ApiErrorPayload,
        };
      case 'FORBIDDEN':
      default:
        return this.createErrorResponseI18n('errors:permission_denied', 403);
    }
  }


}
