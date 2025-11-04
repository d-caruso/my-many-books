// ================================================================
// src/controllers/BookController.ts
// ================================================================

import Joi from 'joi';
import { Op, WhereOptions } from 'sequelize';
import { BaseController } from './base/BaseController';
import { Author, Book, Category } from '../models';
import { ApiResponse } from '../common/ApiResponse';
import {
  BookCreationAttributes,
  BookAttributes,
  BookStatus,
  AuthorCreationAttributes,
} from '../models/interfaces/ModelInterfaces';
import { validateIsbn } from '../utils/isbn';
import { isbnService } from '../services/isbnService';
import { UniversalRequest } from '../types';
import { createModel, findOrCreateModel } from '../utils/sequelize-helpers';
import { BOOK_STATUS } from '../utils/constants';

interface CreateBookRequest {
  title: string;
  isbnCode: string;
  editionNumber?: number;
  editionDate?: string;
  status?: BookStatus;
  notes?: string;
  authorIds?: number[];
  categoryIds?: number[];
  userId?: number; // Stripped by validation, never used
}

interface BookSearchFilters {
  title?: string;
  isbnCode?: string;
  editionNumber?: number;
  editionDate?: string;
  status?: BookStatus;
  notes?: string;
  author?: string;
  category?: string;
  userId?: number;
}

/**
 * Controller for managing Book resources.
 * This class contains all the business logic for books,
 * independent of the web framework (Express, Lambda, etc.).
 */
export class BookController extends BaseController {
  private readonly createBookSchema = Joi.object<CreateBookRequest>({
    title: Joi.string().required().max(500).trim(),
    isbnCode: Joi.string()
      .required()
      .custom((value: string, helpers: Joi.CustomHelpers) =>
        this.validateIsbnField(value, helpers)
      ),
    editionNumber: Joi.number().integer().min(1).optional(),
    editionDate: Joi.date().iso().optional().allow(null),
    status: Joi.string()
      .valid(...Object.values(BOOK_STATUS))
      .optional()
      .allow(null),
    notes: Joi.string().optional().max(5000).trim(),
    authorIds: Joi.array().items(Joi.number().integer().positive()).optional(),
    categoryIds: Joi.array().items(Joi.number().integer().positive()).optional(),
    userId: Joi.any().strip(),
  });

  // PUT schema: Full update requires title (ISBN can't be changed)
  private readonly putBookSchema = this.createBookSchema.fork(['isbnCode'], schema =>
    schema.optional()
  );

  // PATCH schema: Partial update - all fields optional
  private readonly patchBookSchema = this.createBookSchema.fork(['isbnCode', 'title'], schema =>
    schema.optional()
  );

