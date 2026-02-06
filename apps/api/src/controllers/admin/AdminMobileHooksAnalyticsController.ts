// ================================================================
// src/controllers/admin/AdminMobileHooksAnalyticsController.ts
// Admin endpoints for mobile hook analytics + monitoring
// ================================================================

import { Op } from 'sequelize';
import { BaseController } from '../base/BaseController';
import { ApiResponse } from '../../common/ApiResponse';
import { UniversalRequest } from '../../types';
import { MobileAnalyticsEvent, MobileHookActionExecution } from '../../models';
import type { MobileAnalyticsProcessingStatus } from '@my-many-books/shared-types';

type RecentMobileHookEvent = {
  eventId: string;
  eventType: string;
  userId: string | null;
  timestamp: string;
  processingStatus: MobileAnalyticsProcessingStatus;
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
   * GET /api/<version>/admin/mobile-hooks/analytics/events/recent
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

  async getActionStats(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const rows = (await MobileHookActionExecution.findAll({
      attributes: [
        'actionType',
        [MobileHookActionExecution.sequelize!.fn('COUNT', '*'), 'attempted'],
        [MobileHookActionExecution.sequelize!.fn('SUM',
          MobileHookActionExecution.sequelize!.literal("CASE WHEN \"status\" = 'success' THEN 1 ELSE 0 END")
        ), 'successful'],
        [MobileHookActionExecution.sequelize!.fn('SUM',
          MobileHookActionExecution.sequelize!.literal("CASE WHEN \"status\" = 'failed' THEN 1 ELSE 0 END")
        ), 'failed'],
      ],
      group: ['actionType'],
      raw: true,
    })) as unknown as Array<{ actionType: string; attempted: string; successful: string; failed: string }>;

    const breakdown = rows.map(row => {
      const attempted = Number(row.attempted);
      const successful = Number(row.successful);
      const failed = Number(row.failed);
      return {
        actionType: row.actionType,
        attempted,
        successful,
        failed,
        successRate: attempted ? Math.round((successful / attempted) * 100) / 100 : 0,
        errorRate: attempted ? Math.round((failed / attempted) * 100) / 100 : 0,
      };
    });

    return this.createSuccessResponse({ actionTypeBreakdown: breakdown });
  }
}

export const adminMobileHooksAnalyticsController = new AdminMobileHooksAnalyticsController();
