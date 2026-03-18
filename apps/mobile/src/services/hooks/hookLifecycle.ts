import { extractErrorMessage, HOOK_PHASES } from '@my-many-books/shared-utils';

import type { MobileEventName } from './eventsSchema';
import { mobileHooks } from './mobileHooks';

export type HookLifecyclePhase = keyof typeof HOOK_PHASES;

export type HookLifecycleEvents = Readonly<Record<HookLifecyclePhase, MobileEventName>>;

export type HookEventMetadata = Readonly<Record<string, unknown>>;

export type HookLifecyclePayload<TMetadata extends HookEventMetadata = HookEventMetadata> = Readonly<{
  operationId: string;
  timestamp: string;
  metadata?: TMetadata;
}>;

export type HookAfterPayload = Readonly<Record<string, unknown>>;

export const createHookOperationId = (): string =>
  `op_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

export const createHookLifecyclePayload = <TMetadata extends HookEventMetadata>(
  metadata?: TMetadata,
  operationId: string = createHookOperationId()
): HookLifecyclePayload<TMetadata> => ({
  operationId,
  timestamp: new Date().toISOString(),
  ...(metadata ? { metadata } : {}),
});

export const emitHookLifecycle = async <
  TResult,
  TPayload extends HookLifecyclePayload,
  TAfterPayload extends HookAfterPayload = HookAfterPayload,
>(
  events: HookLifecycleEvents,
  payload: TPayload,
  operation: () => Promise<TResult>,
  buildAfterPayload?: (result: TResult) => TAfterPayload
): Promise<TResult> => {
  void mobileHooks.emit(events.BEFORE, payload);

  try {
    const result = await operation();
    void mobileHooks.emit(events.AFTER, {
      ...payload,
      ...(buildAfterPayload ? buildAfterPayload(result) : {}),
    });
    return result;
  } catch (error) {
    void mobileHooks.emit(events.FAILURE, {
      ...payload,
      error: extractErrorMessage(error),
    });
    throw error;
  }
};
