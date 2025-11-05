// ================================================================
// src/adapters/expressAdapter.ts
// Adapter to convert Lambda-style controllers to Express handlers
// ================================================================

import { Request, Response, NextFunction } from 'express';

interface LambdaRequest {
  body?: string;
  queryStringParameters?: { [key: string]: string | undefined };
  pathParameters?: { [key: string]: string | undefined };
  user?: { userId: number };
  headers?: { [key: string]: string | undefined };
}

interface LambdaResponse {
  statusCode: number;
  success: boolean;
  data?: unknown;
  error?: string;
  message?: string;
  pagination?: Record<string, unknown>;
}

interface RequestWithUser extends Request {
  user?: { userId: number };
}

type ControllerMethod = (event: LambdaRequest) => Promise<LambdaResponse>;

export const expressAdapter = (controller: ControllerMethod) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Convert Express request to Lambda event format
      // Use validated data if available, otherwise use originals
      const body = req.validated?.body ?? req.body;
      const query = req.validated?.query ?? req.query;
      const params = req.validated?.params ?? req.params;

      // Build event object conditionally to satisfy exactOptionalPropertyTypes
      const event: LambdaRequest = {
        queryStringParameters: query as { [key: string]: string | undefined },
        pathParameters: params,
        headers: req.headers as { [key: string]: string | undefined },
      };

      // Only add body if it exists (for exactOptionalPropertyTypes)
      if (body) {
        event.body = JSON.stringify(body);
      }

      // Only add user if it exists (for exactOptionalPropertyTypes)
      const reqWithUser = req as RequestWithUser;
      if (reqWithUser.user) {
        event.user = reqWithUser.user;
      }

      const response = await controller(event);

      res.status(response.statusCode).json(response);
    } catch (error) {
      next(error);
    }
  };
};
