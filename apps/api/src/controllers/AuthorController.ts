// ================================================================
// src/controllers/AuthorController.ts
// ================================================================

import Joi from 'joi';
import { Op, WhereOptions, Order } from 'sequelize';
import { BaseController } from './base/BaseController';
import { Author, Book } from '../models';
import { ApiResponse } from '../common/ApiResponse';
import { AuthorAttributes } from '../models/interfaces/ModelInterfaces';
import { UniversalRequest } from '../types';
import { createModel } from '../utils/sequelize-helpers';

interface CreateAuthorRequest {
  name: string;
  surname: string;
  nationality?: string;
}

interface AuthorSearchFilters {
  name?: string;
  surname?: string;
  nationality?: string;
}

/**
 * Controller for managing Author resources.
 * This class contains all the business logic for authors,
 * independent of the web framework (Express, Lambda, etc.).
 */
export class AuthorController extends BaseController {
  private readonly createAuthorSchema = Joi.object<CreateAuthorRequest>({
    name: Joi.string().required().max(255).trim(),
    surname: Joi.string().required().max(255).trim(),
    nationality: Joi.string().max(255).allow(null, '').optional(),
  });

  private readonly updateAuthorSchema = this.createAuthorSchema.fork(['name', 'surname'], schema =>
    schema.optional()
  );

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
    const body = this.parseBody<CreateAuthorRequest>(request);
    if (!body) {
      return this.createErrorResponseI18n('errors:request_body_required', 400);
    }

    const validation = this.validateRequest(body, this.createAuthorSchema);
    if (!validation.isValid) {
      return this.createErrorResponseI18n(
        'errors:validation_failed',
        400,
        undefined,
        validation.errors ? { errors: validation.errors } : undefined
      );
    }

    const authorData = validation.value!;

    // Check if author already exists
    const existingAuthor = await Author.findOne({
      where: {
        name: authorData.name,
        surname: authorData.surname,
      },
    });

    if (existingAuthor) {
      return this.createErrorResponseI18n('errors:resource_exists', 409, {
        resource: 'Author',
        field: 'name',
      });
    }

    try {
      // Create author
      const newAuthor = await createModel(Author, authorData);
      return this.createSuccessResponse(newAuthor, 'Author created successfully', undefined, 201);
    } catch (dbError: unknown) {
      const errorMessage = dbError instanceof Error ? dbError.message : 'Unknown database error';
      return this.createErrorResponseI18n(
        'errors:create_failed',
        500,
        { resource: 'author' },
        { message: errorMessage }
      );
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
    const includeClause = includeBooks ? [{ model: Book, through: { attributes: [] } }] : [];

    const author = await Author.findByPk(Number(authorId), {
      include: includeClause,
    });

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
    const authorId = this.getPathParameter(request, 'id');
    if (!authorId || isNaN(Number(authorId))) {
      return this.createErrorResponseI18n('errors:valid_id_required', 400, { resource: 'author' });
    }

    const body = this.parseBody<Partial<CreateAuthorRequest>>(request);
    if (!body) {
      return this.createErrorResponseI18n('errors:request_body_required', 400);
    }

    const validation = this.validateRequest(body, this.updateAuthorSchema);
    if (!validation.isValid) {
      return this.createErrorResponseI18n(
        'errors:validation_failed',
        400,
        undefined,
        validation.errors ? { errors: validation.errors } : undefined
      );
    }

    const author = await Author.findByPk(Number(authorId));
    if (!author) {
      return this.createErrorResponseI18n('errors:author_not_found', 404);
    }

    const authorData = validation.value!;

    // Check for name conflicts on update
    if (
      (authorData.name || authorData.surname) &&
      (authorData.name !== author.name || authorData.surname !== author.surname)
    ) {
      const name = authorData.name ?? author.name;
      const surname = authorData.surname ?? author.surname;

      const existingAuthor = await Author.findOne({
        where: {
          name,
          surname,
        },
      });

      if (existingAuthor && existingAuthor.id !== author.id) {
        return this.createErrorResponseI18n('errors:resource_exists', 409, {
          resource: 'Author',
          field: 'name',
        });
      }
    }

    try {
      await author.update(authorData);
      return this.createSuccessResponse(author, 'Author updated successfully');
    } catch (dbError: unknown) {
      const errorMessage = dbError instanceof Error ? dbError.message : 'Unknown database error';
      return this.createErrorResponseI18n(
        'errors:update_failed',
        500,
        { resource: 'author' },
        { message: errorMessage }
      );
    }
  }

