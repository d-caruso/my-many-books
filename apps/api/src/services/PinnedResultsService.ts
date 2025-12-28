// ================================================================
// src/services/PinnedResultsService.ts
// Service for managing pinned search results
// ================================================================

import { injectable } from 'inversify';
import {
  SearchPinnedResult,
  SearchPinnedResultCreationAttributes,
  SearchPinnedResultAttributes
} from '../models/SearchPinnedResult';
import { ResourceType } from '@my-many-books/shared-types';

export interface CreatePinnedResultInput {
  resourceType: ResourceType;
  resourceId: number;
  priority: number;
  active?: boolean;
}

export interface UpdatePriorityInput {
  priority: number;
}

export class PinnedResultsServiceError extends Error {
  constructor(
    message: string,
    public code: 'PINNED_RESULT_NOT_FOUND' | 'DUPLICATE_PIN' | 'INVALID_PRIORITY'
  ) {
    super(message);
    this.name = 'PinnedResultsServiceError';
  }
}

@injectable()
export class PinnedResultsService {
  /**
   * Create a new pinned result
   */
  async createPinnedResult(input: CreatePinnedResultInput): Promise<SearchPinnedResult> {
    // Check if resource is already pinned
    const existing = await SearchPinnedResult.findByResource(input.resourceType, input.resourceId);
    if (existing) {
      throw new PinnedResultsServiceError(
        `Resource ${input.resourceType}:${input.resourceId} is already pinned`,
        'DUPLICATE_PIN'
      );
    }

    // Validate priority
    if (input.priority < 0) {
      throw new PinnedResultsServiceError('Priority must be >= 0', 'INVALID_PRIORITY');
    }

    const createData: SearchPinnedResultCreationAttributes = {
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      priority: input.priority,
      active: input.active ?? true,
    };

    const pinnedResult = await SearchPinnedResult.create(createData as SearchPinnedResultAttributes);

    return pinnedResult;
  }

  /**
   * Get all pinned results for a resource type
   */
  async getPinnedResultsByType(resourceType: ResourceType): Promise<SearchPinnedResult[]> {
    return await SearchPinnedResult.findActiveByResourceType(resourceType);
  }

  /**
   * Get all pinned results (all resource types)
   */
  async getAllPinnedResults(): Promise<SearchPinnedResult[]> {
    return await SearchPinnedResult.findAll({
      order: [['resourceType', 'ASC'], ['priority', 'ASC']],
    });
  }

  /**
   * Get a single pinned result by ID
   */
  async getPinnedResult(id: number): Promise<SearchPinnedResult> {
    const pinnedResult = await SearchPinnedResult.findByPk(id);
    if (!pinnedResult) {
      throw new PinnedResultsServiceError(
        `Pinned result with ID ${id} not found`,
        'PINNED_RESULT_NOT_FOUND'
      );
    }
    return pinnedResult;
  }

  /**
   * Update the priority of a pinned result
   */
  async updatePriority(id: number, input: UpdatePriorityInput): Promise<SearchPinnedResult> {
    const pinnedResult = await this.getPinnedResult(id);

    if (input.priority < 0) {
      throw new PinnedResultsServiceError('Priority must be >= 0', 'INVALID_PRIORITY');
    }

    await pinnedResult.update({ priority: input.priority });
    return pinnedResult;
  }

  /**
   * Delete a pinned result
   */
  async deletePinnedResult(id: number): Promise<void> {
    const pinnedResult = await this.getPinnedResult(id);
    await pinnedResult.destroy();
  }

  /**
   * Toggle active status of a pinned result
   */
  async toggleActive(id: number): Promise<SearchPinnedResult> {
    const pinnedResult = await this.getPinnedResult(id);
    await pinnedResult.update({ active: !pinnedResult.active });
    return pinnedResult;
  }
}
