// ================================================================
// src/services/SettingsService.ts
// Settings Service - Manages application settings with auto-sync
// ================================================================

import { AppSetting, AppSettingCreationAttributes } from '../models/AppSetting';
import { getAllSettingDefinitions } from '@my-many-books/shared-types';
import { getLogger } from '@my-many-books/shared-logging';

export class SettingsService {
  private static cache: Map<string, AppSetting> = new Map();
  private static initialized = false;

  /**
   * Initialize settings service with auto-sync from definitions
   * Called once on application startup
   */
  static async initialize(): Promise<void> {
    if (SettingsService.initialized) {
      getLogger().warn('SettingsService already initialized, skipping');
      return;
    }

    // Check if AppSetting model is initialized
    // In test environment, models may not be initialized yet
    if (!AppSetting.sequelize) {
      getLogger().debug('AppSetting model not initialized, skipping SettingsService initialization');
      SettingsService.initialized = true;
      return;
    }

    getLogger().info('Initializing SettingsService...');

    try {
      await SettingsService.syncFromDefinitions();
      await SettingsService.loadCache();
      SettingsService.initialized = true;
      getLogger().info('SettingsService initialized successfully');
    } catch (error) {
      getLogger().error({ err: error }, 'Failed to initialize SettingsService');
      throw error;
    }
  }

  /**
   * Sync database with definitions from code
   * - Adds new settings
   * - Marks removed settings as deleted
   * - Updates last_synced_at for existing settings
   */
  private static async syncFromDefinitions(): Promise<void> {
    const definitions = getAllSettingDefinitions();
    const definitionKeys = new Set(definitions.map(d => d.key));

    getLogger().info({ count: definitions.length }, 'Syncing settings from definitions');

    // Get all existing settings from DB
    const existingSettings = await AppSetting.findAll();

    // 1. Add or update settings from definitions
    for (const def of definitions) {
      const existing = existingSettings.find(s => s.key === def.key);

      if (existing) {
        // Setting exists - update last_synced_at and undelete if needed
        await existing.update({
          lastSyncedAt: new Date(),
          deleted: false,
          description: def.description,
        });
        getLogger().debug({ key: def.key }, 'Updated existing setting');
      } else {
        // New setting - create it
        const createPayload: AppSettingCreationAttributes = {
          key: def.key,
          value: JSON.stringify(def.defaultValue),
          category: def.category,
          type: def.type,
          defaultValue: JSON.stringify(def.defaultValue),
          description: def.description,
          active: true,
          deleted: false,
        };
        await AppSetting.create(createPayload);
        getLogger().info({ key: def.key }, 'Created new setting');
      }
    }

    // 2. Mark settings as deleted if removed from definitions
    for (const existing of existingSettings) {
      if (!definitionKeys.has(existing.key) && !existing.deleted) {
        await existing.update({
          deleted: true,
          deletedAt: new Date(),
        });
        getLogger().info({ key: existing.key }, 'Marked setting as deleted');
      }
    }

    getLogger().info('Settings sync completed');
  }

  /**
   * Load active settings into in-memory cache
   */
  private static async loadCache(): Promise<void> {
    const activeSettings = await AppSetting.findActiveSettings();

    SettingsService.cache.clear();
    for (const setting of activeSettings) {
      SettingsService.cache.set(setting.key, setting);
    }

    getLogger().info({ count: activeSettings.length }, 'Settings loaded into cache');
  }

  /**
   * Get a setting by key from cache
   * Returns parsed value based on type
   */
  static getSetting<T = unknown>(key: string): T | null {
    if (!SettingsService.initialized) {
      throw new Error('SettingsService not initialized. Call initialize() first.');
    }

    const setting = SettingsService.cache.get(key);
    if (!setting) {
      getLogger().warn({ key }, 'Setting not found in cache');
      return null;
    }

    return setting.getParsedValue() as T;
  }

  /**
   * Get all active settings
   */
  static getAllSettings(): AppSetting[] {
    if (!SettingsService.initialized) {
      throw new Error('SettingsService not initialized. Call initialize() first.');
    }

    return Array.from(SettingsService.cache.values());
  }

  /**
   * Get all settings including deleted (admin only)
   */
  static async getAllSettingsAdmin(): Promise<AppSetting[]> {
    if (!SettingsService.initialized) {
      throw new Error('SettingsService not initialized. Call initialize() first.');
    }

    return await AppSetting.findAll({
      order: [['category', 'ASC'], ['key', 'ASC']],
    });
  }

  /**
   * Update a setting value (admin only)
   * Updates DB and refreshes cache
   */
  static async updateSetting(key: string, value: unknown): Promise<AppSetting> {
    if (!SettingsService.initialized) {
      throw new Error('SettingsService not initialized. Call initialize() first.');
    }

    const setting = await AppSetting.findByKey(key);
    if (!setting) {
      throw new Error(`Setting with key '${key}' not found`);
    }

    if (setting.deleted) {
      throw new Error(`Cannot update deleted setting '${key}'`);
    }

    // Update value in DB
    await setting.update({
      value: JSON.stringify(value),
    });

    // Refresh cache
    if (setting.active) {
      SettingsService.cache.set(key, setting);
    } else {
      SettingsService.cache.delete(key);
    }

    getLogger().info({ key, value }, 'Setting updated');
    return setting;
  }

  /**
   * Toggle setting active status (admin only)
   */
  static async toggleActive(key: string, active: boolean): Promise<AppSetting> {
    if (!SettingsService.initialized) {
      throw new Error('SettingsService not initialized. Call initialize() first.');
    }

    const setting = await AppSetting.findByKey(key);
    if (!setting) {
      throw new Error(`Setting with key '${key}' not found`);
    }

    await setting.update({ active });

    // Update cache
    if (active && !setting.deleted) {
      SettingsService.cache.set(key, setting);
    } else {
      SettingsService.cache.delete(key);
    }

    getLogger().info({ key, active }, 'Setting active status toggled');
    return setting;
  }

  /**
   * Check if service is initialized
   */
  static isInitialized(): boolean {
    return SettingsService.initialized;
  }

  /**
   * Reset service (for testing)
   */
  static reset(): void {
    SettingsService.cache.clear();
    SettingsService.initialized = false;
  }
}
