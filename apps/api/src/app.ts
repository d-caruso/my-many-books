// ================================================================
// src/app.ts
// Express application setup with user authentication
// ================================================================

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { ModelManager } from './models';
import DatabaseConnection from './config/database';
import bookRoutes from './routes/bookRoutes';
import userRoutes from './routes/userRoutes';
import authorRoutes from './routes/authorRoutes';
import categoryRoutes from './routes/categoryRoutes';
import isbnRoutes from './routes/isbnRoutes';
import adminRoutes from './routes/adminRoutes';
import authRoutes from './routes/authRoutes';
import { publicLimiter } from './middleware/rateLimiters';

import { initializeI18n } from '@my-many-books/shared-i18n';

const app = express();

// Middleware
app.use(
  cors({
    origin: process.env['FRONTEND_URL'] || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API base path from environment
const API_PREFIX = process.env['API_PREFIX'] || '/api';
const API_ROUTE_VERSION = process.env['API_ROUTE_VERSION'] || 'v1';
const BASE_PATH = `${API_PREFIX}/${API_ROUTE_VERSION}`;

// ===== HEALTH CHECK =====
// Apply public rate limiter to health check
app.get(`${BASE_PATH}/health`, publicLimiter, (_req, res): void => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env['API_VERSION'] || '1.0.0',
    environment: process.env['NODE_ENV'] || 'development',
  });
});

// ===== ROUTES =====
app.use(`${BASE_PATH}/auth`, authRoutes);
app.use(`${BASE_PATH}/books`, bookRoutes);
app.use(`${BASE_PATH}/users`, userRoutes);
app.use(`${BASE_PATH}/authors`, authorRoutes);
app.use(`${BASE_PATH}/categories`, categoryRoutes);
app.use(`${BASE_PATH}/isbn`, isbnRoutes);
app.use(`${BASE_PATH}/admin`, adminRoutes);

// ===== 404 HANDLER =====
app.use((_req, res): void => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    availableRoutes: BASE_PATH,
  });
});

// ===== GLOBAL ERROR HANDLER =====
app.use(
  (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction): void => {
    console.error('Global error handler:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env['NODE_ENV'] === 'development' ? err.message : undefined,
    });
  }
);

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
  await initializeI18n();

  const PORT = process.env['PORT'] || 3000;
  app.listen(PORT, (): void => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`Environment: ${process.env['NODE_ENV'] || 'development'}`);
  });
};

// Handle graceful shutdown
process.on('SIGTERM', (): void => {
  void (async (): Promise<void> => {
    console.log('SIGTERM received, shutting down gracefully');
    await ModelManager.close();
    process.exit(0);
  })();
});

process.on('SIGINT', (): void => {
  void (async (): Promise<void> => {
    console.log('SIGINT received, shutting down gracefully');
    await ModelManager.close();
    process.exit(0);
  })();
});

if (require.main === module) {
  startServer().catch((_error: Error): void => {
    // TODO: Replace with proper logging
    // console.error('Failed to start server:', error);
    process.exit(1);
  });
}

export default app;
