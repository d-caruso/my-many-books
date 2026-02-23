import { databaseService } from './DatabaseService';

export interface Category {
  id: number;
  name: string;
  translationKey?: string | null;
  serverId?: number;          // Phase 5: Server ID for sync
  _syncStatus?: 'synced' | 'pending' | 'failed';
  _serverUpdatedAt?: string;
}

export class CategoryRepository {
  /**
   * Find all categories
   */
  async findAll(): Promise<Category[]> {
    const categories = await databaseService.getAllAsync(
      'SELECT * FROM categories ORDER BY name ASC'
    );
    return categories.map(this.mapRowToCategory);
  }

  /**
   * Find category by ID
   */
  async findById(id: number): Promise<Category | null> {
    const category = await databaseService.getFirstAsync(
      'SELECT * FROM categories WHERE id = ?',
      [id]
    );
    return category ? this.mapRowToCategory(category) : null;
  }

  /**
   * Find category by name
   */
  async findByName(name: string): Promise<Category | null> {
    const category = await databaseService.getFirstAsync(
      'SELECT * FROM categories WHERE name = ?',
      [name]
    );
    return category ? this.mapRowToCategory(category) : null;
  }

  /**
   * Create new category (or get existing if name already exists)
   */
  async create(name: string, translationKey: string | null = null): Promise<Category> {
    // Check if category already exists
    const existing = await this.findByName(name);
    if (existing) {
      return existing;
    }

    // Create new category
    const result = await databaseService.executeQuery(
      'INSERT INTO categories (name, translation_key) VALUES (?, ?)',
      [name, translationKey]
    );

    const created = await this.findById(result.lastInsertRowId);
    if (!created) {
      throw new Error('Failed to create category');
    }
    return created;
  }

  /**
   * Update category name
   */
  async update(id: number, name: string, translationKey?: string | null): Promise<Category> {
    if (translationKey !== undefined) {
      await databaseService.executeQuery(
        'UPDATE categories SET name = ?, translation_key = ? WHERE id = ?',
        [name, translationKey, id]
      );
    } else {
      await databaseService.executeQuery(
        'UPDATE categories SET name = ? WHERE id = ?',
        [name, id]
      );
    }

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Failed to update category');
    }
    return updated;
  }

  /**
   * Delete category (and remove from book_categories junction table via CASCADE)
   */
  async delete(id: number): Promise<void> {
    await databaseService.executeQuery(
      'DELETE FROM categories WHERE id = ?',
      [id]
    );
  }

  /**
   * Find categories for a specific book
   */
  async findByBookId(bookId: string): Promise<Category[]> {
    const categories = await databaseService.getAllAsync(
      `SELECT c.* FROM categories c
       INNER JOIN book_categories bc ON c.id = bc.category_id
       WHERE bc.book_id = ?
       ORDER BY c.name ASC`,
      [bookId]
    );
    return categories.map(this.mapRowToCategory);
  }

  /**
   * Add category to book (create junction table entry)
   */
  async addToBook(categoryId: number, bookId: string): Promise<void> {
    await databaseService.executeQuery(
      'INSERT OR IGNORE INTO book_categories (book_id, category_id) VALUES (?, ?)',
      [bookId, categoryId]
    );
  }

  /**
   * Remove category from book (delete junction table entry)
   */
  async removeFromBook(categoryId: number, bookId: string): Promise<void> {
    await databaseService.executeQuery(
      'DELETE FROM book_categories WHERE book_id = ? AND category_id = ?',
      [bookId, categoryId]
    );
  }

  /**
   * Search categories by name
   */
  async search(query: string): Promise<Category[]> {
    const categories = await databaseService.getAllAsync(
      'SELECT * FROM categories WHERE name LIKE ? ORDER BY name ASC',
      [`%${query}%`]
    );
    return categories.map(this.mapRowToCategory);
  }

  /**
   * Map database row to Category object
   * Phase 5: Include sync fields for server synchronization
   */
  private mapRowToCategory(row: Record<string, unknown>): Category {
    return {
      id: row.id,
      name: row.name,
      translationKey: row.translation_key ?? null,
      serverId: row.server_id,
      _syncStatus: row._sync_status || 'synced',
      _serverUpdatedAt: row._server_updated_at,
    };
  }

  /**
   * Find category by server ID (Phase 5)
   */
  async findByServerId(serverId: number): Promise<Category | null> {
    const category = await databaseService.getFirstAsync(
      'SELECT * FROM categories WHERE server_id = ?',
      [serverId]
    );
    return category ? this.mapRowToCategory(category) : null;
  }

  /**
   * Update sync fields for category (Phase 5)
   */
  async updateSyncFields(id: number, fields: {
    serverId?: number;
    translationKey?: string | null;
    _syncStatus?: 'synced' | 'pending' | 'failed';
    _serverUpdatedAt?: string;
  }): Promise<void> {
    const updates: string[] = [];
    const values: unknown[] = [];

    if (fields.serverId !== undefined) {
      updates.push('server_id = ?');
      values.push(fields.serverId);
    }
    if (fields.translationKey !== undefined) {
      updates.push('translation_key = ?');
      values.push(fields.translationKey);
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
        `UPDATE categories SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
    }
  }
}

export const categoryRepository = new CategoryRepository();
