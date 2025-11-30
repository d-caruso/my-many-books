import { SequelizeUserRepository } from '../../../src/repositories/user/SequelizeUserRepository';
import { User } from '../../../src/models/User';

jest.mock('../../../src/models/User');

describe('SequelizeUserRepository', () => {
  let repository: SequelizeUserRepository;

  beforeEach(() => {
    repository = new SequelizeUserRepository();
    jest.clearAllMocks();
  });

  it('findById returns domain entity', async () => {
    (User.findByPk as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue({ id: 1, email: 'test@example.com' }),
    });

    const user = await repository.findById(1);

    expect(User.findByPk).toHaveBeenCalledWith(1, expect.any(Object));
    expect(user).toMatchObject({ id: 1 });
  });

  it('create persists and refetches user', async () => {
    (User.create as jest.Mock).mockResolvedValue({ id: 2 });
    const findSpy = jest
      .spyOn(repository, 'findById')
      .mockResolvedValue({ id: 2, email: 'new@example.com' } as any);

    const created = await repository.create({ email: 'new@example.com' } as any);

    expect(User.create).toHaveBeenCalled();
    expect(findSpy).toHaveBeenCalledWith(2, undefined);
    expect(created?.id).toBe(2);
  });

  it('delete removes record', async () => {
    (User.destroy as jest.Mock).mockResolvedValue(1);
    const result = await repository.delete(5);
    expect(User.destroy).toHaveBeenCalledWith({ where: { id: 5 } });
    expect(result).toBe(true);
  });

  it('countByRole leverages User.count', async () => {
    (User.count as jest.Mock).mockResolvedValue(3);
    const count = await repository.countByRole('admin');
    expect(User.count).toHaveBeenCalledWith({ where: { role: 'admin' } });
    expect(count).toBe(3);
  });
});
