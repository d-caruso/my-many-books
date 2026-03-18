import { buildTreeSchema } from './buildTreeSchema';

export const HOOK_PHASES = {
  BEFORE: null,
  AFTER: null,
  FAILURE: null,
} as const;

export const MUTATION_OPERATIONS = {
  CREATE: HOOK_PHASES,
  UPDATE: HOOK_PHASES,
  DELETE: HOOK_PHASES,
} as const;

const schema = {
  BOOK: {
    ...MUTATION_OPERATIONS,
    STATUS: {
      CHANGE: HOOK_PHASES,
    },
  },
  AUTHOR: MUTATION_OPERATIONS,
  CATEGORY: MUTATION_OPERATIONS,
  USER: {
    REGISTER: HOOK_PHASES,
    LOGIN: HOOK_PHASES,
    LOGOUT: HOOK_PHASES,
    UPDATE: HOOK_PHASES,
    PROVISION: {
      AFTER: null,
    },
    DEACTIVATE: HOOK_PHASES,
    DELETE: HOOK_PHASES,
    PASSWORD: {
      CHANGE: HOOK_PHASES,
    },
    ROLE: {
      ADD: HOOK_PHASES,
      CHANGE: HOOK_PHASES,
      DELETE: HOOK_PHASES,
    },
  },
  AUTH: {
    LOGIN: {
      FAILURE: null,
    },
    REFRESH: HOOK_PHASES,
    VERIFY_EMAIL: HOOK_PHASES,
    RESEND_CODE: HOOK_PHASES,
    FORGOT_PASSWORD: HOOK_PHASES,
    RESET_PASSWORD: HOOK_PHASES,
  },
  HOOK: {
    ...MUTATION_OPERATIONS,
    RELOAD: HOOK_PHASES,
  },
  CONFIG: {
    MOBILE: {
      HOOKS: {
        ACTIONS: {
          UPDATE: HOOK_PHASES,
        },
        LISTENERS: {
          UPDATE: HOOK_PHASES,
        },
        SETTINGS: {
          UPDATE: HOOK_PHASES,
          RESET: HOOK_PHASES,
        },
        EMERGENCY: {
          UPDATE: HOOK_PHASES,
        },
      },
      APP: {
        SETTINGS: {
          UPDATE: HOOK_PHASES,
          RESET: HOOK_PHASES,
        },
      },
    },
    USER: {
      MOBILE: {
        CONFIG: {
          UPDATE: HOOK_PHASES,
        },
        HOOKS: {
          SETTINGS: {
            UPDATE: HOOK_PHASES,
          },
        },
      },
    },
    SETTINGS: {
      UPDATE: HOOK_PHASES,
      TOGGLE: HOOK_PHASES,
    },
    AUDIT_LOGGING: {
      UPDATE: HOOK_PHASES,
    },
    SEARCH: {
      UPDATE: HOOK_PHASES,
    },
  },
  EMERGENCY: {
    TOGGLE: HOOK_PHASES,
  },
} as const;

export const HOOK_EVENTS = Object.freeze(buildTreeSchema(schema));

export type HookEventsTree = typeof HOOK_EVENTS;
