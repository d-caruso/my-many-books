import { AdminUserService, AdminUserServiceError } from '../../../src/services/user/AdminUserService';
import { IUserRepository } from '../../../src/repositories/user/IUserRepository';

const adminContext = { userId: 1, role: 'admin' };

describe('AdminUserService', () => {
  let service: AdminUserService;
  let repository: jest.Mocked<IUserRepository>;

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
    } as unknown as jest.Mocked<IUserRepository>;

    service = new AdminUserService(repository);
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
  });

  it('prevents deleting last admin', async () => {
    repository.findById.mockResolvedValue({ id: 1, role: 'admin' } as any);
    repository.countByRole.mockResolvedValue(1);
    await expect(service.deleteUser(1, adminContext)).rejects.toThrow(AdminUserServiceError);
  });

  it('allows deleting non-admin user', async () => {
    repository.findById.mockResolvedValue({ id: 2, role: 'user' } as any);
    repository.delete.mockResolvedValue(true);
    await service.deleteUser(2, adminContext);
    expect(repository.delete).toHaveBeenCalledWith(2);
  });
});
