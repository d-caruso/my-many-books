import { Sequelize } from 'sequelize';
import { SequelizeHookStorage } from '../sequelizeHookStorage';

describe('SequelizeHookStorage', () => {
  let sequelize: Sequelize | undefined;
  let storage: SequelizeHookStorage;
  let sqliteAvailable = true;

  beforeAll(async () => {
    try {
      await import('sqlite3');
    } catch {
      sqliteAvailable = false;
    }
  });

  beforeEach(async () => {
    if (!sqliteAvailable) {
      return;
    }

    sequelize = new Sequelize('sqlite::memory:', { logging: false });
    storage = new SequelizeHookStorage(sequelize);
    await storage.init();
  });

  afterEach(async () => {
    if (sequelize) {
      await sequelize.close();
      sequelize = undefined;
    }
  });

  it('persists hooks and executions', async () => {
    if (!sqliteAvailable) {
      return;
    }

    const hook = await storage.createHook({
      name: 'create-user',
      eventPattern: 'user.created',
      actionType: 'log',
      isActive: true,
      priority: 1,
    });

    expect(hook.id).toBeDefined();

    await storage.logExecution({
      hookId: hook.id,
      eventName: 'user.created',
      success: true,
      executedAt: new Date(),
    });

    const hooks = await storage.getHooks({ isActive: true });
    expect(hooks).toHaveLength(1);

    const executions = await storage.getExecutions(hook.id);
    const firstExecution = executions[0];
    if (!firstExecution) {
      throw new Error('Expected at least one execution log');
    }
    expect(firstExecution.hookId).toBe(hook.id);

    const stats = await storage.getStats();
    expect(stats.totalHooks).toBe(1);
    expect(stats.totalExecutions).toBe(1);
  });
});
