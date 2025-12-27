/**
 * SearchConfig - Centralized search configuration using constants
 *
 * This configuration ensures:
 * - No hard-coded strings for resource types or sort directions
 * - Type-safe search configuration
 * - Centralized management of search settings
 */

import { ResourceType, SortDirection } from '@my-many-books/shared-types';

/**
 * Search configuration for a resource type
 */
export interface ResourceSearchConfig {
  /** Resource type constant (e.g., RESOURCE_TYPES.BOOK) */
  resourceType: ResourceType;

  /** Valid sortable field names for this resource */
  sortableFields: readonly string[];

  /** Default sort field */
  defaultSortField: string;

  /** Default sort direction */
  defaultSortDirection: SortDirection;

  /** Whether FULLTEXT search is supported for this resource */
  supportsFulltext: boolean;
}

/**
 * Global search configuration
 * Maps resource types to their search configuration
 */
export class SearchConfig {
  private static configs = new Map<ResourceType, ResourceSearchConfig>();

  /**
   * Register a resource search configuration
   */
  static register(config: ResourceSearchConfig): void {
    this.configs.set(config.resourceType, config);
  }

  /**
   * Get search configuration for a resource type
   */
  static getConfig(resourceType: ResourceType): ResourceSearchConfig | undefined {
    return this.configs.get(resourceType);
  }

  /**
   * Validate if a field is sortable for a resource type
   */
  static isSortableField(resourceType: ResourceType, field: string): boolean {
    const config = this.configs.get(resourceType);
    return config ? config.sortableFields.includes(field) : false;
  }

  /**
   * Get default sort configuration for a resource type
   */
  static getDefaultSort(resourceType: ResourceType): {
    field: string;
    direction: SortDirection;
  } | undefined {
    const config = this.configs.get(resourceType);
    return config
      ? {
          field: config.defaultSortField,
          direction: config.defaultSortDirection,
        }
      : undefined;
  }
}

/**
 * Initialize SearchConfig with constants
 * This ensures all configurations use constants, not hard-coded strings
 */
export const initializeSearchConfig = (): void => {
  // Configuration initialization is done by individual services
  // This ensures each service owns its own configuration
};
