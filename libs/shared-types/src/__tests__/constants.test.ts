// ================================================================
// libs/shared-types/src/__tests__/constants.test.ts
// Test use constants consistently
// ================================================================

import { MOBILE_HOOKS_SETTINGS_ACTIONS } from "../index";

describe("Mobile Configuration Constants", () => {

    it("should have mobile config actions properly defined", () => {
      expect(MOBILE_HOOKS_SETTINGS_ACTIONS).toBeDefined();
      expect(Object.isFrozen(MOBILE_HOOKS_SETTINGS_ACTIONS)).toBe(true);

      expect(MOBILE_HOOKS_SETTINGS_ACTIONS.UPDATE).toBe("update");
      expect(MOBILE_HOOKS_SETTINGS_ACTIONS.RESET).toBe("reset");
    });
  });
