export const RESOURCE_TYPES = Object.freeze({
  // Domain entities
  BOOK: 'book',
  AUTHOR: 'author',
  CATEGORY: 'category',
  USER: 'user',
  HOOK: 'hook',

  // Configuration resources
  MOBILE_CONFIG: 'mobile_config',
  EMERGENCY_CONFIG: 'emergency_config',

  // Hook-related resources
  MOBILE_HOOK_ACTIONS: 'mobile_hook_actions',
  MOBILE_HOOK_ACTION_SETTINGS: 'mobile_hook_action_settings',
  HOOK_ACTION_CONFIG: 'hook_action_config',
  HOOK_ACTION_TEST: 'hook_action_test',
} as const);

export const RESOURCE_TYPE_VALUES = Object.freeze(
  Object.values(RESOURCE_TYPES)
) as readonly (typeof RESOURCE_TYPES[keyof typeof RESOURCE_TYPES])[];

export type ResourceType = typeof RESOURCE_TYPE_VALUES[number];
