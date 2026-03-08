import { ActionRouter, defaultActionRouter } from '../ActionRouter';
import { LogAction } from '../LogAction';
import { EmailAction, EmailService } from '../EmailAction';
import { DatabaseAction, DatabaseService } from '../DatabaseAction';
import { HookActionContext } from '../../types';
import { appendFile, mkdir } from 'node:fs/promises';
import { getLogger } from '@my-many-books/shared-logging';

jest.mock('node:fs/promises', () => ({
  appendFile: jest.fn().mockResolvedValue(undefined),
  mkdir: jest.fn().mockResolvedValue(undefined),
}));

// Mock services
class MockEmailService implements EmailService {
  async sendEmail(): Promise<void> {
    // Mock implementation
  }
}

class MockDatabaseService implements DatabaseService {
  async create(): Promise<unknown> {
    return { id: 'mock' };
  }
  async update(): Promise<unknown> {
    return { affected: 1 };
  }
  async delete(): Promise<unknown> {
    return { deleted: 1 };
  }
}

describe('ActionRouter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createAction', () => {
    describe('log action', () => {
      it('creates LogAction with default prefix', () => {
        const router = new ActionRouter();
        const action = router.createAction('log');

        expect(action).toBeInstanceOf(LogAction);
      });

      it('creates LogAction with custom prefix', () => {
        const router = new ActionRouter();
        const action = router.createAction('log', { prefix: 'custom' });

        expect(action).toBeInstanceOf(LogAction);
      });

      it('creates LogAction with empty config', () => {
        const router = new ActionRouter();
        const action = router.createAction('log', {});

        expect(action).toBeInstanceOf(LogAction);
      });
    });

    describe('email action', () => {
      it('creates EmailAction with valid config', () => {
        const router = new ActionRouter();
        const config = {
          to: 'user@example.com',
          subject: 'Test',
          template: 'Body',
        };

        const action = router.createAction('email', config);

        expect(action).toBeInstanceOf(EmailAction);
      });

      it('creates EmailAction with custom email service', () => {
        const mockEmailService = new MockEmailService();
        const router = new ActionRouter({ emailService: mockEmailService });
        const config = {
          to: 'user@example.com',
          subject: 'Test',
          template: 'Body',
        };

        const action = router.createAction('email', config);

        expect(action).toBeInstanceOf(EmailAction);
      });

      it('throws error if config is missing', () => {
        const router = new ActionRouter();

        expect(() => router.createAction('email')).toThrow('Email action requires configuration');
      });

      it('creates EmailAction with all optional fields', () => {
        const router = new ActionRouter();
        const config = {
          to: ['user1@example.com', 'user2@example.com'],
          cc: 'cc@example.com',
          bcc: ['bcc1@example.com', 'bcc2@example.com'],
          subject: 'Test Subject',
          template: 'Email body with {{variable}}',
          from: 'sender@example.com',
        };

        const action = router.createAction('email', config);

        expect(action).toBeInstanceOf(EmailAction);
      });
    });

    describe('database action', () => {
      it('creates DatabaseAction with create operation', () => {
        const router = new ActionRouter();
        const config = {
          operation: 'create',
          table: 'books',
          data: { title: 'Test' },
        };

        const action = router.createAction('database', config);

        expect(action).toBeInstanceOf(DatabaseAction);
      });

      it('creates DatabaseAction with update operation', () => {
        const router = new ActionRouter();
        const config = {
          operation: 'update',
          table: 'books',
          data: { title: 'Updated' },
          where: { id: 1 },
        };

        const action = router.createAction('database', config);

        expect(action).toBeInstanceOf(DatabaseAction);
      });

      it('creates DatabaseAction with delete operation', () => {
        const router = new ActionRouter();
        const config = {
          operation: 'delete',
          table: 'books',
          where: { id: 1 },
        };

        const action = router.createAction('database', config);

        expect(action).toBeInstanceOf(DatabaseAction);
      });

      it('creates DatabaseAction with custom database service', () => {
        const mockDbService = new MockDatabaseService();
        const router = new ActionRouter({ databaseService: mockDbService });
        const config = {
          operation: 'create',
          table: 'books',
          data: { title: 'Test' },
        };

        const action = router.createAction('database', config);

        expect(action).toBeInstanceOf(DatabaseAction);
      });

      it('throws error if config is missing', () => {
        const router = new ActionRouter();

        expect(() => router.createAction('database')).toThrow(
          'Database action requires configuration'
        );
      });
    });

    describe('error handling', () => {
      it('throws error for unknown action type', () => {
        const router = new ActionRouter();

        expect(() => router.createAction('unknown')).toThrow('Unknown action type: unknown');
      });

      it('throws error for invalid action type', () => {
        const router = new ActionRouter();

        expect(() => router.createAction('invalid', {})).toThrow('Unknown action type: invalid');
      });
    });

    describe('action execution', () => {
      it('creates functional LogAction', async () => {
        const infoSpy = jest.spyOn(getLogger(), 'info').mockImplementation();
        const router = new ActionRouter();
        const action = router.createAction('log', { prefix: 'test' });

        const context: HookActionContext = {
          eventName: 'test.event',
          payload: { data: 'value' },
        };

        await action.execute(context);

        expect(infoSpy).toHaveBeenCalledWith(
          { payload: { data: 'value' } },
          '[test] event=test.event'
        );

        infoSpy.mockRestore();
      });

      it('omits metadata when include_metadata is false', async () => {
        const infoSpy = jest.spyOn(getLogger(), 'info').mockImplementation();
        const router = new ActionRouter();
        const action = router.createAction('log', {
          prefix: 'audit',
          include_metadata: false,
        });

        const context: HookActionContext = {
          eventName: 'audit.event',
          payload: { secret: 'value' },
        };

        await action.execute(context);

        expect(infoSpy).toHaveBeenCalledWith('[audit] event=audit.event');

        infoSpy.mockRestore();
      });

      it('writes to file when configured for file destination', async () => {
        const router = new ActionRouter();
        const action = router.createAction('log', {
          prefix: 'file',
          destination: 'file',
          file_path: '/tmp/hook.log',
          include_metadata: false,
        });

        const context: HookActionContext = {
          eventName: 'test.event',
          payload: { data: 'value' },
        };

        await action.execute(context);

        expect(mkdir).toHaveBeenCalledWith('/tmp', { recursive: true });
        expect(appendFile).toHaveBeenCalledWith(
          '/tmp/hook.log',
          expect.stringContaining('[file] event=test.event'),
          'utf8'
        );
      });

      it('creates functional EmailAction', async () => {
        const mockEmailService = new MockEmailService();
        const sendEmailSpy = jest.spyOn(mockEmailService, 'sendEmail').mockResolvedValue();
        const router = new ActionRouter({ emailService: mockEmailService });
        const action = router.createAction('email', {
          to: 'user@example.com',
          subject: 'Test',
          template: 'Body',
        });

        const context: HookActionContext = {
          eventName: 'test.event',
          payload: {},
        };

        await action.execute(context);

        expect(sendEmailSpy).toHaveBeenCalled();
      });

      it('creates functional DatabaseAction', async () => {
        const mockDbService = new MockDatabaseService();
        const createSpy = jest.spyOn(mockDbService, 'create').mockResolvedValue({ id: 'test' });
        const router = new ActionRouter({ databaseService: mockDbService });
        const action = router.createAction('database', {
          operation: 'create',
          table: 'books',
          data: { title: 'Test Book' },
        });

        const context: HookActionContext = {
          eventName: 'book.create.after',
          payload: {},
        };

        await action.execute(context);

        expect(createSpy).toHaveBeenCalledWith('books', { title: 'Test Book' });
      });
    });
  });

  describe('service injection', () => {
    it('uses custom email service', () => {
      const customEmailService = new MockEmailService();
      const router = new ActionRouter({ emailService: customEmailService });
      const action = router.createAction('email', {
        to: 'test@example.com',
        subject: 'Test',
        template: 'Body',
      });

      expect(action).toBeInstanceOf(EmailAction);
    });

    it('uses custom database service', () => {
      const customDbService = new MockDatabaseService();
      const router = new ActionRouter({ databaseService: customDbService });
      const action = router.createAction('database', {
        operation: 'create',
        table: 'test',
        data: { field: 'value' },
      });

      expect(action).toBeInstanceOf(DatabaseAction);
    });

    it('uses both custom services', () => {
      const customEmailService = new MockEmailService();
      const customDbService = new MockDatabaseService();
      const router = new ActionRouter({
        emailService: customEmailService,
        databaseService: customDbService,
      });

      const emailAction = router.createAction('email', {
        to: 'test@example.com',
        subject: 'Test',
        template: 'Body',
      });
      const dbAction = router.createAction('database', {
        operation: 'create',
        table: 'test',
        data: { field: 'value' },
      });

      expect(emailAction).toBeInstanceOf(EmailAction);
      expect(dbAction).toBeInstanceOf(DatabaseAction);
    });

    it('uses default services when none provided', () => {
      const router = new ActionRouter();

      const logAction = router.createAction('log');
      const emailAction = router.createAction('email', {
        to: 'test@example.com',
        subject: 'Test',
        template: 'Body',
      });
      const dbAction = router.createAction('database', {
        operation: 'create',
        table: 'test',
        data: { field: 'value' },
      });

      expect(logAction).toBeInstanceOf(LogAction);
      expect(emailAction).toBeInstanceOf(EmailAction);
      expect(dbAction).toBeInstanceOf(DatabaseAction);
    });
  });

  describe('defaultActionRouter', () => {
    it('exports default router instance', () => {
      expect(defaultActionRouter).toBeInstanceOf(ActionRouter);
    });

    it('can create actions using default router', () => {
      const action = defaultActionRouter.createAction('log', { prefix: 'default' });
      expect(action).toBeInstanceOf(LogAction);
    });

    it('creates all action types with default router', () => {
      const logAction = defaultActionRouter.createAction('log');
      const emailAction = defaultActionRouter.createAction('email', {
        to: 'test@example.com',
        subject: 'Test',
        template: 'Body',
      });
      const dbAction = defaultActionRouter.createAction('database', {
        operation: 'create',
        table: 'test',
        data: { field: 'value' },
      });

      expect(logAction).toBeInstanceOf(LogAction);
      expect(emailAction).toBeInstanceOf(EmailAction);
      expect(dbAction).toBeInstanceOf(DatabaseAction);
    });
  });
});
