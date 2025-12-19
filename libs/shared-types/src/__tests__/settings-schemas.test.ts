import {
  AppSettingSchema,
  AppSettingsArraySchema,
  SettingCategorySchema,
  SettingTypeSchema,
  ToggleActivePayloadSchema,
  UpdateSettingPayloadSchema,
} from '../settings/schemas';
import { BOOK_STATUS_CHANGE_BEHAVIOR, SettingCategoryValues, SettingTypeValues } from '../settings/definitions';

describe('shared-types settings schemas', () => {
  it('validates SettingType/SettingCategory enums', () => {
    for (const value of SettingTypeValues) {
      expect(SettingTypeSchema.parse(value)).toBe(value);
    }
    for (const value of SettingCategoryValues) {
      expect(SettingCategorySchema.parse(value)).toBe(value);
    }

    expect(() => SettingTypeSchema.parse('nope')).toThrow();
    expect(() => SettingCategorySchema.parse('nope')).toThrow();
  });

  it('validates AppSettingSchema with optional fields omitted', () => {
    const now = new Date().toISOString();

    const parsed = AppSettingSchema.parse({
      key: 'books.list.status.onchange',
      value: JSON.stringify(BOOK_STATUS_CHANGE_BEHAVIOR.REMOVE),
      category: 'ui',
      type: 'enum',
      defaultValue: JSON.stringify(BOOK_STATUS_CHANGE_BEHAVIOR.REMOVE),
      active: true,
      deleted: false,
      creationDate: now,
    });

    expect(parsed.key).toBe('books.list.status.onchange');
    expect(parsed.updateDate).toBeUndefined();
  });

  it('validates arrays and payload schemas', () => {
    const now = new Date().toISOString();

    const list = AppSettingsArraySchema.parse([
      {
        key: 'users.list.active.onchange',
        value: JSON.stringify('refresh'),
        category: 'ui',
        type: 'enum',
        defaultValue: JSON.stringify('refresh'),
        active: true,
        deleted: false,
        creationDate: now,
        updateDate: now,
      },
    ]);

    expect(list).toHaveLength(1);

    expect(UpdateSettingPayloadSchema.parse({ value: { any: 'thing' } })).toBeDefined();
    expect(UpdateSettingPayloadSchema.parse({ value: 123 })).toBeDefined();
    expect(ToggleActivePayloadSchema.parse({ active: false })).toEqual({ active: false });
  });
});

