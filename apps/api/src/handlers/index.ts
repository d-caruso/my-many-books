// ================================================================
// src/handlers/index.ts
// Lambda handler using serverless-http to wrap Express app
// ================================================================

import serverless from 'serverless-http';
import app from '../app';

// Wrap Express app for Lambda
export const handler = serverless(app);
