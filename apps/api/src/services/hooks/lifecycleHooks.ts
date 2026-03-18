import { emitHookEvent } from './hookSystem';

export type LifecycleBranch = Readonly<{
  BEFORE: string;
  AFTER: string;
  FAILURE: string;
}>;

export type LifecyclePhase = keyof LifecycleBranch;

export type HookEventPayload = Readonly<Record<string, unknown>>;

export const emitEvent = (
  eventName: string,
  payload: HookEventPayload
): void => {
  void emitHookEvent(eventName, payload);
};

export const emitLifecycleEvent = (
  branch: LifecycleBranch,
  phase: LifecyclePhase,
  payload: HookEventPayload
): void => {
  emitEvent(branch[phase], payload);
};
