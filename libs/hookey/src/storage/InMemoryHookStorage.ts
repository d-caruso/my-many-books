import { HookConfig, HookExecution, HookStorage, HookStorageStats } from '../types';

export class InMemoryHookStorage implements HookStorage {
  private hooks: HookConfig[] = [];
  private executions: HookExecution[] = [];

  async getHooks(filters?: { isActive?: boolean }): Promise<HookConfig[]> {
    if (!filters) return [...this.hooks];
    return this.hooks.filter(hook => (filters.isActive !== undefined ? hook.isActive === filters.isActive : true));
  }

  async getHook(id: string): Promise<HookConfig | null> {
    return this.hooks.find(hook => hook.id === id) || null;
  }

  async createHook(hook: Omit<HookConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<HookConfig> {
    const newHook: HookConfig = {
      ...hook,
      id: String(this.hooks.length + 1),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.hooks.push(newHook);
    return newHook;
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

  async deleteHook(id: string): Promise<void> {
    this.hooks = this.hooks.filter(hook => hook.id !== id);
  }

  async logExecution(execution: HookExecution): Promise<void> {
    this.executions.push({ ...execution, executedAt: execution.executedAt || new Date() });
  }

  async getExecutions(hookId: string, limit?: number): Promise<HookExecution[]> {
    const records = this.executions.filter(exec => exec.hookId === hookId);
    return limit ? records.slice(0, limit) : records;
  }

  async getRecentExecutions(limit?: number): Promise<HookExecution[]> {
    const sorted = [...this.executions].sort((a, b) => b.executedAt.getTime() - a.executedAt.getTime());
    return limit ? sorted.slice(0, limit) : sorted;
  }

  async getStats(): Promise<HookStorageStats> {
    const totalHooks = this.hooks.length;
    const activeHooks = this.hooks.filter(hook => hook.isActive).length;
    const totalExecutions = this.executions.length;
    const successfulExecutions = this.executions.filter(exec => exec.success).length;
    const failedExecutions = totalExecutions - successfulExecutions;
    return { totalHooks, activeHooks, totalExecutions, successfulExecutions, failedExecutions };
  }
}
