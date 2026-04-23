import { SettingCategorySchema, SettingTypeSchema } from '../settings/schemas';
import { SETTING_DEFINITIONS, SETTING_KEYS, getAllSettingDefinitions } from '../settings/definitions';

describe('shared-types settings definitions', () => {
  it('exposes SETTING_KEYS that match SETTING_DEFINITIONS', () => {
    expect(SETTING_KEYS.BOOKS.LIST.STATUS.ONCHANGE).toBe(
      SETTING_DEFINITIONS.BOOKS.LIST.STATUS.ONCHANGE.key
    );
    expect(SETTING_KEYS.USERS.LIST.ACTIVE.ONCHANGE).toBe(
      SETTING_DEFINITIONS.USERS.LIST.ACTIVE.ONCHANGE.key
    );
    expect(SETTING_KEYS.ONBOARDING.COMPLETED).toBe(
      SETTING_DEFINITIONS.ONBOARDING.COMPLETED.key
    );
  });

  it('flattens definitions into a unique list', () => {
    const all = getAllSettingDefinitions();
    const keys = all.map((d) => d.key);

    expect(all.length).toBeGreaterThan(0);
    expect(new Set(keys).size).toBe(keys.length);

    for (const def of all) {
      expect(SettingCategorySchema.safeParse(def.category).success).toBe(true);
      expect(SettingTypeSchema.safeParse(def.type).success).toBe(true);
      expect(def.description.length).toBeGreaterThan(0);
      if (def.allowedValues) {
        expect(def.allowedValues).toContain(def.defaultValue);
      }
    }
  });

  describe('SETTING_DEFINITIONS.ONBOARDING', () => {
    it('defines onboarding.completed with correct shape', () => {
      const def = SETTING_DEFINITIONS.ONBOARDING.COMPLETED;

      expect(def.key).toBe('onboarding.completed');
      expect(def.category).toBe('ui');
      expect(def.type).toBe('boolean');
      expect(def.defaultValue).toBe(false);
      expect(def.description).toBe(
        'Whether the user has completed or skipped the first-login onboarding tour'
      );
    });
  });

  describe('SETTING_KEYS.ONBOARDING', () => {
    it('has the correct key string', () => {
      expect(SETTING_KEYS.ONBOARDING.COMPLETED).toBe('onboarding.completed');
    });
  });
});
