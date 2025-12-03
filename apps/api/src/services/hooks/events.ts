type SchemaMap = { [key: string]: SchemaMap | null };

type AnyNode<T extends SchemaMap> = keyof T extends never ? Record<never, never> : { ANY: string };

export type BuildResult<T extends SchemaMap> = {
  [K in keyof T]-?: T[K] extends null ? string : BuildResult<Extract<T[K], SchemaMap>>;
} & AnyNode<T>;

const join = (parts: string[]): string => parts.join('.');

function build<T extends SchemaMap>(schema: T, parents: string[] = []): BuildResult<T> {
  const result: Record<string, unknown> = {};
  const keys = Object.keys(schema) as Array<keyof T>;

  for (const key of keys) {
    const value = schema[key];
    const path = [...parents, (key as string).toLowerCase()];

    if (value === null) {
      result[key as string] = join(path);
    } else {
      result[key as string] = build(value as Extract<typeof value, SchemaMap>, path);
    }
  }

  if (keys.length > 0) {
    result['ANY'] = join([...parents, '*']);
  }

  return result as BuildResult<T>;
}

const schema = {
  BOOK: {
    CREATE: {
      BEFORE: null,
      AFTER: null,
    },
    UPDATE: {
      BEFORE: null,
      AFTER: null,
    },
    DELETE: {
      BEFORE: null,
      AFTER: null,
    },
    STATUS: {
      CHANGE: {
        BEFORE: null,
        AFTER: null,
      },
    },
  },
  AUTHOR: {
    CREATE: {
      BEFORE: null,
      AFTER: null,
    },
    UPDATE: {
      BEFORE: null,
      AFTER: null,
    },
    DELETE: {
      BEFORE: null,
      AFTER: null,
    },
  },
  CATEGORY: {
    CREATE: {
      BEFORE: null,
      AFTER: null,
    },
    UPDATE: {
      BEFORE: null,
      AFTER: null,
    },
    DELETE: {
      BEFORE: null,
      AFTER: null,
    },
  },
  USER: {
    REGISTER: {
      BEFORE: null,
      AFTER: null,
    },
    LOGIN: {
      BEFORE: null,
      AFTER: null,
    },
    LOGOUT: {
      BEFORE: null,
      AFTER: null,
    },
    UPDATE: {
      BEFORE: null,
      AFTER: null,
    },
    ROLE: {
      ADD: {
        BEFORE: null,
        AFTER: null,
      },
      CHANGE: {
        BEFORE: null,
        AFTER: null,
      },
      DELETE: {
        BEFORE: null,
        AFTER: null,
      },
    },
  },
  AUTH: {
    LOGIN: {
      FAILED: null,
    },
  },
} as const;

export const EVENTS = Object.freeze(build(schema));

export type EventsTree = typeof EVENTS;
