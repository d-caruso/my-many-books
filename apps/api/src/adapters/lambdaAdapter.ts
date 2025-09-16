// src/adapters/lambdaAdapter.ts

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ApiResponse } from '../common/ApiResponse';

// A universal request interface to decouple the controller from the framework
interface UniversalRequest {
  body?: any;
  queryStringParameters?: { [key: string]: string | undefined };
  pathParameters?: { [key: string]: string | undefined };
  user?: { userId: number };
}

type ControllerMethod = (request: UniversalRequest) => Promise<ApiResponse>;

export const lambdaAdapter = (controllerMethod: ControllerMethod) => {
  return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      // Convert APIGatewayProxyEvent to UniversalRequest
      const universalRequest: UniversalRequest = {
        body: event.body,
        queryStringParameters: event.queryStringParameters as { [key: string]: string | undefined },
        pathParameters: event.pathParameters as { [key: string]: string | undefined },
        user: (event as any).requestContext?.authorizer?.user // From auth context
      };

      const apiResponse = await controllerMethod(universalRequest);
      return {
        statusCode: apiResponse.statusCode,
        body: JSON.stringify({
          success: apiResponse.success,
          data: apiResponse.data,
          ...(apiResponse.error && { error: apiResponse.error }),
          ...(apiResponse.message && { message: apiResponse.message }),
          ...(apiResponse.meta && { meta: apiResponse.meta })
        }),
      };
    } catch (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          success: false,
          error: 'Internal server error',
          details: error instanceof Error ? error.message : 'Unknown error'
        }),
      };
    }
  };
};