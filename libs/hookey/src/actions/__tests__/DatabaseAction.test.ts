import {
  DatabaseAction,
  DatabaseService,
  DatabaseActionConfig,
  ConsoleDatabaseService,
} from '../DatabaseAction';
import { HookActionContext } from '../../types';

// Mock database service for testing
class MockDatabaseService implements DatabaseService {
  public operations: Array<{
    type: 'create' | 'update' | 'delete';
    table: string;
    data?: Record<string, unknown>;
    where?: Record<string, unknown>;
  }> = [];

  async create(table: string, data: Record<string, unknown>): Promise<unknown> {
    this.operations.push({ type: 'create', table, data });
    return { id: 'test-id', ...data };
  }

  async update(
    table: string,
    data: Record<string, unknown>,
    where: Record<string, unknown>
  ): Promise<unknown> {
    this.operations.push({ type: 'update', table, data, where });
    return { affected: 1 };
  }

  async delete(table: string, where: Record<string, unknown>): Promise<unknown> {
    this.operations.push({ type: 'delete', table, where });
    return { deleted: 1 };
  }

  reset() {
    this.operations = [];
  }

  getLastOperation() {
    return this.operations[this.operations.length - 1];
  }
}

describe('DatabaseAction', () => {
  let mockDbService: MockDatabaseService;

  beforeEach(() => {
    mockDbService = new MockDatabaseService();
  });

  describe('create operation', () => {
    it('creates record with simple data', async () => {
      const config: DatabaseActionConfig = {
        operation: 'create',
        table: 'books',
        data: {
          title: 'Test Book',
          author: 'Test Author',
        },
      };

      const action = new DatabaseAction(config, mockDbService);
      const context: HookActionContext = {
        eventName: 'book.create.after',
        payload: {},
      };

      await action.execute(context);

      expect(mockDbService.operations).toHaveLength(1);
      const op = mockDbService.getLastOperation();
      expect(op.type).toBe('create');
      expect(op.table).toBe('books');
      expect(op.data).toEqual({
        title: 'Test Book',
        author: 'Test Author',
      });
    });

    it('creates record with template variables', async () => {
      const config: DatabaseActionConfig = {
        operation: 'create',
        table: 'notifications',
        data: {
          user_id: '{{user.id}}',
          message: 'You created: {{book.title}}',
          type: 'book_created',
        },
      };

      const action = new DatabaseAction(config, mockDbService);
      const context: HookActionContext = {
        eventName: 'book.create.after',
        payload: {
          user: { id: 123 },
          book: { title: '1984' },
        },
      };

      await action.execute(context);

      const op = mockDbService.getLastOperation();
      expect(op.data).toEqual({
        user_id: '123',
        message: 'You created: 1984',
        type: 'book_created',
      });
    });

    it('creates record with nested template variables', async () => {
      const config: DatabaseActionConfig = {
        operation: 'create',
        table: 'audit_log',
        data: {
          user_email: '{{user.contact.email}}',
          book_author: '{{book.author.name}}',
          timestamp: '{{metadata.timestamp}}',
        },
      };

      const action = new DatabaseAction(config, mockDbService);
      const context: HookActionContext = {
        eventName: 'book.create.after',
        payload: {
          user: { contact: { email: 'user@example.com' } },
          book: { author: { name: 'Orwell' } },
          metadata: { timestamp: '2025-01-01' },
        },
      };

      await action.execute(context);

      const op = mockDbService.getLastOperation();
      expect(op.data).toEqual({
        user_email: 'user@example.com',
        book_author: 'Orwell',
        timestamp: '2025-01-01',
      });
    });

    it('creates record with mixed static and template values', async () => {
      const config: DatabaseActionConfig = {
        operation: 'create',
        table: 'books',
        data: {
          title: '{{book.title}}',
          status: 'pending',
          user_id: '{{user.id}}',
          created_at: '2025-01-01',
        },
      };

      const action = new DatabaseAction(config, mockDbService);
      const context: HookActionContext = {
        eventName: 'book.create.after',
        payload: {
          user: { id: 456 },
          book: { title: 'New Book' },
        },
      };

      await action.execute(context);

      const op = mockDbService.getLastOperation();
      expect(op.data).toEqual({
        title: 'New Book',
        status: 'pending',
        user_id: '456',
        created_at: '2025-01-01',
      });
    });

    it('preserves non-string values', async () => {
      const config: DatabaseActionConfig = {
        operation: 'create',
        table: 'books',
        data: {
          title: '{{book.title}}',
          page_count: 500,
          is_published: true,
          rating: null,
          metadata: { key: 'value' },
        },
      };

      const action = new DatabaseAction(config, mockDbService);
      const context: HookActionContext = {
        eventName: 'book.create.after',
        payload: { book: { title: 'Test' } },
      };

      await action.execute(context);

      const op = mockDbService.getLastOperation();
      expect(op.data).toEqual({
        title: 'Test',
        page_count: 500,
        is_published: true,
        rating: null,
        metadata: { key: 'value' },
      });
    });

    it('throws error if data field is missing', async () => {
      const config: DatabaseActionConfig = {
        operation: 'create',
        table: 'books',
      };

      const action = new DatabaseAction(config, mockDbService);
      const context: HookActionContext = {
        eventName: 'test',
        payload: {},
      };

      await expect(action.execute(context)).rejects.toThrow('Create operation requires data field');
    });
  });

  describe('update operation', () => {
    it('updates record with simple data and where clause', async () => {
      const config: DatabaseActionConfig = {
        operation: 'update',
        table: 'books',
        data: {
          status: 'published',
        },
        where: {
          id: 123,
        },
      };

      const action = new DatabaseAction(config, mockDbService);
      const context: HookActionContext = {
        eventName: 'book.update.after',
        payload: {},
      };

      await action.execute(context);

      const op = mockDbService.getLastOperation();
      expect(op.type).toBe('update');
      expect(op.table).toBe('books');
      expect(op.data).toEqual({ status: 'published' });
      expect(op.where).toEqual({ id: 123 });
    });

    it('updates record with template variables in data', async () => {
      const config: DatabaseActionConfig = {
        operation: 'update',
        table: 'books',
        data: {
          title: '{{book.newTitle}}',
          updated_by: '{{user.id}}',
        },
        where: {
          id: '{{book.id}}',
        },
      };

      const action = new DatabaseAction(config, mockDbService);
      const context: HookActionContext = {
        eventName: 'book.update.after',
        payload: {
          user: { id: 789 },
          book: { id: 123, newTitle: 'Updated Title' },
        },
      };

      await action.execute(context);

      const op = mockDbService.getLastOperation();
      expect(op.data).toEqual({
        title: 'Updated Title',
        updated_by: '789',
      });
      expect(op.where).toEqual({ id: '123' });
    });

    it('updates record with template variables in where clause', async () => {
      const config: DatabaseActionConfig = {
        operation: 'update',
        table: 'books',
        data: {
          status: 'archived',
        },
        where: {
          user_id: '{{user.id}}',
          status: 'draft',
        },
      };

      const action = new DatabaseAction(config, mockDbService);
      const context: HookActionContext = {
        eventName: 'user.deactivate.after',
        payload: {
          user: { id: 999 },
        },
      };

      await action.execute(context);

      const op = mockDbService.getLastOperation();
      expect(op.where).toEqual({
        user_id: '999',
        status: 'draft',
      });
    });

    it('throws error if data field is missing', async () => {
      const config: DatabaseActionConfig = {
        operation: 'update',
        table: 'books',
        where: { id: 1 },
      };

      const action = new DatabaseAction(config, mockDbService);
      const context: HookActionContext = {
        eventName: 'test',
        payload: {},
      };

      await expect(action.execute(context)).rejects.toThrow('Update operation requires data field');
    });

    it('throws error if where field is missing', async () => {
      const config: DatabaseActionConfig = {
        operation: 'update',
        table: 'books',
        data: { status: 'published' },
      };

      const action = new DatabaseAction(config, mockDbService);
      const context: HookActionContext = {
        eventName: 'test',
        payload: {},
      };

      await expect(action.execute(context)).rejects.toThrow('Update operation requires where field');
    });
  });

  describe('delete operation', () => {
    it('deletes record with simple where clause', async () => {
      const config: DatabaseActionConfig = {
        operation: 'delete',
        table: 'books',
        where: {
          id: 123,
        },
      };

      const action = new DatabaseAction(config, mockDbService);
      const context: HookActionContext = {
        eventName: 'book.delete.after',
        payload: {},
      };

      await action.execute(context);

      const op = mockDbService.getLastOperation();
      expect(op.type).toBe('delete');
      expect(op.table).toBe('books');
      expect(op.where).toEqual({ id: 123 });
    });

    it('deletes record with template variables in where clause', async () => {
      const config: DatabaseActionConfig = {
        operation: 'delete',
        table: 'sessions',
        where: {
          user_id: '{{user.id}}',
        },
      };

      const action = new DatabaseAction(config, mockDbService);
      const context: HookActionContext = {
        eventName: 'user.logout.after',
        payload: {
          user: { id: 555 },
        },
      };

      await action.execute(context);

      const op = mockDbService.getLastOperation();
      expect(op.where).toEqual({ user_id: '555' });
    });

    it('deletes record with multiple where conditions', async () => {
      const config: DatabaseActionConfig = {
        operation: 'delete',
        table: 'notifications',
        where: {
          user_id: '{{user.id}}',
          type: 'temporary',
          read: true,
        },
      };

      const action = new DatabaseAction(config, mockDbService);
      const context: HookActionContext = {
        eventName: 'cleanup',
        payload: {
          user: { id: 777 },
        },
      };

      await action.execute(context);

      const op = mockDbService.getLastOperation();
      expect(op.where).toEqual({
        user_id: '777',
        type: 'temporary',
        read: true,
      });
    });

    it('throws error if where field is missing', async () => {
      const config: DatabaseActionConfig = {
        operation: 'delete',
        table: 'books',
      };

      const action = new DatabaseAction(config, mockDbService);
      const context: HookActionContext = {
        eventName: 'test',
        payload: {},
      };

      await expect(action.execute(context)).rejects.toThrow('Delete operation requires where field');
    });
  });

  describe('edge cases', () => {
    it('handles empty payload', async () => {
      const config: DatabaseActionConfig = {
        operation: 'create',
        table: 'logs',
        data: {
          message: 'Static message',
        },
      };

      const action = new DatabaseAction(config, mockDbService);
      const context: HookActionContext = {
        eventName: 'test',
      };

      await action.execute(context);

      expect(mockDbService.operations).toHaveLength(1);
    });

    it('handles undefined payload', async () => {
      const config: DatabaseActionConfig = {
        operation: 'create',
        table: 'logs',
        data: {
          message: 'Test',
        },
      };

      const action = new DatabaseAction(config, mockDbService);
      const context: HookActionContext = {
        eventName: 'test',
        payload: undefined,
      };

      await action.execute(context);

      expect(mockDbService.operations).toHaveLength(1);
    });

    it('preserves template placeholder for missing variables', async () => {
      const config: DatabaseActionConfig = {
        operation: 'create',
        table: 'logs',
        data: {
          user_id: '{{user.id}}',
          book_id: '{{book.id}}',
        },
      };

      const action = new DatabaseAction(config, mockDbService);
      const context: HookActionContext = {
        eventName: 'test',
        payload: {},
      };

      await action.execute(context);

      const op = mockDbService.getLastOperation();
      expect(op.data).toEqual({
        user_id: '{{user.id}}',
        book_id: '{{book.id}}',
      });
    });

    it('throws error for unknown operation', async () => {
      const config: DatabaseActionConfig = {
        operation: 'invalid' as any,
        table: 'books',
      };

      const action = new DatabaseAction(config, mockDbService);
      const context: HookActionContext = {
        eventName: 'test',
        payload: {},
      };

      await expect(action.execute(context)).rejects.toThrow('Unknown database operation: invalid');
    });
  });

  describe('ConsoleDatabaseService', () => {
    it('logs create operation to console', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const service = new ConsoleDatabaseService();
      await service.create('books', { title: 'Test Book' });

      expect(consoleSpy).toHaveBeenCalledWith('[DatabaseService] CREATE');
      expect(consoleSpy).toHaveBeenCalledWith('  Table:', 'books');

      consoleSpy.mockRestore();
    });

    it('logs update operation to console', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const service = new ConsoleDatabaseService();
      await service.update('books', { status: 'published' }, { id: 1 });

      expect(consoleSpy).toHaveBeenCalledWith('[DatabaseService] UPDATE');
      expect(consoleSpy).toHaveBeenCalledWith('  Table:', 'books');

      consoleSpy.mockRestore();
    });

    it('logs delete operation to console', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const service = new ConsoleDatabaseService();
      await service.delete('books', { id: 1 });

      expect(consoleSpy).toHaveBeenCalledWith('[DatabaseService] DELETE');
      expect(consoleSpy).toHaveBeenCalledWith('  Table:', 'books');

      consoleSpy.mockRestore();
    });
  });
});
