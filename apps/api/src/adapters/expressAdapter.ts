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
  data?: any;
  error?: string;
  message?: string;
  pagination?: any;
}

type ControllerMethod = (event: LambdaRequest) => Promise<LambdaResponse>;

export const expressAdapter = (controller: ControllerMethod) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Convert Express request to Lambda event format
      // Build event object conditionally to satisfy exactOptionalPropertyTypes
      const event: LambdaRequest = {
        queryStringParameters: req.query as { [key: string]: string | undefined },
        pathParameters: req.params,
        headers: req.headers as { [key: string]: string | undefined },
      };

      // Only add body if it exists (for exactOptionalPropertyTypes)
      if (req.body) {
        event.body = JSON.stringify(req.body);
      }

      // Only add user if it exists (for exactOptionalPropertyTypes)
      if ((req as any).user) {
        event.user = (req as any).user;
      }

      const response = await controller(event);

      res.status(response.statusCode).json(response);
    } catch (error) {
      next(error);
    }
  };
};
