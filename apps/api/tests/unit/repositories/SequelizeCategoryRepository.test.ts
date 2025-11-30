import { SequelizeCategoryRepository } from '../../../src/repositories/category/SequelizeCategoryRepository';
import { Category } from '../../../src/models/Category';
import { Book } from '../../../src/models/Book';

jest.mock('../../../src/models/Category');
jest.mock('../../../src/models/Book');

describe('SequelizeCategoryRepository', () => {
  let repository: SequelizeCategoryRepository;

  beforeEach(() => {
    repository = new SequelizeCategoryRepository();
    jest.clearAllMocks();
  });

  it('findById returns mapped entity', async () => {
    (Category.findByPk as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue({ id: 1, name: 'Fiction', userId: 1 }),
    });

    const category = await repository.findById(1);

    expect(Category.findByPk).toHaveBeenCalledWith(1, expect.any(Object));
    expect(category).toMatchObject({ id: 1, name: 'Fiction' });
  });

  it('create persists and reloads entity', async () => {
    (Category.create as jest.Mock).mockResolvedValue({ id: 10 });
    const findByIdSpy = jest
      .spyOn(repository, 'findById')
      .mockResolvedValue({ id: 10, name: 'History', userId: 1 } as any);

    const result = await repository.create({ name: 'History', userId: 1 });

    expect(Category.create).toHaveBeenCalledWith(
      { name: 'History', userId: 1 },
      { transaction: null }
    );
    expect(findByIdSpy).toHaveBeenCalledWith(10, undefined);
    expect(result).toMatchObject({ id: 10, name: 'History' });
  });

  it('countBooks aggregates using Book model', async () => {
    (Book.count as jest.Mock).mockResolvedValue(5);

    const count = await repository.countBooks(3);

    expect(Book.count).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.arrayContaining([
          expect.objectContaining({ where: { id: 3 } }),
        ]),
      })
    );
    expect(count).toBe(5);
  });

  it('searchByQuery normalizes short terms', async () => {
    const results = await repository.searchByQuery(' a ', 1);
    expect(results).toEqual([]);
  });

  it('searchByQuery returns mapped rows', async () => {
    (Category.findAll as jest.Mock).mockResolvedValue([
      {
        get: jest.fn().mockReturnValue({ id: 1, name: 'Drama' }),
      },
    ]);

    const rows = await repository.searchByQuery('dr', 1, 5);

    expect(Category.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 1 }),
        limit: 5,
      })
    );
    expect(rows).toEqual([{ id: 1, name: 'Drama' }]);
  });
});
