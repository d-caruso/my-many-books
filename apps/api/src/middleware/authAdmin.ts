// ================================================================
// src/middleware/authAdmin.ts
// ================================================================

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export const authAdminMiddleware = (
  handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>
) => {
  return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const authorizer = event.requestContext.authorizer;

    if (!authorizer || !authorizer['userId']) {
      return {
        statusCode: 401,
        body: JSON.stringify({ success: false, message: 'Unauthorized' }),
      };
    }

    if (authorizer['role'] !== 'admin') {
      return {
        statusCode: 403,
        body: JSON.stringify({ success: false, message: 'Forbidden' }),
      };
    }

    return handler(event);
  };
};