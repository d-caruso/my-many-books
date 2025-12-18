// ================================================================
// libs/shared-types/src/settings/schemas.ts
// Zod schemas for Settings System validation
// ================================================================

import { z } from 'zod';
import { SettingTypeValues, SettingCategoryValues } from './definitions';

/**
 * Zod schema for SettingType enum
 */
export const SettingTypeSchema = z.enum(SettingTypeValues);

/**
 * Zod schema for SettingCategory enum
 */
export const SettingCategorySchema = z.enum(SettingCategoryValues);

/**
 * Zod schema for AppSetting
 */
export const AppSettingSchema = z.object({
  key: z.string(),
  value: z.string(), // JSON-encoded value
  category: SettingCategorySchema,
  type: SettingTypeSchema,
  defaultValue: z.string(), // JSON-encoded default
  description: z.string().optional(),
  active: z.boolean(),
  deleted: z.boolean(),
  deletedAt: z.string().optional(), // ISO date string
  lastSyncedAt: z.string().optional(), // ISO date string
  creationDate: z.string(),
  updateDate: z.string().optional(),
});

/**
 * Array of settings
 */
export const AppSettingsArraySchema = AppSettingSchema.array();

/**
 * Schema for update setting payload
 */
export const UpdateSettingPayloadSchema = z.object({
  value: z.unknown(), // Can be any type since it gets JSON-encoded
});

/**
 * Schema for toggle active payload
 */
export const ToggleActivePayloadSchema = z.object({
  active: z.boolean(),
});
