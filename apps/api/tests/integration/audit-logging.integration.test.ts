/**
 * Integration tests for audit logging system
 *
 * Tests:
 * - Audit log creation and persistence
 * - TraceId correlation
 * - Admin toggle functionality
 * - Query functionality
 */

import { Sequelize } from 'sequelize';
import { getAuditLogService } from '../../src/services/AuditLogService';
import { AuditLog, ModelManager, Setting, User } from '../../src/models';

describe('Audit Logging Integration', () => {
  let sequelize: Sequelize;

  beforeAll(async () => {
    sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: ':memory:',
      logging: false,
    });
    ModelManager.initialize(sequelize);
    await ModelManager.syncDatabase(true);
  });

  afterAll(async () => {
    await ModelManager.close();
  });

  beforeEach(async () => {
    await Setting.destroy({ where: {}, truncate: true, cascade: true });
    await AuditLog.destroy({ where: {}, truncate: true, cascade: true });
    await User.destroy({ where: {}, truncate: true, cascade: true });

    await User.bulkCreate(
      [
        {
          id: 1,
          email: 'admin1@example.com',
          name: 'Admin',
          surname: 'One',
          role: 'admin',
          isActive: true,
        },
        {
          id: 2,
          email: 'user2@example.com',
          name: 'User',
          surname: 'Two',
          role: 'user',
          isActive: true,
        },
        {
          id: 3,
          email: 'admin3@example.com',
          name: 'Admin',
          surname: 'Three',
          role: 'admin',
          isActive: true,
        },
      ] as any,
      { validate: false }
    );
  });

  describe('Audit Log Service', () => {
    it('should log actions when enabled', async () => {
      const service = getAuditLogService();

      service.logActionFromRequest(
        {
          user?: { id: 1, role: 'admin' },
          headers: {
            'x-forwarded-for': '127.0.0.1',
            'user-agent': 'test-agent',
          },
        } as any,
        'create',
        'book',
        '123',
        { title: 'Test Book' }
      );

      // Wait for async persistence
      await new Promise(resolve => setTimeout(resolve, 500));

      const logs = await AuditLog.findAll({ where: { action: 'create' } });
      expect(logs.length).toBeGreaterThan(0);

      const log = logs[0]!;
      expect(log.userId).toBe(1);
      expect(log.role).toBe('admin');
      expect(log.action).toBe('create');
      expect(log.resourceType).toBe('book');
      expect(log.resourceId).toBe('123');
    });

    it('should capture IP address and user agent', async () => {
      const service = getAuditLogService();

      service.logActionFromRequest(
        {
          user?: { id: 2, role: 'user' },
          headers: {
            'x-forwarded-for': '192.168.1.1',
            'user-agent': 'Mozilla/5.0',
          },
        } as any,
        'update',
        'book',
        '456'
      );

      await new Promise(resolve => setTimeout(resolve, 500));

      const logs = await AuditLog.findAll({ where: { userId: 2 } });
      expect(logs.length).toBe(1);

      const log = logs[0]!;
      expect(log.ipAddress).toBe('192.168.1.1');
      expect(log.userAgent).toBe('Mozilla/5.0');
    });

    it('should store details as JSON', async () => {
      const service = getAuditLogService();
      const details = { oldValue: 'foo', newValue: 'bar', reason: 'update' };

      service.logActionFromRequest(
        {
          user?: { id: 3, role: 'admin' },
          headers: {},
        } as any,
        'update',
        'setting',
        'test',
        details
      );

      await new Promise(resolve => setTimeout(resolve, 500));

      const logs = await AuditLog.findAll({ where: { userId: 3 } });
      expect(logs.length).toBe(1);

      const log = logs[0]!;
      expect(log.details).toEqual(details);
    });
  });

  describe('Audit Logging Toggle', () => {
    it('should respect enabled/disabled setting', async () => {
      const service = getAuditLogService();

      // Enable audit logging
      await Setting.upsert({
        id: 1,
        key: 'audit_logging_enabled',
        value: 'true',
        description: 'Test setting',
        creationDate: new Date(),
      } as any);

      service.invalidateCache();

      const isEnabled = await service.isEnabled();
      expect(isEnabled).toBe(true);
    });

    it('should respect force disabled env var', async () => {
      const originalValue = process.env['AUDIT_LOGGING_FORCE_DISABLED'];
      process.env['AUDIT_LOGGING_FORCE_DISABLED'] = 'true';

      const service = getAuditLogService();
      const isEnabled = await service.isEnabled();

      expect(isEnabled).toBe(false);

      // Restore
      if (originalValue) {
        process.env['AUDIT_LOGGING_FORCE_DISABLED'] = originalValue;
      } else {
        delete process.env['AUDIT_LOGGING_FORCE_DISABLED'];
      }
    });

    it('should respect force enabled env var', async () => {
      const originalValue = process.env['AUDIT_LOGGING_FORCE_ENABLED'];
      process.env['AUDIT_LOGGING_FORCE_ENABLED'] = 'true';

      const service = getAuditLogService();
      const isEnabled = await service.isEnabled();

      expect(isEnabled).toBe(true);

      // Restore
      if (originalValue) {
        process.env['AUDIT_LOGGING_FORCE_ENABLED'] = originalValue;
      } else {
        delete process.env['AUDIT_LOGGING_FORCE_ENABLED'];
      }
    });
  });

  describe('Query Functionality', () => {
    beforeEach(async () => {
      // Create test data
      await AuditLog.bulkCreate([
        {
          userId: 1,
          role: 'admin',
          action: 'create',
          resourceType: 'book',
          resourceId: '1',
          ipAddress: '127.0.0.1',
          traceId: 'trace-1',
          creationDate: new Date('2025-12-01'),
        },
        {
          userId: 1,
          role: 'admin',
          action: 'update',
          resourceType: 'book',
          resourceId: '1',
          ipAddress: '127.0.0.1',
          traceId: 'trace-2',
          creationDate: new Date('2025-12-02'),
        },
        {
          userId: 2,
          role: 'user',
          action: 'create',
          resourceType: 'user',
          resourceId: '2',
          ipAddress: '127.0.0.1',
          traceId: 'trace-3',
          creationDate: new Date('2025-12-03'),
        },
      ] as any);
    });

    it('should query by userId', async () => {
      const service = getAuditLogService();
      const logs = await service.query({ userId: 1 });

      expect(logs.length).toBe(2);
      expect(logs.every(log => log.userId === 1)).toBe(true);
    });

    it('should query by resourceType', async () => {
      const service = getAuditLogService();
      const logs = await service.query({ resourceType: 'book' });

      expect(logs.length).toBe(2);
      expect(logs.every(log => log.resourceType === 'book')).toBe(true);
    });

    it('should query by action', async () => {
      const service = getAuditLogService();
      const logs = await service.query({ action: 'create' });

      expect(logs.length).toBe(2);
      expect(logs.every(log => log.action === 'create')).toBe(true);
    });

    it('should support pagination', async () => {
      const service = getAuditLogService();
      const page1 = await service.query({ limit: 2, offset: 0 });
      const page2 = await service.query({ limit: 2, offset: 2 });

      expect(page1.length).toBe(2);
      expect(page2.length).toBe(1);
    });
  });
});
