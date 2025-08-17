import { rest } from 'msw';

const API_BASE_URL = 'http://localhost:3001/api';

export const handlers = [
  // Books API
  rest.get(`${API_BASE_URL}/books`, (req, res, ctx) => {
    const query = req.url.searchParams.get('q');
    const status = req.url.searchParams.get('status');
    const category = req.url.searchParams.get('category');
    
    let books = mockBooks;
    
    if (query) {
      books = books.filter(book => 
        book.title.toLowerCase().includes(query.toLowerCase()) ||
        book.author.toLowerCase().includes(query.toLowerCase())
      );
    }
    
    if (status && status !== 'all') {
      books = books.filter(book => book.status === status);
    }
    
    if (category) {
      books = books.filter(book => book.categories.includes(category));
    }
    
    return res(
      ctx.status(200),
      ctx.json({ books, total: books.length })
    );
  }),

  rest.post(`${API_BASE_URL}/books`, (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({ 
        id: Date.now(),
        ...req.body,
        createdAt: new Date().toISOString()
      })
    );
  }),

  rest.put(`${API_BASE_URL}/books/:id`, (req, res, ctx) => {
    const { id } = req.params;
    return res(
      ctx.status(200),
      ctx.json({ 
        id: parseInt(id as string),
        ...req.body,
        updatedAt: new Date().toISOString()
      })
    );
  }),

  rest.delete(`${API_BASE_URL}/books/:id`, (req, res, ctx) => {
    return res(ctx.status(204));
  }),

  // Categories API
  rest.get(`${API_BASE_URL}/categories`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json(mockCategories)
    );
  }),

  // Authors API
  rest.get(`${API_BASE_URL}/authors`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json(mockAuthors)
    );
  }),

  // Auth API
  rest.post(`${API_BASE_URL}/auth/login`, (req, res, ctx) => {
    const { email, password } = req.body as any;
    
    if (email === 'test@example.com' && password === 'password123') {
      return res(
        ctx.status(200),
        ctx.json({
          token: 'mock-jwt-token',
          user: {
            id: 1,
            email: 'test@example.com',
            name: 'Test User'
          }
        })
      );
    }
    
    return res(
      ctx.status(401),
      ctx.json({ error: 'Invalid credentials' })
    );
  }),

  rest.post(`${API_BASE_URL}/auth/register`, (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        token: 'mock-jwt-token',
        user: {
          id: Date.now(),
          ...(req.body as any)
        }
      })
    );
  }),

  rest.get(`${API_BASE_URL}/auth/me`, (req, res, ctx) => {
    const authHeader = req.headers.get('authorization');
    
    if (authHeader?.includes('mock-jwt-token')) {
      return res(
        ctx.status(200),
        ctx.json({
          id: 1,
          email: 'test@example.com',
          name: 'Test User'
        })
      );
    }
    
    return res(
      ctx.status(401),
      ctx.json({ error: 'Unauthorized' })
    );
  })
];

// Mock data
const mockBooks = [
  {
    id: 1,
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    isbn: '9780743273565',
    publishedDate: '1925-04-10',
    status: 'read',
    categories: ['Fiction', 'Classic'],
    thumbnail: 'https://example.com/gatsby.jpg',
    rating: 4,
    description: 'A classic American novel about the Jazz Age.',
    createdAt: '2023-01-01T00:00:00.000Z'
  },
  {
    id: 2,
    title: 'To Kill a Mockingbird',
    author: 'Harper Lee',
    isbn: '9780061120084',
    publishedDate: '1960-07-11',
    status: 'want-to-read',
    categories: ['Fiction', 'Classic'],
    thumbnail: 'https://example.com/mockingbird.jpg',
    rating: 5,
    description: 'A gripping tale of racial injustice and childhood.',
    createdAt: '2023-01-02T00:00:00.000Z'
  },
  {
    id: 3,
    title: '1984',
    author: 'George Orwell',
    isbn: '9780451524935',
    publishedDate: '1949-06-08',
    status: 'reading',
    categories: ['Fiction', 'Dystopian', 'Science Fiction'],
    thumbnail: 'https://example.com/1984.jpg',
    rating: 5,
    description: 'A dystopian social science fiction novel.',
    createdAt: '2023-01-03T00:00:00.000Z'
  }
];

const mockCategories = [
  'Fiction',
  'Non-Fiction',
  'Science Fiction',
  'Fantasy',
  'Mystery',
  'Romance',
  'Biography',
  'History',
  'Self-Help',
  'Classic',
  'Dystopian'
];

const mockAuthors = [
  'F. Scott Fitzgerald',
  'Harper Lee',
  'George Orwell',
  'Jane Austen',
  'Mark Twain',
  'Charles Dickens',
  'Ernest Hemingway',
  'J.K. Rowling',
  'Stephen King',
  'Agatha Christie'
];