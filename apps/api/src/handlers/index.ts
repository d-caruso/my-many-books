// ================================================================
// src/handlers/index.ts
// Lambda handler using serverless-http to wrap Express app
// ================================================================

import serverless from 'serverless-http';
import { APIGatewayProxyEvent, Context, APIGatewayProxyResult } from 'aws-lambda';
import app, { initPromise } from '../app';

// Wrap Express app for Lambda with initialization guard
const serverlessHandler = serverless(app);

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  // Wait for database initialization to complete before processing requests
  await initPromise;
  return serverlessHandler(event, context) as Promise<APIGatewayProxyResult>;
};

// Re-export individual handlers for testing
export * from './books';
export * from './authors';
export * from './categories';
export * from './isbn';
export * from './health';
