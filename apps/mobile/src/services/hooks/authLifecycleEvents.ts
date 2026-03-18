import {
  createHookLifecyclePayload,
  createHookOperationId,
  emitHookLifecycle,
  type HookAfterPayload,
  type HookEventMetadata,
  type HookLifecycleEvents,
  type HookLifecyclePayload,
} from './hookLifecycle';

export type AuthLifecyclePayload<TMetadata extends HookEventMetadata = HookEventMetadata> =
  HookLifecyclePayload<TMetadata>;

export const createAuthLifecyclePayload = <TMetadata extends HookEventMetadata>(
  metadata?: TMetadata,
  operationId: string = createHookOperationId()
): AuthLifecyclePayload<TMetadata> =>
  createHookLifecyclePayload(metadata, operationId);

export const emitAuthLifecycle = <T, TAfterPayload extends HookAfterPayload = HookAfterPayload>(
  events: HookLifecycleEvents,
  payload: AuthLifecyclePayload,
  operation: () => Promise<T>,
  buildAfterPayload?: (result: T) => TAfterPayload
): Promise<T> =>
  emitHookLifecycle(events, payload, operation, buildAfterPayload);
