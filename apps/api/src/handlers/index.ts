// ================================================================
// src/handlers/index.ts
// Lambda handler using serverless-http to wrap Express app
// ================================================================

import serverless from 'serverless-http';
import app, { initPromise } from '../app';

// Wrap Express app for Lambda with initialization guard
const serverlessHandler = serverless(app);

export const handler = async (event: any, context: any) => {
  // Wait for database initialization to complete before processing requests
  await initPromise;
  return serverlessHandler(event, context);
};
