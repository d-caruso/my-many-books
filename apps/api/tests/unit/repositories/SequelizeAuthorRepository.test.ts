import { SequelizeAuthorRepository } from '../../../src/repositories/author/SequelizeAuthorRepository';
import { Author } from '../../../src/models/Author';
import { Book } from '../../../src/models/Book';

jest.mock('../../../src/models/Author');
jest.mock('../../../src/models/Book');

describe('SequelizeAuthorRepository', () => {
  let repository: SequelizeAuthorRepository;

  beforeEach(() => {
    repository = new SequelizeAuthorRepository();
    jest.clearAllMocks();
  });

  it('findById should return domain entity', async () => {
    (Author.findByPk as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue({
        id: 1,
        name: 'Author',
        surname: 'One',
        userId: 1,
      }),
    });

    const author = await repository.findById(1);

    expect(Author.findByPk).toHaveBeenCalledWith(1, expect.any(Object));
    expect(author).toMatchObject({ id: 1, name: 'Author' });
  });

  it('create should persist and refetch entity', async () => {
    (Author.create as jest.Mock).mockResolvedValue({ id: 5 });
    const findByIdSpy = jest
      .spyOn(repository, 'findById')
      .mockResolvedValue({ id: 5, name: 'New', surname: 'Author', userId: 1 } as any);

    const result = await repository.create({
      name: 'New',
      surname: 'Author',
      userId: 1,
    });

    expect(Author.create).toHaveBeenCalledWith(
      { name: 'New', surname: 'Author', userId: 1 },
      { transaction: null }
    );
    expect(findByIdSpy).toHaveBeenCalledWith(5, undefined);
    expect(result).toMatchObject({ id: 5 });
  });

  it('countBooks should aggregate Book count', async () => {
    (Book.count as jest.Mock).mockResolvedValue(3);

    const count = await repository.countBooks(2);

    expect(Book.count).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.arrayContaining([
          expect.objectContaining({
            model: Author,
            where: { id: 2 },
          }),
        ]),
      })
    );
    expect(count).toBe(3);
  });

  it('searchByQuery should normalize term and filter by user', async () => {
    (Author.findAll as jest.Mock).mockResolvedValue([
      {
        get: jest.fn().mockReturnValue({ id: 1, name: 'Jane', surname: 'Doe' }),
      },
    ]);

    const results = await repository.searchByQuery(' ja ', 1, 10);

    expect(Author.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 1,
        }),
        limit: 10,
      })
    );
    expect(results).toHaveLength(1);
  });
});
