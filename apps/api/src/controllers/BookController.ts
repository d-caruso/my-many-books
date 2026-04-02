// ================================================================
// src/controllers/BookController.ts
// ================================================================

import Joi from 'joi';
import { inject, injectable } from 'inversify';
import { WhereOptions } from 'sequelize';
import { BaseController } from './base/BaseController';
import { Author, Book, Category } from '../models';
import { ApiResponse } from '../common/ApiResponse';
import {
  BookCreationAttributes,
  BookAttributes,
  BookStatus,
} from '../models/interfaces/ModelInterfaces';
import { validateIsbn } from '../utils/isbn';
import { isbnService } from '../services/isbnService';
import { UniversalRequest } from '../types';
import { createModel, findOrCreateModel } from '../utils/sequelize-helpers';
import {
  BOOK_STATUSES,
  SEARCH_SORT_BY_FIELD_VALUES,
  SEARCH_RESULT_STATUS,
  SORT_DIRECTION_VALUES,
  SORT_DIRECTIONS,
  type SearchSortByField,
  type SortDirection,
} from '@my-many-books/shared-types';
import { BookService, BookServiceError, BookUserContext } from '../services/book/BookService';
import { CreateBookDTO } from '../dtos/book/CreateBookDTO';
import { UpdateBookDTO } from '../dtos/book/UpdateBookDTO';
import { toBookResponseDTO } from '../dtos/book/BookResponseDTO';
import { Repository as BookRepositoryContract } from '../repositories/book/Repository';
import { TYPES } from '../container/types';
import { emitHookEvent } from '../services/hooks/hookSystem';
import { EVENTS } from '../services/hooks/events';
import { BookSearchService } from '../services/search/BookSearchService';
import { BookSearchResultDTO } from '../dtos/book/BookSearchResultDTO';
import { TransformedAuthorData, TransformedCategoryData } from '../types/bookData';

export interface BookSearchFilters {
  title?: string;
  isbnCode?: string;
  editionNumber?: number;
  editionDate?: string;
  status?: BookStatus;
  notes?: string;
  author?: string;
  category?: string;
  userId?: number;
  updatedSince?: string;
}

/**
 * Controller for managing Book resources.
 * This class contains all the business logic for books,
 * independent of the web framework (Express, Lambda, etc.).
 */
@injectable()
export class BookController extends BaseController {
  constructor(
    @inject(TYPES.BookService) private readonly bookService: BookService,
    @inject(TYPES.BookSearchService) private readonly bookSearchService: BookSearchService,
    @inject(TYPES.BookRepository) private readonly bookRepository: BookRepositoryContract
  ) {
    super();
    this.bookService.initializeControllerContext();
  }

  private readonly searchFiltersSchema = Joi.object<BookSearchFilters>({
    title: Joi.string().required().max(200).trim(),
    isbnCode: Joi.string()
      .required()
      .custom((value: string, helpers: Joi.CustomHelpers) =>
        this.validateIsbnField(value, helpers)
      ),
    editionNumber: Joi.number().integer().min(1).optional(),
    editionDate: Joi.string()
      .pattern(/^\d{4}(-\d{2}(-\d{2})?)?$/)
      .optional()
      .allow(null)
      .messages({
        'string.pattern.base': 'Edition date must be YYYY, YYYY-MM, or YYYY-MM-DD',
      }),
    status: Joi.string()
      .valid(...BOOK_STATUSES)
      .optional(),
    notes: Joi.string().optional().max(5000).trim(),
    author: Joi.string().max(200).optional().trim(),
    category: Joi.string().max(100).optional().trim(),
  });

  private validateIsbnField(value: string, helpers: Joi.CustomHelpers): string | Joi.ErrorReport {
    const validation = validateIsbn(value);
    if (!validation.isValid) {
      return helpers.error('any.invalid', { message: `Invalid ISBN: ${validation.error}` });
    }

    if (typeof validation.normalizedIsbn !== 'string') {
      return helpers.error('any.invalid', { message: 'Invalid ISBN: normalization failed' });
    }

    return validation.normalizedIsbn;
  }

  private normalizeBookStatus(value: string | null): BookStatus | undefined {
    switch (value) {
      case 'reading':
      case 'paused':
      case 'finished':
        return value;
      default:
        return undefined;
    }
  }

  private isSearchSortableField(value: string): value is SearchSortByField {
    return SEARCH_SORT_BY_FIELD_VALUES.some(field => field === value);
  }

