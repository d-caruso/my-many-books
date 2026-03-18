import { extractErrorMessage } from '@my-many-books/shared-utils';

import { createHookOperationId } from './domainMutationEvents';
import type { MobileEventName } from './eventsSchema';
import { mobileHooks } from './mobileHooks';

type HookLifecycleEvents = Readonly<{
  BEFORE: MobileEventName;
  AFTER: MobileEventName;
  FAILURE: MobileEventName;
}>;

type EventMetadata = Record<string, unknown> | undefined;

export type AuthLifecyclePayload = Readonly<{
  operationId: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}>;

export const createAuthLifecyclePayload = (
  metadata?: EventMetadata,
  operationId: string = createHookOperationId()
): AuthLifecyclePayload => ({
  operationId,
  timestamp: new Date().toISOString(),
  ...(metadata ? { metadata } : {}),
});

export const emitAuthLifecycle = async <T>(
  events: HookLifecycleEvents,
  payload: AuthLifecyclePayload,
  operation: () => Promise<T>,
  buildAfterPayload?: (result: T) => Record<string, unknown>
): Promise<T> => {
  await mobileHooks.emit(events.BEFORE, payload);

  try {
    const result = await operation();
    await mobileHooks.emit(events.AFTER, {
      ...payload,
      ...(buildAfterPayload ? buildAfterPayload(result) : {}),
    });
    return result;
  } catch (error) {
    await mobileHooks.emit(events.FAILURE, {
      ...payload,
      error: extractErrorMessage(error),
    });
    throw error;
  }
};
