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

const isResourceType = (value: string): value is ResourceType =>
  RESOURCE_TYPE_VALUES.some(resourceType => resourceType === value);

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

  private isCreatePinnedResultBody(value: unknown): value is CreatePinnedResultBody {
    if (!this.isRecord(value)) {
      return false;
    }

    return (
      typeof value['resource_type'] === 'string' &&
      typeof value['resource_id'] === 'number' &&
      typeof value['priority'] === 'number' &&
      (value['active'] === undefined || typeof value['active'] === 'boolean')
    );
  }

  private isUpdatePriorityBody(value: unknown): value is UpdatePriorityBody {
    return this.isRecord(value) && typeof value['priority'] === 'number';
  }

  /**
   * GET /admin/search/pinned?resource_type=book
   * Get pinned results by resource type (optional filter)
   */
  async getPinnedResults(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const resourceTypeRaw = this.getQueryParameter(request, 'resource_type');

    // If resource_type is provided, validate it
    if (resourceTypeRaw && !isResourceType(resourceTypeRaw)) {
      return this.createErrorResponse(
        `Invalid resource_type: ${resourceTypeRaw}. Must be one of: ${RESOURCE_TYPE_VALUES.join(', ')}`,
        400
      );
    }

    const resourceType = resourceTypeRaw && isResourceType(resourceTypeRaw) ? resourceTypeRaw : null;

    const pinnedResults = resourceType
      ? await this.pinnedResultsService.getPinnedResultsByType(resourceType)
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

    const body = this.parseBody(request);
    if (!this.isCreatePinnedResultBody(body)) {
      return this.createErrorResponse('Invalid request body', 400);
    }
    const { resource_type, resource_id, priority, active } = body;

    // Validate resource_type against RESOURCE_TYPE_VALUES
    if (!isResourceType(resource_type)) {
      return this.createErrorResponse(
        `Invalid resource_type: ${resource_type}. Must be one of: ${RESOURCE_TYPE_VALUES.join(', ')}`,
        400
      );
    }

    try {
      const pinnedResult = await this.pinnedResultsService.createPinnedResult({
        resourceType: resource_type,
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

    const body = this.parseBody(request);
    if (!this.isUpdatePriorityBody(body)) {
      return this.createErrorResponse('Invalid request body', 400);
    }
    const { priority } = body;

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
