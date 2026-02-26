import { databaseService } from './DatabaseService';
import type { Category } from '@my-many-books/shared-types';
import { LocalCategory } from '@/entities/LocalCategory';
import type { SyncStatus } from '@/types';
import { SYNC_STATUS } from '@/types';

export class CategoryRepository {
  /**
   * Find all categories
   */
  async findAll(): Promise<LocalCategory[]> {
    const categories = await databaseService.getAllAsync(
      'SELECT * FROM categories ORDER BY name ASC'
    );
    return categories.map(this.mapRowToCategory);
  }

  /**
   * Find category by ID
   */
  async findById(id: number): Promise<LocalCategory | null> {
    const category = await databaseService.getFirstAsync(
      'SELECT * FROM categories WHERE id = ?',
      [id]
    );
    return category ? this.mapRowToCategory(category) : null;
  }

  /**
   * Find category by name
   */
  async findByName(name: string): Promise<LocalCategory | null> {
    const category = await databaseService.getFirstAsync(
      'SELECT * FROM categories WHERE name = ?',
      [name]
    );
    return category ? this.mapRowToCategory(category) : null;
  }

  /**
   * Create new category (or get existing if name already exists)
   */
  async create(name: string, translationKey: string | null = null): Promise<LocalCategory> {
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
  async update(id: number, name: string, translationKey?: string | null): Promise<LocalCategory> {
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
  async findByBookId(bookId: string): Promise<LocalCategory[]> {
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
   * Map database row to Category object
   * Phase 5: Include sync fields for server synchronization
   */
  private mapRowToCategory(row: Record<string, unknown>): LocalCategory {
    const category: Category = {
      id: row.id as number,
      name: row.name as string,
      translationKey: row.translation_key as string | null | undefined,
      userId: row.user_id as number | undefined,
      creationDate: row.creation_date as string | undefined,
      updateDate: row.update_date as string | undefined,
    };
    const local = new LocalCategory(category);
    local.syncStatus = (row._sync_status as SyncStatus) ?? SYNC_STATUS.SYNCED;
    local.serverUpdatedAt = row._server_updated_at as string | undefined;
    return local;
  }

  /**
   * Find category by server ID (Phase 5)
   */
  async findByServerId(serverId: number): Promise<LocalCategory | null> {
    const category = await databaseService.getFirstAsync(
      'SELECT * FROM categories WHERE _server_id = ?',
      [serverId]
    );
    return category ? this.mapRowToCategory(category) : null;
  }

  /**
   * Update sync fields for category (Phase 5)
   */
  async updateSyncFields(id: number, fields: {
    serverId?: number;
    _syncStatus?: SyncStatus;
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
        `UPDATE categories SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
    }
  }
}

export const categoryRepository = new CategoryRepository();
