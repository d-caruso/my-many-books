// ================================================================
// src/utils/sequelize-helpers.ts
// Type-safe wrappers for Sequelize operations with exactOptionalPropertyTypes
// ================================================================

import {
  Attributes,
  CreateOptions,
  CreationAttributes,
  FindOrCreateOptions,
  Model,
  ModelStatic,
} from 'sequelize';

/**
 * Type-safe wrapper for Model.create() that handles the exactOptionalPropertyTypes issue
 */
export async function createModel<T extends Model>(
  ModelClass: ModelStatic<T>,
  data: CreationAttributes<T>,
  options?: CreateOptions<Attributes<T>>
): Promise<T> {
  if (options === undefined) {
    return await ModelClass.create(data);
  }

  return await ModelClass.create(data, options);
}

/**
 * Type-safe wrapper for Model.findOrCreate() that handles the exactOptionalPropertyTypes issue
 */
export async function findOrCreateModel<T extends Model>(
  ModelClass: ModelStatic<T>,
  options: FindOrCreateOptions<Attributes<T>, CreationAttributes<T>>
): Promise<[T, boolean]> {
  return await ModelClass.findOrCreate(options);
}
