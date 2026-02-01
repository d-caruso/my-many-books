import { Sequelize, QueryTypes } from 'sequelize';
import { DatabaseActionTestService } from '../../../src/services/DatabaseActionTestService';
import { TABLE_NAMES } from '../../../src/utils/constants'

jest.mock('../../../src/config/database', () => ({
  default: {
    getInstance: jest.fn(),
  },
}));

jest.mock('sequelize');

describe('DatabaseActionTestService', () => {
  let sequelizeMock: jest.Mocked<Sequelize>;

  beforeEach(() => {
    sequelizeMock = new Sequelize('sqlite::memory:') as jest.Mocked<Sequelize>;
    sequelizeMock.query = jest.fn();
  });

  it('inserts record successfully', async () => {
    sequelizeMock.query.mockResolvedValue([{ id: 123 }] as any);
    const service = new DatabaseActionTestService(sequelizeMock);
    const result = await service.insertTestRecord(TABLE_NAMES.MOBILE_ANALYTICS_EVENTS, { foo: 'bar' });
    expect(sequelizeMock.query).toHaveBeenCalledWith(
      expect.stringContaining(`INSERT INTO ${TABLE_NAMES.MOBILE_ANALYTICS_EVENTS}`),
      expect.objectContaining({
        replacements: { payload: expect.any(String) },
        type: QueryTypes.INSERT,
      })
    );
    expect(result.success).toBe(true);
    expect(result.recordId).toBe(123);
  });

  it('returns failure when insert throws', async () => {
    sequelizeMock.query.mockRejectedValue(new Error('db error'));
    const service = new DatabaseActionTestService(sequelizeMock);
    const result = await service.insertTestRecord(TABLE_NAMES.MOBILE_ANALYTICS_EVENTS, {});
    expect(result.success).toBe(false);
    expect(result.error).toBe('db error');
  });
});