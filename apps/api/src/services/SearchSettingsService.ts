/**
 * SearchSettingsService - Service for managing search feature settings
 *
 * Implements 3-tier priority system for FULLTEXT search:
 * 1. SEARCH_FULLTEXT_FORCE_DISABLED=true → Always OFF (panic switch)
 * 2. SEARCH_FULLTEXT_FORCE_ENABLED=true → Always ON (compliance requirement)
 * 3. Database setting search.fulltext.enabled
 * 4. Default: true (from SETTING_DEFINITIONS)
 */

import { getLogger, type AppLogger } from '@my-many-books/shared-logging';
import { SETTING_KEYS } from '@my-many-books/shared-types';
import { Setting } from '../models';

export interface FulltextStatus {
  enabled: boolean;
  canChange: boolean;
  source: 'force_disabled' | 'force_enabled' | 'database' | 'default';
}

export class SearchSettingsService {
  private logger: AppLogger;
  private cachedFulltextStatus: FulltextStatus | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_TTL = 30000; // 30 seconds

  constructor() {
    this.logger = getLogger();
  }

  /**
   * Get FULLTEXT search status with priority logic
   *
   * Hierarchical precedence:
   * 1. SEARCH_FULLTEXT_FORCE_DISABLED=true → Always OFF (canChange: false)
   * 2. SEARCH_FULLTEXT_FORCE_ENABLED=true → Always ON (canChange: false)
   * 3. Database setting search.fulltext.enabled (canChange: true)
   * 4. Default: true (canChange: true)
   *
   * @returns Status object with enabled flag, source, and canChange flag
   */
  async getFulltextStatus(): Promise<FulltextStatus> {
    // Check cache first
    const now = Date.now();
    if (this.cachedFulltextStatus !== null && now < this.cacheExpiry) {
      return this.cachedFulltextStatus;
    }

    // 1. Check FORCE_DISABLED (highest priority - panic switch)
    if (process.env['SEARCH_FULLTEXT_FORCE_DISABLED'] === 'true') {
      const status: FulltextStatus = {
        enabled: false,
        canChange: false,
        source: 'force_disabled',
      };
      this.cacheStatus(status);
      return status;
    }

    // 2. Check FORCE_ENABLED (second priority - compliance)
    if (process.env['SEARCH_FULLTEXT_FORCE_ENABLED'] === 'true') {
      const status: FulltextStatus = {
        enabled: true,
        canChange: false,
        source: 'force_enabled',
      };
      this.cacheStatus(status);
      return status;
    }

    // 3. Check database setting
    try {
      const setting = await Setting.findOne({
        where: { key: SETTING_KEYS.SEARCH.FULLTEXT.ENABLED },
      });

      if (setting) {
        const enabled = setting.value === 'true';
        const status: FulltextStatus = {
          enabled,
          canChange: true,
          source: 'database',
        };
        this.cacheStatus(status);
        return status;
      }
    } catch (error) {
      this.logger.warn({ err: error }, 'Failed to query search.fulltext.enabled setting from database');
    }

    // 4. Default: enabled (from SETTING_DEFINITIONS)
    const status: FulltextStatus = {
      enabled: true,
      canChange: true,
      source: 'default',
    };
    this.cacheStatus(status);
    return status;
  }

  /**
   * Check if FULLTEXT search is enabled (simplified version)
   *
   * @returns true if FULLTEXT search is enabled
   */
  async isFulltextEnabled(): Promise<boolean> {
    const status = await this.getFulltextStatus();
    return status.enabled;
  }

  /**
   * Invalidate the status cache
   * Call this when database setting changes
   */
  invalidateCache(): void {
    this.cachedFulltextStatus = null;
    this.cacheExpiry = 0;
  }

  /**
   * Cache the fulltext status
   */
  private cacheStatus(status: FulltextStatus): void {
    this.cachedFulltextStatus = status;
    this.cacheExpiry = Date.now() + this.CACHE_TTL;
  }
}
