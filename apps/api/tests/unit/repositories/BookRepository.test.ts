import { BookRepository } from '../../../src/repositories/book/BookRepository';
import { BookRepositoryAdapter } from '../../../src/repositories/book/adapters/BookRepositoryAdapter';
import { BookEntity, BookQueryOptions } from '../../../src/repositories/book/BookRepositoryTypes';
import { BookCreationAttributes } from '../../../src/models/interfaces/ModelInterfaces';

describe('BookRepository', () => {
  let adapter: jest.Mocked<BookRepositoryAdapter>;
  let repository: BookRepository;

  const baseEntity: BookEntity = {
    id: 1,
    isbnCode: '123',
    title: 'Test',
    creationDate: new Date(),
  };

  beforeEach(() => {
    adapter = {
      findById: jest.fn(),
      findUserBookById: jest.fn(),
      findByIsbnCode: jest.fn(),
      listUserBooks: jest.fn(),
      search: jest.fn(),
      countUserBooks: jest.fn(),
      findRecentUserBooks: jest.fn(),
      createModel: jest.fn(),
      updateModel: jest.fn(),
      deleteModel: jest.fn(),
    } as unknown as jest.Mocked<BookRepositoryAdapter>;

    repository = new BookRepository(adapter);
  });

  it('merges associations when creating', async () => {
    adapter.createModel.mockResolvedValue(baseEntity);
    const payload = { title: 'Test' } as BookCreationAttributes;
    const associations = { authorIds: [1], categoryIds: [2] };
    const options: BookQueryOptions = {};

    const result = await repository.create(payload, associations, options);

    expect(adapter.createModel).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Test', authorIds: [1], categoryIds: [2] }),
      options
    );
    expect(result).toBe(baseEntity);
  });

  it('merges associations when updating', async () => {
    adapter.updateModel.mockResolvedValue(baseEntity);
    const result = await repository.update(10, { title: 'New' }, { authorIds: [4] });

    expect(adapter.updateModel).toHaveBeenCalledWith(
      10,
      expect.objectContaining({ title: 'New', authorIds: [4] }),
      undefined
    );
    expect(result).toBe(baseEntity);
  });

  it('returns boolean result for delete', async () => {
    adapter.deleteModel.mockResolvedValue(1);
    const deleted = await repository.delete(7);

    expect(adapter.deleteModel).toHaveBeenCalledWith(7);
    expect(deleted).toBe(true);
  });
});
