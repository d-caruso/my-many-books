import { LocalBook } from '@/entities/LocalBook';
import { databaseService } from './DatabaseService';
import {
  SEARCH_SORT_BY_FIELDS,
  SORT_DIRECTIONS,
  type Author,
  type Book,
  type Category,
  type SearchFilters,
} from '@my-many-books/shared-types';
import { SyncStatus, SYNC_STATUS } from '@/types';
import type { SQLiteBindValue } from 'expo-sqlite';
import { authorRepository } from './AuthorRepository';
import { categoryRepository } from './CategoryRepository';

// Counter to ensure unique IDs even when Date.now() returns same value
let idCounter = 0;

type OfflineSearchOptions = Pick<
  SearchFilters,
  'query' | 'status' | 'authorId' | 'categoryId' | 'sortBy' | 'sortOrder'
>;

type AuthorInput = Pick<Author, 'name' | 'surname'> & Partial<Pick<Author, 'nationality'>>;
type CategoryInput = Pick<Category, 'name'> & Partial<Pick<Category, 'translationKey'>>;

export class BookRepository {
  /**
   * Find all books (excluding deleted)
   */
  async findAll(): Promise<LocalBook[]> {
    const books = await databaseService.getAllAsync(
      'SELECT * FROM books WHERE deleted = 0 ORDER BY update_date DESC'
    );
    return books.map((book) => this.mapRowToBook(book));
  }

  /**
   * Find book by ID
   */
  async findById(id: string): Promise<LocalBook | null> {
    const book = await databaseService.getFirstAsync(
      'SELECT * FROM books WHERE id = ? AND deleted = 0',
      [id]
    );
    return book ? this.mapRowToBook(book) : null;
  }

  /**
   * Find book by server ID (Phase 5)
   */
  async findByServerId(serverId: number): Promise<LocalBook | null> {
    const book = await databaseService.getFirstAsync(
      'SELECT * FROM books WHERE server_id = ? AND deleted = 0',
      [serverId]
    );
    return book ? this.mapRowToBook(book) : null;
  }

