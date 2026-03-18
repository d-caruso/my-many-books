# Mobile Hook Services

This directory contains the mobile-specific Hookey runtime, the listener implementations that stage telemetry locally, and the upload path that sends stored listener events to the backend.

## Source Of Truth

- Shared business mutation constants live in `@my-many-books/shared-utils`:
  - `HOOK_PHASES`
  - `MUTATION_OPERATIONS`
  - `HOOK_EVENTS`
- Mobile code consumes those shared mutation constants through the composed `MOBILE_EVENTS` tree in `eventsSchema.ts`.
- Queue/sync/network/app/error families remain mobile-only operational events and are defined locally in `eventsSchema.ts`.

## Technical Implementation Details

- `mobileHooks.ts` builds the singleton `MobileHookSystemManager`. Every emission is guarded by environment/test checks plus admin/user hook settings from `mobileHookConfigService`.
- `eventsSchema.ts` composes mobile event constants from shared mutation constants in `@my-many-books/shared-utils`:
  - `HOOK_PHASES`
  - `MUTATION_OPERATIONS`
  Business mutation events therefore use the shared `BEFORE / AFTER / FAILURE` contract, while mobile-only infrastructure events keep their existing operational naming.
- `mobileHookListeners.ts` registers four listeners:
  - analytics
  - error reporting
  - offline storage
  - performance monitoring
  Each listener persists events into its own AsyncStorage bucket.
- `MobileEventUploadService.ts` reads the four listener buckets, converts them to the mobile analytics batch payload, and uploads them to `POST /mobile-analytics/events/batch`.
- `NetworkService.ts` triggers upload when connectivity is restored.
- `SyncService.ts` triggers upload as part of the user-requested sync flow.

## Shared Constants

Canonical business event names live in `@my-many-books/shared-utils`.

Example:

```ts
import { HOOK_EVENTS } from '@my-many-books/shared-utils';

HOOK_EVENTS.BOOK.CREATE.BEFORE;  // "book.create.before"
HOOK_EVENTS.BOOK.CREATE.AFTER;   // "book.create.after"
HOOK_EVENTS.BOOK.CREATE.FAILURE; // "book.create.failure"
```

Mobile app code usually consumes the composed mobile tree:

```ts
import { mobileHooks, MOBILE_EVENTS } from './hooks';

async function onBookCreated(bookId: string): Promise<void> {
  await mobileHooks.emit(MOBILE_EVENTS.BOOK.CREATE.BEFORE, {
    bookId,
    entryPoint: 'scanner',
  });

  await mobileHooks.emit(MOBILE_EVENTS.BOOK.CREATE.AFTER, {
    bookId,
    entryPoint: 'scanner',
  });
}
```

Important rules:

- `READ` events are intentionally not part of the mobile business event contract.
- Do not hard-code business event strings in mobile code. Extend shared constants first, then use `MOBILE_EVENTS`.

## Listener Buckets And Upload

The mobile listeners persist telemetry in these AsyncStorage buckets:

- `analytics_events`
- `error_reporting_events`
- `offline_storage_events`
- `performance_monitoring_events`

`MobileEventUploadService` uploads those buckets in batches of up to 100 events:

- full success removes uploaded events
- partial success removes only successful entries
- request failure keeps the remaining entries for the next retry

Upload triggers:

- `network.restored`
- `SyncService.performSync()`

Because the upload service now flushes stored listener events automatically, manual bucket cleanup should be limited to local development/debugging workflows.

Uploaded listener events are stored through the mobile analytics batch API. They are telemetry records, not server-side re-emits of the original Hookey event.

## Adding Or Updating Events

1. For shared business mutation events, add or update constants in `@my-many-books/shared-utils` first.
2. Compose mobile schema changes in `eventsSchema.ts` instead of inventing inline strings.
3. Emit through `mobileHooks.emit(MOBILE_EVENTS...)`.
4. If the event should be persisted for telemetry, confirm one of the listeners captures it.
5. If payload shape or event naming changes, update:
   - `docs/reference/mobile-hookey-events.md`
   - this README

## Testing Guidance

- Hook listener tests live under `apps/mobile/src/services/hooks/__tests__`.
- `MobileEventUploadService.test.ts` covers:
  - full success
  - partial success
  - failure retention
  - batch pagination
- Network/sync integration tests should confirm the upload triggers fire from the active runtime paths, not dead code paths.

## Maintenance Notes

- Keep `mobileHookConfigService.ts` cache behavior aligned with admin/user config propagation.
- Keep the shared business event contract and the mobile docs in sync in the same task.
- During development, manual cleanup helpers may still call `AsyncStorage.removeItem(...)`, but production behavior should rely on `MobileEventUploadService`.
