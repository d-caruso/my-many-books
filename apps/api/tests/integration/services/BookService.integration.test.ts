import { Sequelize } from 'sequelize';
import { ModelManager } from '../../../src/models';
import { BookService } from '../../../src/services/book/BookService';
import { BookRepository } from '../../../src/repositories/book/BookRepository';
import { User } from '../../../src/models/User';
import { Author } from '../../../src/models/Author';
import { Category } from '../../../src/models/Category';
import { BOOK_STATUS } from '../../../src/utils/constants';
import { Book } from '../../../src/models/Book';

describe('BookService (integration)', () => {
  let sequelize: Sequelize;
  let service: BookService;
  let repository: BookRepository;
  let user: User;

  beforeAll(async () => {
    sequelize = new Sequelize('sqlite::memory:', { logging: false });
    ModelManager.initialize(sequelize);
    await ModelManager.syncDatabase(true);
    repository = new BookRepository();
    service = new BookService(repository);
  });

  afterAll(async () => {
    await ModelManager.close();
  });

  beforeEach(async () => {
    await Book.destroy({ where: {}, truncate: true, cascade: true });
    await Author.destroy({ where: {}, truncate: true, cascade: true });
    await Category.destroy({ where: {}, truncate: true, cascade: true });
    await User.destroy({ where: {}, truncate: true, cascade: true });

    user = await User.create({
      email: 'service@example.com',
      name: 'Service',
      surname: 'User',
      isActive: true,
      role: 'user',
    } as any);
  });

  it('creates, updates, and deletes a book', async () => {
    const author = await Author.create({ name: 'A', surname: 'One', userId: user.id } as any);
    const category = await Category.create({ name: 'History', userId: user.id } as any);

    const created = await service.createBook(
      {
        title: 'Service Book',
        isbnCode: '9781111111111',
        status: BOOK_STATUS.READING,
        authorIds: [author.id],
        categoryIds: [category.id],
      },
      { userId: user.id, role: 'user' }
    );

    expect(created.title).toBe('Service Book');
    expect(created.authors && created.authors[0]?.id).toBe(author.id);

    const updated = await service.updateBook(
      created.id!,
      { title: 'Updated Title' },
      { userId: user.id, role: 'user' }
    );
    expect(updated.title).toBe('Updated Title');

    await service.deleteBook(created.id!, { userId: user.id, role: 'user' });
    const afterDelete = await repository.findById(created.id!);
    expect(afterDelete).toBeNull();
  });
});
