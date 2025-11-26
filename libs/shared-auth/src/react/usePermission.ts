// ================================================================
// react/usePermission.ts
// React hook for frontend permission checking
// ================================================================

import { useMemo } from 'react';
import { createAbilityFor } from '../authorization/caslProvider';
import { Action, Resource } from '../authorization/types';
import { useAuth } from './AuthProvider';

/**
 * Hook to check if the current user has permission to perform an action on a resource
 *
 * @example
 * ```typescript
 * import { usePermission, ACTIONS, RESOURCES } from '@my-many-books/shared-auth';
 *
 * function BookActions({ book }) {
 *   const canEdit = usePermission(ACTIONS.UPDATE, RESOURCES.BOOK, { userId: book.userId });
 *   const canDelete = usePermission(ACTIONS.DELETE, RESOURCES.BOOK, { userId: book.userId });
 *
 *   return (
 *     <>
 *       {canEdit && <EditButton onClick={() => editBook(book)} />}
 *       {canDelete && <DeleteButton onClick={() => deleteBook(book)} />}
 *     </>
 *   );
 * }
 * ```
 */
export function usePermission(
  action: Action,
  resource: Resource,
  subject?: { userId?: number }
): boolean {
  const { user } = useAuth();

  const ability = useMemo(() => {
    if (!user) {
      return createAbilityFor(null);
    }
    return createAbilityFor({
      id: user.id,
      email: user.email,
      role: user.role as 'user' | 'admin',
    });
  }, [user]);

  // Check permission based on subject (for ownership checks)
  // CASL requires the subject to have a __typename property matching the resource
  if (subject && subject.userId !== undefined) {
    const typedSubject = {
      __typename: resource,
      userId: subject.userId,
    } as any;
    return ability.can(action, typedSubject);
  }

  // Check general permission (no conditions)
  return ability.can(action, resource);
}

/**
 * Hook to check if the current user is an admin
 *
 * @example
 * ```typescript
 * function AdminPanel() {
 *   const isAdmin = useIsAdmin();
 *
 *   if (!isAdmin) {
 *     return <AccessDenied />;
 *   }
 *
 *   return <AdminDashboard />;
 * }
 * ```
 */
export function useIsAdmin(): boolean {
  const { user } = useAuth();
  return user?.role === 'admin';
}

/**
 * Hook to check if the current user owns a resource
 *
 * @example
 * ```typescript
 * function BookCard({ book }) {
 *   const isOwner = useIsOwner(book.userId);
 *   const isAdmin = useIsAdmin();
 *
 *   const canModify = isOwner || isAdmin;
 *
 *   return (
 *     <Card>
 *       <Title>{book.title}</Title>
 *       {canModify && <EditButton />}
 *     </Card>
 *   );
 * }
 * ```
 */
export function useIsOwner(resourceUserId?: number): boolean {
  const { user } = useAuth();
  if (!user || !resourceUserId) {
    return false;
  }
  return user.id === resourceUserId;
}
