import type { Request, Response } from 'express';
import type { Sequelize } from 'sequelize';
import { USER_ROLES } from '@my-many-books/shared-auth';
import { getLogger } from '@my-many-books/shared-logging';
import DatabaseConnection from '../config/database';
import { ModelManager } from '../models';

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

const truncateTables = async (sequelize: Sequelize): Promise<void> => {
  const dialect = sequelize.getDialect();

  logger.info({ dialect }, 'Truncating tables for E2E tests');

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
      await sequelize.query(`TRUNCATE TABLE ${tableName}`);
    }
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
  } else if (dialect === 'sqlite') {
    await sequelize.query('PRAGMA foreign_keys = OFF');
    for (const tableName of tableNames) {
      await sequelize.query(`DELETE FROM ${tableName}`);
    }
    await sequelize.query('PRAGMA foreign_keys = ON');
  }

  logger.info('Tables truncated successfully for E2E tests');
};

const seedE2EData = async (): Promise<void> => {
  const { User, Book, Hook, HookExecution } = ModelManager.getModels();

  // Create users
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

  // Create a book
  await Book.create({
    isbnCode: seedConfig.seedIsbn,
    title: 'E2E Seed Book',
    userId: user.id,
  } as any);

  // Create a hook
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
    createdBy: admin.id,
  } as any);

  // Create hook execution
  await HookExecution.create({
    hookId: hook.id,
    eventName: 'book.create.after',
    eventData: { seeded: true },
    success: true,
    executionTimeMs: 42,
    executedAt: new Date(),
  } as any);

  logger.info({
    adminId: admin.id,
    userId: user.id,
    hookId: hook.id,
  }, 'E2E data seeded successfully');
};

export const resetE2EDatabase = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const sequelize = DatabaseConnection.getInstance();
    await truncateTables(sequelize);
    await seedE2EData();

    res.json({ success: true, message: 'Database reset and seeded' });
  } catch (error) {
    logger.error({ err: error }, 'Failed to reset E2E database');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const seedE2EDatabase = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    await seedE2EData();
    res.json({ success: true, message: 'Database seeded' });
  } catch (error) {
    logger.error({ err: error }, 'Failed to seed E2E database');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
