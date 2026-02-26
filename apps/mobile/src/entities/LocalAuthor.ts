import type { Author } from '@my-many-books/shared-types';
import { LocalEntity } from './LocalEntity';

export class LocalAuthor extends LocalEntity<Author> {
    constructor(author: Author) {
        super(author);
    }
}