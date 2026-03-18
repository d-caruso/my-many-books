import { AdminUserService, AdminUserServiceError } from '../../../src/services/user/AdminUserService';
import { Repository as UserRepositoryContract } from '../../../src/repositories/user/Repository';
import { emitHookEvent } from '../../../src/services/hooks/hookSystem';
import { EVENTS } from '../../../src/services/hooks/events';

jest.mock('../../../src/services/hooks/hookSystem', () => ({
  emitHookEvent: jest.fn().mockResolvedValue(undefined),
}));

const adminContext = { userId: 1, role: 'admin' };

describe('AdminUserService', () => {
  let service: AdminUserService;
  let repository: jest.Mocked<UserRepositoryContract>;
  const emitHookEventMock = emitHookEvent as jest.MockedFunction<typeof emitHookEvent>;

  beforeEach(() => {
    repository = {
      initializeControllerContext: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      list: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      countByRole: jest.fn(),
    } as unknown as jest.Mocked<UserRepositoryContract>;

    service = new AdminUserService(repository);
    emitHookEventMock.mockClear();
  });

  it('lists users via repository', async () => {
    repository.list.mockResolvedValue({ rows: [], total: 0, limit: 20, offset: 0 });
    await service.listUsers({ limit: 20, offset: 0 });
    expect(repository.list).toHaveBeenCalled();
  });

  it('throws when updating missing user', async () => {
    repository.findById.mockResolvedValue(null);
    await expect(service.updateUser(1, {}, adminContext)).rejects.toThrow(AdminUserServiceError);
  });

  it('ensures unique email on update', async () => {
    repository.findById.mockResolvedValue({ id: 1, email: 'old@example.com', role: 'user' } as any);
    repository.findByEmail.mockResolvedValue({ id: 2 } as any);
    await expect(
      service.updateUser(1, { email: 'new@example.com' }, adminContext)
    ).rejects.toThrow(AdminUserServiceError);
    expect(emitHookEventMock).toHaveBeenNthCalledWith(
      1,
      EVENTS.USER.UPDATE.BEFORE,
      expect.objectContaining({
        userId: 1,
        admin: { id: 1, role: 'admin' },
      })
    );
    expect(emitHookEventMock).toHaveBeenNthCalledWith(
      2,
      EVENTS.USER.UPDATE.FAILURE,
      expect.objectContaining({
        userId: 1,
        admin: { id: 1, role: 'admin' },
        error: expect.any(AdminUserServiceError),
      })
    );
  });

  it('emits update and role-change hooks when admin changes a user role', async () => {
    repository.findById.mockResolvedValue({ id: 8, email: 'user@example.com', role: 'user' } as any);
    repository.update.mockResolvedValue({ id: 8, email: 'user@example.com', role: 'admin' } as any);

    const result = await service.updateUser(8, { role: 'admin' }, adminContext);

    expect(result.role).toBe('admin');
    expect(emitHookEventMock).toHaveBeenNthCalledWith(
      1,
      EVENTS.USER.UPDATE.BEFORE,
      expect.objectContaining({
        userId: 8,
        input: { role: 'admin' },
        admin: { id: 1, role: 'admin' },
      })
    );
    expect(emitHookEventMock).toHaveBeenNthCalledWith(
      2,
      EVENTS.USER.ROLE.CHANGE.BEFORE,
      expect.objectContaining({
        userId: 8,
        previousRole: 'user',
        nextRole: 'admin',
        admin: { id: 1, role: 'admin' },
      })
    );
    expect(emitHookEventMock).toHaveBeenNthCalledWith(
      3,
      EVENTS.USER.UPDATE.AFTER,
      expect.objectContaining({
        userId: 8,
        user: expect.objectContaining({ role: 'admin' }),
        admin: { id: 1, role: 'admin' },
      })
    );
    expect(emitHookEventMock).toHaveBeenNthCalledWith(
      4,
      EVENTS.USER.ROLE.CHANGE.AFTER,
      expect.objectContaining({
        userId: 8,
        previousRole: 'user',
        newRole: 'admin',
        admin: { id: 1, role: 'admin' },
      })
    );
  });

  it('emits failure hooks when role change update fails', async () => {
    const repositoryError = new Error('update failed');
    repository.findById.mockResolvedValue({ id: 8, email: 'user@example.com', role: 'user' } as any);
    repository.update.mockRejectedValue(repositoryError);

    await expect(service.updateUser(8, { role: 'admin' }, adminContext)).rejects.toThrow(repositoryError);

    expect(emitHookEventMock).toHaveBeenNthCalledWith(
      1,
      EVENTS.USER.UPDATE.BEFORE,
      expect.any(Object)
    );
    expect(emitHookEventMock).toHaveBeenNthCalledWith(
      2,
      EVENTS.USER.ROLE.CHANGE.BEFORE,
      expect.objectContaining({
        previousRole: 'user',
        nextRole: 'admin',
      })
    );
    expect(emitHookEventMock).toHaveBeenNthCalledWith(
      3,
      EVENTS.USER.UPDATE.FAILURE,
      expect.objectContaining({
        userId: 8,
        error: repositoryError,
      })
    );
    expect(emitHookEventMock).toHaveBeenNthCalledWith(
      4,
      EVENTS.USER.ROLE.CHANGE.FAILURE,
      expect.objectContaining({
        userId: 8,
        previousRole: 'user',
        nextRole: 'admin',
        error: repositoryError,
      })
    );
  });

  it('prevents deleting last admin', async () => {
    repository.findById.mockResolvedValue({ id: 1, email: 'admin@example.com', role: 'admin' } as any);
    repository.countByRole.mockResolvedValue(1);
    await expect(service.deleteUser(1, adminContext)).rejects.toThrow(AdminUserServiceError);
    expect(emitHookEventMock).toHaveBeenNthCalledWith(
      1,
      EVENTS.USER.DELETE.BEFORE,
      expect.objectContaining({
        userId: 1,
        admin: { id: 1, role: 'admin' },
      })
    );
    expect(emitHookEventMock).toHaveBeenNthCalledWith(
      2,
      EVENTS.USER.DELETE.FAILURE,
      expect.objectContaining({
        userId: 1,
        user: expect.objectContaining({ role: 'admin' }),
        error: expect.any(AdminUserServiceError),
      })
    );
  });

  it('allows deleting non-admin user', async () => {
    repository.findById.mockResolvedValue({ id: 2, email: "test@example.com", role: 'user', provider: "cognito" } as any);
    repository.delete.mockResolvedValue(true);
    await service.deleteUser(2, adminContext);
    expect(repository.delete).toHaveBeenCalledWith(2);
    expect(emitHookEventMock).toHaveBeenNthCalledWith(
      1,
      EVENTS.USER.DELETE.BEFORE,
      expect.objectContaining({
        userId: 2,
        admin: { id: 1, role: 'admin' },
      })
    );
    expect(emitHookEventMock).toHaveBeenNthCalledWith(
      2,
      EVENTS.USER.DELETE.AFTER,
      expect.objectContaining({
        userId: 2,
        user: expect.objectContaining({ id: 2 }),
        admin: { id: 1, role: 'admin' },
      })
    );
  });
});
