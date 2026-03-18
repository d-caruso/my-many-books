import { HOOK_EVENTS } from "../hook-events";

const sortKeysDeep = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nestedValue]) => [key, sortKeysDeep(nestedValue)]),
    );
  }

  return value;
};

describe("HOOK_EVENTS", () => {
  it("should match the canonical shared hook event tree", () => {
    expect(sortKeysDeep(HOOK_EVENTS)).toMatchSnapshot();
  });

  it("should expose before, after, and failure leaves for every entity mutation", () => {
    const mutationBranches = [
      HOOK_EVENTS.BOOK.CREATE,
      HOOK_EVENTS.BOOK.UPDATE,
      HOOK_EVENTS.BOOK.DELETE,
      HOOK_EVENTS.BOOK.STATUS.CHANGE,
      HOOK_EVENTS.AUTHOR.CREATE,
      HOOK_EVENTS.AUTHOR.UPDATE,
      HOOK_EVENTS.AUTHOR.DELETE,
      HOOK_EVENTS.CATEGORY.CREATE,
      HOOK_EVENTS.CATEGORY.UPDATE,
      HOOK_EVENTS.CATEGORY.DELETE,
      HOOK_EVENTS.USER.REGISTER,
      HOOK_EVENTS.USER.LOGIN,
      HOOK_EVENTS.USER.LOGOUT,
      HOOK_EVENTS.USER.UPDATE,
      HOOK_EVENTS.USER.DEACTIVATE,
      HOOK_EVENTS.USER.DELETE,
      HOOK_EVENTS.USER.PASSWORD.CHANGE,
      HOOK_EVENTS.USER.ROLE.ADD,
      HOOK_EVENTS.USER.ROLE.CHANGE,
      HOOK_EVENTS.USER.ROLE.DELETE,
    ];

    mutationBranches.forEach((branch) => {
      expect(branch).toEqual(
        expect.objectContaining({
          BEFORE: expect.any(String),
          AFTER: expect.any(String),
          FAILURE: expect.any(String),
          ANY: expect.any(String),
        }),
      );
    });
  });

  it("should keep AUTH.LOGIN restricted to failure only", () => {
    expect(HOOK_EVENTS.AUTH.LOGIN).toEqual({
      FAILURE: "auth.login.failure",
      ANY: "auth.login.*",
    });
  });

  it("should expose a dedicated after-only provisioning event", () => {
    expect(HOOK_EVENTS.USER.PROVISION).toEqual({
      AFTER: "user.provision.after",
      ANY: "user.provision.*",
    });
  });

  it("should expose pipeline telemetry hook events", () => {
    expect(HOOK_EVENTS.HOOK.ACTION.INVOKED).toBe("hook.action.invoked");
    expect(HOOK_EVENTS.HOOK.PERFORMANCE_WARNING).toBe("hook.performance_warning");
  });
});
