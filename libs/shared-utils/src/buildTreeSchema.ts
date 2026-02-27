/**
 * Tree Schema Builder Utility
 *
 * Builds type-safe, hierarchical trees from schema definitions.
 * Supports nested structures with automatic dot-notation generation and wildcard selectors.
 */

export type SchemaMap = { [key: string]: SchemaMap | null };

declare const __eventBrand: unique symbol;
export type EventName = string & { readonly [__eventBrand]: void };

export type AnyNode<T extends SchemaMap> = keyof T extends never ? Record<never, never> : { ANY: EventName };

export type BuildResult<T extends SchemaMap> = AnyNode<T> & {
  [K in keyof T as T[K] extends null ? K : never]-?: EventName;
} & {
  [K in keyof T as T[K] extends null ? never : K]-?: BuildResult<Extract<T[K], SchemaMap>>;
};

/**
 * Helper function to join path segments with dots
 */
const join = (parts: string[]): string => parts.join('.');

/**
 * Recursively builds an event tree from a schema definition
 *
 * @param schema - The schema object defining the event hierarchy
 * @param parents - Array of parent path segments (used for recursion)
 * @returns A fully-typed event tree with dot-notation strings and wildcard selectors
 *
 * @example
 * ```typescript
 * const schema = {
 *   BOOK: {
 *     CREATE: {
 *       START: null,
 *       SUCCESS: null,
 *       FAILED: null,
 *     },
 *     UPDATE: { START: null, SUCCESS: null }
 *   },
 *   USER: {
 *     LOGIN: null,
 *     LOGOUT: null
 *   }
 * } as const;
 *
 * const events = buildTreeSchema(schema);
 * // Result:
 * // {
 * //   BOOK: {
 * //     CREATE: {
 * //       START: "book.create.start",
 * //       SUCCESS: "book.create.success",
 * //       FAILED: "book.create.failed",
 * //       ANY: "book.create.*"
 * //     },
 * //     UPDATE: { START: "book.update.start", SUCCESS: "book.update.success", ANY: "book.update.*" },
 * //     ANY: "book.*"
 * //   },
 * //   USER: {
 * //     LOGIN: "user.login",
 * //     LOGOUT: "user.logout",
 * //     ANY: "user.*"
 * //   },
 * //   ANY: "*"
 * // }
 * ```
 */
export function buildTreeSchema<T extends SchemaMap>(schema: T, parents: string[] = []): BuildResult<T> {
  const result: Record<string, unknown> = {};
  const keys = Object.keys(schema) as (keyof T)[];

  for (const key of keys) {
    const value = schema[key];
    const path = [...parents, (key as string).toLowerCase()];

    if (value === null) {
      // Leaf node - create dot-notation event string
      result[key as string] = join(path) as EventName;
    } else {
      // Branch node - recursively build subtree
      result[key as string] = buildTreeSchema(value as Extract<typeof value, SchemaMap>, path);
    }
  }

  if (keys.length > 0) {
    // Add wildcard selector for this level (e.g., "book.*", "user.*", "*")
    result['ANY'] = join([...parents, '*']) as EventName;
  }

  return result as BuildResult<T>;
}

/**
 * Type utility to extract the event names from a built event schema
 */
export type ExtractEventNames<T> = T extends string
  ? T
  : T extends Record<string, unknown>
    ? { [K in keyof T]: ExtractEventNames<T[K]> }[keyof T]
    : never;

/**
 * Type utility to get all possible event paths from a schema
 */
export type EventPaths<T extends SchemaMap> = ExtractEventNames<BuildResult<T>>;