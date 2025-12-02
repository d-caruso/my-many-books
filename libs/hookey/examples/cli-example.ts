import { HookSystem } from '../src/HookSystem';
import { LogAction } from '../src/actions/LogAction';

type UserPayload = {
  id: number;
  email: string;
  name: string;
};

async function runCliExample() {
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

  console.log('Triggering user.created via CLI example');
  await hookSystem.trigger('user.created', payload);
  console.log('Hook execution finished, check the log for details');
}

void runCliExample().catch(error => {
  console.error('Hookey CLI example failed', error);
});
