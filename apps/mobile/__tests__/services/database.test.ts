// Test for database service and migrations

describe('Database Service', () => {
  it('should import database service', () => {
    const dbModule = require('../../src/services/database/DatabaseService');
    expect(dbModule.databaseService).toBeDefined();
  });

  it('should import migration system', () => {
    const migrationModule = require('../../src/services/database/migrations');
    expect(migrationModule.migrationSystem).toBeDefined();
  });

  it('should import database schema', () => {
    const schemaModule = require('../../src/services/database/schema');
    expect(schemaModule.CREATE_BOOKS_TABLE).toBeDefined();
    expect(schemaModule.ALL_TABLES).toBeDefined();
    expect(Array.isArray(schemaModule.ALL_TABLES)).toBe(true);
  });
});
