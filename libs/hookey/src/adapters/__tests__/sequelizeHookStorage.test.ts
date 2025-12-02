import { Sequelize } from 'sequelize';
import { SequelizeHookStorage } from '../sequelizeHookStorage';

describe('SequelizeHookStorage', () => {
  let sequelize: Sequelize;
  let storage: SequelizeHookStorage;

  beforeEach(async () => {
    sequelize = new Sequelize('sqlite::memory:', { logging: false });
    storage = new SequelizeHookStorage(sequelize);
    await storage.init();
  });

  afterEach(async () => {
    await sequelize.close();
  });

  it('persists hooks and executions', async () => {
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
    expect(executions[0].hookId).toBe(hook.id);

    const stats = await storage.getStats();
    expect(stats.totalHooks).toBe(1);
    expect(stats.totalExecutions).toBe(1);
  });
});
