// ================================================================
// libs/shared-types/src/__tests__/constants.test.ts
// Test use constants consistently
// ================================================================

import { MOBILE_HOOKS_SETTINGS_ACTIONS } from "../index";
import {
  AUTH_ENDPOINTS,
  PASSWORD_POLICY,
  PASSWORD_RESET_POLICY,
  SEARCH_SORT_BY_FIELDS,
  SEARCH_SORT_BY_FIELD_VALUES,
  USER_ACCOUNT_PATCH_ACTIONS,
} from "../index";

describe("Mobile Configuration Constants", () => {

    it("should have mobile config actions properly defined", () => {
      expect(MOBILE_HOOKS_SETTINGS_ACTIONS).toBeDefined();
      expect(Object.isFrozen(MOBILE_HOOKS_SETTINGS_ACTIONS)).toBe(true);

      expect(MOBILE_HOOKS_SETTINGS_ACTIONS.UPDATE).toBe("update");
      expect(MOBILE_HOOKS_SETTINGS_ACTIONS.RESET).toBe("reset");
    });

    it("should expose auth endpoint constants", () => {
      expect(Object.isFrozen(AUTH_ENDPOINTS)).toBe(true);
      expect(AUTH_ENDPOINTS.FORGOT_PASSWORD).toBe("/auth/forgot-password");
      expect(AUTH_ENDPOINTS.CONFIRM_FORGOT_PASSWORD).toBe("/auth/confirm-forgot-password");
    });

    it("should expose user patch action constants", () => {
      expect(Object.isFrozen(USER_ACCOUNT_PATCH_ACTIONS)).toBe(true);
      expect(USER_ACCOUNT_PATCH_ACTIONS.CHANGE_PASSWORD).toBe("change_password");
      expect(USER_ACCOUNT_PATCH_ACTIONS.DEACTIVATE_ACCOUNT).toBe("deactivate_account");
    });

    it("should expose password policies", () => {
      expect(PASSWORD_POLICY.MIN_LENGTH).toBe(8);
      expect(PASSWORD_POLICY.REQUIRE_SYMBOLS).toBe(false);
      expect(PASSWORD_RESET_POLICY.TOKEN_TTL_MINUTES).toBe(60);
    });

    it("should expose search sort-by field constants", () => {
      expect(Object.isFrozen(SEARCH_SORT_BY_FIELDS)).toBe(true);
      expect(Object.isFrozen(SEARCH_SORT_BY_FIELD_VALUES)).toBe(true);

      expect(SEARCH_SORT_BY_FIELDS.TITLE).toBe("title");
      expect(SEARCH_SORT_BY_FIELDS.AUTHOR).toBe("author");
      expect(SEARCH_SORT_BY_FIELDS.STATUS).toBe("status");
      expect(SEARCH_SORT_BY_FIELDS.CREATED_AT).toBe("createdAt");
      expect(SEARCH_SORT_BY_FIELDS.UPDATED_AT).toBe("updatedAt");
      expect(SEARCH_SORT_BY_FIELD_VALUES).toEqual([
        "title",
        "author",
        "status",
        "createdAt",
        "updatedAt",
      ]);
    });
  });
