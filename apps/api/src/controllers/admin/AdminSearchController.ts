// ================================================================
// src/controllers/admin/AdminSearchController.ts
// ================================================================

import { inject, injectable } from 'inversify';
import { BaseController } from '../base/BaseController';
import { ApiResponse } from '../../common/ApiResponse';
import { UniversalRequest } from '../../types';
import { TYPES } from '../../container/types';
import { PinnedResultsService } from '../../services/PinnedResultsService';
import { RESOURCE_TYPE_VALUES, ResourceType } from '@my-many-books/shared-types';

function isServiceError(err: unknown): err is { code: string; message: string } {
  return typeof err === 'object' && err !== null && 'code' in err && 'message' in err;
}

interface CreatePinnedResultBody {
  resource_type: string;
  resource_id: number;
  priority: number;
  active?: boolean;
}

interface UpdatePriorityBody {
  priority: number;
}

@injectable()
export class AdminSearchController extends BaseController {
  constructor(
    @inject(TYPES.PinnedResultsService) private readonly pinnedResultsService: PinnedResultsService
  ) {
    super();
  }

  /**
   * GET /admin/search/pinned?resource_type=book
   * Get pinned results by resource type (optional filter)
   */
  async getPinnedResults(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const resourceType = this.getQueryParameter(request, 'resource_type');

    // If resource_type is provided, validate it
    if (resourceType && !(RESOURCE_TYPE_VALUES as readonly string[]).includes(resourceType)) {
      return this.createErrorResponse(
        `Invalid resource_type: ${resourceType}. Must be one of: ${RESOURCE_TYPE_VALUES.join(', ')}`,
        400
      );
    }

    const pinnedResults = resourceType
      ? await this.pinnedResultsService.getPinnedResultsByType(resourceType as ResourceType)
      : await this.pinnedResultsService.getAllPinnedResults();

    return this.createSuccessResponse({
      results: pinnedResults.map(pr => ({
        id: pr.id,
        resource_type: pr.resourceType,
        resource_id: pr.resourceId,
        priority: pr.priority,
        active: pr.active,
        created_at: pr.creationDate,
        updated_at: pr.updateDate,
      })),
      total: pinnedResults.length,
    });
  }

  /**
   * POST /admin/search/pinned
   * Create a new pinned result
   */
  async createPinnedResult(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const body = this.parseBody<CreatePinnedResultBody>(request);
    if (!body) {
      return this.createErrorResponse('Invalid request body', 400);
    }
    const { resource_type, resource_id, priority, active } = body;

    // Validate required fields
    if (!resource_type || !resource_id || priority === undefined) {
      return this.createErrorResponse('Missing required fields: resource_type, resource_id, priority', 400);
    }

    // Validate resource_type against RESOURCE_TYPE_VALUES
    if (!(RESOURCE_TYPE_VALUES as readonly string[]).includes(resource_type)) {
      return this.createErrorResponse(
        `Invalid resource_type: ${resource_type}. Must be one of: ${RESOURCE_TYPE_VALUES.join(', ')}`,
        400
      );
    }

    // Validate resource_id and priority are numbers
    if (typeof resource_id !== 'number' || typeof priority !== 'number') {
      return this.createErrorResponse('resource_id and priority must be numbers', 400);
    }

    try {
      const pinnedResult = await this.pinnedResultsService.createPinnedResult({
        resourceType: resource_type as ResourceType,
        resourceId: resource_id,
        priority,
        active,
      });

      return this.createSuccessResponse(
        {
          id: pinnedResult.id,
          resource_type: pinnedResult.resourceType,
          resource_id: pinnedResult.resourceId,
          priority: pinnedResult.priority,
          active: pinnedResult.active,
          created_at: pinnedResult.creationDate,
          updated_at: pinnedResult.updateDate,
        },
        'Pinned result created successfully',
        undefined,
        201
      );
    } catch (error: unknown) {
      if (isServiceError(error)) {
        if (error.code === 'DUPLICATE_PIN') {
          return this.createErrorResponse(error.message, 409);
        }
        if (error.code === 'INVALID_PRIORITY') {
          return this.createErrorResponse(error.message, 400);
        }
      }
      throw error;
    }
  }

  /**
   * PATCH /admin/search/pinned/:id/priority
   * Update the priority of a pinned result
   */
  async updatePriority(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const id = this.getPathParameter(request, 'id');
    if (!id || isNaN(Number(id))) {
      return this.createErrorResponse('Invalid pinned result ID', 400);
    }

    const body = this.parseBody<UpdatePriorityBody>(request);
    if (!body) {
      return this.createErrorResponse('Invalid request body', 400);
    }
    const { priority } = body;

    if (priority === undefined || typeof priority !== 'number') {
      return this.createErrorResponse('priority field is required and must be a number', 400);
    }

    try {
      const pinnedResult = await this.pinnedResultsService.updatePriority(Number(id), { priority });

      return this.createSuccessResponse({
        id: pinnedResult.id,
        resource_type: pinnedResult.resourceType,
        resource_id: pinnedResult.resourceId,
        priority: pinnedResult.priority,
        active: pinnedResult.active,
        created_at: pinnedResult.creationDate,
        updated_at: pinnedResult.updateDate,
      }, 'Priority updated successfully');
    } catch (error: unknown) {
      if (isServiceError(error)) {
        if (error.code === 'PINNED_RESULT_NOT_FOUND') {
          return this.createErrorResponse(error.message, 404);
        }
        if (error.code === 'INVALID_PRIORITY') {
          return this.createErrorResponse(error.message, 400);
        }
      }
      throw error;
    }
  }

  /**
   * DELETE /admin/search/pinned/:id
   * Delete a pinned result
   */
  async deletePinnedResult(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const id = this.getPathParameter(request, 'id');
    if (!id || isNaN(Number(id))) {
      return this.createErrorResponse('Invalid pinned result ID', 400);
    }

    try {
      await this.pinnedResultsService.deletePinnedResult(Number(id));

      return this.createSuccessResponse(null, 'Pinned result deleted successfully', undefined, 204);
    } catch (error: unknown) {
      if (isServiceError(error) && error.code === 'PINNED_RESULT_NOT_FOUND') {
        return this.createErrorResponse(error.message, 404);
      }
      throw error;
    }
  }
}
