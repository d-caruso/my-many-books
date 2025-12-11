// ================================================================
// src/app.ts
// Express application setup with user authentication
// ================================================================

import 'reflect-metadata';
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
import hookRoutes from './routes/hookRoutes';
import { publicLimiter } from './middleware/rateLimiters';
import { expressErrorHandler } from './middleware/expressErrorHandler';
import { initializeHookSystem } from './services/hooks/hookSystem';
import { traceIdMiddleware, requestLoggerMiddleware } from '@my-many-books/shared-logging';

import { initializeI18n } from '@my-many-books/shared-i18n';
import { getLogger } from './services/logger';

const app = express();
const isTestEnvironment = process.env['NODE_ENV'] === 'test';

// ===== LOGGING MIDDLEWARE (MUST BE FIRST) =====
// 1. TraceId middleware for request correlation
app.use(traceIdMiddleware() as unknown as express.RequestHandler);

// 2. Request logger middleware (logs all HTTP requests)
if (!isTestEnvironment) {
  app.use(requestLoggerMiddleware() as unknown as express.RequestHandler);
}

// ===== CORE MIDDLEWARE =====
app.use(
  cors({
    origin: [process.env['FRONTEND_URL'], /^http:\/\/localhost:\d+$/].filter(Boolean) as (
      | string
      | RegExp
    )[],
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
app.use(`${BASE_PATH}/admin/hooks`, hookRoutes);

// ===== 404 HANDLER =====
app.use((_req, res): void => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    availableRoutes: BASE_PATH,
  });
});

// ===== GLOBAL ERROR HANDLER =====
app.use(expressErrorHandler);

// Database initialization (for both local and Lambda cold start)
const initializeDatabase = async (): Promise<void> => {
  if (isTestEnvironment) {
    return;
  }

  try {
    const sequelize = DatabaseConnection.getInstance();
    await sequelize.authenticate();
    getLogger().info('Database connection established successfully');

    // Initialize models
    ModelManager.initialize(sequelize);

    // Sync database (only in development)
    // Disabled: Use migrations instead (npm run db:migrate)
    // if (process.env['NODE_ENV'] === 'development') {
    //   await ModelManager.syncDatabase(false);
    // }
  } catch (error) {
    getLogger().error(
      {
        err: error instanceof Error ? error : new Error(String(error)),
      },
      'Database initialization failed'
    );
    // Don't exit in Lambda - controllers can return mock data
    // Only exit when running locally as server
    if (require.main === module) {
      process.exit(1);
    }
  }
};

const bootstrapInfrastructure = async (): Promise<void> => {
  await initializeDatabase();
  await initializeHookSystem();
};

// Initialize database + hook system on module load (Lambda cold start)
// Export the promise so Lambda handler can wait for it
export const initPromise = bootstrapInfrastructure();

// Start server
const startServer = async (): Promise<void> => {
  await initPromise;
  await initializeI18n();

  const PORT = process.env['PORT'] || 3000;
  const env = process.env['NODE_ENV'] || 'development';

  app.listen(PORT, (): void => {
    getLogger().info(
      {
        port: PORT,
        environment: env,
        healthCheck: `http://localhost:${PORT}/health`,
      },
      'Server started successfully'
    );
  });
};

// Handle graceful shutdown
process.on('SIGTERM', (): void => {
  void (async (): Promise<void> => {
    getLogger().info('SIGTERM received, shutting down gracefully');
    await ModelManager.close();
    process.exit(0);
  })();
});

process.on('SIGINT', (): void => {
  void (async (): Promise<void> => {
    getLogger().info('SIGINT received, shutting down gracefully');
    await ModelManager.close();
    process.exit(0);
  })();
});

if (require.main === module) {
  startServer().catch((error: Error): void => {
    getLogger().error({ err: error }, 'Failed to start server');
    process.exit(1);
  });
}

export default app;
