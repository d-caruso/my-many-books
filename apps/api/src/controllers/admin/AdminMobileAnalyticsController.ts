/** 
 * src/controllers/admin/AdminMobileAnalyticsController.ts
 * Controller for admin-only mobile analytics endpoints
 */

import { BaseController } from '../base/BaseController';
import { ApiResponse } from '../../common/ApiResponse';
import { UniversalRequest } from '../../types';
import { mobileAnalyticsService } from '../../services/MobileAnalyticsService';

export class AdminMobileAnalyticsController extends BaseController {
async getStats(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    try {
    const stats = await mobileAnalyticsService.getAnalyticsStats();
    return this.createSuccessResponse(stats, 'Analytics statistics retrieved');
    } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return this.createErrorResponse(`Failed to retrieve stats: ${errorMessage}`, 500);
    }
}

async getHealth(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    return this.createSuccessResponse({
    status: 'operational',
    message: 'Mobile Analytics pipeline is operational',
    version: '1.0.0',
    endpoints: {
        upload_single: '/api/mobile-analytics/events',
        upload_batch: '/api/mobile-analytics/events/batch',
        statistics: '/api/admin/mobile-analytics/stats',
        health: '/api/admin/mobile-analytics/health',
    },
    });
}
}

export const adminMobileAnalyticsController = new AdminMobileAnalyticsController();