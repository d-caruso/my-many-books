import { BaseApiClient } from './base-client';
import {
  AppSetting,
  AppSettingSchema,
  AppSettingsArraySchema
} from '@my-many-books/shared-types';

export class SettingsApi extends BaseApiClient {
  /**
   * Get all active settings (public)
   */
  async getSettings(): Promise<AppSetting[]> {
    const response = await this.get<unknown>('/settings');
    const settings = AppSettingsArraySchema.parse(response);
    return settings.map((setting) => this.convertDateFields(setting));
  }

  /**
   * Get a specific setting by key (public)
   */
  async getSetting(key: string): Promise<AppSetting> {
    const response = await this.get<unknown>(`/settings/${key}`);
    const setting = AppSettingSchema.parse(response);
    return this.convertDateFields(setting);
  }

  /**
   * Get all settings including deleted (admin only)
   */
  async getAllSettingsAdmin(): Promise<AppSetting[]> {
    const response = await this.get<unknown>('/settings/admin');
    const settings = AppSettingsArraySchema.parse(response);
    return settings.map((setting) => this.convertDateFields(setting));
  }

  /**
   * Update a setting value (admin only)
   */
  async updateSetting(key: string, value: unknown): Promise<AppSetting> {
    const response = await this.patch<unknown>(`/settings/admin/${key}`, { value });
    const setting = AppSettingSchema.parse(response);
    return this.convertDateFields(setting);
  }

  /**
   * Toggle setting active status (admin only)
   */
  async toggleActive(key: string, active: boolean): Promise<AppSetting> {
    const response = await this.patch<unknown>(`/settings/admin/${key}/toggle`, { active });
    const setting = AppSettingSchema.parse(response);
    return this.convertDateFields(setting);
  }

  // Convert date fields to Date objects
  private convertDateFields(settings: any): AppSetting {
    return {
      ...settings,
      deletedAt: settings.deletedAt ? new Date(settings.deletedAt) : undefined,
      lastSyncedAt: settings.lastSyncedAt ? new Date(settings.lastSyncedAt) : undefined,
      creationDate: new Date(settings.creationDate),  // creationDate is mandatory
      updateDate: settings.updateDate ? new Date(settings.updateDate) : undefined,
    };
  }
}
