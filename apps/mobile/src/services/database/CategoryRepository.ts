import { databaseService } from './DatabaseService';

export interface Category {
  id: number;
  name: string;
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
  async create(name: string): Promise<Category> {
    // Check if category already exists
    const existing = await this.findByName(name);
    if (existing) {
      return existing;
    }

    // Create new category
    const result = await databaseService.executeQuery(
      'INSERT INTO categories (name) VALUES (?)',
      [name]
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
  async update(id: number, name: string): Promise<Category> {
    await databaseService.executeQuery(
      'UPDATE categories SET name = ? WHERE id = ?',
      [name, id]
    );

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
   */
  private mapRowToCategory(row: any): Category {
    return {
      id: row.id,
      name: row.name,
    };
  }
}

export const categoryRepository = new CategoryRepository();
