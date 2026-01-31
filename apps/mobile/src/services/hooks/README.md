# Mobile Hook Services

This directory hosts the mobile-specific wrapper around the shared Hookey runtime. It exposes `mobileHooks` for emitting events, the configuration priority service that enforces environment/admin/user controls, and the listener implementations that stage analytics, error reporting, offline queueing, and performance metrics before they are submitted to the backend.

## Technical Implementation Details

- `mobileHooks.ts` builds a singleton `MobileHookSystemManager` that keeps an in-memory `HookSystem`. It guards every emission with a two-layer priority system: environment/test flags plus admin/user configs (via `mobileHookConfigService.shouldProcessHooks`). Emitted events are decorated with session/environment metadata to keep downstream analytics consistent (see [`mobileHooks.ts`](../apps/mobile/src/services/hooks/mobileHooks.ts)).
- `mobileHookConfigService.ts` fetches `GET /config/mobile` and caches the Hookey settings (listeners, analytics, offline storage, performance monitoring). It also fetches `/users/{id}/mobile-config` for user overrides and exposes `setUserId` so the whitelist can change per-authenticated user (see [`mobileHookConfigService.ts`](../apps/mobile/src/services/hooks/mobileHookConfigService.ts)).
- `mobileHookListeners.ts` defines four listener classes (analytics, error reporting, offline storage, performance monitoring), each registered through `HookSystem.registerExistingHook` with appropriate patterns and `HookAction` functions. They persist payloads into `AsyncStorage` buckets and respect `maxOfflineEvents` to bound memory (see [`mobileHookListeners.ts`](../apps/mobile/src/services/hooks/mobileHookListeners.ts)).
- `eventsSchema.ts` exports the centralized `MOBILE_EVENTS`, `RESOURCE_TYPES`, and `OPERATION_STATUSES` constants used by the admin UI, mobile diagnostics, and documentation to keep terminology consistent (see [`eventsSchema.ts`](../apps/mobile/src/services/hooks/eventsSchema.ts)).

## Code Examples & Patterns

### Emitting events

```ts
import { mobileHooks } from './hooks';

function onBookCreated(book: Book): void {
  mobileHooks.emit('book.create.after', {
    book,
    metadata: {
      entryPoint: 'scanner',
    },
  });
}
```

### Using listener helpers

```ts
import { mobileHooks } from './hooks';
import { mobileHookConfigService } from './mobileHookConfigService';

async function enableHooksForUser(userId: string) {
  mobileHookConfigService.setUserId(userId);
  if (!mobileHooks.isOperational()) {
    mobileHooks.getInstance()?.registerHook(...); // register additional runtime listeners if needed
  }
}
```

### Adding a new listener

1. Extend `mobileHookListeners.ts` with a new listener class (e.g., `SecurityMonitoringListener`) that checks `shouldProcessHooks`.
2. When registering listeners in `MobileHookListenersManager.registerListeners`, create a `HookConfig`/`HookAction` pair and call `hookSystem.registerExistingHook`.
3. Emit new events from anywhere in the mobile app using `mobileHooks.emit('security.alert', payload)`.

## Testing Guidelines

- Unit tests live under `apps/mobile/src/services/hooks/__tests__`. They mock `AsyncStorage`, `HookSystem`, and the `mobileHookConfigService` cache to exercise each listener’s `handleEvent` branches. Run them with `npm run test:mobile` or the encompassing Nx target.
- Integration/performance suites rely on the Postman/Newman scripts (`benchmark:hookey-lifecycle`, `benchmark:hookey-memory`) to verify events reach the analytics service, action executions fire, and the HookSystem stays within memory guardrails. Follow the documentation in `docs/features/mobile/integrate-hookey-branching-strategy.md` for running those benchmarks in CI.
- When adding listeners, update `apps/mobile/src/services/hooks/__tests__/` to cover both success and failure paths (including the priority skips). Use Jest’s `mockResolvedValueOnce` to simulate config fetches from the API and `Jest.advanceTimersByTime` for `AsyncStorage` persistence operations if needed.

## Maintenance Procedures

- Keep `mobileHookConfigService.ts` cache TTL aligned with the admin UI refresh rate (currently 5 minutes). Adjust `CACHE_TTL` when admin config latency changes.
- Validate any config change in admin UI by running `npm run benchmark:hookey-handlers` and `npm run benchmark:hookey-lifecycle` to ensure live listeners respect the new toggles without exceeding latency targets.
- Regularly clean `AsyncStorage` buckets (`analytics_events`, `error_events`, `offline_events`, `performance_metrics`) during development to prevent stale data from accumulating—consider injecting a debug helper that calls `AsyncStorage.removeItem`.
- Document any new event types, metadata expectations, or offline artifacts in `docs/reference/mobile-hookey-events.md` immediately after implementation so the reference and admin docs stay synchronized.
