import { Sequelize } from 'sequelize';
import { ModelManager } from '../../../src/models';
import { BookRepository } from '../../../src/repositories/book/BookRepository';
import { Author } from '../../../src/models/Author';
import { Category } from '../../../src/models/Category';
import { BOOK_STATUS } from '@my-many-books/shared-types';
import { Book } from '../../../src/models/Book';
import { User } from '../../../src/models/User';

describe('BookRepository (integration)', () => {
  let sequelize: Sequelize;
  let repository: BookRepository;

  beforeAll(async () => {
    sequelize = new Sequelize('sqlite::memory:', { logging: false });
    ModelManager.initialize(sequelize);
    await ModelManager.syncDatabase(true);
    repository = new BookRepository();
  });

  afterAll(async () => {
    await ModelManager.close();
  });

  beforeEach(async () => {
    await Book.destroy({ where: {}, truncate: true, cascade: true });
    await Author.destroy({ where: {}, truncate: true, cascade: true });
    await Category.destroy({ where: {}, truncate: true, cascade: true });
    await User.destroy({ where: {}, truncate: true, cascade: true });
  });

  it('creates and fetches a book with associations', async () => {
    const user = await User.create({
      email: 'integration@example.com',
      role: 'user',
      name: 'Integration',
      surname: 'User',
      isActive: true,
          } as any);

    const author = await Author.create({ name: 'Author', surname: 'One', userId: user.id } as any);
    const category = await Category.create({ name: 'History', userId: user.id } as any);

    const created = await repository.create(
      {
        title: 'Integration Book',
        isbnCode: '9780000000001',
        status: BOOK_STATUS.READING,
        userId: user.id,
      } as any,
      { authorIds: [author.id], categoryIds: [category.id] }
    );

    expect(created.authors?.map(a => a.id)).toContain(author.id);
    expect(created.categories?.map(c => c.id)).toContain(category.id);

    const fetched = await repository.findUserBookById(created.id!, user.id);
    expect(fetched?.title).toBe('Integration Book');
  });

  it('lists user books with pagination metadata', async () => {
    const user = await User.create({
      email: 'pagination@example.com',
      role: 'user',
      name: 'Pagination',
      surname: 'User',
      isActive: true,
          } as any);

    await repository.create(
      {
        title: 'One',
        isbnCode: '9780000000002',
        userId: user.id,
      } as any
    );
    await repository.create(
      {
        title: 'Two',
        isbnCode: '9780000000003',
        userId: user.id,
      } as any
    );

    const result = await repository.listUserBooks(user.id, { limit: 1, offset: 0 });

    expect(result.total).toBe(2);
    expect(result.rows).toHaveLength(1);
  });
});
