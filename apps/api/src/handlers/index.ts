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
  event: APIGatewayProxyEvent & { source?: string },
  context: Context
): Promise<APIGatewayProxyResult> => {
  // Keep-warm ping from EventBridge — initialize DB but skip HTTP processing
  if (event.source === 'keep-warm') {
    await initPromise;
    return { statusCode: 200, body: 'warm' };
  }

  // Wait for database initialization to complete before processing requests
  await initPromise;
  return serverlessHandler(event, context) as Promise<APIGatewayProxyResult>;
};