  /**
   * Create new book
   */
  async create(book: LocalBook): Promise<LocalBook> {
    const entity = book.entity;
    const id = entity?.id?.toString() || book.tempId || `temp-${Date.now()}-${idCounter++}`;
    const now = new Date().toISOString();

    // Start transaction for atomic book + relations creation
    await databaseService.executeQuery('BEGIN TRANSACTION');

    try {
      // Insert main book record
      await databaseService.executeQuery(
        `INSERT INTO books (
          id, title, authors, isbn, thumbnail, description, published_date,
          page_count, rating, status, notes, user_id, creation_date, update_date,
          server_id, sync_status, temp_id, deleted, server_updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          entity.title || '',
          this.serializeText(entity.authors),
          entity.isbnCode || null,
          null,                                           // thumbnail (not yet in API)
          null,                                           // description (not yet in API)
          null,                                           // published_date (not yet in API)
          null,                                           // page_count (not yet in API)
          (entity as Record<string, unknown>).rating as number | null ?? null,
          entity.status || 'want-to-read',
          entity.notes || null,
          entity.userId || null,
          entity.creationDate || now,
          entity.updateDate || now,
          book.serverId || null,
          book.syncStatus || SYNC_STATUS.SYNCED,
          book.tempId || null,
          book.deleted ? 1 : 0,
          book.serverUpdatedAt || null,
        ]
      );

      await this.syncAuthorRelationships(id, entity.authors);
      await this.syncCategoryRelationships(id, entity.categories);

      await databaseService.executeQuery('COMMIT');
    } catch (error) {
      await databaseService.executeQuery('ROLLBACK');
      throw error;
    }

    const created = await this.findById(id);
    if (!created) {
      throw new Error('Failed to create book');
    }
    return created;
  }

  /**
   * Update book
   */
  async update(id: string, book: LocalBook): Promise<LocalBook> {
    const now = new Date().toISOString();
    const entity = book.entity;

    await databaseService.executeQuery('BEGIN TRANSACTION');

    try {
      await databaseService.executeQuery(
        `UPDATE books SET
          title = COALESCE(?, title),
          authors = COALESCE(?, authors),
          status = COALESCE(?, status),
          rating = COALESCE(?, rating),
          notes = COALESCE(?, notes),
          update_date = ?,
          server_id = COALESCE(?, server_id),
          sync_status = COALESCE(?, sync_status),
          server_updated_at = COALESCE(?, server_updated_at)
        WHERE id = ?`,
        [
          entity.title,
          this.serializeText(entity.authors),
          entity.status,
          (entity as Record<string, unknown>).rating as number | null ?? null,
          entity.notes,
          entity.updateDate || now,
          book.serverId,
          book.syncStatus,
          book.serverUpdatedAt,
          id,
        ]
      );

      if (entity.authors !== undefined) {
        await this.syncAuthorRelationships(id, entity.authors, true);
      }

      if (entity.categories !== undefined) {
        await this.syncCategoryRelationships(id, entity.categories, true);
      }

      await databaseService.executeQuery('COMMIT');
    } catch (error) {
      await databaseService.executeQuery('ROLLBACK');
      throw error;
    }

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Failed to update book');
    }
    return updated;
  }

  /**
   * Delete book (soft delete)
   */
  async delete(id: string): Promise<void> {
    await databaseService.executeQuery(
      'UPDATE books SET deleted = 1, sync_status = ? WHERE id = ?',
      [SYNC_STATUS.PENDING, id]
    );
  }

  /**
   * Replace temporary ID with server ID (Phase 5 - Critical Fix)
   * This is needed after successful CREATE operations to replace temp ID with server ID
   * 
   * 1. Copy all data from temp record
   * 2. Insert new record with server ID as primary key
   * 3. Update foreign key references
   * 4. Delete temp record
   */
  async replaceTempIdWithServerId(tempId: string, serverId: number): Promise<void> {
    const serverIdStr = serverId.toString();
    
    // Start transaction for atomicity
    await databaseService.executeQuery('BEGIN TRANSACTION');
    
    try {
      // 1. Get the temp record data
      const tempRecord = await databaseService.getFirstAsync<Record<string, SQLiteBindValue>>(
        'SELECT * FROM books WHERE id = ?',
        [tempId]
      );
      
      if (!tempRecord) {
        throw new Error(`Temp record not found: ${tempId}`);
      }

      // 2. Insert new record with server ID, copying all data except id
      await databaseService.executeQuery(
        `INSERT INTO books (
          id, title, authors, isbn, thumbnail, description, published_date,
          page_count, rating, status, notes, user_id, creation_date, update_date,
          server_id, sync_status, temp_id, deleted, server_updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          serverIdStr,           // Use server ID as primary key
          tempRecord.title,
          tempRecord.authors,
          tempRecord.isbn,
          tempRecord.thumbnail,
          tempRecord.description,
          tempRecord.published_date,
          tempRecord.page_count,
          tempRecord.rating,
          tempRecord.status,
          tempRecord.notes,
          tempRecord.user_id,
          tempRecord.creation_date,
          new Date().toISOString(), // Update the update_date
          serverId,              // Set server_id 
          SYNC_STATUS.SYNCED,    // Mark as synced
          tempId,                // Keep reference to original temp_id
          0,                     // Not deleted
          new Date().toISOString() // Server updated at
        ]
      );

      // 3. Update foreign key references in book_authors table
      await databaseService.executeQuery(
        'UPDATE book_authors SET book_id = ? WHERE book_id = ?',
        [serverIdStr, tempId]
      );

      // 4. Update foreign key references in book_categories table  
      await databaseService.executeQuery(
        'UPDATE book_categories SET book_id = ? WHERE book_id = ?',
        [serverIdStr, tempId]
      );

      // 5. Delete the temp record
      await databaseService.executeQuery(
        'DELETE FROM books WHERE id = ?',
        [tempId]
      );

      // Commit transaction
      await databaseService.executeQuery('COMMIT');
      
      console.log(`Successfully replaced temp ID ${tempId} with server ID ${serverId}`);
      
    } catch (error) {
      // Rollback on error
      await databaseService.executeQuery('ROLLBACK');
      console.error(`Failed to replace temp ID ${tempId} with server ID ${serverId}:`, error);
      throw error;
    }
  }

