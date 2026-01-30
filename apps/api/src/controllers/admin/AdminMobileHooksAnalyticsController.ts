// ================================================================
// src/controllers/admin/AdminMobileHooksAnalyticsController.ts
// Admin endpoints for mobile hook analytics + monitoring
// ================================================================

import { Op } from 'sequelize';
import { BaseController } from '../base/BaseController';
import { ApiResponse } from '../../common/ApiResponse';
import { UniversalRequest } from '../../types';
import { MobileAnalyticsEvent, MobileHookActionExecution } from '../../models';

type RecentMobileHookEvent = {
  eventId: string;
  eventType: string;
  userId: string | null;
  timestamp: string;
  processingStatus: 'pending' | 'processed' | 'failed';
  processingError: string | null;
  createdAt: string;
  updatedAt: string;
  actionExecutions: Array<{
    actionType: string;
    status: 'success' | 'failed' | 'skipped';
    errorMessage: string | null;
    executionTimeMs: number | null;
    executedAt: string;
    details?: Record<string, unknown>;
  }>;
};

export class AdminMobileHooksAnalyticsController extends BaseController {
  /**
   * GET /api/v1/admin/mobile-hooks/analytics/events/recent
   * Returns the last N mobile analytics events with per-action execution results.
   */
  async getRecentEvents(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const limitParam = request.queryStringParameters?.['limit'];
    const parsed = limitParam ? Number.parseInt(String(limitParam), 10) : 50;
    const limit = Math.min(200, Math.max(1, Number.isFinite(parsed) ? parsed : 50));

    const events = await MobileAnalyticsEvent.findAll({
      order: [['creationDate', 'DESC']],
      limit,
      attributes: [
        'id',
        'eventId',
        'eventType',
        'userId',
        'timestamp',
        'processingStatus',
        'processingError',
        'creationDate',
        'updateDate',
      ],
    });

    const eventIds = events.map(event => event.id);
    const executions = eventIds.length
      ? await MobileHookActionExecution.findAll({
          where: {
            mobileAnalyticsEventId: { [Op.in]: eventIds },
          },
          order: [['executedAt', 'DESC']],
          attributes: [
            'id',
            'mobileAnalyticsEventId',
            'actionType',
            'status',
            'errorMessage',
            'details',
            'executionTimeMs',
            'executedAt',
          ],
        })
      : [];

    const executionsByEventId = new Map<
      number,
      Array<{
        actionType: string;
        status: 'success' | 'failed' | 'skipped';
        errorMessage: string | null;
        executionTimeMs: number | null;
        executedAt: string;
        details?: Record<string, unknown>;
      }>
    >();

    for (const execution of executions) {
      const list = executionsByEventId.get(execution.mobileAnalyticsEventId) || [];
      const details = (execution.details as Record<string, unknown> | null) || null;
      list.push(
        details
          ? {
              actionType: execution.actionType,
              status: execution.status,
              errorMessage: execution.errorMessage || null,
              executionTimeMs: execution.executionTimeMs || null,
              executedAt: execution.executedAt.toISOString(),
              details,
            }
          : {
              actionType: execution.actionType,
              status: execution.status,
              errorMessage: execution.errorMessage || null,
              executionTimeMs: execution.executionTimeMs || null,
              executedAt: execution.executedAt.toISOString(),
            }
      );
      executionsByEventId.set(execution.mobileAnalyticsEventId, list);
    }

    const data: { events: RecentMobileHookEvent[] } = {
      events: events.map(event => ({
        eventId: event.eventId,
        eventType: event.eventType,
        userId: event.userId || null,
        timestamp: event.timestamp.toISOString(),
        processingStatus: event.processingStatus,
        processingError: event.processingError || null,
        createdAt: event.creationDate.toISOString(),
        updatedAt: event.updateDate.toISOString(),
        actionExecutions: executionsByEventId.get(event.id) || [],
      })),
    };

    return this.createSuccessResponse(data);
  }

  private ensureAuthenticated(request: UniversalRequest): ApiResponse | null {
    if (!request.user?.id) {
      return this.createErrorResponseI18n('errors:auth_required', 401);
    }
    return null;
  }
}

export const adminMobileHooksAnalyticsController = new AdminMobileHooksAnalyticsController();