  private isSortDirection(value: string): value is SortDirection {
    return SORT_DIRECTION_VALUES.some(direction => direction === value);
  }

  /**
   * Creates a new book.
   * @param request The universal request object.
   * @returns An ApiResponse object with the newly created book or an error.
   */
  async createBook(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const body = this.parseBody(request);
    const dto = CreateBookDTO.from(body);
    const serviceInput = dto.toServiceInput();
    const userContext = this.getUserContext(request);

    await emitHookEvent(EVENTS.BOOK.CREATE.BEFORE, {
      user: this.mapRequestUser(request),
      input: serviceInput,
    });

    try {
      const createdBook = await this.bookService.createBook(serviceInput, userContext);
      return this.createSuccessResponse(
        toBookResponseDTO(createdBook),
        this.t('common:book_created'),
        undefined,
        201
      );
    } catch (error) {
      return this.handleBookServiceError(error);
    }
  }

  /**
   * Retrieves a single book by its ID.
   * @param request The universal request object.
   * @returns An ApiResponse object with the book data or an error.
   */
  async getBook(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const bookId = this.getPathParameter(request, 'id');
    if (!bookId || isNaN(Number(bookId))) {
      return this.createErrorResponseI18n('errors:valid_id_required', 400, { resource: 'book' });
    }

    const book = await this.bookRepository.findUserBookById(Number(bookId), request.user!.id);

    if (!book) {
      return this.createErrorResponseI18n('errors:book_not_found', 404);
    }

    return this.createSuccessResponse(book);
  }

  /**
   * Updates an existing book.
   * @param request The universal request object.
   * @returns An ApiResponse object with the updated book or an error.
   */
  async updateBook(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const bookId = this.getPathParameter(request, 'id');
    if (!bookId || isNaN(Number(bookId))) {
      return this.createErrorResponseI18n('errors:valid_id_required', 400, { resource: 'book' });
    }

    const body = this.parseBody(request);
    const dto = UpdateBookDTO.from(body);

    return this.executeBookUpdate(request, Number(bookId), dto);
  }

  /**
   * Partially updates an existing book (PATCH).
   * @param request The universal request object.
   * @returns An ApiResponse object with the updated book or an error.
   */
  async patchBook(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const bookId = this.getPathParameter(request, 'id');
    if (!bookId || isNaN(Number(bookId))) {
      return this.createErrorResponseI18n('errors:valid_id_required', 400, { resource: 'book' });
    }

    const body = this.parseBody(request);
    const dto = UpdateBookDTO.from(body);

    return this.executeBookUpdate(request, Number(bookId), dto);
  }

  /**
   * Deletes a book by its ID.
   * @param request The universal request object.
   * @returns A success message or an error.
   */
  async deleteBook(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const bookId = this.getPathParameter(request, 'id');
    if (!bookId || isNaN(Number(bookId))) {
      return this.createErrorResponseI18n('errors:valid_id_required', 400, { resource: 'book' });
    }

    try {
      const numericBookId = Number(bookId);
      await emitHookEvent(EVENTS.BOOK.DELETE.BEFORE, {
        user: this.mapRequestUser(request),
        bookId: numericBookId,
      });
      await this.bookService.deleteBook(numericBookId, this.getUserContext(request)!);
      return this.createSuccessResponse(null, this.t('common:book_deleted'), undefined, 204);
    } catch (error) {
      return this.handleBookServiceError(error);
    }
  }

  /**
   * Lists all books with pagination and filtering.
   * @param request The universal request object.
   * @returns An ApiResponse with a list of books and pagination metadata.
   */
  async listBooks(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const pagination = this.getPaginationParams(request);
    const filters = this.getQueryParameter(request, 'filters');

    const includeAuthors = this.getQueryParameter(request, 'includeAuthors') === 'true';
    const includeCategories = this.getQueryParameter(request, 'includeCategories') === 'true';
    const updatedSince = this.getQueryParameter(request, 'updatedSince');

    let searchFilters: BookSearchFilters = {};
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

    // Add user ID filter for user-specific books
    if (request.user) {
      searchFilters.userId = request.user.id;
    }

    // Use repository layer for consistent filtering and query logic
    const listOptions = {
      limit: pagination.limit,
      offset: pagination.offset,
      includeAssociations: includeAuthors || includeCategories,
      filters: searchFilters,
      orderBy: 'title',
      orderDirection: SORT_DIRECTIONS.ASC,
    };

    const result = await this.bookRepository.listUserBooks(request.user?.id || 0, listOptions);
    
    const meta = this.createPaginationMeta(pagination.page, pagination.limit, result.total);

    return this.createSuccessResponse(
      {
        books: result.rows,
        pagination: meta,
      },
      undefined,
      undefined
    );
  }

