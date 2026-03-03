import type { AuthorSearchFilters } from '@/controllers/AuthorController';
import type { BookSearchFilters as ControllerBookSearchFilters } from '@/controllers/BookController';
import type { CategorySearchFilters } from '@/controllers/CategoryController';
import type { AuthorListFilters } from '@/repositories/author/AuthorRepositoryTypes';
import type { BookSearchFilters as RepositoryBookSearchFilters } from '@/repositories/book/BookRepositoryTypes';
import type { CategoryListFilters } from '@/repositories/category/CategoryRepositoryTypes';
import type { UserListFilters } from '@/repositories/user/UserRepositoryTypes';

const assertType = <T>(_value: T): void => undefined;

assertType<AuthorSearchFilters>({ name: 'John', surname: 'Doe' });
assertType<ControllerBookSearchFilters>({ title: 'Clean Code', updatedSince: '2026-01-01' });
assertType<CategorySearchFilters>({ name: 'Fiction', userId: 1 });

assertType<AuthorListFilters>({ name: 'John', updatedSince: '2026-01-01' });
assertType<RepositoryBookSearchFilters>({ title: 'DDD', userId: 1 });
assertType<CategoryListFilters>({ name: 'Sci-Fi', userId: 12 });
assertType<UserListFilters>({ email: 'user@example.com', isActive: true });

// @ts-expect-error typo should not be accepted
assertType<AuthorSearchFilters>({ surename: 'Doe' });

// @ts-expect-error arbitrary fields must be rejected
assertType<ControllerBookSearchFilters>({ randomField: 123 });

// @ts-expect-error wrong value type must be rejected
assertType<CategorySearchFilters>({ userId: '1' });

// @ts-expect-error unknown repo filter key should fail
assertType<AuthorListFilters>({ invalidField: true });

// @ts-expect-error unknown repo filter key should fail
assertType<UserListFilters>({ random: 'value' });
