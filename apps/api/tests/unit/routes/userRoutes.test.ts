// ================================================================
// tests/routes/userRoutes.test.ts
// ================================================================

import request from 'supertest';
import express from 'express';
let mockUserController: any = {};
let mockAccountController: any = {};

jest.mock('../../../src/container', () => ({
  container: {
    get: jest.fn((type: symbol) => {
      if (type === Symbol.for('AccountController')) return mockAccountController;
      return mockUserController;
    }),
  },
}));

jest.mock('../../../src/middleware/auth', () => ({
  authMiddleware: jest.fn((req: any, _res: any, next: any) => {
    req.user = { id: 1, email: 'user@example.com', provider: 'cognito' };
    next();
  }),
}));

// Prevent real Cognito client from loading during module resolution
jest.mock('../../../src/services/auth/cognitoPasswordService', () => ({
  cognitoPasswordService: { changePassword: jest.fn() },
  COGNITO_PASSWORD_ERRORS: {
    INVALID_PASSWORD_POLICY_ERROR_NAME: 'InvalidPasswordPolicyError',
    COGNITO_CONFIG_ERROR_NAME: 'CognitoConfigurationError',
  },
}));

// Prevent real googleOAuth module from loading during module resolution
jest.mock('../../../src/services/auth/googleOAuth', () => ({
  setRefreshTokenCookie: jest.fn(),
}));

jest.mock('../../../src/validation', () => ({
  validateBody: jest.fn(() => (_req: any, _res: any, next: any) => next()),
  validateQuery: jest.fn(() => (_req: any, _res: any, next: any) => next()),
  updateUserSchema: {},
  getUserBooksQuerySchema: {},
}));

jest.mock('../../../src/utils/routeWrapper', () => ({
  expressRouteWrapper: jest.fn((controllerMethod: any) => {
    return async (req: any, res: any, next: any) => {
      try {
        const universalRequest = {
          body: JSON.stringify(req.body || {}),
          queryStringParameters: req.query,
          params: req.params,
          user: req.user,
        };
        const result = await controllerMethod(universalRequest);
        res.status(result.statusCode).json({
          success: result.success,
          data: result.data,
          ...(result.message && { message: result.message }),
        });
      } catch (error) {
        next(error);
      }
    };
  }),
}));

mockUserController = {
  getCurrentUser: jest.fn(async () => ({ statusCode: 200, success: true, data: { id: 1 } })),
  updateCurrentUser: jest.fn(async () => ({ statusCode: 200, success: true, data: { id: 1 } })),
  deleteAccount: jest.fn(async () => ({ statusCode: 200, success: true })),
  getUserBooks: jest.fn(async () => ({
    statusCode: 200,
    success: true,
    data: {
      books: [],
      pagination: { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 20 },
    },
  })),
  getUserStats: jest.fn(async () => ({
    statusCode: 200,
    success: true,
    data: {
      totalBooks: 0,
      booksByStatus: { reading: 0, paused: 0, finished: 0, unspecified: 0 },
      completionRate: 0,
      recentBooks: [],
    },
  })),
};

mockAccountController = {
  deactivateAccount: jest.fn(async () => ({ statusCode: 200, success: true })),
  changePassword: jest.fn(async (_req: any, res: any) => {
    res.status(200).json({
      success: true,
      data: { changed: true, accessToken: 'new-access-token', idToken: 'new-id-token', expiresIn: 3600 },
    });
  }),
};

const userRoutes = require('../../../src/routes/userRoutes').default;

describe('User Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/users', userRoutes);
  });

  it('GET /api/users returns current user', async () => {
    const response = await request(app).get('/api/users/1').expect(200);
    expect(response.body.data).toMatchObject({ id: 1 });
    expect(mockUserController.getCurrentUser).toHaveBeenCalled();
  });

  it('PUT /api/users updates current user', async () => {
    await request(app)
      .put('/api/users/1')
      .send({ name: 'Jane', surname: 'Doe' })
      .expect(200);
    expect(mockUserController.updateCurrentUser).toHaveBeenCalled();
  });

  it('DELETE /api/users removes account', async () => {
    await request(app).delete('/api/users/1').expect(200);
    expect(mockUserController.deleteAccount).toHaveBeenCalled();
  });

  it('GET /api/users/books returns user books', async () => {
    await request(app).get('/api/users/1/books').expect(200);
    expect(mockUserController.getUserBooks).toHaveBeenCalled();
  });

  it('GET /api/users/stats returns stats', async () => {
    await request(app).get('/api/users/1/stats').expect(200);
    expect(mockUserController.getUserStats).toHaveBeenCalled();
  });

  it('PATCH /api/users deactivates account', async () => {
    await request(app).patch('/api/users/1').expect(200);
    expect(mockAccountController.deactivateAccount).toHaveBeenCalled();
  });

  it('PATCH /api/users changes password when action is change_password', async () => {
    const response = await request(app)
      .patch('/api/users/1')
      .send({
        action: 'change_password',
        currentPassword: 'CurrentPass123',
        newPassword: 'NewPass123',
      })
      .expect(200);

    expect(mockAccountController.changePassword).toHaveBeenCalled();
    expect(response.body.data).toMatchObject({
      changed: true,
      accessToken: 'new-access-token',
      idToken: 'new-id-token',
    });
  });
});
