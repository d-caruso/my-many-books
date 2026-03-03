// src/adapters/lambdaAdapter.ts

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ApiResponse } from '../common/ApiResponse';
import { UniversalRequest } from '../types';
import { AuthUser } from '../models/interfaces/ModelInterfaces';
import { ERROR_CODES } from '@my-many-books/shared-types';
import { formatApiResponse, normalizeApiError } from '../utils/apiResponseFormatter';

type ControllerMethod = (request: UniversalRequest) => Promise<ApiResponse>;

export const lambdaAdapter = (controllerMethod: ControllerMethod) => {
  return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      // Convert APIGatewayProxyEvent to UniversalRequest
      let parsedBody: unknown;
      try {
        parsedBody = event.body ? JSON.parse(event.body) : undefined;
      } catch {
        parsedBody = event.body; // If parsing fails, use original body
      }

      const universalRequest: UniversalRequest = {
        body: parsedBody,
        queryStringParameters: event.queryStringParameters || undefined,
        params: event.pathParameters || undefined,
        headers: event.headers || undefined,
        user:
          (
            event as APIGatewayProxyEvent & {
              requestContext: { authorizer?: { user?: AuthUser } };
            }
          ).requestContext?.authorizer?.user || undefined,
      };

      const apiResponse = await controllerMethod(universalRequest);
      return {
        statusCode: apiResponse.statusCode,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers':
            'Content-Type, X-Amz-Date, Authorization, X-Api-Key, X-Amz-Security-Token, X-Amz-User-Agent, X-Requested-With',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Credentials': 'true',
        },
        body: JSON.stringify(formatApiResponse(apiResponse)),
      };
    } catch (error) {
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers':
            'Content-Type, X-Amz-Date, Authorization, X-Api-Key, X-Amz-Security-Token, X-Amz-User-Agent, X-Requested-With',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Credentials': 'true',
        },
        body: JSON.stringify({
          success: false,
          error: normalizeApiError(
            undefined,
            error instanceof Error ? error.message : 'Unknown error',
            ERROR_CODES.INTERNAL_ERROR
          ),
        }),
      };
    }
  };
};
