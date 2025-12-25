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
  const {
    HookExecution,
    Hook,
    BookAuthor,
    BookCategory,
    Book,
    Author,
    Category,
    User,
    AuditLog,
    Setting,
    AppSetting,
  } = ModelManager.getModels();

  await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');

  await HookExecution.destroy({ where: {}, truncate: true });
  await Hook.destroy({ where: {}, truncate: true });
  await BookAuthor.destroy({ where: {}, truncate: true });
  await BookCategory.destroy({ where: {}, truncate: true });
  await Book.destroy({ where: {}, truncate: true });
  await Author.destroy({ where: {}, truncate: true });
  await Category.destroy({ where: {}, truncate: true });
  await AuditLog.destroy({ where: {}, truncate: true });
  await Setting.destroy({ where: {}, truncate: true });
  await AppSetting.destroy({ where: {}, truncate: true });
  await User.destroy({ where: {}, truncate: true });

  await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
};

const seedUsers = async (): Promise<{ adminId: number; userId: number }> => {
  const { User } = ModelManager.getModels();

  const admin = await User.create({
    email: seedConfig.adminEmail,
    name: seedConfig.adminName,
    surname: seedConfig.adminSurname,
    isActive: true,
    role: USER_ROLES.ADMIN,
  });

  const user = await User.create({
    email: seedConfig.userEmail,
    name: seedConfig.userName,
    surname: seedConfig.userSurname,
    isActive: true,
    role: USER_ROLES.USER,
  });

  return { adminId: admin.id, userId: user.id };
};

const seedBook = async (userId: number): Promise<void> => {
  const { Book } = ModelManager.getModels();

  await Book.create({
    isbnCode: seedConfig.seedIsbn,
    title: 'E2E Seed Book',
    userId,
  });
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
  });

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
  });
};

const resetDatabase = async (): Promise<void> => {
  const sequelize = await initializeDatabase();
  await truncateTables(sequelize);
};

const seedDatabase = async (): Promise<void> => {
  await initializeDatabase();
  const { adminId, userId } = await seedUsers();
  await seedBook(userId);
  const hookId = await seedHook(adminId);
  await seedExecution(hookId);
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
    await run(command);
  } finally {
    await closeDatabase();
  }
};

if (require.main === module) {
  main().catch((error) => {
    logger.error(
      { err: error instanceof Error ? error : new Error(String(error)) },
      'E2E seed script failed'
    );
    process.exitCode = 1;
  });
}
