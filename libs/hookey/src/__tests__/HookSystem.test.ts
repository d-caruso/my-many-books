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
  it('registers and triggers a hook with exact pattern match', async () => {
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

  it('triggers hook with wildcard pattern: user.*', async () => {
    const storage = new InMemoryHookStorage();
    const hookSystem = new HookSystem(storage);
    const action = new DummyAction();
    const hook: HookConfig = {
      id: '2',
      name: 'user-wildcard-hook',
      eventPattern: 'user.*',
      actionType: 'log',
      actionConfig: {},
      isActive: true,
      priority: 0,
    };

    await hookSystem.registerHook(hook, action);

    // Trigger multiple events matching the pattern
    await hookSystem.trigger('user.created', { userId: 1 });
    await hookSystem.trigger('user.updated', { userId: 2 });
    await hookSystem.trigger('user.deleted', { userId: 3 });

    expect(action.calls).toHaveLength(3);
    expect(action.calls[0].eventName).toBe('user.created');
    expect(action.calls[1].eventName).toBe('user.updated');
    expect(action.calls[2].eventName).toBe('user.deleted');
  });

  it('triggers hook with double wildcard pattern: **', async () => {
    const storage = new InMemoryHookStorage();
    const hookSystem = new HookSystem(storage);
    const action = new DummyAction();
    const hook: HookConfig = {
      id: '3',
      name: 'catch-all-hook',
      eventPattern: '**',
      actionType: 'log',
      actionConfig: {},
      isActive: true,
      priority: 0,
    };

    await hookSystem.registerHook(hook, action);

    // Trigger various events
    await hookSystem.trigger('user.created', { userId: 1 });
    await hookSystem.trigger('book.created', { bookId: 10 });
    await hookSystem.trigger('auth.login.success', { sessionId: 'abc' });

    expect(action.calls).toHaveLength(3);
    expect(action.calls[0].eventName).toBe('user.created');
    expect(action.calls[1].eventName).toBe('book.created');
    expect(action.calls[2].eventName).toBe('auth.login.success');
  });

  it('triggers hook with multi-level wildcard: book.*.*', async () => {
    const storage = new InMemoryHookStorage();
    const hookSystem = new HookSystem(storage);
    const action = new DummyAction();
    const hook: HookConfig = {
      id: '4',
      name: 'book-multilevel-hook',
      eventPattern: 'book.*.*',
      actionType: 'log',
      actionConfig: {},
      isActive: true,
      priority: 0,
    };

    await hookSystem.registerHook(hook, action);

    // Should match
    await hookSystem.trigger('book.status.changed', { bookId: 1 });
    await hookSystem.trigger('book.author.updated', { bookId: 2 });

    // Should not match (only 2 levels)
    await hookSystem.trigger('book.created', { bookId: 3 });

    expect(action.calls).toHaveLength(2);
    expect(action.calls[0].eventName).toBe('book.status.changed');
    expect(action.calls[1].eventName).toBe('book.author.updated');
  });

  it('triggers hook with suffix wildcard: *.created', async () => {
    const storage = new InMemoryHookStorage();
    const hookSystem = new HookSystem(storage);
    const action = new DummyAction();
    const hook: HookConfig = {
      id: '5',
      name: 'creation-events-hook',
      eventPattern: '*.created',
      actionType: 'log',
      actionConfig: {},
      isActive: true,
      priority: 0,
    };

    await hookSystem.registerHook(hook, action);

    await hookSystem.trigger('user.created', { userId: 1 });
    await hookSystem.trigger('book.created', { bookId: 1 });
    await hookSystem.trigger('author.created', { authorId: 1 });

    // Should not match
    await hookSystem.trigger('user.updated', { userId: 2 });

    expect(action.calls).toHaveLength(3);
    expect(action.calls[0].eventName).toBe('user.created');
    expect(action.calls[1].eventName).toBe('book.created');
    expect(action.calls[2].eventName).toBe('author.created');
  });

  it('does not trigger hook for non-matching pattern', async () => {
    const storage = new InMemoryHookStorage();
    const hookSystem = new HookSystem(storage);
    const action = new DummyAction();
    const hook: HookConfig = {
      id: '6',
      name: 'user-only-hook',
      eventPattern: 'user.*',
      actionType: 'log',
      actionConfig: {},
      isActive: true,
      priority: 0,
    };

    await hookSystem.registerHook(hook, action);

    // Trigger non-matching event
    await hookSystem.trigger('book.created', { bookId: 1 });

    expect(action.calls).toHaveLength(0);
  });

  it('stores execution logs with actual event names for wildcard patterns', async () => {
    const storage = new InMemoryHookStorage();
    const hookSystem = new HookSystem(storage);
    const action = new DummyAction();
    const hook: HookConfig = {
      id: '7',
      name: 'audit-hook',
      eventPattern: 'user.*',
      actionType: 'log',
      actionConfig: {},
      isActive: true,
      priority: 0,
    };

    await hookSystem.registerHook(hook, action);
    await hookSystem.trigger('user.created', { userId: 1 });

    const executions = await storage.getExecutions('7');
    expect(executions).toHaveLength(1);
    expect(executions[0].eventName).toBe('user.created');
    expect(executions[0].success).toBe(true);
  });

  it('registers existing hooks without persisting duplicates', async () => {
    const storage = new InMemoryHookStorage();
    const hookSystem = new HookSystem(storage);
    const action = new DummyAction();
    const hook: HookConfig = {
      id: 'existing-hook',
      name: 'preloaded-hook',
      eventPattern: 'book.created',
      actionType: 'log',
      actionConfig: {},
      isActive: true,
      priority: 5,
    };

    const createSpy = jest.spyOn(storage, 'createHook');

    await hookSystem.registerExistingHook(hook, action);
    await hookSystem.trigger('book.created', { bookId: 42 });

    expect(createSpy).not.toHaveBeenCalled();
    expect(action.calls).toHaveLength(1);
    expect(action.calls[0].eventName).toBe('book.created');
  });
});
