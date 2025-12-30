import { databaseService } from './DatabaseService';
import type { Book } from '@/types';

// Counter to ensure unique IDs even when Date.now() returns same value
let idCounter = 0;

export class BookRepository {
  /**
   * Find all books (excluding deleted)
   */
  async findAll(): Promise<Book[]> {
    const books = await databaseService.getAllAsync(
      'SELECT * FROM books WHERE _deleted = 0 ORDER BY update_date DESC'
    );
    return books.map(this.mapRowToBook);
  }

  /**
   * Find book by ID
   */
  async findById(id: string): Promise<Book | null> {
    const book = await databaseService.getFirstAsync(
      'SELECT * FROM books WHERE id = ? AND _deleted = 0',
      [id]
    );
    return book ? this.mapRowToBook(book) : null;
  }

  /**
   * Find book by server ID (Phase 5)
   */
  async findByServerId(serverId: number): Promise<Book | null> {
    const book = await databaseService.getFirstAsync(
      'SELECT * FROM books WHERE server_id = ? AND _deleted = 0',
      [serverId]
    );
    return book ? this.mapRowToBook(book) : null;
  }

  /**
   * Create new book
   */
  async create(book: Partial<Book>): Promise<Book> {
    const id = book.id || book._tempId || `temp-${Date.now()}-${idCounter++}`;
    const now = new Date().toISOString();

    await databaseService.executeQuery(
      `INSERT INTO books (
        id, title, authors, isbn, thumbnail, description, published_date,
        page_count, rating, status, notes, user_id, creation_date, update_date,
        server_id, _sync_status, _temp_id, _deleted, _server_updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        book.title || '',
        book.authors || null,
        book.isbn || null,
        book.thumbnail || null,
        book.description || null,
        book.publishedDate || null,
        book.pageCount || null,
        book.rating || null,
        book.status || 'want-to-read',
        book.notes || null,
        book.userId || null,
        book.creationDate || now,
        book.updateDate || now,
        book.serverId || null,
        book._syncStatus || 'synced',
        book._tempId || null,
        book._deleted ? 1 : 0,
        book._serverUpdatedAt || null,
      ]
    );

    const created = await this.findById(id);
    if (!created) {
      throw new Error('Failed to create book');
    }
    return created;
  }

  /**
   * Update book
   */
  async update(id: string, updates: Partial<Book>): Promise<Book> {
    const now = new Date().toISOString();

    await databaseService.executeQuery(
      `UPDATE books SET
        title = COALESCE(?, title),
        authors = COALESCE(?, authors),
        status = COALESCE(?, status),
        rating = COALESCE(?, rating),
        notes = COALESCE(?, notes),
        update_date = ?,
        server_id = COALESCE(?, server_id),
        _sync_status = COALESCE(?, _sync_status),
        _server_updated_at = COALESCE(?, _server_updated_at)
      WHERE id = ?`,
      [
        updates.title,
        updates.authors,
        updates.status,
        updates.rating,
        updates.notes,
        now,
        updates.serverId,
        updates._syncStatus,
        updates._serverUpdatedAt,
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
      'UPDATE books SET _deleted = 1, _sync_status = ? WHERE id = ?',
      ['pending', id]
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
      const tempRecord = await databaseService.getFirstAsync(
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
          server_id, _sync_status, _temp_id, _deleted, _server_updated_at
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
          'synced',              // Mark as synced
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
  async findByIdOrMapping(id: string): Promise<Book | null> {
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
   * Find book by server ID (for upsert operations)
   */
  async findByServerId(serverId: number): Promise<Book | null> {
    const book = await databaseService.getFirstAsync(
      'SELECT * FROM books WHERE id = ? AND _deleted = 0',
      [serverId.toString()]
    );
    return book ? this.mapRowToBook(book) : null;
  }

  /**
   * Upsert book - insert if not exists, update if exists (Task 4.5)
   * This prevents PRIMARY KEY conflicts during server sync
   */
  async upsert(book: Partial<Book>): Promise<Book> {
    const bookId = book.id?.toString();
    if (!bookId) {
      throw new Error('Book ID is required for upsert operation');
    }

    // Check if book exists
    const existingBook = await this.findById(bookId);
    
    if (existingBook) {
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
          _sync_status = ?,
          _server_updated_at = ?
        WHERE id = ?`,
        [
          book.title || existingBook.title,
          book.authors || existingBook.authors,
          book.isbn || existingBook.isbn,
          book.thumbnail || existingBook.thumbnail,
          book.description || existingBook.description,
          book.publishedDate || existingBook.publishedDate,
          book.pageCount || existingBook.pageCount,
          book.rating || existingBook.rating,
          book.status || existingBook.status,
          book.notes || existingBook.notes,
          book.userId || existingBook.userId,
          book.updateDate || now,
          book._syncStatus || existingBook._syncStatus,
          book._serverUpdatedAt || existingBook._serverUpdatedAt,
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
          _sync_status, _temp_id, _deleted, _server_updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          bookId,
          book.title || '',
          book.authors || null,
          book.isbn || null,
          book.thumbnail || null,
          book.description || null,
          book.publishedDate || null,
          book.pageCount || null,
          book.rating || null,
          book.status || 'want-to-read',
          book.notes || null,
          book.userId || null,
          book.creationDate || now,
          book.updateDate || now,
          book._syncStatus || 'synced',
          book._tempId || null,
          book._deleted ? 1 : 0,
          book._serverUpdatedAt || null,
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
   * Search books
   */
  async search(query: string): Promise<Book[]> {
    const books = await databaseService.getAllAsync(
      `SELECT * FROM books
       WHERE _deleted = 0
       AND (title LIKE ? OR authors LIKE ?)
       ORDER BY update_date DESC`,
      [`%${query}%`, `%${query}%`]
    );
    return books.map(this.mapRowToBook);
  }

  /**
   * Find books by status
   */
  async findByStatus(status: string): Promise<Book[]> {
    const books = await databaseService.getAllAsync(
      'SELECT * FROM books WHERE _deleted = 0 AND status = ? ORDER BY update_date DESC',
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
    sortBy?: 'title' | 'update_date' | 'creation_date' | 'rating';
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<Book[]> {
    const { query, status, sortBy = 'update_date', sortOrder = 'DESC' } = options;

    let sql = 'SELECT * FROM books WHERE _deleted = 0';
    const params: any[] = [];

    // Add search condition
    if (query && query.trim()) {
      sql += ' AND (title LIKE ? OR authors LIKE ? OR description LIKE ?)';
      const searchTerm = `%${query.trim()}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // Add status filter
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    // Add sorting
    sql += ` ORDER BY ${sortBy} ${sortOrder}`;

    const books = await databaseService.getAllAsync(sql, params);
    return books.map(this.mapRowToBook);
  }

  /**
   * Find pending sync operations
   */
  async findPendingSync(): Promise<Book[]> {
    const books = await databaseService.getAllAsync(
      'SELECT * FROM books WHERE _sync_status IN (?, ?) ORDER BY update_date DESC',
      ['pending', 'failed']
    );
    return books.map(this.mapRowToBook);
  }

  /**
   * Map database row to Book object
   */
  private mapRowToBook(row: any): Book {
    return {
      id: row.id,
      title: row.title,
      authors: row.authors,
      isbn: row.isbn,
      thumbnail: row.thumbnail,
      description: row.description,
      publishedDate: row.published_date,
      pageCount: row.page_count,
      rating: row.rating,
      status: row.status,
      notes: row.notes,
      userId: row.user_id,
      creationDate: row.creation_date,
      updateDate: row.update_date,
      serverId: row.server_id,
      _syncStatus: row._sync_status,
      _tempId: row._temp_id,
      _deleted: row._deleted === 1,
      _serverUpdatedAt: row._server_updated_at,
    } as Book;
  }
}

export const bookRepository = new BookRepository();
