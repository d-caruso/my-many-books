// ================================================================
// tests/controllers/admin/StatsController.test.ts
// ================================================================

import { StatsController } from '../../../../src/controllers/admin/StatsController';
import { User } from '../../../../src/models/User';
import { Book } from '../../../../src/models/Book';
import { UniversalRequest } from '../../../../src/types';

// Mock dependencies
jest.mock('../../../../src/models/User');
jest.mock('../../../../src/models/Book');

describe('StatsController', () => {
  let statsController: StatsController;
  let mockRequest: UniversalRequest;

  beforeEach(() => {
    statsController = new StatsController();
    jest.clearAllMocks();

    mockRequest = {
      queryStringParameters: {},
      pathParameters: {},
      headers: { 'accept-language': 'en' },
      body: undefined,
    };
  });

  describe('getSummary', () => {
    it('should return summary statistics', async () => {
      (User.count as jest.Mock).mockImplementation((options) => {
        if (options?.where?.isActive === true) return 5;
        if (options?.where?.role === 'admin') return 2;
        return 10;
      });
      (Book.count as jest.Mock).mockResolvedValue(20);

      const result = await statsController.getSummary(mockRequest);

      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(expect.objectContaining({
        totalUsers: 10,
        activeUsers: 5,
        adminUsers: 2,
        totalBooks: 20,
        timestamp: expect.any(String),
      }));
      expect(User.count).toHaveBeenCalledTimes(3);
      expect(Book.count).toHaveBeenCalledTimes(1);
    });

    it('should handle errors during summary retrieval', async () => {
      (User.count as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await statsController.getSummary(mockRequest);

      expect(result.statusCode).toBe(500);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Internal server error');
    });
  });

  describe('getUserStats', () => {
    it('should return not implemented yet', async () => {
      const result = await statsController.getUserStats(mockRequest);

      expect(result.statusCode).toBe(501);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Not implemented yet');
    });
  });

  describe('getBookStats', () => {
    it('should return not implemented yet', async () => {
      const result = await statsController.getBookStats(mockRequest);

      expect(result.statusCode).toBe(501);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Not implemented yet');
    });
  });
});
