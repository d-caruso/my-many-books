import { AuthUser } from '../../../src/models/interfaces/ModelInterfaces';

describe('AuthUser Interface', () => {
  it('captures essential properties', () => {
    const authUser: AuthUser = {
      id: 1,
      email: 'test@example.com',
      role: 'user',
            provider: 'cognito',
      providerUserId: 'sub-123',
      isNewUser: true,
    };

    expect(authUser.id).toBe(1);
    expect(authUser.email).toBe('test@example.com');
    expect(authUser.role).toBe('user');
    expect(authUser.provider).toBe('cognito');
    expect(authUser.providerUserId).toBe('sub-123');
    expect(authUser.isNewUser).toBe(true);
  });

  it('supports optional providerUserId and isNewUser', () => {
    const authUser: AuthUser = {
      id: 2,
      email: 'existing@example.com',
      role: 'user',
            provider: 'auth0',
    };

    expect(authUser.providerUserId).toBeUndefined();
    expect(authUser.isNewUser).toBeUndefined();
  });

  it('is serializable', () => {
    const authUser: AuthUser = {
      id: 3,
      email: 'serialize@example.com',
      role: 'user',
            provider: 'custom',
      providerUserId: 'custom-001',
    };

    const parsed = JSON.parse(JSON.stringify(authUser)) as AuthUser;
    expect(parsed).toEqual(authUser);
  });
});
