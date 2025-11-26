// ================================================================
// libs/shared-auth/src/authorization/caslProvider.ts
// CASL Ability Provider - Defines authorization rules
// ================================================================

import { AbilityBuilder, createMongoAbility, MongoAbility } from '@casl/ability';
import { ACTIONS, RESOURCES, Action, Resource } from './types';

/**
 * User interface for authorization
 */
interface AuthUser {
  id: number;
  email: string;
  role: 'user' | 'admin';
}

/**
 * Type for our application's ability
 */
export type AppAbility = MongoAbility<[Action, Resource]>;

/**
 * Create ability rules for a user based on their role
 *
 * @param user - The authenticated user (or null for anonymous)
 * @returns CASL Ability instance with defined permissions
 */
export function createAbilityFor(user: AuthUser | null): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  // ============================================
  // PUBLIC ACCESS (Non-authenticated users)
  // ============================================
  // Everyone can read public resources
  can(ACTIONS.READ, RESOURCES.BOOK);
  can(ACTIONS.READ, RESOURCES.AUTHOR);
  can(ACTIONS.READ, RESOURCES.CATEGORY);

  // ============================================
  // AUTHENTICATED USERS
  // ============================================
  if (user) {
    // Users can create new resources
    can(ACTIONS.CREATE, RESOURCES.BOOK);
    can(ACTIONS.CREATE, RESOURCES.AUTHOR);
    can(ACTIONS.CREATE, RESOURCES.CATEGORY);

    // Users can update/delete ONLY their own resources
    // Condition: { userId: user.id } enforces ownership
    can(ACTIONS.UPDATE, RESOURCES.BOOK, { userId: user.id });
    can(ACTIONS.DELETE, RESOURCES.BOOK, { userId: user.id });

    can(ACTIONS.UPDATE, RESOURCES.AUTHOR, { userId: user.id });
    can(ACTIONS.DELETE, RESOURCES.AUTHOR, { userId: user.id });

    can(ACTIONS.UPDATE, RESOURCES.CATEGORY, { userId: user.id });
    can(ACTIONS.DELETE, RESOURCES.CATEGORY, { userId: user.id });

    // Users can read their own profile
    can(ACTIONS.READ, RESOURCES.USER, { id: user.id });
  }

  // ============================================
  // ADMIN USERS
  // ============================================
  if (user?.role === 'admin') {
    // Admin has full access to everything
    can(ACTIONS.MANAGE, RESOURCES.ALL);
  }

  return build();
}
