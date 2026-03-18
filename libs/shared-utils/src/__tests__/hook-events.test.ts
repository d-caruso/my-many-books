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
    expect(sortKeysDeep(HOOK_EVENTS)).toMatchInlineSnapshot(`
      {
        "ANY": "*",
        "AUTH": {
          "ANY": "auth.*",
          "FORGOT_PASSWORD": {
            "AFTER": "auth.forgot_password.after",
            "ANY": "auth.forgot_password.*",
            "BEFORE": "auth.forgot_password.before",
            "FAILURE": "auth.forgot_password.failure",
          },
          "LOGIN": {
            "ANY": "auth.login.*",
            "FAILURE": "auth.login.failure",
          },
          "REFRESH": {
            "AFTER": "auth.refresh.after",
            "ANY": "auth.refresh.*",
            "BEFORE": "auth.refresh.before",
            "FAILURE": "auth.refresh.failure",
          },
          "RESEND_CODE": {
            "AFTER": "auth.resend_code.after",
            "ANY": "auth.resend_code.*",
            "BEFORE": "auth.resend_code.before",
            "FAILURE": "auth.resend_code.failure",
          },
          "RESET_PASSWORD": {
            "AFTER": "auth.reset_password.after",
            "ANY": "auth.reset_password.*",
            "BEFORE": "auth.reset_password.before",
            "FAILURE": "auth.reset_password.failure",
          },
          "VERIFY_EMAIL": {
            "AFTER": "auth.verify_email.after",
            "ANY": "auth.verify_email.*",
            "BEFORE": "auth.verify_email.before",
            "FAILURE": "auth.verify_email.failure",
          },
        },
        "AUTHOR": {
          "ANY": "author.*",
          "CREATE": {
            "AFTER": "author.create.after",
            "ANY": "author.create.*",
            "BEFORE": "author.create.before",
            "FAILURE": "author.create.failure",
          },
          "DELETE": {
            "AFTER": "author.delete.after",
            "ANY": "author.delete.*",
            "BEFORE": "author.delete.before",
            "FAILURE": "author.delete.failure",
          },
          "UPDATE": {
            "AFTER": "author.update.after",
            "ANY": "author.update.*",
            "BEFORE": "author.update.before",
            "FAILURE": "author.update.failure",
          },
        },
        "BOOK": {
          "ANY": "book.*",
          "CREATE": {
            "AFTER": "book.create.after",
            "ANY": "book.create.*",
            "BEFORE": "book.create.before",
            "FAILURE": "book.create.failure",
          },
          "DELETE": {
            "AFTER": "book.delete.after",
            "ANY": "book.delete.*",
            "BEFORE": "book.delete.before",
            "FAILURE": "book.delete.failure",
          },
          "STATUS": {
            "ANY": "book.status.*",
            "CHANGE": {
              "AFTER": "book.status.change.after",
              "ANY": "book.status.change.*",
              "BEFORE": "book.status.change.before",
              "FAILURE": "book.status.change.failure",
            },
          },
          "UPDATE": {
            "AFTER": "book.update.after",
            "ANY": "book.update.*",
            "BEFORE": "book.update.before",
            "FAILURE": "book.update.failure",
          },
        },
        "CATEGORY": {
          "ANY": "category.*",
          "CREATE": {
            "AFTER": "category.create.after",
            "ANY": "category.create.*",
            "BEFORE": "category.create.before",
            "FAILURE": "category.create.failure",
          },
          "DELETE": {
            "AFTER": "category.delete.after",
            "ANY": "category.delete.*",
            "BEFORE": "category.delete.before",
            "FAILURE": "category.delete.failure",
          },
          "UPDATE": {
            "AFTER": "category.update.after",
            "ANY": "category.update.*",
            "BEFORE": "category.update.before",
            "FAILURE": "category.update.failure",
          },
        },
        "USER": {
          "ANY": "user.*",
          "DEACTIVATE": {
            "AFTER": "user.deactivate.after",
            "ANY": "user.deactivate.*",
            "BEFORE": "user.deactivate.before",
            "FAILURE": "user.deactivate.failure",
          },
          "DELETE": {
            "AFTER": "user.delete.after",
            "ANY": "user.delete.*",
            "BEFORE": "user.delete.before",
            "FAILURE": "user.delete.failure",
          },
          "LOGIN": {
            "AFTER": "user.login.after",
            "ANY": "user.login.*",
            "BEFORE": "user.login.before",
            "FAILURE": "user.login.failure",
          },
          "LOGOUT": {
            "AFTER": "user.logout.after",
            "ANY": "user.logout.*",
            "BEFORE": "user.logout.before",
            "FAILURE": "user.logout.failure",
          },
          "PASSWORD": {
            "ANY": "user.password.*",
            "CHANGE": {
              "AFTER": "user.password.change.after",
              "ANY": "user.password.change.*",
              "BEFORE": "user.password.change.before",
              "FAILURE": "user.password.change.failure",
            },
          },
          "PROVISION": {
            "AFTER": "user.provision.after",
            "ANY": "user.provision.*",
          },
          "REGISTER": {
            "AFTER": "user.register.after",
            "ANY": "user.register.*",
            "BEFORE": "user.register.before",
            "FAILURE": "user.register.failure",
          },
          "ROLE": {
            "ADD": {
              "AFTER": "user.role.add.after",
              "ANY": "user.role.add.*",
              "BEFORE": "user.role.add.before",
              "FAILURE": "user.role.add.failure",
            },
            "ANY": "user.role.*",
            "CHANGE": {
              "AFTER": "user.role.change.after",
              "ANY": "user.role.change.*",
              "BEFORE": "user.role.change.before",
              "FAILURE": "user.role.change.failure",
            },
            "DELETE": {
              "AFTER": "user.role.delete.after",
              "ANY": "user.role.delete.*",
              "BEFORE": "user.role.delete.before",
              "FAILURE": "user.role.delete.failure",
            },
          },
          "UPDATE": {
            "AFTER": "user.update.after",
            "ANY": "user.update.*",
            "BEFORE": "user.update.before",
            "FAILURE": "user.update.failure",
          },
        },
      }
    `);
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
});