  /**
   * Searches books by query string (title, author, or ISBN) with advanced filters.
   * Uses BookSearchService with FULLTEXT or LIKE search based on settings.
   * @param request The universal request object.
   * @returns An ApiResponse with matching books.
   */
  async searchBooks(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const query = this.getQueryParameter(request, 'q');
    const status = this.getQueryParameter(request, 'status');
    const authorId = this.getQueryParameter(request, 'authorId');
    const categoryId = this.getQueryParameter(request, 'categoryId');
    const sortByParam = this.getQueryParameter(request, 'sortBy');
    const sortOrderParam = this.getQueryParameter(request, 'sortOrder') || 'asc';
    const pagination = this.getPaginationParams(request);

    // Validate query length if provided
    if (query && query.length < 2) {
      return this.createErrorResponseI18n('errors:search_query_min_length', 400, { min: 2 });
    }

    // If no query provided, fall back to old behavior (list books with filters)
    if (!query) {
      return this.searchBooksLegacy(request);
    }

    // Validate sortBy against the shared public search sort fields.
    let sortBy: SearchSortByField | undefined;

    if (!this.isSortDirection(sortOrderParam)) {
      return this.createErrorResponseI18n('errors:validation_failed', 400, undefined, {
        errors: {
          sortOrder: `Invalid sortOrder: ${sortOrderParam}. Must be one of ${SORT_DIRECTION_VALUES.join(', ')}`,
        },
      });
    }
    const sortOrder: SortDirection = sortOrderParam;

    if (sortByParam) {
      if (this.isSearchSortableField(sortByParam)) {
        sortBy = sortByParam;
      } else {
        return this.createErrorResponseI18n('errors:validation_failed', 400, undefined, {
          errors: {
            sortBy: `Invalid sortBy field: ${sortByParam}. Must be one of: ${SEARCH_SORT_BY_FIELD_VALUES.join(', ')}`,
          },
        });
      }
    }

    const normalizedStatus = this.normalizeBookStatus(status);
    if (status && !normalizedStatus) {
      return this.createErrorResponseI18n('errors:validation_failed', 400, undefined, {
        errors: {
          status: `Invalid status: ${status}. Must be one of ${BOOK_STATUSES.join(', ')}`,
        },
      });
    }

    try {
      // Use BookSearchService for FULLTEXT/LIKE search
      const { results, total } = await this.bookSearchService.search({
        query,
        userId: request.user?.id,
        sortBy,
        sortOrder,
        limit: pagination.limit,
        offset: pagination.offset,
      });

      // Apply post-search filters for author/category/status
      // (BookSearchService only searches title/notes, these are additional filters)
      let filteredResults = results;

      if (status || authorId || categoryId) {
        // Fetch full book objects with associations to apply filters
        const bookIds = results.map(r => r.id);
        if (bookIds.length === 0) {
          filteredResults = [];
        } else {
          const { rows } = await this.bookRepository.search(
            {
              ids: bookIds,
              userId: request.user?.id,
              status: normalizedStatus || undefined,
              authorId: authorId ? Number(authorId) : undefined,
              categoryId: categoryId ? Number(categoryId) : undefined,
            },
            { limit: bookIds.length, includeAssociations: true }
          );

          // Preserve original order from BookSearchService (pinned first, then by explicit/default search sort)
          const bookMap = new Map(rows.map(b => [b.id, b]));
          filteredResults = results
            .map(r => {
              const book = bookMap.get(r.id);
              if (!book) return undefined;
              const mappedResult: BookSearchResultDTO = {
                ...book,
                notes: book.notes ?? undefined,
                userId: book.userId ?? undefined,
                isPinned: r.isPinned,
                status: r.isPinned ? SEARCH_RESULT_STATUS.PINNED : SEARCH_RESULT_STATUS.REGULAR,
                relevanceScore: r.relevanceScore,
              };
              return mappedResult;
            })
            .filter((b): b is BookSearchResultDTO => b !== undefined);
        }
      } else {
        // No additional filters - use results as-is but mark status
        filteredResults = results.map(r => ({
          ...r,
          status: r.isPinned ? SEARCH_RESULT_STATUS.PINNED : SEARCH_RESULT_STATUS.REGULAR,
        }));
      }

      // Return SearchResult format expected by frontend
      const searchResult = {
        books: filteredResults,
        total: filteredResults.length,
        hasMore: pagination.page * pagination.limit < total,
        page: pagination.page,
      };

      return this.createSuccessResponse(searchResult);
    } catch (error) {
      if (error instanceof Error) {
        return this.createErrorResponseI18n('errors:search_failed', 500, undefined, {
          error: error.message,
        });
      }
      throw error;
    }
  }

