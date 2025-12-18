import { UserRepository } from '../../../src/repositories/user/UserRepository';
import { UserRepositoryAdapter } from '../../../src/repositories/user/adapters/UserRepositoryAdapter';
import {
  PaginatedResult,
  UserEntity,
  UserListOptions,
  UserQueryOptions,
} from '../../../src/repositories/user/UserRepositoryTypes';
import { UserCreationAttributes } from '../../../src/models/interfaces/ModelInterfaces';

describe('UserRepository', () => {
  let adapter: jest.Mocked<UserRepositoryAdapter>;
  let repository: UserRepository;

  const baseUser: UserEntity = {
    id: 1,
    email: 'user@example.com',
      role: 'user',
    name: 'User',
    surname: 'Example',
    isActive: true,
        creationDate: new Date(),
  };

  beforeEach(() => {
    adapter = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      list: jest.fn(),
      countByRole: jest.fn(),
      createModel: jest.fn(),
      updateModel: jest.fn(),
      deleteModel: jest.fn(),
    } as unknown as jest.Mocked<UserRepositoryAdapter>;

    repository = new UserRepository(adapter);
  });

  it('creates user via adapter', async () => {
    adapter.createModel.mockResolvedValue(baseUser);
    const payload = { email: 'user@example.com' } as UserCreationAttributes;
    const options: UserQueryOptions = {};

    const created = await repository.create(payload, options);

    expect(adapter.createModel).toHaveBeenCalledWith(payload, options);
    expect(created).toBe(baseUser);
  });

  it('lists users with pagination options', async () => {
    const listResult: PaginatedResult<UserEntity> = {
      rows: [baseUser],
      total: 1,
      limit: 20,
      offset: 0,
    };
    const options: UserListOptions = { limit: 20 };
    adapter.list.mockResolvedValue(listResult);

    const result = await repository.list(options);

    expect(adapter.list).toHaveBeenCalledWith(options);
    expect(result).toBe(listResult);
  });

  it('delete reports boolean outcome', async () => {
    adapter.deleteModel.mockResolvedValue(0);

    const deleted = await repository.delete(5);

    expect(adapter.deleteModel).toHaveBeenCalledWith(5);
    expect(deleted).toBe(false);
  });
});
