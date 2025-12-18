import request from 'supertest';
import express from 'express';
import { authMiddleware } from '../../../src/middleware/auth';
import { container } from '../../../src/container';

const mockCategoryController = {
  listCategories: jest.fn(),
  getCategory: jest.fn(),
  createCategory: jest.fn(),
  updateCategory: jest.fn(),
  deleteCategory: jest.fn(),
  getCategoryBooks: jest.fn(),
};

jest.mock('../../../src/container', () => {
  const actual = jest.requireActual('../../../src/container');
  return {
    ...actual,
    container: {
      ...actual.container,
      get: jest.fn(),
    },
  };
});
jest.mock('../../../src/middleware/auth');
jest.mock('../../../src/middleware/authorization', () => ({
  requirePermission: () => (_req: any, _res: any, next: any) => next(),
}));

const app = express();
app.use(express.json());

(container.get as jest.Mock).mockReturnValue(mockCategoryController);
const categoryRoutes = require('../../../src/routes/categoryRoutes').default;
app.use('/api/categories', categoryRoutes);

describe('Category Routes', () => {
  let mockAuthMiddleware: jest.MockedFunction<typeof authMiddleware>;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.values(mockCategoryController).forEach(method => (method as jest.Mock).mockReset());
    (container.get as jest.Mock).mockReturnValue(mockCategoryController);

    mockAuthMiddleware = authMiddleware as jest.MockedFunction<typeof authMiddleware>;
    mockAuthMiddleware.mockImplementation(async (req, _res, next) => {
      (req as any).user = { id: 123, email: 'test@example.com', role: 'user', provider: 'cognito' };
      next();
    });
  });

  it('GET / should forward to controller', async () => {
    mockCategoryController.listCategories.mockResolvedValue({
      statusCode: 200,
      success: true,
      data: [],
    });

    await request(app).get('/api/categories').expect(200);

    expect(mockCategoryController.listCategories).toHaveBeenCalledWith(
      expect.objectContaining({
        user: expect.objectContaining({ id: 123 })
      })
    );
  });

  it('GET /:id should forward', async () => {
    mockCategoryController.getCategory.mockResolvedValue({
      statusCode: 200,
      success: true,
      data: { id: 1 },
    });

    const response = await request(app).get('/api/categories/1').expect(200);

    expect(mockCategoryController.getCategory).toHaveBeenCalled();
    expect(response.body.data).toEqual({ id: 1 });
  });

  it('POST / should forward to controller', async () => {
    mockCategoryController.createCategory.mockResolvedValue({
      statusCode: 201,
      success: true,
      data: { id: 10 },
    });

    await request(app)
      .post('/api/categories')
      .send({ name: 'Fiction' })
      .expect(201);

    expect(mockCategoryController.createCategory).toHaveBeenCalled();
  });

  it('PUT /:id should forward to controller', async () => {
    mockCategoryController.updateCategory.mockResolvedValue({
      statusCode: 200,
      success: true,
      data: { id: 5 },
    });

    await request(app)
      .put('/api/categories/5')
      .send({ name: 'Updated' })
      .expect(200);

    expect(mockCategoryController.updateCategory).toHaveBeenCalled();
  });

  it('DELETE /:id should forward to controller', async () => {
    mockCategoryController.deleteCategory.mockResolvedValue({
      statusCode: 204,
      success: true,
    });

    await request(app).delete('/api/categories/2').expect(204);

    expect(mockCategoryController.deleteCategory).toHaveBeenCalled();
  });

  it('GET /:id/books should forward to controller', async () => {
    mockCategoryController.getCategoryBooks.mockResolvedValue({
      statusCode: 200,
      success: true,
      data: { books: [] },
    });

    await request(app).get('/api/categories/3/books').expect(200);

    expect(mockCategoryController.getCategoryBooks).toHaveBeenCalledWith(
      expect.objectContaining({ pathParameters: { id: '3' } })
    );
  });
});
