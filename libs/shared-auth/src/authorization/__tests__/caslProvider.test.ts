// ================================================================
// libs/shared-auth/src/authorization/__tests__/caslProvider.test.ts
// Unit Tests for CASL Authorization Provider
// ================================================================

import { createAbilityFor } from '../caslProvider';
import { ACTIONS, RESOURCES } from '../types';

describe('CASL Authorization Provider', () => {
  describe('User Role Abilities', () => {
    const regularUser = {
      id: 1,
      email: 'user@example.com',
      role: 'user' as const,
    };

    it('should allow users to read public resources', () => {
      const ability = createAbilityFor(regularUser);

      expect(ability.can(ACTIONS.READ, RESOURCES.BOOK)).toBe(true);
      expect(ability.can(ACTIONS.READ, RESOURCES.AUTHOR)).toBe(true);
      expect(ability.can(ACTIONS.READ, RESOURCES.CATEGORY)).toBe(true);
    });

    it('should allow users to create resources', () => {
      const ability = createAbilityFor(regularUser);

      expect(ability.can(ACTIONS.CREATE, RESOURCES.BOOK)).toBe(true);
      expect(ability.can(ACTIONS.CREATE, RESOURCES.AUTHOR)).toBe(true);
      expect(ability.can(ACTIONS.CREATE, RESOURCES.CATEGORY)).toBe(true);
    });

    it('should allow users to update their own books', () => {
      const ability = createAbilityFor(regularUser);
      const ownBook = { userId: regularUser.id };

      expect(ability.can(ACTIONS.UPDATE, RESOURCES.BOOK, ownBook)).toBe(true);
    });

    it('should NOT allow users to update other users books', () => {
      const ability = createAbilityFor(regularUser);
      const otherUsersBook = { userId: 999 };  // Different user

      expect(ability.can(ACTIONS.UPDATE, RESOURCES.BOOK, otherUsersBook)).toBe(false);
    });

    it('should allow users to delete their own books', () => {
      const ability = createAbilityFor(regularUser);
      const ownBook = { userId: regularUser.id };

      expect(ability.can(ACTIONS.DELETE, RESOURCES.BOOK, ownBook)).toBe(true);
    });

    it('should NOT allow users to delete other users books', () => {
      const ability = createAbilityFor(regularUser);
      const otherUsersBook = { userId: 999 };

      expect(ability.can(ACTIONS.DELETE, RESOURCES.BOOK, otherUsersBook)).toBe(false);
    });

    it('should allow users to update their own authors', () => {
      const ability = createAbilityFor(regularUser);
      const ownAuthor = { userId: regularUser.id };

      expect(ability.can(ACTIONS.UPDATE, RESOURCES.AUTHOR, ownAuthor)).toBe(true);
      expect(ability.can(ACTIONS.DELETE, RESOURCES.AUTHOR, ownAuthor)).toBe(true);
    });

    it('should NOT allow users to update other users authors', () => {
      const ability = createAbilityFor(regularUser);
      const otherUsersAuthor = { userId: 999 };

      expect(ability.can(ACTIONS.UPDATE, RESOURCES.AUTHOR, otherUsersAuthor)).toBe(false);
      expect(ability.can(ACTIONS.DELETE, RESOURCES.AUTHOR, otherUsersAuthor)).toBe(false);
    });

    it('should allow users to update their own categories', () => {
      const ability = createAbilityFor(regularUser);
      const ownCategory = { userId: regularUser.id };

      expect(ability.can(ACTIONS.UPDATE, RESOURCES.CATEGORY, ownCategory)).toBe(true);
      expect(ability.can(ACTIONS.DELETE, RESOURCES.CATEGORY, ownCategory)).toBe(true);
    });

    it('should NOT allow users to update other users categories', () => {
      const ability = createAbilityFor(regularUser);
      const otherUsersCategory = { userId: 999 };

      expect(ability.can(ACTIONS.UPDATE, RESOURCES.CATEGORY, otherUsersCategory)).toBe(false);
      expect(ability.can(ACTIONS.DELETE, RESOURCES.CATEGORY, otherUsersCategory)).toBe(false);
    });

    it('should NOT allow users to manage all resources', () => {
      const ability = createAbilityFor(regularUser);

      expect(ability.can(ACTIONS.MANAGE, RESOURCES.ALL)).toBe(false);
    });

    it('should allow users to read their own profile', () => {
      const ability = createAbilityFor(regularUser);
      const ownProfile = { id: regularUser.id };

      expect(ability.can(ACTIONS.READ, RESOURCES.USER, ownProfile)).toBe(true);
    });

    it('should NOT allow users to read other users profiles', () => {
      const ability = createAbilityFor(regularUser);
      const otherProfile = { id: 999 };

      expect(ability.can(ACTIONS.READ, RESOURCES.USER, otherProfile)).toBe(false);
    });
  });

  describe('Admin Role Abilities', () => {
    const adminUser = {
      id: 2,
      email: 'admin@example.com',
      role: 'admin' as const,
    };

    it('should allow admin to manage all resources', () => {
      const ability = createAbilityFor(adminUser);

      expect(ability.can(ACTIONS.MANAGE, RESOURCES.ALL)).toBe(true);
    });

    it('should allow admin to create any resource', () => {
      const ability = createAbilityFor(adminUser);

      expect(ability.can(ACTIONS.CREATE, RESOURCES.BOOK)).toBe(true);
      expect(ability.can(ACTIONS.CREATE, RESOURCES.AUTHOR)).toBe(true);
      expect(ability.can(ACTIONS.CREATE, RESOURCES.CATEGORY)).toBe(true);
      expect(ability.can(ACTIONS.CREATE, RESOURCES.USER)).toBe(true);
    });

    it('should allow admin to read any resource', () => {
      const ability = createAbilityFor(adminUser);

      expect(ability.can(ACTIONS.READ, RESOURCES.BOOK)).toBe(true);
      expect(ability.can(ACTIONS.READ, RESOURCES.AUTHOR)).toBe(true);
      expect(ability.can(ACTIONS.READ, RESOURCES.CATEGORY)).toBe(true);
      expect(ability.can(ACTIONS.READ, RESOURCES.USER)).toBe(true);
    });

    it('should allow admin to update any resource', () => {
      const ability = createAbilityFor(adminUser);

      expect(ability.can(ACTIONS.UPDATE, RESOURCES.BOOK)).toBe(true);
      expect(ability.can(ACTIONS.UPDATE, RESOURCES.AUTHOR)).toBe(true);
      expect(ability.can(ACTIONS.UPDATE, RESOURCES.CATEGORY)).toBe(true);
      expect(ability.can(ACTIONS.UPDATE, RESOURCES.USER)).toBe(true);
    });

    it('should allow admin to delete any resource', () => {
      const ability = createAbilityFor(adminUser);

      expect(ability.can(ACTIONS.DELETE, RESOURCES.BOOK)).toBe(true);
      expect(ability.can(ACTIONS.DELETE, RESOURCES.AUTHOR)).toBe(true);
      expect(ability.can(ACTIONS.DELETE, RESOURCES.CATEGORY)).toBe(true);
      expect(ability.can(ACTIONS.DELETE, RESOURCES.USER)).toBe(true);
    });

    it('should allow admin to update other users resources', () => {
      const ability = createAbilityFor(adminUser);
      const otherUsersBook = { userId: 999 };

      expect(ability.can(ACTIONS.UPDATE, RESOURCES.BOOK, otherUsersBook)).toBe(true);
      expect(ability.can(ACTIONS.DELETE, RESOURCES.BOOK, otherUsersBook)).toBe(true);
    });
  });

  describe('Anonymous User (null)', () => {
    it('should allow anonymous users to read public resources', () => {
      const ability = createAbilityFor(null);

      expect(ability.can(ACTIONS.READ, RESOURCES.BOOK)).toBe(true);
      expect(ability.can(ACTIONS.READ, RESOURCES.AUTHOR)).toBe(true);
      expect(ability.can(ACTIONS.READ, RESOURCES.CATEGORY)).toBe(true);
    });

    it('should NOT allow anonymous users to create resources', () => {
      const ability = createAbilityFor(null);

      expect(ability.can(ACTIONS.CREATE, RESOURCES.BOOK)).toBe(false);
      expect(ability.can(ACTIONS.CREATE, RESOURCES.AUTHOR)).toBe(false);
      expect(ability.can(ACTIONS.CREATE, RESOURCES.CATEGORY)).toBe(false);
    });

    it('should NOT allow anonymous users to update resources', () => {
      const ability = createAbilityFor(null);

      expect(ability.can(ACTIONS.UPDATE, RESOURCES.BOOK)).toBe(false);
      expect(ability.can(ACTIONS.UPDATE, RESOURCES.AUTHOR)).toBe(false);
      expect(ability.can(ACTIONS.UPDATE, RESOURCES.CATEGORY)).toBe(false);
    });

    it('should NOT allow anonymous users to delete resources', () => {
      const ability = createAbilityFor(null);

      expect(ability.can(ACTIONS.DELETE, RESOURCES.BOOK)).toBe(false);
      expect(ability.can(ACTIONS.DELETE, RESOURCES.AUTHOR)).toBe(false);
      expect(ability.can(ACTIONS.DELETE, RESOURCES.CATEGORY)).toBe(false);
    });

    it('should NOT allow anonymous users to manage all', () => {
      const ability = createAbilityFor(null);

      expect(ability.can(ACTIONS.MANAGE, RESOURCES.ALL)).toBe(false);
    });
  });
});
