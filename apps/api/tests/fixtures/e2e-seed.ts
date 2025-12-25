import 'dotenv/config';

import type { Sequelize } from 'sequelize';
import { USER_ROLES } from '@my-many-books/shared-auth';
import { getLogger } from '@my-many-books/shared-logging';
import DatabaseConnection from '../../src/config/database';
import { ModelManager } from '../../src/models';

const logger = getLogger();

const getEnvString = (key: string, fallback: string): string => {
  return process.env[key] && String(process.env[key]).trim().length > 0
    ? String(process.env[key])
    : fallback;
};

const seedConfig = {
  adminEmail: getEnvString('E2E_ADMIN_EMAIL', 'admin@example.com'),
  adminName: getEnvString('E2E_ADMIN_NAME', 'Admin'),
  adminSurname: getEnvString('E2E_ADMIN_SURNAME', 'User'),
  userEmail: getEnvString('E2E_USER_EMAIL', 'reader@example.com'),
  userName: getEnvString('E2E_USER_NAME', 'Reader'),
  userSurname: getEnvString('E2E_USER_SURNAME', 'User'),
  seedIsbn: getEnvString('E2E_SEED_ISBN', '9780306406157'),
};

const initializeDatabase = async (): Promise<Sequelize> => {
  const sequelize = DatabaseConnection.getInstance();
  await sequelize.authenticate();
  if (!ModelManager.isInitialized()) {
    ModelManager.initialize(sequelize);
  }
  return sequelize;
};

const truncateTables = async (sequelize: Sequelize): Promise<void> => {
  const dialect = sequelize.getDialect();

  console.log(`[E2E Seed] Truncating tables for dialect: ${dialect}`);

  // Table names in dependency order (children first, parents last)
  const tableNames = [
    'hook_executions',
    'hooks',
    'book_authors',
    'book_categories',
    'books',
    'authors',
    'categories',
    'audit_logs',
    'settings',
    'app_settings',
    'users',
  ];

  if (dialect === 'mysql' || dialect === 'mariadb') {
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const tableName of tableNames) {
      console.log(`[E2E Seed] Truncating table: ${tableName}`);
      await sequelize.query(`TRUNCATE TABLE ${tableName}`);
    }
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
  } else if (dialect === 'sqlite') {
    await sequelize.query('PRAGMA foreign_keys = OFF');
    for (const tableName of tableNames) {
      console.log(`[E2E Seed] Deleting from table: ${tableName}`);
      await sequelize.query(`DELETE FROM ${tableName}`);
    }
    await sequelize.query('PRAGMA foreign_keys = ON');
  }

  console.log('[E2E Seed] All tables truncated successfully');
};

const seedUsers = async (): Promise<{ adminId: number; userId: number }> => {
  const { User } = ModelManager.getModels();

  const admin = await User.create({
    email: seedConfig.adminEmail,
    name: seedConfig.adminName,
    surname: seedConfig.adminSurname,
    isActive: true,
    role: USER_ROLES.ADMIN,
  } as any);

  const user = await User.create({
    email: seedConfig.userEmail,
    name: seedConfig.userName,
    surname: seedConfig.userSurname,
    isActive: true,
    role: USER_ROLES.USER,
  } as any);

  return { adminId: admin.id, userId: user.id };
};

const seedBook = async (userId: number): Promise<void> => {
  const { Book } = ModelManager.getModels();

  await Book.create({
    isbnCode: seedConfig.seedIsbn,
    title: 'E2E Seed Book',
    userId,
  } as any);
};

const seedHook = async (adminId: number): Promise<number> => {
  const { Hook } = ModelManager.getModels();

  const hook = await Hook.create({
    name: 'E2E Log Hook',
    description: 'Seeded hook for Cypress flows',
    eventPattern: 'book.create.after',
    actionType: 'log',
    actionConfig: {
      level: 'info',
      prefix: 'E2E',
    },
    isActive: true,
    priority: 5,
    createdBy: adminId,
  } as any);

  return hook.id;
};

const seedExecution = async (hookId: number): Promise<void> => {
  const { HookExecution } = ModelManager.getModels();

  await HookExecution.create({
    hookId,
    eventName: 'book.create.after',
    eventData: { seeded: true },
    success: true,
    executionTimeMs: 42,
    executedAt: new Date(),
  } as any);
};

const resetDatabase = async (): Promise<void> => {
  const sequelize = await initializeDatabase();
  await truncateTables(sequelize);
};

const seedDatabase = async (): Promise<void> => {
  console.log('[E2E Seed] Initializing database...');
  await initializeDatabase();
  console.log('[E2E Seed] Seeding users...');
  const { adminId, userId } = await seedUsers();
  console.log(`[E2E Seed] Created users - adminId: ${adminId}, userId: ${userId}`);
  console.log('[E2E Seed] Seeding book...');
  await seedBook(userId);
  console.log('[E2E Seed] Seeding hook...');
  const hookId = await seedHook(adminId);
  console.log(`[E2E Seed] Created hook - hookId: ${hookId}`);
  console.log('[E2E Seed] Seeding execution...');
  await seedExecution(hookId);
  console.log('[E2E Seed] Seeding completed successfully');
};

const closeDatabase = async (): Promise<void> => {
  await ModelManager.close();
  await DatabaseConnection.closeConnection();
};

const run = async (command: string): Promise<void> => {
  switch (command) {
    case 'reset':
      await resetDatabase();
      await seedDatabase();
      return;
    case 'seed':
      await seedDatabase();
      return;
    case 'clear':
      await resetDatabase();
      return;
    default:
      throw new Error(`Unknown command: ${command}`);
  }
};

const main = async (): Promise<void> => {
  const command = process.argv[2] || 'reset';

  try {
    console.log(`[E2E Seed] Running command: ${command}`);
    await run(command);
    console.log(`[E2E Seed] Command ${command} completed successfully`);
  } catch (error) {
    console.error(`[E2E Seed] Command ${command} failed:`, error);
    throw error;
  } finally {
    await closeDatabase();
  }
};

if (require.main === module) {
  main().catch((error) => {
    console.error('[E2E Seed] Fatal error:', error);
    logger.error(
      { err: error instanceof Error ? error : new Error(String(error)) },
      'E2E seed script failed'
    );
    process.exitCode = 1;
  });
}
