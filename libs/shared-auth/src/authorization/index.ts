// ================================================================
// libs/shared-auth/src/authorization/index.ts
// Authorization Module Exports
// ================================================================

export { createAbilityFor } from './caslProvider';
export type { AppAbility } from './caslProvider';
export { ACTIONS, RESOURCES, USER_ROLES } from './constants';
export type { Action, Resource, Subject, UserRole } from './types';
export type { Action as ActionType, Resource as ResourceType } from './types';
