import { AuthorRepository } from '../../../src/repositories/author/AuthorRepository';
import { AuthorRepositoryAdapter } from '../../../src/repositories/author/adapters/AuthorRepositoryAdapter';
import {
  AuthorEntity,
  AuthorListOptions,
  AuthorQueryOptions,
} from '../../../src/repositories/author/AuthorRepositoryTypes';
import { AuthorCreationAttributes } from '../../../src/models/interfaces/ModelInterfaces';

describe('AuthorRepository', () => {
  let adapter: jest.Mocked<AuthorRepositoryAdapter>;
  let repository: AuthorRepository;

  const baseAuthor: AuthorEntity = {
    id: 1,
    name: 'Jane',
    surname: 'Doe',
    userId: 10,
    creationDate: new Date(),
  };

  beforeEach(() => {
    adapter = {
      findById: jest.fn(),
      findUserAuthorById: jest.fn(),
      findByNameAndSurname: jest.fn(),
      list: jest.fn(),
      searchByQuery: jest.fn(),
      countBooks: jest.fn(),
      createModel: jest.fn(),
      updateModel: jest.fn(),
      deleteModel: jest.fn(),
    } as unknown as jest.Mocked<AuthorRepositoryAdapter>;

    repository = new AuthorRepository(adapter);
  });

  it('delegates create to adapter', async () => {
    adapter.createModel.mockResolvedValue(baseAuthor);
    const payload = { name: 'Jane', surname: 'Doe' } as AuthorCreationAttributes;
    const options: AuthorQueryOptions = {};

    const created = await repository.create(payload, options);

    expect(adapter.createModel).toHaveBeenCalledWith(payload, options);
    expect(created).toBe(baseAuthor);
  });

  it('delegates list with provided options', async () => {
    const listOptions: AuthorListOptions = { limit: 5 };
    adapter.list.mockResolvedValue({ rows: [baseAuthor], total: 1, limit: 5, offset: 0 });

    const result = await repository.list(listOptions);

    expect(adapter.list).toHaveBeenCalledWith(listOptions);
    expect(result.rows).toHaveLength(1);
  });

  it('returns boolean flag for delete', async () => {
    adapter.deleteModel.mockResolvedValue(0);

    const deleted = await repository.delete(2);

    expect(adapter.deleteModel).toHaveBeenCalledWith(2);
    expect(deleted).toBe(false);
  });
});
