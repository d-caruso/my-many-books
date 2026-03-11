import { databaseService } from './DatabaseService';
import type { Author } from '@my-many-books/shared-types';
import { LocalAuthor } from '@/entities/LocalAuthor';
import type { SyncStatus } from '@/types';
import { SYNC_STATUS } from '@/types';
import type { SQLiteBindValue } from 'expo-sqlite';

type AuthorWriteInput = Pick<Author, 'name' | 'surname'> &
  Partial<Pick<Author, 'nationality' | 'userId' | 'creationDate' | 'updateDate'>>;

export class AuthorRepository {
  /**
   * Find all authors
   */
  async findAll(): Promise<LocalAuthor[]> {
    const authors = await databaseService.getAllAsync(
      'SELECT * FROM authors ORDER BY surname ASC, name ASC'
    );
    return authors.map((author) => this.mapRowToAuthor(author));
  }

  /**
   * Find author by ID
   */
  async findById(id: number): Promise<LocalAuthor | null> {
    const author = await databaseService.getFirstAsync(
      'SELECT * FROM authors WHERE id = ?',
      [id]
    );
    return author ? this.mapRowToAuthor(author) : null;
  }

  /**
   * Find author by name and surname
   */
  async findByName(name: string, surname: string): Promise<LocalAuthor | null> {
    const author = await databaseService.getFirstAsync(
      'SELECT * FROM authors WHERE name = ? AND surname = ?',
      [name, surname]
    );
    return author ? this.mapRowToAuthor(author) : null;
  }

  /**
   * Create new author (or get existing if name and surname already exist)
   */
  async create(author: AuthorWriteInput): Promise<LocalAuthor> {
    const normalized = this.normalizeAuthor(author);
    const existing = await this.findByName(normalized.name, normalized.surname);
    if (existing) {
      return existing;
    }

    const result = await databaseService.executeQuery(
      `INSERT INTO authors (
        name,
        surname,
        nationality,
        creation_date,
        update_date
      ) VALUES (?, ?, ?, ?, ?)`,
      [
        normalized.name,
        normalized.surname,
        normalized.nationality,
        normalized.creationDate,
        normalized.updateDate,
      ]
    );

    const created = await this.findById(result.lastInsertRowId);
    if (!created) {
      throw new Error('Failed to create author');
    }
    return created;
  }

  /**
   * Update author
   */
  async update(id: number, author: AuthorWriteInput): Promise<LocalAuthor> {
    const current = await this.findById(id);
    if (!current) {
      throw new Error('Author not found');
    }

    const normalized = this.normalizeAuthor({
      name: author.name ?? current.entity.name,
      surname: author.surname ?? current.entity.surname,
      nationality: author.nationality ?? current.entity.nationality,
      userId: author.userId ?? current.entity.userId,
      creationDate: author.creationDate ?? current.entity.creationDate,
      updateDate: author.updateDate ?? new Date().toISOString(),
    });

    await databaseService.executeQuery(
      `UPDATE authors
       SET name = ?, surname = ?, nationality = ?, creation_date = ?, update_date = ?
       WHERE id = ?`,
      [
        normalized.name,
        normalized.surname,
        normalized.nationality,
        normalized.creationDate,
        normalized.updateDate,
        id,
      ]
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
  async findByBookId(bookId: string): Promise<LocalAuthor[]> {
    const authors = await databaseService.getAllAsync(
      `SELECT a.* FROM authors a
       INNER JOIN book_authors ba ON a.id = ba.author_id
       WHERE ba.book_id = ?
       ORDER BY a.surname ASC, a.name ASC`,
      [bookId]
    );
    return authors.map((author) => this.mapRowToAuthor(author));
  }

  private normalizeAuthor(author: AuthorWriteInput): Required<AuthorWriteInput> {
    const timestamp = new Date().toISOString();

    return {
      name: author.name.trim(),
      surname: author.surname.trim(),
      nationality: author.nationality ?? null,
      userId: author.userId ?? undefined,
      creationDate: author.creationDate ?? timestamp,
      updateDate: author.updateDate ?? timestamp,
    };
  }

  private mapRowToAuthor(row: Record<string, unknown>): LocalAuthor {
    const author: Author = {
      id: row.id as number,
      name: row.name as string,
      surname: row.surname as string,
      nationality: row.nationality as string | null | undefined,
      userId: row.user_id as number | undefined,
      creationDate: row.creation_date as string | undefined,
      updateDate: row.update_date as string | undefined,
    };
    const local = new LocalAuthor(author);
    local.syncStatus = (row.sync_status as SyncStatus) ?? SYNC_STATUS.SYNCED;
    local.serverUpdatedAt = row.server_updated_at as string | undefined;

    return local;
  }

  /**
   * Find author by server ID (Phase 5)
   */
  async findByServerId(serverId: number): Promise<LocalAuthor | null> {
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
    syncStatus?: SyncStatus;
    serverUpdatedAt?: string;
  }): Promise<void> {
    const updates: string[] = [];
    const values: SQLiteBindValue[] = [];

    if (fields.serverId !== undefined) {
      updates.push('server_id = ?');
      values.push(fields.serverId);
    }
    if (fields.syncStatus !== undefined) {
      updates.push('sync_status = ?');
      values.push(fields.syncStatus);
    }
    if (fields.serverUpdatedAt !== undefined) {
      updates.push('server_updated_at = ?');
      values.push(fields.serverUpdatedAt);
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
