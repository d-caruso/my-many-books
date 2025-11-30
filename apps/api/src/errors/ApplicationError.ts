// ================================================================
// src/errors/ApplicationError.ts
// Base error types for consistent HTTP error responses
// ================================================================

export class ApplicationError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
    public readonly code?: string,
    public readonly details?: unknown,
    public readonly isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class BadRequestError extends ApplicationError {
  constructor(message = 'Bad request', details?: unknown, code?: string) {
    super(message, 400, code ?? 'BAD_REQUEST', details);
  }
}

export class UnauthorizedError extends ApplicationError {
  constructor(message = 'Unauthorized', details?: unknown, code?: string) {
    super(message, 401, code ?? 'UNAUTHORIZED', details);
  }
}

export class ForbiddenHttpError extends ApplicationError {
  constructor(message = 'Forbidden', details?: unknown, code?: string) {
    super(message, 403, code ?? 'FORBIDDEN', details);
  }
}

export class NotFoundHttpError extends ApplicationError {
  constructor(message = 'Not found', details?: unknown, code?: string) {
    super(message, 404, code ?? 'NOT_FOUND', details);
  }
}

export class ConflictHttpError extends ApplicationError {
  constructor(message = 'Conflict', details?: unknown, code?: string) {
    super(message, 409, code ?? 'CONFLICT', details);
  }
}

export class InternalServerError extends ApplicationError {
  constructor(message = 'Internal server error', details?: unknown, code?: string) {
    super(message, 500, code ?? 'INTERNAL_ERROR', details, false);
  }
}
