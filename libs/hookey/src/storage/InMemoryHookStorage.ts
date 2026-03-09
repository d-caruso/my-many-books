import { HookConfig, HookExecution, HookStorage, HookStorageStats } from '../types';

export class InMemoryHookStorage implements HookStorage {
  private hooks: HookConfig[] = [];
  private executions: HookExecution[] = [];

  getHooks(filters?: { isActive?: boolean }): Promise<HookConfig[]> {
    if (!filters) {
      return Promise.resolve([...this.hooks]);
    }
    return Promise.resolve(
      this.hooks.filter((hook) =>
        filters.isActive !== undefined ? hook.isActive === filters.isActive : true
      )
    );
  }

  getHook(id: string): Promise<HookConfig | null> {
    return Promise.resolve(this.hooks.find((hook) => hook.id === id) || null);
  }

  createHook(hook: Omit<HookConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<HookConfig> {
    const newHook: HookConfig = {
      ...hook,
      id: String(this.hooks.length + 1),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.hooks.push(newHook);
    return Promise.resolve(newHook);
  }

  async updateHook(id: string, updates: Partial<HookConfig>): Promise<HookConfig> {
    const hook = await this.getHook(id);
    if (!hook) {
      throw new Error('Hook not found');
    }
    const updated = { ...hook, ...updates, updatedAt: new Date() };
    this.hooks = this.hooks.map(h => (h.id === id ? updated : h));
    return updated;
  }

  deleteHook(id: string): Promise<void> {
    this.hooks = this.hooks.filter((hook) => hook.id !== id);
    return Promise.resolve();
  }

  logExecution(execution: HookExecution): Promise<void> {
    this.executions.push({ ...execution, executedAt: execution.executedAt || new Date() });
    return Promise.resolve();
  }

  getExecutions(hookId: string, limit?: number): Promise<HookExecution[]> {
    const records = this.executions.filter((exec) => exec.hookId === hookId);
    return Promise.resolve(limit ? records.slice(0, limit) : records);
  }

  getRecentExecutions(limit?: number): Promise<HookExecution[]> {
    const sorted = [...this.executions].sort((a, b) => b.executedAt.getTime() - a.executedAt.getTime());
    return Promise.resolve(limit ? sorted.slice(0, limit) : sorted);
  }

  getStats(): Promise<HookStorageStats> {
    const totalHooks = this.hooks.length;
    const activeHooks = this.hooks.filter((hook) => hook.isActive).length;
    const totalExecutions = this.executions.length;
    const successfulExecutions = this.executions.filter((exec) => exec.success).length;
    const failedExecutions = totalExecutions - successfulExecutions;
    return Promise.resolve({
      totalHooks,
      activeHooks,
      totalExecutions,
      successfulExecutions,
      failedExecutions,
    });
  }
}