  /**
   * Deletes an author by their ID.
   * @param request The universal request object.
   * @returns A success message or an error.
   */
  async deleteAuthor(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authorId = this.getPathParameter(request, 'id');
    if (!authorId || isNaN(Number(authorId))) {
      return this.createErrorResponseI18n('errors:valid_id_required', 400, { resource: 'author' });
    }

    const author = await Author.findByPk(Number(authorId));

    if (!author) {
      return this.createErrorResponseI18n('errors:author_not_found', 404);
    }

    // Check if author has books before deletion
    const bookCount = await Book.count({
      include: [
        {
          model: Author,
          where: { id: Number(authorId) },
        },
      ],
    });

    if (bookCount > 0) {
      return this.createErrorResponseI18n('errors:author_has_books', 409);
    }

    try {
      await author.destroy();
      // Return a 204 No Content status for successful deletion
      return this.createSuccessResponse(null, 'Author deleted successfully', undefined, 204);
    } catch (dbError: unknown) {
      const errorMessage = dbError instanceof Error ? dbError.message : 'Unknown database error';
      return this.createErrorResponseI18n(
        'errors:delete_failed',
        500,
        { resource: 'author' },
        { message: errorMessage }
      );
    }
  }

  /**
   * Lists all authors with pagination and filtering.
   * @param request The universal request object.
   * @returns An ApiResponse with a list of authors and pagination metadata.
   */
  async listAuthors(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const pagination = this.getPaginationParams(request);
    const filters = this.getQueryParameter(request, 'filters');
    const includeBooks = this.getQueryParameter(request, 'includeBooks') === 'true';

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

    // Build the where clause dynamically
    const whereConditions: WhereOptions<AuthorAttributes>[] = [];

    if (searchFilters.name && searchFilters.surname) {
      whereConditions.push({ name: { [Op.iLike]: `%${searchFilters.name}%` } });
      whereConditions.push({ surname: { [Op.iLike]: `%${searchFilters.surname}%` } });
    } else if (searchFilters.name) {
      whereConditions.push({
        [Op.or]: [
          { name: { [Op.iLike]: `%${searchFilters.name}%` } },
          { surname: { [Op.iLike]: `%${searchFilters.name}%` } },
        ],
      });
    } else if (searchFilters.surname) {
      whereConditions.push({ surname: { [Op.iLike]: `%${searchFilters.surname}%` } });
    }

    if (searchFilters.nationality) {
      whereConditions.push({ nationality: { [Op.iLike]: `%${searchFilters.nationality}%` } });
    }

    const whereClause = whereConditions.length > 0 ? { [Op.and]: whereConditions } : {};

    const includeClause = includeBooks ? [{ model: Book, through: { attributes: [] } }] : [];

    const queryOptions = {
      where: whereClause,
      include: includeClause,
      limit: pagination.limit,
      offset: pagination.offset,
      order: [
        ['surname', 'ASC'],
        ['name', 'ASC'],
      ] as Order,
    };

    const { count, rows: authors } = await Author.findAndCountAll(queryOptions);

    const meta = this.createPaginationMeta(pagination.page, pagination.limit, count);
    return this.createSuccessResponse(authors, undefined, meta);
  }

  /**
   * Searches authors by name or surname (for autocomplete).
   * @param request The universal request object.
   * @returns An ApiResponse with a list of matching authors.
   */
  async searchAuthors(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const query = this.getQueryParameter(request, 'q');

    if (!query || query.trim().length < 2) {
      return this.createErrorResponseI18n('errors:search_query_min_length', 400, { min: 2 });
    }

    const searchTerm = query.trim();

    // Search across name and surname fields using MySQL-compatible LIKE
    const authors = await Author.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.like]: `%${searchTerm}%` } },
          { surname: { [Op.like]: `%${searchTerm}%` } },
        ],
      },
      attributes: ['id', 'name', 'surname', 'nationality', 'creationDate', 'updateDate'],
      order: [
        ['surname', 'ASC'],
        ['name', 'ASC'],
      ],
      limit: 20, // Limit results for autocomplete
    });

    return this.createSuccessResponse(authors);
  }

  /**
   * Retrieves books for a specific author with pagination.
   * @param request The universal request object.
   * @returns An ApiResponse with a list of books and pagination metadata.
   */
  async getAuthorBooks(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authorId = this.getPathParameter(request, 'id');
    if (!authorId || isNaN(Number(authorId))) {
      return this.createErrorResponseI18n('errors:valid_id_required', 400, { resource: 'author' });
    }

    const pagination = this.getPaginationParams(request);

    const author = await Author.findByPk(Number(authorId));
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
}

export const authorController = new AuthorController();
