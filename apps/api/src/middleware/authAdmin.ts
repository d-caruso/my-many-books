// ================================================================
// src/middleware/authAdmin.ts
// ================================================================

import { i18n } from '@my-many-books/shared-i18n';
import { ERROR_CODES, createErrorResponse } from '@my-many-books/shared-types';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export const authAdminMiddleware = (
  handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>
) => {
  return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const authorizer = event.requestContext.authorizer;

    if (!authorizer || !authorizer['userId']) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(createErrorResponse(
          ERROR_CODES.AUTH_TOKEN_MISSING,
          i18n.t('errors:AUTH_TOKEN_MISSING')
        )),
      };
    }

    if (authorizer['role'] !== 'admin') {
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(createErrorResponse(
          ERROR_CODES.ADMIN_REQUIRED,
          i18n.t('errors:ADMIN_REQUIRED')
        )),
      };
    }

    return handler(event);
  };
};
