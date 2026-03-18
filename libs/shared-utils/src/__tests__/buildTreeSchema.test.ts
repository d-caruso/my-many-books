import { buildTreeSchema } from "../buildTreeSchema";
import { HOOK_PHASES, MUTATION_OPERATIONS } from "../hook-events";

describe("buildTreeSchema", () => {
  it("should build simple flat schema", () => {
    const schema = {
      LOGIN: null,
      LOGOUT: null,
      REFRESH: null,
    } as const;

    const result = buildTreeSchema(schema);

    expect(result).toEqual({
      LOGIN: "login",
      LOGOUT: "logout",
      REFRESH: "refresh",
      ANY: "*",
    });
  });

  it("should build nested schema with two levels", () => {
    const schema = {
      USER: {
        LOGIN: null,
        LOGOUT: null,
      },
      BOOK: {
        CREATE: null,
        DELETE: null,
      },
    } as const;

    const result = buildTreeSchema(schema);

    expect(result).toEqual({
      USER: {
        LOGIN: "user.login",
        LOGOUT: "user.logout",
        ANY: "user.*",
      },
      BOOK: {
        CREATE: "book.create",
        DELETE: "book.delete",
        ANY: "book.*",
      },
      ANY: "*",
    });
  });

  it("should build deeply nested schema with unified hook phases", () => {
    const schema = {
      BOOK: {
        CREATE: {
          BEFORE: null,
          AFTER: null,
          FAILURE: null,
        },
        UPDATE: HOOK_PHASES,
        DELETE: null,
      },
    } as const;

    const result = buildTreeSchema(schema);

    expect(result).toEqual({
      BOOK: {
        CREATE: {
          BEFORE: "book.create.before",
          AFTER: "book.create.after",
          FAILURE: "book.create.failure",
          ANY: "book.create.*",
        },
        UPDATE: {
          BEFORE: "book.update.before",
          AFTER: "book.update.after",
          FAILURE: "book.update.failure",
          ANY: "book.update.*",
        },
        DELETE: "book.delete",
        ANY: "book.*",
      },
      ANY: "*",
    });
  });

  it("should handle mixed case keys by converting to lowercase", () => {
    const schema = {
      USER_AUTH: {
        LOGIN_SUCCESS: null,
        LOGIN_FAILED: null,
      },
    } as const;

    const result = buildTreeSchema(schema);

    expect(result).toEqual({
      USER_AUTH: {
        LOGIN_SUCCESS: "user_auth.login_success",
        LOGIN_FAILED: "user_auth.login_failed",
        ANY: "user_auth.*",
      },
      ANY: "*",
    });
  });

  it("should handle empty schema", () => {
    const schema = {} as const;
    const result = buildTreeSchema(schema);
    expect(result).toEqual({});
  });

  it("should maintain type safety", () => {
    const schema = {
      BOOK: {
        CREATE: {
          BEFORE: null,
          AFTER: null,
          FAILURE: null,
        },
      },
    } as const;

    const result = buildTreeSchema(schema);

    // TypeScript should know these paths exist
    expect(typeof result.BOOK.CREATE.BEFORE).toBe("string");
    expect(typeof result.BOOK.CREATE.AFTER).toBe("string");
    expect(typeof result.BOOK.CREATE.FAILURE).toBe("string");
    expect(typeof result.BOOK.CREATE.ANY).toBe("string");
    expect(typeof result.BOOK.ANY).toBe("string");
    expect(typeof result.ANY).toBe("string");

    // Should have correct values
    expect(result.BOOK.CREATE.BEFORE).toBe("book.create.before");
    expect(result.BOOK.CREATE.AFTER).toBe("book.create.after");
    expect(result.BOOK.CREATE.FAILURE).toBe("book.create.failure");
  });

  it("should build mutation operations spread with before/after/failure phases", () => {
    const schema = {
      BOOK: {
        ...MUTATION_OPERATIONS,
        STATUS: {
          CHANGE: HOOK_PHASES,
        },
      },
      QUEUE: {
        ENQUEUE: null,
        PROCESS: { START: null, COMPLETE: null },
        RETRY: null,
        FAILED: null,
      },
      ERROR: {
        UNHANDLED: null,
        VALIDATION: null,
        NETWORK_TIMEOUT: null,
      },
    } as const;

    const result = buildTreeSchema(schema);

    // Test a few key paths
    expect(result.BOOK.CREATE.BEFORE).toBe("book.create.before");
    expect(result.BOOK.UPDATE.AFTER).toBe("book.update.after");
    expect(result.BOOK.DELETE.FAILURE).toBe("book.delete.failure");
    expect(result.BOOK.STATUS.CHANGE.FAILURE).toBe("book.status.change.failure");
    expect(result.QUEUE.PROCESS.START).toBe("queue.process.start");
    expect(result.ERROR.NETWORK_TIMEOUT).toBe("error.network_timeout");

    // Test wildcard generation
    expect(result.BOOK.CREATE.ANY).toBe("book.create.*");
    expect(result.BOOK.STATUS.CHANGE.ANY).toBe("book.status.change.*");
    expect(result.QUEUE.ANY).toBe("queue.*");
    expect(result.ANY).toBe("*");
  });

  it("should be compatible with Object.freeze", () => {
    const schema = {
      TEST: {
        EVENT: null,
      },
    } as const;

    const result = Object.freeze(buildTreeSchema(schema));

    expect(result.TEST.EVENT).toBe("test.event");
    expect(result.TEST.ANY).toBe("test.*");
  });
});
