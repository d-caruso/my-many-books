export interface HookConfig {
  id: string;
  name: string;
  description?: string;
  eventPattern: string;
  actionType: string;
  actionConfig?: Record<string, unknown>;
  isActive: boolean;
  priority: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface HookExecution {
  id?: string;
  hookId: string;
  eventName: string;
  eventData?: Record<string, unknown>;
  success: boolean;
  errorMessage?: string;
  executionTimeMs?: number;
  executedAt: Date;
}

export interface HookStorageStats {
  totalHooks: number;
  activeHooks: number;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
}

export interface HookStorage {
  getHooks(filters?: { isActive?: boolean }): Promise<HookConfig[]>;
  getHook(id: string): Promise<HookConfig | null>;
  createHook(hook: Omit<HookConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<HookConfig>;
  updateHook(id: string, updates: Partial<HookConfig>): Promise<HookConfig>;
  deleteHook(id: string): Promise<void>;
  logExecution(execution: HookExecution): Promise<void>;
  getExecutions(hookId: string, limit?: number): Promise<HookExecution[]>;
  getRecentExecutions(limit?: number): Promise<HookExecution[]>;
  getStats(): Promise<HookStorageStats>;
}

export interface HookActionContext {
  eventName: string;
  payload?: unknown;
}

export interface HookAction {
  execute(context: HookActionContext): Promise<void>;
}
