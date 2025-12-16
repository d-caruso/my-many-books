import { AppSetting } from '../../models/AppSetting';
import { SettingCategory, SettingType } from '@my-many-books/shared-types';

export interface SettingResponseDTO {
  key: string;
  value: string;
  category: SettingCategory;
  type: SettingType;
  defaultValue: string;
  description?: string;
  active: boolean;
  deleted: boolean;
  deletedAt?: Date;
  lastSyncedAt?: Date;
  creationDate: Date;
  updateDate?: Date;
}

export const toSettingResponseDTO = (setting: AppSetting): SettingResponseDTO => {
  const dto: SettingResponseDTO = {
    key: setting.key,
    value: setting.value,
    category: setting.category,
    type: setting.type,
    defaultValue: setting.defaultValue,
    active: setting.active,
    deleted: setting.deleted,
    creationDate: setting.creationDate,
  };

  if (setting.description !== undefined) {
    dto.description = setting.description;
  }
  if (setting.deletedAt) {
    dto.deletedAt = setting.deletedAt;
  }
  if (setting.lastSyncedAt) {
    dto.lastSyncedAt = setting.lastSyncedAt;
  }
  if (setting.updateDate) {
    dto.updateDate = setting.updateDate;
  }

  return dto;
};
