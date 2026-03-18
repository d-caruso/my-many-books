import { extractErrorMessage } from '@my-many-books/shared-utils';

import type { MobileEventName } from './eventsSchema';
import { mobileHooks } from './mobileHooks';

type HookLifecycleEvents = Readonly<{
  BEFORE: MobileEventName;
  AFTER: MobileEventName;
  FAILURE: MobileEventName;
}>;

type EventMetadata = Record<string, unknown> | undefined;

export type DomainMutationPayload = Readonly<{
  operationId: string;
  resourceType: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}>;

export const createHookOperationId = (): string =>
  `op_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

export const createDomainMutationPayload = (
  resourceType: string,
  metadata?: EventMetadata,
  operationId: string = createHookOperationId()
): DomainMutationPayload => ({
  operationId,
  resourceType,
  timestamp: new Date().toISOString(),
  ...(metadata ? { metadata } : {}),
});

export const emitDomainMutationLifecycle = async <T>(
  events: HookLifecycleEvents,
  payload: DomainMutationPayload,
  operation: () => Promise<T>,
  buildAfterPayload?: (result: T) => Record<string, unknown>
): Promise<T> => {
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
