import { SequelizeBookRepository } from '../../../src/repositories/book/SequelizeBookRepository';
import { Book } from '../../../src/models/Book';
import { BOOK_STATUS } from '../../../src/utils/constants';
import { Author } from '../../../src/models/Author';
import { Category } from '../../../src/models/Category';
import { Op } from 'sequelize';

jest.mock('../../../src/models/Book', () => ({
  Book: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAndCountAll: jest.fn(),
    create: jest.fn(),
    destroy: jest.fn(),
  },
}));

jest.mock('../../../src/models/Author', () => ({
  Author: {
    findAll: jest.fn(),
  },
}));

jest.mock('../../../src/models/Category', () => ({
  Category: {
    findAll: jest.fn(),
  },
}));

describe('SequelizeBookRepository (unit)', () => {
  const repository = new SequelizeBookRepository();
  const mockBookPlain = {
    id: 1,
    title: 'Test Book',
    isbnCode: '1234567890',
    status: BOOK_STATUS.READING,
    userId: 5,
    creationDate: new Date(),
    updateDate: new Date(),
    authors: [{ id: 1, name: 'Author', surname: 'One' }],
    categories: [{ id: 1, name: 'Fiction' }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createModelMock = (plain = mockBookPlain) => ({
    get: jest.fn().mockReturnValue(plain),
    setAuthors: jest.fn(),
    setCategories: jest.fn(),
    update: jest.fn(),
    id: plain.id,
  });

  it('findById returns a domain entity with associations', async () => {
    const instance = createModelMock();
    (Book.findByPk as jest.Mock).mockResolvedValue(instance);

    const result = await repository.findById(1);

    expect(Book.findByPk).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        include: expect.any(Array),
      })
    );
    expect(result).toMatchObject({
      id: 1,
      title: 'Test Book',
      authors: [{ id: 1, name: 'Author', surname: 'One' }],
      categories: [{ id: 1, name: 'Fiction' }],
    });
  });

  it('findByIsbnCode scopes by userId when provided', async () => {
    (Book.findOne as jest.Mock).mockResolvedValue(createModelMock());
    await repository.findByIsbnCode('123', 7);

    expect(Book.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isbnCode: '123', userId: 7 }),
      })
    );
  });

  it('listUserBooks returns paginated result', async () => {
    (Book.findAndCountAll as jest.Mock).mockResolvedValue({
      rows: [createModelMock()],
      count: 1,
    });

    const result = await repository.listUserBooks(5, { limit: 5, offset: 0 });

    const args = (Book.findAndCountAll as jest.Mock).mock.calls[0][0];
    expect(args.limit).toBe(5);
    expect(args.offset).toBe(0);
    expect(args.where?.[Op.and]).toEqual(
      expect.arrayContaining([expect.objectContaining({ userId: 5 })])
    );
    expect(result.rows).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('create persists book and synchronizes associations', async () => {
    const instance = createModelMock();
    (Book.create as jest.Mock).mockResolvedValue(instance);
    (Book.findByPk as jest.Mock).mockResolvedValue(instance);

    (Author.findAll as jest.Mock).mockResolvedValue([{ id: 1 }]);
    (Category.findAll as jest.Mock).mockResolvedValue([{ id: 2 }]);

    const result = await repository.create(
      {
        title: 'Test Book',
        isbnCode: '1234567890',
        status: BOOK_STATUS.READING,
      } as any,
      { authorIds: [1], categoryIds: [2] }
    );

    expect(Author.findAll).toHaveBeenCalledWith({ where: { id: [1] } });
    expect(Category.findAll).toHaveBeenCalledWith({ where: { id: [2] } });
    expect(result).toBeDefined();
  });

  it('delete removes records and returns boolean', async () => {
    (Book.destroy as jest.Mock).mockResolvedValue(1);
    await expect(repository.delete(9)).resolves.toBe(true);
    expect(Book.destroy).toHaveBeenCalledWith({ where: { id: 9 } });
  });
});
