import { Op } from 'sequelize';
import type { SettingCategory, SettingType } from '@my-many-books/shared-types';
import { AppSetting } from '../../models';
import type { AppSettingCreationAttributes } from '../../models/AppSetting';

export interface UpsertAppSettingInput {
  key: string;
  value: string;
  category: SettingCategory;
  type: SettingType;
  description: string;
  defaultValue?: string;
}

export const loadAppSettingValueMapByKeys = async (
  keys: readonly string[]
): Promise<Map<string, string>> => {
  const settings = await AppSetting.findAll({
    where: { key: [...keys] },
  });

  return new Map(settings.map(setting => [setting.key, setting.value]));
};

export const loadAppSettingValueMapByPrefix = async (
  prefix: string
): Promise<Map<string, string>> => {
  const settings = await AppSetting.findAll({
    where: {
      key: {
        [Op.like]: `${prefix}%`,
      },
    },
  });

  return new Map(settings.map(setting => [setting.key, setting.value]));
};

export const getLatestAppSettingUpdateByKeys = async (
  keys: readonly string[]
): Promise<string | null> => {
  const latestSetting = await AppSetting.findOne({
    where: { key: [...keys] },
    order: [['updateDate', 'DESC']],
  });

  return latestSetting?.updateDate?.toISOString() ?? null;
};

export const getLatestAppSettingUpdateByPrefix = async (
  prefix: string
): Promise<string | null> => {
  const latestSetting = await AppSetting.findOne({
    where: {
      key: {
        [Op.like]: `${prefix}%`,
      },
    },
    order: [['updateDate', 'DESC']],
  });

  return latestSetting?.updateDate?.toISOString() ?? null;
};

export const upsertAppSetting = async ({
  key,
  value,
  category,
  type,
  description,
  defaultValue = value,
}: UpsertAppSettingInput): Promise<void> => {
  const defaults: AppSettingCreationAttributes = {
    key,
    value,
    active: true,
    category,
    type,
    defaultValue,
    description,
    deleted: false,
  };

  const [setting] = await AppSetting.findOrCreate({
    where: { key },
    defaults,
  });

  if (setting.value !== value) {
    await setting.update({ value });
  }
};
