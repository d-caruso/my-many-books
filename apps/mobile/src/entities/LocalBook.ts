import type { Book } from '@my-many-books/shared-types';
import { LocalEntity } from './LocalEntity';

export class LocalBook extends LocalEntity<Book> {}