  /**
   * Find book by ID or temp ID mapping (Phase 5 - Critical Fix)
   * 
   * This method handles the case where:
   * 1. Book was created offline with temp ID
   * 2. CREATE operation completed, replacing temp ID with server ID
   * 3. Subsequent UPDATE/DELETE operations still reference the old temp ID
   * 
   * Strategy:
   * 1. Try to find by direct ID lookup
   * 2. If not found, check if this ID is a temp ID with a mapping
   * 3. If mapping exists, find by server ID
   */
  async findByIdOrMapping(id: string): Promise<LocalBook | null> {
    // First try direct lookup
    let book = await this.findById(id);
    if (book) {
      return book;
    }

    // If not found and this looks like a temp ID, check for mapping
    if (id.startsWith('temp-')) {
      try {
        // Check if there's an ID mapping for this temp ID
        const mapping = await databaseService.getFirstAsync(
          'SELECT server_id FROM id_mappings WHERE temp_id = ?',
          [id]
        );

        if (mapping?.server_id) {
          // Try to find by server ID (as string)
          book = await this.findById(mapping.server_id.toString());
          if (book) {
            console.log(`Found book via temp ID mapping: ${id} → ${mapping.server_id}`);
            return book;
          }
        }
      } catch (error) {
        console.error(`Error looking up temp ID mapping for ${id}:`, error);
      }
    }

    return null;
  }

  /**
   * Permanently delete book
   */
  async hardDelete(id: string): Promise<void> {
    await databaseService.executeQuery('DELETE FROM books WHERE id = ?', [id]);
  }

  /**
   * Update sync-related fields for a book
   */
  async updateSyncFields(id: string, fields: {
    serverUpdatedAt?: string;
    syncStatus?: SyncStatus;
  }): Promise<void> {
    const updates: string[] = [];
    const values: SQLiteBindValue[] = [];

    if (fields.serverUpdatedAt !== undefined) {
      updates.push('server_updated_at = ?');
      values.push(fields.serverUpdatedAt);
    }

    if (fields.syncStatus !== undefined) {
      updates.push('sync_status = ?');
      values.push(fields.syncStatus);
    }

    if (updates.length > 0) {
      values.push(id);
      await databaseService.executeQuery(
        `UPDATE books SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
    }
  }

  /**
   * Upsert book - insert if not exists, update if exists (Task 4.5)
   * This prevents PRIMARY KEY conflicts during server sync
   */
  async upsert(book: LocalBook): Promise<LocalBook> {
    const entity = book.entity;
    const bookId = entity.id?.toString();
    if (!bookId) {
      throw new Error('Book ID is required for upsert operation');
    }

    // Check if book exists
    const existingBook = await this.findById(bookId);
    
    await databaseService.executeQuery('BEGIN TRANSACTION');

    try {
      if (existingBook) {
        const existingEntity = existingBook.entity;
        const now = new Date().toISOString();

        await databaseService.executeQuery(
          `UPDATE books SET
            title = ?,
            authors = ?,
            isbn = ?,
            thumbnail = ?,
            description = ?,
            published_date = ?,
            page_count = ?,
            rating = ?,
            status = ?,
            notes = ?,
            user_id = ?,
            update_date = ?,
            sync_status = ?,
            server_updated_at = ?
          WHERE id = ?`,
          [
            entity.title || existingEntity.title,
            this.serializeText(entity.authors ?? existingEntity.authors),
            entity.isbnCode || existingEntity.isbnCode,
            null,
            null,
            null,
            null,
            (entity as Record<string, unknown>).rating as number | null ??
              (existingEntity as Record<string, unknown>).rating as number | null ??
              null,
            entity.status || existingEntity.status,
            entity.notes ?? existingEntity.notes ?? null,
            entity.userId || existingEntity.userId || null,
            entity.updateDate || now,
            book.syncStatus || existingBook.syncStatus,
            book.serverUpdatedAt || existingBook.serverUpdatedAt,
            bookId,
          ]
        );
      } else {
        const now = new Date().toISOString();

        await databaseService.executeQuery(
          `INSERT INTO books (
            id, title, authors, isbn, thumbnail, description, published_date,
            page_count, rating, status, notes, user_id, creation_date, update_date,
            sync_status, temp_id, deleted, server_updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            bookId,
            entity.title || '',
            this.serializeText(entity.authors),
            entity.isbnCode || null,
            null,
            null,
            null,
            null,
            (entity as Record<string, unknown>).rating as number | null ?? null,
            entity.status || 'want-to-read',
            entity.notes || null,
            entity.userId || null,
            entity.creationDate || now,
            entity.updateDate || now,
            book.syncStatus || SYNC_STATUS.SYNCED,
            book.tempId || null,
            book.deleted ? 1 : 0,
            book.serverUpdatedAt || null,
          ]
        );
      }

      if (entity.authors !== undefined) {
        await this.syncAuthorRelationships(bookId, entity.authors, true);
      }

      if (entity.categories !== undefined) {
        await this.syncCategoryRelationships(bookId, entity.categories, true);
      }

      await databaseService.executeQuery('COMMIT');
    } catch (error) {
      await databaseService.executeQuery('ROLLBACK');
      throw error;
    }