  /**
   * Legacy search for books without query string (list with filters).
   * Used when 'q' parameter is not provided.
   */
  private async searchBooksLegacy(request: UniversalRequest): Promise<ApiResponse> {
    const status = this.getQueryParameter(request, 'status');
    const authorId = this.getQueryParameter(request, 'authorId');
    const categoryId = this.getQueryParameter(request, 'categoryId');
    const sortByParam = this.getQueryParameter(request, 'sortBy') || 'title';
    const sortOrderParam = this.getQueryParameter(request, 'sortOrder') || SORT_DIRECTIONS.ASC;
    const pagination = this.getPaginationParams(request);

    if (!this.isSortDirection(sortOrderParam)) {
      return this.createErrorResponseI18n('errors:validation_failed', 400, undefined, {
        errors: {
          sortOrder: `Invalid sortOrder: ${sortOrderParam}. Must be one of ${SORT_DIRECTION_VALUES.join(', ')}`,
        },
      });
    }

    if (!this.isSearchSortableField(sortByParam)) {
      return this.createErrorResponseI18n('errors:validation_failed', 400, undefined, {
        errors: {
          sortBy: `Invalid sortBy field: ${sortByParam}. Must be one of: ${SEARCH_SORT_BY_FIELD_VALUES.join(', ')}`,
        },
      });
    }

    const sortBy: SearchSortByField = sortByParam;
    const sortOrder: SortDirection = sortOrderParam;

    // Build base where conditions
    const whereConditions: WhereOptions<BookAttributes>[] = [];

    // Add user ID filter if authenticated
    if (request.user) {
      whereConditions.push({ userId: request.user.id });
    }

    // Add status filter
    const normalizedStatus = this.normalizeBookStatus(status);
    if (status && !normalizedStatus) {
      return this.createErrorResponseI18n('errors:validation_failed', 400, undefined, {
        errors: {
          status: `Invalid status: ${status}. Must be one of ${BOOK_STATUSES.join(', ')}`,
        },
      });
    }
    if (normalizedStatus) {
      whereConditions.push({ status: normalizedStatus });
    }

    const result = await this.bookRepository.search(
      {
        userId: request.user?.id,
        status: normalizedStatus || undefined,
        authorId: authorId ? Number(authorId) : undefined,
        categoryId: categoryId ? Number(categoryId) : undefined,
      },
      {
        limit: pagination.limit,
        offset: pagination.offset,
        orderBy: sortBy,
        orderDirection: sortOrder,
        includeAssociations: true,
      }
    );

    // Return SearchResult format expected by frontend
    const searchResult = {
      books: result.rows,
      total: result.total,
      hasMore: pagination.page * pagination.limit < result.total,
      page: pagination.page,
    };

    return this.createSuccessResponse(searchResult);
  }

  /**
   * Looks up a book by its ISBN from local and external sources.
   * @param request The universal request object.
   * @returns An ApiResponse with the book data or an error.
   */
  async searchBooksByIsbn(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const isbn = this.getPathParameter(request, 'isbn') || this.getQueryParameter(request, 'isbn');
    if (!isbn) {
      return this.createErrorResponseI18n('errors:isbn_parameter_required', 400);
    }

    const validation = validateIsbn(isbn);
    if (!validation.isValid) {
      return this.createErrorResponseI18n('errors:invalid_isbn', 400, { error: validation.error });
    }

    const localBook = await this.bookRepository.findByIsbnCode(
      validation.normalizedIsbn!,
      request.user?.id
    );

    if (localBook) {
      return this.createSuccessResponse({
        found: true,
        external: false,
        book: localBook,
      });
    }

    const result = await isbnService.lookupBook(validation.normalizedIsbn!);
    if (!result.success || !result.book) {
      return this.createSuccessResponse({ found: false });
    }

    const userId = request.user!.id;
    const { authorIds, createdAuthorIds } = await this.resolveAuthors(result.book.authors, userId);
    const { categoryIds, createdCategoryIds } = await this.resolveCategories(
      result.book.categories,
      userId
    );

    return this.createSuccessResponse({
      found: true,
      external: true,
      book: {
        title: result.book.title,
        isbnCode: validation.normalizedIsbn!,
        editionNumber: result.book.editionNumber ?? null,
        editionDate: result.book.editionDate ?? null,
        notes: result.book.description ?? null,
        authorIds,
        categoryIds,
        createdAuthorIds,
        createdCategoryIds,
        coverImageUrlMedium: result.book.coverImageUrlMedium ?? null,
        coverImageUrlLarge: result.book.coverImageUrlLarge ?? null,
      },
    });
  }

