/**
 * Database schema for SQLite
 */

export const CREATE_BOOKS_TABLE = `
  CREATE TABLE IF NOT EXISTS books (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    authors TEXT,
    isbn TEXT,
    thumbnail TEXT,
    description TEXT,
    published_date TEXT,
    page_count INTEGER,
    rating REAL,
    status TEXT,
    notes TEXT,
    user_id INTEGER,
    creation_date TEXT NOT NULL,
    update_date TEXT NOT NULL,
    _sync_status TEXT DEFAULT 'synced',
    _temp_id TEXT,
    _deleted INTEGER DEFAULT 0,
    _server_updated_at TEXT
  );
`;

export const CREATE_AUTHORS_TABLE = `
  CREATE TABLE IF NOT EXISTS authors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );
`;

export const CREATE_BOOK_AUTHORS_TABLE = `
  CREATE TABLE IF NOT EXISTS book_authors (
    book_id TEXT NOT NULL,
    author_id INTEGER NOT NULL,
    PRIMARY KEY (book_id, author_id),
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE CASCADE
  );
`;

export const CREATE_CATEGORIES_TABLE = `
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );
`;

export const CREATE_BOOK_CATEGORIES_TABLE = `
  CREATE TABLE IF NOT EXISTS book_categories (
    book_id TEXT NOT NULL,
    category_id INTEGER NOT NULL,
    PRIMARY KEY (book_id, category_id),
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
  );
`;

// Indexes for performance
export const CREATE_INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_books_status ON books(status);',
  'CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);',
  'CREATE INDEX IF NOT EXISTS idx_books_user_id ON books(user_id);',
  'CREATE INDEX IF NOT EXISTS idx_books_sync_status ON books(_sync_status);',
  'CREATE INDEX IF NOT EXISTS idx_books_deleted ON books(_deleted);',
  'CREATE INDEX IF NOT EXISTS idx_book_authors_book_id ON book_authors(book_id);',
  'CREATE INDEX IF NOT EXISTS idx_book_authors_author_id ON book_authors(author_id);',
  'CREATE INDEX IF NOT EXISTS idx_book_categories_book_id ON book_categories(book_id);',
  'CREATE INDEX IF NOT EXISTS idx_book_categories_category_id ON book_categories(category_id);',
];

export const ALL_TABLES = [
  CREATE_BOOKS_TABLE,
  CREATE_AUTHORS_TABLE,
  CREATE_BOOK_AUTHORS_TABLE,
  CREATE_CATEGORIES_TABLE,
  CREATE_BOOK_CATEGORIES_TABLE,
  ...CREATE_INDEXES,
];
