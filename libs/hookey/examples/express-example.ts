import express from 'express';
import { getLogger } from '@my-many-books/shared-logging';
import { HookSystem } from '../src/HookSystem';
import { LogAction } from '../src/actions/LogAction';
import { expressHookEmitter } from '../src/adapters/expressHookMiddleware';

type BookPayload = {
  title: string;
  isbnCode: string;
};

async function createExampleApp() {
  const logger = getLogger();
  const hookSystem = new HookSystem();
  await hookSystem.registerHook(
    {
      id: 'express-audit',
      name: 'Express request logger',
      eventPattern: 'http.requests',
      actionType: 'log',
      isActive: true,
      priority: 0,
    },
    new LogAction('express-example')
  );

  const app = express();
  app.use(express.json());
  app.use(expressHookEmitter(hookSystem, 'http.requests'));

  app.post('/books', (req, res) => {
    const payload: BookPayload = req.body;
    void hookSystem.trigger('book.created', {
      ...payload,
      emittedAt: new Date().toISOString(),
    });
    res.status(201).json({ success: true, book: payload });
  });

  const server = app.listen(4004, () => {
    logger.info('Hookey Express example running on http://localhost:4004');
  });

  return server;
}

void createExampleApp();
