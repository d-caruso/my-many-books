// ================================================================
// src/app.ts
// Express application setup with user authentication
// ================================================================

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { ModelManager } from './models';
import DatabaseConnection from './config/database';
import { expressAdapter } from './adapters/expressAdapter';
import { bookController } from './controllers/BookController';
import { authorController } from './controllers/AuthorController';
import { categoryController } from './controllers/CategoryController';
import { isbnController } from './controllers/IsbnController';

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API base path from environment
const API_PREFIX = process.env['API_PREFIX'] || '/api';
const API_ROUTE_VERSION = process.env['API_ROUTE_VERSION'] || 'v1';
const BASE_PATH = `${API_PREFIX}/${API_ROUTE_VERSION}`;

// ===== HEALTH CHECK =====
app.get(`${BASE_PATH}/health`, (_req, res): void => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env['API_VERSION'] || '1.0.0',
    environment: process.env['NODE_ENV'] || 'development',
  });
});

// ===== BOOK ROUTES =====
// NOTE: Specific routes must come BEFORE parameterized routes (:id)
app.get(`${BASE_PATH}/books`, expressAdapter(bookController.listBooks.bind(bookController)));
app.post(`${BASE_PATH}/books`, expressAdapter(bookController.createBook.bind(bookController)));
app.get(`${BASE_PATH}/books/search`, expressAdapter(bookController.searchBooks.bind(bookController)));
app.get(`${BASE_PATH}/books/search/isbn`, expressAdapter(bookController.searchBooksByIsbn.bind(bookController)));
app.post(`${BASE_PATH}/books/import/isbn`, expressAdapter(bookController.importBookFromIsbn.bind(bookController)));
app.get(`${BASE_PATH}/books/:id`, expressAdapter(bookController.getBook.bind(bookController)));
app.put(`${BASE_PATH}/books/:id`, expressAdapter(bookController.updateBook.bind(bookController)));
app.delete(`${BASE_PATH}/books/:id`, expressAdapter(bookController.deleteBook.bind(bookController)));

// ===== AUTHOR ROUTES =====
app.get(`${BASE_PATH}/authors`, expressAdapter(authorController.listAuthors.bind(authorController)));
app.post(`${BASE_PATH}/authors`, expressAdapter(authorController.createAuthor.bind(authorController)));
app.get(`${BASE_PATH}/authors/:id`, expressAdapter(authorController.getAuthor.bind(authorController)));
app.put(`${BASE_PATH}/authors/:id`, expressAdapter(authorController.updateAuthor.bind(authorController)));
app.delete(`${BASE_PATH}/authors/:id`, expressAdapter(authorController.deleteAuthor.bind(authorController)));
app.get(`${BASE_PATH}/authors/:id/books`, expressAdapter(authorController.getAuthorBooks.bind(authorController)));

// ===== CATEGORY ROUTES =====
app.get(`${BASE_PATH}/categories`, expressAdapter(categoryController.listCategories.bind(categoryController)));
app.post(`${BASE_PATH}/categories`, expressAdapter(categoryController.createCategory.bind(categoryController)));
app.get(`${BASE_PATH}/categories/:id`, expressAdapter(categoryController.getCategory.bind(categoryController)));
app.put(`${BASE_PATH}/categories/:id`, expressAdapter(categoryController.updateCategory.bind(categoryController)));
app.delete(`${BASE_PATH}/categories/:id`, expressAdapter(categoryController.deleteCategory.bind(categoryController)));
app.get(`${BASE_PATH}/categories/:id/books`, expressAdapter(categoryController.getCategoryBooks.bind(categoryController)));

// ===== ISBN SERVICE ROUTES =====
app.get(`${BASE_PATH}/isbn/lookup`, expressAdapter(isbnController.lookupBook.bind(isbnController)));
app.post(`${BASE_PATH}/isbn/lookup`, expressAdapter(isbnController.batchLookupBooks.bind(isbnController)));
app.get(`${BASE_PATH}/isbn/search`, expressAdapter(isbnController.searchByTitle.bind(isbnController)));
app.get(`${BASE_PATH}/isbn/validate`, expressAdapter(isbnController.validateIsbn.bind(isbnController)));
app.get(`${BASE_PATH}/isbn/format`, expressAdapter(isbnController.formatIsbn.bind(isbnController)));
app.get(`${BASE_PATH}/isbn/health`, expressAdapter(isbnController.getServiceHealth.bind(isbnController)));
app.get(`${BASE_PATH}/isbn/stats`, expressAdapter(isbnController.getResilienceStats.bind(isbnController)));
app.delete(`${BASE_PATH}/isbn/cache`, expressAdapter(isbnController.clearCache.bind(isbnController)));
app.get(`${BASE_PATH}/isbn/cache`, expressAdapter(isbnController.getCacheStats.bind(isbnController)));
app.delete(`${BASE_PATH}/isbn/resilience`, expressAdapter(isbnController.resetResilience.bind(isbnController)));
app.post(`${BASE_PATH}/isbn/fallback`, expressAdapter(isbnController.addFallbackBook.bind(isbnController)));

// ===== 404 HANDLER =====
app.use((_req, res): void => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    availableRoutes: BASE_PATH
  });
});

// ===== GLOBAL ERROR HANDLER =====
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction): void => {
  console.error('Global error handler:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    details: process.env['NODE_ENV'] === 'development' ? err.message : undefined,
  });
});

// Database initialization (for both local and Lambda cold start)
const initializeDatabase = async (): Promise<void> => {
  try {
    const sequelize = DatabaseConnection.getInstance();
    await sequelize.authenticate();
    console.log('Database connection established successfully');

    // Initialize models
    ModelManager.initialize(sequelize);

    // Sync database (only in development)
    // Disabled: Use migrations instead (npm run db:migrate)
    // if (process.env['NODE_ENV'] === 'development') {
    //   await ModelManager.syncDatabase(false);
    //   // TODO: Replace with proper logging
    //   // console.log('Database synchronized');
    // }
  } catch (error) {
    console.error('Database initialization failed:', error);
    // Don't exit in Lambda - controllers can return mock data
    // Only exit when running locally as server
    if (require.main === module) {
      process.exit(1);
    }
  }
};

// Initialize database on module load (Lambda cold start)
// Export the promise so Lambda handler can wait for it
export const initPromise = initializeDatabase();

// Start server
const startServer = async (): Promise<void> => {
  await initializeDatabase();

  const PORT = process.env['PORT'] || 3000;
  app.listen(PORT, (): void => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`Environment: ${process.env['NODE_ENV'] || 'development'}`);
  });
};

// Handle graceful shutdown
process.on('SIGTERM', async (): Promise<void> => {
  console.log('SIGTERM received, shutting down gracefully');
  await ModelManager.close();
  process.exit(0);
});

process.on('SIGINT', async (): Promise<void> => {
  console.log('SIGINT received, shutting down gracefully');
  await ModelManager.close();
  process.exit(0);
});

if (require.main === module) {
  startServer().catch((_error: Error): void => {
    // TODO: Replace with proper logging
    // console.error('Failed to start server:', error);
    process.exit(1);
  });
}

export default app;
