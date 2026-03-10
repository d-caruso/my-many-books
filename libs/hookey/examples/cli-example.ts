import { HookSystem } from '../src/HookSystem';
import { LogAction } from '../src/actions/LogAction';
import { getLogger } from '@my-many-books/shared-logging';

type UserPayload = {
  id: number;
  email: string;
  name: string;
};

async function runCliExample() {
  const logger = getLogger();
  const hookSystem = new HookSystem();
  await hookSystem.registerHook(
    {
      id: 'cli-welcome',
      name: 'CLI welcome logger',
      eventPattern: 'user.*',
      actionType: 'log',
      isActive: true,
      priority: 1,
    },
    new LogAction('hookey-cli')
  );

  const payload: UserPayload = {
    id: 42,
    email: 'clerk@hookey.local',
    name: 'Hookey User',
  };

  logger.info('Triggering user.created via CLI example');
  await hookSystem.trigger('user.created', payload);
  logger.info('Hook execution finished, check the log for details');
}

void runCliExample().catch(error => {
  const logger = getLogger();
  const err = error instanceof Error ? error : new Error(String(error));
  logger.error({ err }, 'Hookey CLI example failed');
});
