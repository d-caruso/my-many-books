// ================================================================
// src/controllers/admin/StatsController.ts
// Admin statistics and metrics controller
// ================================================================

import { BaseController } from '../base/BaseController';
import { ApiResponse } from '../../common/ApiResponse';
import { UniversalRequest } from '../../types';
import { User } from '../../models/User';
import { Book } from '../../models/Book';

/**
 * Controller for admin statistics and dashboard metrics.
 * All endpoints require admin authentication (enforced by adminRoutes middleware).
 */
export class StatsController extends BaseController {
  /**
   * Get summary statistics for the admin dashboard
   * GET /api/v1/admin/stats/summary
   */
  async getSummary(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);

    try {
      // Get counts from database
      const totalUsers = await User.count();
      const activeUsers = await User.count({ where: { isActive: true } });
      const adminUsers = await User.count({ where: { role: 'admin' } });
      const totalBooks = await Book.count();

      return this.createSuccessResponse({
        totalUsers,
        activeUsers,
        adminUsers,
        totalBooks,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Stats summary error:', error);
      return this.createErrorResponseI18n('errors:internal_server_error', 500);
    }
  }

  /**
   * Get detailed user statistics
   * GET /api/v1/admin/stats/users
   *
   * Future implementation: user growth over time, user activity, etc.
   */
  getUserStats(_request: UniversalRequest): Promise<ApiResponse> {
    // TODO: Implement detailed user statistics
    return Promise.resolve(this.createErrorResponse('Not implemented yet', 501));
  }

  /**
   * Get detailed book statistics
   * GET /api/v1/admin/stats/books
   *
   * Future implementation: popular books, book additions over time, etc.
   */
  getBookStats(_request: UniversalRequest): Promise<ApiResponse> {
    // TODO: Implement detailed book statistics
    return Promise.resolve(this.createErrorResponse('Not implemented yet', 501));
  }
}

export const statsController = new StatsController();
