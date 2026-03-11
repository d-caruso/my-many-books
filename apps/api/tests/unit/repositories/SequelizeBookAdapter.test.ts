import { SequelizeBookAdapter } from '../../../src/repositories/book/adapters/SequelizeBookAdapter';
import { Book } from '../../../src/models/Book';
import { BOOK_STATUS, SEARCH_SORT_BY_FIELDS, SORT_DIRECTIONS } from '@my-many-books/shared-types';
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
    count: jest.fn(),
    findAll: jest.fn(),
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

describe('SequelizeBookAdapter (unit)', () => {
  const adapter = new SequelizeBookAdapter();
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
    (Book as unknown as { sequelize?: unknown }).sequelize = {
      query: jest.fn(),
    };
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

    const result = await adapter.findById(1);

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
    await adapter.findByIsbnCode('123', 7);

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

    const result = await adapter.listUserBooks(5, { limit: 5, offset: 0 });

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

    const result = await adapter.createModel({
      title: 'Test Book',
      isbnCode: '1234567890',
      status: BOOK_STATUS.READING,
      authorIds: [1],
      categoryIds: [2],
    } as any);

    expect(Author.findAll).toHaveBeenCalledWith({ where: { id: [1] } });
    expect(Category.findAll).toHaveBeenCalledWith({ where: { id: [2] } });
    expect(result).toBeDefined();
  });

  it('delete removes records and returns number of rows', async () => {
    (Book.destroy as jest.Mock).mockResolvedValue(1);
    await expect(adapter.deleteModel(9)).resolves.toBe(1);
    expect(Book.destroy).toHaveBeenCalledWith({ where: { id: 9 } });
  });

  it('countUserBooks delegates to Book.count with optional status', async () => {
    (Book.count as jest.Mock).mockResolvedValue(4);
    const total = await adapter.countUserBooks(7, BOOK_STATUS.READING);

    expect(Book.count).toHaveBeenCalledWith({
      where: { userId: 7, status: BOOK_STATUS.READING },
    });
    expect(total).toBe(4);
  });

  it('toDomain resolves authors and categories from separate: true structure (bookAuthors/bookCategories)', async () => {
    const plainWithJunction = {
      id: 2,
      title: 'Junction Book',
      isbnCode: '0000000001',
      status: BOOK_STATUS.READING,
      userId: 5,
      creationDate: new Date(),
      updateDate: new Date(),
      bookAuthors: [
        { bookId: 2, authorId: 1, author: { id: 1, name: 'Haruki', surname: 'Murakami' } },
      ],
      bookCategories: [
        { bookId: 2, categoryId: 1, category: { id: 1, name: 'Fiction' } },
        { bookId: 2, categoryId: 2, category: { id: 2, name: 'Romance' } },
      ],
    };

    const instance = createModelMock(plainWithJunction as any);
    (Book.findByPk as jest.Mock).mockResolvedValue(instance);

    const result = await adapter.findById(2);

    expect(result).toMatchObject({
      id: 2,
      authors: [{ id: 1, name: 'Haruki', surname: 'Murakami' }],
      categories: [{ id: 1, name: 'Fiction' }, { id: 2, name: 'Romance' }],
    });
  });

  it('findRecentUserBooks returns mapped domain entities', async () => {
    (Book.findAll as jest.Mock).mockResolvedValue([createModelMock()]);

    const result = await adapter.findRecentUserBooks(3, 5);

    expect(Book.findAll).toHaveBeenCalledWith({
      where: { userId: 3 },
      order: [['creationDate', 'DESC']],
      limit: 5,
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 1, title: 'Test Book' });
  });

  it('search maps creationDate sort to creationDate ordering', async () => {
    (Book.findAndCountAll as jest.Mock).mockResolvedValue({
      rows: [createModelMock()],
      count: 1,
    });

    await adapter.search({}, {
      orderBy: SEARCH_SORT_BY_FIELDS.CREATION_DATE,
      orderDirection: SORT_DIRECTIONS.DESC,
    } as any);

    const args = (Book.findAndCountAll as jest.Mock).mock.calls[0][0];
    expect(args.order).toEqual([
      ['creationDate', 'DESC'],
      ['id', 'ASC'],
    ]);
  });

  it('search maps author sort to literal surname/name ordering', async () => {
    (Book.findAndCountAll as jest.Mock).mockResolvedValue({
      rows: [createModelMock()],
      count: 1,
    });

    await adapter.search({}, {
      orderBy: SEARCH_SORT_BY_FIELDS.AUTHOR,
      orderDirection: SORT_DIRECTIONS.ASC,
    } as any);

    const args = (Book.findAndCountAll as jest.Mock).mock.calls[0][0];
    expect(args.order).toHaveLength(3);
    expect(args.order[0][1]).toBe('ASC');
    expect((args.order[0][0] as { val: string }).val).toContain('a.surname');
    expect((args.order[1][0] as { val: string }).val).toContain('a.name');
  });

  it('searchFulltextSorted orders author results via SQL clause', async () => {
    const sequelizeQuery = (Book as unknown as { sequelize: { query: jest.Mock } }).sequelize.query;
    sequelizeQuery
      .mockResolvedValueOnce([{ id: 1, relevance_score: 12 }])
      .mockResolvedValueOnce([{ total: 1 }]);
    (Book.findAll as jest.Mock).mockResolvedValue([createModelMock()]);

    await adapter.searchFulltextSorted({
      query: 'test',
      sortBy: SEARCH_SORT_BY_FIELDS.AUTHOR,
      sortOrder: SORT_DIRECTIONS.DESC,
      limit: 10,
      offset: 0,
    });

    expect(sequelizeQuery).toHaveBeenCalledTimes(2);
    expect(sequelizeQuery.mock.calls[0][0]).toContain('ORDER BY COALESCE((SELECT a.surname');
    expect(sequelizeQuery.mock.calls[0][0]).toContain('DESC');
  });
});
