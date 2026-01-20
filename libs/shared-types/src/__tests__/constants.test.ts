// ================================================================
// libs/shared-types/src/__tests__/constants.test.ts
// Test use constants consistently
// ================================================================

import { MOBILE_CONFIG_ACTIONS } from "../index";

describe("Mobile Configuration Constants", () => {

    it("should have mobile config actions properly defined", () => {
      expect(MOBILE_CONFIG_ACTIONS).toBeDefined();
      expect(Object.isFrozen(MOBILE_CONFIG_ACTIONS)).toBe(true);

      expect(MOBILE_CONFIG_ACTIONS.UPDATE).toBe("update");
      expect(MOBILE_CONFIG_ACTIONS.RESET).toBe("reset");
    });
  });
});
