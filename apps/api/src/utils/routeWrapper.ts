// ================================================================
// src/utils/route.ts
// Reusable utilities for API routes
// ================================================================

import { Response, Request, NextFunction } from 'express';
import { ApiResponse } from '../common/ApiResponse';
import { UniversalRequest } from '../types';

// Define a generic type for a controller method
// It should accept a universal request and return a Promise that resolves to an ApiResponse
type ControllerMethod = (request: UniversalRequest) => Promise<ApiResponse>;

/**
 * A generic handler for Express routes that wraps a controller method.
 * It handles the try/catch block and standardizes the response format.
 * * @param controllerMethod The controller method to execute.
 * @returns An Express route handler function.
 */
export const expressRouteWrapper = (controllerMethod: ControllerMethod) => {
  return async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    try {
      // Convert Express request to UniversalRequest
      const universalRequest: UniversalRequest = {
        body: req.body ? JSON.stringify(req.body) : undefined,
        queryStringParameters: req.query as { [key: string]: string | undefined },
        pathParameters: req.params as { [key: string]: string | undefined },
        user: (req as Request & { user?: { userId: number } }).user || undefined, // From auth middleware
      };

      // The controller method executes the core logic
      const result = await controllerMethod(universalRequest);

      // Standardize the response based on the controller's result
      if (result.statusCode === 204) {
        res.status(204).send();
      } else {
        res.status(result.statusCode).json({
          success: result.success,
          data: result.data,
          ...(result.error && { error: result.error }),
          ...(result.message && { message: result.message }),
          ...(result.meta && { meta: result.meta }),
        });
      }
    } catch (error) {
      console.error('Error in route handler:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
};
