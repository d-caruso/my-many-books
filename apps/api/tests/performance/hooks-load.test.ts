import { HookAction, HookConfig, HookSystem, InMemoryHookStorage, replaceTemplateVariables } from '@my-many-books/hookey';
import { performance } from 'perf_hooks';

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const waitForExecutionCount = async (
  storage: InMemoryHookStorage,
  expectedCount: number,
  timeoutMs = 15000
): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const stats = await storage.getStats();
    if (stats.totalExecutions >= expectedCount) {
      return;
    }
    await sleep(25);
  }
  throw new Error(`Timed out waiting for ${expectedCount} executions`);
};

describe('HookSystem load characteristics', () => {
  jest.setTimeout(60000);

  it('processes 1k events across 100 hooks with controlled resources', async () => {
    const storage = new InMemoryHookStorage();
    const system = new HookSystem(storage);
    const hookCount = 100;
    const eventsToFire = 1000;

    const noopAction: HookAction = {
      execute: async () => {
        // Simulate lightweight async work
        return new Promise<void>((resolve) => setImmediate(resolve));
      },
    };

    for (let index = 0; index < hookCount; index += 1) {
      const hook: HookConfig = {
        id: `hook-${index + 1}`,
        name: `Performance Hook ${index + 1}`,
        eventPattern: `perf.event.${index + 1}`,
        actionType: 'log',
        isActive: true,
        priority: 1,
      };
      await system.registerExistingHook(hook, { ...noopAction });
    }

    const startHeap = process.memoryUsage().heapUsed;
    const startTime = performance.now();
    for (let i = 0; i < eventsToFire; i += 1) {
      const targetHook = (i % hookCount) + 1;
      await system.trigger(`perf.event.${targetHook}`, { attempt: i });
    }
    await waitForExecutionCount(storage, eventsToFire, 20000);

    const durationSeconds = (performance.now() - startTime) / 1000;
    const throughput = eventsToFire / durationSeconds;
    const heapDeltaMb = (process.memoryUsage().heapUsed - startHeap) / (1024 * 1024);

    expect(throughput).toBeGreaterThanOrEqual(200);
    expect(heapDeltaMb).toBeLessThan(32);
    const stats = await storage.getStats();
    expect(stats.totalExecutions).toBe(eventsToFire);
    expect(stats.failedExecutions).toBe(0);
  });

  it('handles 10KB payloads and deep template rendering without regressions', async () => {
    const storage = new InMemoryHookStorage();
    const system = new HookSystem(storage);
    const renderedMessages: string[] = [];

    const templateAction: HookAction = {
      execute: async ({ payload }) => {
        const template =
          'User {{user.profile.name}} created {{book.title}} ({{book.meta.isbn}}) with blob size {{book.meta.blobSize}}';
        const message = replaceTemplateVariables(template, payload as Record<string, unknown>);
        renderedMessages.push(message);
      },
    };

    const templateHook: HookConfig = {
      id: 'template-hook',
      name: 'Template Expansion Hook',
      eventPattern: 'book.create.after',
      actionType: 'log',
      isActive: true,
      priority: 5,
    };
    await system.registerExistingHook(templateHook, templateAction);

    const largeBlob = 'x'.repeat(10_240);
    const payload = {
      user: { profile: { name: 'Load Tester', email: 'qa@example.com' } },
      book: {
        title: 'Scaling Hooks',
        meta: {
          isbn: '978-1-4028-9462-6',
          blob: largeBlob,
          blobSize: largeBlob.length,
        },
      },
    };

    const startHeap = process.memoryUsage().heapUsed;
    await system.trigger('book.create.after', payload);
    await waitForExecutionCount(storage, 1);

    expect(renderedMessages).toHaveLength(1);
    expect(renderedMessages[0]).toContain('Load Tester');
    expect(renderedMessages[0]).toContain('Scaling Hooks');
    expect(renderedMessages[0]).toContain('10240');

    const executions = await storage.getExecutions('template-hook');
    expect(executions).toHaveLength(1);
    const execution = executions[0];
    if (!execution) {
      throw new Error('Execution log was not recorded for template hook');
    }
    expect(execution.executionTimeMs ?? 0).toBeLessThan(100);

    const heapDeltaMb = (process.memoryUsage().heapUsed - startHeap) / (1024 * 1024);
    expect(heapDeltaMb).toBeLessThan(8);
  });
});
