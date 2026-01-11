# Hookey

Hookey is the lightweight, plug-and-play hook runtime powering the event-driven workflows across My Many Books. It keeps the core hook lifecycle, storage adapters, and action executors together so that the API, CLI, or any other service can emit events and let configured hooks (logging, notifications, persistence, etc.) react asynchronously.

## Core concepts

- **HookSystem** – the orchestrator that registers hooks, wires their actions, and emits events. It ships with an internal `EventEmitter` and can be paired with any `HookStorage` implementation.
- **HookConfig** – defines the event pattern, action type, priority, and metadata for a hook. Hook executions are audited via `HookExecution` records.
- **HookAction / LogAction** – actions are the units of work run when events match. `LogAction` is shipped out of the box, but you can implement custom actions that call other services.
- **HookStorage** – persistence layer for hooks and executions. The library includes `InMemoryHookStorage` for tests and `SequelizeHookStorage` for production-grade persistence.
- **Adapters** – helpers, such as `expressHookEmitter` and database adapters, that translate framework-level events into Hookey events.
- **Event Schema Builder** – utility for creating type-safe, hierarchical event schemas with automatic dot-notation generation and wildcard support.

## Getting started

1. Boot the runtime:

```ts
import { HookSystem, LogAction } from '@my-many-books/hookey';

const hookSystem = new HookSystem();
```

2. Register a hook and attach an action:

```ts
await hookSystem.registerHook(
  {
    id: 'audit-log',
    name: 'Audit logger',
    eventPattern: '**',
    actionType: 'log',
    isActive: true,
    priority: 0,
  },
  new LogAction('hookey')
);
```

3. Emit events anywhere in the app once hooks are registered:

```ts
hookSystem.trigger('book.created', { bookId: 42, title: '1984' });
```

Every registered hook logs its execution in the chosen `HookStorage` implementation, keeps execution timing, and records success/failure.

## Event Schema Builder

Hookey includes a powerful `buildEventSchema` utility for creating type-safe, hierarchical event schemas. This eliminates code duplication and ensures consistent event naming across your application.

### Basic Usage

```ts
import { buildEventSchema } from '@my-many-books/hookey';

const schema = {
  BOOK: {
    CREATE: {
      START: null,
      SUCCESS: null,
      FAILED: null,
    },
    UPDATE: {
      START: null,
      SUCCESS: null,
      FAILED: null,
    },
    DELETE: null,
  },
  USER: {
    LOGIN: null,
    LOGOUT: null,
  }
} as const;

const EVENTS = buildEventSchema(schema);

// Results in fully typed event tree:
// {
//   BOOK: {
//     CREATE: {
//       START: "book.create.start",
//       SUCCESS: "book.create.success", 
//       FAILED: "book.create.failed",
//       ANY: "book.create.*"
//     },
//     UPDATE: { ... },
//     DELETE: "book.delete",
//     ANY: "book.*"
//   },
//   USER: {
//     LOGIN: "user.login",
//     LOGOUT: "user.logout", 
//     ANY: "user.*"
//   },
//   ANY: "*"
// }
```

### Type-Safe Event Emission

```ts
// Full TypeScript support
hookSystem.trigger(EVENTS.BOOK.CREATE.SUCCESS, { bookId: 123 });
hookSystem.trigger(EVENTS.USER.LOGIN, { userId: 456 });

// Wildcard listening
hookSystem.on(EVENTS.BOOK.ANY, (data) => {
  console.log('Any book event:', data);
});
```

### Features

- **Type Safety**: Full TypeScript inference and autocomplete
- **Dot Notation**: Automatic generation of hierarchical event strings
- **Wildcard Support**: Built-in `ANY` properties for pattern matching
- **Immutable**: Works with `Object.freeze()` for runtime protection
- **Scalable**: Supports arbitrary nesting depth

## Storage adapters

- `InMemoryHookStorage` – default storage used during tests or short-lived scripts.
- `SequelizeHookStorage` – persist hooks/executions to a SQL database. Call `await storage.init()` before registering hooks to sync the models.

```ts
import { Sequelize } from 'sequelize';
import { HookSystem } from '@my-many-books/hookey';
import { SequelizeHookStorage } from './adapters/sequelizeHookStorage';

const sequelize = new Sequelize('sqlite::memory:', { logging: false });
const storage = new SequelizeHookStorage(sequelize);
await storage.init();
const hookSystem = new HookSystem(storage);
```

## Express integration

`expressHookEmitter` bridges Express requests to Hookey by emitting every request as a hook event. Use it when you want hooks to react to HTTP activity (e.g., log, analytics, notifications):

```ts
import express from 'express';
import { expressHookEmitter, HookSystem, LogAction } from '@my-many-books/hookey';

const app = express();
const hookSystem = new HookSystem();
await hookSystem.registerHook(..., new LogAction('express'));

app.use(express.json());
app.use(expressHookEmitter(hookSystem, 'http.request'));
```

See `libs/hookey/examples/express-example.ts` for a runnable sample that wires an Express handler to Hookey and emits domain-specific events.

## CLI / standalone usage

Hookey can be used outside of the web server. The CLI example in `libs/hookey/examples/cli-example.ts` demonstrates how to:

1. initialize the core runtime,
2. register hooks with custom `HookAction`s (such as `LogAction`),
3. emit events from scripts, cron jobs, or serverless functions.

## Testing

Run the Hookey tests with:

```bash
npx nx test hookey
```

For linting and builds execute the commands from the workspace root to keep lockfiles in sync:

```bash
npm install
npm run build
```

Hookey ships with jest + Vitest helpers already configured in `libs/hookey/src/__tests__`.

## Resources

- `libs/hookey/src/types.ts` – all runtime typings for configs, executions, and actions
- `libs/hookey/src/storage` – storage implementations
- `libs/hookey/src/actions` – ready-made actions (logging) and infrastructure for future actions
- `libs/hookey/src/adapters` – Express middleware, Sequelize persistence, and future adapters
- `libs/hookey/src/utils/eventSchemaBuilder.ts` – event schema building utility with full test coverage
- `libs/hookey/examples` – practical flows for Express servers and CLI scripts

## What to do next

1. Wire Hookey into `apps/api` by registering hooks when the server boots (see Phase 5 in `docs/archive/planning/hooks-system-plan.md`).
2. Create new `HookAction` implementations for email, notifications, or third-party services.
3. Extend `expressHookEmitter` or build other adapters (Prisma, Kafka, serverless) if you change infra.
