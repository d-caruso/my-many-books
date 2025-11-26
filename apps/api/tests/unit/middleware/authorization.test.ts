// ================================================================
// tests/unit/middleware/authorization.test.ts
// Unit Tests for Authorization Middleware
// ================================================================

import { Request, Response, NextFunction } from 'express';
import { requirePermission } from '../../../src/middleware/authorization';
import { ACTIONS, RESOURCES } from '@my-many-books/shared-auth';

describe('Authorization Middleware', () => {
  let mockRequest: any;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      user: undefined,
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    nextFunction = jest.fn();
  });

  describe('User Permissions', () => {
    beforeEach(() => {
      mockRequest.user = {
        id: 1,
        email: 'user@example.com',
        role: 'user',
      };
    });

    it('should allow authenticated users to create books', () => {
      const middleware = requirePermission(ACTIONS.CREATE, RESOURCES.BOOK);

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow authenticated users to read books', () => {
      const middleware = requirePermission(ACTIONS.READ, RESOURCES.BOOK);

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow users to create authors', () => {
      const middleware = requirePermission(ACTIONS.CREATE, RESOURCES.AUTHOR);

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should allow users to create categories', () => {
      const middleware = requirePermission(ACTIONS.CREATE, RESOURCES.CATEGORY);

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should deny regular users from managing all resources', () => {
      const middleware = requirePermission(ACTIONS.MANAGE, RESOURCES.ALL);

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.any(String),
        })
      );
    });
  });

  describe('Admin Permissions', () => {
    beforeEach(() => {
      mockRequest.user = {
        id: 2,
        email: 'admin@example.com',
        role: 'admin',
      } as any;
    });

    it('should allow admins to manage all resources', () => {
      const middleware = requirePermission(ACTIONS.MANAGE, RESOURCES.ALL);

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow admins to create any resource', () => {
      const createBook = requirePermission(ACTIONS.CREATE, RESOURCES.BOOK);
      const createAuthor = requirePermission(ACTIONS.CREATE, RESOURCES.AUTHOR);
      const createCategory = requirePermission(ACTIONS.CREATE, RESOURCES.CATEGORY);

      createBook(mockRequest as Request, mockResponse as Response, nextFunction);
      createAuthor(mockRequest as Request, mockResponse as Response, nextFunction);
      createCategory(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledTimes(3);
    });

    it('should allow admins to delete any resource', () => {
      const middleware = requirePermission(ACTIONS.DELETE, RESOURCES.BOOK);

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should allow admins to update any resource', () => {
      const middleware = requirePermission(ACTIONS.UPDATE, RESOURCES.USER);

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('Anonymous User Permissions', () => {
    beforeEach(() => {
      mockRequest.user = undefined;
    });

    it('should allow anonymous users to read public resources', () => {
      const readBooks = requirePermission(ACTIONS.READ, RESOURCES.BOOK);
      const readAuthors = requirePermission(ACTIONS.READ, RESOURCES.AUTHOR);
      const readCategories = requirePermission(ACTIONS.READ, RESOURCES.CATEGORY);

      readBooks(mockRequest as Request, mockResponse as Response, nextFunction);
      readAuthors(mockRequest as Request, mockResponse as Response, nextFunction);
      readCategories(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledTimes(3);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should deny anonymous users from creating resources', () => {
      const middleware = requirePermission(ACTIONS.CREATE, RESOURCES.BOOK);

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.any(String),
        })
      );
    });

    it('should deny anonymous users from updating resources', () => {
      const middleware = requirePermission(ACTIONS.UPDATE, RESOURCES.BOOK);

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });

    it('should deny anonymous users from deleting resources', () => {
      const middleware = requirePermission(ACTIONS.DELETE, RESOURCES.BOOK);

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });
  });

  describe('Error Details', () => {
    it('should include error details in 403 response', () => {
      mockRequest.user = {
        id: 1,
        email: 'user@example.com',
        role: 'user',
      } as any;

      const middleware = requirePermission(ACTIONS.MANAGE, RESOURCES.ALL);

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.any(String),
          details: expect.objectContaining({
            action: ACTIONS.MANAGE,
            resource: RESOURCES.ALL,
            authenticated: true,
            role: 'user',
          }),
        })
      );
    });

    it('should show anonymous role for unauthenticated users', () => {
      mockRequest.user = undefined;

      const middleware = requirePermission(ACTIONS.CREATE, RESOURCES.BOOK);

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            authenticated: false,
            role: 'anonymous',
          }),
        })
      );
    });
  });

  describe('i18n Support', () => {
    it('should use i18n translator when available', () => {
      const mockTranslator = jest.fn((key: string) => `translated_${key}`);

      mockRequest = {
        user: undefined,
        t: mockTranslator,
      } as any;

      const middleware = requirePermission(ACTIONS.CREATE, RESOURCES.BOOK);

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockTranslator).toHaveBeenCalledWith('errors:permission_denied');
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'translated_errors:permission_denied',
        })
      );
    });

    it('should fallback to English when translator not available', () => {
      mockRequest.user = undefined;

      const middleware = requirePermission(ACTIONS.CREATE, RESOURCES.BOOK);

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'You do not have permission to perform this action',
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid user structure gracefully', () => {
      // CASL treats any truthy user object as authenticated and grants basic permissions
      // Even if the user structure is incomplete, CREATE permissions are granted to authenticated users
      const middleware = requirePermission(ACTIONS.CREATE, RESOURCES.BOOK);

      // Pass user with missing required properties (but truthy)
      mockRequest.user = { invalid: 'structure' } as any;

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      // CASL doesn't throw errors, so no error should be logged
      expect(consoleErrorSpy).not.toHaveBeenCalled();

      // Should call next because any authenticated user can CREATE
      expect(nextFunction).toHaveBeenCalled();

      // Should not return error response
      expect(mockResponse.status).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should deny invalid user from admin-only actions', () => {
      // However, admin-only actions should still be denied
      const middleware = requirePermission(ACTIONS.MANAGE, RESOURCES.ALL);

      // Pass user with missing role property
      mockRequest.user = { id: 1, email: 'test@example.com' } as any;

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      // Should not call next (permission denied)
      expect(nextFunction).not.toHaveBeenCalled();

      // Should return 403 (permission denied)
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.any(String),
        })
      );
    });
  });
});
