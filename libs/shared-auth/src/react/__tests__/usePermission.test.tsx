import React from 'react';
import { render, screen } from '@testing-library/react';
import type { AuthService } from '../../AuthService';
import type { AuthState, User } from '../../types';
import { AuthProvider } from '../AuthProvider';
import { useIsAdmin, useIsOwner, usePermission } from '../usePermission';
import { ACTIONS, RESOURCES } from '../../authorization';

function createAuthServiceMock(authState: AuthState): AuthService {
  return {
    getAuthState: jest.fn<Promise<AuthState>, []>().mockResolvedValue(authState),
  } as unknown as AuthService;
}

function PermissionProbe(props: {
  action: (typeof ACTIONS)[keyof typeof ACTIONS];
  resource: (typeof RESOURCES)[keyof typeof RESOURCES];
  subject?: { userId?: number };
}) {
  const allowed = usePermission(props.action, props.resource, props.subject);
  return <div data-testid="allowed">{String(allowed)}</div>;
}

function RoleProbe(props: { resourceUserId?: number }) {
  const isAdmin = useIsAdmin();
  const isOwner = useIsOwner(props.resourceUserId);
  return (
    <div>
      <div data-testid="isAdmin">{String(isAdmin)}</div>
      <div data-testid="isOwner">{String(isOwner)}</div>
    </div>
  );
}

const regularUser: User = {
  id: 1,
  email: 'user@example.com',
  name: 'User',
  surname: 'One',
  role: 'user',
  isActive: true,
};

const adminUser: User = {
  id: 2,
  email: 'admin@example.com',
  name: 'Admin',
  surname: 'User',
  role: 'admin',
  isActive: true,
};

describe('usePermission', () => {
  it('allows anonymous users to read public resources but not create', async () => {
    const authService = createAuthServiceMock({ user: null, isAuthenticated: false });

    const { unmount } = render(
      <AuthProvider authService={authService}>
        <PermissionProbe action={ACTIONS.READ} resource={RESOURCES.BOOK} />
      </AuthProvider>
    );

    expect(await screen.findByTestId('allowed')).toHaveTextContent('true');
    unmount();

    render(
      <AuthProvider authService={authService}>
        <PermissionProbe action={ACTIONS.CREATE} resource={RESOURCES.BOOK} />
      </AuthProvider>
    );

    expect(await screen.findByTestId('allowed')).toHaveTextContent('false');
  });

  it('enforces ownership rules for regular users', async () => {
    const authService = createAuthServiceMock({ user: regularUser, isAuthenticated: true });

    const { unmount } = render(
      <AuthProvider authService={authService}>
        <PermissionProbe
          action={ACTIONS.UPDATE}
          resource={RESOURCES.BOOK}
          subject={{ userId: regularUser.id }}
        />
      </AuthProvider>
    );

    expect(await screen.findByTestId('allowed')).toHaveTextContent('true');
    unmount();

    render(
      <AuthProvider authService={authService}>
        <PermissionProbe
          action={ACTIONS.UPDATE}
          resource={RESOURCES.BOOK}
          subject={{ userId: 999 }}
        />
      </AuthProvider>
    );

    expect(await screen.findByTestId('allowed')).toHaveTextContent('false');
  });

  it('allows admins to update resources regardless of ownership', async () => {
    const authService = createAuthServiceMock({ user: adminUser, isAuthenticated: true });

    render(
      <AuthProvider authService={authService}>
        <PermissionProbe action={ACTIONS.UPDATE} resource={RESOURCES.BOOK} subject={{ userId: 999 }} />
      </AuthProvider>
    );

    expect(await screen.findByTestId('allowed')).toHaveTextContent('true');
  });

  it('ignores ownership when resource is not ownable (falls back to general permission)', async () => {
    const authService = createAuthServiceMock({ user: adminUser, isAuthenticated: true });

    render(
      <AuthProvider authService={authService}>
        <PermissionProbe action={ACTIONS.READ} resource={RESOURCES.USER} subject={{ userId: 1 }} />
      </AuthProvider>
    );

    expect(await screen.findByTestId('allowed')).toHaveTextContent('true');
  });
});

describe('useIsAdmin/useIsOwner', () => {
  it('returns false when there is no user', async () => {
    const authService = createAuthServiceMock({ user: null, isAuthenticated: false });

    render(
      <AuthProvider authService={authService}>
        <RoleProbe resourceUserId={1} />
      </AuthProvider>
    );

    expect(await screen.findByTestId('isAdmin')).toHaveTextContent('false');
    expect(await screen.findByTestId('isOwner')).toHaveTextContent('false');
  });

  it('returns correct values for regular user', async () => {
    const authService = createAuthServiceMock({ user: regularUser, isAuthenticated: true });

    render(
      <AuthProvider authService={authService}>
        <RoleProbe resourceUserId={regularUser.id} />
      </AuthProvider>
    );

    expect(await screen.findByTestId('isAdmin')).toHaveTextContent('false');
    expect(await screen.findByTestId('isOwner')).toHaveTextContent('true');
  });

  it('returns false when resourceUserId is missing', async () => {
    const authService = createAuthServiceMock({ user: regularUser, isAuthenticated: true });

    render(
      <AuthProvider authService={authService}>
        <RoleProbe />
      </AuthProvider>
    );

    expect(await screen.findByTestId('isOwner')).toHaveTextContent('false');
  });

  it('returns correct values for admin and non-owner resource', async () => {
    const authService = createAuthServiceMock({ user: adminUser, isAuthenticated: true });

    render(
      <AuthProvider authService={authService}>
        <RoleProbe resourceUserId={999} />
      </AuthProvider>
    );

    expect(await screen.findByTestId('isAdmin')).toHaveTextContent('true');
    expect(await screen.findByTestId('isOwner')).toHaveTextContent('false');
  });
});