  private readonly searchFiltersSchema = Joi.object<BookSearchFilters>({
    title: Joi.string().required().max(200).trim(),
    isbnCode: Joi.string()
      .required()
      .custom((value: string, helpers: Joi.CustomHelpers) =>
        this.validateIsbnField(value, helpers)
      ),
    editionNumber: Joi.number().integer().min(1).optional(),
    editionDate: Joi.date().iso().optional().allow(null),
    status: Joi.string()
      .valid(...Object.values(BOOK_STATUS))
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
    return validation.normalizedIsbn as string;
  }

  /**
   * Creates a new book.
   * @param request The universal request object.
   * @returns An ApiResponse object with the newly created book or an error.
   */
  async createBook(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const body = this.parseBody<CreateBookRequest>(request);
    if (!body) {
      return this.createErrorResponseI18n('errors:request_body_required', 400);
    }

    const validation = this.validateRequest(body, this.createBookSchema);
    if (!validation.isValid) {
      return this.createErrorResponseI18n('errors:validation_failed', 400, undefined, validation.errors ? { errors: validation.errors } : undefined);
    }

    const bookData = validation.value!;
    const userId = request.user?.userId;

    // Check if book with ISBN already exists
    const whereClause: WhereOptions<BookAttributes> = {
      isbnCode: bookData.isbnCode,
    };
    if (userId) {
      Object.assign(whereClause, { userId });
    }

    const existingBook = await Book.findOne({ where: whereClause });
    if (existingBook) {
      return this.createErrorResponseI18n('errors:isbn_exists', 409, { isbn: bookData.isbnCode });
    }

    // Validate and link authors
    let authors: Author[] = [];
    if (bookData.authorIds && bookData.authorIds.length > 0) {
      authors = await Author.findAll({
        where: { id: bookData.authorIds },
        attributes: ['id'],
      });
      if (authors.length !== bookData.authorIds.length) {
        return this.createErrorResponseI18n('errors:invalid_author_ids', 400);
      }
    }

    // Validate and link categories
    let categories: Category[] = [];
    if (bookData.categoryIds && bookData.categoryIds.length > 0) {
      categories = await Category.findAll({
        where: { id: bookData.categoryIds },
        attributes: ['id'],
      });
      if (categories.length !== bookData.categoryIds.length) {
        return this.createErrorResponseI18n('errors:invalid_category_ids', 400);
      }
    }

    // Prepare book creation data
    const bookCreateData: BookCreationAttributes = {
      title: bookData.title,
      isbnCode: bookData.isbnCode,
      editionNumber: bookData.editionNumber,
      editionDate: bookData.editionDate ? new Date(bookData.editionDate) : undefined,
      status: bookData.status,
      notes: bookData.notes,
      userId,
    };

    const newBook = await createModel(Book, bookCreateData);

    // Associate authors and categories
    if (authors.length > 0) {
      await newBook.addAuthors(authors);
    }
    if (categories.length > 0) {
      await newBook.addCategories(categories);
    }

    // Fetch complete book with associations
    const createdBook = await this.getBookWithAssociations(newBook.id);

    return this.createSuccessResponse(createdBook, 'Book created successfully', undefined, 201);
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

    const whereClause: WhereOptions<BookAttributes> = {
      id: Number(bookId),
    };
    if (request.user) {
      Object.assign(whereClause, { userId: request.user.userId });
    }

    const book = await Book.findOne({
      where: whereClause,
      include: [
        { model: Author, as: 'authors', through: { attributes: [] } },
        { model: Category, as: 'categories', through: { attributes: [] } },
      ],
    });

    if (!book) {
      return this.createErrorResponseI18n('errors:book_not_found', 404);
    }

    // Convert Sequelize model to plain object to ensure associations are serialized
    return this.createSuccessResponse(book.get({ plain: true }));
  }

  /**
   * Updates an existing book.
   * @param request The universal request object.
   * @returns An ApiResponse object with the updated book or an error.
   */
  async updateBook(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const bookId = this.getPathParameter(request, 'id');
    if (!bookId || isNaN(Number(bookId))) {
      return this.createErrorResponseI18n('errors:valid_id_required', 400, { resource: 'book' });
    }

    const body = this.parseBody<Partial<CreateBookRequest>>(request);
    if (!body) {
      return this.createErrorResponseI18n('errors:request_body_required', 400);
    }

    const validation = this.validateRequest(body, this.putBookSchema);
    if (!validation.isValid) {
      return this.createErrorResponseI18n(
        'errors:validation_failed',
        400,
        undefined,
        validation.errors ? { errors: validation.errors } : undefined
      );
    }
    const bookData = validation.value!;

    const whereClause: WhereOptions<BookAttributes> = {
      id: Number(bookId),
    };
    if (request.user) {
      Object.assign(whereClause, { userId: request.user.userId });
    }

    const book = await Book.findOne({ where: whereClause });
    if (!book) {
      return this.createErrorResponseI18n('errors:book_not_found', 404);
    }

    const updateData: Partial<BookAttributes> = {
      title: bookData.title,
      editionNumber: bookData.editionNumber,
      editionDate:
        bookData.editionDate === null
          ? undefined
          : bookData.editionDate
            ? new Date(bookData.editionDate)
            : undefined,
      status: bookData.status,
      notes: bookData.notes,
    };

    await book.update(updateData);

    // Update associations if provided
    if (bookData.authorIds !== undefined) {
      // Validate author IDs
      let authors: Author[] = [];
      if (bookData.authorIds.length > 0) {
        authors = await Author.findAll({
          where: { id: bookData.authorIds },
        });
        if (authors.length !== bookData.authorIds.length) {
          return this.createErrorResponseI18n('errors:invalid_author_ids', 400);
        }
      }

      // Use setAuthors to replace all associations
      await book.setAuthors(authors);
    }

    if (bookData.categoryIds !== undefined) {
      // Validate category IDs
      let categories: Category[] = [];
      if (bookData.categoryIds.length > 0) {
        categories = await Category.findAll({
          where: { id: bookData.categoryIds },
        });
        if (categories.length !== bookData.categoryIds.length) {
          return this.createErrorResponseI18n('errors:invalid_category_ids', 400);
        }
      }

      // Use setCategories to replace all associations
      await book.setCategories(categories);
    }

    const updatedBook = await this.getBookWithAssociations(book.id);

    return this.createSuccessResponse(updatedBook, 'Book updated successfully');
  }

  /**
   * Partially updates an existing book (PATCH).
   * @param request The universal request object.
   * @returns An ApiResponse object with the updated book or an error.
   */
  async patchBook(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const bookId = this.getPathParameter(request, 'id');
    if (!bookId || isNaN(Number(bookId))) {
      return this.createErrorResponseI18n('errors:valid_id_required', 400, { resource: 'book' });
    }

    const body = this.parseBody<Partial<CreateBookRequest>>(request);
    if (!body) {
      return this.createErrorResponseI18n('errors:request_body_required', 400);
    }

    const validation = this.validateRequest(body, this.patchBookSchema);
    if (!validation.isValid) {
      return this.createErrorResponseI18n(
        'errors:validation_failed',
        400,
        undefined,
        validation.errors ? { errors: validation.errors } : undefined
      );
    }
    const bookData = validation.value!;

    const whereClause: WhereOptions<BookAttributes> = {
      id: Number(bookId),
    };
    if (request.user) {
      Object.assign(whereClause, { userId: request.user.userId });
    }

    const book = await Book.findOne({ where: whereClause });
    if (!book) {
      return this.createErrorResponseI18n('errors:book_not_found', 404);
    }

    // Only update fields that are provided
    const updateData: Partial<BookAttributes> = {};
    if (bookData.title !== undefined) updateData.title = bookData.title;
    if (bookData.editionNumber !== undefined) updateData.editionNumber = bookData.editionNumber;
    if (bookData.editionDate !== undefined) {
      updateData.editionDate =
        bookData.editionDate === null ? undefined : new Date(bookData.editionDate);
    }
    if (bookData.status !== undefined) updateData.status = bookData.status;
    if (bookData.notes !== undefined) updateData.notes = bookData.notes;

    await book.update(updateData);

    // Update associations only if provided
    if (bookData.authorIds !== undefined) {
      let authors: Author[] = [];
      if (bookData.authorIds.length > 0) {
        authors = await Author.findAll({
          where: { id: bookData.authorIds },
        });
        if (authors.length !== bookData.authorIds.length) {
          return this.createErrorResponseI18n('errors:invalid_author_ids', 400);
        }
      }
      await book.setAuthors(authors);
    }

    if (bookData.categoryIds !== undefined) {
      let categories: Category[] = [];
      if (bookData.categoryIds.length > 0) {
        categories = await Category.findAll({
          where: { id: bookData.categoryIds },
        });
        if (categories.length !== bookData.categoryIds.length) {
          return this.createErrorResponseI18n('errors:invalid_category_ids', 400);
        }
      }
      await book.setCategories(categories);
    }

    const updatedBook = await this.getBookWithAssociations(book.id);

    return this.createSuccessResponse(updatedBook, 'Book updated successfully');
  }

  /**
   * Deletes a book by its ID.
   * @param request The universal request object.
   * @returns A success message or an error.
   */
  async deleteBook(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const bookId = this.getPathParameter(request, 'id');
    if (!bookId || isNaN(Number(bookId))) {
      return this.createErrorResponseI18n('errors:valid_id_required', 400, { resource: 'book' });
    }

    const whereClause: WhereOptions<BookAttributes> = {
      id: Number(bookId),
    };
    if (request.user) {
      Object.assign(whereClause, { userId: request.user.userId });
    }

    const book = await Book.findOne({ where: whereClause });
    if (!book) {
      return this.createErrorResponseI18n('errors:book_not_found', 404);
    }

    await book.destroy();

    return this.createSuccessResponse(null, 'Book deleted successfully', undefined, 204);
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

    let searchFilters: BookSearchFilters = {};
    if (filters) {
      try {
        searchFilters = JSON.parse(filters) as BookSearchFilters;
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

    const whereConditions: WhereOptions<BookAttributes>[] = [];
    const includeClause = [];

    // Add user ID to the where clause if the user is authenticated
    if (request.user) {
      whereConditions.push({ userId: request.user.userId });
    }

    // Apply title filter
    if (searchFilters.title) {
      whereConditions.push({ title: { [Op.iLike]: `%${searchFilters.title}%` } });
    }

    // Apply ISBN filter
    if (searchFilters.isbnCode) {
      whereConditions.push({ isbnCode: searchFilters.isbnCode });
    }

    // Apply edition number filter
    if (searchFilters.editionNumber) {
      whereConditions.push({ editionNumber: searchFilters.editionNumber });
    }

    // Apply edition date filter
    if (searchFilters.editionDate) {
      whereConditions.push({ editionDate: searchFilters.editionDate });
    }

    // Apply notes filter
    if (searchFilters.notes) {
      whereConditions.push({ notes: { [Op.iLike]: `%${searchFilters.notes}%` } });
    }

    // Apply status filter
    if (searchFilters.status) {
      whereConditions.push({ status: searchFilters.status });
    }

    // Add author and category filters as includes
    if (searchFilters.author) {
      includeClause.push({
        model: Author,
        as: 'authors',
        through: { attributes: [] },
        where: {
          [Op.or]: [
            { name: { [Op.iLike]: `%${searchFilters.author}%` } },
            { surname: { [Op.iLike]: `%${searchFilters.author}%` } },
          ],
        },
      });
    }

    if (searchFilters.category) {
      includeClause.push({
        model: Category,
        as: 'categories',
        through: { attributes: [] },
        where: {
          name: { [Op.iLike]: `%${searchFilters.category}%` },
        },
      });
    }

    // Include authors and categories if requested
    if (includeAuthors && !searchFilters.author) {
      includeClause.push({ model: Author, as: 'authors', through: { attributes: [] } });
    }
    if (includeCategories && !searchFilters.category) {
      includeClause.push({ model: Category, as: 'categories', through: { attributes: [] } });
    }

    const whereClause = whereConditions.length > 0 ? { [Op.and]: whereConditions } : {};

    const { count, rows: books } = await Book.findAndCountAll({
      where: whereClause,
      include: includeClause,
      limit: pagination.limit,
      offset: pagination.offset,
      order: [['title', 'ASC']],
      distinct: true, // Required for correct counting with includes
    });

    // Convert Sequelize models to plain objects to ensure associations are serialized
    const plainBooks = books.map(book => book.get({ plain: true }));

    const meta = this.createPaginationMeta(pagination.page, pagination.limit, count);

    return this.createSuccessResponse(plainBooks, undefined, meta);
  }

  /**
   * Searches books by query string (title, author, or ISBN) with advanced filters.
   * @param request The universal request object.
   * @returns An ApiResponse with matching books.
   */
  async searchBooks(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const query = this.getQueryParameter(request, 'q');
    const status = this.getQueryParameter(request, 'status');
    const authorId = this.getQueryParameter(request, 'authorId');
    const categoryId = this.getQueryParameter(request, 'categoryId');
    const sortBy = this.getQueryParameter(request, 'sortBy') || 'title';
    const pagination = this.getPaginationParams(request);

    // Validate query length if provided
    if (query && query.length < 2) {
      return this.createErrorResponseI18n('errors:search_query_min_length', 400, { min: 2 });
    }

    // Build base where conditions
    const whereConditions: WhereOptions<BookAttributes>[] = [];

    // Add user ID filter if authenticated
    if (request.user) {
      whereConditions.push({ userId: request.user.userId });
    }

    // Add text search conditions (title and ISBN)
    if (query) {
      whereConditions.push({
        [Op.or]: [
          { title: { [Op.like]: `%${query}%` } },
          { isbnCode: { [Op.like]: `%${query}%` } },
        ],
      });
    }

    // Add status filter
    if (status) {
      whereConditions.push({ status: status as BookStatus });
    }

    const whereClause = whereConditions.length > 0 ? { [Op.and]: whereConditions } : {};

    // Build include clause for associations
    const includeClause: Array<Record<string, unknown>> = [];

    // Add author filter/include
    if (authorId) {
      includeClause.push({
        model: Author,
        as: 'authors',
        through: { attributes: [] },
        where: { id: Number(authorId) },
        required: true, // INNER JOIN to filter by author
      });
    } else {
      // Always include all authors for each book
      includeClause.push({
        model: Author,
        as: 'authors',
        through: { attributes: [] },
      });
    }

    // Add category filter/include
    if (categoryId) {
      includeClause.push({
        model: Category,
        as: 'categories',
        through: { attributes: [] },
        where: { id: Number(categoryId) },
        required: true, // INNER JOIN to filter by category
      });
    } else {
      // Always include all categories for each book
      includeClause.push({
        model: Category,
        as: 'categories',
        through: { attributes: [] },
      });
    }

    // Determine sort order
    let orderClause: [string, string][] = [['title', 'ASC']];
    switch (sortBy) {
      case 'creationDate':
      case 'createdAt':
        orderClause = [['creationDate', 'DESC']];
        break;
      case 'updateDate':
      case 'updatedAt':
        orderClause = [['updateDate', 'DESC']];
        break;
      case 'status':
        orderClause = [
          ['status', 'ASC'],
          ['title', 'ASC'],
        ];
        break;
      case 'title':
      default:
        orderClause = [['title', 'ASC']];
        break;
    }

    const { count, rows: books } = await Book.findAndCountAll({
      where: whereClause,
      include: includeClause,
      limit: pagination.limit,
      offset: pagination.offset,
      order: orderClause,
      distinct: true,
    });

    // Convert Sequelize models to plain objects to ensure associations are serialized
    const plainBooks = books.map(book => book.get({ plain: true }));

    // Return SearchResult format expected by frontend
    const searchResult = {
      books: plainBooks,
      total: count,
      hasMore: pagination.page * pagination.limit < count,
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
    const isbn = this.getQueryParameter(request, 'isbn');
    if (!isbn) {
      return this.createErrorResponseI18n('errors:isbn_parameter_required', 400);
    }

    const validation = validateIsbn(isbn);
    if (!validation.isValid) {
      return this.createErrorResponseI18n('errors:invalid_isbn', 400, { error: validation.error });
    }

    // Check local database first
    const localBook = await Book.findOne({
      where: { isbnCode: validation.normalizedIsbn },
      include: [
        { model: Author, as: 'authors', through: { attributes: [] } },
        { model: Category, as: 'categories', through: { attributes: [] } },
      ],
    });

    if (localBook) {
      return this.createSuccessResponse({
        source: 'local',
        book: localBook,
      });
    }

    // If not found locally, try ISBN service
    const result = await isbnService.lookupBook(validation.normalizedIsbn!);

    return this.createSuccessResponse({
      source: result.source,
      book: result.success ? result.book : null,
      error: result.success ? undefined : result.error,
    });
  }

  /**
   * Imports a book from an external ISBN service into the database.
   * @param request The universal request object.
   * @returns An ApiResponse with the imported book or an error.
   */
  async importBookFromIsbn(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const body = this.parseBody<{ isbn: string }>(request);
    if (!body?.isbn) {
      return this.createErrorResponseI18n('errors:isbn_not_provided', 400);
    }
    const userId = request.user?.userId;

    const validation = validateIsbn(body.isbn);
    if (!validation.isValid) {
      return this.createErrorResponseI18n('errors:invalid_isbn', 400, { error: validation.error });
    }

    // Check if book already exists for this user (if applicable)
    const whereClause: WhereOptions<BookAttributes> = {
      isbnCode: validation.normalizedIsbn,
    };
    if (userId) {
      Object.assign(whereClause, { userId });
    }
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
            },
            defaults: {
              name: authorData.name,
              surname: authorData.surname || '',
              nationality: authorData.nationality || null,
            } as AuthorCreationAttributes,
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
            where: { name: categoryData.name },
            defaults: { name: categoryData.name },
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
      status: (bookData as BookCreationAttributes).status,
      notes: (bookData as BookCreationAttributes).notes,
      userId, // Associate with user if authenticated
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
      'Book imported successfully',
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
  private async getBookWithAssociations(id: number): Promise<Book | null> {
    const book = await Book.findByPk(id, {
      include: [
        { model: Author, as: 'authors', through: { attributes: [] } },
        { model: Category, as: 'categories', through: { attributes: [] } },
      ],
    });

    // Ensure the book data includes associations in JSON serialization
    if (book) {
      return book.get({ plain: true }) as unknown as Book;
    }
    return null;
  }

  // User-specific methods for route compatibility
  async getUserBooks(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    if (!request.user?.userId) {
      return this.createErrorResponseI18n('errors:auth_required', 401);
    }

    const modifiedRequest = {
      ...request,
      queryStringParameters: {
        ...request.queryStringParameters,
        userId: request.user.userId.toString(),
      },
    };

    return this.listBooks(modifiedRequest);
  }

  async getBookById(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    if (!request.user?.userId) {
      return this.createErrorResponseI18n('errors:auth_required', 401);
    }

    return this.getBook(request);
  }

  async createBookForUser(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    if (!request.user?.userId) {
      return this.createErrorResponseI18n('errors:auth_required', 401);
    }

    // Add userId to the request body
    const body = this.parseBody(request) as Record<string, unknown>;
    if (body) {
      body['userId'] = request.user.userId;
      request.body = JSON.stringify(body);
    }

    return this.createBook(request);
  }

  async updateBookForUser(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    if (!request.user?.userId) {
      return this.createErrorResponseI18n('errors:auth_required', 401);
    }

    return this.updateBook(request);
  }

  async patchBookForUser(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    if (!request.user?.userId) {
      return this.createErrorResponseI18n('errors:auth_required', 401);
    }

    return this.patchBook(request);
  }

  async deleteBookForUser(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    if (!request.user?.userId) {
      return this.createErrorResponseI18n('errors:auth_required', 401);
    }

    return this.deleteBook(request);
  }

  async searchByIsbnForUser(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    if (!request.user?.userId) {
      return this.createErrorResponseI18n('errors:auth_required', 401);
    }

    return this.searchBooksByIsbn(request);
  }
}

export const bookController = new BookController();