    const result = await this.findById(bookId);
    if (!result) {
      throw new Error('Failed to upsert book');
    }
    return result;
  }

  /**
   * Find books by status
   */
  async findByStatus(status: string): Promise<LocalBook[]> {
    const books = await databaseService.getAllAsync(
      'SELECT * FROM books WHERE deleted = 0 AND status = ? ORDER BY update_date DESC',
      [status]
    );
    return books.map((book) => this.mapRowToBook(book));
  }

  /**
   * Advanced search with filters and sorting
   */
  async searchWithFilters(options: OfflineSearchOptions = {}): Promise<LocalBook[]> {
    const {
      query,
      status,
      authorId,
      categoryId,
      sortBy = SEARCH_SORT_BY_FIELDS.UPDATE_DATE,
      sortOrder = SORT_DIRECTIONS.DESC,
    } = options;

    let sql = 'SELECT DISTINCT b.* FROM books b';
    const joins: string[] = [];
    const params: SQLiteBindValue[] = [];
    const whereConditions = ['b.deleted = 0'];

    if (authorId) {
      joins.push('INNER JOIN book_authors ba_filter ON b.id = ba_filter.book_id');
      whereConditions.push('ba_filter.author_id = ?');
      params.push(authorId);
    }

    if (categoryId) {
      joins.push('INNER JOIN book_categories bc_filter ON b.id = bc_filter.book_id');
      whereConditions.push('bc_filter.category_id = ?');
      params.push(categoryId);
    }

    if (joins.length > 0) {
      sql += ` ${joins.join(' ')}`;
    }

    if (query && query.trim()) {
      const searchTerm = `%${query.trim()}%`;
      whereConditions.push(`(
        b.title LIKE ? COLLATE NOCASE
        OR COALESCE(b.authors, '') LIKE ? COLLATE NOCASE
        OR COALESCE(b.description, '') LIKE ? COLLATE NOCASE
        OR EXISTS (
          SELECT 1
          FROM book_authors ba_search
          INNER JOIN authors a_search ON a_search.id = ba_search.author_id
          WHERE ba_search.book_id = b.id
            AND (
              a_search.name LIKE ? COLLATE NOCASE
              OR a_search.surname LIKE ? COLLATE NOCASE
              OR TRIM(a_search.name || ' ' || a_search.surname) LIKE ? COLLATE NOCASE
              OR TRIM(a_search.surname || ' ' || a_search.name) LIKE ? COLLATE NOCASE
            )
        )
      )`);
      params.push(
        searchTerm,
        searchTerm,
        searchTerm,
        searchTerm,
        searchTerm,
        searchTerm,
        searchTerm
      );
    }

    if (status) {
      whereConditions.push('b.status = ?');
      params.push(status);
    }

    sql += ` WHERE ${whereConditions.join(' AND ')}`;
    sql += this.buildSortClause(sortBy, sortOrder);

    const books = await databaseService.getAllAsync(sql, params);
    return books.map((book) => this.mapRowToBook(book));
  }

  /**
   * Find pending sync operations
   */
  async findPendingSync(): Promise<LocalBook[]> {
    const books = await databaseService.getAllAsync(
      'SELECT * FROM books WHERE sync_status IN (?, ?) ORDER BY update_date DESC',
      [SYNC_STATUS.PENDING, SYNC_STATUS.FAILED]
    );
    return books.map((book) => this.mapRowToBook(book));
  }

  /**
   * Map database row to LocalBook object
   */
  private mapRowToBook(row: Record<string, unknown>): LocalBook {
    const book = {
      id: row.id as number,
      isbnCode: row.isbn as string,
      title: row.title as string,
      status: row.status as Book['status'],
      notes: row.notes as string | null,
      userId: row.user_id as number,
      authors: this.deserializeAuthors(row.authors),
      categories: row.categories as Book['categories'],
      creationDate: row.creation_date as string,
      updateDate: row.update_date as string,
      rating: row.rating as number | null | undefined,
    } as Book;
    const local = new LocalBook(book);
    local.serverId = row.server_id as number | undefined;
    local.syncStatus = (row.sync_status as SyncStatus) ?? SYNC_STATUS.SYNCED;
    local.tempId = row.temp_id as string | undefined;
    local.deleted = row.deleted === 1;
    local.serverUpdatedAt = row.server_updated_at as string | undefined;
    return local;
  }

  async search(query: string): Promise<LocalBook[]> {
    return this.searchWithFilters({ query });
  }

  private serializeText(value: unknown): string | null {
    if (value == null) return null;
    if (typeof value === 'string') return value;
    return JSON.stringify(value);
  }

  private buildSortClause(
    sortBy: OfflineSearchOptions['sortBy'],
    sortOrder: OfflineSearchOptions['sortOrder']
  ): string {
    const direction = sortOrder === SORT_DIRECTIONS.ASC ? SORT_DIRECTIONS.ASC : SORT_DIRECTIONS.DESC;

    switch (sortBy) {
      case SEARCH_SORT_BY_FIELDS.TITLE:
        return ` ORDER BY LOWER(b.title) ${direction}, b.update_date DESC`;
      case SEARCH_SORT_BY_FIELDS.STATUS:
        return ` ORDER BY b.status ${direction}, LOWER(b.title) ASC`;
      case SEARCH_SORT_BY_FIELDS.CREATION_DATE:
        return ` ORDER BY b.creation_date ${direction}, LOWER(b.title) ASC`;
      case SEARCH_SORT_BY_FIELDS.AUTHOR: {
        const surnameExpr = `LOWER(COALESCE((
          SELECT a_sort.surname
          FROM book_authors ba_sort
          INNER JOIN authors a_sort ON a_sort.id = ba_sort.author_id
          WHERE ba_sort.book_id = b.id
          ORDER BY LOWER(a_sort.surname) ${direction}, LOWER(a_sort.name) ${direction}, a_sort.id ${direction}
          LIMIT 1
        ), ''))`;
        const nameExpr = `LOWER(COALESCE((
          SELECT a_sort.name
          FROM book_authors ba_sort
          INNER JOIN authors a_sort ON a_sort.id = ba_sort.author_id
          WHERE ba_sort.book_id = b.id
          ORDER BY LOWER(a_sort.surname) ${direction}, LOWER(a_sort.name) ${direction}, a_sort.id ${direction}
          LIMIT 1
        ), ''))`;

        return ` ORDER BY ${surnameExpr} ${direction}, ${nameExpr} ${direction}, LOWER(b.title) ASC`;
      }
      case SEARCH_SORT_BY_FIELDS.UPDATE_DATE:
      default:
        return ` ORDER BY b.update_date ${direction}, LOWER(b.title) ASC`;
    }
  }

  private deserializeAuthors(value: unknown): Book['authors'] {
    if (Array.isArray(value)) {
      return value as Book['authors'];
    }

    if (typeof value !== 'string' || !value.trim()) {
      return undefined;
    }

    try {
      return JSON.parse(value) as Book['authors'];
    } catch {
      return [{ id: 0, name: value, surname: '' }];
    }
  }

  private normalizeAuthorsInput(authors: unknown): AuthorInput[] {
    if (!authors) {
      return [];
    }

    if (typeof authors === 'string') {
      return authors.trim() ? [{ name: authors.trim(), surname: '' }] : [];
    }

    if (!Array.isArray(authors)) {
      return [];
    }

    return authors
      .map((author) => {
        if (typeof author === 'string') {
          return author.trim() ? { name: author.trim(), surname: '' } : null;
        }

        if (!author || typeof author !== 'object') {
          return null;
        }

        const authorRecord = author as {
          name?: unknown;
          surname?: unknown;
          nationality?: unknown;
        };
        const name = typeof authorRecord.name === 'string' ? authorRecord.name.trim() : '';
        const surname =
          typeof authorRecord.surname === 'string' ? authorRecord.surname.trim() : '';
        const nationality =
          typeof authorRecord.nationality === 'string' ? authorRecord.nationality : undefined;

        if (!name) {
          return null;
        }

        return { name, surname, nationality };
      })
      .filter(this.isDefined);
  }

  private normalizeCategoriesInput(categories: unknown): CategoryInput[] {
    if (!categories) {
      return [];
    }

    if (typeof categories === 'string') {
      return categories.trim() ? [{ name: categories.trim() }] : [];
    }

    if (!Array.isArray(categories)) {
      return [];
    }

    return categories
      .map((category) => {
        if (typeof category === 'string') {
          return category.trim() ? { name: category.trim() } : null;
        }

        if (!category || typeof category !== 'object') {
          return null;
        }

        const categoryRecord = category as {
          name?: unknown;
          translationKey?: unknown;
        };
        const name = typeof categoryRecord.name === 'string' ? categoryRecord.name.trim() : '';
        const translationKey =
          typeof categoryRecord.translationKey === 'string'
            ? categoryRecord.translationKey
            : undefined;

        if (!name) {
          return null;
        }

        return { name, translationKey };
      })
      .filter(this.isDefined);
  }

  private isDefined<T>(value: T | null): value is T {
    return value !== null;
  }

  private async syncAuthorRelationships(
    bookId: string,
    authors: unknown,
    replaceExisting: boolean = false
  ): Promise<void> {
    if (replaceExisting) {
      await databaseService.executeQuery('DELETE FROM book_authors WHERE book_id = ?', [bookId]);
    }

    const normalizedAuthors = this.normalizeAuthorsInput(authors);

    for (const author of normalizedAuthors) {
      const localAuthor = await authorRepository.create(author);
      await databaseService.executeQuery(
        'INSERT OR IGNORE INTO book_authors (book_id, author_id) VALUES (?, ?)',
        [bookId, localAuthor.entity.id]
      );
    }
  }

  private async syncCategoryRelationships(
    bookId: string,
    categories: unknown,
    replaceExisting: boolean = false
  ): Promise<void> {
    if (replaceExisting) {
      await databaseService.executeQuery('DELETE FROM book_categories WHERE book_id = ?', [bookId]);
    }

    const normalizedCategories = this.normalizeCategoriesInput(categories);

    for (const category of normalizedCategories) {
      const localCategory = await categoryRepository.create(
        category.name,
        category.translationKey ?? null
      );
      await databaseService.executeQuery(
        'INSERT OR IGNORE INTO book_categories (book_id, category_id) VALUES (?, ?)',
        [bookId, localCategory.entity.id]
      );
    }
  }
}

export const bookRepository = new BookRepository();
