import { HookSystem } from '../HookSystem';
import { InMemoryHookStorage } from '../storage/InMemoryHookStorage';
import { HookConfig, HookActionContext, HookAction } from '../types';

class DummyAction implements HookAction {
  public readonly calls: HookActionContext[] = [];

  async execute(context: HookActionContext): Promise<void> {
    this.calls.push(context);
  }
}

describe('HookSystem', () => {
  it('registers and triggers a hook', async () => {
    const storage = new InMemoryHookStorage();
    const hookSystem = new HookSystem(storage);
    const action = new DummyAction();
    const hook: HookConfig = {
      id: '1',
      name: 'test-hook',
      eventPattern: 'user.created',
      actionType: 'log',
      actionConfig: {},
      isActive: true,
      priority: 0,
    };

    await hookSystem.registerHook(hook, action as any);
    await hookSystem.trigger('user.created', { userId: 1 });

    expect(action.calls).toHaveLength(1);
    expect(action.calls[0]).toEqual({
      eventName: 'user.created',
      payload: { userId: 1 },
    });
  });
});