  /**
   * Imports a book from an external ISBN service into the database.
   * @param request The universal request object.
   * @returns An ApiResponse with the imported book or an error.
   */
  async importBookFromIsbn(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) {
      return authError;
    }
    const user = request.user;
    if (!user) {
      return this.createErrorResponseI18n('errors:user_authentication_required', 401);
    }

    const body = this.parseBody(request);
    if (!this.isRecord(body) || typeof body['isbn'] !== 'string') {
      return this.createErrorResponseI18n('errors:isbn_not_provided', 400);
    }
    const userId = user.id;

    const validation = validateIsbn(body['isbn']);
    if (!validation.isValid) {
      return this.createErrorResponseI18n('errors:invalid_isbn', 400, { error: validation.error });
    }

    // Check if book already exists for this user (if applicable)
    const whereClause: WhereOptions<BookAttributes> = {
      isbnCode: validation.normalizedIsbn,
    };
    Object.assign(whereClause, { userId });
    const existingBook = await Book.findOne({ where: whereClause });
    if (existingBook) {
      return this.createErrorResponseI18n('errors:isbn_exists', 409, {
        isbn: validation.normalizedIsbn,
      });
    }

    // Lookup book data from ISBN service
    const result = await isbnService.lookupBook(validation.normalizedIsbn!);
    if (!result.success || !result.book) {
      return this.createErrorResponseI18n('errors:not_found', 404);
    }

    const bookData = result.book;

    // Create authors if they don't exist
    let authors: Author[] = [];
    if (bookData.authors && bookData.authors.length > 0) {
      authors = await Promise.all(
        bookData.authors.map(authorData =>
          findOrCreateModel(Author, {
            where: {
              name: authorData.name,
              surname: authorData.surname || '',
              userId,
            },
            defaults: {
              name: authorData.name,
              surname: authorData.surname || '',
              nationality: authorData.nationality || null,
              userId,
            },
          }).then(([author]) => author)
        )
      );
    }

    // Create categories if they don't exist
    let categories: Category[] = [];
    if (bookData.categories && bookData.categories.length > 0) {
      categories = await Promise.all(
        bookData.categories.map(categoryData =>
          findOrCreateModel(Category, {
            where: { name: categoryData.name, userId },
            defaults: { name: categoryData.name, userId },
          }).then(([category]) => category)
        )
      );
    }

    // Create book from external data
    const bookCreateData: BookCreationAttributes = {
      title: bookData.title,
      isbnCode: bookData.isbnCode,
      editionNumber: bookData.editionNumber,
      editionDate: bookData.editionDate,
      userId,
    };
    const book = await createModel(Book, bookCreateData);

    // Associate authors and categories with the new book
    if (authors.length > 0) {
      await book.addAuthors(authors);
    }
    if (categories.length > 0) {
      await book.addCategories(categories);
    }

    // Fetch complete book with associations for the response
    const importedBook = await this.getBookWithAssociations(book.id);

