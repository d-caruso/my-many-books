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
} as const;

export const HOOK_EVENTS = Object.freeze(buildTreeSchema(schema));

export type HookEventsTree = typeof HOOK_EVENTS;
