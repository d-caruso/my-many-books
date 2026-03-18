import { RESOURCE_TYPES } from './eventsSchema';
import {
  createHookLifecyclePayload,
  createHookOperationId,
  emitHookLifecycle,
  type HookAfterPayload,
  type HookEventMetadata,
  type HookLifecycleEvents,
  type HookLifecyclePayload,
} from './hookLifecycle';

export type DomainMutationResourceType =
  (typeof RESOURCE_TYPES)[keyof typeof RESOURCE_TYPES];

export type DomainMutationPayload<TMetadata extends HookEventMetadata = HookEventMetadata> =
  HookLifecyclePayload<TMetadata> &
    Readonly<{
      resourceType: DomainMutationResourceType;
    }>;

export const createDomainMutationPayload = <TMetadata extends HookEventMetadata>(
  resourceType: DomainMutationResourceType,
  metadata?: TMetadata,
  operationId: string = createHookOperationId()
): DomainMutationPayload<TMetadata> => ({
  ...createHookLifecyclePayload(metadata, operationId),
  resourceType,
});

export const emitDomainMutationLifecycle = <T, TAfterPayload extends HookAfterPayload = HookAfterPayload>(
  events: HookLifecycleEvents,
  payload: DomainMutationPayload,
  operation: () => Promise<T>,
  buildAfterPayload?: (result: T) => TAfterPayload
): Promise<T> =>
  emitHookLifecycle(events, payload, operation, buildAfterPayload);