    return this.createSuccessResponse(
      {
        book: importedBook,
        source: result.source,
        responseTime: result.responseTime,
      },
      this.t('common:book_imported'),
      undefined,
      201
    );
  }

  // --- Helper Methods ---

  /**
   * Fetches a book by ID with its authors and categories.
   * @param id The book ID.
   * @returns The book model instance or null.
   */
  private async getBookWithAssociations(id: number): Promise<object | null> {
    return this.bookRepository.findById(id);
  }

  private async resolveAuthors(
    authors: TransformedAuthorData[] | undefined,
    userId: number
  ): Promise<{ authorIds: number[]; createdAuthorIds: number[] }> {
    if (!authors || authors.length === 0) {
      return { authorIds: [], createdAuthorIds: [] };
    }

    const resolvedAuthors = await Promise.all(
      authors.map(author =>
        findOrCreateModel(Author, {
          where: {
            name: author.name,
            surname: author.surname || '',
            userId,
          },
          defaults: {
            name: author.name,
            surname: author.surname || '',
            nationality: author.nationality || null,
            userId,
          },
        })
      )
    );

    return {
      authorIds: [...new Set(resolvedAuthors.map(([resolvedAuthor]) => resolvedAuthor.id))],
      createdAuthorIds: [
        ...new Set(
          resolvedAuthors
            .filter(([, created]) => created)
            .map(([resolvedAuthor]) => resolvedAuthor.id)
        ),
      ],
    };
  }

  private async resolveCategories(
    categories: TransformedCategoryData[] | undefined,
    userId: number
  ): Promise<{ categoryIds: number[]; createdCategoryIds: number[] }> {
    if (!categories || categories.length === 0) {
      return { categoryIds: [], createdCategoryIds: [] };
    }

    const resolvedCategories = await Promise.all(
      categories.map(category =>
        findOrCreateModel(Category, {
          where: {
            name: category.name.trim(),
            userId,
          },
          defaults: {
            name: category.name.trim(),
            userId,
          },
        })
      )
    );

    return {
      categoryIds: [...new Set(resolvedCategories.map(([resolvedCategory]) => resolvedCategory.id))],
      createdCategoryIds: [
        ...new Set(
          resolvedCategories
            .filter(([, created]) => created)
            .map(([resolvedCategory]) => resolvedCategory.id)
        ),
      ],
    };
  }

  // User-specific methods for route compatibility
  async getUserBooks(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    if (!request.user?.id) {
      return this.createErrorResponseI18n('errors:auth_required', 401);
    }

    const modifiedRequest = {
      ...request,
      queryStringParameters: {
        ...request.queryStringParameters,
        userId: request.user.id.toString(),
      },
    };

    return this.listBooks(modifiedRequest);
  }

  async getBookById(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    if (!request.user?.id) {
      return this.createErrorResponseI18n('errors:auth_required', 401);
    }

    return this.getBook(request);
  }

  async createBookForUser(request: UniversalRequest): Promise<ApiResponse> {
    return this.createBook(request);
  }

  async updateBookForUser(request: UniversalRequest): Promise<ApiResponse> {
    return this.updateBook(request);
  }

  async patchBookForUser(request: UniversalRequest): Promise<ApiResponse> {
    return this.patchBook(request);
  }

  private async executeBookUpdate(
    request: UniversalRequest,
    bookId: number,
    dto: UpdateBookDTO
  ): Promise<ApiResponse> {
    try {
      const updateInput = dto.toServiceInput();
      await emitHookEvent(EVENTS.BOOK.UPDATE.BEFORE, {
        user: this.mapRequestUser(request),
        bookId,
        input: updateInput,
      });

      const updated = await this.bookService.updateBook(
        bookId,
        updateInput,
        this.getUserContext(request)!
      );
      return this.createSuccessResponse(toBookResponseDTO(updated), this.t('common:book_updated'));
    } catch (error) {
      return this.handleBookServiceError(error);
    }
  }

  private mapRequestUser(request: UniversalRequest): { id: number; role?: string } | null {
    if (!request.user) {
      return null;
    }
    const user: { id: number; role?: string } = {
      id: request.user.id,
    };
    if (request.user.role) {
      user.role = request.user.role;
    }
    return user;
  }

  async deleteBookForUser(request: UniversalRequest): Promise<ApiResponse> {
    return this.deleteBook(request);
  }

  async searchByIsbnForUser(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    if (!request.user?.id) {
      return this.createErrorResponseI18n('errors:auth_required', 401);
    }

    return this.searchBooksByIsbn(request);
  }

  private getUserContext(request: UniversalRequest): BookUserContext | null {
    if (!request.user) {
      return null;
    }
    const context: BookUserContext = {
      userId: request.user.id,
    };
    if (request.user.role) {
      context.role = request.user.role;
    }
    return context;
  }

  private handleBookServiceError(error: unknown): ApiResponse {
    if (!(error instanceof BookServiceError)) {
      throw error;
    }

    switch (error.code) {
      case 'ISBN_EXISTS':
        return this.createErrorResponseI18n('errors:isbn_exists', 409);
      case 'BOOK_NOT_FOUND':
        return this.createErrorResponseI18n('errors:book_not_found', 404);
      case 'INVALID_AUTHOR_IDS':
        return this.createErrorResponseI18n('errors:invalid_author_ids', 400);
      case 'INVALID_CATEGORY_IDS':
        return this.createErrorResponseI18n('errors:invalid_category_ids', 400);
      case 'FORBIDDEN':
      default:
        return this.createErrorResponseI18n('errors:permission_denied', 403);
    }
  }

}
