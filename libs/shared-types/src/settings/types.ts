// ================================================================
// libs/shared-types/src/settings/types.ts
// Type definitions for Settings System
// ================================================================

import { SettingType, SettingCategory } from './definitions';

/**
 * Represents a setting stored in the database
 */
export interface AppSetting {
  key: string;
  value: string; // JSON-encoded value
  category: SettingCategory;
  type: SettingType;
  defaultValue: string; // JSON-encoded default
  description?: string;
  active: boolean;
  deleted: boolean;
  deletedAt?: Date;
  lastSyncedAt?: Date;
  creationDate: Date;
  updateDate?: Date;
}

/**
 * Payload for creating a new setting
 */
export interface CreateAppSettingPayload {
  key: string;
  value: string;
  category: SettingCategory;
  type: SettingType;
  defaultValue: string;
  description?: string;
  active?: boolean;
}

/**
 * Payload for updating an existing setting
 */
export interface UpdateAppSettingPayload {
  value?: string;
  active?: boolean;
  description?: string;
}

/**
 * API response for settings list
 */
export interface AppSettingsResponse {
  settings: AppSetting[];
  total: number;
}

/**
 * Type-safe setting value based on setting type
 */
export type SettingValue<T extends SettingType> =
  T extends 'string' ? string :
  T extends 'number' ? number :
  T extends 'boolean' ? boolean :
  T extends 'enum' ? string :
  T extends 'json' ? unknown :
  never;

/**
 * Parsed setting with typed value
 */
export interface ParsedSetting<T = unknown> {
  key: string;
  value: T;
  category: SettingCategory;
  type: SettingType;
  defaultValue: T;
  description?: string;
  active: boolean;
}
