import { buildTreeSchema } from '@my-many-books/shared-utils';

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

export const EVENTS = Object.freeze(buildTreeSchema(schema));

export type EventsTree = typeof EVENTS;
