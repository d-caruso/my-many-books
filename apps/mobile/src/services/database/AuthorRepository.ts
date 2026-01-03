import { databaseService } from './DatabaseService';

export interface Author {
  id: number;
  name: string;
  serverId?: number;          // Phase 5: Server ID for sync
  _syncStatus?: 'synced' | 'pending' | 'failed';
  _serverUpdatedAt?: string;
}

export class AuthorRepository {
  /**
   * Find all authors
   */
  async findAll(): Promise<Author[]> {
    const authors = await databaseService.getAllAsync(
      'SELECT * FROM authors ORDER BY name ASC'
    );
    return authors.map(this.mapRowToAuthor);
  }

  /**
   * Find author by ID
   */
  async findById(id: number): Promise<Author | null> {
    const author = await databaseService.getFirstAsync(
      'SELECT * FROM authors WHERE id = ?',
      [id]
    );
    return author ? this.mapRowToAuthor(author) : null;
  }

  /**
   * Find author by name
   */
  async findByName(name: string): Promise<Author | null> {
    const author = await databaseService.getFirstAsync(
      'SELECT * FROM authors WHERE name = ?',
      [name]
    );
    return author ? this.mapRowToAuthor(author) : null;
  }

  /**
   * Create new author (or get existing if name already exists)
   */
  async create(name: string): Promise<Author> {
    // Check if author already exists
    const existing = await this.findByName(name);
    if (existing) {
      return existing;
    }

    // Create new author
    const result = await databaseService.executeQuery(
      'INSERT INTO authors (name) VALUES (?)',
      [name]
    );

    const created = await this.findById(result.lastInsertRowId);
    if (!created) {
      throw new Error('Failed to create author');
    }
    return created;
  }

  /**
   * Update author name
   */
  async update(id: number, name: string): Promise<Author> {
    await databaseService.executeQuery(
      'UPDATE authors SET name = ? WHERE id = ?',
      [name, id]
    );

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Failed to update author');
    }
    return updated;
  }

  /**
   * Delete author (and remove from book_authors junction table via CASCADE)
   */
  async delete(id: number): Promise<void> {
    await databaseService.executeQuery(
      'DELETE FROM authors WHERE id = ?',
      [id]
    );
  }

  /**
   * Find authors for a specific book
   */
  async findByBookId(bookId: string): Promise<Author[]> {
    const authors = await databaseService.getAllAsync(
      `SELECT a.* FROM authors a
       INNER JOIN book_authors ba ON a.id = ba.author_id
       WHERE ba.book_id = ?
       ORDER BY a.name ASC`,
      [bookId]
    );
    return authors.map(this.mapRowToAuthor);
  }

  /**
   * Add author to book (create junction table entry)
   */
  async addToBook(authorId: number, bookId: string): Promise<void> {
    await databaseService.executeQuery(
      'INSERT OR IGNORE INTO book_authors (book_id, author_id) VALUES (?, ?)',
      [bookId, authorId]
    );
  }

  /**
   * Remove author from book (delete junction table entry)
   */
  async removeFromBook(authorId: number, bookId: string): Promise<void> {
    await databaseService.executeQuery(
      'DELETE FROM book_authors WHERE book_id = ? AND author_id = ?',
      [bookId, authorId]
    );
  }

  /**
   * Search authors by name
   */
  async search(query: string): Promise<Author[]> {
    const authors = await databaseService.getAllAsync(
      'SELECT * FROM authors WHERE name LIKE ? ORDER BY name ASC',
      [`%${query}%`]
    );
    return authors.map(this.mapRowToAuthor);
  }

  /**
   * Map database row to Author object
   * Phase 5: Include sync fields for server synchronization
   */
  private mapRowToAuthor(row: Record<string, unknown>): Author {
    return {
      id: row.id,
      name: row.name,
      serverId: row.server_id,
      _syncStatus: row._sync_status || 'synced',
      _serverUpdatedAt: row._server_updated_at,
    };
  }

  /**
   * Find author by server ID (Phase 5)
   */
  async findByServerId(serverId: number): Promise<Author | null> {
    const author = await databaseService.getFirstAsync(
      'SELECT * FROM authors WHERE server_id = ?',
      [serverId]
    );
    return author ? this.mapRowToAuthor(author) : null;
  }

  /**
   * Update sync fields for author (Phase 5)
   */
  async updateSyncFields(id: number, fields: {
    serverId?: number;
    _syncStatus?: 'synced' | 'pending' | 'failed';
    _serverUpdatedAt?: string;
  }): Promise<void> {
    const updates: string[] = [];
    const values: unknown[] = [];

    if (fields.serverId !== undefined) {
      updates.push('server_id = ?');
      values.push(fields.serverId);
    }
    if (fields._syncStatus !== undefined) {
      updates.push('_sync_status = ?');
      values.push(fields._syncStatus);
    }
    if (fields._serverUpdatedAt !== undefined) {
      updates.push('_server_updated_at = ?');
      values.push(fields._serverUpdatedAt);
    }

    if (updates.length > 0) {
      values.push(id);
      await databaseService.executeQuery(
        `UPDATE authors SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
    }
  }
}

export const authorRepository = new AuthorRepository();
