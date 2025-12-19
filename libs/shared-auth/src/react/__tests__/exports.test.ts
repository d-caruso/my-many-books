import * as reactExports from '../index';

describe('react exports', () => {
  it('exports AuthProvider/useAuth/usePermission hooks', () => {
    expect(reactExports.AuthProvider).toBeDefined();
    expect(reactExports.useAuth).toBeDefined();
    expect(reactExports.usePermission).toBeDefined();
    expect(reactExports.useIsAdmin).toBeDefined();
    expect(reactExports.useIsOwner).toBeDefined();
  });
});

