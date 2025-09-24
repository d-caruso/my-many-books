// ================================================================
// src/utils/sequelize-helpers.ts
// Type-safe wrappers for Sequelize operations with exactOptionalPropertyTypes
// Strategic use of 'any' types is needed here to bridge Sequelize's type system
// ================================================================

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment */

import { Model, ModelStatic, FindOrCreateOptions } from 'sequelize';

/**
 * Type-safe wrapper for Model.create() that handles the exactOptionalPropertyTypes issue
 */
export async function createModel<T extends Model, C>(
  ModelClass: ModelStatic<T>,
  data: C
): Promise<T> {
  // Use type assertion only at this boundary to maintain type safety everywhere else
  return await ModelClass.create(data as any);
}

/**
 * Type-safe wrapper for Model.findOrCreate() that handles the exactOptionalPropertyTypes issue
 */
export async function findOrCreateModel<T extends Model, C>(
  ModelClass: ModelStatic<T>,
  options: Omit<FindOrCreateOptions<any>, 'defaults'> & { defaults: C }
): Promise<[T, boolean]> {
  // Use type assertion only at this boundary to maintain type safety everywhere else
  return await ModelClass.findOrCreate({
    ...options,
    defaults: options.defaults as any,
  });
}
