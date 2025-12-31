// ================================================================
// src/controllers/AuthorController.ts
// ================================================================

import Joi from 'joi';
import { inject, injectable } from 'inversify';
import { BaseController } from './base/BaseController';
import { Author, Book } from '../models';
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
import { USER_ROLES } from '@my-many-books/shared-auth';
import { emitHookEvent } from '../services/hooks/hookSystem';
import { EVENTS } from '../services/hooks/events';
import { AuthorSearchService } from '../services/search/AuthorSearchService';

interface AuthorSearchFilters {
  name?: string;
  surname?: string;
  nationality?: string;
  userId?: number;
  updatedSince?: string;
  [key: string]: any;
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
    @inject(TYPES.AuthorSearchService) private readonly authorSearchService: AuthorSearchService
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

    await emitHookEvent(EVENTS.AUTHOR.CREATE.BEFORE, {
      user: this.mapRequestUser(request),
      input: serviceInput,
    });

    try {
      const createdAuthor = await this.authorService.createAuthor(
        serviceInput,
        this.getUserContext(request)!
      );
      return this.createSuccessResponse(
        toAuthorResponseDTO(createdAuthor),
        'Author created successfully',
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

    await emitHookEvent(EVENTS.AUTHOR.UPDATE.BEFORE, {
      user: this.mapRequestUser(request),
      authorId: Number(authorId),
      input: updateInput,
    });

    try {
      const updated = await this.authorService.updateAuthor(
        Number(authorId),
        updateInput,
        this.getUserContext(request)!
      );
      return this.createSuccessResponse(
        toAuthorResponseDTO(updated),
        'Author updated successfully'
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
    await emitHookEvent(EVENTS.AUTHOR.DELETE.BEFORE, {
      user: this.mapRequestUser(request),
      authorId: numericAuthorId,
    });

    try {
      await this.authorService.deleteAuthor(numericAuthorId, this.getUserContext(request)!);
      return this.createSuccessResponse(null, 'Author deleted successfully', undefined, 204);
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
        searchFilters = JSON.parse(filters) as AuthorSearchFilters;
        const filterValidation = this.validateRequest(searchFilters, this.searchFiltersSchema);
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
      orderDirection: 'ASC' as const,
    };

    const result = await this.authorRepository.list(listOptions);
    
    const meta = this.createPaginationMeta(pagination.page, pagination.limit, result.total);
    return this.createSuccessResponse(result.rows, undefined, meta);
  }

  /**
   * Searches authors by name or surname (for autocomplete).
   * @param request The universal request object.
   * @returns An ApiResponse with a list of matching authors.
   */
  async searchAuthors(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const query = this.getQueryParameter(request, 'q') || '';
    const sortBy = this.getQueryParameter(request, 'sortBy');
    const sortOrder = this.getQueryParameter(request, 'sortOrder') as 'asc' | 'desc' | undefined;
    const limit = parseInt(this.getQueryParameter(request, 'limit') || '20', 10);
    const offset = parseInt(this.getQueryParameter(request, 'offset') || '0', 10);

    // Validate sortBy against Author.SORTABLE_FIELD_VALUES
    if (sortBy && !(Author.SORTABLE_FIELD_VALUES as readonly string[]).includes(sortBy)) {
      return this.createErrorResponse(
        `Invalid sortBy field: ${sortBy}. Must be one of: ${Author.SORTABLE_FIELD_VALUES.join(', ')}`,
        400
      );
    }

    // Use AuthorSearchService for FULLTEXT/LIKE search
    const { results, total } = await this.authorSearchService.search({
      query: query.trim(),
      userId: request.user!.id,
      sortBy: sortBy || undefined,
      sortOrder,
      limit,
      offset,
    });

    return this.createSuccessResponse({
      results,
      total,
      limit,
      offset,
    });
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

    const { count, rows } = await Book.findAndCountAll({
      include: [
        {
          model: Author,
          where: { id: Number(authorId) },
          through: { attributes: [] },
        },
      ],
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['publishedDate', 'DESC']],
      distinct: true,
    });

    const meta = this.createPaginationMeta(pagination.page, pagination.limit, count);

    return this.createSuccessResponse(
      {
        author: {
          id: author.id,
          name: author.name,
          surname: author.surname,
        },
        books: rows,
      },
      undefined,
      meta
    );
  }

  private ensureAuthenticated(request: UniversalRequest): ApiResponse | null {
    if (!request.user?.id) {
      return this.createErrorResponseI18n('errors:auth_required', 401);
    }
    return null;
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
        return this.createErrorResponseI18n('errors:resource_exists', 409, {
          resource: 'Author',
          field: 'name',
        });
      case 'AUTHOR_NOT_FOUND':
        return this.createErrorResponseI18n('errors:author_not_found', 404);
      case 'AUTHOR_HAS_BOOKS':
        return this.createErrorResponseI18n('errors:author_has_books', 409);
      case 'FORBIDDEN':
      default:
        return this.createErrorResponseI18n('errors:permission_denied', 403);
    }
  }


  private mapRequestUser(request: UniversalRequest): { id: number; role?: string } | null {
    if (!request.user) {
      return null;
    }
    const summary: { id: number; role?: string } = {
      id: request.user.id,
    };
    if (request.user.role) {
      summary.role = request.user.role;
    }
    return summary;
  }
}
