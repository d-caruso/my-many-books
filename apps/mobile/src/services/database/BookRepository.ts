import { LocalBook } from '@/entities/LocalBook';
import { databaseService } from './DatabaseService';
import type { Book } from '@my-many-books/shared-types';
import { SyncStatus, SYNC_STATUS } from '@/types';
import type { SQLiteBindValue } from 'expo-sqlite';
import { SORT_DIRECTIONS } from '@my-many-books/shared-types';
import { DB_SORT_FIELDS } from '@/constants/db';
import type { DbSortField } from '@/constants/db';

// Counter to ensure unique IDs even when Date.now() returns same value
let idCounter = 0;

export class BookRepository {
  /**
   * Find all books (excluding deleted)
   */
  async findAll(): Promise<LocalBook[]> {
    const books = await databaseService.getAllAsync(
      'SELECT * FROM books WHERE deleted = 0 ORDER BY update_date DESC'
    );
    return books.map(this.mapRowToBook);
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

      // Handle author relationships
      if (entity.authors) {
        await this.createAuthorRelationships(id, entity.authors as (string | { name: string })[]);
      }

      // Handle category relationships
      if (entity.categories) {
        await this.createCategoryRelationships(id, entity.categories as (string | { name: string })[]);
      }

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
        now,
        book.serverId,
        book.syncStatus,
        book.serverUpdatedAt,
        id,
      ]
    );

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
    
    if (existingBook) {
      const existingEntity = existingBook.entity;

      // Book exists - update it
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
          Array.isArray(entity.authors) ? JSON.stringify(entity.authors) : entity.authors || existingEntity.authors,
          entity.isbnCode || existingEntity.isbnCode,
          //TODO commented out fields that are not currently set in the API/DB but may be relevant for future features
          //entity.thumbnail || existingEntity.thumbnail,
          //entity.description || existingEntity.description,
          //entity.publishedDate || existingEntity.publishedDate,
          //entity.pageCount || existingEntity.pageCount,
          //entity.rating || existingEntity.rating,
          entity.status || existingEntity.status,
          entity.notes || existingEntity.notes,
          entity.userId || existingEntity.userId,
          entity.updateDate || now,
          book.syncStatus || existingBook.syncStatus,
          book.serverUpdatedAt || existingBook.serverUpdatedAt,
          bookId,
        ]
      );
    } else {
      // Book doesn't exist - create it
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
          //TODO commented out fields that are not currently set in the API/DB but may be relevant for future features
          //book.thumbnail || null,
          //book.description || null,
          //book.publishedDate || null,
          //book.pageCount || null,
          //book.rating || null,
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
    return books.map(this.mapRowToBook);
  }

  /**
   * Advanced search with filters and sorting
   */
  async searchWithFilters(options: {
    query?: string;
    status?: string;
    author?: string;
    category?: string;
    sortBy?: DbSortField;
    sortOrder?: typeof SORT_DIRECTIONS[keyof typeof SORT_DIRECTIONS];
  }): Promise<LocalBook[]> {
    const { query, status, author, category, sortBy = DB_SORT_FIELDS.UPDATE_DATE, sortOrder = SORT_DIRECTIONS.DESC } = options;

    let sql = 'SELECT DISTINCT b.* FROM books b';
    let joins = '';
    const params: SQLiteBindValue[] = [];
    const whereConditions = ['b.deleted = 0'];

    // Add joins if filtering by author or category
    if (author || category) {
      if (author) {
        joins += ' LEFT JOIN book_authors ba ON b.id = ba.book_id LEFT JOIN authors a ON ba.author_id = a.id';
      }
      if (category) {
        joins += ' LEFT JOIN book_categories bc ON b.id = bc.book_id LEFT JOIN categories c ON bc.category_id = c.id';
      }
    }

    sql += joins + ' WHERE ' + whereConditions.join(' AND ');

    // Add search condition
    if (query && query.trim()) {
      sql += ' AND (b.title LIKE ? OR b.authors LIKE ? OR b.description LIKE ?)';
      const searchTerm = `%${query.trim()}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // Add status filter
    if (status) {
      sql += ' AND b.status = ?';
      params.push(status);
    }

    // Add author filter
    if (author) {
      sql += ' AND a.name LIKE ?';
      params.push(`%${author}%`);
    }

    // Add category filter
    if (category) {
      sql += ' AND c.name LIKE ?';
      params.push(`%${category}%`);
    }

    // Add sorting
    sql += ` ORDER BY b.${sortBy} ${sortOrder}`;

    const books = await databaseService.getAllAsync(sql, params);
    return books.map(this.mapRowToBook);
  }

  /**
   * Find pending sync operations
   */
  async findPendingSync(): Promise<LocalBook[]> {
    const books = await databaseService.getAllAsync(
      'SELECT * FROM books WHERE sync_status IN (?, ?) ORDER BY update_date DESC',
      [SYNC_STATUS.PENDING, SYNC_STATUS.FAILED]
    );
    return books.map(this.mapRowToBook);
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
      authors: row.authors as Book['authors'],
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


  /**
   * Create author relationships for a book (Phase 4 fix)
   */
  private async createAuthorRelationships(bookId: string, authors: (string | { name: string })[]): Promise<void> {
    if (!authors) return;
    
    // Handle different author formats (string, array of strings, array of objects)
    const authorNames = Array.isArray(authors) 
      ? authors.map(a => typeof a === 'string' ? a : a.name).filter(Boolean)
      : typeof authors === 'string' 
        ? [authors]
        : [];

    for (const authorName of authorNames) {
      // Insert or get author
      const authorResult = await databaseService.getFirstAsync(
        'SELECT id FROM authors WHERE name = ?',
        [authorName]
      );
      
      let authorId;
      if (!authorResult) {
        // Create new author - let SQLite auto-generate INTEGER id
        const result = await databaseService.executeQuery(
          'INSERT INTO authors (name) VALUES (?)',
          [authorName]
        );
        authorId = result.lastInsertRowId;
      } else {
        authorId = authorResult.id;
      }

      // Create book-author relationship
      await databaseService.executeQuery(
        'INSERT OR IGNORE INTO book_authors (book_id, author_id) VALUES (?, ?)',
        [bookId, authorId]
      );
    }
  }

  private serializeText(value: unknown): string | null {
    if (value == null) return null;
    if (typeof value === 'string') return value;
    return JSON.stringify(value);
  }

  /**
   * Create category relationships for a book (Phase 4 fix)
   */
  private async createCategoryRelationships(bookId: string, categories: (string | { name: string })[]): Promise<void> {
    if (!categories) return;
    
    // Handle different category formats
    const categoryNames = Array.isArray(categories)
      ? categories.map(c => typeof c === 'string' ? c : c.name).filter(Boolean)
      : typeof categories === 'string'
        ? [categories]
        : [];

    for (const categoryName of categoryNames) {
      // Insert or get category
      const categoryResult = await databaseService.getFirstAsync(
        'SELECT id FROM categories WHERE name = ?',
        [categoryName]
      );
      
      let categoryId;
      if (!categoryResult) {
        // Create new category - let SQLite auto-generate INTEGER id
        const result = await databaseService.executeQuery(
          'INSERT INTO categories (name) VALUES (?)',
          [categoryName]
        );
        categoryId = result.lastInsertRowId;
      } else {
        categoryId = categoryResult.id;
      }

      // Create book-category relationship
      await databaseService.executeQuery(
        'INSERT OR IGNORE INTO book_categories (book_id, category_id) VALUES (?, ?)',
        [bookId, categoryId]
      );
    }
  }
}

export const bookRepository = new BookRepository();
