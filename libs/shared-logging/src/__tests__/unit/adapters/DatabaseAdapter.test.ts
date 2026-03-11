import { Op } from 'sequelize';
import { DatabaseAdapter, type DatabaseAdapterConfig } from '../../../adapters/DatabaseAdapter';
import type { AuditLogEntry, LogEntry } from '../../../interfaces/LogEntry';

const mockLoggerError = jest.fn();
const mockLoggerInfo = jest.fn();

jest.mock('../../../services/logger', () => ({
  getLogger: () => ({
    error: mockLoggerError,
    info: mockLoggerInfo,
  }),
}));

const baseLog: LogEntry = {
  timestamp: new Date('2025-01-01T00:00:00.000Z'),
  level: 'info',
  message: 'hello',
  traceId: 'trace',
  service: 'svc',
  metadata: {},
};

const auditLog: AuditLogEntry = {
  ...baseLog,
  type: 'audit',
  userId: 'u1',
  action: 'create',
  resourceType: 'book',
  resourceId: 'b1',
  details: { ok: true },
  ipAddress: '127.0.0.1',
  userAgent: 'agent',
};

const createAdapter = (
  model: Pick<DatabaseAdapterConfig['model'], 'bulkCreate' | 'findAll' | 'findOne'>,
  overrides: Partial<DatabaseAdapterConfig> = {}
): DatabaseAdapter => {
  const config: DatabaseAdapterConfig = {
    name: 'database-test',
    model: model as unknown as DatabaseAdapterConfig['model'],
    ...overrides,
  };
  return new DatabaseAdapter(config);
};

describe('DatabaseAdapter', () => {
  beforeEach(() => {
    mockLoggerError.mockClear();
    mockLoggerInfo.mockClear();
  });

  it('filters non-audit logs and bulk inserts audit logs', async () => {
    const model = {
      bulkCreate: jest.fn().mockResolvedValue(undefined),
      findAll: jest.fn(),
      findOne: jest.fn(),
    };

    const adapter = createAdapter(model);
    await expect(adapter.write([baseLog, auditLog])).resolves.toBeUndefined();

    expect(model.bulkCreate).toHaveBeenCalledTimes(1);
    expect(model.bulkCreate).toHaveBeenCalledWith([
      expect.objectContaining({
        userId: 'u1',
        action: 'create',
        resourceType: 'book',
        resourceId: 'b1',
        details: { ok: true },
        ipAddress: '127.0.0.1',
        userAgent: 'agent',
        createdAt: auditLog.timestamp,
      }),
    ]);
  });

  it('uses empty object when audit log details are missing', async () => {
    const model = {
      bulkCreate: jest.fn().mockResolvedValue(undefined),
      findAll: jest.fn(),
      findOne: jest.fn(),
    };

    const adapter = createAdapter(model);
    const withoutDetails: AuditLogEntry = { ...auditLog, details: undefined };

    await adapter.write([withoutDetails]);
    expect(model.bulkCreate).toHaveBeenCalledWith([
      expect.objectContaining({ details: {} }),
    ]);
  });

  it('does nothing when there are no audit logs', async () => {
    const model = {
      bulkCreate: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
    };

    const adapter = createAdapter(model);
    await expect(adapter.write([baseLog])).resolves.toBeUndefined();
    expect(model.bulkCreate).not.toHaveBeenCalled();
  });

  it('does nothing when disabled', async () => {
    const model = {
      bulkCreate: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
    };

    const adapter = createAdapter(model, { enabled: false });
    await expect(adapter.write([auditLog])).resolves.toBeUndefined();
    expect(model.bulkCreate).not.toHaveBeenCalled();
  });

  it('rethrows errors and logs on write failures', async () => {
    const model = {
      bulkCreate: jest.fn().mockRejectedValue(new Error('db-down')),
      findAll: jest.fn(),
      findOne: jest.fn(),
    };

    const adapter = createAdapter(model, { retries: 0 });
    await expect(adapter.write([auditLog])).rejects.toThrow('db-down');
    expect(mockLoggerError).toHaveBeenCalledWith(
      { adapter: 'database', details: ['db-down'] },
      'Failed to write audit logs to database:'
    );
  });

  it('queries with filters and maps records to AuditLogEntry', async () => {
    const record = {
      get: jest.fn(() => ({
        userId: 'u1',
        action: 'update',
        resourceType: 'book',
        resourceId: 'b2',
        details: { a: 1 },
        ipAddress: '1.1.1.1',
        userAgent: 'ua',
        createdAt: new Date('2025-01-02T00:00:00.000Z'),
      })),
    };

    const model = {
      bulkCreate: jest.fn(),
      findAll: jest.fn().mockResolvedValue([record]),
      findOne: jest.fn(),
    };

    const adapter = createAdapter(model);
    const startDate = new Date('2025-01-01T00:00:00.000Z');
    const endDate = new Date('2025-01-03T00:00:00.000Z');

    const results = await adapter.query({
      userId: 'u1',
      resourceType: 'book',
      action: 'update',
      startDate,
      endDate,
      limit: 10,
      offset: 5,
    });

    expect(model.findAll).toHaveBeenCalledTimes(1);
    const args = model.findAll.mock.calls[0]?.[0];
    expect(args.limit).toBe(10);
    expect(args.offset).toBe(5);
    expect(args.where.userId).toBe('u1');
    expect(args.where.resourceType).toBe('book');
    expect(args.where.action).toBe('update');
    expect(args.where.createdAt[Op.gte]).toEqual(startDate);
    expect(args.where.createdAt[Op.lte]).toEqual(endDate);

    expect(results).toEqual([
      expect.objectContaining({
        type: 'audit',
        userId: 'u1',
        action: 'update',
        resourceType: 'book',
        resourceId: 'b2',
      }),
    ]);
  });

  it('queries with no filters and uses defaults', async () => {
    const model = {
      bulkCreate: jest.fn(),
      findAll: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
    };

    const adapter = createAdapter(model);
    await adapter.query({});

    const args = model.findAll.mock.calls[0]?.[0];
    expect(args.where).toEqual({});
    expect(args.limit).toBe(100);
    expect(args.offset).toBe(0);
  });

  it('queries with only startDate', async () => {
    const model = {
      bulkCreate: jest.fn(),
      findAll: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
    };

    const adapter = createAdapter(model);
    const startDate = new Date('2025-01-01T00:00:00.000Z');
    await adapter.query({ startDate });

    const args = model.findAll.mock.calls[0]?.[0];
    expect(args.where.createdAt[Op.gte]).toEqual(startDate);
    expect(args.where.createdAt[Op.lte]).toBeUndefined();
  });

  it('returns false on healthCheck failures', async () => {
    const model = {
      bulkCreate: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn().mockRejectedValue(new Error('db-down')),
    };

    const adapter = createAdapter(model);
    await expect(adapter.healthCheck()).resolves.toBe(false);
  });

  it('returns true on successful healthCheck', async () => {
    const model = {
      bulkCreate: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn().mockResolvedValue({}),
    };

    const adapter = createAdapter(model);
    await expect(adapter.healthCheck()).resolves.toBe(true);
  });

  it('logs and rethrows query errors', async () => {
    const model = {
      bulkCreate: jest.fn(),
      findAll: jest.fn().mockRejectedValue(new Error('query-fail')),
      findOne: jest.fn(),
    };

    const adapter = createAdapter(model);
    await expect(adapter.query({ userId: 'u1' })).rejects.toThrow('query-fail');
    expect(mockLoggerError).toHaveBeenCalledWith(
      { adapter: 'database', details: ['query-fail'] },
      'Failed to query audit logs from database:'
    );
  });
});
